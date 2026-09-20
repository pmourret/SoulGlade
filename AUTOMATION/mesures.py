"""Ce qu'on sait de chaque image produite : mesures et jugement humain.

Un fichier, `PROD/mesures.json`, indexe par nom de fichier :

    {"lifestyle_cuisine_matin_20260822_01.png": {
        "identite": 0.713, "nettete": 127.6, "texture_visage": 5.2,
        "bruit_fond": 2.17, "flag": "ok", "mesure_le": "...", "juge_le": "..."}}

POURQUOI PAS LE JOURNAL. Le journal est append-only : une ligne y est ecrite a la
generation et n'est plus touchee. Or le jugement humain (`flag`) arrive plus tard,
dans la revue, et peut changer d'avis. Il faut donc un stockage modifiable en
place — d'ou ce fichier separe.

DOUBLE ECRITURE depuis le 24/08/2026, LECTURE EN BASE depuis le 20/09/2026.
`base.py` porte les memes donnees dans `score` et `jugement`, avec la cle qui
manque ici : (character_id, fichier). Ce fichier reste ecrit, il est lisible
sans outil, mais plus personne ne le lit pour savoir ce qu'on sait d'une image
de personnage — `par_personnage()` interroge la base et ne retombe ici que
pour les noms que la base ne connait a personne.

CE STORE NE SAIT PAS A QUI APPARTIENT UNE IMAGE, et c'est sa limite de
naissance : deux personnages d'un meme monde heritent du meme catalogue de
scenes (ADR-0019), produisent donc le meme nom de fichier, et n'ont ici
qu'une seule entree pour deux images. Le corpus de reference, lui, reste
pleinement chez lui : il n'appartient a aucun personnage.

DEUX ETALONNAGES, dans cet ordre (voir `bande`) :

1. LE CORPUS DE REFERENCE — `INPUTS/REALISME/`, des images choisies a la main pour
   leur texture, leur grain et leur rendu. C'est l'etalon explicite du realisme, le
   pendant de la base gelee pour l'identite. Leurs entrees portent role="reference"
   et n'apparaissent jamais dans la revue.
2. A DEFAUT, le jugement humain — FLAG "ok" = convaincante comme photographie,
   "ia" = ca se voit. Utilise seulement si le corpus est vide.

Aucun seuil n'est ecrit en dur nulle part.
"""
import json
import logging
import os
import threading
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
OFM = HERE.parent
FICHIER = OFM / "PROD" / "mesures.json"
REFERENCES = OFM / "INPUTS" / "REALISME"   # corpus de reference du realisme

_LOG = logging.getLogger(__name__)
_VERROU = threading.Lock()          # le batch ecrit pendant que le web lit
FLAGS = ("ok", "ia")

# Etiquettes humaines de corpus (P4.5.1), par axe : {axe: (champ, vocabulaire)}.
# Ce sont des JUGEMENTS, jamais des scores — rien ici n'est mesure, rien ici ne
# trie. Elles servent a repondre a la question qu'ADR-0025 pose avant qu'une
# mesure ait le droit d'ecarter une image seule : combien de faux positifs, et
# combien de faux negatifs, sur des images qu'un humain a vraiment regardees.
#
# LE CHAMP DE L'AXE « mains » N'EST PAS `mains`. Ce nom porte deja le taux de
# detection DWPose (un float, mesure automatique, affiche comme un score dans la
# Revue). Y ranger un jugement humain ferait passer l'un pour l'autre partout.
#
# Meme vocabulaire pour les deux axes, et le "na" (non jugeable) est structurel
# dans les deux : sans lui les portraits et les cadrages serres tombent en "ok"
# alors qu'il n'y a rien a juger, et l'indicateur qu'on calibrera dessus
# afficherait une separation qui ne mesure rien.
ETIQUETTES = {
    "anatomie": ("anatomie", ("ok", "ko", "na")),
    "mains": ("mains_juge", ("ok", "ko", "na")),
}


def charger():
    if not FICHIER.exists():
        return {}
    try:
        with open(FICHIER, encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}                   # un store illisible ne doit jamais bloquer


def _ecrire(d):
    """Ecriture atomique : jamais de fichier a moitie ecrit si ca coupe."""
    FICHIER.parent.mkdir(parents=True, exist_ok=True)
    tmp = FICHIER.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, FICHIER)


def maj(nom, **champs):
    """Fusionne des champs pour une image. Retourne l'entree complete."""
    with _VERROU:
        d = charger()
        e = d.setdefault(nom, {})
        e.update({k: v for k, v in champs.items() if v is not None})
        _ecrire(d)
        return e


