# -*- coding: utf-8 -*-
"""Tenues : reference, resolution, couches, refus, isolation (IT-10 c6).

POURQUOI CE TEST EXISTE. Une scene porte desormais une tenue PAR SA CLE
(« @cle »), et c'est la resolution, en amont de l'assembleur, qui en fait du
texte. Les fautes qu'il verrouille :

  1. l'assembleur qui bouge — une scene qui reference une tenue doit
     s'assembler A L'OCTET PRES comme la meme scene qui en porterait le texte
     en dur (invariant 3) ; une banque sans reference ne change pas ;
  2. la copie figee — corriger le fragment d'un asset atteint toutes les
     tenues qui le portent, sans rouvrir une scene ; une tenue du monde
     ajustee par un personnage garde les corrections de libelle du monde ;
  3. la reference pendante qui part au rendu en silence — refusee a
     l'enregistrement de la Banque ET au lancement, en nommant la scene ;
  4. le melange entre personnages — B ne voit pas les tenues propres de A.

Mondes et personnages jetables, nettoyes a la fin ; aucune donnee reelle de
CHARACTERS/ n'est lue. Ni ComfyUI ni modele vision.

Lancer :  python AUTOMATION/tests/test_tenues.py
"""
import json
import shutil
import sys
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import runner as lb                                         # noqa: E402
import tenues                                               # noqa: E402
import worlds                                               # noqa: E402
from api.main import app                                    # noqa: E402
from api.services.bank import validate_scene_bank           # noqa: E402
from fastapi.testclient import TestClient                   # noqa: E402

W1, W2 = "probe-tenues-w1", "probe-tenues-w2"
CA, CA2, CB = "probe-tenues-a", "probe-tenues-a2", "probe-tenues-b"
KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def poser_monde(wid, library=(), outfits=()):
    worlds.world_path(wid).write_text(json.dumps({
        "id": wid, "label": wid, "compatible_families": ["flux"],
        "suggested_styles": ["realiste"],
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "tone": "test", "ui_skin_token": f"world-{wid}",
        "places": [], "intentions": [], "tones": [], "scenes": [],
        "library": list(library), "outfits": list(outfits),
    }, ensure_ascii=False, indent=2), encoding="utf-8")


def poser_personnage(cid, wid, scenes=()):
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
        "intentions": [], "tones": [],
        "intensity": [{"level": 0, "label": "sfw", "prompt_add": ""},
                      {"level": 1, "label": "l1", "prompt_add": ""}],
    }), encoding="utf-8")
    ecrire_scenes(cid, scenes)


def ecrire_scenes(cid, scenes):
    lb.scenes_path(cid).write_text(json.dumps({
        "prefix": "photo of", "anchor": "a woman", "texture": "film grain",
        "world": W1, "scenes": list(scenes),
    }, ensure_ascii=False), encoding="utf-8")


def propres(cid):
    return json.loads(lb.creative_path(cid).read_text(encoding="utf-8")).get("outfits", [])


def du_monde(wid):
    return json.loads(worlds.world_path(wid).read_text(encoding="utf-8")).get("outfits", [])


def filtres(**kw):
    base = dict(scene=None, category=None, format=None, count=None, limit=None,
                seed=1234, no_variants=False, intensity=1)
    base.update(kw)
    return SimpleNamespace(**base)


def prompts(cid):
    return [j["prompt"] for j in lb.build_jobs(lb.scenes_path(cid), filtres(),
                                               character_id=cid)]


def scene(sid, wardrobe):
    return {"id": sid, "prompt": "reading on a sofa", "format": "4:5", "count": 1,
            "wardrobe": wardrobe}


