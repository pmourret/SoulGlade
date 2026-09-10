# -*- coding: utf-8 -*-
"""Sur quoi entrainerait-on un LoRA d'identite, et est-ce assez ?

    python AUTOMATION/entrainement.py [personnage]
    python AUTOMATION/entrainement.py [personnage] --exporter [--repetitions=N]

CE MODULE NE LANCE RIEN. Il lit la base et rend une PROPOSITION : combien
d'images, lesquelles, ce qui a ete ecarte et pourquoi, la diversite, et quel
critere manque. C'est Pierre qui decide (PROJET.md : la plateforme n'arbitre
jamais a la place de l'utilisateur), et une proposition qui ne sait pas dire
POURQUOI elle n'aboutit pas ne sert a rien.

`--exporter` ne l'entraine pas davantage : il RASSEMBLE. Le dossier date qui
en sort porte les images, leurs legendes, le manifeste de ce qui les a
choisies, et depuis le 10/09 de quoi lancer -- `dataset.toml` et
`entrainer.sh`. C'est une unite qu'on envoie telle quelle sur une machine
louee (RunPod ou autre), parce que l'entrainement se fait HORS PLATEFORME :
l'atelier integre est l'etage 3 du cadrage du 09/09, et il attend le chiffre
de l'etage 1.

DEUX OBJETS, PAS UN. Le GABARIT (base.construire_jeu) est un instrument de
mesure : il veut couvrir l'espace de conditions de la production, donc il
admet tout ce qui est bien le personnage, mains cassees comprises -- une main
ne deforme pas un visage. La FILE D'ENTRAINEMENT veut de la qualite : elle
ecarte en plus le DEFAUT OBJECTIF. Le schema du 09/09 les faisait passer sous
une seule fleche ; l'annotation manuelle des rejets de Lena, le 10/09, a montre
que le portillon d'identite laissait passer 6 mains cassees sur 12 -- il ne les
filtre pas, il les tire a pile ou face.

CE QU'ON N'ECARTE PAS : le gout. `flag == 'ia'` (« ca fait IA ») est un
jugement de realisme que l'utilisateur final fait lui-meme, et il est mesure
sans effet sur l'identite (0.1 sigma contre le gabarit, 10/09). Seuls les axes
de defaut OBJECTIF comptent ici -- une main a six doigts n'est pas un choix
creatif (PROJET.md, amendement du 07/09).
"""
import json
import math
import shutil
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import base                                                    # noqa: E402
import legende                                                 # noqa: E402

OFM = HERE.parent
# Hors de l'arbre de tri, comme PROD/_ANALYSES : un jeu d'entrainement n'est pas
# une image de production, il ne doit pas apparaitre dans la Revue ni etre
# ramasse par ce qui parcourt les buckets.
RACINE_EXPORT = OFM / "PROD" / "_ENTRAINEMENT"

# Axes de defaut objectif qui ecartent de la file. `flag` n'y est PAS, et c'est
# la decision du 10/09 : la plateforme juge l'identite, l'humain juge
# l'anatomie, son gout ne rentre dans aucune des deux.
AXES_OBJECTIFS = ("mains_juge", "anatomie")
# Un membre dont le score contre le gabarit tombe a plus de 2 ecarts-types
# sous la moyenne de la file. Signale, jamais ecarte tout seul.
Z_OUTLIER = -2.0
# Axes de diversite. Ce sont les colonnes que la production remplit deja
# (43/45 chez Lena) ; `variante` en est absente, elle n'est renseignee que sur
# 6 images sur 45.
AXES_DIVERSITE = ("scene", "intention", "ton", "format")

# Cible de pas par epoque (images x repetitions) pour choisir un nombre de
# repetitions par defaut. CE N'EST PAS UN ARBITRAGE : le nombre de repetitions
# est un reglage d'entrainement, il appartient a Pierre (PROJET.md). L'export
# en propose un pour que le dossier soit executable tel quel, l'annonce a
# l'ecran et dans le manifeste, et `--repetitions=N` le remplace.
# ponytail: cible plate a 200, a remplacer par une regle qui tient compte de la
# resolution et du nombre d'epoques le jour ou un banc les separe.
REPETITIONS_CIBLE = 200

