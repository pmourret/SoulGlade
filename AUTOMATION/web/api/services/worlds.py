"""Rules of the world catalogs: what a save of `places`, `intentions` or
`scenes` may contain.

Reduced mirror of `services/bank.py`'s `validate_scene_bank` — a catalog has
no previous-version comparison (no batch-erasure guard) because losing a
place in a save is not the incident a scene bank has: a place is a shared
frame, not per-character creative metadata that can vanish unnoticed under a
frontend rebuild. A scene's decor is a place of the SAME world (ADR-0027).

Also the tones of a world (25/09): what a save of `tones` may contain.

No HTTP here: the router catches the returned problems and decides the
status (`.claude/rules/backend.md`, routers -> services -> worlds).
"""
import re

import expression
import worlds


def validate_scenes(wid, data):
    """Returns the list of a world scenes payload's problems. Empty = good.

    Mirrors the checks `worlds.scenes()` already runs on load (no
    CHARACTER_ONLY_SCENE_KEYS, ADR-0014 §2) plus what a WRITE needs that a
    read does not: unique, non-empty ids; a non-empty prompt — an empty one
    would make `merge_scene()` hand back a scene `validate_scene_bank`
    refuses far from the world screen that caused it; a `place` and an
    `intention` that the world declares (a typo would otherwise create an
    intention nothing declares, and an export folder named after it); and an
    `intensity`, if any, that is a level.
    """
    if not isinstance(data, list):
        return ["« scenes » doit être une liste"]
    decors = {p.get("id") for p in worlds.places(wid)}
    intentions = {i.get("key") for i in worlds.intentions(wid)}
    problems = []
    seen = set()
    for i, p in enumerate(data):
        if not isinstance(p, dict):
            problems.append(f"scène #{i + 1} : ce n'est pas un objet")
            continue
        pid = str(p.get("id") or "").strip()
        where = pid or f"scène #{i + 1}"
        if not pid:
            problems.append(f"{where} : « id » manquant")
        elif not worlds.ID_RE.match(pid):
            problems.append(f"{where} : l'identifiant ne prend que des minuscules, "
                            f"chiffres, « - » et « _ », et commence par une lettre")
        elif pid in seen:
            problems.append(f"{where} : identifiant en double")
        seen.add(pid)
        if not str(p.get("prompt") or "").strip():
            problems.append(f"{where} : « prompt » vide")
        if p.get("place") and p["place"] not in decors:
            problems.append(f"{where} : décor inconnu dans ce monde : {p['place']!r}")
        if p.get("intention") and p["intention"] not in intentions:
            problems.append(f"{where} : intention inconnue dans ce monde : "
                            f"{p['intention']!r}")
        lvl = p.get("intensity")
        if lvl is not None and (isinstance(lvl, bool) or not isinstance(lvl, int)
                                or lvl < 0):
            problems.append(f"{where} : « intensity » doit être un niveau (entier ≥ 0)")
        intrus = [k for k in worlds.CHARACTER_ONLY_SCENE_KEYS if k in p]
        if intrus:
            problems.append(f"{where} : {', '.join(intrus)} — un monde "
                            f"n'habille pas ses scènes, ces réglages "
                            f"appartiennent au personnage (ADR-0014)")
    return problems


def _used_by(wid, field):
    """Scenes of the world (ordinary and adult) by the value of `field`."""
    out = {}
    for s in worlds.scenes(wid) + worlds.scenes_adulte(wid):
        if s.get(field):
            out.setdefault(s[field], []).append(s.get("id", "?"))
    return out


def _still_used(wid, field, kept, noun):
    """A place or an intention a scene uses cannot leave the world: the scene
    would lose its decor (`materialize` raises) or refuse its next save
    (`validate_scenes`). The server says which scenes, the screen shows it."""
    return [f"{noun} « {key} » sert encore aux scènes {', '.join(sorted(ids))} : "
            f"change-les d'abord"
            for key, ids in _used_by(wid, field).items() if key not in kept]


def validate_places(wid, data):
    """Returns the list of a places (decors) payload's problems. Empty = good.

    A place is a decor only (ADR-0027 §2): id, label, the decor text. It never
    carries an intention, an action or a character setting."""
    if not isinstance(data, list):
        return ["« places » doit être une liste"]
    problems, seen = [], set()
    for i, p in enumerate(data):
        if not isinstance(p, dict):
            problems.append(f"lieu #{i + 1} : ce n'est pas un objet")
            continue
        pid = str(p.get("id") or "").strip()
        where = pid or f"lieu #{i + 1}"
        if not pid:
            problems.append(f"{where} : « id » manquant")
        elif not worlds.ID_RE.match(pid):
            problems.append(f"{where} : l'identifiant ne prend que des minuscules, "
                            f"chiffres, « - » et « _ », et commence par une lettre")
        elif pid in seen:
            problems.append(f"{where} : identifiant en double")
        seen.add(pid)
        if not str(p.get("prompt") or "").strip():
            problems.append(f"{where} : le décor est vide")
        intrus = [k for k in worlds.PLACE_FORBIDDEN_KEYS if k in p]
        if intrus:
            problems.append(f"{where} : {', '.join(intrus)} — un lieu est un décor, "
                            f"il ne porte ni intention ni réglage de personnage")
    return problems + _still_used(wid, "place", seen, "lieu")