def renommer(ancien, nouveau):
    """Suit un fichier deplace entre dossiers (le tri ne change que le dossier)."""
    if ancien == nouveau:
        return
    with _VERROU:
        d = charger()
        if ancien in d:
            d[nouveau] = d.pop(ancien)
            _ecrire(d)


# Genres de score qui decrivent les PIXELS, donc perimes des que les pixels
# changent. `identite_centroide` en fait partie : il est calcule sur le meme
# embedding que `identite`, par `base.rescorer`.
GENRES_PIXELS = ("nettete", "texture_visage", "bruit_fond", "identite",
                 "identite_centroide", "mains")


def demesurer(nom, character_id=None):
    """Efface les MESURES d'une image dont les pixels ont change (F3.3).

    Ecraser une source depuis l'editeur garde le nom de fichier mais change ce
    qu'il contient : nettete, texture, bruit de fond et mains ont ete
    calcules sur l'ancienne version, et un badge qui ment est un bug
    (frontend.md). L'image repasse donc « non mesuree » et rentre dans le
    compte de `Mesurer (n)`.

    Le JUGEMENT humain (`flag`, `juge_le`) est conserve : il porte sur le sujet
    et sur ce que l'image donne a voir, pas sur trois nombres ; l'effacer
    silencieusement detruirait une saisie de l'utilisateur. Rend l'entree
    restante, ou None si l'image n'en avait aucune.

    `character_id` EFFACE AUSSI EN BASE, et c'est desormais le chemin qui
    compte : la Revue lit ses mesures en base depuis le 20/09, une mesure
    laissee la-bas survivrait a l'ecrasement et afficherait un badge qui
    ment. Sans personnage, seul le store est nettoye — l'appelant qui en a
    un doit le passer.
    """
    if character_id:
        try:
            import base
            with base.ouvrir() as cx:
                base.oublier_scores(cx, character_id, nom, GENRES_PIXELS)
                cx.commit()
        except Exception as e:
            _LOG.warning("base : mesures non effacees pour %s (%s) — %s: %s",
                         nom, character_id, type(e).__name__, e)
    with _VERROU:
        d = charger()
        e = d.get(nom)
        if not e:
            return None
        for champ in ("nettete", "texture_visage", "bruit_fond", "identite",
                      "mains", "mesure_le", "bbox"):
            e.pop(champ, None)
        if e:
            d[nom] = e
        else:
            d.pop(nom, None)
        _ecrire(d)
        return e or None


def poser_flag(nom, flag, character_id):
    """flag dans FLAGS, ou None pour retirer le jugement.

    Ecrit aussi en base : c'est ce jugement qui etalonne le realisme, il ne doit
    pas exister a deux endroits qui divergent. `character_id` est obligatoire
    depuis que `base.enregistrer_image` n'a plus de defaut (2026-09-01) — avant
    ca, l'ecriture en base d'un jugement retombait en silence sur 'lena' pour
    TOUT personnage (le `except Exception: pass` ci-dessous avale l'echec sans
    le dire, par design : la base ne doit jamais bloquer un jugement humain,
    mais elle ecrivait alors sous la mauvaise identite plutot que de refuser).
    """
    if flag is not None and flag not in FLAGS:
        raise ValueError(f"flag inconnu : {flag}")
    try:
        import base
        with base.ouvrir() as cx:
            base.enregistrer_jugement(
                cx, base.enregistrer_image(cx, nom, character_id), flag)
            cx.commit()
    except Exception:
        pass                        # la base ne doit jamais bloquer un jugement
    with _VERROU:
        d = charger()
        e = d.setdefault(nom, {})
        if flag is None:
            e.pop("flag", None)
            e.pop("juge_le", None)
        else:
            e["flag"] = flag
            e["juge_le"] = datetime.now().isoformat(timespec="seconds")
        _ecrire(d)
        return e


