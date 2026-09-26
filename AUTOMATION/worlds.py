"""Registre des mondes de la plateforme (ADR-0012, J7bis).

Un monde est le CADRE d'un personnage : forets et feux de camp d'une voyageuse,
cafes et lumiere douce d'une influenceuse slow-life. Il porte un ton, un jeton de
peau UI, des decors, des intentions, des scenes et des tons (ADR-0027), et des
ASSETS (LoRA de monde, prompt_add) qui entrent dans le rendu.

Trois choses qu'un monde n'est PAS :

  - il ne choisit ni la famille de modele ni le mecanisme d'identite. Ceux-la
    sont deja resolus par (type, style) -> pack (AUTOMATION/universe.py). Le
    monde doit seulement etre COMPATIBLE avec la famille resolue :
    `compatible_families` filtre les mondes proposables dans le wizard.
  - il n'est pas un simple decor. Ses assets sont mesures pour le visage du
    personnage au meme titre que le verrou d'identite ; un monde livre sans
    mesure est une dette declaree, pas un monde pret.
  - CE QUI EST FIGE A LA CREATION D'UN PERSONNAGE, c'est son APPARTENANCE a ce
    monde (CLAUDE.md §3-§4) : en changer reviendrait a creer un autre
    personnage, pour la meme raison que le style. Les catalogues EUX-MEMES
    restent vivants apres coup : ils s'editent par les routes
    `/api/worlds/<id>/...`, jamais `POST /api/scenes`, et une scene de
    personnage qui reprend une scene du monde en herite — voir `merge_scene()`.

Comme PACKS/, ce registre est VERSIONNE : aucune donnee personnelle, un fichier
plat par monde (WORLDS/<id>.json), decouverte par scan.

J7bis : le registre existe et se valide, mais RIEN ne consomme encore ses assets
— leur cablage dans le runner est explicitement hors perimetre (ROADMAP).
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OFM = HERE.parent
WORLDS_DIR = OFM / "WORLDS"

# Pour que `python AUTOMATION/worlds.py` retrouve ses modules freres (universe)
# meme sous l'interpreteur embarque de ComfyUI, dont le ._pth ne met pas le
# dossier du script sur le path. Meme repli que wf_check.py.
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import universe  # noqa: E402 — apres le repli de sys.path ci-dessus


class UnknownWorldError(ValueError):
    """Un id de monde demande n'a pas de fichier WORLDS/<id>.json."""


class UnknownPlaceError(ValueError):
    """Un decor reference par une scene n'existe pas dans ce monde."""


class UnknownSceneError(ValueError):
    """Un id de scene demande n'existe pas dans le catalogue de ce monde."""


class IncompatibleWorldError(ValueError):
    """Un monde a ete demande pour une famille de modele qu'il ne declare pas.

    Le monde ne resout pas la famille (c'est (type, style) -> pack qui le fait) ;
    il doit etre compatible avec elle. Un monde rattache a la mauvaise famille
    donnerait des assets qui ne chargent pas — ou pire, chargent et degradent.
    """


def world_path(wid):
    return WORLDS_DIR / f"{wid}.json"


def _short(path):
    """Chemin relatif au repo si possible, sinon tel quel (registre jetable de test)."""
    try:
        return path.relative_to(OFM)
    except ValueError:
        return path


def _read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise UnknownWorldError(f"monde inconnu : {path.stem!r} — {_short(path)} absent")
    except json.JSONDecodeError as e:
        raise ValueError(f"{_short(path)} : JSON invalide — {e}")


def list_worlds():
    """Ids des mondes declares, ordre alphabetique. [] si WORLDS/ absent.

    Les catalogues adultes sont ECARTES : `<id>.adulte.json` est le second
    catalogue d'un monde existant (21/09), pas un monde. Sans ce filtre son
    `stem` (`slow-life.adulte`) remontait comme une entree du registre, et
    l'ecran Mondes l'affichait comme un monde vide a cote du sien. Le wizard
    ne l'a jamais vu (`worlds_for_family` filtre sur `compatible_families`,
    qu'un fichier adulte n'a pas), l'ecran si.
    """
    if not WORLDS_DIR.is_dir():
        return []
    return sorted(p.stem for p in WORLDS_DIR.glob("*.json")
                  if not p.name.endswith(".adulte.json"))


