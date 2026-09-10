# -*- coding: utf-8 -*-
"""Check the project board: data contract, then the render that reads it.

The render is a <script> in a hand-written template. Its failure mode is a
blank page at open time -- nothing raises, nothing logs. So the script is run
here against a stub document and the produced markup is asserted, which is the
only thing that fails loudly when the template breaks.

    python AUTOMATION/tests/test_tableau_de_bord.py
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from copy import deepcopy
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import build_tableau_de_bord as board  # noqa: E402

DATA = json.loads(board.DATA.read_text(encoding="utf-8"))

STUB = """
const noeuds = {};
const document = {
  getElementById: id => noeuds[id] = noeuds[id] || {innerHTML: '', textContent: '', id,
                                                    addEventListener(){}, querySelectorAll: () => []},
  querySelectorAll: () => [],
};
%s
console.log(JSON.stringify(Object.fromEntries(
  Object.entries(noeuds).map(([k, v]) => [k, v.innerHTML || v.textContent]))));
"""


def erreurs(mutate):
    """Run check() on a copy of the real data, mutated by `mutate`."""
    data = deepcopy(DATA)
    mutate(data)
    return board.check(data)


def test_contrat_de_donnees():
    assert board.check(DATA) == [], "les donnees committees ne passent pas leur propre controle"

    def item_vers_iteration_fantome(d):
        d["epics"][0]["items"][0]["it"] = "IT-999"
    assert any("IT-999" in e for e in erreurs(item_vers_iteration_fantome)), \
        "un travail rattache a une iteration inexistante doit etre refuse"

    def sous_phase_orpheline(d):
        d["iterations"].append({"id": "IT-42z", "state": "next", "titre": "x",
                                "quoi": "x", "dod": "x", "epics": "E1"})
    assert any("IT-42z" in e for e in erreurs(sous_phase_orpheline)), \
        "une sous-phase sans phase mere doit etre refusee"

    def etat_inconnu(d):
        d["iterations"][0]["state"] = "gele"
    assert any("gele" in e for e in erreurs(etat_inconnu)), \
        "un etat hors du vocabulaire de `etats` doit etre refuse"

    def depend_du_vide(d):
        d["iterations"][-1]["dep"] = "IT-404"
    assert any("IT-404" in e for e in erreurs(depend_du_vide)), \
        "une dependance vers une iteration inexistante doit etre refusee"

    def depend_de_soi(d):
        d["iterations"][-1]["dep"] = d["iterations"][-1]["id"]
    assert any("elle-meme" in e for e in erreurs(depend_de_soi)), \
        "une iteration ne peut pas dependre d'elle-meme"
    print("  ok  contrat de donnees")


def test_plafonds():
    vide = {"iterations": [], "epics": [], "decisions": [],
            "horizon": {"items": []}, "ecartees": {"items": []}}
    assert board.surcharge(vide) == []

    trop = dict(vide,
                decisions=[{"t": "x", "e": "tranche", "d": "a" * 900}],
                iterations=[{"id": "IT-9", "quoi": "a — b — c", "dod": "ok"}])
    lignes = board.surcharge(trop)
    assert any("900 car." in l for l in lignes), lignes
    assert any("tirets cadratins" in l for l in lignes), lignes

    def decision_trop_longue(data):
        data["decisions"][0]["d"] = "a" * 900
    assert any("900 car." in e for e in erreurs(decision_trop_longue)), \
        "un depassement de plafond doit bloquer le build, pas seulement s'afficher"
    print("  ok  plafonds")


def test_rendu():
    node = shutil.which("node")
    if not node:
        print("  --  rendu : node absent, saute")
        return

    _, html = board.render()
    scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
    assert len(scripts) == 1, f"{len(scripts)} blocs de script, le stub en attend un"

    with tempfile.NamedTemporaryFile("w", suffix=".mjs", encoding="utf-8", delete=False) as f:
        f.write(STUB % scripts[0])
        chemin = f.name
    try:
        out = subprocess.run([node, chemin], capture_output=True, text=True,
                             encoding="utf-8", timeout=30)
    finally:
        Path(chemin).unlink(missing_ok=True)
    assert out.returncode == 0, f"le rendu leve une exception :\n{out.stderr}"
    rendu = json.loads(out.stdout)

    its = rendu["iterations"]

    def entete(id_):
        """The summary of one iteration card -- where its tags live."""
        bloc = its[its.index(f'>{id_}<'):]
        return bloc[:bloc.index("</summary>")]

    for it in DATA["iterations"]:
        assert f'>{it["id"]}<' in its, f"{it['id']} absent du rendu"
        # l'etat est un tag lu dans `etats`, jamais un libelle en dur du gabarit
        libelle = DATA["etats"][it["state"]]["label"]
        assert f"<i>{libelle}</i>" in entete(it["id"]), \
            f"{it['id']} n'affiche pas son etat « {libelle} »"
        if it.get("dep"):
            assert "dépend de" in entete(it["id"]), f"{it['id']} n'affiche pas sa dependance"

    # une sous-phase se lit sous sa phase mere, jamais a plat
    branches = [it["id"] for it in DATA["iterations"] if re.fullmatch(r"IT-\d+[a-z]", it["id"])]
    assert branches, "le jeu de donnees n'a plus de sous-phase : ce test ne verifie plus rien"
    for id_ in branches:
        mere = re.match(r"IT-\d+", id_).group(0)
        entre = its[its.index(f'>{mere}<'):its.index(f'>{id_}<')]
        assert '<div class="phase">' in entre, f"{id_} est rendue a plat, pas sous {mere}"

    # l'avancement est compte sur les travaux rattaches, jamais declare
    lies = {}
    for e in DATA["epics"]:
        for i in e["items"]:
            if i.get("it"):
                lies.setdefault(i["it"], []).append(i["s"])
    assert lies, "plus aucun travail rattache : l'avancement ne veut plus rien dire"
    for id_, statuts in lies.items():
        attendu = f'{statuts.count("fait")}/{len(statuts)}'
        assert attendu in entete(id_), f"{id_} devrait afficher {attendu}"

    assert rendu["epics"].count('class="epic"') == len(DATA["epics"])
    assert rendu["decisions"].count('class="flag"') == len(DATA["decisions"])
    print(f"  ok  rendu ({len(DATA['iterations'])} iterations, {len(lies)} avec avancement compte)")


if __name__ == "__main__":
    test_contrat_de_donnees()
    test_plafonds()
    test_rendu()
    print("tableau de bord : ok")
