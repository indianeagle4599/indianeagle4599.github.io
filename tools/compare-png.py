#!/usr/bin/env python3
"""Pixel-diff two PNG trees. No extra Python deps beyond Pillow (already installed)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def diff_pair(before: Path, after: Path, dest: Path, threshold: int) -> dict:
    a = Image.open(before).convert("RGB")
    b = Image.open(after).convert("RGB")
    if a.size != b.size:
        dest.parent.mkdir(parents=True, exist_ok=True)
        b.save(dest)
        return {
            "file": rel(after, after.parents[len(after.parts) - len(before.parts) + after.as_posix().count("/")]),
            "status": "size-mismatch",
            "before_size": list(a.size),
            "after_size": list(b.size),
            "changed_percent": 100.0,
        }

    delta = ImageChops.difference(a, b)
    pixels = list(delta.getdata())
    total = len(pixels)
    changed = sum(1 for r, g, bl in pixels if r > threshold or g > threshold or bl > threshold)
    percent = round(100.0 * changed / total, 4) if total else 0.0
    status = "match" if changed == 0 else "diff"
    if changed:
        dest.parent.mkdir(parents=True, exist_ok=True)
        mask = Image.new("L", a.size)
        mask.putdata([255 if (r > threshold or g > threshold or bl > threshold) else 0 for r, g, bl in pixels])
        overlay = Image.new("RGB", a.size, (255, 0, 80))
        vis = a.copy()
        vis.paste(overlay, mask=mask)
        vis.save(dest)
    return {
        "changed_pixels": changed,
        "changed_percent": percent,
        "status": status,
        "total_pixels": total,
    }


def main() -> int:
    if len(sys.argv) < 4:
        print("Usage: compare-png.py BASELINE_DIR AFTER_DIR DIFF_DIR [threshold]", file=sys.stderr)
        return 2
    baseline = Path(sys.argv[1])
    after = Path(sys.argv[2])
    diff_dir = Path(sys.argv[3])
    threshold = int(sys.argv[4]) if len(sys.argv) > 4 else 8

    results = []
    missing = []
    extra = []
    baseline_files = {rel(p, baseline): p for p in baseline.rglob("*.png")}
    after_files = {rel(p, after): p for p in after.rglob("*.png")}

    for name, path in sorted(after_files.items()):
        if name not in baseline_files:
            extra.append(name)
            continue
        row = diff_pair(baseline_files[name], path, diff_dir / name, threshold)
        row["file"] = name
        results.append(row)

    for name in sorted(baseline_files):
        if name not in after_files:
            missing.append(name)

    summary = {
        "diff_count": sum(1 for row in results if row["status"] != "match"),
        "extra": extra,
        "missing": missing,
        "pairs": results,
        "threshold": threshold,
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