def poser_etiquette(nom, axe, valeur, character_id=None):
    """Etiquette manuelle de corpus sur un `axe` de `ETIQUETTES`, None pour retirer.

    Deuxieme famille de jugement humain, a cote de `flag` — et deliberement PAS
    le meme champ : une image peut etre convaincante comme photo ET avoir un
    bras trop long, et `bande()` etalonne le realisme sur `flag == "ok"`. Les
    melanger fausserait les deux d'un coup, sans qu'aucun ecran le montre.

    ponytail: etiquette PAR IMAGE, pas par main. « au moins une main cassee »
    est la granularite dont le runner a besoin, puisque c'est une IMAGE qu'il
    ecarte. Un classifieur entraine sur des crops (porte 3 de
    DOCS/recherche/2026-09-07-juge-pixel-mains-resultats.md) demanderait une
    etiquette par main : re-passer le corpus a ce moment-la, pas maintenant.

    ECRIT AUSSI EN BASE depuis le 2026-09-10, avec `character_id`. Ce
    paragraphe disait l'inverse — « pas d'ecriture en base [...] migrer le jour
    ou une SECONDE LECTURE le demande » — et cette seconde lecture est arrivee :
    la file d'entrainement ecarte les defauts objectifs, donc elle DECIDE
    depuis ces etiquettes. Les laisser dans le seul store JSON pendant que le
    reste du mecanisme (embeddings, jeu de reference, portillon) est en SQL,
    c'etait reinstaller « deux stores, une verite ».

    `character_id` reste optionnel : le corpus de reference (mesurer_references)
    n'appartient a aucun personnage, et il s'etiquette aussi. Sans lui, on
    n'ecrit que le store — jamais sous un personnage devine, c'est la faute que
    `poser_flag` documente juste au-dessus.
    """
    if axe not in ETIQUETTES:
        raise ValueError(f"axe d'etiquette inconnu : {axe}")
    champ, vocabulaire = ETIQUETTES[axe]
    if valeur is not None and valeur not in vocabulaire:
        raise ValueError(f"etiquette {axe} inconnue : {valeur}")
    if character_id:
        try:
            import base
            with base.ouvrir() as cx:
                base.enregistrer_etiquette(
                    cx, base.enregistrer_image(cx, nom, character_id), champ, valeur)
                cx.commit()
        except Exception:
            pass                    # la base ne doit jamais bloquer un jugement
    with _VERROU:
        d = charger()
        e = d.setdefault(nom, {})
        if valeur is None:
            e.pop(champ, None)
            e.pop(champ + "_le", None)
            if not e:
                d.pop(nom, None)
        else:
            e[champ] = valeur
            e[champ + "_le"] = datetime.now().isoformat(timespec="seconds")
        _ecrire(d)
        return e


def mesurer(path, checker=None, bbox=None, identite=None, character_id=None):
    """Mesure une image et range le resultat. Retourne l'entree.

    Si `checker` est fourni et que la bbox n'est pas connue, la passe InsightFace
    sert aux deux : score d'identite ET cadre du visage. C'est la partie couteuse
    (~190 ms) ; les mesures de realisme n'ajoutent que ~32 ms.

    `character_id` double l'ecriture en base (meme genres que
    `runner.sortie.ranger_mesures` a la generation) — sans lui ce fichier reste
    la seule source, ce qui a laisse la base en retard pour toute image
    RE-mesuree depuis la revue plutot que notee a la generation (P2.1,
    05/09/2026). Omis pour le corpus de reference (`mesurer_references`) : il
    n'appartient a aucun personnage, la base l'a deja sous 'lena' par
    convention historique (migrer_base.py), pas par appelant courant.
    """
    import qc_realisme
    path = Path(path)
    embedding = None
    if bbox is None and checker is not None:
        m = checker.mesure(path)
        bbox, identite, embedding = m["bbox"], m["score"], m["embedding"]
    r = qc_realisme.mesure(path, bbox)
    if r is None:
        return None
    quand = datetime.now().isoformat(timespec="seconds")
    entree = maj(path.name, identite=identite, mesure_le=quand, **r)
    if character_id:
        try:
            import base
            with base.ouvrir() as cx:
                iid = base.enregistrer_image(cx, path.name, character_id=character_id)
                base.enregistrer_score(cx, iid, "identite", identite, quand)
                for genre, v in r.items():
                    base.enregistrer_score(cx, iid, genre, v, quand)
                # Le score ET l'embedding, jamais l'un sans l'autre : ce chemin
                # n'ecrivait que le score, donc une re-mesure pouvait eloigner le
                # score de son propre embedding sans que rien ne le detecte. Or
                # c'est ce desaccord qui a revele le bug de checker_partage le
                # 09/09 -- il ne doit pas etre le seul temoin, il doit etre
                # impossible. `enregistrer_embedding` ignore un vecteur None.
                base.enregistrer_embedding(cx, iid, embedding)
                cx.commit()
        except Exception:
            pass                    # la base ne doit jamais bloquer une mesure
    return entree


def _quantiles(vals, n_min, source):
    """Bande robuste : quartiles, pas min/max.

    Un seul cliche atypique dans le corpus suffirait a ouvrir la bande au point
    qu'elle ne dise plus rien — c'est arrive avec e123a_eavdue_135z.png, nettete
    2822 contre 553 de mediane. Les quartiles l'ecartent sans avoir a le trier a
    la main, et min/max restent affiches pour qu'il soit reperable.
    """
    vals = sorted(vals)
    if len(vals) < n_min:
        return None
    q = lambda p: vals[min(len(vals) - 1, int(round(p * (len(vals) - 1))))]
    return {"min": q(0.25), "median": q(0.5), "max": q(0.75),
            "etendue": [vals[0], vals[-1]], "n": len(vals), "source": source}