_INTENTION_FIELDS = {"key", "label", "icon", "prompt_add", "defaults"}


def validate_intentions(wid, data):
    """Returns the list of an intentions payload's problems. Empty = good.

    An intention is what one wants to show, at every level (ADR-0027 §3): no
    level, no format. Its key is written into scenes, the base and an export
    folder, so it is a stable slug, like a tone's."""
    if not isinstance(data, list):
        return ["« intentions » doit être une liste"]
    tones = {t.get("key") for t in worlds.tones(wid)}
    problems, seen = [], set()
    for i, it in enumerate(data):
        if not isinstance(it, dict):
            problems.append(f"intention #{i + 1} : ce n'est pas un objet")
            continue
        key = it.get("key")
        where = key if isinstance(key, str) and key else f"intention #{i + 1}"
        if not isinstance(key, str) or not key:
            problems.append(f"{where} : « key » manquante")
        elif not _TONE_KEY_RE.match(key):
            problems.append(f"{where} : la clé ne prend que des minuscules, "
                            f"chiffres et « _ »")
        elif key in seen:
            problems.append(f"{where} : clé en double")
        seen.add(key)
        for field in ("label", "icon", "prompt_add"):
            if field in it and not isinstance(it[field], str):
                problems.append(f"{where} : « {field} » doit être un texte")
        unknown = [k for k in it if k not in _INTENTION_FIELDS and not k.startswith("_")]
        if unknown:
            problems.append(f"{where} : champ(s) inconnu(s) {', '.join(unknown)} — une "
                            f"intention ne porte ni niveau ni format")
        defaults = it.get("defaults")
        if defaults is not None:
            if not isinstance(defaults, dict) or set(defaults) - {"tone"}:
                problems.append(f"{where} : « defaults » ne porte que le ton proposé")
            elif defaults.get("tone") and defaults["tone"] not in tones:
                problems.append(f"{where} : ton inconnu dans ce monde : "
                                f"{defaults['tone']!r}")
    return problems + _still_used(wid, "intention", seen, "intention")


_TONE_KEY_RE = re.compile(r"^[a-z0-9_]+$")
_TONE_FIELDS = {"key", "label", "prompt_add", "expression"}


def validate_tones(data):
    """Returns the list of a world tones payload's problems. Empty list = good.

    A key is the tone's identity: it is written into scenes (`tones`),
    journal rows and export manifests, so it must be a stable slug and
    unique. The prompt fragment may be empty — a tone can carry only an
    expression. An expression range is checked against the node's own
    bounds (`expression.BORNES`), the same ones the tones workshop draws.
    Keys starting with `_` are notes and pass through untouched.
    """
    if not isinstance(data, list):
        return ["« tones » doit être une liste"]
    problems = []
    seen = set()
    for i, t in enumerate(data):
        if not isinstance(t, dict):
            problems.append(f"ton #{i + 1} : ce n'est pas un objet")
            continue
        key = t.get("key")
        where = key if isinstance(key, str) and key else f"ton #{i + 1}"
        if not isinstance(key, str) or not key:
            problems.append(f"{where} : « key » manquante")
        elif not _TONE_KEY_RE.match(key):
            problems.append(f"{where} : la clé ne prend que des minuscules, "
                            f"chiffres et « _ »")
        elif key in seen:
            problems.append(f"{where} : clé en double")
        seen.add(key)
        for field in ("label", "prompt_add"):
            if field in t and not isinstance(t[field], str):
                problems.append(f"{where} : « {field} » doit être un texte")
        unknown = [k for k in t if k not in _TONE_FIELDS and not k.startswith("_")]
        if unknown:
            problems.append(f"{where} : champ(s) inconnu(s) {', '.join(unknown)}")
        problems += [f"{where} : {p}" for p in _expression_problems(t.get("expression"))]
    return problems


def _expression_problems(expr):
    if expr is None:
        return []
    if not isinstance(expr, dict):
        return ["« expression » doit être un objet"]
    problems = []
    for name, bounds in expr.items():
        if name not in expression.BORNES:
            problems.append(f"paramètre d'expression inconnu : {name}")
            continue
        lo, hi = expression.BORNES[name]
        if (not isinstance(bounds, (list, tuple)) or len(bounds) != 2
                or not all(isinstance(v, (int, float)) for v in bounds)):
            problems.append(f"{name} : attendu [min, max]")
        elif not lo <= bounds[0] <= bounds[1] <= hi:
            problems.append(f"{name} : [{bounds[0]}, {bounds[1]}] hors de "
                            f"[{lo}, {hi}] ou inversé")
    return problems