# Ce qui change d'une famille de modele a l'autre dans la ligne d'entrainement
# kohya. Cle = `universe.json / model_family` du PACK, jamais le personnage
# (invariant 7). Ce qui est commun vit dans RECETTE, une seule fois.
RECETTES = {
    "flux": {
        "script": "flux_train_network.py",
        "module": "networks.lora_flux",
        "resolution": 1024,
        "modeles": [
            '--pretrained_model_name_or_path "$MODELES/unet/flux1-dev.safetensors"',
            '--clip_l "$MODELES/clip/clip_l.safetensors"',
            '--t5xxl "$MODELES/clip/t5xxl_fp16.safetensors"',
            '--ae "$MODELES/vae/ae.safetensors"',
        ],
        "specifique": [
            "--timestep_sampling shift --discrete_flow_shift 3.1582",
            "--model_prediction_type raw --guidance_scale 1.0",
            "--fp8_base",
            "--cache_text_encoder_outputs --cache_text_encoder_outputs_to_disk",
        ],
    },
    "sdxl": {
        "script": "sdxl_train_network.py",
        "module": "networks.lora",
        "resolution": 1024,
        "modeles": ['--pretrained_model_name_or_path "$CHECKPOINT"'],
        "specifique": ["--no_half_vae", "--cache_text_encoder_outputs"],
    },
}

# Le squelette commun aux familles. Les chemins de modeles sont des VARIABLES
# D'ENVIRONNEMENT avec un defaut : ce dossier part sur une machine qu'on ne
# connait pas, un chemin en dur y serait faux une fois sur deux. Les defauts
# visent le template RunPod kohya_ss, le plus repandu.
RECETTE = """#!/usr/bin/env bash
# LoRA d'identite de {perso} — jeu exporte par Soulglade le {date}.
#
# {n} image(s), {repetitions} repetition(s) chacune, declencheur « {trigger} ».
# manifeste.json, a cote, dit d'ou vient chaque image, ce qui a ete ecarte et
# pourquoi, et l'etat du gabarit au moment de l'export. Sans lui, deux LoRA
# entraines a deux dates ne sont pas comparables.
#
# SUR UNE MACHINE D'ENTRAINEMENT (RunPod ou autre) :
#   1. envoyer ce dossier entier
#   2. verifier les chemins ci-dessous — ce sont ceux du template RunPod
#      kohya_ss, rien ne les garantit ailleurs
#   3. bash entrainer.sh
#
# Le LoRA sort dans output/. Ce qui revient dans Soulglade est le .safetensors
# et rien d'autre : il se pose dans models/loras/ et se declare dans
# CHARACTERS/{perso}/config.json / identity / lora.
set -euo pipefail
cd "$(dirname "$0")"

SD_SCRIPTS=${{SD_SCRIPTS:-/workspace/kohya_ss/sd-scripts}}
MODELES=${{MODELES:-/workspace/kohya_ss/models}}
CHECKPOINT=${{CHECKPOINT:-$MODELES/checkpoints/model.safetensors}}
EPOCHS=${{EPOCHS:-10}}

accelerate launch --mixed_precision bf16 --num_cpu_threads_per_process 1 \\
  "$SD_SCRIPTS/{script}" \\
{modeles}  --dataset_config dataset.toml \\
  --output_dir output --output_name "{sortie}" \\
  --network_module {module} --network_dim 16 --network_alpha 16 \\
  --optimizer_type adamw8bit --learning_rate 1e-4 \\
  --max_train_epochs "$EPOCHS" --save_every_n_epochs 2 \\
  --save_model_as safetensors --save_precision bf16 \\
  --cache_latents_to_disk --gradient_checkpointing --sdpa --seed 42 \\
{specifique}
"""

# `keep_tokens = 1` : la legende commence par le declencheur (cadrage du
# 10/09), et un melange le noierait dans la description — c'est la constance du
# jeton que la pratique demande le plus.
DATASET_TOML = """[general]
caption_extension = ".txt"
keep_tokens = 1

[[datasets]]
resolution = {resolution}
batch_size = 1

  [[datasets.subsets]]
  image_dir = "{dossier_images}"
  num_repeats = {repetitions}
"""


