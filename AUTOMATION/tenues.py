# -*- coding: utf-8 -*-
"""Tenues : une garde-robe reutilisee d'une scene a l'autre.

IT-10 chantier 6 — DOCS/cadrage/2026-09-26-it10-c6-tenues.md.

CE QU'EST UNE TENUE. Un libelle et des PIECES, dans l'ordre. Une piece est un
texte (`{"text": "light blue denim jeans"}`) ou un asset `vetement` de la
bibliotheque (`{"asset": "<key>"}`), dont le fragment est lu A LA RESOLUTION :
corriger le fragment d'un asset corrige toutes les tenues qui le portent. Le
texte d'une tenue est ses pieces jointes par une virgule. Une tenue n'a pas de
niveau : c'est la scene qui la pose a un niveau.

COMMENT UNE SCENE LA PORTE. Une ligne de `wardrobe` qui vaut `@<key>`. Le
marqueur vit dans la chaine plutot que dans un objet : tout ce qui lit
`wardrobe` aujourd'hui (la bande de niveaux, le brouillon « N: texte » du
composeur, le MCP) lit des chaines, et n'a rien a apprendre. Seule
`resoudre` sait ce que veut dire `@`.

OU ELLE SE RESOUT. En amont de l'assembleur, comme le decor d'une scene
(ADR-0027 §4) : `build_jobs` appelle `resoudre_banque` sur la banque qu'il
vient de lire, et l'assembleur recoit une scene dont la tenue est deja du
texte. Une banque sans `@` sort identique ; une scene qui reference une tenue
s'assemble a l'octet pres comme la meme scene qui en porterait le texte en dur
(invariant 3, tests/test_tenues.py).

UNE REFERENCE PENDANTE EST UNE ERREUR — tenue inconnue, asset inconnu, asset
sans fragment. Jamais une tenue vide qui partirait au rendu en silence.

QUI POSSEDE. Le monde possede, le personnage surcharge, champ par champ comme
un ton (`worlds.merge_outfits`, ADR-0019). L'ADR-0014 §2 tient : un catalogue
n'habille personne, c'est la scene du personnage qui y choisit une tenue.
"""
import layered_catalog
import worlds

MARQUEUR = layered_catalog.MARKER
CHAMPS_AJUSTABLES = ("label", "pieces")


class TenueError(RuntimeError):
    """Refus cote tenues — message deja pret pour l'ecran."""


# ------------------------------------------------------------ resolution (pure)
est_reference = layered_catalog.is_reference
cle_de = layered_catalog.key_of


def references(wardrobe):
    """Cles de tenue qu'un `wardrobe` de scene reference, dans l'ordre."""
    cles = []
    for v in (wardrobe or {}).values():
        for ligne in (v if isinstance(v, list) else [v]):
            if est_reference(ligne) and cle_de(ligne) not in cles:
                cles.append(cle_de(ligne))
    return cles


def texte(tenue, bibliotheque):
    """Le texte d'une tenue : ses pieces, jointes par une virgule. LEVE sur
    une piece qui ne se resout pas plutot que de la sauter."""
    nom = tenue.get("label") or tenue.get("key")
    assets = {a.get("key"): a for a in bibliotheque or [] if isinstance(a, dict)}
    morceaux = []
    for piece in tenue.get("pieces") or []:
        if isinstance(piece, dict) and piece.get("asset"):
            asset = assets.get(piece["asset"])
            if asset is None:
                raise TenueError(f"tenue « {nom} » : asset inconnu "
                                 f"« {piece['asset']} »")
            fragment = str(asset.get("fragment") or "").strip()
            if not fragment:
                raise TenueError(f"tenue « {nom} » : l'asset « "
                                 f"{asset.get('label') or asset['key']} » n'a pas "
                                 f"de fragment — l'analyser ou l'écrire à la main")
            morceaux.append(fragment)
        elif isinstance(piece, dict) and str(piece.get("text") or "").strip():
            morceaux.append(str(piece["text"]).strip())
        else:
            raise TenueError(f"tenue « {nom} » : pièce vide ou illisible "
                             f"({piece!r})")
    if not morceaux:
        raise TenueError(f"tenue « {nom} » : aucune pièce")
    return ", ".join(morceaux)


def resoudre(wardrobe, tenues, bibliotheque):
    """Copie de `wardrobe` ou chaque ligne `@<key>` est remplacee par le texte
    de sa tenue. Une ligne libre est rendue telle quelle, et la forme de
    chaque niveau (chaine ou liste) est gardee : sans reference, la sortie
    est egale a l'entree."""
    par_cle = {t.get("key"): t for t in tenues or [] if isinstance(t, dict)}

    def une(ligne):
        if not est_reference(ligne):
            return ligne
        tenue = par_cle.get(cle_de(ligne))
        if tenue is None:
            raise TenueError(f"tenue inconnue : « {cle_de(ligne)} »")
        return texte(tenue, bibliotheque)

    return {niveau: ([une(x) for x in v] if isinstance(v, list) else une(v))
            for niveau, v in (wardrobe or {}).items()}


