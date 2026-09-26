# -*- coding: utf-8 -*-
"""Registre des mondes (AUTOMATION/worlds.py, ADR-0012, J7bis).

POURQUOI CE TEST EXISTE. J7bis introduit l'axe « monde » (CLAUDE.md §3). Le
registre doit (1) charger les deux mondes reels, (2) prouver qu'ils ne sont pas
une copie l'un de l'autre — familles compatibles distinctes —, (3) rendre une
erreur PROPRE sur un id inconnu, jamais un chemin nu ni un FileNotFoundError
brut, (4) garder les mondes ETANCHES par famille : le filtre du wizard ne doit
jamais proposer un monde flux a un personnage sdxl (le risque §11 exact).

Le chemin heureux tourne contre le vrai WORLDS/ (versionne, toujours present).
Les cas limites tournent contre un WORLDS/ jetable (monkeypatch WORLDS_DIR).

Lancer :  python_embeded\\python.exe AUTOMATION\\tests\\test_worlds_registry.py
"""
import json
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import universe  # noqa: E402
import worlds    # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def attend(exc, fn, texte):
    try:
        fn()
    except exc as e:
        verifie(True, f"{texte} — {type(e).__name__} lisible ({e})")
    except Exception as e:  # noqa: BLE001
        verifie(False, f"{texte} — type inattendu {type(e).__name__} : {e}")
    else:
        verifie(False, f"{texte} — aucune erreur levee")


REELS = ("slow-life", "terres-sauvages")

# --------------------------------------------------------------- [1] vrai registre
print("[1] les deux mondes reels se chargent et ont leurs cles de structure")
ids = worlds.list_worlds()
verifie(set(ids) >= set(REELS), f"list_worlds() contient les deux mondes ({ids})")
# Un catalogue adulte est le SECOND catalogue d'un monde, pas un monde : son
# fichier `<id>.adulte.json` ne doit jamais remonter comme une entree du
# registre (trouve a l'audit de l'ecran 11, ou il s'affichait comme un monde
# vide nomme « slow-life.adulte »).
verifie(not [w for w in ids if w.endswith(".adulte")],
        f"aucun catalogue adulte dans le registre ({ids})")
for wid in REELS:
    w = worlds.load_world(wid)
    verifie(w.get("id") == wid and bool(w.get("label"))
            and isinstance(w.get("compatible_families"), list) and w["compatible_families"],
            f"{wid} : id + label + compatible_families non vide")
    verifie(worlds.label(wid) and isinstance(worlds.suggested_styles(wid), list)
            and isinstance(worlds.places(wid), list) and worlds.scenes(wid),
            f"{wid} : accesseurs label / suggested_styles / places / scenes sains")

# ----------------------------------------------- [2] pas une copie l'un de l'autre
print("\n[2] les deux mondes ne sont pas une copie l'un de l'autre")
verifie(set(worlds.compatible_families("slow-life"))
        != set(worlds.compatible_families("terres-sauvages")),
        "familles compatibles distinctes (flux vs sdxl)")

# ------------------------------------------- [3] etancheite par famille (risque §11)
print("\n[3] worlds_for_family : un monde ne fuit pas dans une autre famille")
verifie(worlds.worlds_for_family("flux") == ["slow-life"],
        f"flux -> ['slow-life'] (obtenu {worlds.worlds_for_family('flux')})")
verifie(worlds.worlds_for_family("sdxl") == ["terres-sauvages"],
        f"sdxl -> ['terres-sauvages'] (obtenu {worlds.worlds_for_family('sdxl')})")
verifie("terres-sauvages" not in worlds.worlds_for_family("flux")
        and "slow-life" not in worlds.worlds_for_family("sdxl"),
        "aucun croisement flux <-> sdxl")

# ------------------------------------------------ [4] compatibilite = garde-fou
print("\n[4] is_compatible / assert_compatible")
verifie(worlds.is_compatible("slow-life", "flux") is True,
        "slow-life compatible flux")
verifie(worlds.is_compatible("slow-life", "sdxl") is False,
        "slow-life PAS compatible sdxl")
worlds.assert_compatible("slow-life", "flux")   # ne doit pas lever
verifie(True, "assert_compatible('slow-life', 'flux') passe sans lever")
attend(worlds.IncompatibleWorldError,
       lambda: worlds.assert_compatible("terres-sauvages", "flux"),
       "assert_compatible('terres-sauvages', 'flux')")

