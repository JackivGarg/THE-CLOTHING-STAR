"""Build and query a private, local-only FashionCLIP index.

The operator supplies a manifest of images cleared for embedding and exact
variant associations, plus an allowlist produced from current catalogue filters.
"""

import argparse
import hashlib
import io
import json
import re
from pathlib import Path
from tempfile import NamedTemporaryFile

import numpy as np
from PIL import Image

from fashion_image_encoder import FashionImageEncoder, MODEL_SHA256

MAX_FILE_BYTES = 12 * 1024 * 1024
MAX_PIXELS = 16_000_000
MAX_VIEWS_PER_PRODUCT = 3


def encode_file(encoder, path, expected_sha256=None):
    with path.open("rb") as file:
        data = file.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise ValueError("Photo exceeds the 12 MiB input limit")
    if expected_sha256 and hashlib.sha256(data).hexdigest() != expected_sha256:
        raise ValueError("Catalogue image bytes differ from the approved manifest")
    with Image.open(io.BytesIO(data), formats=["JPEG", "PNG", "WEBP"]) as image:
        if image.width * image.height > MAX_PIXELS or getattr(image, "n_frames", 1) != 1:
            raise ValueError("Use a single image under 16 million pixels")
        return encoder.encode(image)


def load_manifest(path):
    data = path.read_bytes()
    assets = json.loads(data)["assets"]
    ids = set()
    views = {}
    for asset in assets:
        product = asset["productId"]
        asset_id = asset["assetId"]
        variants = asset["variantIds"]
        if not product or not asset_id or asset_id in ids or not isinstance(variants, list) or not variants:
            raise ValueError("Give each image a unique ID and explicit variant links")
        if any(not isinstance(variant, str) or not variant for variant in variants):
            raise ValueError("Invalid linked variant")
        ids.add(asset_id)
        if asset.get("embeddingUse") != "approved":
            continue
        if not asset.get("approvalRef") or not re.fullmatch(r"[a-f0-9]{64}", asset.get("sha256", "")):
            raise ValueError("Approved assets need an approval reference and SHA-256")
        views[product] = views.get(product, 0) + 1
        if views[product] > MAX_VIEWS_PER_PRODUCT:
            raise ValueError("Use at most three indexed views per product in this pilot")
    approved = [asset for asset in assets if asset.get("embeddingUse") == "approved"]
    return approved, hashlib.sha256(data).hexdigest()


def build(encoder, manifest, destination):
    assets, digest = load_manifest(manifest)
    vectors = []
    root = manifest.parent.resolve()
    for asset in assets:
        path = (root / asset["file"]).resolve()
        if path == root or not path.is_relative_to(root):
            raise ValueError("Catalogue photos must be inside the manifest directory")
        vectors.append(encode_file(encoder, path, asset["sha256"]))
    vectors = np.stack(vectors) if vectors else np.empty((0, 512), dtype=np.float32)
    with NamedTemporaryFile(dir=destination.parent, delete=False) as temporary:
        output = Path(temporary.name)
        try:
            np.savez(temporary, vectors=vectors, manifest=digest, model=MODEL_SHA256)
            temporary.close()
            output.replace(destination)
        finally:
            temporary.close()
            output.unlink(missing_ok=True)
    return {"indexedViews": len(assets), "indexedStyles": len({asset["productId"] for asset in assets})}


def query(encoder, manifest, index, reference, eligible_path, limit):
    assets, digest = load_manifest(manifest)
    with np.load(index, allow_pickle=False) as data:
        if data["manifest"].item() != digest or data["model"].item() != MODEL_SHA256:
            raise ValueError("Manifest or model changed. Rebuild the private index.")
        gallery = data["vectors"]
    if gallery.shape != (len(assets), 512) or not np.isfinite(gallery).all():
        raise ValueError("Invalid image index")

    eligible = {(row["productId"], row["variantId"]): row["priceMinor"]
                for row in json.loads(eligible_path.read_text(encoding="utf-8-sig"))}
    candidates = []
    for position, asset in enumerate(assets):
        product = asset["productId"]
        linked = [(product, variant) for variant in asset["variantIds"] if (product, variant) in eligible]
        if linked:
            key = min(linked, key=lambda key: (eligible[key], key[1]))
            candidates.append((position, asset, key[1], eligible[key]))
    if not candidates:
        return {"eligibleIndexedStyles": 0, "matches": []}

    scores = gallery[[position for position, *_ in candidates]] @ encode_file(encoder, reference)
    ranked = sorted(zip(candidates, scores), key=lambda row: (-float(row[1]), row[0][1]["assetId"]))
    styles = {}
    for (_, asset, variant, price), score in ranked:
        product = asset["productId"]
        styles.setdefault(product, {"productId": product, "assetId": asset["assetId"], "variantId": variant,
                                    "recordedItemPriceMinor": price, "cosineSimilarity": float(score)})
    return {"eligibleIndexedStyles": len(styles), "matches": list(styles.values())[:limit]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, type=Path)
    actions = parser.add_subparsers(dest="action", required=True)
    for action in ("index", "query"):
        command = actions.add_parser(action)
        command.add_argument("manifest", type=Path)
        command.add_argument("index", type=Path)
        if action == "query":
            command.add_argument("photo", type=Path)
            command.add_argument("eligible", type=Path)
            command.add_argument("--limit", type=int, choices=range(1, 21), default=5)
    args = parser.parse_args()
    encoder = FashionImageEncoder(args.model)
    if args.action == "index":
        result = build(encoder, args.manifest, args.index)
    else:
        result = query(encoder, args.manifest, args.index, args.photo, args.eligible, args.limit)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
