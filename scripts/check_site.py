#!/usr/bin/env python3
"""Static checks for the portfolio site. Standard library only.

Checks:
  * every local href / src / srcset / poster / CSS url() in the HTML pages
    resolves to a file in the repository (http(s), mailto:, tel:, data: and
    javascript: URLs are skipped; absolute https://fariserhan.github.io/ URLs,
    e.g. og:image and canonical, are treated as local);
  * every #fragment link to a page in the repository (including the
    data-evidence links figures.js turns into <a href>) matches an id (or
    <a name>) on that page;
  * data-shots folders have a shots.json manifest, every file, thumb and mid
    (960 px copy) it lists exists, and every data-file names an entry in that
    manifest;
  * data-items JSON exists, each item's shots folder/cover/href resolves;
  * url() references inside assets/css/*.css resolve;
  * relative ES-module imports inside assets/js/*.js resolve;
  * every JSON file under data/ and assets/img/shots/ parses, as does every
    <script type="application/ld+json"> and <script type="application/json">
    block, and every URL in sitemap.xml maps to a page in the repository.

Usage: python3 scripts/check_site.py [repo-root]   (exit status 1 on failure)
"""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent).resolve()
SITE = "https://fariserhan.github.io"
SKIP_SCHEMES = ("http:", "https:", "mailto:", "tel:", "data:", "javascript:", "blob:")
CSS_URL = re.compile(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)""")
JS_IMPORT = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}/[^'"]+)\1""")

errors: list[str] = []


def err(where: str, msg: str) -> None:
    errors.append(f"{where}: {msg}")


def rel(p: Path) -> str:
    try:
        return str(p.relative_to(ROOT))
    except ValueError:
        return str(p)


def resolve(ref: str, base_dir: Path) -> tuple[Path | None, str]:
    """Map a URL reference to (path in repo or None if external, fragment)."""
    ref = ref.strip()
    if ref.startswith(SITE):
        ref = ref[len(SITE):] or "/"
    elif ref.lower().startswith(SKIP_SCHEMES) or ref.startswith("//"):
        return None, ""
    parts = urlsplit(ref)
    path = unquote(parts.path)
    if not path:  # "#frag" or "?q" — same document
        return Path(), parts.fragment
    target = (ROOT / path.lstrip("/")) if path.startswith("/") else (base_dir / path)
    target = target.resolve()
    if path.endswith("/") or target.is_dir():
        target = target / "index.html"
    return target, parts.fragment


def check_file(where: str, ref: str, base_dir: Path, what: str = "") -> Path | None:
    target, _ = resolve(ref, base_dir)
    if target is None or target == Path():
        return None
    if ROOT not in target.parents and target != ROOT:
        err(where, f"{what or 'reference'} {ref!r} points outside the repository")
        return None
    if not target.is_file():
        err(where, f"missing {what or 'file'} {ref!r} (expected {rel(target)})")
        return None
    return target


def load_json(path: Path, where: str):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        err(where, f"invalid JSON in {rel(path)}: {e}")
        return None


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.refs: list[tuple[int, str, str, str]] = []  # line, tag, attr, value
        self.shots: list[tuple[int, str, str | None]] = []  # line, folder, data-file
        self.items: list[tuple[int, str]] = []
        self.styles: list[tuple[int, str]] = []
        self.json_blocks: list[tuple[int, str, str]] = []
        self._script: tuple[int, str] | None = None
        self._style: int | None = None
        self._buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        for attr in ("href", "src", "poster", "action", "data-src"):
            if a.get(attr) is not None and not (tag == "form" and attr == "action" and not a[attr]):
                self.refs.append((line, tag, attr, a[attr]))
        if a.get("data-evidence"):  # figures.js copies it into an <a href> at runtime
            self.refs.append((line, "a", "data-evidence", a["data-evidence"]))
        for attr in ("srcset", "imagesrcset"):
            if a.get(attr):
                for cand in a[attr].split(","):
                    url = cand.strip().split()[0] if cand.strip() else ""
                    if url:
                        self.refs.append((line, tag, attr, url))
        if tag == "meta" and (a.get("property") or a.get("name") or "").lower() in (
            "og:image", "og:url", "twitter:image", "msapplication-tileimage"
        ):
            if a.get("content"):
                self.refs.append((line, tag, "content", a["content"]))
        if a.get("style"):
            self.styles.append((line, a["style"]))
        if "data-shots" in a:
            self.shots.append((line, a["data-shots"] or "", a.get("data-file")))
        if "data-items" in a:
            self.items.append((line, a["data-items"] or ""))
        if tag == "script":
            t = (a.get("type") or "").lower()
            if t in ("application/ld+json", "application/json", "importmap"):
                self._script = (line, t)
                self._buf = []
        if tag == "style":
            self._style = line
            self._buf = []

    handle_startendtag = handle_starttag

    def handle_data(self, data):
        if self._script or self._style:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._script:
            self.json_blocks.append((self._script[0], self._script[1], "".join(self._buf)))
            self._script = None
        elif tag == "style" and self._style:
            self.styles.append((self._style, "".join(self._buf)))
            self._style = None


def parse_page(path: Path) -> Page:
    p = Page()
    p.feed(path.read_text(encoding="utf-8"))
    p.close()
    return p


