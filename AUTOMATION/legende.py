# -*- coding: utf-8 -*-
"""La legende d'une image de jeu d'entrainement, pour un LoRA d'IDENTITE.

LA REGLE DU METIER, ET ELLE EST CONTRE-INTUITIVE : on legende le decor, la
pose, le cadrage et la lumiere -- JAMAIS les cheveux, les yeux, la forme du
visage. Ce qui n'est PAS ecrit est ce que le modele apprend a associer au mot
declencheur ; ce qui est ecrit reste variable au moment de generer. Legender le
visage apprendrait au LoRA a dependre de la description plutot que du jeton.

LE DEPOT SEPARE DEJA CES DEUX MOITIES, et c'est ce qui rend ce module court.
`scenes.json` porte un champ `anchor` -- l'identite, en toutes lettres -- et
`assert_no_face` (invariant 6) garantit qu'aucun fragment de scene ne decrit le
visage. La legende de base est donc `prompt.replace(anchor, declencheur)` : une
SUBSTITUTION EXACTE, verifiee le 10/09 sur 22 prompts sur 22, qui ne laisse
aucun terme de `FORBIDDEN_FACE` derriere elle. Le jeton occupe precisement le
creneau que l'identite occupait.

QUATRE SOURCES, DANS CET ORDRE DE CONFIANCE :

  1. `prompt`   -- la substitution exacte. 22 images sur 24 chez Lena.
  2. `vision`   -- Florence-2 (installe, au manifeste) pour celles qui n'ont
                   aucun prompt en base. Mesure le 10/09 : 2 a 6 s, aucun refus,
                   style narratif et quelques erreurs de lecture, mais c'est la
                   SEULE source quand le prompt manque.
  3. `metadonnees` -- scene / intention / ton, depuis la base. Jamais vide,
                   jamais fautif : le dernier filet.
  4. `ancre`    -- l'image de reference reinjectee ne se fait jamais legender :
                   sa legende est le declencheur et un cadrage neutre. Mesure du
                   10/09 : sur ce portrait serre, Florence-2 decrit le visage
                   en detail ET invente des yeux bleus la ou Lena les a verts.

CE QUI N'EST PAS LA, ET POURQUOI. Une REFORMULATION par LLM etait prevue au
cadrage. Mesuree le 10/09 sur `qwen3vl_4b_fp8_scaled` via le noeud
`TextGenerate` -- le chemin qu'utilise deja `compose.py` -- elle n'est pas
pilotable : cinq formulations essayees, et le modele repond par un refus
explicite, un commentaire de la consigne, un echo de l'instruction, ou rien du
tout (sortie vide en 1 s des que la consigne mentionne la personne). Ce n'est
pas un modele de conversation, c'est un encodeur de texte servi par un noeud
qui n'est pas fait pour suivre des instructions. Ecrit dans le cadrage plutot
que contourne en silence.

Cadrage : DOCS/cadrage/2026-09-10-legendage-du-jeu-d-entrainement.md
"""
import hashlib
import re
import shutil
import sys
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import llm_local                                              # noqa: E402

# Legendeur d'image. Choisi parce qu'il est DEJA installe et declare au
# manifeste, et parce qu'il ne suit aucune instruction : il decrit, point --
# donc aucun des modes d'echec d'un modele de conversation.
# PromptGen v2.0 depuis le 2026-09-10, mesure contre Florence-2-Flux-Large sur
# les memes images : la ou l'ancien voyait « a woman sitting on a stool »,
# celui-ci lit « sitting at a wooden table in an outdoor cafe, wearing a beige
# knitted cardigan over a white shirt and blue jeans » -- et le prompt d'origine
# lui donne raison. MIT, 0,8B, ~1 Go de VRAM, 2 a 3 s a chaud. Le nom suffit :
# le noeud installe telecharge la variante tout seul.
FLORENCE_MODELE = "MiaoshouAI/Florence-2-large-PromptGen-v2.0"
FLORENCE_TACHE = "detailed_caption"