def par_personnage(character_id):
    """Mesures et jugements de CE personnage : {fichier: entree}.

    LA BASE D'ABORD, ET C'EST LE POINT. Ce store est indexe par nom de
    fichier NU, sans champ personnage, et deux personnages d'un meme monde
    heritent du meme catalogue de scenes (ADR-0019) : ils peuvent produire le
    meme nom, et leurs mesures se recouvriraient sans que rien ne le signale.
    La base, elle, porte la bonne cle depuis le depart —
    UNIQUE(character_id, fichier).

    Le store ne sert plus que de REPLI, et seulement pour les noms que la
    base ne connait a PERSONNE : ce sont les images anterieures a la double
    ecriture du 24/08. Un nom que la base connait pour quelqu'un d'autre
    n'est jamais repli, c'est exactement le melange qu'on evite.

    Le corpus de reference est exclu : il n'appartient a aucun personnage et
    se lit par `corpus()`. Cadrage : DOCS/cadrage/2026-09-20-mesures-par-personnage.md
    """
    import base
    with base.ouvrir() as cx:
        out = base.mesures_par_fichier(cx, character_id)
        connus = base.fichiers_connus(cx)
    for nom, e in charger().items():
        if nom not in out and nom not in connus and not e.get("role"):
            out[nom] = e
    return out


def corpus():
    """Entrees du corpus de reference : {fichier: entree}, role='reference'.

    Reste lu dans le store, et pas en base : le corpus est de plateforme
    (`INPUTS/REALISME/`), il n'appartient a aucun personnage, donc a aucune
    ligne `image.character_id` qui voudrait dire quelque chose.
    """
    return {n: e for n, e in charger().items() if e.get("role") == "reference"}


def bande(entrees, champ):
    """Bande cible d'une mesure. Deux etalonnages, par ordre de priorite.

    1. LE CORPUS DE REFERENCE (INPUTS/REALISME) : des images choisies a la main
       pour leur texture et leur rendu. C'est l'etalon explicite, et c'est celui
       qui prime — il ne bouge pas au gre des jugements.
    2. A defaut, les images jugees « convaincante » dans la revue, a partir de 8.

    Retourne None si aucun des deux n'est disponible : l'interface se rabat alors
    sur l'etendue du dossier affiche. Aucun seuil n'est ecrit en dur.
    """
    refs = [e[champ] for e in entrees
            if e.get("role") == "reference" and isinstance(e.get(champ), (int, float))]
    b = _quantiles(refs, 3, "reference")
    if b:
        return b
    juges = [e[champ] for e in entrees
             if e.get("flag") == "ok" and e.get("role") != "reference"
             and isinstance(e.get(champ), (int, float))]
    return _quantiles(juges, 8, "jugements")


def fichiers_reference():
    if not REFERENCES.exists():
        return []
    return sorted(f for f in REFERENCES.iterdir()
                  if f.suffix.lower() in (".png", ".jpg", ".jpeg"))


def _bbox_sans_ancre(path, checker):
    """Cadre du visage SANS score d'identite, pour le corpus de plateforme.

    Le corpus n'appartient a aucun personnage. Le mesurer avec le `checker` du
    personnage courant lui collait un score d'identite contre l'ancre de celui
    qui a lance la mesure EN PREMIER : une valeur qui ne veut rien dire, ecrite
    une fois pour toutes, et qui se lit comme un score. La bbox, elle, reste
    necessaire — `qc_realisme` mesure la texture sur le visage — et elle ne
    depend d'aucune ancre.
    """
    if checker is None:
        return None
    import qc_identity
    return qc_identity.analyse(path, checker.root)[1]


def mesurer_references(checker=None, force=False):
    """Mesure le corpus de reference. Retourne (mesurees, total).

    Les entrees portent role="reference" : elles etalonnent les bandes mais
    n'apparaissent jamais dans la revue, qui ne liste que les dossiers de tri.

    `checker` ne sert qu'a localiser le visage (voir `_bbox_sans_ancre`) : le
    corpus ne recoit jamais de score d'identite.
    """
    store = charger()
    faites = 0
    for f in fichiers_reference():
        if not force and "nettete" in store.get(f.name, {}):
            continue
        if mesurer(f, bbox=_bbox_sans_ancre(f, checker)) is not None:
            maj(f.name, role="reference")
            faites += 1
    return faites, len(fichiers_reference())