def exists(wid):
    return bool(wid) and world_path(wid).is_file()


# Meme forme que `_CID_RE` de runner/prompt.py : un id de monde devient un nom
# de fichier et une valeur d'URL, meme regle qu'un id de personnage. Les ids de
# lieu et de scene suivent la meme regle (ecrits dans les banques de
# personnage et les noms de fichier produits).
ID_RE = re.compile(r"[a-z][a-z0-9_-]*$")


def create_world(wid, label, pack, tone=""):
    """Cree WORLDS/<wid>.json pour l'ecran « Mondes » — catalogues VIDES, un pack deja curate pour en deriver `compatible_families` /
    `suggested_styles` sans les faire taper a la main.

    LE PACK EST UNE PROPOSITION, PAS UN AIGUILLAGE (ADR-0016) : il sert une
    fois, ici, a deriver la famille et les styles suggeres. Il n'est ecrit
    nulle part comme un lien dur — `universe.resolve()` continue de deriver
    le pack d'un personnage depuis (type, style) exclusivement, et ce monde
    reste ensuite proposable a tout personnage d'un pack de la MEME famille,
    pas seulement celui choisi ici.

    N'ECRIT QUE ce fichier : aucun acces a CHARACTERS/, aucune ecriture dans
    PACKS/resolution.json. Le gel (« n'assigne ce monde a aucun
    personnage ») est vrai par construction, pas par un garde-fou en plus.

    Leve avant toute ecriture : ValueError (id invalide, pack inconnu),
    FileExistsError (id deja pris). Rend le wid.
    """
    if not ID_RE.match(wid or ""):
        raise ValueError(f"identifiant de monde invalide : {wid!r} — attendu un "
                         f"slug minuscule (^[a-z][a-z0-9_-]*$)")
    if exists(wid):
        raise FileExistsError(f"le monde {wid!r} existe deja : {world_path(wid)}")
    if not universe.exists(pack):
        raise ValueError(f"pack inconnu : {pack!r} — packs declares : "
                         f"{', '.join(universe.list_universes()) or '(aucun)'}")

    family = universe.model_family(pack)
    data = {
        "id": wid,
        "label": (label or "").strip() or wid,
        "compatible_families": [family],
        "suggested_styles": universe.style_names(pack),
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "readiness": {"places": False, "tones": False, "style": False},
        "tone": (tone or "").strip(),
        "ui_skin_token": f"world-{wid}",
        "places": [],
        "intentions": [],
        "scenes": [],
        "tones": [],
        "_notes": [
            f"Cree par l'ecran « Mondes ». Pack {pack!r} choisi pour en deriver",
            f"compatible_families ({family!r}) et suggested_styles — UNE",
            "PROPOSITION, pas un aiguillage : universe.resolve() continue de",
            "deriver le pack d'un personnage de (type, style) exclusivement",
            "(ADR-0016). Decors, intentions, scenes et tons vides, a construire",
            "depuis l'ecran d'edition (ADR-0027). readiness nait a {places, tones, style}:",
            "false, pose par le createur du monde, jamais calcule (ADR-0023).",
        ],
    }
    world_path(wid).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                               encoding="utf-8")
    return wid


def load_world(wid):
    """Contenu de WORLDS/<wid>.json. Leve UnknownWorldError si absent."""
    return _read_json(world_path(wid))


def label(wid):
    return load_world(wid).get("label", wid)


def compatible_families(wid):
    """Familles de modele avec lesquelles les assets de ce monde sont utilisables."""
    return list(load_world(wid).get("compatible_families", []))


def suggested_styles(wid):
    """Styles de sortie que ce monde met en avant dans le wizard (indicatif)."""
    return list(load_world(wid).get("suggested_styles", []))


def assets(wid):
    """Assets de monde, sous forme normalisee {lora, lora_strength, prompt_add}.

    Cles absentes completees : un monde peut n'avoir aucun asset (cadre
    contemporain sans LoRA) et ne declarer que `prompt_add`, ou rien du tout.
    """
    raw = load_world(wid).get("assets") or {}
    return {"lora": raw.get("lora"),
            "lora_strength": raw.get("lora_strength"),
            "prompt_add": raw.get("prompt_add", "")}