# --------------------------------------------------------------- [5] id inconnu
print("\n[5] un id inconnu sort en erreur propre, pas en 500")
attend(worlds.UnknownWorldError, lambda: worlds.load_world("does-not-exist"),
       "load_world inconnu")
attend(worlds.UnknownWorldError, lambda: worlds.compatible_families("does-not-exist"),
       "compatible_families inconnu")
attend(worlds.UnknownWorldError, lambda: worlds.is_compatible("does-not-exist", "flux"),
       "is_compatible inconnu")
verifie(worlds.exists("slow-life") is True, "exists() vrai sur un monde reel")
verifie(worlds.exists("does-not-exist") is False, "exists() faux sur un inconnu")
verifie(worlds.exists("") is False and worlds.exists(None) is False,
        "exists() faux sur '' et None (jamais un chemin construit avec du vide)")

# --------------------------------------------------- [6] assets() normalise
print("\n[6] assets() rend toujours {lora, lora_strength, prompt_add}")
for wid in REELS:
    a = worlds.assets(wid)
    verifie(set(a) == {"lora", "lora_strength", "prompt_add"},
            f"{wid} : assets() a exactement les trois cles ({sorted(a)})")

# ------------------------- [7] compatible_families croise les familles reelles
print("\n[7] toute famille declaree par un monde est une model_family reelle")
reelles = {universe.model_family(u) for u in universe.list_universes()}
for wid in REELS:
    inconnues = [f for f in worlds.compatible_families(wid) if f not in reelles]
    verifie(not inconnues,
            f"{wid} : compatible_families incluses dans {sorted(reelles)} "
            f"(hors : {inconnues})")

# --------------------------------------------------- [8] registre jetable
print("\n[8] cas limites sur un WORLDS/ jetable")
_vrai = worlds.WORLDS_DIR
_tmp = Path(tempfile.mkdtemp(prefix="worlds_test_"))
try:
    worlds.WORLDS_DIR = _tmp
    verifie(worlds.list_worlds() == [], "WORLDS/ vide -> list_worlds() == []")
    verifie(worlds.worlds_for_family("flux") == [], "WORLDS/ vide -> worlds_for_family() == []")

    (_tmp / "casse.json").write_text("{ pas du json", encoding="utf-8")
    attend(ValueError, lambda: worlds.load_world("casse"), "JSON casse")

    attend(worlds.UnknownWorldError, lambda: worlds.load_world("absent"),
           "monde absent du registre jetable")
finally:
    worlds.WORLDS_DIR = _vrai
    shutil.rmtree(_tmp, ignore_errors=True)

# ----------------------------------- [9] le catalogue n'habille pas ses scenes
print("\n[9] un monde n'habille pas ses scenes, un decor ne porte pas d'intention")
# La tenue, la pose, le format et le compte sont des reglages de PERSONNAGE. Un
# monde qui les livrerait habillerait de la meme facon tous les personnages qui
# y naissent, et rendrait fausse la premiere mesure de verrou qui suit.
# Un decor dit OU, jamais quoi montrer (ADR-0027 §2).
for wid in REELS:
    toutes = worlds.scenes(wid) + worlds.scenes_adulte(wid)
    intrus = sorted({k for s in toutes for k in worlds.CHARACTER_ONLY_SCENE_KEYS if k in s})
    verifie(not intrus, f"{wid} : scenes (et branche adulte) sans reglage de personnage"
                        + (f" — trouve : {', '.join(intrus)}" if intrus else ""))
    decors = {p["id"] for p in worlds.places(wid)}
    cles = {i["key"] for i in worlds.intentions(wid)}
    verifie(all(s.get("place") in decors for s in toutes),
            f"{wid} : chaque scene puise dans un decor du monde")
    verifie(all(s.get("intention") in cles for s in toutes),
            f"{wid} : chaque scene porte une intention du monde")
    verifie(all(worlds.materialize(wid, s) for s in toutes),
            f"{wid} : chaque scene se compose en un prompt non vide")
    verifie(not [i for i in worlds.intentions(wid)
                 if "min_intensity" in i or "format" in (i.get("defaults") or {})],
            f"{wid} : aucune intention ne porte de niveau ni de format (ADR-0027 §3)")

