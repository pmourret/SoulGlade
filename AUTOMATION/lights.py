# -*- coding: utf-8 -*-
"""Lights: a scene lighting reused from one scene to the next.

IT-10 chantier 7 — DOCS/cadrage/2026-09-26-it10-c7-lumieres.md, and 7 bis
(the studio sheet) — DOCS/cadrage/2026-09-26-it10-c7bis-studio-lumiere.md.

WHAT A LIGHT IS. A label and a studio sheet (`setup`: source, direction,
quality, temperature, mood, effects), whose English sentence is composed at
launch from the platform vocabulary (`PLATFORM/lighting.json`, `compose`):
correcting a fragment there corrects every light that carries it. A light
written by hand keeps a `text`, which wins over its sheet. It acts through the
prompt only; relighting through a graph is on the horizon.

HOW A SCENE WEARS IT. Two places, both strings:
- `light`, the scene's own field, apart from `prompt`: free text, or
  `@<key>` for a light of the catalogue;
- a line of `variants` — one extra image each — may also be `@<key>`.

WHERE IT RESOLVES. Upstream of the assembler, right after the place
(ADR-0027 §4): `build_jobs` calls `resolve_bank` on the bank it has just
read and composed, and receives scenes whose `light` and variants are text.
The assembler places the light after the place — « <text>, <place>, <light> »
— and a VARIANT OF A SCENE THAT CARRIES A LIGHT TAKES ITS PLACE (7 bis): « same
scene, evening light » is lit once, not twice. Three guarantees, locked by
tests/test_lights.py (invariant 3): a bank without `light` and without `@` in
its variants comes out unchanged, variants at the end of the prompt as
before; a scene carrying `light` assembles to the byte like the same scene
with that text at the end of its prompt; its variant replaces that text.

A DANGLING REFERENCE IS AN ERROR naming the scene, never a light that
silently disappears from the render.

WHO OWNS. The world owns, the character overrides, field by field
(`layered_catalog.Catalog`, the mechanism the outfits wrote first).

THE USER'S OWN EFFECTS. An effect the platform does not ship is created in
the workshop — a French label, an English fragment, `{color}` where a colour
goes — in a second layered catalogue, `light_effects` (`EFFECTS`). A sheet
offers them next to the platform's; an effect a light carries is not deleted.
"""
import json
from pathlib import Path

import layered_catalog
import worlds

FIELDS = ("label", "text", "setup")
VOCABULARY_PATH = Path(__file__).resolve().parents[1] / "PLATFORM" / "lighting.json"
# The order the head of the sentence reads in: « soft warm window light from
# the side ». The screen composes the same way (lib/lightCompose.ts).
HEAD = ("quality", "temperature", "source", "direction")
COLOR = "{color}"


class LightError(RuntimeError):
    """Refused on the lights side — message ready for the screen."""


# ------------------------------------------------------------ the sheet (pure)
def vocabulary():
    """The platform's lighting vocabulary, the same for everyone."""
    data = json.loads(VOCABULARY_PATH.read_text(encoding="utf-8"))
    return {k: v for k, v in data.items() if not k.startswith("_")}


def _option(vocab, setting, value):
    for s in vocab["settings"]:
        if s["key"] == setting:
            o = next((o for o in s["options"] if o["key"] == value), None)
            if o is None:
                raise LightError(f"{s['label'].lower()} inconnue : « {value} »")
            return o["fragment"]
    raise LightError(f"réglage inconnu : « {setting} »")


def color_text(vocab, color):
    """A palette key becomes its fragment; anything else is the user's own
    words (« deep violet »)."""
    color = str(color or "").strip()
    entry = next((c for c in vocab["palette"] if c["key"] == color), None)
    return entry["fragment"] if entry else color