def readiness(wid):
    """Etat 'pret a vendre' d'un monde, sous forme normalisee
    {places, tones, style} (ADR-0023). Poses par le createur du monde,
    jamais calcules ; retro-compatible, un monde sans champ `readiness`
    n'a encore rien de valide."""
    raw = load_world(wid).get("readiness") or {}
    return {"places": bool(raw.get("places", False)),
            "tones": bool(raw.get("tones", False)),
            "style": bool(raw.get("style", False))}


def tone(wid):
    return load_world(wid).get("tone", "")


def ui_skin_token(wid):
    return load_world(wid).get("ui_skin_token")


# ------------------------------------------- vocabulaire creatif (J8.3, ADR-0019)
def intentions(wid):
    """Intentions de base declarees par le monde (`WORLDS/<id>.json` /
    `intentions`) — ce qu'on veut montrer, a tous les niveaux (ADR-0027 §3).
    Un personnage de ce monde en herite (voir `merge_creative_vocab`) : key,
    label, icon, prompt_add, et au plus un ton propose (`defaults.tone`)."""
    return list(load_world(wid).get("intentions", []))


def tones(wid):
    """Tons de base declares par le monde (`WORLDS/<id>.json` / `tones`) —
    ne pas confondre avec `tone()` ci-dessus, l'ambiance UI singuliere
    d'ADR-0012. Meme forme qu'une entree de creative.json : key, label,
    prompt_add, expression."""
    return list(load_world(wid).get("tones", []))


def _merge_by_key(base, overrides):
    """base et overrides : listes d'entrees `{"key": ..., ...}`. Une entree
    d'`overrides` de meme `key` REMPLACE ENTIEREMENT celle de `base` (jamais
    une fusion champ a champ — meme logique que config.json sur
    character_defaults.json) ; une `key` neuve s'ajoute a la suite. Une
    entree de `base` sans correspondance reste heritee, a sa place. Une
    entree sans `key` (des deux cotes) n'est jamais une cible de
    remplacement — elle s'ajoute telle quelle, cote inconnu ne collisionne
    jamais par accident sur une cle absente."""
    remplacements = {e["key"]: e for e in overrides
                     if isinstance(e, dict) and e.get("key")}
    out = [remplacements.get(e.get("key"), e) if isinstance(e, dict) and e.get("key")
          else e
          for e in base]
    connues = {e.get("key") for e in base if isinstance(e, dict) and e.get("key")}
    out += [e for e in overrides
           if not (isinstance(e, dict) and e.get("key") in connues)]
    return out


def _merge_fields_by_key(base, overrides):
    """Comme `_merge_by_key`, mais une entree d'`overrides` de meme `key` ne
    remplace QUE les champs qu'elle porte : `{"key": "doux", "expression":
    {...}}` garde le libellé et le fragment du monde. Un champ est remplace
    en bloc — `expression` n'est jamais fusionnee parametre par parametre,
    une plage est un reglage entier.

    Pourquoi pas `_merge_by_key` pour les tons (25/09) : une surcharge qui
    remplace l'entree entiere fige chez le personnage une copie du fragment
    du monde, et corriger ce fragment dans le monde ne l'atteint plus. C'est
    ce qui rendait un createur de tons du monde inoperant pour tout ton deja
    regle dans l'atelier."""
    surcharges = {e["key"]: e for e in overrides
                  if isinstance(e, dict) and e.get("key")}
    out = [{**e, **surcharges[e["key"]]}
           if isinstance(e, dict) and e.get("key") in surcharges else e
           for e in base]
    connues = {e.get("key") for e in base if isinstance(e, dict) and e.get("key")}
    out += [e for e in overrides
            if not (isinstance(e, dict) and e.get("key") in connues)]
    return out


def merge_creative_vocab(wid, character_intentions, character_tones):
    """Fusion monde + personnage des deux listes de vocabulaire creatif
    (J8.3, ADR-0019) : le monde fournit la base, le personnage surcharge une
    cle existante et ajoute les cles neuves. Les intentions se remplacent
    entree par entree (`_merge_by_key`), les tons champ par champ
    (`_merge_fields_by_key`, 25/09). Utilisee par
    `AUTOMATION/runner/prompt.py::load_creative()` — jamais par
    `build_jobs()` lui-meme, meme principe qu'ADR-0015 §4 pour les scenes :
    la fusion vit en amont de l'assemblage, jamais dedans."""
    return (_merge_by_key(intentions(wid), character_intentions or []),
            _merge_fields_by_key(tones(wid), character_tones or []))


