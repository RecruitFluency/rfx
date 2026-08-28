#!/usr/bin/env python3
"""Reassemble the single-file, self-contained deck that gets deployed to Vercel.

    python3 bundle.py            # -> dist/index.html

deck.source.html holds the readable slide markup; assets/ holds the fonts,
scripts and images it references by uuid; shell.html is the loader that unpacks
them in the browser. This script stitches the three back together.
"""

import base64
import gzip
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")


def build() -> str:
    index = json.load(open(os.path.join(ASSETS, "index.json")))
    manifest = {}
    for uid, meta in index.items():
        raw = open(os.path.join(ASSETS, meta["file"]), "rb").read()
        if meta["compressed"]:
            # mtime=0 so identical input produces an identical bundle
            raw = gzip.compress(raw, mtime=0)
        manifest[uid] = {
            "mime": meta["mime"],
            "compressed": meta["compressed"],
            "data": base64.b64encode(raw).decode("ascii"),
        }

    shell = open(os.path.join(HERE, "shell.html")).read()
    page = open(os.path.join(HERE, "deck.source.html")).read()
    # The page is embedded as a JSON string inside a <script> block, so every
    # "</" has to be escaped or the browser closes the tag on the first
    # </script> in the slide markup.
    page_json = json.dumps(page).replace("</", "<\\u002F")
    return shell.replace("@@MANIFEST@@", json.dumps(manifest, separators=(",", ":"))).replace(
        "@@PAGE@@", page_json
    )


if __name__ == "__main__":
    dist = os.path.join(HERE, "dist")
    os.makedirs(dist, exist_ok=True)
    out = os.path.join(dist, "index.html")
    with open(out, "w") as fh:
        fh.write(build())
    print(f"{out} ({os.path.getsize(out) / 1024:.0f} KB)")
