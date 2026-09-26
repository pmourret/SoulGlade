# -*- coding: utf-8 -*-
"""Le texte d'une pose : ce que le composeur met dans « En mots » quand on
choisit ce squelette.

DEUX SOURCES, PARCE QU'UNE SEULE NE SUFFIT PAS (mesure du 26/09, cadrage
DOCS/cadrage/2026-09-26-it10-c4-pose-texte.md) :

  1. `depuis_photo` -- Qwen3-VL lit la photo pendant l'extraction, la seule
     fenetre ou elle existe (pose_tools.extraire la supprime quoi qu'il
     arrive). 3 a 5 s, riche, parfois faux (« arms crossed » invente deux fois
     sur quatre) : une proposition, jamais une verite.
  2. `reecrire` -- apres une retouche, plus de photo, et AUCUN modele installe
     ne lit un squelette (Florence y voit « a stick insect », Qwen rend vide).
     Ce qui connait la pose, c'est sa geometrie : `faits` la lit, et Qwen
     reecrit l'ancien texte pour qu'il colle aux faits. Consigne cadree et
     reponse JSON, a la maniere de compose.py : identique sur trois graines.

Le texte « date » d'un jeu de points-cles : `texte_points` porte l'empreinte
des points pour lesquels il a ete ecrit. Une retouche change l'empreinte, et
le texte passe « a revoir » -- il n'est jamais reecrit en silence.
"""
import hashlib
import json
import logging
import math
import re

import legende
import llm_local

_LOG = logging.getLogger(__name__)

# Consigne mesuree le 26/09 sur quatre images, telle quelle.
CONSIGNE_PHOTO = (
    "Describe only the body pose in this image as a short comma-separated "
    "phrase for an image prompt: posture, arms, hands, legs, head direction, "
    "camera angle. No clothing, no face, no hair, no background.")

CONSIGNE_REECRIRE = """You write pose fragments for an image generation prompt.

A photo was described as:
OLD: %(old)s

The skeleton was then edited by hand. Measured on the edited skeleton:
%(faits)s

Task: rewrite OLD so it matches the measurements. Keep what the measurements do not contradict (props, hand actions). Drop anything they contradict. Body pose only: no clothing, no face, no hair, no background.

Answer with one JSON object and nothing else:
{"pose": "<comma-separated phrase>"}
"""

# Body-18, ordre COCO (voir pose_render.BODY_LIMBS).
NEZ, COU, EPAULE_D, COUDE_D, POIGNET_D, EPAULE_G, COUDE_G, POIGNET_G = range(8)
HANCHE_D, GENOU_D, CHEVILLE_D, HANCHE_G, GENOU_G, CHEVILLE_G = range(8, 14)
OEIL_D, OEIL_G, OREILLE_D, OREILLE_G = range(14, 18)


def empreinte(frame):
    """Empreinte des 18 points du corps, normalises : un libelle, un texte ou
    une main change ne la bouge pas, un point du corps deplace oui. Normalises
    parce que l'editeur reconstruit le frame (mains absentes remplies de zeros,
    `face_keypoints_2d` vide) : un enregistrement sans retouche ne doit pas
    rendre le texte « a revoir »."""
    brut = json.dumps([[round(p[0]), round(p[1])] if p else None for p in _points(frame)])
    return hashlib.sha1(brut.encode()).hexdigest()[:16]


def a_jour(frame):
    return bool(frame.get("texte")) and frame.get("texte_points") == empreinte(frame)


def avec_texte(frame, texte):
    """Le frame avec ce texte, date des points-cles actuels."""
    frame = dict(frame)
    frame["texte"] = propre(texte)
    frame["texte_points"] = empreinte(frame)
    return frame


def propre(texte):
    """Sortie du modele -> fragment de prompt : sans visage (invariant 6),
    sans prefixe de role ni ponctuation parasite.

    Pas `legende.sans_clause_de_visage` : sa reparation des moignons retire
    une clause d'un ou deux mots voisine d'une clause fautive, juste pour une
    legende narrative, fausse pour une liste de pose ou « standing » est une
    clause entiere."""
    clauses = re.split(r"\s*[,;.]\s*", legende._propre(texte))
    return ", ".join(c for c in clauses if c and not legende.terme_de_visage(c))


def _points(frame):
    people = (frame or {}).get("people") or []
    k = (people[0] if people else {}).get("pose_keypoints_2d") or []
    return [(k[3 * i], k[3 * i + 1]) if 3 * i + 2 < len(k) and k[3 * i + 2] > 0
            else None for i in range(18)]


def _milieu(*pts):
    pts = [p for p in pts if p]
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)) if pts else None