def tone_layers(wid, character_tones):
    """Couche de chaque ton resolu, par cle : `monde` (herite tel quel),
    `surcharge` (du monde, ajuste par le personnage) ou `personnage` (propre
    au personnage). `wid` None = aucun monde, tout ton est au personnage."""
    du_monde = {t.get("key") for t in (tones(wid) if wid else [])}
    propres = {t.get("key") for t in character_tones or [] if isinstance(t, dict)}
    return {k: ("surcharge" if k in propres else "monde") for k in du_monde} | {
        k: "personnage" for k in propres - du_monde}


# Reglages qui appartiennent au PERSONNAGE, jamais au catalogue d'un monde
# (ADR-0014 §2). Une tenue livree par le monde habillerait de la meme facon
# tous les personnages qui y naissent, et rendrait fausse la premiere mesure de
# verrou qui suit. Le format et le compte, eux, se deduisent de la fiche.
CHARACTER_ONLY_SCENE_KEYS = ("wardrobe", "pose", "format", "count", "variants")

# Cles d'overlay qu'une scene de personnage peut porter EN PLUS des cinq
# ci-dessus, quand elle reprend une scene du monde. Toutes restent des
# reglages de personnage (tons/tags/intensite/guidance) : jamais le cadre
# (label/intention/prompt), qui vient toujours de la scene du monde.
SCENE_OVERLAY_KEYS = CHARACTER_ONLY_SCENE_KEYS + ("tones", "tags", "intensity", "guidance")


# ADR-0027 : un monde livre des DECORS (`places`), des intentions, des SCENES
# (une intention dans un decor, avec ce qui s'y passe) et des tons.
CLE_PLACES = "places"
CLE_SCENES = "scenes"
# Branche ADULTE du monde (21/09, ADR-0027 §6) : des scenes, qui puisent dans
# les memes decors et les memes intentions que les autres. Separation de
# LIVRAISON, pas de sous-systeme (invariant 9) : un monde vendu peut porter
# cette branche ou non, et le vendeur livre alors le monde seul. C'est
# `scene_band` qui masque ensuite une scene hors de sa bande, jamais la liste
# dont elle sort. Un monde sans ce fichier rend [] sans que personne ait a le
# savoir.
SUFFIXE_ADULTE = ".adulte.json"

# Ce qu'un decor ne porte jamais (ADR-0027 §2) : il dit OU, pas quoi montrer.
PLACE_FORBIDDEN_KEYS = CHARACTER_ONLY_SCENE_KEYS + ("intention",)


def places(wid):
    """Decors du monde : id, label, et la description du decor (`prompt`).
    Plusieurs scenes, de plusieurs intentions, puisent dans le meme decor."""
    return _valider(wid, load_world(wid).get(CLE_PLACES, []), CLE_PLACES,
                    PLACE_FORBIDDEN_KEYS)


def scenes(wid):
    """Scenes du monde : une intention dans un decor, avec le texte de ce qui
    s'y passe et, au plus, le bas de sa bande de niveaux (`intensity`). Un
    personnage les produit telles quelles (ADR-0027 §5). Une scene de monde
    n'habille jamais le personnage : une tenue livree par le monde est une
    erreur explicite ici, pas un silence qui se propage."""
    return _valider(wid, load_world(wid).get(CLE_SCENES, []), CLE_SCENES)


def adulte_path(wid):
    """`WORLDS/<wid>.adulte.json`, present ou non."""
    return world_path(wid).with_name(f"{wid}{SUFFIXE_ADULTE}")


def scenes_adulte(wid):
    """Scenes de la branche adulte, [] si le monde n'en livre pas. Meme
    validation que les autres : la nudite n'est pas une garde-robe livree par
    le monde, c'est la garde-robe du personnage a son palier natif. Le monde
    doit exister ; seul le fichier a cote est optionnel."""
    load_world(wid)                       # leve si le monde n'existe pas
    chemin = adulte_path(wid)
    if not chemin.exists():
        return []
    return _valider(wid, _read_json(chemin).get(CLE_SCENES, []),
                    f"{CLE_SCENES} (adulte)")


