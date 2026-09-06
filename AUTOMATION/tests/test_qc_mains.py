# -*- coding: utf-8 -*-
"""QC des mains (P4.3, ADR-0018 capacite "hands"). Metrique cadree dans
DOCS/cadrage/2026-09-07-p4-3-metrique-mains.md — ce test verifie qu'elle
est appliquee telle que decidee, pas une autre.

DEUX PARTIES. [1] teste la fonction PURE `metrique()` sur des dicts
POSE_KEYPOINT fabriques a la main (mains propres, main partiellement
detectee, main hors-champ, aucune main) — tourne toujours, aucun ComfyUI
requis. [2] est l'aller-retour REEL par ComfyUI sur 3 images choisies
dans la banque Lena (mains propres, main cassee, aucune main visible) —
ping ComfyUI d'abord, s'arrete proprement s'il est injoignable plutot que
pretendre avoir verifie ce qu'il n'a pas verifie, meme discipline que
test_platform_capabilities.py [4] et wf_check.py --essai.

Lancer :  python_embeded\\python.exe AUTOMATION\\tests\\test_qc_mains.py
"""
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION))

import qc_mains as qm      # noqa: E402
import runner as lb        # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def _flat_ok(n=21):
    """21 points tous detectes, coordonnees arbitraires mais plausibles."""
    out = []
    for i in range(n):
        out += [100.0 + i, 200.0 + i, 1.0]
    return out


def _flat_partiel(n_detectes, n=21):
    """`n_detectes` points sur `n` avec confiance > 0, le reste a 0."""
    out = []
    for i in range(n):
        c = 1.0 if i < n_detectes else 0.0
        out += [100.0 + i, 200.0 + i, c]
    return out


def _corps_avec_poignets(droit=True, gauche=True):
    corps = [0.0, 0.0, 0.0] * 18  # 18 points OpenPose, aucun detecte par defaut
    if droit:
        corps[qm.IDX_POIGNET_DROIT * 3 + 2] = 1.0
    if gauche:
        corps[qm.IDX_POIGNET_GAUCHE * 3 + 2] = 1.0
    return corps


# --------------------------------------------- [1] metrique pure, hors ligne
print("[1] metrique() sur des dicts POSE_KEYPOINT fabriques")

# mains propres, les deux poignets detectes, les deux mains completes
r = qm.metrique({
    "pose_keypoints_2d": _corps_avec_poignets(),
    "hand_right_keypoints_2d": _flat_ok(),
    "hand_left_keypoints_2d": _flat_ok(),
})
verifie(r["score"] == 1.0, f"mains propres -> score 1.0 (recu {r['score']})")
verifie(r["mains_evaluees"] == 2, "les deux mains evaluees")
verifie(qm.verdict(r["score"], 1.0, 0.7) == qm.OK, "verdict OK")

# une main tres partiellement detectee (5/21) -> score bas, minimum retenu
r = qm.metrique({
    "pose_keypoints_2d": _corps_avec_poignets(),
    "hand_right_keypoints_2d": _flat_ok(),
    "hand_left_keypoints_2d": _flat_partiel(5),
})
attendu = 5 / 21
verifie(abs(r["score"] - attendu) < 1e-9,
        f"main cassee -> score = minimum des deux mains ({attendu:.3f}, recu {r['score']:.3f})")
verifie(qm.verdict(r["score"], 1.0, 0.7) == qm.CASSE,
        "verdict CASSE sous le seuil threshold_watch")

# poignet droit hors-champ (non detecte) : main droite exclue, pas comptee cassee
r = qm.metrique({
    "pose_keypoints_2d": _corps_avec_poignets(droit=False, gauche=True),
    "hand_right_keypoints_2d": None,
    "hand_left_keypoints_2d": _flat_ok(),
})
verifie(r["score"] == 1.0,
        f"poignet droit hors-champ -> ignore, score porte par la main gauche seule (recu {r['score']})")
verifie(r["mains_evaluees"] == 1, "une seule main evaluee")

# aucun poignet detecte : aucune main visible, jamais compte casse
r = qm.metrique({
    "pose_keypoints_2d": _corps_avec_poignets(droit=False, gauche=False),
    "hand_right_keypoints_2d": None,
    "hand_left_keypoints_2d": None,
})
verifie(r["score"] is None, "aucun poignet detecte -> score None")
verifie(qm.verdict(r["score"], 1.0, 0.7) == qm.SANS_MAIN,
        "verdict SANS_MAIN, jamais CASSE")

# --------------------------------------- [2] aller-retour REEL, 3 images Lena
print("\n[2] mesure() sur 3 images reelles de la banque Lena, via ComfyUI")
print("    (verifie EMPIRIQUEMENT, pas suppose — voir la limite documentee")
print("    dans DOCS/cadrage/2026-09-07-p4-3-metrique-mains.md : ce metrique")
print("    ne distingue pas une main cassee d'une main coupee pile au poignet,")
print("    et peut manquer une deformation que DWPose sait quand meme ajuster")
print("    a un squelette 21 points plausible — teste ici ce qui est GARANTI,")
print("    pas une pretention de detection anatomique parfaite.)")

CAS = [
    ("mains propres (les deux visibles, tenant un livre)",
     OFM / "PROD" / "LENA" / "OK" / "lifestyle_salon_lecture_20260824_01.png",
     lambda r: r["verdict"] in (qm.OK, qm.SUSPECT)),
    ("main tres majoritairement hors-cadre (coupee au poignet, arriere-plan "
     "sport) — score bas attendu, meme si la cause reelle est le cadrage et "
     "non une deformation (limite connue, pas une fausse assertion de casse)",
     OFM / "PROD" / "LENA" / "OK" / "sport_course_20260823_01.png",
     lambda r: r["verdict"] in (qm.SUSPECT, qm.CASSE)),
    ("aucune main visible, portrait cadre a la poitrine sans bras dans le "
     "champ — poignet lui-meme non detecte",
     OFM / "PROD" / "LENA" / "OK" / "voyage_rando_montagne_20260825_01.png",
     lambda r: r["verdict"] == qm.SANS_MAIN),
]

try:
    urllib.request.urlopen("http://127.0.0.1:8188/system_stats", timeout=3)
    comfy_up = True
except Exception:
    comfy_up = False

if not comfy_up:
    print("  note  ComfyUI injoignable sur http://127.0.0.1:8188 — [2] non verifie ici,")
    print("        pas simule comme si ca l'etait. Relancer ce test ComfyUI demarre pour")
    print("        la preuve complete (meme discipline que wf_check.py --essai).")
else:
    cfg = lb.load_config("lena")
    comfy_url = cfg["comfy_url"]
    for label, img, attendu in CAS:
        if not img.is_file():
            verifie(False, f"{label} — image de reference introuvable : {img}")
            continue
        r = qm.mesure(img, comfy_url)
        verifie(attendu(r), f"{label} — score={r['score']}, verdict={r['verdict']}")

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
print("=" * 70)
sys.exit(1 if KO else 0)
