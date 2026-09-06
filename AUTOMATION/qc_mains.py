"""QC des mains : taux de detection DWPose applique a une image de
PRODUCTION finie, pas a la photo de reference habituelle de la banque de
poses. Repond a la sous-question P4.3 laissee ouverte par
DOCS/cadrage/2026-09-06-phase-4-qualite-workflows-mains.md ; la metrique
elle-meme est cadree dans DOCS/cadrage/2026-09-07-p4-3-metrique-mains.md
(a lire avant de toucher ce fichier — ce module n'en est que l'application).

CHOIX DOCUMENTE — reutilisation du graphe existant. Ce module soumet
WORKFLOWS/utils/pose_extract_ui.json (deja utilise par pose_tools.py pour
la banque de poses) plutot que d'ecrire un graphe dedie dans
WORKFLOWS/platform/. Ce graphe ne fait rien de specifique a une photo de
reference : LoadImage generique -> DWPreprocessor (corps + mains, sans
visage) -> JSON de points-cles. Le repointer sur une image de production
ne change ni son comportement ni ses reglages ; l'extraire dans un
deuxieme fichier aurait ete une duplication sans raison. La capacite de
plateforme "hands" (PLATFORM/capabilities.json, ADR-0018) porte ce meme
graphe.

CHOIX DOCUMENTE — chemin d'execution. Jamais d'import direct de la
librairie DWPose vendorisee dans comfyui_controlnet_aux : ComfyUI reste
un process separe (ADR-0024), ce module ne lui parle que par les memes
primitives HTTP partagees que pose_tools.py (`runner.queue_prompt` /
`wait_prompt`) — pas un troisieme mecanisme de dialogue avec ComfyUI, et
pas un `WorkflowRunner` complet non plus : cette mesure s'execute comme
un appel Python ordinaire A L'INTERIEUR de la boucle `execute_jobs`
(meme position que qc_realisme.mesure), pas comme un type de job
alternatif substituable.

CHOIX DOCUMENTE — collision de scratch evitee. pose_tools.py repere son
JSON par "fichier le plus recent" dans le dossier scratch — correct pour
un usage interactif un par un, dangereux si l'editeur de pose ET une
mesure qc_mains tournent en meme temps. Ce module patche un
`filename_prefix` unique (uuid) sur le noeud de sauvegarde et va lire CE
fichier par son prefixe exact, jamais "le plus recent".

LIMITE CONNUE, VERIFIEE EMPIRIQUEMENT (pas theorique) sur les 3 images
reelles de test_qc_mains.py [2] : le gating par poignet distingue bien
"aucun bras dans le cadre" (portrait resserre) de "une main devrait etre
visible", mais ne distingue PAS une main coupee net au poignet (score bas
legitime, cause = cadrage) d'une main reellement mal rendue au meme
score. Et a l'inverse, DWPose peut ajuster un squelette 21 points a
pleine confiance sur une main qu'un oeil humain juge deformee — le
detecteur valide une topologie plausible, jamais l'anatomie pixel par
pixel. Le verdict CASSE dit donc « quelque chose ici merite un coup
d'oeil », pas « main anatomiquement fausse, certifie » — coherent avec
PROJET.md (mesure et informe, n'arbitre pas), mais a ne pas sur-vendre
dans l'affichage Revue (etape 5).
"""
import sys
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import env_config          # noqa: E402
import runner as lb        # noqa: E402
import ui_to_api           # noqa: E402

OFM = HERE.parent
COMFY_INPUT = env_config.comfyui_input()
COMFY_OUTPUT = env_config.comfyui_output()
EXTRACT_WF = OFM / "WORKFLOWS" / "utils" / "pose_extract_ui.json"
KPS_SCRATCH = COMFY_OUTPUT / "_LENA_POSE"

N_POINTS_MAIN = 21

# Index des poignets dans pose_keypoints_2d, disposition OpenPose-18 de
# DWPose (meme reference que BODY_PART_INDEXES dans
# comfyui_controlnet_aux/node_wrappers/pose_keypoint_postprocess.py,
# installe sur ce poste) : 0 nez, 1 cou, 2 epaule D, 3 coude D, 4 poignet D,
# 5 epaule G, 6 coude G, 7 poignet G. A reverifier contre une sortie reelle
# si DWPose change un jour de disposition corporelle (25 points type
# BODY_25 au lieu de 18) — pas suppose au-dela de ce que ce graphe produit
# aujourd'hui (detect_body=enable, disposition 18 points).
IDX_POIGNET_DROIT = 4
IDX_POIGNET_GAUCHE = 7

SANS_MAIN = "SANS_MAIN"
OK = "OK"
SUSPECT = "SUSPECT"
CASSE = "CASSE"


