"""Expression du visage, appliquee APRES le controle d'identite.

POURQUOI APRES, ET PAS AVANT

La mesure d'identite n'est pas neutre vis-a-vis de l'expression. Mesure du
24/08/2026 sur la base gelee elle-meme, donc a identite rigoureusement constante :

    neutre (aller-retour a vide)   0.910
    sourire franc                  0.824
    rire                           0.627

Un rire tombe sous le seuil de surveillance sans qu'aucun trait n'ait change. Si
l'expression etait posee avant le QC, la bande 0.72-0.78 ne voudrait plus rien
dire et il faudrait la recalibrer sans savoir sur quoi.

L'ordre retenu regle le probleme sans rien recalibrer :

    1. le QC juge le visage NEUTRE      -> verdict, bande inchangee
    2. l'expression est posee ensuite   -> cosmetique
    3. on remesure, et ce second score est ENREGISTRE mais ne trie rien

Le second score sert a surveiller : si l'ecart se creuse anormalement sur une
serie, c'est que la deformation abime le visage, et ca se verra dans la revue.

POURQUOI CE MOYEN

Trois voies ont ete mesurees :

  - le PROMPT : aucune prise. 3 seeds x 4 formulations, l'ecart de largeur de
    bouche reste sous le plancher de la methode. PuLID verrouille l'expression en
    meme temps que l'identite, c'est structurel ;
  - DESSERRER PuLID : marche, mais `weight` est un precipice (0.85 -> 0.65 fait
    tomber l'identite de 0.734 a 0.576) et le seul point discutable, start_at
    0.25, donne un rendu que l'utilisateur juge visiblement genere ;
  - `ExpressionEditor` (LivePortrait, deja installe) : deterministe, 2 s, et un
    rendu juge satisfaisant. C'est cette voie.

Le cout d'identite du warp VARIE d'une image a l'autre — mesure entre -0.007 et
-0.046 pour un meme reglage sur deux sources. Raison de plus pour que le verdict
ne dependent pas de lui.

POURQUOI UN TRANSFERT DE MOUVEMENT (25/09/2026)

Le noeud ne pose pas une expression sur l'image : il REGENERE le recadrage du
visage (visage x crop_factor, cheveux compris) a 512 x 512, l'agrandit et le
recolle par un masque gabarit. Un aller-retour a vide, tous parametres a zero,
abimait deja autant qu'une expression : cheveux crepes, peau grenue, visage mou
(netteté 158 -> 123 sur la meme image). C'est ce que les selfies de Lena
montraient depuis que Produire imposait un ton a chaque image.

On ne garde donc du noeud que le MOUVEMENT. Deux appels — a vide, puis avec
l'expression — ont subi le meme reechantillonnage ; le flux optique entre les
deux sorties est l'expression seule, sans le dommage. Il est applique a
l'image d'origine, en pleine resolution. Seul ce qu'une deformation ne peut pas
creer (les dents d'une bouche qui s'ouvre) vient de la sortie du noeud.
Mesure : 5 seeds x 2 tons, texture de la source gardee 10/10 (la passe
directe en perdait 10/10), +2,7 s par image. Verdict :
DOCS/recherche/2026-09-25-l-expression-se-transfere-en-mouvement-pas-en-pixels.md
"""
import json
import random
import sys
import urllib.request
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import env_config  # noqa: E402

OFM = HERE.parent
COMFY = env_config.comfyui_root()
COMFY_INPUT = env_config.comfyui_input()
COMFY_OUTPUT = env_config.comfyui_output()

PREFIXE = "_LENA_EXPR_"          # copie temporaire dans ComfyUI/input

# Bornes du noeud. On refuse d'aller au-dela : les reglages forts donnent un
# rendu caoutchouteux autour de la bouche, et coutent 0.06 a 0.11 d'identite.
BORNES = {
    "smile": (-0.3, 1.3), "aaa": (-30, 120), "eee": (-20, 15), "woo": (-20, 15),
    "blink": (-20, 5), "wink": (0, 25), "eyebrow": (-10, 15),
    "pupil_x": (-15, 15), "pupil_y": (-15, 15),
    "rotate_pitch": (-20, 20), "rotate_yaw": (-20, 20), "rotate_roll": (-20, 20),
}
DEFAUTS = {k: 0.0 for k in BORNES}
DEFAUTS.update({"src_ratio": 1.0, "sample_ratio": 1.0, "crop_factor": 2.0})
NEUTRE = {k: 0.0 for k in BORNES}