def categories_effectives(valeurs):
    """Nombre EFFECTIF de categories : exp(entropie de Shannon).

    Un compte de valeurs distinctes mentirait. 13 scenes dont trois pesent la
    moitie du lot ne font pas 13 observations differentes -- c'est la regle 9
    du mecanisme d'identite : « 30 observations differentes, pas 30 images
    presque identiques ». Cette mesure rend 13 quand tout est equilibre, et
    tombe vers 1 quand une categorie ecrase les autres.

    Les valeurs vides sont ignorees : une metadonnee absente n'est pas une
    categorie, elle est une inconnue (rendue a part par `diversite`).
    """
    v = [x for x in valeurs if x]
    if not v:
        return 0.0
    c = Counter(v)
    n = sum(c.values())
    h = -sum((k / n) * math.log(k / n) for k in c.values())
    return math.exp(h)


def diversite(lignes):
    """Par axe : categories distinctes, effectives, et images sans la donnee."""
    out = {}
    for axe in AXES_DIVERSITE:
        valeurs = [r[axe] for r in lignes]
        out[axe] = {"distinctes": len({x for x in valeurs if x}),
                    "effectives": categories_effectives(valeurs),
                    "sans": sum(1 for x in valeurs if not x)}
    return out


def candidats(cx, character_id):
    """La file d'entrainement, et ce qui en a ete ecarte avec la raison.

    Part des membres du jeu de reference ACTIF : ils ont deja passe le
    portillon d'identite (base.construire_jeu). On n'y ajoute qu'un filtre,
    celui du defaut objectif.

    Une image JAMAIS ETIQUETEE entre, et elle est comptee a part. Son absence
    de defaut n'est pas connue, elle est supposee : la proposition l'affiche
    plutot que de trancher en silence dans un sens ou dans l'autre.
    """
    actif = base.jeu_actif(cx, character_id)
    if not actif:
        return {"jeu": None, "file": [], "ecartes": [], "sans_etiquette": []}

    lignes = [dict(r) for r in cx.execute(
        "SELECT i.id AS id, i.fichier AS fichier, i.scene AS scene, "
        "       i.intention AS intention, i.ton AS ton, i.format AS format, "
        "       i.prompt AS prompt, "
        "       i.lora_identite AS lora_identite, e.vec AS vec, "
        "       j.anatomie AS anatomie, j.mains_juge AS mains_juge "
        "FROM reference_member m "
        "JOIN image i ON i.id = m.image_id "
        "JOIN embedding e ON e.image_id = i.id "
        "LEFT JOIN jugement j ON j.image_id = i.id "
        "WHERE m.set_id = ?", (actif["id"],))]

    file_, ecartes, sans = [], [], []
    for r in lignes:
        fautes = [axe for axe in AXES_OBJECTIFS if r.get(axe) == "ko"]
        if fautes:
            ecartes.append({**r, "raison": fautes})
            continue
        file_.append(r)
        if not any(r.get(axe) for axe in AXES_OBJECTIFS):
            sans.append(r)
    return {"jeu": actif, "file": file_, "ecartes": ecartes, "sans_etiquette": sans}


def fichiers_sur_disque(character_id):
    """nom -> chemin, dans l'arbre de production du personnage.

    `_BATCH` (planches de contact) et `_BENCH` (sorties de banc) sont exclus :
    ce ne sont pas des images de production, et un homonyme y ferait exporter
    la mauvaise. `_NSFW` aussi — la file est SFW par construction
    (`construire_jeu` filtre `espace = 'lena'`), et un nom identique des deux
    cotes prendrait au hasard de l'ordre de parcours.
    """
    racine = OFM / "PROD" / character_id.upper()
    out = {}
    if racine.exists():
        for f in racine.rglob("*.png"):
            if {"_BATCH", "_BENCH", "_NSFW"} & set(f.parts):
                continue
            out.setdefault(f.name, f)
    return out