def _dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def faits(frame):
    """Ce que la geometrie du squelette dit de la pose, en lignes « cle:
    valeur » pour la consigne. Pure, sans modele.

    ponytail: seuils en fraction de la longueur du torse, poses sur les gabarits
    et la banque du 26/09. Une vue de trois-quarts ou un raccourci fort peuvent
    tromper la posture ; c'est pour ca que le texte reste une proposition.
    """
    p = _points(frame)
    cou, hanche = p[COU], _milieu(p[HANCHE_D], p[HANCHE_G])
    if not cou:
        return []
    epaules = p[EPAULE_D] and p[EPAULE_G] and _dist(p[EPAULE_D], p[EPAULE_G])
    torse = _dist(cou, hanche) if hanche else (epaules or 0) * 1.6
    if not torse:
        return []
    sortie = []

    # Posture
    genou, cheville = _milieu(p[GENOU_D], p[GENOU_G]), _milieu(p[CHEVILLE_D], p[CHEVILLE_G])
    if hanche and abs(hanche[0] - cou[0]) > abs(hanche[1] - cou[1]):
        sortie.append("posture: lying down")
    elif not (hanche and genou):
        sortie.append("framing: upper body only")
    else:
        dk = (genou[1] - hanche[1]) / torse
        da = (cheville[1] - genou[1]) / torse if cheville else None
        if dk < 0.35 and (da is None or da > 0.3):
            sortie.append("posture: sitting")
        elif da is not None and da < 0.25:
            sortie.append("posture: kneeling")
        else:
            sortie.append("posture: standing")

    # Bras
    tete = min((q[1] for q in (p[NEZ], p[OEIL_D], p[OEIL_G], p[OREILLE_D], p[OREILLE_G]) if q),
               default=cou[1] - 0.5 * torse)
    bras = {}
    for cote, (e, c, w) in (("right", (EPAULE_D, COUDE_D, POIGNET_D)),
                            ("left", (EPAULE_G, COUDE_G, POIGNET_G))):
        e, c, w = p[e], p[c], p[w]
        if not (e and w):
            continue
        if w[1] < tete:
            bras[cote] = "raised above the head"
        elif w[1] < e[1] - 0.15 * torse:
            bras[cote] = "raised"
        elif abs(w[1] - e[1]) < 0.25 * torse and abs(w[0] - e[0]) > 0.6 * torse:
            bras[cote] = "extended to the side"
        elif c and _dist(e, w) < 0.85 * (_dist(e, c) + _dist(c, w)):
            hauteur = "chest" if w[1] < e[1] + 0.6 * torse else "waist"
            bras[cote] = f"bent, hand at {hauteur} height"
        else:
            bras[cote] = "down along the body"
    if len(bras) == 2 and bras["right"] == bras["left"]:
        sortie.append(f"both arms: {bras['right']}")
    else:
        sortie += [f"{cote} arm: {v}" for cote, v in bras.items()]

    # Vue et tete
    yeux = [q for q in (p[OEIL_D], p[OEIL_G]) if q]
    if not p[NEZ] and not yeux:
        sortie.append("view: seen from behind")
    elif len(yeux) < 2 or (epaules is not None and epaules / torse < 0.2):
        sortie.append("view: profile")
    else:
        sortie.append("view: facing the camera")
        (x1, y1), (x2, y2) = yeux
        if math.degrees(math.atan2(abs(y2 - y1), abs(x2 - x1))) > 12:
            sortie.append("head: tilted")
        elif p[NEZ] and abs(p[NEZ][0] - (x1 + x2) / 2) > 0.35 * abs(x2 - x1):
            sortie.append("head: turned to the side")
        else:
            sortie.append("head: facing forward")
    return sortie


def depuis_photo(image, comfy_url=None):
    """Texte lu sur la photo, '' si le modele echoue. Ne leve jamais : une
    extraction sans texte reste une extraction."""
    try:
        return propre(llm_local.texte(CONSIGNE_PHOTO, image=image, comfy_url=comfy_url,
                                      seed=1, max_length=120, temperature=0.3,
                                      client_id="pose_texte"))
    except Exception as e:                                   # noqa: BLE001
        _LOG.warning("texte de pose non lu sur la photo : %s", e)
        return ""


def reecrire(frame, comfy_url=None):
    """Nouveau texte, depuis les faits du squelette et l'ancien texte. Leve
    `llm_local.LLMError` : c'est une action demandee, son echec s'affiche."""
    lignes = faits(frame)
    if not lignes:
        raise llm_local.LLMError("squelette trop incomplet pour en tirer une pose")
    brut = llm_local.texte(
        CONSIGNE_REECRIRE % {"old": frame.get("texte") or "(none)",
                             "faits": "\n".join(f"- {l}" for l in lignes)},
        comfy_url=comfy_url, seed=1, max_length=160, temperature=0.75,
        client_id="pose_texte")
    m = re.search(r'"pose"\s*:\s*"([^"]*)"', brut or "")
    texte = propre(m.group(1)) if m else ""
    if not texte:
        raise llm_local.LLMError(f"réponse illisible du modèle local : « {(brut or '')[:80]} »")
    return texte
