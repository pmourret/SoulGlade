# -*- coding: utf-8 -*-
"""Render the visual roadmap page from its data file.

The page is a BUILD OUTPUT: never hand-edited. Content changes go to
soulglade-fil-conducteur.data.json, layout changes to the template.
Splitting them buys a loud failure -- json.load raises on a stray comma
here, where a malformed JS object literal used to render a blank page at
open time, with nothing to read in the console.

    python AUTOMATION/tools/build_fil_conducteur.py
    python AUTOMATION/tools/build_fil_conducteur.py --check
"""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "soulglade-fil-conducteur.data.json"
TEMPLATE = Path(__file__).with_name("templates") / "fil-conducteur.html"
OUT = REPO / "soulglade-fil-conducteur.html"
MARKER = "/* @@ROADMAP_DATA@@ */"


def render():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    template = TEMPLATE.read_text(encoding="utf-8")
    if MARKER not in template:
        sys.exit(f"!! marqueur {MARKER} absent de {TEMPLATE}")
    block = "const ROADMAP_DATA = " + json.dumps(
        data, indent=2, ensure_ascii=False) + ";"
    return template.replace(MARKER, block)


def main():
    html = render()
    if "--check" in sys.argv:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == html
        print("a jour" if same else "PERIME - relancer sans --check")
        sys.exit(0 if same else 1)
    OUT.write_text(html, encoding="utf-8")
    print(f"{OUT.name} — {len(html)} o depuis {DATA.name}")


if __name__ == "__main__":
    main()