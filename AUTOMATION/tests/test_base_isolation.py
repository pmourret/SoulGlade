# -*- coding: utf-8 -*-
"""Isolation de `GET /img/base`, le portrait de base gelee d'un personnage.

POURQUOI CE TEST EXISTE. `.claude/rules/backend.md` : toute route generalisee
vient avec un test qui aurait detecte un melange de donnees entre deux
personnages. Celle-ci sert des octets depuis `ComfyUI/input/`, un dossier
PLAT ET PARTAGE qui contient les bases de personnages absents du registre
(`DEMORA_BASE.png`, `MILA_BASE.png` sur la machine de reference, parmi 88
fichiers). C'est exactement la forme de la fuite du 29/08/2026 : un dossier
commun, et un client qui pourrait nommer ce qu'il veut dedans.

La parade est structurelle — la route ne prend AUCUN nom de fichier, elle lit
`base_gelee` dans le `config.json` du personnage demande. Ce test verrouille
cette propriete plutot que de la supposer :

  1. A recoit SA base, B recoit LA SIENNE, et les deux octets different ;
  2. aucun parametre de la requete ne permet de reclamer la base de l'autre :
     la route n'expose que `character`, et un `name=` ajoute a la main est
     IGNORE — il ne doit surtout pas servir de porte derobee ;
  3. CHEMIN D'ERREUR (la moitie qu'on oublie) : un personnage sans
     `base_gelee`, et un personnage dont le `base_gelee` nomme un fichier
     absent, sortent tous deux en 404 JSON — jamais par une retombee sur
     l'arbre d'un autre personnage ;
  4. un `base_gelee` qui tente une traversee (`../`, chemin absolu) est
     refuse avant toute resolution ;
  5. `?character=` absent est refuse, au lieu de rendre un personnage par
     defaut.

Personnages jetables (git-ignore : rien ne fuit dans l'historique), nettoyes
a la fin, avec leurs vignettes.

Lancer :  python_embeded\\python.exe AUTOMATION\\tests\\test_base_isolation.py
(ou le venv de dev : fastapi + Pillow suffisent, aucun appel ComfyUI reel)
"""
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import env_config                              # noqa: E402
import shared_state as ss                      # noqa: E402
from api.main import app                       # noqa: E402
from fastapi.testclient import TestClient      # noqa: E402

CHAR_A, CHAR_B = "probe-base-a", "probe-base-b"
CHAR_SANS = "probe-base-sans"        # aucun `base_gelee`
CHAR_ABSENT = "probe-base-absent"    # `base_gelee` nomme un fichier disparu
CHAR_TRAVERSE = "probe-base-trav"    # `base_gelee` tente une traversee
KO = 0

# `base_url` en 127.0.0.1 : sans lui le client envoie `Host: testserver`, que
# le garde d'origine refuse en 403.
CLIENT = TestClient(app, base_url="http://127.0.0.1")

COMFY_INPUT = env_config.comfyui_input()
# Noms deliberement DIFFERENTS et non deductibles du cid : c'est le cas reel
# (OFM_LENA_BASE_00025_.png, ABY_MAIN_REF.jpg), et c'est ce qui prouve que la
# route LIT le nom au lieu de le reconstruire.
BASE_A = "PROBE_HERITE_A_REF.png"
BASE_B = "PROBE_HERITE_B_REF.png"
POSES = []


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def image(chemin, couleur):
    """Une image de couleur unie : deux couleurs differentes suffisent a
    prouver que A n'a pas recu les octets de B."""
    from PIL import Image
    Image.new("RGB", (64, 80), couleur).save(chemin)
    POSES.append(chemin)


def poser_personnage(cid, base_gelee):
    """Personnage jetable, config clone de lena, `base_gelee` impose."""
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
    configuration = json.loads((lena / "config.json").read_text(encoding="utf-8"))
    if base_gelee is None:
        configuration.pop("base_gelee", None)
    else:
        configuration["base_gelee"] = base_gelee
    (d / "config.json").write_text(
        json.dumps(configuration, ensure_ascii=False, indent=2), encoding="utf-8")
    shutil.copy(lena / "creative.json", d / "creative.json")
    shutil.copy(lena / "scenes.json", d / "scenes.json")


def nettoyer():
    for cid in (CHAR_A, CHAR_B, CHAR_SANS, CHAR_ABSENT, CHAR_TRAVERSE):
        shutil.rmtree(OFM / "CHARACTERS" / cid, ignore_errors=True)
        shutil.rmtree(ss.THUMBS / cid, ignore_errors=True)
    for p in POSES:
        try:
            p.unlink()
        except OSError:
            pass