_vrai = worlds.WORLDS_DIR
_tmp = Path(tempfile.mkdtemp(prefix="worlds_dressing_"))
try:
    worlds.WORLDS_DIR = _tmp
    (_tmp / "habille.json").write_text(
        json.dumps({"id": "habille", "label": "Habille",
                    "compatible_families": ["flux"],
                    "scenes": [{"id": "s1", "prompt": "x",
                                "wardrobe": {"0": "a red dress"}}],
                    "places": [{"id": "d1", "prompt": "x", "intention": "selfie"}]}),
        encoding="utf-8")
    attend(ValueError, lambda: worlds.scenes("habille"),
           "un monde qui habille une de ses scenes : refuse au chargement")
    attend(ValueError, lambda: worlds.places("habille"),
           "un decor qui porte une intention : refuse au chargement")
finally:
    worlds.WORLDS_DIR = _vrai
    shutil.rmtree(_tmp, ignore_errors=True)

# --------------------------------- [9b] branche ADULTE, fichier a part (21/09)
print()
print("[9b] la branche adulte est un fichier a part, validee comme l'autre")
_tmp = Path(tempfile.mkdtemp(prefix="worlds_adulte_"))
try:
    worlds.WORLDS_DIR = _tmp
    (_tmp / "sobre.json").write_text(json.dumps(
        {"id": "sobre", "label": "Sobre", "compatible_families": ["flux"],
         "scenes": [{"id": "s1", "prompt": "x"}]}), encoding="utf-8")
    verifie(worlds.scenes_adulte("sobre") == [],
            "un monde sans fichier adulte a cote rend [] : c'est le cas nominal")
    verifie(not worlds.adulte_path("sobre").exists(),
            "et son fichier n'existe pas : un monde sans branche adulte se "
            "livre seul, c'est tout l'interet des deux fichiers")

    (_tmp / "adulte.json").write_text(json.dumps(
        {"id": "adulte", "label": "Adulte", "compatible_families": ["flux"],
         "scenes": [{"id": "s1", "prompt": "un cafe"}]}), encoding="utf-8")
    (_tmp / "adulte.adulte.json").write_text(json.dumps(
        {"scenes": [{"id": "a1", "prompt": "une chambre"}]}), encoding="utf-8")
    verifie([p["id"] for p in worlds.scenes_adulte("adulte")] == ["a1"],
            "la branche adulte se lit")
    verifie([p["id"] for p in worlds.scenes("adulte")] == ["s1"],
            "et elle ne fuit JAMAIS dans les scenes ordinaires")
    verifie(worlds.scene("adulte", "a1")["prompt"] == "une chambre",
            "scene() la trouve quand meme : une scene adulte reprise reste vivante")

    (_tmp / "habille2.json").write_text(json.dumps(
        {"id": "habille2", "label": "H", "compatible_families": ["flux"],
         "scenes": []}), encoding="utf-8")
    (_tmp / "habille2.adulte.json").write_text(json.dumps(
        {"scenes": [{"id": "a1", "prompt": "x",
                     "wardrobe": {"3": "nothing"}}]}), encoding="utf-8")
    attend(ValueError, lambda: worlds.scenes_adulte("habille2"),
           "une scene adulte qui habille : refusee comme les autres, la nudite "
           "est la garde-robe du PERSONNAGE a son palier, pas celle du monde")

    worlds.save_scenes_adulte("sobre", [{"id": "a1", "label": "Chambre",
                                         "prompt": "une chambre au matin"}])
    verifie(worlds.adulte_path("sobre").exists(),
            "save_scenes_adulte cree le fichier a cote")
    verifie([p["id"] for p in worlds.scenes_adulte("sobre")] == ["a1"],
            "et ce qu'on relit est ce qu'on a ecrit")
    verifie([p["id"] for p in worlds.scenes("sobre")] == ["s1"],
            "les scenes ordinaires n'ont pas bouge")
    worlds.save_scenes_adulte("sobre", [])
    verifie(not worlds.adulte_path("sobre").exists(),
            "une liste vide RETIRE le fichier : pas de coquille")
    verifie(worlds.scenes_adulte("sobre") == [],
            "et la lecture rend [] comme avant, sans rien casser")
    attend(worlds.UnknownWorldError,
           lambda: worlds.save_scenes_adulte("jamais-vu", []),
           "ecrire la branche d'un monde inconnu : refuse plutot que de "
           "creer un monde par surprise")