def _valider(wid, entries, cle, interdites=CHARACTER_ONLY_SCENE_KEYS):
    entries = list(entries)
    for i, s in enumerate(entries):
        if not isinstance(s, dict):
            raise ValueError(f"monde {wid!r} : {cle}[{i}] n'est pas un objet")
        intrus = [k for k in interdites if k in s]
        if intrus:
            raise ValueError(
                f"monde {wid!r} : {cle} {s.get('id', i)!r} declare "
                f"{', '.join(intrus)} — ces reglages n'appartiennent pas a ce "
                f"catalogue de monde (ADR-0014, ADR-0027)")
    return entries


def scene(wid, scene_id):
    """Une scene du monde, branche ordinaire puis adulte. Leve
    UnknownSceneError si absente. Chercher dans les deux ne montre rien a
    personne : ce qui affiche une scene reste sa bande de niveaux."""
    for s in scenes(wid) + scenes_adulte(wid):
        if s.get("id") == scene_id:
            return s
    raise UnknownSceneError(f"scene inconnue : {scene_id!r} dans le monde {wid!r}")


def materialize(wid, s):
    """Prompt d'une scene du monde, compose avec son decor : « <scene>,
    <decor> ». C'est ici, en amont de `build_jobs`, que la scene se compose
    (ADR-0027 §4) : l'assembleur lit une scene deja composee. Leve
    UnknownPlaceError si le decor reference n'existe plus."""
    decor = ""
    if s.get("place"):
        trouve = [p for p in places(wid) if p.get("id") == s["place"]]
        if not trouve:
            raise UnknownPlaceError(
                f"decor inconnu : {s['place']!r} dans le monde {wid!r}")
        decor = trouve[0].get("prompt", "")
    return ", ".join(t for t in (s.get("prompt", "").strip(), decor.strip()) if t)


def _write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")


def _save_key(wid, cle, entries):
    """Reecrit UNE cle de WORLDS/<wid>.json, le reste du fichier intact —
    jamais depuis `POST /api/scenes`, toujours depuis une route monde dediee.
    La forme est verifiee par `api/services/worlds.py` ; ceci ecrit."""
    path = world_path(wid)
    data = _read_json(path)
    data[cle] = list(entries)
    _write(path, data)


def save_places(wid, new_places):
    _save_key(wid, CLE_PLACES, new_places)


def save_intentions(wid, new_intentions):
    _save_key(wid, "intentions", new_intentions)


def save_scenes(wid, new_scenes):
    _save_key(wid, CLE_SCENES, new_scenes)


def save_tones(wid, new_tones):
    """Le monde cree ses tons comme ses scenes (25/09,
    `DOCS/cadrage/2026-09-25-creer-un-ton.md`)."""
    _save_key(wid, "tones", new_tones)


def save_scenes_adulte(wid, new_scenes):
    """Jumelle de `save_scenes` pour `WORLDS/<wid>.adulte.json`. UNE LISTE
    VIDE RETIRE LE FICHIER : un monde sans branche adulte ne garde pas une
    coquille qui ferait croire a une branche."""
    load_world(wid)                       # leve si le monde n'existe pas
    path = adulte_path(wid)
    entries = list(new_scenes)
    if not entries:
        path.unlink(missing_ok=True)
        return
    data = _read_json(path) if path.exists() else {}
    data[CLE_SCENES] = entries
    _write(path, data)


def merge_scene(wid, scene_id, overlay):
    """La scene du monde, composee avec son decor et toujours relue depuis le
    catalogue actuel, plus l'OVERLAY du personnage (`SCENE_OVERLAY_KEYS`),
    recopie tel quel depuis `overlay`. L'`intensity` de la scene du monde est
    le defaut de l'overlay. Leve UnknownWorldError / UnknownSceneError /
    UnknownPlaceError : a l'appelant de decider quoi en faire.

    Seule une scene `origin == "world"` passe ici : une copie du personnage
    (`origin == "copy"`) garde son cadre, voir `refresh_scene_bank`."""
    s = scene(wid, scene_id)
    merged = {
        "id": overlay.get("id") or s["id"],
        "world": wid,
        "origin": "world",
        "world_ref": scene_id,
        "label": s.get("label", ""),
        "intention": s.get("intention", ""),
        "prompt": materialize(wid, s),
    }
    if "intensity" in s:
        merged["intensity"] = s["intensity"]
    for k in SCENE_OVERLAY_KEYS:
        if k in overlay:
            merged[k] = overlay[k]
    return merged