# Mots de liaison auxquels une clause fautive s'accrochait. Voir
# `sans_clause_de_visage`.
_LIAISON = re.compile(r"\b(with|and|or|of|in|on|at|wearing|having)\b", re.I)

# La legende de l'ancre : le declencheur et le strict minimum. Elle ne varie
# pas d'un personnage a l'autre parce qu'elle ne decrit rien de personnel.
LEGENDE_ANCRE = "portrait, plain background, soft frontal light, neutral expression"

# Florence-2 raconte (« In this image we can see a woman standing. We can also
# see... ») la ou une legende d'entrainement veut des descripteurs. Ces tournures
# sont son gabarit, pas de l'information : les retirer rapproche sa sortie de la
# forme des autres legendes du jeu, et la constance de forme est ce que la
# pratique demande le plus fermement.
_NARRATION = re.compile(
    r"\b(in (this|the) (image|picture|photo)( we can see| there (is|are))?|"
    r"we can (also )?see( some| a)?|on the (back ?side|left|right)( side)?"
    r"( of the (image|picture))?( we can( see)?)?|at the (top|bottom)"
    r"( portion| side)?( of the (image|picture))?( there (is|are))?|"
    r"in the background( of the (image|picture))?( there (is|are))?|"
    r"there (is|are)( some| a)?|to the (left|right) side( of the image)?)\b",
    re.I)


def declencheur(character_id):
    """Mot declencheur DETERMINISTE d'un personnage.

    Il doit etre unique et ne collider avec aucun mot reel : un jeton qui existe
    deja dans le vocabulaire du modele porte du sens qu'on ne veut pas. D'ou le
    suffixe d'empreinte -- « lena » seul serait un prenom, « lenadaab » n'est
    rien. Meme forme que l'existant : Abyssiaelle utilise `abyss1a`.

    Deterministe pour qu'un meme personnage retrouve toujours son jeton, y
    compris si personne ne l'a encore ecrit dans son config.json.
    """
    cid = re.sub(r"[^a-z0-9]", "", (character_id or "").lower()) or "perso"
    return f"{cid[:6]}{hashlib.sha1(cid.encode()).hexdigest()[:4]}"


def base(prompt, anchor, trigger):
    """La legende exacte : l'ancre d'identite remplacee par le declencheur.

    SUBSTITUTION et non suppression : le prefixe du prompt (« raw, unedited
    photo of ») attend un sujet, et le supprimer laisserait « photo of ,
    sitting on... ». Le jeton prend la place du sujet, ce qui est exactement le
    role qu'on veut lui apprendre.

    Rend None si l'ancre n'est pas dans le prompt : on ne devine pas ou elle
    s'arrete, et une legende approximative vaut moins qu'une autre source.
    """
    prompt = (prompt or "").strip()
    anchor = (anchor or "").strip()
    if not prompt or not anchor or anchor not in prompt:
        return None
    return _propre(prompt.replace(anchor, trigger))


def _sans_narration(texte):
    """Retire les tournures de recit de Florence-2, garde les descripteurs."""
    t = _NARRATION.sub(",", texte or "")
    t = re.sub(r"\bcolor\b", "", t, flags=re.I)          # « white color wall »
    t = t.replace(".", ",")
    return t.lower()


def _propre(texte):
    texte = " ".join((texte or "").split())
    texte = re.sub(r"^(assistant|system|user)\s*[:\-]?\s*", "", texte, flags=re.I)
    texte = re.sub(r"\s*,\s*(,\s*)+", ", ", texte)
    return texte.strip(" ,.\n\"'")


def terme_de_visage(texte):
    """Le terme de visage trouve dans la legende, ou None.

    Meme garde que `compose.py` applique a ses propositions de scenes, et pour
    la meme raison. Rend le TERME et pas un booleen : quand une legende est
    refusee, savoir quel mot l'a fait tomber est ce qui permet de corriger
    plutot que de hausser les epaules.
    """
    try:
        import runner
        m = runner.FORBIDDEN_FACE.search(texte or "")
    except Exception:                                    # noqa: BLE001
        return None
    return m.group(0) if m else None