def compose(setup, effects=(), vocab=None):
    """The English sentence of a studio sheet.

    « <quality> <temperature> <source> <direction>, <mood>, <effect>, ... »;
    an unset setting drops out. `effects` are the user's own effects
    (`light_effects` catalogue), offered next to the platform's. An unknown
    setting or effect RAISES: a light never loses a part of itself silently."""
    vocab = vocab or vocabulary()
    if not isinstance(setup, dict):
        raise LightError("la fiche d'une lumière est un objet")
    pick = {k: _option(vocab, k, setup[k]) if setup.get(k) else ""
            for k in (*HEAD, "mood")}
    head = ""
    if any(pick[k] for k in HEAD):
        head = " ".join(t for t in (pick["quality"], pick["temperature"],
                                    pick["source"] or "light", pick["direction"]) if t)
    known = {e["key"]: e for e in [*vocab["effects"], *effects] if isinstance(e, dict)}
    parts = [head, pick["mood"]]
    for chosen in setup.get("effects") or []:
        key = chosen.get("key") if isinstance(chosen, dict) else None
        effect = known.get(key)
        if effect is None:
            raise LightError(f"effet inconnu : « {key} »")
        fragment = str(effect.get("fragment") or "")
        fragment = fragment.replace(COLOR, color_text(vocab, chosen.get("color")))
        parts.append(" ".join(fragment.split()))
    return ", ".join(t for t in parts if t)


# ------------------------------------------------------------ resolution (pure)
def references(scene):
    """Light keys a scene refers to, in order: its `light`, then its
    variants."""
    keys = []
    for line in [scene.get("light"), *(scene.get("variants") or [])]:
        if layered_catalog.is_reference(line):
            key = layered_catalog.key_of(line)
            if key not in keys:
                keys.append(key)
    return keys


def text(light, effects=()):
    """The text of a light: the one written by hand, else its composed sheet.
    RAISES on an empty one rather than returning it."""
    value = str(light.get("text") or "").strip()
    if not value and light.get("setup"):
        value = compose(light["setup"], effects)
    if not value:
        raise LightError(f"lumière « {light.get('label') or light.get('key')} » : "
                         f"aucun texte")
    return value


def resolve(line, lights, effects=()):
    """A free line comes back as is; `@<key>` becomes the text of its light.
    `effects` are the user's own effects its sheet may carry."""
    if not layered_catalog.is_reference(line):
        return line
    key = layered_catalog.key_of(line)
    light = next((l for l in lights or [] if isinstance(l, dict) and l.get("key") == key),
                 None)
    if light is None:
        raise LightError(f"lumière inconnue : « {key} »")
    return text(light, effects)


def resolve_scene(scene, lights, effects=()):
    """A copy of the scene whose variants and `light` are text — kept apart
    from the prompt, so that a variant can take the light's place
    (`build_jobs`). An empty `light` is dropped: the scene carries none.
    Without `light` nor reference, equal to the input."""
    out = dict(scene)
    if "variants" in out and isinstance(out["variants"], list):
        out["variants"] = [resolve(v, lights, effects) for v in out["variants"]]
    if "light" in out:
        light = str(resolve(out.pop("light"), lights, effects) or "").strip()
        out["prompt"] = str(out.get("prompt") or "").strip()
        if light:
            out["light"] = light
    return out


def resolve_bank(data, lights, effects=()):
    """Resolves, in place, the light of every scene of the bank, and returns
    `data`. The error names the scene."""
    scenes = data.get("scenes", [])
    for i, s in enumerate(scenes):
        if not isinstance(s, dict) or ("light" not in s and not references(s)):
            continue
        try:
            scenes[i] = resolve_scene(s, lights, effects)
        except LightError as e:
            raise LightError(f"scène {s.get('id')!r} : {e}") from e
    return data


# ------------------------------------------------------------- catalogue (I/O)
def _resolver(cid):
    effects = EFFECTS.merged(cid)
    return lambda light: text(light, effects)


def _effects_for(cid, to_world):
    """The user's effects a sheet may carry: its world's for a world light —
    a character's own effect would not resolve for the others."""
    if not to_world:
        return EFFECTS.merged(cid)
    wid = CATALOG.world_of(cid)
    return worlds.catalog(wid, worlds.CLE_LIGHT_EFFECTS) if wid else []