finally:
    worlds.WORLDS_DIR = _vrai
    shutil.rmtree(_tmp, ignore_errors=True)

# ------------------- [10] scene(), materialize(), save_scenes(), merge_scene()
print("\n[10] scene composee avec son decor, heritage vivant (ADR-0027 §4)")
for wid in REELS:
    first = worlds.scenes(wid)[0]
    verifie(worlds.scene(wid, first["id"]) == first,
            f"{wid} : scene({first['id']!r}) rend l'entree du catalogue")
attend(worlds.UnknownSceneError, lambda: worlds.scene("slow-life", "does-not-exist"),
       "scene() sur un id absent")
attend(worlds.UnknownWorldError, lambda: worlds.scene("does-not-exist", "x"),
       "scene() sur un monde absent")

_vrai = worlds.WORLDS_DIR
_tmp = Path(tempfile.mkdtemp(prefix="worlds_live_"))
try:
    worlds.WORLDS_DIR = _tmp
    (_tmp / "vivant.json").write_text(json.dumps({
        "id": "vivant", "label": "Vivant", "compatible_families": ["flux"],
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "places": [{"id": "d1", "label": "Chambre", "prompt": "a quiet room"}],
        "intentions": [{"key": "lifestyle", "label": "Lifestyle"}],
        "scenes": [{"id": "p1", "label": "Scene 1", "intention": "lifestyle",
                    "place": "d1", "prompt": "reading, morning light", "intensity": 1},
                   {"id": "nu", "prompt": "just a scene"},
                   {"id": "vide", "place": "d1"},
                   {"id": "perdu", "place": "gone", "prompt": "x"}],
    }), encoding="utf-8")

    sc = {s["id"]: s for s in worlds.scenes("vivant")}
    verifie(worlds.materialize("vivant", sc["p1"]) == "reading, morning light, a quiet room",
            "materialize : « <scene>, <decor> »")
    verifie(worlds.materialize("vivant", sc["nu"]) == "just a scene",
            "materialize : une scene sans decor reste son propre texte")
    verifie(worlds.materialize("vivant", sc["vide"]) == "a quiet room",
            "materialize : un decor sans texte de scene reste le decor")
    attend(worlds.UnknownPlaceError, lambda: worlds.materialize("vivant", sc["perdu"]),
           "materialize : decor disparu")

    merged = worlds.merge_scene("vivant", "p1", {"wardrobe": {"0": "jeans"}})
    verifie(merged["prompt"] == "reading, morning light" and merged["place"] == "d1"
            and merged["intention"] == "lifestyle" and merged["world_ref"] == "p1"
            and merged["origin"] == "world" and merged["world"] == "vivant"
            and merged["wardrobe"] == {"0": "jeans"} and merged["intensity"] == 1,
            f"merge_scene : texte propre + cle du decor + intensity du monde + overlay ({merged})")
    verifie(worlds.merge_scene("vivant", "p1", {"intensity": 0})["intensity"] == 0,
            "merge_scene : l'intensity du personnage recouvre celle du monde")
    attend(worlds.UnknownSceneError, lambda: worlds.merge_scene("vivant", "gone", {}),
           "merge_scene sur une scene absente")

    # corriger le DECOR atteint la scene composee : c'est ce que vend le monde
    data = worlds.load_world("vivant")
    data["places"][0]["prompt"] = "a sunlit room"
    (_tmp / "vivant.json").write_text(json.dumps(data), encoding="utf-8")
    def lancement(scene_bank):
        """Ce que lit build_jobs : la banque relue puis composee."""
        return worlds.compose_scene_bank(worlds.refresh_scene_bank(scene_bank))

    def banque(*scenes):
        return {"world": "vivant", "scenes": [dict(s) for s in scenes]}

    reprise = {"id": "p1", "world": "vivant", "origin": "world", "world_ref": "p1"}
    verifie(lancement(banque(reprise))["scenes"][0]["prompt"]
            == "reading, morning light, a sunlit room",
            "corriger un decor atteint toute scene qui y puise, au lancement")
    copie = {"id": "p1", "world": "vivant", "origin": "copy", "world_ref": "p1",
             "place": "d1", "prompt": "my own reading"}
    propre = {"id": "m1", "world": "vivant", "origin": "manual", "place": "d1",
              "prompt": "writing a letter"}
    lu = {s["id"]: s["prompt"] for s in lancement(banque(copie, propre))["scenes"]}
    verifie(lu == {"p1": "my own reading, a sunlit room",
                   "m1": "writing a letter, a sunlit room"},
            f"une copie et une scene propre suivent leur decor, pas le texte du monde ({lu})")
    verifie(lancement(banque({"id": "x", "prompt": "plain"}))["scenes"][0]["prompt"] == "plain",
            "une scene sans decor n'est pas touchee")
    attend(worlds.UnknownPlaceError,
           lambda: lancement(banque({"id": "z", "place": "gone", "prompt": "x"})),
           "un decor disparu au lancement")
    try:
        lancement(banque({"id": "z", "place": "gone", "prompt": "x"}))
    except worlds.UnknownPlaceError as e:
        verifie("'z'" in str(e), f"l'erreur nomme la scene ({e})")
    ancienne = dict(reprise, place="d1")
    data = worlds.load_world("vivant")
    data["scenes"][0].pop("place")
    (_tmp / "vivant.json").write_text(json.dumps(data), encoding="utf-8")
    verifie("place" not in worlds.refresh_scene_bank(banque(ancienne))["scenes"][0],
            "une scene reprise perd le decor que le monde a retire")
    data["scenes"][0]["place"] = "d1"
    (_tmp / "vivant.json").write_text(json.dumps(data), encoding="utf-8")

    worlds.save_scenes("vivant", [{"id": "p1", "label": "Scene 1",
                                   "place": "d1", "prompt": "reading, evening light"}])
    apres = worlds.load_world("vivant")
    verifie(apres["scenes"][0]["prompt"] == "reading, evening light",
            "save_scenes : les scenes relues portent le nouveau texte")
    verifie(apres["label"] == "Vivant" and apres["places"][0]["id"] == "d1",
            "save_scenes : le reste du fichier (label, decors) intact")
    verifie(lancement(banque(reprise))["scenes"][0]["prompt"]
            == "reading, evening light, a sunlit room",
            "merge_scene relit le catalogue APRES l'edition — heritage vivant")