def proposition(cx, character_id, configuration=None):
    """Le rapport complet, avec un verdict PAR CRITERE et sa raison.

    Un seuil absent du config.json ne devient jamais une valeur par defaut ici
    (invariant 4) : le critere est rendu « sans seuil configure », et la
    proposition ne conclut pas. Meme regle que `qc.threshold_gabarit` : un
    seuil se mesure par personnage, il ne se devine pas dans le code.
    """
    import numpy as np
    seuils = ((configuration or {}).get("entrainement") or {})
    d = candidats(cx, character_id)
    if d["jeu"] is None:
        return {**d, "pret": False, "criteres": [], "sans_fichier": [],
                "diversite": diversite([]), "derives": 0, "cohesion": None,
                "ecart_type": None, "outliers": [],
                "blocage": "aucun jeu de reference actif : le gabarit n'existe "
                           "pas encore pour ce personnage"}

    file_ = d["file"]
    # LA FILE ET CE QUI EST EXPORTABLE NE SONT PAS LE MEME NOMBRE, et le taire
    # serait un mensonge de plus. La file raisonne sur des EMBEDDINGS, qui
    # survivent en base a la disparition du PNG ; l'entrainement, lui, a besoin
    # du fichier. Chez Lena au 10/09 : 27 dans la file, 24 sur le disque.
    disque = fichiers_sur_disque(character_id)
    rapport = {**d, "diversite": diversite(file_),
               "derives": sum(1 for r in file_ if r["lora_identite"]),
               "sans_fichier": [r for r in file_ if r["fichier"] not in disque],
               "cohesion": None, "ecart_type": None, "outliers": []}

    if file_:
        gab = base.centroide(cx, d["jeu"]["id"])
        s = np.array([float(np.dot(gab, np.frombuffer(r["vec"], dtype=np.float32)))
                      for r in file_])
        rapport["cohesion"] = float(s.mean())
        rapport["ecart_type"] = float(s.std())
        if s.std() > 1e-9:
            z = (s - s.mean()) / s.std()
            rapport["outliers"] = [{"fichier": r["fichier"], "score": float(v),
                                    "z": float(zz)}
                                   for r, v, zz in zip(file_, s, z) if zz < Z_OUTLIER]

    # Un critere sans seuil n'est ni tenu ni manque : il est INJUGEABLE, et le
    # dire est plus utile que de trancher.
    criteres = []
    n_min = seuils.get("n_min")
    criteres.append(_critere("nombre d'images", len(file_), n_min,
                             f"{len(file_)} image(s) dans la file"))
    div_min = seuils.get("diversite_min")
    eff = rapport["diversite"]["scene"]["effectives"]
    criteres.append(_critere("diversite de scenes", eff, div_min,
                             f"{eff:.1f} categorie(s) de scene effectives"))

    manquants = [c for c in criteres if c["verdict"] == "manque"]
    injugeables = [c for c in criteres if c["verdict"] == "sans seuil"]
    rapport["criteres"] = criteres
    rapport["pret"] = bool(criteres) and not manquants and not injugeables
    if manquants:
        rapport["blocage"] = " ; ".join(c["message"] for c in manquants)
    elif injugeables:
        noms = " et ".join(c["nom"] for c in injugeables)
        verbe = "n'a pas" if len(injugeables) == 1 else "n'ont pas"
        rapport["blocage"] = (
            f"rien ne manque, mais {noms} {verbe} de seuil dans le config.json "
            f"de ce personnage (bloc `entrainement`) : impossible de conclure")
    else:
        rapport["blocage"] = ""
    return rapport


def trigger_du_personnage(character_id, configuration, ecrire=True):
    """Le mot declencheur du personnage, cree s'il n'en a pas encore.

    DETERMINISTE et ECRIT UNE SEULE FOIS. Un declencheur deja choisi ne se
    reecrit jamais : il est grave dans le LoRA entraine avec lui, et le changer
    rendrait muet un LoRA qui marchait. On l'ecrit donc dans le config.json
    seulement s'il est absent, et on rend aussi ce qu'on a fait pour que
    l'outil puisse le dire a l'ecran.
    """
    lora = ((configuration or {}).get("identity") or {}).get("lora") or {}
    existant = (lora.get("trigger_word") or "").strip()
    if existant:
        return existant, False
    propose = legende.declencheur(character_id)
    if not ecrire:
        return propose, False
    import runner as lb
    chemin = lb.config_path(character_id)
    d = json.loads(Path(chemin).read_text(encoding="utf-8"))
    d.setdefault("identity", {}).setdefault("lora", {})["trigger_word"] = propose
    Path(chemin).write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
    return propose, True


