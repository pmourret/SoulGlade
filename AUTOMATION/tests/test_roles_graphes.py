# -*- coding: utf-8 -*-
"""Contrat titres/groupes entre les graphes de production et le runner (IT-2).

POURQUOI CE TEST EXISTE. Le runner s'accroche aux graphes par TITRE de noeud
(`find_node`) et par TITRE de groupe (`active_groups`). Les deux se cassent en
silence : un titre renomme rend `LookupError`, `_roles()` l'avale en `None`, et
l'etage concerne ne s'active plus jamais -- sans message, sans erreur, sans
image ratee evidente. Le cas reel qui a motive ce fichier : IT-2 ajoute un
second `CheckpointLoaderSimple` au graphe SDXL (refiner), ce qui rendait le
role `checkpoint` AMBIGU donc `None`, donc le swap de checkpoint par style de
sortie mort pour tout le pack rpg-personnage.

Ne demande PAS ComfyUI (contrairement a test_model_family_sdxl.py, qui verifie
la meme chaine mais convertie) : c'est de la lecture de JSON. Il tourne donc
la ou wf_check.py ne peut pas.

Lancer :  python AUTOMATION\\tests\\test_roles_graphes.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION))

import identity   # noqa: E402
import ui_to_api  # noqa: E402
import universe   # noqa: E402
from runner.comfy import ROLE_LORA_PACK, ROLES_LATENT_PAR_FAMILLE  # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


# Roles cherches par _roles() qui doivent resoudre sur un graphe de production
# complet, quelle que soit la famille. `latent` est le seul qui change de type
# par famille -- lu depuis la table du runner, jamais recopie ici.
ROLES_COMMUNS = [
    ("positive", "CLIPTextEncode", "POSITIF - scene"),
    ("sampler", "KSampler", "passe 1"),
    ("save", "SaveImage", "SORTIE production"),
    ("switch", "Switch any [Crystools]", None),
    ("refiner", "KSampler", "img2img denoise"),
    ("export_scale", "ImageScale", "Taille de publication"),
    ("grain_node", "ImageAddNoise", None),
    ("sharpen", "ImageCASharpening+", None),
]
# Groupes forces actifs par WorkflowRunner (preset upscale_2k / facedetailer /
# grain_export). Fragment de titre, comme `_group_bounds`.
GROUPES = ["UPSCALE IMAGE 2K", "FACEDETAILER", "GRAIN + EXPORT"]

for pack_id in ("instagram-influenceur", "rpg-personnage"):
    uni = universe.load_universe(pack_id)
    chemin = OFM / uni["capabilities"]["produce"]["graph"]
    ui = json.loads(chemin.read_text(encoding="utf-8"))
    famille = uni["model_family"]
    print(f"\n[{pack_id}] {chemin.name} ({famille})")

    for role, typ, titre in ROLES_COMMUNS + [("latent",) + ROLES_LATENT_PAR_FAMILLE[famille]]:
        try:
            n = ui_to_api.find_node(ui, typ, titre)
            verifie(True, f"role {role!r} -> #{n['id']} {n.get('title') or n['type']!r}")
        except LookupError as e:
            verifie(False, f"role {role!r} ({typ} / {titre!r}) : {e}")

    for role, (typ, titre) in identity.for_universe(pack_id).REQUIRED_ROLES.items():
        try:
            ui_to_api.find_node(ui, typ, titre)
            verifie(True, f"role d'identite {role!r} resolu")
        except LookupError as e:
            verifie(False, f"role d'identite {role!r} : {e}")

    # LoRA DE PACK (21/09) : optionnel, un pack a le droit de ne pas en porter,
    # et `runner.comfy.lora_pack_actif` refuse alors de l'allumer. Mais celui
    # qui le porte doit le porter ETEINT — c'est la moitie graphe de la garde
    # anti-nu involontaire en SFW, l'autre moitie etant la force remise a zero
    # par `apply_tier_rules`. Un jour ou ce noeud serait sauvegarde actif, tout
    # le pack produirait avec, sans qu'aucun test ne l'ait vu.
    try:
        n = ui_to_api.find_node(ui, *ROLE_LORA_PACK)
    except LookupError:
        n = None
    if pack_id == "instagram-influenceur":
        verifie(n is not None,
                f"role 'pack_lora' ({ROLE_LORA_PACK[1]}) present dans le graphe Flux")
    if n is not None:
        verifie(n.get("mode") == 4,
                f"et bypasse par defaut (mode {n.get('mode')!r}, 4 attendu)")

    # Le checkpoint de base : role OPTIONNEL du runner, mais indispensable des
    # qu'un pack declare plusieurs styles de sortie avec swap de checkpoint.
    # Cherche par fragment de titre justement pour rester non ambigu quand le
    # graphe porte un second loader (refiner) -- c'est ce que IT-2 a introduit.
    multi_style = len(universe.style_names(pack_id)) > 1
    try:
        n = ui_to_api.find_node(ui, "CheckpointLoaderSimple", "CHECKPOINT")
        verifie(True, f"role 'checkpoint' -> #{n['id']} ({n.get('title')!r})")
    except LookupError as e:
        verifie(not multi_style,
                f"role 'checkpoint' non resolu alors que {pack_id} declare "
                f"{len(universe.style_names(pack_id))} styles : {e}")

    for fragment in GROUPES:
        ids = ui_to_api.nodes_in_group(ui, fragment)
        verifie(bool(ids), f"groupe ~{fragment!r} present et non vide ({len(ids)} noeuds)")

    # Un titre de groupe qui est un fragment d'un autre ferait basculer
    # `active_groups` sur la mauvaise cible, en silence (_group_bounds rend le
    # PREMIER trouve).
    titres = [g.get("title", "").lower() for g in ui.get("groups", [])]
    chevauche = [(a, b) for a in titres for b in titres if a != b and a in b]
    verifie(not chevauche, f"aucun titre de groupe fragment d'un autre {chevauche or ''}")

    # HANDDETAILER (groupe 14, IT-3b) est OPTIONNEL par graphe : il n'entre pas
    # dans GROUPES, un pack a le droit de ne pas l'avoir et le runner s'adapte
    # (invariant 7). Mais quand il est la, le groupe et le noeud doivent aller
    # ensemble — le groupe seul ne detaille rien, et le noeud hors du groupe
    # n'est jamais active, dans les deux cas sans le moindre message. C'est
    # l'appartenance GEOMETRIQUE qui les lie : un noeud deplace de quelques
    # pixels sort du groupe.
    ids = ui_to_api.nodes_in_group(ui, "HANDDETAILER")
    if ids:
        try:
            n = ui_to_api.find_node(ui, "FaceDetailer", "HandDetailer")
            verifie(n["id"] in ids,
                    f"role 'handdetailer' -> #{n['id']} et il est DANS le groupe 14")
        except LookupError as e:
            verifie(False, f"groupe HANDDETAILER present mais le noeud pilote "
                           f"est introuvable ou ambigu : {e}")
        verifie(len(ids) == 2,
                f"groupe HANDDETAILER : le detecteur et le detailer, rien d'autre "
                f"({len(ids)} noeuds)")

# --------------------------------------------------------------------------
# Le graphe d'EDITION (capacite `edit`, ADR-0018), ajoute en IT-3e.
#
# POURQUOI IL ENTRE ICI. Il n'avait aucun test de contrat, alors qu'il
# s'accroche a ses noeuds exactement comme un graphe de production —
# `nsfw_batch.NsfwRunner._roles` par `find_node`, ses groupes par
# `active_groups`. Le cas reel : IT-3e y ajoute un SECOND `FaceDetailer`
# (les mains), ce qui rendait AMBIGUE la recherche par type seul du premier
# et cassait toute la voie d'edition — meme famille de faute que le
# `CheckpointLoaderSimple` d'IT-2, en plus brutal puisqu'ici `find_node`
# leve au lieu de rendre None.
#
# Titres recopies en dur, comme ROLES_COMMUNS plus haut : ce fichier
# RESTATE le contrat au lieu de l'importer, pour qu'un titre change d'un
# cote fasse echouer de l'autre.
ROLES_EDITION = [
    ("source", "LoadImage", "Image SFW validee"),
    ("ref", "LoadImage", "BASE GELEE - identite"),
    ("ref_face", "LoadImage", "BASE GELEE - source du visage"),
    ("facedetailer", "FaceDetailer", "remet le visage"),
    ("final_size", "ImageScale", "Taille finale"),
    ("switch", "Switch any [Crystools]", None),
    ("refiner", "KSampler", "img2img realisme"),
    ("grain", "ImageAddNoise", None),
    ("sharpen", "ImageCASharpening+", None),
    ("positive", "TextEncodeQwenImageEditPlus", "POSITIF"),
    ("latent", "EmptySD3LatentImage", None),
    ("sampler", "KSampler", "edition Qwen"),
    ("save", "SaveImage", None),
    ("lora", "LoraLoaderModelOnly", None),
]
# Groupes toujours actifs, `nsfw_batch.GROUPS`. `N4b - HANDDETAILER` en est
# volontairement absent : il est optionnel et bypasse par defaut.
GROUPES_EDITION = ["N1 - ENTREES", "N2 - MODELE NSFW LOCAL", "N3 - EDITION GUIDEE",
                   "N3b - REFINER REALISME", "N4 - IDENTITE RESTAUREE", "N5 - SORTIE"]

for pack_id in ("instagram-influenceur", "rpg-personnage"):
    uni = universe.load_universe(pack_id)
    cap = (uni.get("capabilities") or {}).get("edit")
    if not cap:                      # un pack a le droit de ne pas editer
        continue
    chemin = OFM / cap["graph"]
    ui = json.loads(chemin.read_text(encoding="utf-8"))
    print(f"\n[{pack_id}] edition : {chemin.name}")

    for role, typ, titre in ROLES_EDITION:
        try:
            n = ui_to_api.find_node(ui, typ, titre)
            verifie(True, f"role {role!r} -> #{n['id']} {n.get('title') or n['type']!r}")
        except LookupError as e:
            verifie(False, f"role {role!r} : {e}")

    # Ce que la carte de capacites PROMET doit etre ce que le graphe porte.
    # `handdetailer` est OPTIONNEL (invariant 7 : la capacite est portee par le
    # graphe du pack, jamais par le code) : il a le droit d'etre absent des
    # deux, jamais d'etre promis sans etre la.
    promis = set(cap.get("roles") or [])
    obligatoires = {r for r, _, _ in ROLES_EDITION}
    manquants = obligatoires - promis
    en_trop = promis - obligatoires - {"handdetailer"}
    verifie(not manquants and not en_trop,
            f"carte de capacites et contrat d'accroche d'accord "
            f"{(manquants | en_trop) or ''}")

    for fragment in GROUPES_EDITION:
        verifie(bool(ui_to_api.nodes_in_group(ui, fragment)),
                f"groupe ~{fragment!r} present et non vide")

    titres = [g.get("title", "").lower() for g in ui.get("groups", [])]
    chevauche = [(a, b) for a in titres for b in titres if a != b and a in b]
    verifie(not chevauche, f"aucun titre de groupe fragment d'un autre {chevauche or ''}")

    # Meme contrat que le groupe 14 cote production, et meme raison.
    ids = ui_to_api.nodes_in_group(ui, "N4b - HANDDETAILER")
    verifie("handdetailer" not in promis or bool(ids),
            "'handdetailer' promis par la carte -> le groupe N4b existe vraiment")
    if ids:
        try:
            n = ui_to_api.find_node(ui, "FaceDetailer", "HandDetailer")
            verifie(n["id"] in ids,
                    f"role 'handdetailer' -> #{n['id']} et il est DANS le groupe N4b")
        except LookupError as e:
            verifie(False, f"groupe N4b present mais le noeud pilote est "
                           f"introuvable ou ambigu : {e}")
        verifie(len(ids) == 2,
                f"groupe N4b : le detecteur et le detailer, rien d'autre "
                f"({len(ids)} noeuds)")

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
print("=" * 70)
sys.exit(1 if KO else 0)
