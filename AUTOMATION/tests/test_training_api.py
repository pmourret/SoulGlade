# -*- coding: utf-8 -*-
"""Isolation des routes du jeu d'entrainement, et ce qu'elles ne doivent PAS faire.

POURQUOI CE TEST EXISTE. `.claude/rules/backend.md` : toute route generalisee
vient avec un test qui aurait detecte un melange de donnees entre deux
personnages. Ces routes-la publient la LISTE NOMMEE des images d'un jeu
d'entrainement — le melange y serait visible a l'ecran, et il ferait entrainer
un LoRA sur le visage de quelqu'un d'autre.

Quatre risques distincts, un par section :

  1. la proposition d'un personnage ne montre aucune image d'un autre ;
  2. une requete sans `?character=` est refusee, jamais servie par defaut
     (dependencies.py : plus aucun repli depuis le 01/09) ;
  3. la LECTURE n'ECRIT PAS. `entrainement.exporter` grave un mot declencheur
     dans `config.json` quand le personnage n'en a pas ; une consultation
     d'ecran ne doit jamais le graver, il est grave dans le LoRA entraine
     avec lui. Et ni `vec` ni `prompt` ne partent sur le fil ;
  4. l'export refuse pendant une production (409) — un seul GPU, un seul
     batch, meme garde que /api/mesurer.

Aucun GPU, aucune image reelle : des vecteurs a la main, une base temporaire,
deux personnages jetables nettoyes a la fin.

Lancer :  python AUTOMATION\\tests\\test_training_api.py
"""
import json
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import numpy as np                            # noqa: E402
import base as db                             # noqa: E402
import entrainement as en                     # noqa: E402
import shared_state as ss                     # noqa: E402
from api.main import app                      # noqa: E402
from fastapi.testclient import TestClient     # noqa: E402

CHAR_A, CHAR_B = "probe-train-a", "probe-train-b"
KO = 0

# `base_url` en 127.0.0.1 : sans lui le client envoie `Host: testserver`, que
# le garde d'origine refuse en 403 (meme note que test_expression_isolation.py).
CLIENT = TestClient(app, base_url="http://127.0.0.1")

DIM = 8
U = np.zeros(DIM, dtype=np.float32)
U[0] = 1.0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def vec(alpha, graine=0):
    rng = np.random.default_rng(graine)
    w = rng.normal(size=DIM).astype(np.float32)
    w[0] = 0
    w /= np.linalg.norm(w)
    v = alpha * U + np.sqrt(max(0.0, 1 - alpha ** 2)) * w
    return (v / np.linalg.norm(v)).astype(np.float32)


