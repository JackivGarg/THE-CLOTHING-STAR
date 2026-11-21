"""Run a local image-retrieval check on public Fashion-MNIST test images.

Usage: python scripts/benchmark-photo-search.py PATH_TO_VERIFIED_INPUTS
The three filenames and pinned upstream revisions are in BACKEND_COMPLETION_PLAN.md.
"""

import argparse
import gzip
import hashlib
import json
import struct
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image


MODEL = "vision_model_quantized.onnx"
IMAGES = "t10k-images-idx3-ubyte.gz"
LABELS = "t10k-labels-idx1-ubyte.gz"
SHA256 = {
    MODEL: "ffd9b2a43e4221a1252f08bd1ecb327a873f793aa118549c2bc4a8401ba41b48",
    IMAGES: "346e55b948d973a97e58d2351dde16a484bd415d4595297633bb08f03db6a073",
    LABELS: "67da17c76eaffca5446c3361aaab5c3cd6d1c2608764d35dfb1850b086bf8dd5",
}
CLASSES = {0: "T-shirt/top", 1: "trouser", 2: "pullover", 3: "dress", 4: "coat", 6: "shirt", 8: "bag"}
PER_CLASS_GALLERY = 12
PER_CLASS_QUERY = 5
MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)


def load_data(directory):
    for name, expected in SHA256.items():
        if hashlib.sha256((directory / name).read_bytes()).hexdigest() != expected:
            raise ValueError(f"Unexpected bytes for {name}")
    images = gzip.decompress((directory / IMAGES).read_bytes())
    labels = gzip.decompress((directory / LABELS).read_bytes())
    magic, count, height, width = struct.unpack_from(">IIII", images)
    if (magic, height, width) != (2051, 28, 28) or struct.unpack_from(">II", labels) != (2049, count):
        raise ValueError("Unexpected Fashion-MNIST headers")
    return np.frombuffer(images, np.uint8, offset=16).reshape(count, height, width), np.frombuffer(labels, np.uint8, offset=8)


def split(images, labels):
    seen, gallery, queries = set(), [], []
    for label in CLASSES:
        examples = []
        for idx in np.flatnonzero(labels == label):
            pixels = images[idx].tobytes()
            if pixels not in seen:
                seen.add(pixels)
                examples.append(idx)
                if len(examples) == PER_CLASS_GALLERY + PER_CLASS_QUERY:
                    break
        if len(examples) != PER_CLASS_GALLERY + PER_CLASS_QUERY:
            raise ValueError(f"Too few distinct examples for {label}")
        gallery.extend(examples[:PER_CLASS_GALLERY])
        queries.extend(examples[PER_CLASS_GALLERY:])
    return gallery, queries


def unit(vector):
    vector = vector.astype(np.float32, copy=False).ravel()
    length = np.linalg.norm(vector)
    if not np.isfinite(length) or length == 0:
        raise ValueError("Invalid retrieval vector")
    return vector / length


def run(directory):
    images, labels = load_data(directory)
    gallery, queries = split(images, labels)
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2
    opts.inter_op_num_threads = 1
    session = ort.InferenceSession(str(directory / MODEL), opts, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    outputs = [out.name for out in session.get_outputs() if len(out.shape) == 2 and out.shape[-1] == 512]
    if len(outputs) != 1:
        raise ValueError(f"Expected one projected 512-dimensional image output, saw {session.get_outputs()}")

    def encode(pixels):
        # All benchmark inputs are square. Resize and centre crop coincide for this dataset.
        rgb = Image.fromarray(pixels).convert("RGB").resize((224, 224), Image.Resampling.BICUBIC)
        normalized = (np.asarray(rgb, dtype=np.float32) / 255.0 - MEAN) / STD
        tensor = np.ascontiguousarray(normalized.transpose(2, 0, 1)[None])
        embedded, = session.run(outputs, {input_name: tensor})
        return unit(embedded)

    vectors = np.stack([encode(images[i]) for i in gallery])
    pixels = np.stack([unit(images[i]) for i in gallery])
    by_class = {name: {"encoder_hits": 0, "pixel_hits": 0} for name in CLASSES.values()}
    timings = []
    for i in queries:
        start = time.perf_counter()
        # Exhaustive cosine similarity against the entire gallery.
        nearest = gallery[int(np.argmax(vectors @ encode(images[i])))]
        timings.append(1000 * (time.perf_counter() - start))
        pixel_nearest = gallery[int(np.argmax(pixels @ unit(images[i])))]
        group = by_class[CLASSES[int(labels[i])]]
        group["encoder_hits"] += int(labels[i] == labels[nearest])
        group["pixel_hits"] += int(labels[i] == labels[pixel_nearest])
    return {
        "gallery": len(gallery), "held_out_queries": len(queries),
        "encoder_top1_same_class": sum(v["encoder_hits"] for v in by_class.values()),
        "pixel_top1_same_class": sum(v["pixel_hits"] for v in by_class.values()),
        "hits_per_five_queries": by_class,
        "warm_encode_and_search_ms": dict(zip(("p50", "p95"), np.percentile(timings, [50, 95]).round(1).tolist())),
        "onnxruntime": ort.__version__, "model_input": input_name, "model_output": outputs[0],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    print(json.dumps(run(parser.parse_args().directory), indent=2))
