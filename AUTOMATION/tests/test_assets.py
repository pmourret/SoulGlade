# -*- coding: utf-8 -*-
"""Bibliotheque d'assets : import, fragment, couches, isolation (IT-10 c5).

POURQUOI CE TEST EXISTE. Un asset est la premiere donnee du studio qui porte
A LA FOIS un fichier partage (INPUTS/ASSETS/, un seul dossier pour tout le
monde, comme la banque de poses) et une fiche possedee par une couche. Les
deux fautes qu'il verrouille sont donc celles de la maison :

  1. le melange entre personnages — B ne voit pas la bibliotheque de A, et ne
     peut pas non plus servir son image en devinant sa cle ;
  2. la surcharge qui fige une copie — un personnage qui ajuste le fragment
     d'un asset du monde doit continuer de recevoir les corrections de
     libelle faites dans le monde (la faute exacte des tons, corrigee le
     25/09).

Plus trois gardes qui ne se devinent pas : ce qui n'est pas une image n'entre
pas dans INPUTS/, un modele muet n'annule pas l'import, et le visage ne passe
jamais dans un fragment (invariant 6).

Mondes et personnages jetables, nettoyes a la fin ; aucune donnee reelle de
CHARACTERS/ n'est lue. Le modele vision est remplace par un bouchon : ce test
ne demande pas ComfyUI.

Lancer :  python AUTOMATION/tests/test_assets.py
"""
import io
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import assets                                               # noqa: E402
import llm_local                                            # noqa: E402
import worlds                                               # noqa: E402
from api.main import app                                    # noqa: E402
from fastapi.testclient import TestClient                   # noqa: E402

W1, W2 = "probe-assets-w1", "probe-assets-w2"
CA, CB = "probe-assets-a", "probe-assets-b"
KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")

# Le modele local, remplace : `texte()` est le seul point par lequel
# `analyser_fichier` lui parle. Il rend du JSON comme la consigne le demande,
# NOYE DANS DU BAVARDAGE — c'est l'echec mesure le 26/09 (le modele repete la
# demande avant de repondre), et ce test verrouille qu'on lit les accolades
# plutot que la reponse entiere.
#
# Une clause de visage dedans EXPRES : c'est `_propre` (invariant 6) qui doit
# la retirer, pas le bouchon. « green eyes » est du vocabulaire INTERDIT
# (`runner.FORBIDDEN_FACE`) ; les cheveux, eux, sont seulement signales
# (`WATCH_FACE`) et passeraient, comme partout ailleurs.
REPONSE = ('Sure! Here is the description you asked for. '
           '{"fragment": "a red linen dress, green eyes, soft daylight"}')


def bouchon(*a, **k):
    return REPONSE


def muet(*a, **k):
    raise llm_local.LLMError("ComfyUI hors ligne")


def png(couleur=(200, 30, 30)):
    from PIL import Image
    tampon = io.BytesIO()
    Image.new("RGB", (8, 8), couleur).save(tampon, format="PNG")
    return tampon.getvalue()


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def poser_monde(wid, library=()):
    worlds.world_path(wid).write_text(json.dumps({
        "id": wid, "label": wid, "compatible_families": ["flux"],
        "suggested_styles": ["realiste"],
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "tone": "test", "ui_skin_token": f"world-{wid}",
        "places": [{"id": "p1", "prompt": "a quiet room"}],
        "intentions": [], "tones": [], "scenes": [],
        "library": list(library),
    }, ensure_ascii=False, indent=2), encoding="utf-8")


def poser_personnage(cid, wid):
    d = OFM / "CHARACTERS" / cid
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    (d / "character.json").write_text(json.dumps({
        "id": cid, "name": cid, "world": wid, "content_types": {"image": True},
        "universe": "instagram-influenceur", "type": "instagram-influenceur",
        "output_style": "realiste",
    }), encoding="utf-8")
    (d / "creative.json").write_text(json.dumps({
        "intentions": [], "tones": [], "intensity": [],
    }), encoding="utf-8")