def _validate(cid, fields, to_world):
    if "setup" in fields:
        compose(fields["setup"], _effects_for(cid, to_world))
    if "text" in fields:
        # empty = back to the sheet: the sentence is composed again
        value = str(fields["text"] or "").strip()
        if layered_catalog.is_reference(value):
            raise LightError(f"le texte d'une lumière ne commence pas par "
                             f"« {layered_catalog.MARKER} »")
        fields = {**fields, "text": value}
    return fields


CATALOG = layered_catalog.Catalog(
    worlds.CLE_LIGHTS, "lumière", LightError, FIELDS,
    resolver=_resolver, validate=_validate,
    uses=lambda scene, key: key in references(scene))


# ------------------------------------------------------ the user's own effects
EFFECT_FIELDS = ("label", "fragment")


def effect_text(effect):
    value = str(effect.get("fragment") or "").strip()
    if not value:
        raise LightError(f"effet « {effect.get('label') or effect.get('key')} » : "
                         f"aucun fragment")
    return value


def _validate_effect(cid, fields, to_world):
    if "fragment" in fields:
        from runner.prompt import FORBIDDEN_FACE     # runner.prompt imports this module
        value = " ".join(str(fields["fragment"] or "").split())
        if not value:
            raise LightError("un effet porte un fragment")
        if layered_catalog.is_reference(value):
            raise LightError(f"le fragment d'un effet ne commence pas par "
                             f"« {layered_catalog.MARKER} »")
        face = FORBIDDEN_FACE.search(value)
        if face:
            raise LightError(f"ce fragment décrit le visage (« {face.group(0)} ») : "
                             f"c'est le verrou d'identité qui le porte")
        fields = {**fields, "fragment": value}
    return fields


def _lights_carrying(cid, key, to_world=False):
    """« <character>/<light> » of every light whose sheet carries the effect:
    this character's, or its whole world's when the effect comes from it."""
    return [f"{c}/{light.get('key')}" for c in CATALOG.concerned(cid, to_world)
            for light in CATALOG.merged(c)
            if any(isinstance(e, dict) and e.get("key") == key
                   for e in (light.get("setup") or {}).get("effects") or [])]


EFFECTS = layered_catalog.Catalog(
    worlds.CLE_LIGHT_EFFECTS, "effet", LightError, EFFECT_FIELDS,
    resolver=lambda cid: effect_text, validate=_validate_effect,
    masculine=True, in_use=_lights_carrying, holder="lumière",
    reserved=lambda: [e["key"] for e in vocabulary()["effects"]])


def merged(cid):
    """The lights this character sees, what the resolution reads."""
    return CATALOG.merged(cid)


def catalog(cid):
    """Every light with its layer and its text (or its error)."""
    return CATALOG.listing(cid)


def create(cid, label, light_text="", to_world=False, setup=None):
    """A light carries a sheet, a text written by hand, or both (the text
    wins)."""
    light_text = str(light_text or "").strip()
    if not light_text and not setup:
        raise LightError("une lumière porte une fiche ou un texte")
    fields = {"setup": setup} if setup else {}
    if light_text:
        fields["text"] = light_text
    return CATALOG.create(cid, label, fields, to_world)


def save(cid, key, fields, to_world=False):
    return CATALOG.save(cid, key, fields, to_world)


def delete(cid, key):
    return CATALOG.delete(cid, key)


def effects(cid):
    """The user's own effects, with their layer."""
    return EFFECTS.listing(cid)


def create_effect(cid, label, fragment, to_world=False):
    return EFFECTS.create(cid, label, {"fragment": fragment}, to_world)


def save_effect(cid, key, fields, to_world=False):
    return EFFECTS.save(cid, key, fields, to_world)


def delete_effect(cid, key):
    return EFFECTS.delete(cid, key)