def refresh_scene_bank(data):
    """Relit depuis le monde le cadre de chaque scene REPRISE d'une banque de
    personnage (`origin == "world"` et un `world_ref`), en place, et rend
    `data`. Les overlays du personnage ne bougent pas.

    ADR-0027 §5 : une scene reprise suit le monde, une copie (`origin ==
    "copy"`, `world_ref` garde sa provenance) ne le suit plus, une scene
    propre (`manual`, `compose`) n'a rien a suivre. Appelee au chargement et
    a la sauvegarde de la Banque, ET a la lecture de la banque par
    `build_jobs` (`runner.prompt.load_scene_bank`) : une correction du monde
    atteint le lancement sans attendre qu'on rouvre la Banque.

    Une scene ou un decor disparus ne sont PAS une erreur ici : la scene
    reste telle quelle, et c'est le refus « prompt vide » de la Banque qui
    signale la rupture. Cette fonction ne repare rien, et ne fait jamais
    tomber toute une banque pour une reference pendante.
    """
    for s in data.get("scenes", []):
        if not isinstance(s, dict) or s.get("origin") != "world":
            continue
        wid, ref = s.get("world"), s.get("world_ref")
        if not wid or not ref:
            continue
        try:
            s.update(merge_scene(wid, ref, s))
        except (UnknownWorldError, UnknownSceneError, UnknownPlaceError):
            continue
    return data


def is_compatible(wid, family):
    """`family` figure-t-elle dans compatible_families du monde. Leve
    UnknownWorldError si le monde n'existe pas."""
    return family in compatible_families(wid)


def assert_compatible(wid, family):
    """Garde-fou : le monde doit etre compatible avec la famille deja resolue
    par (type, style). Sinon IncompatibleWorldError."""
    if not is_compatible(wid, family):
        raise IncompatibleWorldError(
            f"le monde {wid!r} n'est pas compatible avec la famille {family!r} — "
            f"compatible_families : {', '.join(compatible_families(wid)) or '(aucune)'}")


def worlds_for_family(family):
    """Ids des mondes proposables pour une famille de modele donnee (ordre
    alphabetique) — le filtre du wizard une fois le pack resolu."""
    return [w for w in list_worlds() if family in compatible_families(w)]


def _diagnostic():
    print("=" * 72)
    print("worlds - registre des mondes")
    print("=" * 72)
    ids = list_worlds()
    if not ids:
        print(f"aucun monde dans {WORLDS_DIR}")
        return 1

    familles_reelles = set()
    try:
        familles_reelles = {universe.model_family(u) for u in universe.list_universes()}
    except Exception as e:  # noqa: BLE001
        print(f"  (cross-check des familles indisponible : {type(e).__name__})")

    drift = 0
    for wid in ids:
        r = readiness(wid)
        pret = r["places"] and r["tones"] and r["style"]
        fam = compatible_families(wid)
        inconnues = [f for f in fam if familles_reelles and f not in familles_reelles]
        drift += len(inconnues)
        print(f"  {wid}")
        print(f"    label     : {label(wid)}")
        print(f"    familles  : {', '.join(fam) or '(aucune)'}"
              + (f"   <- inconnues : {', '.join(inconnues)}" if inconnues else ""))
        print(f"    styles    : {', '.join(suggested_styles(wid)) or '(aucun)'}")
        print(f"    readiness : places={r['places']} tones={r['tones']} style={r['style']}"
              + ("  -> pret a vendre" if pret else ""))
        print(f"    decors    : {len(places(wid))}   intentions : {len(intentions(wid))}"
              f"   scenes : {len(scenes(wid))} (+{len(scenes_adulte(wid))} adulte)")
    for fam in sorted(familles_reelles):
        print(f"\n  famille {fam:8} -> mondes : {', '.join(worlds_for_family(fam)) or '(aucun)'}")
    return 1 if drift else 0


if __name__ == "__main__":
    sys.exit(_diagnostic())