finally:
    worlds.WORLDS_DIR = _vrai
    shutil.rmtree(_tmp, ignore_errors=True)

# --------------------------------------------- [11] create_world() (ADR-0016)
print("\n[11] create_world() : catalogue vide, pack curate, jamais un aiguillage")
attend(ValueError, lambda: worlds.create_world("Bad Id", "x", "instagram-influenceur"),
       "id invalide refuse")
attend(ValueError, lambda: worlds.create_world("probe-bad-pack", "x", "does-not-exist"),
       "pack inconnu refuse")
attend(FileExistsError, lambda: worlds.create_world("slow-life", "x", "instagram-influenceur"),
       "id deja pris refuse")

_vrai = worlds.WORLDS_DIR
_tmp = Path(tempfile.mkdtemp(prefix="worlds_create_"))
try:
    worlds.WORLDS_DIR = _tmp
    wid = worlds.create_world("probe-monde", "  Probe Monde  ", "rpg-personnage",
                              "  quiet test tone  ")
    verifie(wid == "probe-monde", "create_world rend l'id")
    data = worlds.load_world("probe-monde")
    verifie(data["label"] == "Probe Monde", "label nettoye des espaces")
    verifie(data["tone"] == "quiet test tone", "tone nettoye des espaces")
    verifie(data["places"] == [] and data["intentions"] == [] and data["scenes"] == [],
            "decors, intentions et scenes VIDES a la naissance")
    verifie(data["compatible_families"] == [universe.model_family("rpg-personnage")],
            f"compatible_families DERIVE du pack, pas tape ({data['compatible_families']})")
    verifie(data["suggested_styles"] == universe.style_names("rpg-personnage"),
            f"suggested_styles DERIVE du pack, pas tape ({data['suggested_styles']})")
    verifie(data["ui_skin_token"] == "world-probe-monde",
            "ui_skin_token derive de l'id, meme convention que les mondes reels")

    # label vide -> replie sur l'id, comme create_character (name or cid)
    worlds.create_world("probe-sans-nom", "", "instagram-influenceur")
    verifie(worlds.load_world("probe-sans-nom")["label"] == "probe-sans-nom",
            "label vide replie sur l'id")
finally:
    worlds.WORLDS_DIR = _vrai
    shutil.rmtree(_tmp, ignore_errors=True)

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
print("=" * 70)
sys.exit(1 if KO else 0)