def propres(cid):
    return json.loads((OFM / "CHARACTERS" / cid / "creative.json")
                      .read_text(encoding="utf-8")).get("library", [])


def du_monde(wid):
    return json.loads(worlds.world_path(wid).read_text(encoding="utf-8")).get("library", [])


vrai_texte = llm_local.texte
ecrits = []

try:
    print("=" * 70)
    print("bibliotheque d'assets : import, fragment, couches, isolation")
    print("=" * 70)

    poser_monde(W1)
    poser_monde(W2)
    poser_personnage(CA, W1)
    poser_personnage(CB, W2)

    # ================================================= [1] ce qui n'est pas une image
    print("\n[1] la garde d'entree")
    for cas, octets in [("des octets qui ne sont pas une image", b"pas une image"),
                        ("une image vide", b"")]:
        try:
            assets.valider_image(octets)
            verifie(False, f"{cas} : accepte")
        except assets.AssetError:
            verifie(True, f"{cas} : refuse")
    verifie(assets.valider_image(png()) == ".png", "un PNG rend son extension")

    # ================================================= [2] import cote personnage
    print("\n[2] import cote personnage")
    llm_local.texte = bouchon
    a1 = assets.importer(png(), "Robe rouge.png", "vetement", CA)
    ecrits.append(a1)
    verifie(a1["key"] == "robe-rouge" and a1["couche"] == "personnage",
            f"la cle vient du nom de fichier ({a1['key']}, {a1['couche']})")
    verifie((assets.ASSETS_DIR / a1["fichier"]).is_file(),
            "les octets sont dans INPUTS/ASSETS/")
    verifie("eyes" not in a1["fragment"] and "red linen dress" in a1["fragment"]
            and "soft daylight" in a1["fragment"],
            f"la clause de visage tombe, le reste reste ({a1['fragment']})")
    verifie("Sure" not in a1["fragment"] and "description" not in a1["fragment"],
            "le bavardage autour du JSON ne passe pas dans le fragment")
    verifie([e["key"] for e in propres(CA)] == ["robe-rouge"],
            "la fiche est dans creative.json du personnage")
    verifie(du_monde(W1) == [], "et nulle part dans le monde")

    # ================================================= [3] un modele muet n'annule rien
    print("\n[3] modele muet")
    llm_local.texte = muet
    a2 = assets.importer(png((20, 20, 200)), "Salon.png", "decor", CA)
    ecrits.append(a2)
    verifie(a2["fragment"] == "" and (assets.ASSETS_DIR / a2["fichier"]).is_file(),
            "l'asset nait sans fragment, et son image est la")
    llm_local.texte = bouchon
    fragment = assets.analyser(CA, a2["key"])
    verifie("red linen dress" in fragment
            and assets.trouver(CA, a2["key"])["fragment"] == fragment,
            "« Analyser » le rattrape et l'ecrit")

    # ================================================= [4] import cote monde, et couches
    print("\n[4] le monde possede, le personnage surcharge")
    am = assets.importer(png((30, 120, 30), ), "Manteau vert.png", "vetement", CA,
                         au_monde=True)
    ecrits.append(am)
    verifie([e["key"] for e in du_monde(W1)] == ["manteau-vert"]
            and "manteau-vert" not in [e["key"] for e in propres(CA)],
            "la fiche est dans le monde, pas chez le personnage")
    verifie(assets.trouver(CA, "manteau-vert")["couche"] == "monde",
            "le personnage la voit, couche « monde »")

    assets.enregistrer(CA, "manteau-vert", {"fragment": "a green wool coat"})
    surcharge = assets.trouver(CA, "manteau-vert")
    verifie(surcharge["couche"] == "surcharge"
            and surcharge["fragment"] == "a green wool coat",
            "l'ajustement du personnage prend le dessus")
    verifie(propres(CA)[-1] == {"key": "manteau-vert", "fragment": "a green wool coat"},
            f"et n'ecrit QUE le champ ajuste ({propres(CA)[-1]})")

    worlds.save_library(W1, [{**e, "label": "Manteau vert (hiver)"}
                             for e in du_monde(W1)])
    apres = assets.trouver(CA, "manteau-vert")
    verifie(apres["label"] == "Manteau vert (hiver)"
            and apres["fragment"] == "a green wool coat",
            "une correction du monde atteint le personnage, son ajustement tient")

    # ================================================= [5] isolation entre personnages
    print("\n[5] isolation")
    verifie([e["key"] for e in assets.bibliotheque(CB)] == [],
            "un personnage d'un autre monde ne voit rien de tout ca")
    r = CLIENT.get(f"/api/assets?character={CB}")
    verifie(r.status_code == 200 and r.json()["assets"] == [],
            f"GET /api/assets pour B : vide ({r.status_code})")
    r = CLIENT.get(f"/img/asset?character={CB}&key={a1['key']}")
    verifie(r.status_code == 404,
            f"B ne peut pas servir l'image de A en devinant sa cle ({r.status_code})")
    r = CLIENT.get(f"/img/asset?character={CA}&key={a1['key']}")
    verifie(r.status_code == 200 and r.content[:4] == b"\x89PNG",
            f"A la sert ({r.status_code})")

    # ================================================= [6] les routes
    print("\n[6] routes")
    r = CLIENT.get(f"/api/assets?character={CA}")
    corps = r.json()
    verifie({c["key"] for c in corps["classes"]} == set(assets.CLASSES)
            and [c["champ"] for c in corps["classes"] if c["key"] == "vetement"] == ["wardrobe"],
            "GET /api/assets porte la table des classes et leur destination")
    verifie({e["key"] for e in corps["assets"]} == {a1["key"], a2["key"], "manteau-vert"},
            "et les trois assets visibles par A")
    r = CLIENT.post(f"/api/assets/save?character={CA}",
                    json={"key": a1["key"], "classe": "decor"})
    verifie(r.status_code == 400, f"un champ non ajustable est refuse ({r.status_code})")
    r = CLIENT.post(f"/api/assets/save?character={CA}",
                    json={"key": "manteau-vert", "label": "Manteau", "au_monde": True})
    verifie(r.status_code == 200 and du_monde(W1)[0]["label"] == "Manteau",
            f"`au_monde` corrige la fiche du monde ({r.status_code})")
    r = CLIENT.post(f"/api/assets/save?character={CA}",
                    json={"key": a1["key"], "label": "x", "au_monde": True})
    verifie(r.status_code == 400,
            f"mais jamais sur un asset du personnage ({r.status_code})")
    r = CLIENT.post(f"/api/assets/import?character={CA}",
                    json={"data_base64": "pas du base64 !", "classe": "vetement"})
    verifie(r.status_code == 400, f"un base64 illisible est refuse ({r.status_code})")

    # ================================================= [7] suppression
    print("\n[7] suppression")
    verifie(assets.supprimer(CA, "manteau-vert") == "surcharge"
            and assets.trouver(CA, "manteau-vert")["couche"] == "monde",
            "supprimer une surcharge rend l'asset au monde")
    image = assets.chemin(a1)
    verifie(assets.supprimer(CA, a1["key"]) == "personnage" and not image.exists(),
            "supprimer un asset du personnage emporte son image")
    verifie(assets.supprimer(CA, "manteau-vert") == "monde"
            and du_monde(W1) == [],
            "supprimer un asset du monde le retire du monde")

finally:
    llm_local.texte = vrai_texte
    for e in ecrits:
        (assets.ASSETS_DIR / e["fichier"]).unlink(missing_ok=True)
    shutil.rmtree(OFM / "CHARACTERS" / CA, ignore_errors=True)
    shutil.rmtree(OFM / "CHARACTERS" / CB, ignore_errors=True)
    worlds.world_path(W1).unlink(missing_ok=True)
    worlds.world_path(W2).unlink(missing_ok=True)

print()
print("=" * 70)
print(f"{KO} ECHEC(S)" if KO else "tout est vert")
print("=" * 70)
sys.exit(1 if KO else 0)
