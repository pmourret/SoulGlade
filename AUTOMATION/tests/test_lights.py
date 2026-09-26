# -*- coding: utf-8 -*-
"""Lumieres : champ a part, reference, couches, refus, isolation (IT-10 c7).

POURQUOI CE TEST EXISTE. La lumiere d'une scene quitte son prompt pour un
champ a part (`light`), texte libre ou « @cle » d'un catalogue, et une
variante peut elle aussi referencer une lumiere. C'est la resolution, en
amont de l'assembleur, qui en fait du texte. Les fautes qu'il verrouille :

  1. l'assembleur qui bouge (invariant 3) — une banque sans `light` et sans
     « @ » dans ses variantes ne change pas ; une scene qui porte `light`
     s'assemble A L'OCTET PRES comme la meme scene qui porterait ce texte au
     bout de son prompt, apres le decor ; une variante « @cle » comme la meme
     variante ecrite en dur ;
  2. la copie figee — corriger une lumiere du monde atteint toutes les
     scenes qui la portent, sans en rouvrir une ;
  3. la reference pendante qui part au rendu en silence — refusee a
     l'enregistrement de la Banque ET au lancement, en nommant la scene ;
  4. le melange entre personnages — B ne voit pas les lumieres propres de A.

Mondes et personnages jetables, nettoyes a la fin ; aucune donnee reelle de
CHARACTERS/ n'est lue. Ni ComfyUI ni modele.

Lancer :  python AUTOMATION/tests/test_lights.py
"""
import copy
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
import lights                                               # noqa: E402
import worlds                                               # noqa: E402
from api.main import app                                    # noqa: E402
from api.services.bank import validate_scene_bank           # noqa: E402
from fastapi.testclient import TestClient                   # noqa: E402

W1, W2 = "probe-lights-w1", "probe-lights-w2"
CA, CA2, CB = "probe-lights-a", "probe-lights-a2", "probe-lights-b"
SALON = "a bright living room with plants"
KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def poser_monde(wid, lights_=()):
    worlds.world_path(wid).write_text(json.dumps({
        "id": wid, "label": wid, "compatible_families": ["flux"],
        "suggested_styles": ["realiste"],
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "tone": "test", "ui_skin_token": f"world-{wid}",
        "places": [{"id": "salon", "label": "Salon", "prompt": SALON}],
        "intentions": [], "tones": [], "scenes": [],
        "lights": list(lights_),
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
        "intentions": [], "tones": [],
        "intensity": [{"level": 0, "label": "sfw", "prompt_add": ""}],
    }), encoding="utf-8")
    ecrire_scenes(cid, [], wid)


def ecrire_scenes(cid, scenes, wid=W1):
    lb.scenes_path(cid).write_text(json.dumps({
        "prefix": "photo of", "anchor": "a woman", "texture": "film grain",
        "world": wid, "scenes": list(scenes),
    }, ensure_ascii=False), encoding="utf-8")


def propres(cid):
    return json.loads(lb.creative_path(cid).read_text(encoding="utf-8")).get("lights", [])


def filtres(**kw):
    base = dict(scene=None, category=None, format=None, count=None, limit=None,
                seed=1234, no_variants=False, intensity=0)
    base.update(kw)
    return SimpleNamespace(**base)


def prompts(cid):
    return [j["prompt"] for j in lb.build_jobs(lb.scenes_path(cid), filtres(),
                                               character_id=cid)]


def scene(sid, **champs):
    return {"id": sid, "prompt": "reading on a sofa", "format": "4:5", "count": 1,
            **champs}