def poser_personnage(cid):
    """Personnage jetable, config/scenes clones de lena (meme univers/monde).

    Le `trigger_word` est RETIRE du config.json copie, expres : la section [3]
    verifie qu'une lecture ne le grave pas, et un declencheur deja present
    rendrait ce test toujours vert pour la mauvaise raison.
    """
    d = OFM / "CHARACTERS" / cid
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    (d / "character.json").write_text(json.dumps({
        "id": cid, "name": cid, "universe": "instagram-influenceur",
        "type": "instagram-influenceur", "output_style": "realiste",
        "world": "slow-life", "content_types": {"image": True}, "nsfw": False,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    lena = OFM / "CHARACTERS" / "lena"
    cfg = json.loads((lena / "config.json").read_text(encoding="utf-8"))
    ((cfg.get("identity") or {}).get("lora") or {}).pop("trigger_word", None)
    (d / "config.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2),
                                   encoding="utf-8")
    shutil.copy(lena / "scenes.json", d / "scenes.json")
    shutil.copy(lena / "creative.json", d / "creative.json")


def declencheur_grave(cid):
    cfg = json.loads((OFM / "CHARACTERS" / cid / "config.json").read_text(encoding="utf-8"))
    return ((cfg.get("identity") or {}).get("lora") or {}).get("trigger_word")


racine = Path(tempfile.mkdtemp(prefix="training_api_"))
db.FICHIER = racine / "PROD" / "soulglade.db"
en.RACINE_EXPORT = racine / "_ENTRAINEMENT"

# Deux personnages, des noms de fichier qui ne se confondent avec rien : si un
# « b_ » apparait dans la reponse de A, le melange se voit du premier coup.
IMAGES = {
    CHAR_A: ["a_cuisine.png", "a_cafe.png", "a_sport.png"],
    CHAR_B: ["b_taverne.png", "b_ruelle.png"],
}

print("=" * 70)
print("Routes du jeu d'entrainement : isolation, et lecture sans ecriture")
print("=" * 70)

try:
    poser_personnage(CHAR_A)
    poser_personnage(CHAR_B)

    with db.ouvrir() as cx:
        for cid, noms in IMAGES.items():
            for i, nom in enumerate(noms):
                iid = db.enregistrer_image(
                    cx, nom, character_id=cid, scene=f"{cid}-scene-{i}",
                    intention="lifestyle", ton="doux", format="4:5",
                    # Un prompt reconnaissable : la section [3] verifie qu'il
                    # ne part JAMAIS sur le fil, il ne sert qu'a compter les
                    # legendes cote serveur.
                    prompt=f"PROMPT-SECRET-{cid}-{i}")
                db.enregistrer_embedding(cx, iid, vec(0.90 + 0.01 * i, graine=i))
                db.enregistrer_etiquette(cx, iid, "mains_juge", "ok")
                db.enregistrer_etiquette(cx, iid, "anatomie", "ok")
            db.construire_jeu(cx, cid, U, 0.5, libelle="test")
        cx.commit()

    # =================================== [1] deux personnages ne se melangent jamais
    print(f"\n[1] la proposition de {CHAR_A} ne contient aucune image de {CHAR_B}")
    r = CLIENT.get(f"/api/training/proposal?character={CHAR_A}")
    verifie(r.status_code == 200, f"la proposition est servie ({r.status_code} — {r.text[:200]})")
    corps = r.json()
    noms = {x["fichier"] for x in corps["file"]}
    verifie(noms == set(IMAGES[CHAR_A]), f"file = {sorted(noms)}")
    verifie(not any(n.startswith("b_") for n in noms),
            "aucun fichier de l'autre personnage dans la file")
    verifie(corps["compteurs"]["file"] == 3, f"compteur = {corps['compteurs']['file']}")

    r_b = CLIENT.get(f"/api/training/proposal?character={CHAR_B}")
    noms_b = {x["fichier"] for x in r_b.json()["file"]}
    verifie(noms_b == set(IMAGES[CHAR_B]),
            f"et {CHAR_B} voit les siennes, pas celles de {CHAR_A} ({sorted(noms_b)})")

    # =================================== [2] aucun personnage par defaut
    print("\n[2] une requete sans ?character= est refusee, jamais servie par defaut")
    for route in ("/api/training/proposal", "/api/training/exports"):
        r = CLIENT.get(route)
        verifie(r.status_code == 400,
                f"{route} sans personnage : {r.status_code} (attendu 400)")
    r = CLIENT.post("/api/training/export", json={})
    verifie(r.status_code == 400,
            f"/api/training/export sans personnage : {r.status_code} (attendu 400)")

    # =================================== [3] la lecture n'ecrit pas, et ne fuit pas
    print("\n[3] la LECTURE n'ecrit rien, et ne publie ni embedding ni prompt")
    verifie(declencheur_grave(CHAR_A) is None,
            "consulter la proposition n'a PAS grave de mot declencheur dans "
            "config.json — il est grave dans le LoRA entraine avec lui, une "
            "consultation d'ecran ne le decide pas")
    verifie(corps["declencheur"],
            f"mais la proposition en ANNONCE un ({corps['declencheur']!r}) : "
            f"proposer n'est pas graver")
    brut = r_b.text + CLIENT.get(f"/api/training/proposal?character={CHAR_A}").text
    verifie("PROMPT-SECRET" not in brut,
            "aucun prompt ne part sur le fil : il ne sert qu'a compter les legendes")
    verifie('"vec"' not in brut,
            "aucun embedding brut ne part sur le fil")
    verifie(set(corps["legendes"]) == {"prompt", "repli_vision"},
            f"le compte des sources de legende est annonce ({corps['legendes']}) — "
            f"c'est lui qui dit si l'export coute des secondes ou des minutes")

    # =================================== [4] pas d'export pendant une production
    print("\n[4] l'export refuse pendant une production — un seul GPU, un seul batch")
    ss.STATE["running"] = True
    try:
        r = CLIENT.post(f"/api/training/export?character={CHAR_A}", json={})
        verifie(r.status_code == 409, f"refus en 409 ({r.status_code} — {r.text[:160]})")
        verifie(r.json().get("ok") is False and r.json().get("erreur"),
                "et le refus porte un corps JSON lisible a l'ecran")
    finally:
        ss.STATE["running"] = False
    verifie(declencheur_grave(CHAR_A) is None,
            "un export refuse n'a rien grave non plus")

    # =================================== [5] un export refuse ne casse pas la route
    print("\n[5] un refus du service sort en 400, jamais en 500")
    # Aucun fichier sur le disque pour ces personnages : `exporter` rend un
    # blocage, que le service traduit en `bad_request`. C'est le chemin ou un
    # `except Exception` trop large aurait transforme un refus en panne.
    r = CLIENT.post(f"/api/training/export?character={CHAR_A}", json={})
    verifie(r.status_code == 400,
            f"« rien a exporter » est un refus, pas une erreur serveur "
            f"({r.status_code} — {r.text[:160]})")
    verifie(r.json().get("ok") is False, "et il porte la forme {ok, erreur}")

    # =================================== [6] l'historique reste par personnage
    print("\n[6] l'historique des exports reste borne au personnage")
    (en.RACINE_EXPORT / CHAR_B / "20260910-120000").mkdir(parents=True)
    (en.RACINE_EXPORT / CHAR_B / "20260910-120000" / "manifeste.json").write_text(
        json.dumps({"personnage": CHAR_B, "images": [{"fichier": "b_taverne.png"}]}),
        encoding="utf-8")
    r = CLIENT.get(f"/api/training/exports?character={CHAR_A}")
    verifie(r.status_code == 200 and r.json()["exports"] == [],
            f"{CHAR_A} ne voit pas l'export de {CHAR_B} ({r.text[:160]})")
    r = CLIENT.get(f"/api/training/exports?character={CHAR_B}")
    verifie(len(r.json()["exports"]) == 1, "et le sien lui est bien rendu")

    # =================================== [7] la reponse annonce ce que le disque porte
    print("\n[7] un export reussi annonce LES DEUX chemins d'entrainement")
    # Des PNG factices dans l'arbre de production du personnage : sans fichier
    # sur le disque, l'export refuse (section [5]) et on ne verrait jamais ce
    # que la reponse dit d'un succes.
    prod_a = OFM / "PROD" / CHAR_A.upper() / "OK"
    prod_a.mkdir(parents=True, exist_ok=True)
    for nom in IMAGES[CHAR_A]:
        (prod_a / nom).write_bytes(b"\x89PNG\r\n\x1a\nfaux fichier, jamais lu")
    r = CLIENT.post(f"/api/training/export?character={CHAR_A}",
                    json={"avec_vision": False})
    verifie(r.status_code == 200, f"l'export aboutit ({r.status_code} — {r.text[:200]})")
    corps = r.json()
    verifie(corps.get("script") == "flux_train_network.py",
            f"la reponse nomme le script de ligne de commande ({corps.get('script')})")
    # LE TROU QUE CETTE LIGNE FERME (10/09). Le fichier etait ecrit, et la
    # reponse n'en disait rien : l'ecran ne pouvait pas savoir que le dossier
    # porte de quoi charger la GUI kohya_ss.
    verifie(corps.get("config_gui") == "kohya_config.json",
            f"ET la config de la GUI ({corps.get('config_gui')})")
    dossier_exporte = Path(corps["dossier"])
    for nom in ("dataset.toml", "entrainer.sh", "kohya_config.json", "manifeste.json"):
        verifie((dossier_exporte / nom).is_file(),
                f"{nom} est reellement sur le disque, pas seulement annonce")
    kohya = json.loads((dossier_exporte / "kohya_config.json").read_text(encoding="utf-8"))
    verifie(kohya["output_name"] == f"{corps['declencheur']}_v1"
            and kohya["keep_tokens"] == 1,
            "et la config porte bien ce que CE jeu determine, pas le preset nu")

    print("\n[7b] l'historique rend la meme chose au rechargement")
    h = CLIENT.get(f"/api/training/exports?character={CHAR_A}").json()
    verifie(len(h["exports"]) == 1, f"un export liste ({len(h['exports'])})")
    verifie(h["exports"][0]["config_gui"] == "kohya_config.json"
            and h["exports"][0]["script"] == corps["script"],
            "avec les deux chemins, relus dans son manifeste")


finally:
    shutil.rmtree(racine, ignore_errors=True)
    for cid in (CHAR_A, CHAR_B):
        shutil.rmtree(OFM / "CHARACTERS" / cid, ignore_errors=True)
        shutil.rmtree(OFM / "PROD" / cid.upper(), ignore_errors=True)

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
sys.exit(1 if KO else 0)
