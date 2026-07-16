#!/usr/bin/env python3
"""Verify that images referenced in manifest screenshots exist and are well-formed.

The JSON schema covers the manifest structure and the allowed file extensions, but it
cannot check whether a referenced file is actually there, is a readable image, or has
the required dimensions. This script does.
"""
import glob
import sys
import yaml
from pathlib import Path
from PIL import Image

MIN_WIDTH = 1500
BG_RATIO_WIDTH, BG_RATIO_HEIGHT = 3, 2

errors = []
for manifest_path in sorted(glob.glob("*/manifest.yaml")):
    folder = Path(manifest_path).parent
    manifest = yaml.safe_load(Path(manifest_path).read_text(encoding="utf-8"))
    for index, shot in enumerate(manifest.get("screenshots") or [], start=1):
        for field in ("bg", "screenshot"):
            location = f"{manifest_path}: screenshots[{index}].{field}"
            filename = shot.get(field)
            if not filename:
                continue
            path = folder / filename
            if not path.is_file():
                errors.append(f"{location} -> {path} not found")
                continue
            try:
                with Image.open(path) as image:
                    width, height = image.size
            except OSError:
                errors.append(f"{location} -> {path} is not a readable image")
                continue
            if width < MIN_WIDTH:
                errors.append(
                    f"{location} -> {path} is {width}x{height}, "
                    f"expected a width of at least {MIN_WIDTH}px"
                )
            if field == "bg" and width * BG_RATIO_HEIGHT != height * BG_RATIO_WIDTH:
                errors.append(
                    f"{location} -> {path} is {width}x{height}, "
                    f"expected an aspect ratio of exactly {BG_RATIO_WIDTH}:{BG_RATIO_HEIGHT}"
                )

for error in errors:
    print(f"error: {error}", file=sys.stderr)
print(f"{len(errors)} error(s)")
sys.exit(1 if errors else 0)
