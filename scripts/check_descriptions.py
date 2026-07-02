#!/usr/bin/env python3
"""Prüft, dass description.de/en jedes Templates mindestens MIN_WORDS Wörter hat."""
import glob
import sys

import yaml

MIN_WORDS = 200


def word_count(text: str) -> int:
    return len(text.split())


def main() -> int:
    targets = sys.argv[1:] or sorted(
        p.split("/")[0] for p in glob.glob("*/manifest.yaml")
    )
    failed = False
    for name in targets:
        path = f"{name}/manifest.yaml"
        data = yaml.safe_load(open(path, encoding="utf-8"))
        desc = data.get("description") or {}
        for lang in ("de", "en"):
            n = word_count(desc.get(lang, ""))
            status = "OK" if n >= MIN_WORDS else "ZU KURZ"
            print(f"{name:24} {lang}: {n:3} Wörter  {status}")
            if n < MIN_WORDS:
                failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
