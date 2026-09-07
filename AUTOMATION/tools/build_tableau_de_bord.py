# -*- coding: utf-8 -*-
"""Render the project board from its data file.

The board is the single source of truth for PROJECT STATE: epic breakdown,
per-item status, iteration sequence. Reasoning lives elsewhere -- PROJET.md,
CLAUDE.md, DOCS/adr/, DOCS/cadrage/, DOCS/retros/ -- and this file never
duplicates it.

The HTML is a BUILD OUTPUT: never hand-edited. State changes go to
soulglade-tableau-de-bord.data.json, layout changes to the template. Splitting
them buys a loud failure -- json.load raises on a stray comma here, where a
malformed JS object literal used to render a blank page at open time.

    python AUTOMATION/tools/build_tableau_de_bord.py
    python AUTOMATION/tools/build_tableau_de_bord.py --check
"""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "soulglade-tableau-de-bord.data.json"
TEMPLATE = Path(__file__).with_name("templates") / "tableau-de-bord.html"
OUT = REPO / "soulglade-tableau-de-bord.html"
MARKER = "/* @@BOARD_DATA@@ */"

VALID_STATES = {"fait", "cours", "faire", "dette", "veille"}


def check(data):
    """Fail loudly on the mistakes a hand edit actually makes."""
    errors = []
    ids = [e["id"] for e in data["epics"]]
    if len(ids) != len(set(ids)):
        errors.append("identifiant d'EPIC en double")
    for epic in data["epics"]:
        if not epic["items"]:
            errors.append(f"{epic['id']} : aucun travail")
        for item in epic["items"]:
            if item["s"] not in VALID_STATES:
                errors.append(f"{epic['id']} : statut inconnu '{item['s']}' sur \"{item['t']}\"")
    known = set(ids)
    for it in data["iterations"]:
        for ref in (x.strip() for x in it.get("epics", "").split(",") if x.strip()):
            if ref not in known:
                errors.append(f"{it['id']} : renvoie vers l'EPIC inconnu '{ref}'")
    if sum(1 for it in data["iterations"] if it.get("state") == "now") > 1:
        errors.append("plus d'une itération ouverte -- une seule à la fois")
    return errors


def render():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    errors = check(data)
    if errors:
        sys.exit("!! " + "\n!! ".join(errors))
    template = TEMPLATE.read_text(encoding="utf-8")
    if MARKER not in template:
        sys.exit(f"!! marqueur {MARKER} absent de {TEMPLATE}")
    block = "const D = " + json.dumps(data, indent=2, ensure_ascii=False) + ";"
    return data, template.replace(MARKER, block)


def main():
    data, html = render()
    if "--check" in sys.argv:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == html
        print("a jour" if same else "PERIME - relancer sans --check")
        sys.exit(0 if same else 1)
    OUT.write_text(html, encoding="utf-8")
    total = sum(len(e["items"]) for e in data["epics"])
    done = sum(1 for e in data["epics"] for i in e["items"] if i["s"] == "fait")
    print(f"{OUT.name} - {len(html)} o | {len(data['epics'])} EPIC, "
          f"{done}/{total} travaux faits, {len(data['iterations'])} iterations")


if __name__ == "__main__":
    main()
