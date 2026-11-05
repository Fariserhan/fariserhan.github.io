#!/usr/bin/env python3
"""Make the smaller copies of each screenshot that the pages offer browsers.

For every entry in assets/img/shots/*/shots.json this writes, when missing:
  * <name>.thumb.webp  480 px wide  (contact sheets, home-page cards)
  * <name>.mid.webp    960 px wide  (pictures on the page; only for files 1400 px or wider)
and records them in the manifest as "thumb" and "mid". The full file stays the
one the viewer opens. exhibits.js turns these into srcset, so phones and
standard screens download a picture close to the size it is shown.

Usage: python3 scripts/make_image_sizes.py [--force]   (needs Pillow: pip install Pillow)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SIZES = {"thumb": 480, "mid": 960}
MID_MIN_WIDTH = 1400  # below this the full file is already close to 960 px
QUALITY = 85


def main() -> int:
    force = "--force" in sys.argv
    made = 0
    for manifest in sorted(ROOT.glob("assets/img/shots/*/shots.json")):
        raw = manifest.read_text(encoding="utf-8")
        shots = json.loads(raw)
        changed = False
        for shot in shots:
            src = manifest.parent / shot["file"]
            with Image.open(src) as im:
                w, h = im.size
                if (shot.get("w"), shot.get("h")) != (w, h):
                    shot["w"], shot["h"] = w, h
                    changed = True
                for key, width in SIZES.items():
                    if key == "mid" and w < MID_MIN_WIDTH:
                        if shot.pop("mid", None) is not None:   # the source shrank: drop the stale entry
                            changed = True
                        continue
                    name = f"{src.stem}.{key}.webp"
                    out = manifest.parent / name
                    # remake when missing or older than its source (a screenshot replaced under the same name)
                    if force or not out.exists() or out.stat().st_mtime < src.stat().st_mtime:
                        rgba = im.convert("RGBA")
                        flat = Image.new("RGB", rgba.size, "white")   # transparent areas become white, not black
                        flat.paste(rgba, mask=rgba.split()[3])
                        flat.resize((width, round(width * h / w)), Image.LANCZOS).save(
                            out, "WEBP", quality=QUALITY, method=6)
                        made += 1
                    if shot.get(key) != name:
                        # Keep "thumb" and "mid" next to "file" for easy reading.
                        items = list(shot.items())
                        shot.clear()
                        for k, v in items:
                            if k != key:
                                shot[k] = v
                            if k == ("thumb" if key == "mid" else "file"):
                                shot[key] = name
                        shot.setdefault(key, name)
                        changed = True
        if changed:
            manifest.write_text(json.dumps(shots, indent=2, ensure_ascii=False) + ("\n" if raw.endswith("\n") else ""),
                                encoding="utf-8")
            print(f"updated {manifest.relative_to(ROOT)}")
    print(f"{made} image(s) written.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