def resoudre_banque(data, tenues, bibliotheque):
    """Resout, en place, la garde-robe de chaque scene de la banque qui
    reference une tenue, et rend `data`. L'erreur nomme la scene : un
    lancement sans sa tenue serait un echec silencieux."""
    for s in data.get("scenes", []):
        if not isinstance(s, dict) or not references(s.get("wardrobe")):
            continue
        try:
            s["wardrobe"] = resoudre(s["wardrobe"], tenues, bibliotheque)
        except TenueError as e:
            raise TenueError(f"scène {s.get('id')!r} : {e}") from e
    return data


# ------------------------------------------------------------- catalogue (E/S)
# La mecanique a couches (fusion, couche, surcharge, garde « portee par ») est
# commune aux lumieres : `layered_catalog.Catalog`. Ne reste ici que ce qui
# fait une tenue — des pieces, dont des assets. `assets` s'importe dans les
# fonctions : `assets` importe ce module.
def _resolveur(cid):
    import assets
    bibliotheque = assets.bibliotheque(cid)
    return lambda tenue: texte(tenue, bibliotheque)


def _valider(cid, champs, au_monde):
    import assets
    if "pieces" in champs:
        champs = {**champs, "pieces": _pieces_valides(
            champs["pieces"], assets.bibliotheque(cid), au_monde)}
    return champs


CATALOGUE = layered_catalog.Catalog(
    worlds.CLE_OUTFITS, "tenue", TenueError, CHAMPS_AJUSTABLES,
    resolver=_resolveur, validate=_valider,
    uses=lambda scene, key: key in references(scene.get("wardrobe")))


def fusion(cid):
    """Les tenues visibles par ce personnage, sans couche ni texte : ce que
    lit la resolution."""
    return CATALOGUE.merged(cid)


def catalogue(cid):
    """Les tenues de ce personnage, chacune avec sa couche (monde, surcharge,
    personnage) et son texte resolu — ou l'erreur qui l'empeche, pour que
    l'atelier la montre au lieu d'un texte faux."""
    return CATALOGUE.listing(cid)


def trouver(cid, key):
    return CATALOGUE.find(cid, key)


def _pieces_valides(pieces, bibliotheque, au_monde):
    """Refuse une piece que la resolution refuserait, avant l'ecriture. Au
    monde, une piece asset doit etre un asset DU MONDE : sinon la tenue
    casserait chez tout autre personnage du monde."""
    if not isinstance(pieces, list) or not pieces:
        raise TenueError("une tenue porte au moins une pièce")
    assets = {a.get("key"): a for a in bibliotheque}
    propres = []
    for piece in pieces:
        if isinstance(piece, dict) and piece.get("asset"):
            asset = assets.get(piece["asset"])
            if asset is None:
                raise TenueError(f"asset inconnu : « {piece['asset']} »")
            if asset.get("classe") != "vetement":
                raise TenueError(f"« {asset.get('label') or asset['key']} » n'est "
                                 f"pas un vêtement")
            if au_monde and asset.get("couche") == "personnage":
                raise TenueError(f"« {asset.get('label') or asset['key']} » "
                                 f"appartient au personnage : une tenue du monde "
                                 f"ne peut porter que des assets du monde")
            propres.append({"asset": piece["asset"]})
        elif isinstance(piece, dict) and str(piece.get("text") or "").strip():
            propres.append({"text": str(piece["text"]).strip()})
        else:
            raise TenueError("pièce vide : écrire un texte ou choisir un asset")
    return propres


def creer(cid, label, pieces, au_monde=False):
    """Une tenue neuve, au personnage ou a son monde. Rend sa fiche."""
    return CATALOGUE.create(cid, label, {"pieces": pieces}, au_monde)


def enregistrer(cid, key, champs, au_monde=False):
    """Ecrit le libelle et/ou les pieces d'une tenue — cote personnage par
    defaut (une surcharge), au monde sur demande (`Catalog.save`)."""
    return CATALOGUE.save(cid, key, champs, au_monde)


def scenes_qui_portent(cid, key, au_monde=False):
    """« <personnage>/<scene> » de chaque scene qui reference la tenue `key` :
    celles de ce personnage, ou de tout son monde si la tenue en vient."""
    return CATALOGUE.scenes_using(cid, key, au_monde)


def supprimer(cid, key):
    """Retire une tenue de la couche ou elle vit, et rend cette couche ;
    refuse tant qu'une scene la porte (`Catalog.delete`)."""
    return CATALOGUE.delete(cid, key)


def tenues_qui_portent(cid, asset_key, au_monde=False):
    """Libelles des tenues qui portent l'asset : celles que voit ce
    personnage, ou celles de tout son monde si l'asset en vient."""
    out = []
    for c in CATALOGUE.concerned(cid, au_monde):
        out += [t.get("label") or t.get("key") for t in fusion(c)
                if any(isinstance(p, dict) and p.get("asset") == asset_key
                       for p in t.get("pieces") or [])
                and (t.get("label") or t.get("key")) not in out]
    return out