def sans_clause_de_visage(texte):
    """Retire les CLAUSES qui decrivent le visage, garde tout le reste.

    REFUSER LA LEGENDE ENTIERE ETAIT LE MAUVAIS GESTE, et ca s'est vu en
    changeant de legendeur (10/09). Un meilleur modele decrit PLUS, donc il
    heurte PLUS souvent le vocabulaire interdit : PromptGen rend « a young woman
    with long brown hair and freckles, sitting at a wooden table in an outdoor
    cafe, wearing a beige knitted cardigan... » -- une seule clause fautive, et
    l'ancien garde-fou jetait la table, le cafe et le cardigan avec.

    On decoupe donc en clauses, on retire celles qui portent un terme de
    `FORBIDDEN_FACE`, et on garde le reste.

    LA REPARATION DU MOIGNON. Une clause fautive est souvent la SUITE de la
    precedente : « ...a young woman with long, / wavy brown hair and freckles, /
    sitting on a bed ». Retirer la deuxieme laisse « a young woman with long »,
    qui ne veut plus rien dire. Quand la clause suivante est retiree, on coupe
    donc la precedente a son dernier mot de liaison -- mais seulement s'il n'est
    suivi que d'un mot, sinon on amputerait une clause complete
    (« ...a white shirt and blue jeans » doit rester entier).

    ponytail: heuristique de ponctuation, pas d'analyse grammaticale. Elle tient
    parce que ces legendeurs ecrivent tous la meme phrase (sujet, puis scene) ;
    un modele qui structurerait autrement demanderait autre chose.
    """
    morceaux = [m.strip() for m in re.split(r"\s*[,;.]\s*", texte or "")]
    morceaux = [m for m in morceaux if m]
    gardes = []
    for m in morceaux:
        if terme_de_visage(m):
            # On remonte TANT QUE la clause precedente est un moignon : une
            # description de visage s'etale souvent sur plusieurs clauses
            # (« with long, / straight, / brown hair and freckles »), et ne
            # reparer que la derniere laissait « with long, straight, ».
            while gardes:
                gardes[-1] = _coupe_au_mot_de_liaison(gardes[-1])
                if gardes[-1] and not _est_moignon(gardes[-1]):
                    break
                gardes.pop()
            continue
        gardes.append(m)
    return _propre(", ".join(g for g in gardes if g))


def _est_moignon(clause):
    """Une clause qui ne dit plus rien seule : trop courte, ou en suspens."""
    mots = clause.split()
    return len(mots) <= 2 or bool(_LIAISON.fullmatch(mots[-1]))


def _coupe_au_mot_de_liaison(clause, mots_max=1):
    """Tronque la clause a son dernier mot de liaison s'il pend en fin."""
    mots = clause.split()
    for i in range(len(mots) - 1, -1, -1):
        if _LIAISON.fullmatch(mots[i]):
            return " ".join(mots[:i]) if len(mots) - i - 1 <= mots_max else clause
    return clause


def _graphe_florence(nom_image, max_new_tokens=256):
    return {
        "1": {"class_type": "DownloadAndLoadFlorence2Model",
              "inputs": {"model": FLORENCE_MODELE, "precision": "fp16"}},
        "2": {"class_type": "LoadImage", "inputs": {"image": nom_image}},
        "3": {"class_type": "Florence2Run",
              "inputs": {"image": ["2", 0], "florence2_model": ["1", 0],
                         "text_input": "", "task": FLORENCE_TACHE,
                         "fill_mask": False, "keep_model_loaded": True,
                         "max_new_tokens": int(max_new_tokens), "num_beams": 3,
                         "do_sample": False, "seed": 1}},
        # sortie 2 de Florence2Run = `caption` (image, mask, caption, data)
        "4": {"class_type": "PreviewAny", "inputs": {"source": ["3", 2]}},
    }


