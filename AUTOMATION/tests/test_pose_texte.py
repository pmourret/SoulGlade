# -*- coding: utf-8 -*-
"""Le texte d'une pose (pose_texte.py) et sa tenue dans la banque
(pose_tools.py), sans ComfyUI : le modele local est remplace par un bouchon.

Ce que ce test verrouille :
  - `faits` lit sur des squelettes connus la posture, les bras et la vue ;
  - le texte date de ses points-cles : un point deplace le passe « a revoir »,
    un texte corrige a la main le remet « a jour », une retouche sans texte ne
    le reecrit pas en silence ;
  - aucun visage n'entre dans le texte (invariant 6) ;
  - un modele muet a l'extraction ne fait pas echouer (« ne leve jamais ») ;
    un modele illisible a la reecriture s'affiche comme une erreur.

Lancer :  python AUTOMATION\\tests\\test_pose_texte.py
"""
import copy
import json
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import llm_local  # noqa: E402
import pose_texte as t  # noqa: E402
import pose_tools as pt  # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


DEBOUT = json.loads((AUTOMATION / "pose_presets" / "debout.json").read_text(encoding="utf-8"))[0]


def bouge(frame, **points):
    """Copie de `frame` avec des points deplaces : `4=(x, y)`, ou `0=None`
    pour un point absent (confiance nulle)."""
    f = copy.deepcopy(frame)
    k = f["people"][0]["pose_keypoints_2d"]
    for i, xy in points.items():
        i = int(i.lstrip("p"))
        k[3 * i:3 * i + 3] = [0, 0, 0] if xy is None else [xy[0], xy[1], 1]
    return f


try:
    print("faits : ce que la geometrie dit")
    verifie(t.faits(DEBOUT) == ["posture: standing", "both arms: down along the body",
                                "view: facing the camera", "head: facing forward"],
            f"gabarit debout ({t.faits(DEBOUT)})")
    bras_leve = bouge(DEBOUT, p3=(300, 150), p4=(290, 60))
    verifie("right arm: raised above the head" in t.faits(bras_leve),
            f"poignet au-dessus de la tete ({t.faits(bras_leve)})")
    en_croix = bouge(DEBOUT, p3=(180, 240), p4=(40, 245), p6=(588, 240), p7=(728, 245))
    verifie("both arms: extended to the side" in t.faits(en_croix),
            f"bras en croix ({t.faits(en_croix)})")
    # genoux a hauteur de hanche, tibias vers le bas
    assis = bouge(DEBOUT, p9=(345, 600), p10=(345, 800), p12=(423, 600), p13=(423, 800))
    verifie("posture: sitting" in t.faits(assis), f"assis ({t.faits(assis)})")
    profil = bouge(DEBOUT, p14=None, p16=None)
    verifie("view: profile" in t.faits(profil), f"un seul oeil visible ({t.faits(profil)})")
    dos = bouge(DEBOUT, p0=None, p14=None, p15=None)
    verifie("view: seen from behind" in t.faits(dos), f"ni nez ni yeux ({t.faits(dos)})")
    verifie(t.faits(bouge(DEBOUT, p1=None)) == [], "sans cou : aucun fait plutot qu'un faux")

    print("visage : jamais dans le texte")
    propre = t.propre("assistant\nstanding, green eyes, arms crossed")
    verifie(propre == "standing, arms crossed", f"clause de visage retiree, le reste entier ({propre!r})")

    print("modele muet a l'extraction")
    vrai_texte = llm_local.texte

    def muet(*a, **k):
        raise llm_local.LLMError("ComfyUI eteint")
    llm_local.texte = muet
    verifie(t.depuis_photo(Path("inutile.png")) == "", "depuis_photo rend '' sans lever")

    print("date du texte, dans une banque jetable")
    vrai_dir = pt.POSE_DIR
    pt.POSE_DIR = Path(tempfile.mkdtemp(prefix="pose_texte_"))
    try:
        nom = pt.enregistrer_points(dict(DEBOUT, source="extraction"),
                                    texte="standing, arms relaxed")
        entree = pt.poses_disponibles_detail()[0]
        verifie(entree["texte"] == "standing, arms relaxed" and entree["texte_a_jour"],
                f"texte ecrit a la main : a jour ({entree})")

        pt.enregistrer_points(bouge(pt.charger_points(nom), p4=(290, 60)), nom=nom)
        entree = pt.poses_disponibles_detail()[0]
        verifie(entree["texte"] == "standing, arms relaxed" and not entree["texte_a_jour"],
                "retouche sans texte : garde l'ancien, marque a revoir")

        verifie(t.empreinte(dict(pt.charger_points(nom), label="autre")) ==
                t.empreinte(pt.charger_points(nom)), "un libelle change ne date pas le texte")
        # l'editeur renvoie le frame reconstruit : mains remplies, visage vide
        reconstruit = copy.deepcopy(DEBOUT)
        reconstruit["people"][0].update(hand_left_keypoints_2d=[0] * 63, face_keypoints_2d=[])
        reconstruit["people"][0]["pose_keypoints_2d"][0] += 0.2
        verifie(t.empreinte(reconstruit) == t.empreinte(DEBOUT),
                "frame reconstruit par l'editeur, sans retouche : meme empreinte")

        vus = []
        llm_local.texte = lambda prompt, **k: (vus.append(prompt),
                                               '{"pose": "standing, right arm raised above the head"}')[1]
        # la reecriture lit le frame COURANT et n'ecrit rien : l'enregistrement date le texte
        courant = pt.charger_points(nom)
        nouveau = t.reecrire(courant)
        verifie(nouveau == "standing, right arm raised above the head",
                f"reecriture depuis le frame courant ({nouveau!r})")
        verifie(pt.poses_disponibles_detail()[0]["texte"] == "standing, arms relaxed",
                "la reecriture n'ecrit rien sur disque")
        verifie("OLD: standing, arms relaxed" in vus[0] and "right arm: raised above the head" in vus[0],
                "la consigne porte l'ancien texte ET les faits du squelette")
        pt.enregistrer_points(courant, nom=nom, texte=nouveau)
        entree = pt.poses_disponibles_detail()[0]
        verifie(entree["texte"] == nouveau and entree["texte_a_jour"],
                "enregistree avec son texte : a jour")

        llm_local.texte = lambda prompt, **k: "user"
        try:
            t.reecrire(courant)
            verifie(False, "une reponse illisible aurait du lever")
        except llm_local.LLMError as e:
            verifie("illisible" in str(e), f"reponse illisible : erreur a l'ecran ({e})")
    finally:
        shutil.rmtree(pt.POSE_DIR, ignore_errors=True)
        pt.POSE_DIR = vrai_dir
        llm_local.texte = vrai_texte

finally:
    print("\n" + "=" * 70)
    print(f"{KO} ECHEC(S)" if KO else "tout est vert")
    print("=" * 70)
    sys.exit(1 if KO else 0)