try:
    print("=" * 70)
    print("tenues : reference, resolution, couches, refus, isolation")
    print("=" * 70)

    poser_monde(W1, library=[
        {"key": "jean-bleu", "label": "Jean bleu", "classe": "vetement",
         "fragment": "light blue denim jeans", "fichier": "jean-bleu.png"},
        {"key": "sans-texte", "label": "Muet", "classe": "vetement",
         "fragment": "", "fichier": "sans-texte.png"},
        {"key": "salon", "label": "Salon", "classe": "decor",
         "fragment": "a bright living room", "fichier": "salon.png"},
    ])
    poser_monde(W2)
    poser_personnage(CA, W1)
    poser_personnage(CA2, W1)
    poser_personnage(CB, W2)

    # =========================================== [1] la resolution pure
    print("\n[1] resolution")
    biblio = worlds.library(W1)
    t = {"key": "ville", "label": "Ville",
         "pieces": [{"text": "a beige knit sweater"}, {"asset": "jean-bleu"}]}
    verifie(tenues.texte(t, biblio) == "a beige knit sweater, light blue denim jeans",
            "les pieces se joignent dans l'ordre, l'asset par son fragment")
    brut = {"0": "a robe", "1": ["@ville", "a slip dress"]}
    verifie(tenues.resoudre(brut, [t], biblio)
            == {"0": "a robe", "1": ["a beige knit sweater, light blue denim jeans",
                                     "a slip dress"]},
            "une reference devient son texte, une ligne libre reste, la forme reste")
    sans = {"0": "a robe", "1": ["a", "b"]}
    verifie(tenues.resoudre(sans, [], []) == sans, "sans reference : sortie = entree")
    for cas, tenue_, lignes in [
            ("tenue inconnue", t, {"1": "@nulle-part"}),
            ("asset inconnu", {**t, "pieces": [{"asset": "fantome"}]}, {"1": "@ville"}),
            ("asset sans fragment", {**t, "pieces": [{"asset": "sans-texte"}]},
             {"1": "@ville"}),
            ("tenue sans piece", {**t, "pieces": []}, {"1": "@ville"})]:
        try:
            tenues.resoudre(lignes, [tenue_], biblio)
            verifie(False, f"{cas} : resolu en silence")
        except tenues.TenueError:
            verifie(True, f"{cas} : refuse")

    # =========================================== [2] creation et couches
    print("\n[2] le monde possede, le personnage surcharge")
    tv = tenues.creer(CA, "Ville", t["pieces"], au_monde=True)
    verifie(tv["key"] == "ville" and tv["couche"] == "monde"
            and [o["key"] for o in du_monde(W1)] == ["ville"] and propres(CA) == [],
            f"une tenue creee au monde vit dans le monde ({tv['couche']})")
    verifie(tv["texte"] == "a beige knit sweater, light blue denim jeans",
            "le catalogue rend le texte resolu en entier")
    verifie(tenues.trouver(CA2, "ville")["couche"] == "monde",
            "un second personnage du monde en herite")
    tenues.enregistrer(CA2, "ville", {"pieces": [{"text": "a grey hoodie"},
                                                  {"asset": "jean-bleu"}]})
    verifie(propres(CA2) == [{"key": "ville", "pieces": [{"text": "a grey hoodie"},
                                                         {"asset": "jean-bleu"}]}],
            "l'ajustement n'ecrit que le champ ajuste")
    worlds.save_outfits(W1, [{**o, "label": "Ville (hiver)"} for o in du_monde(W1)])
    a2 = tenues.trouver(CA2, "ville")
    verifie(a2["couche"] == "surcharge" and a2["label"] == "Ville (hiver)"
            and a2["texte"].startswith("a grey hoodie"),
            "une correction du monde atteint la surcharge, qui garde ses pieces")
    verifie(tenues.trouver(CA, "ville")["texte"].startswith("a beige knit sweater"),
            "et le premier personnage ne voit rien de cet ajustement")
    for cas, pieces, monde in [
            ("un decor comme piece", [{"asset": "salon"}], False),
            ("une piece vide", [{"text": "  "}], False),
            ("aucune piece", [], False)]:
        try:
            tenues.creer(CA, "x", pieces, au_monde=monde)
            verifie(False, f"{cas} : accepte")
        except tenues.TenueError:
            verifie(True, f"{cas} : refuse")

    # =========================================== [3] l'octet pres
    print("\n[3] l'assembleur ne bouge pas")
    ecrire_scenes(CA, [scene("s1", {"1": "a beige knit sweater, light blue denim jeans"})])
    en_dur = prompts(CA)
    ecrire_scenes(CA, [scene("s1", {"1": "@ville"})])
    reference = prompts(CA)
    verifie(en_dur and en_dur == reference,
            f"reference == texte en dur, a l'octet pres ({reference[:1]})")

    # =========================================== [4] l'asset corrige suit partout
    print("\n[4] corriger l'asset corrige les tenues")
    ecrire_scenes(CA, [scene("s1", {"1": "@ville"}), scene("s2", {"1": ["@ville", "a slip dress"]})])
    worlds.save_library(W1, [{**a, "fragment": "dark raw denim jeans"}
                             if a["key"] == "jean-bleu" else a
                             for a in worlds.library(W1)])
    apres = prompts(CA)
    avec = [p for p in apres if "wearing a beige" in p]
    verifie(len(apres) == 3 and len(avec) == 2
            and all("dark raw denim jeans" in p for p in avec)
            and not any("light blue" in p for p in apres),
            f"les deux scenes suivent, sans qu'on les rouvre ({len(apres)} jobs)")
    verifie(any("wearing a slip dress" in p for p in apres),
            "une ligne libre a cote d'une reference reste une tenue de plus")

    # =========================================== [5] la reference pendante
    print("\n[5] une reference pendante n'atteint jamais le rendu")
    ecrire_scenes(CA, [scene("s1", {"1": "@disparue"})])
    try:
        prompts(CA)
        verifie(False, "le lancement passe en silence")
    except tenues.TenueError as e:
        verifie("s1" in str(e), f"le lancement refuse en nommant la scene ({e})")
    banque = {"prefix": "p", "anchor": "a", "texture": "t",
              "scenes": [scene("s1", {"1": "@disparue"})]}
    problemes = validate_scene_bank(banque, creative=lb.load_creative(CA))
    verifie(any("disparue" in p for p in problemes),
            f"l'enregistrement de la Banque refuse ({problemes[:1]})")
    banque["scenes"] = [scene("s1", {"1": "@ville"})]
    verifie(validate_scene_bank(banque, creative=lb.load_creative(CA)) == [],
            "une reference qui se resout passe")

    # =========================================== [6] suppressions gardees
    print("\n[6] ce qui est porte ne part pas")
    ecrire_scenes(CA2, [scene("s9", {"1": "@ville"})])
    ecrire_scenes(CA, [])
    try:
        # la surcharge de CA2 part sans garde, la tenue reste
        verifie(tenues.supprimer(CA2, "ville") == "surcharge"
                and tenues.trouver(CA2, "ville")["couche"] == "monde",
                "retirer une surcharge rend la tenue du monde, meme portee")
        tenues.supprimer(CA, "ville")
        verifie(False, "une tenue du monde portee par un AUTRE personnage part")
    except tenues.TenueError as e:
        verifie(f"{CA2}/s9" in str(e), f"refuse, en nommant la scene ({e})")
    import assets                                           # noqa: E402
    try:
        assets.supprimer(CA, "jean-bleu")
        verifie(False, "un asset porte par une tenue part")
    except assets.AssetError as e:
        verifie("Ville" in str(e), f"un asset porte par une tenue reste ({e})")

    # =========================================== [7] isolation et routes
    print("\n[7] isolation et routes")
    r = CLIENT.post(f"/api/outfits/create?character={CA}",
                    json={"label": "Peignoir", "pieces": [{"text": "a white bathrobe"}]})
    verifie(r.status_code == 200 and r.json()["outfit"]["couche"] == "personnage",
            f"POST /api/outfits/create, cote personnage ({r.status_code})")
    r = CLIENT.get(f"/api/outfits?character={CB}")
    verifie(r.status_code == 200 and r.json()["outfits"] == [],
            "B, d'un autre monde, ne voit ni les tenues du monde de A ni les siennes")
    r = CLIENT.get(f"/api/outfits?character={CA2}")
    verifie({o["key"] for o in r.json()["outfits"]} == {"ville"},
            "A2, du meme monde, voit la tenue du monde mais pas le peignoir de A")
    r = CLIENT.get(f"/api/outfits?character={CA}")
    corps = r.json()
    verifie(corps["marqueur"] == "@" and
            {o["key"]: o["couche"] for o in corps["outfits"]}
            == {"ville": "monde", "peignoir": "personnage"},
            "A voit les deux, chacune avec sa couche")
    r = CLIENT.post(f"/api/outfits/save?character={CA}",
                    json={"key": "peignoir", "label": "x", "au_monde": True})
    verifie(r.status_code == 400,
            f"`au_monde` refuse sur une tenue du personnage ({r.status_code})")
    r = CLIENT.post(f"/api/outfits/create?character={CA}",
                    json={"label": "Mixte", "au_monde": True,
                          "pieces": [{"text": "x"}, {"asset": "perso"}]})
    verifie(r.status_code == 400, f"une piece inconnue est refusee ({r.status_code})")
    r = CLIENT.post(f"/api/outfits/delete?character={CA}", json={"key": "peignoir"})
    verifie(r.status_code == 200 and r.json()["couche"] == "personnage"
            and propres(CA) == [],
            f"POST /api/outfits/delete retire une tenue non portee ({r.status_code})")

    # =========================================== [8] emplacements (design-pass tenues)
    print("\n[8] l'emplacement d'une piece ne change pas un octet du rendu")
    sans_slot = [{"text": "a white linen shirt"}, {"asset": "jean-bleu"},
                 {"text": "a thin gold necklace"}]
    avec_slot = [{"text": "a white linen shirt", "slot": "top"},
                 {"asset": "jean-bleu", "slot": "bottom"},
                 {"text": "a thin gold necklace", "slot": "neck"}]
    t_sans = {"key": "jour", "label": "Jour", "pieces": sans_slot}
    t_avec = {**t_sans, "pieces": avec_slot}
    verifie(tenues.texte(t_avec, biblio) == tenues.texte(t_sans, biblio),
            "le texte d'une tenue est le meme avec ou sans emplacement")
    lignes = {"1": ["@jour", "a slip dress"]}
    verifie(tenues.resoudre(lignes, [t_avec], biblio)
            == tenues.resoudre(lignes, [t_sans], biblio),
            "la resolution d'une scene aussi")

    tenues.creer(CA, "Jour", sans_slot)
    jour = lambda: next(o for o in propres(CA) if o["key"] == "jour")  # noqa: E731
    verifie(jour()["pieces"] == sans_slot,
            "sans emplacement, la tenue s'ecrit sur disque comme avant (aucune cle slot)")
    ecrire_scenes(CA, [scene("s-jour", {"1": "@jour"})])
    avant = prompts(CA)
    tenues.enregistrer(CA, "jour", {"pieces": avec_slot})
    verifie(jour()["pieces"] == avec_slot, "un emplacement connu est garde a l'ecriture")
    verifie(bool(avant) and "a white linen shirt" in avant[0] and prompts(CA) == avant,
            "le prompt assemble est identique a l'octet, emplacements poses (invariant 3)")
    try:
        tenues.enregistrer(CA, "jour", {"pieces": [{"text": "a hat", "slot": "chapeau"}]})
        verifie(False, "un emplacement inconnu est ecrit en silence")
    except tenues.TenueError as e:
        verifie("emplacement inconnu" in str(e), f"un emplacement inconnu est refuse ({e})")
    r = CLIENT.post(f"/api/outfits/create?character={CA}",
                    json={"label": "Nuit", "pieces": [{"text": "a robe", "slot": "nulle-part"}]})
    verifie(r.status_code == 400, f"la route le refuse aussi ({r.status_code})")
    r = CLIENT.post(f"/api/outfits/create?character={CA}",
                    json={"label": "Nuit", "pieces": [{"text": "a robe", "slot": "onepiece"},
                                                      {"text": "slippers"}]})
    verifie(r.status_code == 200 and r.json()["outfit"]["pieces"][0].get("slot") == "onepiece"
            and "slot" not in next(o for o in propres(CA) if o["key"] == "nuit")["pieces"][1],
            f"par la route : l'emplacement donne est garde, l'absent reste absent ({r.status_code})")

    # La meme liste vit dans l'ecran : lue dans le fichier, jamais recopiee.
    import re                                               # noqa: E402
    table = (AUTOMATION / "web" / "ui" / "src" / "screens" / "bank" / "outfits"
             / "outfitSlots.ts").read_text(encoding="utf-8")
    bloc = table[table.index("export const SLOTS"):table.index("export const ZONES")]
    ecran = tuple(re.findall(r"key: '([a-z_]+)'", bloc))
    verifie(ecran == tenues.EMPLACEMENTS,
            f"EMPLACEMENTS est la table de outfitSlots.ts, dans le meme ordre ({len(ecran)} cles)")

finally:
    for c in (CA, CA2, CB):
        shutil.rmtree(OFM / "CHARACTERS" / c, ignore_errors=True)
    for w in (W1, W2):
        worlds.world_path(w).unlink(missing_ok=True)

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
print("=" * 70)
sys.exit(1 if KO else 0)