# Reglages du transfert de mouvement : des constantes de METHODE, comme BORNES,
# pas un gout ni un reglage de personnage. Fixes au banc du 25/09 (verdict cite
# en tete) : c'est avec eux que la texture a ete gardee sur 10 paires sur 10.
# Flux de Farneback : pyr_scale, levels, winsize, iterations, poly_n, poly_sigma.
FLUX = (0.5, 5, 21, 5, 7, 1.5)
# Ce que la deformation ne peut pas creer : ecart (sur 255, moyenne des trois
# canaux) entre la sortie expressive et la sortie neutre deformee de la meme
# facon. Au-dessous, c'est le bruit commun du reechantillonnage.
RECOLLAGE_SEUIL = 14
RECOLLAGE_OUVERTURE = 5       # retire les points isoles (px)
RECOLLAGE_DILATATION = 11     # deborde un peu autour des dents (px)
RECOLLAGE_FONDU = 5           # sigma du fondu du masque (px)


def tirage(creative, ton, seed):
    """Parametres d'expression pour un ton, tires dans sa plage.

    Semes par le seed du job : reproductible, et deux images du meme ton n'ont
    pas la meme mine. Une expression figee par ton remplacerait une expression
    figee par cinq — ce ne serait pas une variation.

    Retourne {} si le ton ne declare pas d'expression : rien n'est applique.
    """
    t = next((x for x in creative.get("tones", []) if x.get("key") == ton), None)
    plages = (t or {}).get("expression") or {}
    if not plages:
        return {}
    rng = random.Random(seed)
    out = {}
    for cle, plage in plages.items():
        if cle not in BORNES:
            continue
        lo, hi = (plage if isinstance(plage, (list, tuple)) else (plage, plage))
        bl, bh = BORNES[cle]
        out[cle] = round(max(bl, min(bh, rng.uniform(float(lo), float(hi)))), 3)
    return out


def _graphe(nom_entree, params, prefixe_sortie):
    inputs = dict(DEFAUTS, src_image=["1", 0])
    inputs.update({k: float(v) for k, v in params.items() if k in BORNES})
    return {
        "1": {"class_type": "LoadImage", "inputs": {"image": nom_entree}},
        "2": {"class_type": "ExpressionEditor", "inputs": inputs},
        "3": {"class_type": "SaveImage",
              "inputs": {"images": ["2", 0], "filename_prefix": prefixe_sortie}},
    }


class RenderError(RuntimeError):
    """L'appel ComfyUI a echoue. Jamais leve par `appliquer` (qui avale et
    rend False — un echec de production ne doit pas faire perdre une image
    deja produite et deja jugee) ; leve par `apercu`, ou l'utilisateur attend
    un retour explicite d'un clic (frontend.md : jamais un echec silencieux)."""


def _generer(nom_entree, params, comfy_url, timeout):
    """Soumet le graphe, attend, rend le Path du fichier de sortie ComfyUI —
    jamais deplace ni supprime ici, c'est a l'appelant d'en decider (production
    l'ecrase sur l'original, l'apercu le lit puis le jette)."""
    import runner as lb
    graphe = _graphe(nom_entree, params, "_LENA_EXPR/e")
    req = urllib.request.Request(
        comfy_url.rstrip("/") + "/prompt",
        data=json.dumps({"prompt": graphe, "client_id": "lena_expr"}).encode(),
        headers={"Content-Type": "application/json"})
    pid = json.load(urllib.request.urlopen(req, timeout=60))["prompt_id"]
    images, err, _ = lb.wait_prompt(comfy_url, pid, timeout)
    if err or not images:
        raise RenderError(err or "ComfyUI n'a rendu aucune image")
    return COMFY_OUTPUT / images[0].get("subfolder", "") / images[0]["filename"]


def _nettoyer_scratch():
    # Namespace de scratch dans ComfyUI/output, sans rapport avec l'emplacement
    # du repo (avant J1 "OFM" designait le repo lui-meme, colocalise ici ; ce
    # n'est plus le cas depuis le fork, d'ou PREFIXE plutot que ce nom).
    d = COMFY_OUTPUT / "_LENA_EXPR"
    if d.exists() and not any(d.iterdir()):
        d.rmdir()