def vision(image, comfy_url=None, timeout=300):
    """Legende produite par Florence-2 en regardant l'image. '' si echec.

    Ne leve jamais : un legendeur muet ne doit pas faire perdre un jeu
    d'entrainement, l'appelant retombe sur les metadonnees.
    """
    image = Path(image)
    if not image.is_file():
        return ""
    llm_local.COMFY_INPUT.mkdir(parents=True, exist_ok=True)
    tmp = llm_local.COMFY_INPUT / f"{llm_local.PREFIXE}{uuid.uuid4().hex[:8]}_{image.name}"
    ancienne = llm_local.SORTIE
    try:
        shutil.copy(image, tmp)
        llm_local.SORTIE = "4"
        brut = llm_local._soumettre(
            _graphe_florence(tmp.name),
            (comfy_url or llm_local.env_config.comfy_url()).rstrip("/"),
            timeout, "soulglade_legende")
        return _propre(_sans_narration(brut))
    except Exception:                                    # noqa: BLE001
        return ""
    finally:
        llm_local.SORTIE = ancienne
        tmp.unlink(missing_ok=True)


def depuis_metadonnees(ligne):
    """Le dernier filet : ce que la base sait de l'image, en descripteurs.

    Jamais vide et jamais fautif — `scene`, `intention` et `ton` sont des
    vocabulaires de scene, ils ne decrivent pas un visage par construction.
    """
    morceaux = []
    for champ in ("scene", "intention", "ton"):
        v = (ligne or {}).get(champ)
        if v:
            morceaux.append(str(v).replace("_", " "))
    return ", ".join(dict.fromkeys(morceaux))


def legender(image, ligne=None, anchor=None, trigger="", avec_vision=True,
             est_ancre=False, comfy_url=None, timeout=300):
    """Rend (legende, source). source : ancre | prompt | vision | metadonnees | ''.

    L'appelant sait ainsi, des mois plus tard, laquelle des sources a produit
    quoi — sans ce releve le manifeste mentirait par omission.
    """
    image = Path(image)
    ligne = ligne or {}

    if est_ancre:
        return _avec_trigger(LEGENDE_ANCRE, trigger), "ancre"

    exacte = base(ligne.get("prompt"), anchor, trigger)
    if exacte:
        return _avec_trigger(exacte, trigger), "prompt"

    if avec_vision:
        vu = vision(image, comfy_url=comfy_url, timeout=timeout)
        faute = terme_de_visage(vu)
        if faute:
            # On RETIRE la clause fautive au lieu de jeter la legende : un bon
            # legendeur decrit le visage ET la scene, et la scene est ce qu'on
            # est venu chercher.
            elague = sans_clause_de_visage(vu)
            if elague and not terme_de_visage(elague):
                return _avec_trigger(elague, trigger), f"vision elaguee ({faute})"
        elif vu:
            return _avec_trigger(vu, trigger), "vision"
        source_refus = (f"vision irrecuperable ({faute})" if faute
                        else "vision muette")
    else:
        source_refus = "vision desactivee"

    meta = depuis_metadonnees(ligne)
    if meta:
        return _avec_trigger(meta, trigger), f"metadonnees — {source_refus}"
    # JAMAIS DE LEGENDE VIDE. Un fichier .txt manquant fait entrainer l'image
    # sans legende du tout, au milieu d'un jeu ou toutes les autres en ont une :
    # l'inconstance de forme est ce que la pratique reproche le plus. Le
    # declencheur seul dit « tout dans cette image est le personnage » -- c'est
    # grossier, mais c'est constant, et la source le signale pour qu'on le voie.
    return trigger, f"declencheur seul — {source_refus}"


def _avec_trigger(texte, trigger):
    """Pose le declencheur en tete, SAUF s'il est deja quelque part dans le texte.

    Le test porte sur la presence, pas sur le debut : la legende de base porte
    deja le jeton AU MILIEU, la ou l'ancre etait (« raw, unedited photo of
    <jeton>, sitting on... »). Un test `startswith` le doublait — « lenadaab,
    raw, unedited photo of lenadaab, ... » — ce qui apprend au modele que le
    jeton se dit deux fois.
    """
    if not texte or not trigger:
        return texte or ""
    return texte if trigger.lower() in texte.lower() else f"{trigger}, {texte}"