def main() -> int:
    pages = sorted(ROOT.glob("*.html")) + sorted(ROOT.glob("projects/*.html"))
    parsed = {pg.resolve(): parse_page(pg) for pg in pages}
    ids_cache: dict[Path, set[str]] = {k: v.ids for k, v in parsed.items()}
    manifests: dict[Path, list | None] = {}
    n_refs = 0

    def ids_of(page: Path) -> set[str] | None:
        if page.suffix != ".html":
            return None
        if page not in ids_cache:
            ids_cache[page] = parse_page(page).ids
        return ids_cache[page]

    def manifest(folder_ref: str, base_dir: Path, where: str):
        folder = (base_dir / unquote(folder_ref)).resolve()
        mf = folder / "shots.json"
        if mf in manifests:
            return folder, manifests[mf]
        if not mf.is_file():
            err(where, f"data-shots folder {folder_ref!r} has no shots.json ({rel(mf)})")
            manifests[mf] = None
            return folder, None
        data = load_json(mf, where)
        if data is not None and not isinstance(data, list):
            err(rel(mf), "manifest must be a JSON array")
            data = None
        for i, s in enumerate(data or []):
            if not isinstance(s, dict) or not s.get("file"):
                err(rel(mf), f"entry {i} has no 'file'")
                continue
            for key in ("file", "thumb", "mid"):
                if s.get(key) and not (folder / s[key]).is_file():
                    err(rel(mf), f"entry {i} {key} {s[key]!r} does not exist")
            for key in ("w", "h"):
                if not isinstance(s.get(key), (int, float)) or s[key] <= 0:
                    err(rel(mf), f"entry {i} ({s['file']}) needs a positive numeric {key!r}")
        manifests[mf] = data
        return folder, data

    for page, doc in parsed.items():
        name = rel(page)
        base = page.parent
        for line, tag, attr, value in doc.refs:
            where = f"{name}:{line} <{tag} {attr}>"
            if attr == "action" and not value:
                continue
            target, frag = resolve(value, base)
            if target is None:
                continue
            n_refs += 1
            if target == Path():  # same-page fragment
                if frag and frag != "top" and frag not in doc.ids:
                    err(where, f"fragment #{frag} not found on this page")
                continue
            if not target.is_file():
                err(where, f"missing file {value!r} (expected {rel(target)})")
                continue
            if frag and tag in ("a", "area"):
                ids = ids_of(target)
                if ids is not None and frag != "top" and frag not in ids:
                    err(where, f"fragment #{frag} not found in {rel(target)}")

        for line, css in doc.styles:
            for _, url in CSS_URL.findall(css):
                if not url.startswith("#"):
                    n_refs += 1
                    check_file(f"{name}:{line} style", url, base, "url()")

        for line, kind, text in doc.json_blocks:
            try:
                json.loads(text)
            except ValueError as e:
                err(f"{name}:{line}", f"<script type={kind}> does not parse: {e}")

        for line, folder_ref, data_file in doc.shots:
            where = f"{name}:{line} data-shots"
            if not folder_ref.endswith("/"):
                err(where, f"{folder_ref!r} should end with '/' (exhibits.js appends 'shots.json')")
            folder, data = manifest(folder_ref, base, where)
            n_refs += 1
            if data_file is not None:
                if not data or not any(isinstance(s, dict) and s.get("file") == data_file for s in data):
                    err(where, f"data-file {data_file!r} is not an entry in {rel(folder / 'shots.json')}")

        for line, items_ref in doc.items:
            where = f"{name}:{line} data-items"
            n_refs += 1
            path = check_file(where, items_ref, base, "data-items JSON")
            if not path:
                continue
            items = load_json(path, where)
            if not isinstance(items, list):
                err(where, f"{rel(path)} must be a JSON array")
                continue
            for i, it in enumerate(items):
                iw = f"{rel(path)} item {i}"
                if not isinstance(it, dict) or not it.get("title"):
                    err(iw, "needs a 'title'")
                    continue
                if it.get("shots"):
                    folder, data = manifest(it["shots"], path.parent, iw)
                    if it.get("cover") and not any(s.get("file") == it["cover"] for s in data or []):
                        err(iw, f"cover {it['cover']!r} is not in {rel(folder / 'shots.json')}")
                if it.get("href"):  # resolved against the page, as exhibits.js does
                    target, frag = resolve(it["href"], base)
                    if target not in (None, Path()) and not target.is_file():
                        err(iw, f"href {it['href']!r} does not resolve from {name}")

    # Stylesheets.
    for css in sorted(ROOT.glob("assets/css/*.css")):
        text = css.read_text(encoding="utf-8")
        for m in CSS_URL.finditer(text):
            url = m.group(2)
            if url.startswith("#"):
                continue
            n_refs += 1
            line = text.count("\n", 0, m.start()) + 1
            check_file(f"{rel(css)}:{line} url()", url, css.parent, "url()")

    # Relative module imports.
    for js in sorted(ROOT.glob("assets/js/*.js")):
        text = js.read_text(encoding="utf-8")
        for m in JS_IMPORT.finditer(text):
            n_refs += 1
            check_file(f"{rel(js)} import", m.group(2), js.parent, "module")

    # Every JSON data file parses.
    n_json = 0
    for pattern in ("data/**/*.json", "data/**/*.geojson", "assets/img/shots/**/*.json"):
        for f in sorted(ROOT.glob(pattern)):
            n_json += 1
            load_json(f, rel(f))

    # Sitemap URLs map to pages.
    sitemap = ROOT / "sitemap.xml"
    if sitemap.is_file():
        for loc in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", sitemap.read_text(encoding="utf-8")):
            n_refs += 1
            if not loc.startswith(SITE):
                err("sitemap.xml", f"{loc} is not on {SITE}")
            else:
                check_file("sitemap.xml", loc, ROOT, "page")

    print(f"Checked {len(pages)} pages, {n_refs} local references, "
          f"{len([m for m in manifests.values() if m is not None])} shot manifests, {n_json} JSON files.")
    if errors:
        print(f"\n{len(errors)} problem(s):")
        for e in errors:
            print("  - " + e)
        return 1
    print("All good.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