try:
    print("\n[0] mise en place : deux personnages, deux bases de couleurs differentes")
    image(COMFY_INPUT / BASE_A, (200, 30, 30))
    image(COMFY_INPUT / BASE_B, (30, 30, 200))
    poser_personnage(CHAR_A, BASE_A)
    poser_personnage(CHAR_B, BASE_B)
    poser_personnage(CHAR_SANS, None)
    poser_personnage(CHAR_ABSENT, "PROBE_CE_FICHIER_N_EXISTE_PAS.png")
    poser_personnage(CHAR_TRAVERSE, "../../../etc/passwd.png")
    verifie(True, "cinq personnages jetables poses")

    print("\n[1] chacun recoit SA base, et les octets different")
    ra = CLIENT.get(f"/img/base?character={CHAR_A}")
    rb = CLIENT.get(f"/img/base?character={CHAR_B}")
    verifie(ra.status_code == 200, f"A sert sa base ({ra.status_code})")
    verifie(rb.status_code == 200, f"B sert la sienne ({rb.status_code})")
    verifie(ra.content != rb.content,
            "les octets DIFFERENT : aucun des deux n'a recu la base de l'autre")
    verifie(len(ra.content) > 0 and len(rb.content) > 0, "les deux corps sont non vides")

    print("\n[2] aucun parametre ne permet de reclamer la base de l'autre")
    # `name=` est ajoute a la main : la route ne le declare pas, et FastAPI
    # l'ignore. Si un jour quelqu'un l'accepte, cette assertion tombe.
    force = CLIENT.get(f"/img/base?character={CHAR_A}&name={BASE_B}")
    verifie(force.status_code == 200, f"la requete passe ({force.status_code})")
    verifie(force.content == ra.content,
            "et elle rend TOUJOURS la base de A : `name=` est ignore, pas une porte")
    force2 = CLIENT.get(f"/img/base?character={CHAR_A}&base_gelee={BASE_B}")
    verifie(force2.content == ra.content, "idem avec `base_gelee=`")

    print("\n[3] chemin d'erreur : 404 JSON, jamais la base d'un autre")
    sans = CLIENT.get(f"/img/base?character={CHAR_SANS}")
    verifie(sans.status_code == 404, f"sans base_gelee -> 404 ({sans.status_code})")
    verifie(sans.json().get("ok") is False, "corps JSON {ok:false}")
    verifie(sans.content not in (ra.content, rb.content),
            "et surtout PAS les octets d'un autre personnage")

    absent = CLIENT.get(f"/img/base?character={CHAR_ABSENT}")
    verifie(absent.status_code == 404, f"fichier disparu -> 404 ({absent.status_code})")
    verifie("introuvable" in (absent.json().get("erreur") or ""),
            f"l'erreur dit laquelle des deux causes : « {absent.json().get('erreur')} »")
    verifie(absent.content not in (ra.content, rb.content),
            "toujours pas les octets d'un autre")

    print("\n[4] une traversee dans base_gelee est refusee avant resolution")
    trav = CLIENT.get(f"/img/base?character={CHAR_TRAVERSE}")
    verifie(trav.status_code == 404, f"`../../../etc/passwd.png` -> 404 ({trav.status_code})")
    verifie(trav.content not in (ra.content, rb.content), "et rien d'un autre personnage")

    print("\n[5] `character=` est obligatoire")
    nu = CLIENT.get("/img/base")
    verifie(nu.status_code in (400, 422),
            f"sans character= -> refus ({nu.status_code}), pas un personnage par defaut")

    print("\n[6] la vignette est rangee sous le personnage, pas en commun")
    va = ss.THUMBS / CHAR_A
    vb = ss.THUMBS / CHAR_B
    verifie(va.is_dir() and vb.is_dir(), "un dossier de vignettes par personnage")
    fa = {f.name for f in va.rglob("*.jpg")}
    fb = {f.name for f in vb.rglob("*.jpg")}
    verifie(bool(fa) and bool(fb), f"chacun a la sienne (A={fa}, B={fb})")

finally:
    nettoyer()

print("\n" + "=" * 70)
print(f"{KO} ECHEC(S)" if KO else "tout est vert")
print("=" * 70)
sys.exit(1 if KO else 0)