def transferer_mouvement(source, neutre, expressive):
    """Pose sur `source` le mouvement qui separe `neutre` de `expressive`.

    Trois images BGR de meme taille : l'original, et les deux sorties du noeud
    — a vide, puis avec l'expression. Rend (image, part_recollee) : l'image
    composee, et la part de l'image (0..1) prise dans `expressive` parce qu'une
    deformation ne pouvait pas la creer. Fonction pure, sans ComfyUI : c'est ce
    qui la rend testable sur des images synthetiques.
    """
    import cv2
    import numpy as np
    gris = lambda im: cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    flux = cv2.calcOpticalFlowFarneback(gris(expressive), gris(neutre), None, *FLUX, 0)
    h, w = source.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    carte_x, carte_y = gx + flux[..., 0], gy + flux[..., 1]
    deformee = cv2.remap(source, carte_x, carte_y, cv2.INTER_CUBIC,
                         borderMode=cv2.BORDER_REFLECT)
    # Le neutre deforme de la meme facon porte le meme dommage de
    # reechantillonnage que l'expressive : ce qui les separe encore est ce que
    # le mouvement n'explique pas.
    neutre_def = cv2.remap(neutre, carte_x, carte_y, cv2.INTER_CUBIC,
                           borderMode=cv2.BORDER_REFLECT)
    residu = np.abs(neutre_def.astype(np.float32) - expressive.astype(np.float32)).mean(axis=2)
    masque = (residu > RECOLLAGE_SEUIL).astype(np.uint8) * 255
    masque = cv2.morphologyEx(masque, cv2.MORPH_OPEN,
                              np.ones((RECOLLAGE_OUVERTURE,) * 2, np.uint8))
    masque = cv2.dilate(masque, np.ones((RECOLLAGE_DILATATION,) * 2, np.uint8))
    masque = cv2.GaussianBlur(masque, (0, 0), RECOLLAGE_FONDU).astype(np.float32)[..., None] / 255
    image = deformee.astype(np.float32) * (1 - masque) + expressive.astype(np.float32) * masque
    return np.clip(np.rint(image), 0, 255).astype(np.uint8), float(masque.mean())


def _poser(path, params, comfy_url, timeout):
    """Le coeur partage par la production et l'apercu : deux appels du noeud
    (a vide, puis avec `params`), puis le transfert de mouvement sur l'image
    d'origine. Rend l'image composee (tableau BGR). Leve sur un echec.

    UN NOM D'ENTREE UNIQUE PAR APPEL : ComfyUI met en cache un graphe deja vu et
    renvoie le fichier qu'il a produit la premiere fois — fichier que le
    `finally` ci-dessous vient de supprimer (piege trouve dans l'apercu, voir
    sa docstring). L'appel neutre est le meme graphe pour toutes les images :
    sans suffixe, il tomberait dessus des la deuxieme.
    """
    import shutil
    import cv2
    path = Path(path)
    temporaires = []
    try:
        sorties = []
        for jeu in (NEUTRE, params):
            tmp = COMFY_INPUT / f"{PREFIXE}{uuid.uuid4().hex[:8]}_{path.name}"
            temporaires.append(tmp)
            shutil.copy(path, tmp)
            sortie = _generer(tmp.name, jeu, comfy_url, timeout)
            temporaires.append(sortie)
            sorties.append(cv2.imread(str(sortie)))
        source = cv2.imread(str(path))
        if source is None or any(s is None for s in sorties):
            raise RenderError("image illisible avant ou apres le noeud d'expression")
        image, _ = transferer_mouvement(source, *sorties)
        return image
    finally:
        for f in temporaires:
            Path(f).unlink(missing_ok=True)
        _nettoyer_scratch()


def appliquer(path, params, comfy_url, timeout=300):
    """Pose l'expression sur une image, en place. Retourne True si c'est fait.

    Ne leve jamais : une expression ratee ne doit pas faire perdre une image deja
    produite et deja jugee. L'appelant journalise.
    """
    import cv2
    path = Path(path)
    if not params:
        return False
    try:
        return bool(cv2.imwrite(str(path), _poser(path, params, comfy_url, timeout)))
    except Exception:
        return False