def _anchor_du_personnage(character_id):
    """Le champ `anchor` de scenes.json — l'identite en toutes lettres."""
    try:
        import runner as lb
        return (lb.load_scenes(character_id) or {}).get("anchor") or ""
    except Exception:                                    # noqa: BLE001
        return ""


def _famille_du_personnage(character_id):
    """Famille de modele du PACK du personnage (`universe.json / model_family`).

    Jamais un `if character ==` (invariant 7) : la recette d'entrainement suit
    la famille, exactement comme la suivent deja les roles latent/guidance du
    runner. Un pack qu'on ne connait pas rend None, et l'export sort alors sans
    recette plutot qu'avec une fausse.
    """
    try:
        import runner as lb
        import universe
        return universe.model_family(lb.character_universe(character_id))
    except Exception:                                    # noqa: BLE001
        return None


def _ecrire_recette(dossier, famille, **champs):
    """`dataset.toml` + `entrainer.sh` a cote des images. Rend le script kohya
    ecrit, ou None si la famille est inconnue.

    LE JEU EXPORTE ETAIT COMPLET MAIS PAS EXECUTABLE. Il restait a retrouver la
    convention de dossier kohya, ecrire le TOML et reconstituer la ligne de
    commande de la famille — trois choses qu'on refait a chaque entrainement et
    qu'on rate une fois sur deux. Le dossier date devient l'unite qu'on envoie
    telle quelle sur une machine louee : les images, leurs legendes, le releve
    de ce qui les a choisies, et de quoi lancer.

    ON N'ENTRAINE PAS ICI, et c'est le cadrage du 09/09 qui le dit : l'atelier
    integre est l'etage 3, il attend le chiffre de l'etage 1.
    """
    recette = RECETTES.get(famille)
    if not recette:
        return None
    (dossier / "dataset.toml").write_bytes(
        DATASET_TOML.format(resolution=recette["resolution"], **champs)
        .encode("utf-8"))
    # write_bytes, jamais write_text : un .sh en CRLF ne demarre pas sous Linux,
    # et la machine d'entrainement en est une.
    (dossier / "entrainer.sh").write_bytes(RECETTE.format(
        script=recette["script"], module=recette["module"],
        modeles="".join(f"  {x} \\\n" for x in recette["modeles"]),
        specifique=" \\\n".join(f"  {x}" for x in recette["specifique"]),
        **champs).encode("utf-8"))
    return recette["script"]


