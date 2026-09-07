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
from runner.comfy import ROLES_LATENT_PAR_FAMILLE  # noqa: E402

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

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
print("=" * 70)
sys.exit(1 if KO else 0)