try:
    print("=" * 70)
    print("lumieres : champ a part, reference, couches, refus, isolation")
    print("=" * 70)

    poser_monde(W1, [{"key": "soir", "label": "Soir", "text": "warm low evening light"}])
    poser_monde(W2)
    poser_personnage(CA, W1)
    poser_personnage(CA2, W1)
    poser_personnage(CB, W2)
    CATALOGUE = [{"key": "soir", "label": "Soir", "text": "warm low evening light"}]

    # =========================================== [1] la resolution pure
    print("\n[1] resolution")
    sans = {"scenes": [scene("s1", variants=["overcast"]), scene("s2")]}
    avant = copy.deepcopy(sans)
    verifie(lights.resolve_bank(sans, []) == avant,
            "sans `light` ni reference : la banque sort identique")
    s = lights.resolve_scene(scene("s1", light="@soir", variants=["@soir", "overcast"]),
                             CATALOGUE)
    verifie(s["prompt"] == "reading on a sofa, warm low evening light"
            and "light" not in s
            and s["variants"] == ["warm low evening light", "overcast"],
            f"le champ rejoint le prompt, la variante devient du texte ({s})")
    for cas, sc in (("lumiere inconnue", scene("s1", light="@nuit")),
                    ("variante inconnue", scene("s1", variants=["@nuit"])),
                    ("lumiere sans texte", scene("s1", light="@vide"))):
        try:
            lights.resolve_scene(sc, CATALOGUE + [{"key": "vide", "label": "Vide"}])
            verifie(False, f"{cas} : passe en silence")
        except lights.LightError:
            verifie(True, f"{cas} : refuse")

    # =========================================== [2] l'octet pres
    print("\n[2] l'assembleur ne bouge pas")
    ecrire_scenes(CA, [scene("s1", place="salon",
                             variants=["overcast grey morning"])])
    sans_light = prompts(CA)
    verifie(sans_light[0] == f"photo of a woman, reading on a sofa, {SALON}, film grain",
            f"une scene sans `light` s'assemble comme avant ({sans_light[0]})")
    ecrire_scenes(CA, [scene("s1", prompt=f"reading on a sofa, {SALON}, golden hour",
                             variants=["warm low evening light"])])
    en_dur = prompts(CA)
    ecrire_scenes(CA, [scene("s1", place="salon", light="golden hour",
                             variants=["@soir"])])
    champ = prompts(CA)
    verifie(len(en_dur) == 2 and en_dur == champ,
            f"`light` + decor + variante « @ » == le tout en dur, a l'octet pres "
            f"({champ[:1]})")
    ecrire_scenes(CA, [scene("s1", place="salon", light="@soir")])
    verifie(prompts(CA)[0].endswith(f"{SALON}, warm low evening light, film grain"),
            "la lumiere se place apres le decor")

    # =========================================== [3] la lumiere du monde suit
    print("\n[3] corriger la lumiere du monde corrige les scenes")
    ecrire_scenes(CA, [scene("s1", light="@soir"), scene("s2", variants=["@soir"])])
    worlds.save_catalog(W1, "lights", [{"key": "soir", "label": "Soir",
                                        "text": "blue hour dusk light"}])
    apres = prompts(CA)
    verifie(len(apres) == 3 and sum("blue hour dusk light" in p for p in apres) == 2
            and not any("warm low" in p for p in apres),
            f"les deux scenes suivent, sans qu'on les rouvre ({len(apres)} jobs)")
    lights.save(CA2, "soir", {"text": "candle light"})
    verifie(lights.CATALOG.find(CA2, "soir")["couche"] == "surcharge"
            and lights.CATALOG.find(CA, "soir")["texte"] == "blue hour dusk light",
            "A2 ajuste la lumiere du monde sans toucher a celle de A")
    worlds.save_catalog(W1, "lights", [{"key": "soir", "label": "Soir d'été",
                                        "text": "blue hour dusk light"}])
    a2 = lights.CATALOG.find(CA2, "soir")
    verifie(a2["label"] == "Soir d'été" and a2["texte"] == "candle light",
            "la surcharge garde son texte et suit le libelle du monde")

    # =========================================== [4] la reference pendante
    print("\n[4] une reference pendante n'atteint jamais le rendu")
    ecrire_scenes(CA, [scene("s1", light="@disparue")])
    try:
        prompts(CA)
        verifie(False, "le lancement passe en silence")
    except lights.LightError as e:
        verifie("s1" in str(e), f"le lancement refuse en nommant la scene ({e})")
    banque = {"prefix": "p", "anchor": "a", "texture": "t",
              "scenes": [scene("s1", variants=["@disparue"])]}
    problemes = validate_scene_bank(banque, creative=lb.load_creative(CA))
    verifie(any("disparue" in p for p in problemes),
            f"l'enregistrement de la Banque refuse ({problemes[:1]})")
    banque["scenes"] = [scene("s1", light="@soir", variants=["@soir"])]
    verifie(validate_scene_bank(banque, creative=lb.load_creative(CA)) == [],
            "une reference qui se resout passe")
    banque["scenes"] = [scene("s1", light=["x"])]
    verifie(any("light" in p for p in validate_scene_bank(banque)),
            "un `light` qui n'est pas un texte est refuse")

    # =========================================== [5] suppressions gardees
    print("\n[5] ce qui est porte ne part pas")
    ecrire_scenes(CA, [])
    ecrire_scenes(CA2, [scene("s9", variants=["@soir"])])
    try:
        verifie(lights.delete(CA2, "soir") == "surcharge"
                and lights.CATALOG.find(CA2, "soir")["couche"] == "monde",
                "retirer une surcharge rend la lumiere du monde, meme portee")
        lights.delete(CA, "soir")
        verifie(False, "une lumiere du monde portee par un AUTRE personnage part")
    except lights.LightError as e:
        verifie(f"{CA2}/s9" in str(e), f"refuse, en nommant la scene ({e})")

    # =========================================== [6] isolation et routes
    print("\n[6] isolation et routes")
    r = CLIENT.post(f"/api/lights/create?character={CA}",
                    json={"label": "Fenêtre", "text": "soft window light"})
    verifie(r.status_code == 200 and r.json()["light"]["couche"] == "personnage"
            and r.json()["light"]["key"] == "fenetre",
            f"POST /api/lights/create, cote personnage ({r.status_code})")
    r = CLIENT.get(f"/api/lights?character={CB}")
    verifie(r.status_code == 200 and r.json()["lights"] == [],
            "B, d'un autre monde, ne voit ni les lumieres du monde de A ni les siennes")
    r = CLIENT.get(f"/api/lights?character={CA2}")
    verifie({l["key"] for l in r.json()["lights"]} == {"soir"},
            "A2, du meme monde, voit la lumiere du monde mais pas celle de A")
    corps = CLIENT.get(f"/api/lights?character={CA}").json()
    verifie(corps["marqueur"] == "@" and
            {l["key"]: l["couche"] for l in corps["lights"]}
            == {"soir": "monde", "fenetre": "personnage"},
            "A voit les deux, chacune avec sa couche")
    r = CLIENT.post(f"/api/lights/save?character={CA}",
                    json={"key": "fenetre", "label": "x", "au_monde": True})
    verifie(r.status_code == 400,
            f"`au_monde` refuse sur une lumiere du personnage ({r.status_code})")
    for cas, corps_ in (("texte vide", {"label": "Vide", "text": "  "}),
                        ("texte en reference", {"label": "Boucle", "text": "@soir"}),
                        ("libelle vide", {"label": "", "text": "x"})):
        r = CLIENT.post(f"/api/lights/create?character={CA}", json=corps_)
        verifie(r.status_code == 400, f"{cas} : refuse ({r.status_code})")
    r = CLIENT.post(f"/api/lights/create?character={CB}",
                    json={"label": "Monde", "text": "x", "au_monde": True})
    verifie(r.status_code == 200 and r.json()["light"]["couche"] == "monde"
            and CLIENT.get(f"/api/lights?character={CA}").json()["lights"][-1]["key"]
            == "fenetre",
            "creee au monde de B, elle n'atteint pas A")
    r = CLIENT.post(f"/api/lights/delete?character={CA}", json={"key": "fenetre"})
    verifie(r.status_code == 200 and r.json()["couche"] == "personnage"
            and propres(CA) == [],
            f"POST /api/lights/delete retire une lumiere non portee ({r.status_code})")

    # =========================================== [7] la fiche de studio (7 bis)
    print("\n[7] la fiche de studio compose la phrase")
    V = lights.vocabulary()
    for reglage in V["settings"]:
        for o in reglage["options"]:
            phrase = lights.compose({reglage["key"]: o["key"]})
            if not o["fragment"] in phrase:
                verifie(False, f"{reglage['key']}={o['key']} absent de « {phrase} »")
    verifie(True, "chaque valeur de chaque reglage entre dans la phrase")
    verifie(lights.compose({"quality": "soft", "temperature": "warm", "source": "window",
                            "direction": "side", "mood": "balanced"})
            == "soft warm window light from the side, balanced contrast",
            "tete « qualite temperature source direction », puis l'ambiance")
    verifie(lights.compose({"direction": "back"}) == "light from behind the subject",
            "sans source, la tete dit « light »")
    cyber = next(s for s in V["schemes"] if s["key"] == "cyberpunk")["setup"]
    verifie(lights.compose(cyber)
            == "hard cool neon light from the side, moody low-key lighting with deep "
               "shadows, magenta neon reflections on glossy surfaces, wet ground "
               "reflecting cyan lights",
            f"le schema « neon cyberpunk » compose sa phrase ({lights.compose(cyber)})")
    verifie(lights.compose({"effects": [{"key": "gel", "color": "blue"}]})
            == "electric blue gel lighting", "une couleur de la palette : son fragment")
    verifie(lights.compose({"effects": [{"key": "gel", "color": " deep violet "}]})
            == "deep violet gel lighting", "une couleur libre : les mots de l'utilisateur")
    verifie(lights.compose({"effects": [{"key": "gel"}]}) == "gel lighting",
            "sans couleur, l'effet se lit sans trou")
    for s_ in V["schemes"]:
        lights.compose(s_["setup"])
    verifie(True, f"les {len(V['schemes'])} schemas de depart se composent")
    for cas, fiche in (("source inconnue", {"source": "torche"}),
                       ("effet inconnu", {"effects": [{"key": "laser"}]}),
                       ("fiche qui n'est pas un objet", ["x"])):
        try:
            lights.compose(fiche)
            verifie(False, f"{cas} : passe en silence")
        except lights.LightError:
            verifie(True, f"{cas} : refuse")
    fragments = ([o["fragment"] for r_ in V["settings"] for o in r_["options"]]
                 + [e["fragment"] for e in V["effects"]]
                 + [c["fragment"] for c in V["palette"]])
    visage = [f for f in fragments if lb.FORBIDDEN_FACE.search(f)]
    verifie(not visage, f"aucun fragment ne decrit le visage ({visage})")

    print("\n[8] une lumiere stocke sa fiche ; le texte ecrit a la main prime")
    r = CLIENT.post(f"/api/lights/create?character={CA}",
                    json={"label": "Néon", "setup": cyber})
    corps = r.json()
    verifie(r.status_code == 200 and "text" not in propres(CA)[-1]
            and propres(CA)[-1]["setup"]["source"] == "neon"
            and corps["light"]["texte"] == lights.compose(cyber),
            f"creee depuis une fiche : pas de `text`, la phrase est composee ({r.status_code})")
    r = CLIENT.post(f"/api/lights/save?character={CA}",
                    json={"key": "neon", "text": "pink neon glow"})
    verifie(r.json()["light"]["texte"] == "pink neon glow"
            and propres(CA)[-1]["setup"]["source"] == "neon",
            "le texte a la main prime, la fiche reste")
    r = CLIENT.post(f"/api/lights/save?character={CA}", json={"key": "neon", "text": ""})
    verifie(r.status_code == 200 and r.json()["light"]["texte"] == lights.compose(cyber),
            "vider le texte rend la main a la fiche")
    r = CLIENT.post(f"/api/lights/create?character={CA}",
                    json={"label": "Faux", "setup": {"source": "torche"}})
    verifie(r.status_code == 400, f"une fiche qui ne se compose pas est refusee ({r.status_code})")
    ecrire_scenes(CA, [scene("s1", light="@neon")])
    verifie(prompts(CA)[0].endswith(f"{lights.compose(cyber)}, film grain"),
            "une scene qui porte la lumiere recoit la phrase composee")
    # corriger un fragment de la plateforme corrige la lumiere, sans la rouvrir
    import tempfile
    vrai = lights.VOCABULARY_PATH
    V2 = copy.deepcopy(V)
    next(e for e in V2["effects"] if e["key"] == "wet_floor")["fragment"] = "{color} puddles"
    tmp = Path(tempfile.mkdtemp()) / "lighting.json"
    tmp.write_text(json.dumps(V2), encoding="utf-8")
    lights.VOCABULARY_PATH = tmp
    try:
        verifie(prompts(CA)[0].endswith("magenta neon reflections on glossy surfaces, "
                                        "cyan puddles, film grain"),
                "corriger le fragment d'un effet corrige la lumiere qui le porte")
    finally:
        lights.VOCABULARY_PATH = vrai
        shutil.rmtree(tmp.parent, ignore_errors=True)
    ecrire_scenes(CA, [])
    r = CLIENT.get("/api/lighting")
    verifie(r.status_code == 200
            and [s_["key"] for s_ in r.json()["settings"]]
            == ["source", "direction", "quality", "temperature", "mood"]
            and r.json()["schemes"] and r.json()["palette"] and "_notes" not in r.json(),
            f"GET /api/lighting sert le vocabulaire ({r.status_code})")

finally:
    for c in (CA, CA2, CB):
        shutil.rmtree(OFM / "CHARACTERS" / c, ignore_errors=True)
    for w in (W1, W2):
        worlds.world_path(w).unlink(missing_ok=True)

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
print("=" * 70)
sys.exit(1 if KO else 0)
