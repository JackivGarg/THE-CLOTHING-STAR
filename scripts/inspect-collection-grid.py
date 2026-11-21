"""Extract merchant grid evidence from saved, permitted collection HTML."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup


def inspect_grid(body, url):
    soup = BeautifulSoup(body, "html.parser")
    selector_by_host = {
        "www.powerlook.in": "#ProductGridContainer",
        "thesagacity.in": "main .t4s-main-collection-page .t4s-products",
    }
    origin = urlsplit(url)
    grids = soup.select(selector_by_host.get(origin.hostname, "ul#product-grid, ul.product-grid"))
    if len(grids) != 1:
        raise ValueError(f"Expected one main product grid, found {len(grids)}")
    handles = set()
    for link in grids[0].select("a[href]"):
        target = urlsplit(urljoin(url, link["href"]))
        if target.scheme != origin.scheme or target.netloc != origin.netloc:
            continue
        match = re.fullmatch(r"(?:/collections/[^/]+)?/products/([^/]+)/?", target.path)
        if match:
            handles.add(match[1])
    if not handles:
        raise ValueError("No product links found in the main grid")
    next_links = {
        urljoin(url, link["href"]) for link in soup.select("link[rel=next][href], a[rel=next][href]")
    }
    if len(next_links) > 1:
        raise ValueError("Conflicting next-page links")
    next_page = next(iter(next_links), None)
    if next_page:
        target = urlsplit(next_page)
        if (target.scheme, target.netloc, target.path) != (origin.scheme, origin.netloc, origin.path):
            raise ValueError("Next page leaves the observed collection")
    return sorted(handles), next_page


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("brand")
    parser.add_argument("url")
    parser.add_argument("html", type=Path)
    parser.add_argument("--observed-at", required=True, help="Timestamp of the original successful GET")
    args = parser.parse_args()
    body = args.html.read_bytes()
    handles, next_page = inspect_grid(body, args.url)
    print(json.dumps({
        "brand": args.brand, "source_url": args.url, "observed_at": args.observed_at,
        "snapshot_sha256": hashlib.sha256(body).hexdigest(), "handles": handles,
        "advertised_next": next_page,
    }, indent=2))