def apercu(path, params, comfy_url, mesurer=None, timeout=300):
    """Rend l'expression SANS jamais toucher `path` — pour la previsualisation
    interactive de l'editeur d'expression.

    Contrairement a `appliquer`, LEVE (`RenderError`) sur un echec du rendu :
    l'utilisateur attend un retour explicite d'un clic, pas un silence.

    Retourne (octets_png, score_apres). `score_apres` est None si `mesurer`
    est absent, ou s'il echoue (aucun visage detecte n'est deja rendu comme
    None par IdentityChecker.mesure — une exception de mesure ne doit pas
    faire perdre l'image, juste le score qui l'accompagne).

    NOM D'ENTREE UNIQUE A CHAQUE APPEL — trouve en testant l'editeur, pas en
    relisant le code : cliquer deux fois « Rendre l'apercu » SANS changer un
    seul parametre echouait a coup sur (4/4). ComfyUI met en cache le graphe
    (meme image d'entree, memes reglages) et renvoie le nom du fichier deja
    genere au premier appel — sauf que ce fichier vient d'etre supprime. Un
    suffixe different a chaque appel fait du LoadImage un noeud « neuf » aux
    yeux du cache. Depuis le 25/09 c'est `_poser` qui le pose, pour la
    production aussi : son appel neutre est le meme graphe pour toutes les
    images, il y tomberait des la deuxieme.
    """
    import cv2
    path = Path(path)
    try:
        image = _poser(path, params, comfy_url, timeout)
    except RenderError:
        raise
    except Exception as e:
        raise RenderError(str(e)) from e
    ok, png = cv2.imencode(".png", image)
    if not ok:
        raise RenderError("encodage PNG de l'apercu impossible")
    # Le score se mesure sur l'image COMPOSEE, celle que l'utilisateur voit et
    # que la production ecrirait — jamais sur la sortie brute du noeud.
    score = None
    if mesurer:
        mesure = COMFY_OUTPUT / f"{PREFIXE}apercu_{uuid.uuid4().hex[:8]}.png"
        try:
            mesure.write_bytes(png.tobytes())
            score = mesurer(mesure)
        except Exception:
            score = None
        finally:
            mesure.unlink(missing_ok=True)
    return png.tobytes(), score


def attenuer(params, facteur):
    """Meme expression, moins appuyee."""
    return {k: round(v * facteur, 3) for k, v in params.items()}


def poser_sous_budget(path, params, comfy_url, mesurer, avant, budget,
                      journal=None):
    """Pose l'expression sans depasser un budget d'identite.

    POURQUOI UNE BOUCLE PLUTOT QU'UN REGLAGE PLUS SAGE. Le cout du warp varie
    fortement d'une image a l'autre : le meme sourire leger a coute -0.007 sur une
    source et -0.046 sur une autre, et un tirage « joueur » a coute -0.105 la ou
    un reglage plus fort en avait coute -0.013 ailleurs. Aucune plage fixe ne peut
    donc garantir le cout. On mesure, et on recule si c'est trop cher.

    Trois essais au plus : plein, puis moitie, puis rien. Retourne
    (params_retenus, score_apres) — ({}, avant) si tout a ete refuse.

    `mesurer(path)` doit rendre le score d'identite, ou None.
    """
    import shutil
    path = Path(path)
    if not params or avant is None:
        return ({}, avant) if not (params and avant is None) else (
            (params, None) if appliquer(path, params, comfy_url) else ({}, None))

    sauvegarde = path.with_suffix(".avant_expr" + path.suffix)
    shutil.copy(path, sauvegarde)
    try:
        for facteur in (1.0, 0.5):
            essai = params if facteur == 1.0 else attenuer(params, facteur)
            if not appliquer(path, essai, comfy_url):
                shutil.copy(sauvegarde, path)
                return {}, avant
            apres = mesurer(path)
            if apres is not None and (avant - apres) <= budget:
                return essai, apres
            if journal:
                journal(f"expression trop couteuse a {facteur:g}x "
                        f"({avant:.3f} -> {apres:.3f}, budget {budget:g})")
            shutil.copy(sauvegarde, path)      # on repart du visage d'origine
        return {}, avant
    finally:
        sauvegarde.unlink(missing_ok=True)


def resume(params):
    """Forme courte pour le journal technique."""
    return " ".join(f"{k}={v:g}" for k, v in sorted(params.items())) or "aucune"
