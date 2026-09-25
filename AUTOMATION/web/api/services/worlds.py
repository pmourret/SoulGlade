"""Rules of the world catalog: what a save of `places` may contain.

Reduced mirror of `services/bank.py`'s `validate_scene_bank` — a catalog has
no previous-version comparison (no batch-erasure guard) because losing a
place in a save is not the incident a scene bank has: a place is a shared
frame, not per-character creative metadata that can vanish unnoticed under a
frontend rebuild.

Also the tones of a world (25/09): what a save of `tones` may contain.

No HTTP here: the router catches the returned problems and decides the
status (`.claude/rules/backend.md`, routers -> services -> worlds).
"""
import re

import expression
import worlds


def validate_places(data):
    """Returns the list of a places payload's problems. Empty list = good.

    Mirrors the checks `worlds.places()` already runs on load (no
    CHARACTER_ONLY_SCENE_KEYS, ADR-0014 §2) plus what a WRITE needs that a
    read does not: unique, non-empty ids, and a non-empty prompt — an empty
    one would make `merge_scene()` hand back a scene `validate_scene_bank`
    refuses far from the world screen that caused it.
    """
    if not isinstance(data, list):
        return ["« places » doit être une liste"]
    problems = []
    seen = set()
    for i, p in enumerate(data):
        if not isinstance(p, dict):
            problems.append(f"lieu #{i + 1} : ce n'est pas un objet")
            continue
        pid = str(p.get("id") or "").strip()
        where = pid or f"lieu #{i + 1}"
        if not pid:
            problems.append(f"{where} : « id » manquant")
        elif pid in seen:
            problems.append(f"{where} : identifiant en double")
        seen.add(pid)
        if not str(p.get("prompt") or "").strip():
            problems.append(f"{where} : « prompt » vide")
        intrus = [k for k in worlds.CHARACTER_ONLY_SCENE_KEYS if k in p]
        if intrus:
            problems.append(f"{where} : {', '.join(intrus)} — un catalogue de "
                            f"monde n'habille pas ses lieux, ces réglages "
                            f"appartiennent au personnage (ADR-0014)")
    return problems


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