def exporter(cx, character_id, configuration=None, quand=None, avec_vision=True,
             repetitions=None):
    """Rassemble le jeu d'entrainement dans un dossier date, avec son manifeste.

    LE PONT QUI MANQUAIT. La plateforme savait sur quoi entrainer ; il fallait
    encore ramasser les fichiers a la main, disperses entre les dossiers de
    tri. Cette fonction les copie et ECRIT CE QU'ELLE A FAIT — c'est la regle 11
    du mecanisme d'identite (cadrage du 09/09) : un entrainement doit etre
    reproductible, donc on garde la liste exacte, les scores, les etiquettes,
    la provenance de chaque image, et l'etat du gabarit au moment de l'export.
    Sans ce releve, comparer deux LoRA au banc ne voudrait rien dire : on ne
    saurait pas ce qui les separe.

    L'ANCRE EST COPIEE AVEC. Regle 7 du mecanisme : la base gelee et les
    candidats d'origine sont REINJECTES a chaque tour d'entrainement, jamais
    seulement au premier. C'est ce qui empeche la boucle auto-consommatrice de
    deriver (les sorties d'un LoRA v1 ne doivent pas devenir seules les donnees
    d'origine de v2). Elle est copiee dans le meme dossier et signalee comme
    telle dans le manifeste.

    ON COPIE, on ne lie pas : un lien symbolique demande des droits sur Windows,
    et un jeu d'entrainement qui pointe vers l'arbre de tri se briserait au
    premier reclassement. 75 Mo pour Lena, le prix est nul.

    Ne remplace jamais un export existant : le dossier porte la date et
    l'heure. Un entrainement passe est une piece d'historique.
    """
    r = proposition(cx, character_id, configuration)
    if r["jeu"] is None:
        return {**r, "exportes": [], "dossier": None}

    disque = fichiers_sur_disque(character_id)
    a_copier = [(x, disque[x["fichier"]]) for x in r["file"]
                if x["fichier"] in disque]
    if not a_copier:
        return {**r, "exportes": [], "dossier": None,
                "blocage": "aucune image de la file n'a de fichier sur le disque"}

    horodate = (quand or datetime.now()).strftime("%Y%m%d-%H%M%S")
    dossier = RACINE_EXPORT / character_id / horodate
    dossier.mkdir(parents=True, exist_ok=False)

    trigger, trigger_cree = trigger_du_personnage(character_id, configuration)
    # Convention kohya : <repetitions>_<mot declencheur>. `dataset/` isole les
    # images du manifeste et du script — kohya lit TOUS les sous-dossiers de
    # celui qu'on lui donne, et se plaindrait de ceux qui n'en sont pas un.
    repetitions_demandees = repetitions
    repetitions = int(repetitions or max(1, round(REPETITIONS_CIBLE / len(a_copier))))
    sous_dossier = f"dataset/{repetitions}_{trigger}"
    images = dossier / sous_dossier
    images.mkdir(parents=True)
    anchor = _anchor_du_personnage(character_id)
    legendes = {}

    def _legender(chemin, ligne, est_ancre=False):
        texte, source = legende.legender(
            chemin, ligne=ligne, anchor=anchor, trigger=trigger,
            avec_vision=avec_vision, est_ancre=est_ancre)
        if texte:
            # convention kohya : <nom>.txt a cote de <nom>.png
            (images / (chemin.stem + ".txt")).write_text(texte + "\n",
                                                         encoding="utf-8")
        legendes[chemin.name] = {"legende": texte, "source": source}

    for ligne, chemin in a_copier:
        shutil.copy2(chemin, images / chemin.name)
        _legender(images / chemin.name, ligne)

    ancre = None
    nom_ancre = (configuration or {}).get("base_gelee")
    if nom_ancre:
        import env_config
        src = env_config.comfyui_root() / "input" / nom_ancre
        if src.exists():
            shutil.copy2(src, images / src.name)
            ancre = src.name
            _legender(images / src.name, {}, est_ancre=True)

    famille = _famille_du_personnage(character_id)
    script_kohya = _ecrire_recette(
        dossier, famille, perso=character_id,
        date=(quand or datetime.now()).strftime("%d/%m/%Y"),
        n=len(a_copier) + (1 if ancre else 0), trigger=trigger,
        repetitions=repetitions, dossier_images=sous_dossier,
        sortie=f"{trigger}_v1")

    manifeste = {
        "personnage": character_id,
        "exporte_le": (quand or datetime.now()).isoformat(timespec="seconds"),
        "jeu_de_reference": {
            "id": r["jeu"]["id"], "sante": r["jeu"]["sante"],
            "cohesion": r["jeu"]["cohesion"],
            "modele_embedding": r["jeu"].get("modele"),
        },
        "seuils": {
            "portillon_identite": (configuration or {}).get("qc", {}).get(
                "threshold_gabarit"),
            "entrainement": (configuration or {}).get("entrainement") or {},
        },
        "ancre_reinjectee": ancre,
        "declencheur": trigger,
        "declencheur_cree": trigger_cree,
        "cohesion_de_la_file": r["cohesion"],
        "diversite": {a: {"distinctes": v["distinctes"],
                          "effectives": round(v["effectives"], 3),
                          "sans": v["sans"]}
                      for a, v in r["diversite"].items()},
        "images": [{
            "fichier": x["fichier"], "scene": x["scene"],
            "intention": x["intention"], "ton": x["ton"], "format": x["format"],
            "mains_juge": x["mains_juge"], "anatomie": x["anatomie"],
            # Provenance (regle 6) : une image DERIVED sort d'un LoRA du
            # personnage. Entrainer v2 dessus sans le savoir, c'est la boucle
            # autophage.
            "lora_identite": x["lora_identite"],
            # D'ou vient la legende : sans ce releve, on ne saurait pas des mois
            # plus tard laquelle des sources a produit quoi.
            "legende": legendes.get(x["fichier"], {}).get("legende", ""),
            "source_legende": legendes.get(x["fichier"], {}).get("source", ""),
        } for x, _ in a_copier],
        "legende_ancre": legendes.get(ancre, {}) if ancre else {},
        "non_exportees": {
            "sans_fichier": [x["fichier"] for x in r["sans_fichier"]],
            "defaut_objectif": [{"fichier": e["fichier"], "raison": e["raison"]}
                                for e in r["ecartes"]],
        },
        "criteres": r["criteres"],
        "pret": r["pret"],
        "blocage": r["blocage"],
        # De quoi refaire A L'IDENTIQUE l'entrainement qui a produit un LoRA,
        # des mois plus tard : la recette part avec le jeu, mais un dossier se
        # perd et le manifeste, lui, dit ce qui a ete prepare.
        "entrainement": {
            "famille": famille,
            "dossier_images": sous_dossier,
            "repetitions": repetitions,
            "repetitions_defaut": repetitions_demandees is None,
            "script": script_kohya,
        },
        "note": ("Le dossier est executable tel quel : `bash entrainer.sh` sur "
                 "une machine kohya (RunPod ou autre), chemins de modeles en "
                 "variables d'environnement. Le nombre de repetitions est un "
                 "DEFAUT propose pour que ca tourne, pas un arbitrage — "
                 "`--repetitions=N` le remplace."
                 if script_kohya else
                 f"Famille de modele inconnue ({famille!r}) : ni dataset.toml "
                 f"ni entrainer.sh n'ont ete ecrits. Le jeu et ses legendes "
                 f"sont complets, la recette d'entrainement est a faire a la "
                 f"main."),
    }
    (dossier / "manifeste.json").write_text(
        json.dumps(manifeste, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {**r, "exportes": [x["fichier"] for x, _ in a_copier],
            "dossier": dossier, "ancre_reinjectee": ancre,
            "declencheur": trigger, "declencheur_cree": trigger_cree,
            "legendes": legendes, "dossier_images": images, "famille": famille,
            "repetitions": repetitions, "script_kohya": script_kohya}


def _critere(nom, valeur, seuil, texte):
    if seuil is None:
        return {"nom": nom, "valeur": valeur, "seuil": None,
                "verdict": "sans seuil", "message": f"{texte}, aucun seuil configure"}
    if valeur >= seuil:
        return {"nom": nom, "valeur": valeur, "seuil": seuil, "verdict": "tenu",
                "message": f"{texte} (seuil {seuil})"}
    return {"nom": nom, "valeur": valeur, "seuil": seuil, "verdict": "manque",
            "message": f"{texte}, il en faut {seuil}"}


def _main(character_id, export=False, avec_vision=True, repetitions=None):
    """Un outil imprime, une bibliotheque logge (.claude/rules/backend.md)."""
    import runner as lb
    try:
        configuration = lb.load_config(character_id)
    except Exception as e:                                   # noqa: BLE001
        print(f"  config.json illisible pour {character_id!r} : {e}")
        configuration = {}
    with base.ouvrir() as cx:
        if export:
            r = exporter(cx, character_id, configuration,
                         avec_vision=avec_vision, repetitions=repetitions)
        else:
            r = proposition(cx, character_id, configuration)

    if r["jeu"] is None:
        print(f"  {r['blocage']}")
        return 1
    total = len(r["file"]) + len(r["ecartes"])
    print(f"  jeu de reference actif #{r['jeu']['id']} — {total} membre(s)\n")
    print(f"  FILE D'ENTRAINEMENT       : {len(r['file'])}")
    print(f"    dont jamais etiquetees  : {len(r['sans_etiquette'])}"
          + ("   (defaut objectif SUPPOSE, pas verifie)"
             if r["sans_etiquette"] else ""))
    print(f"    dont DERIVED            : {r['derives']}"
          + ("   (produites sous un LoRA du personnage)" if r["derives"] else ""))
    if r["sans_fichier"]:
        print(f"    SANS FICHIER sur disque : {len(r['sans_fichier'])}"
              f"   -> {len(r['file']) - len(r['sans_fichier'])} reellement "
              f"exportables")
        for x in r["sans_fichier"]:
            print(f"      {x['fichier']}")
    print(f"  ecartees (defaut objectif): {len(r['ecartes'])}")
    for axe in AXES_OBJECTIFS:
        n = sum(1 for e in r["ecartes"] if axe in e["raison"])
        if n:
            print(f"    {axe:22}: {n}")

    if r["cohesion"] is not None:
        print(f"\n  cohesion de la file       : {r['cohesion']:.4f} "
              f"(ecart-type {r['ecart_type']:.4f})")
        print(f"  outliers (z sous {Z_OUTLIER})    : {len(r['outliers'])}")
        for o in sorted(r["outliers"], key=lambda x: x["score"]):
            print(f"    {o['fichier'][:46]:48}{o['score']:.3f}  z={o['z']:+.2f}")

    print(f"\n  diversite (nombre EFFECTIF de categories, exp(entropie)) :")
    for axe, v in r["diversite"].items():
        sans = f"   {v['sans']} sans la donnee" if v["sans"] else ""
        print(f"    {axe:10} {v['distinctes']:>3} distinctes -> "
              f"{v['effectives']:>5.1f} effectives{sans}")

    print(f"\n  criteres :")
    for c in r["criteres"]:
        marque = {"tenu": "ok  ", "manque": "NON ", "sans seuil": "?   "}[c["verdict"]]
        print(f"    {marque} {c['message']}")
    print(f"\n  {'PROPOSITION D ENTRAINEMENT PRETE' if r['pret'] else 'PAS DE PROPOSITION'}")
    if r["blocage"]:
        print(f"    {r['blocage']}")

    if export:
        if not r.get("dossier"):
            print("\n  RIEN EXPORTE.")
            return 1
        print(f"\n  EXPORTE : {len(r['exportes'])} image(s)"
              + (f" + l'ancre ({r['ancre_reinjectee']})"
                 if r.get("ancre_reinjectee") else
                 "   /!\\ ancre NON reinjectee : elle est introuvable"))
        print(f"    {r['dossier']}")
        marque = "  (CREE et ecrit dans config.json)" if r.get("declencheur_cree") else ""
        print(f"\n  declencheur : {r.get('declencheur')}{marque}")
        par_source = Counter(v["source"] for v in (r.get("legendes") or {}).values())
        print(f"  legendes ({sum(par_source.values())} fichier(s) .txt) :")
        for src, n in par_source.most_common():
            print(f"    {n:>3}  {src}")
        print(f"    manifeste.json garde la liste exacte, les etiquettes, la")
        print(f"    provenance de chaque image et l'etat du gabarit — sans quoi")
        print(f"    comparer deux LoRA au banc ne voudrait rien dire.")
        if r.get("script_kohya"):
            defaut = ("  (DEFAUT propose, --repetitions=N pour le changer)"
                      if repetitions is None else "  (demande)")
            print(f"\n  repetitions : {r['repetitions']}{defaut}")
            print(f"  famille     : {r['famille']}  ->  {r['script_kohya']}")
            print(f"\n  Le dossier tourne tel quel sur une machine kohya : "
                  f"l'envoyer entier")
            print(f"  (RunPod ou autre), verifier les chemins en tete du "
                  f"script, puis")
            print(f"  « bash entrainer.sh ». Le LoRA sort dans output/.")
        else:
            print(f"\n  ATTENTION : famille de modele inconnue "
                  f"({r.get('famille')!r}) — ni dataset.toml")
            print(f"  ni entrainer.sh ecrits. Le jeu est complet, la recette "
                  f"d'entrainement")
            print(f"  est a faire a la main.")
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    rep = next((a.split("=", 1)[1] for a in sys.argv[1:]
                if a.startswith("--repetitions=")), None)
    sys.exit(_main(args[0].lower() if args else "lena",
                   export="--exporter" in sys.argv,
                   avec_vision="--sans-vision" not in sys.argv,
                   repetitions=int(rep) if rep else None))