def _point(flat, i):
    """(x, y, c) du i-eme point d'une liste plate [x,y,c,...], ou None si
    la liste est absente ou trop courte pour contenir ce point."""
    if not flat or len(flat) < (i + 1) * 3:
        return None
    return flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]


def _detecte(flat, i):
    p = _point(flat, i)
    return bool(p and p[2] > 0)


def _taux_detection(hand_flat):
    """Fraction des 21 points de la main avec confiance > 0 (jamais une
    valeur intermediaire : DWPose seuille deja en interne, voir le
    cadrage). None si la main n'a produit aucune donnee."""
    if not hand_flat:
        return None
    detectes = sum(1 for i in range(N_POINTS_MAIN) if _detecte(hand_flat, i))
    return detectes / N_POINTS_MAIN


def metrique(people_entry):
    """Score de detection des mains a partir d'UNE entree people[] deja
    extraite par DWPreprocessor. Pure : aucun appel a ComfyUI, testable
    avec un dict fabrique a la main.

    Une main n'est evaluee que si son poignet (pose_keypoints_2d, meme
    appel DWPose) est detecte — sinon elle est hors-champ, exclue plutot
    que comptee cassee (voir cadrage, cas limite "image sans main
    visible"). Score = minimum des mains evaluees, `None` si aucune ne
    l'est.
    """
    corps = people_entry.get("pose_keypoints_2d")
    mains = []
    if _detecte(corps, IDX_POIGNET_DROIT):
        t = _taux_detection(people_entry.get("hand_right_keypoints_2d"))
        if t is not None:
            mains.append(t)
    if _detecte(corps, IDX_POIGNET_GAUCHE):
        t = _taux_detection(people_entry.get("hand_left_keypoints_2d"))
        if t is not None:
            mains.append(t)
    if not mains:
        return {"score": None, "mains_evaluees": 0}
    return {"score": min(mains), "mains_evaluees": len(mains)}


def verdict(score, threshold_ok, threshold_watch):
    if score is None:
        return SANS_MAIN
    if score >= threshold_ok:
        return OK
    if score >= threshold_watch:
        return SUSPECT
    return CASSE


def mesure(path, comfy_url, threshold_ok=1.0, threshold_watch=0.7, timeout=180):
    """Score + verdict des mains pour l'image `path`. Ne leve jamais :
    toute erreur (ComfyUI injoignable, graphe change de forme...) rend un
    score `None`, meme discipline defensive que qc_realisme.mesure."""
    try:
        return _mesure(path, comfy_url, threshold_ok, threshold_watch, timeout)
    except Exception as e:
        lb.log(f"   mesure des mains impossible : {type(e).__name__} — {e}")
        return {"score": None, "verdict": None, "mains_evaluees": 0}


def _mesure(path, comfy_url, threshold_ok, threshold_watch, timeout):
    path = Path(path)
    COMFY_INPUT.mkdir(parents=True, exist_ok=True)
    tmp_name = f"_QC_MAINS_{uuid.uuid4().hex[:12]}{path.suffix.lower() or '.png'}"
    tmp_path = COMFY_INPUT / tmp_name
    tmp_path.write_bytes(path.read_bytes())
    prefix_unique = f"_LENA_POSE/qc_mains_{uuid.uuid4().hex[:12]}"
    try:
        ui = lb.load_json(EXTRACT_WF)
        obj = ui_to_api.fetch_object_info(comfy_url)
        api = ui_to_api.convert(ui, obj)

        source = ui_to_api.find_node(ui, "LoadImage", "PHOTO SOURCE")
        api[str(source["id"])]["inputs"]["image"] = tmp_name
        kps_node = ui_to_api.find_node(ui, "SavePoseKpsAsJsonFile", "Points-cles JSON")
        api[str(kps_node["id"])]["inputs"]["filename_prefix"] = prefix_unique

        pid, err = lb.queue_prompt(comfy_url, api, client_id="qc_mains")
        if err:
            raise RuntimeError(f"refuse par ComfyUI : {err}")
        _, err, _ = lb.wait_prompt(comfy_url, pid, timeout=timeout)
        if err:
            raise RuntimeError(err)

        fichiers = sorted(KPS_SCRATCH.glob(f"{Path(prefix_unique).name}*.json"))
        if not fichiers:
            raise RuntimeError(
                "aucun fichier de points-cles produit — pose_extract_ui.json "
                "a-t-il change de forme ?")
        frame = lb.load_json(fichiers[0])[0]
        for f in fichiers:
            f.unlink(missing_ok=True)

        people = frame.get("people") or []
        if not people:
            return {"score": None, "verdict": SANS_MAIN, "mains_evaluees": 0}
        r = metrique(people[0])
        r["verdict"] = verdict(r["score"], threshold_ok, threshold_watch)
        return r
    finally:
        tmp_path.unlink(missing_ok=True)
