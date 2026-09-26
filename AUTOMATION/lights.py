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
read and composed, and the assembler receives a scene whose prompt already
ends with its light — « <text>, <place>, <light> » — and whose variants are
text. Two guarantees, locked by tests/test_lights.py (invariant 3): a bank
without `light` and without `@` in its variants comes out unchanged; a scene
carrying `light` assembles to the byte like the same scene with that text at
the end of its prompt.

A DANGLING REFERENCE IS AN ERROR naming the scene, never a light that
silently disappears from the render.

WHO OWNS. The world owns, the character overrides, field by field
(`layered_catalog.Catalog`, the mechanism the outfits wrote first).
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


def resolve(line, lights):
    """A free line comes back as is; `@<key>` becomes the text of its light."""
    if not layered_catalog.is_reference(line):
        return line
    key = layered_catalog.key_of(line)
    light = next((l for l in lights or [] if isinstance(l, dict) and l.get("key") == key),
                 None)
    if light is None:
        raise LightError(f"lumière inconnue : « {key} »")
    return text(light)


def resolve_scene(scene, lights):
    """A copy of the scene whose variants are text and whose `light` has
    joined the end of its prompt. Without `light` nor reference, equal to the
    input."""
    out = dict(scene)
    if "variants" in out and isinstance(out["variants"], list):
        out["variants"] = [resolve(v, lights) for v in out["variants"]]
    if "light" in out:
        light = str(resolve(out.pop("light"), lights) or "").strip()
        out["prompt"] = ", ".join(t for t in (str(out.get("prompt") or "").strip(), light)
                                  if t)
    return out


def resolve_bank(data, lights):
    """Resolves, in place, the light of every scene of the bank, and returns
    `data`. The error names the scene."""
    scenes = data.get("scenes", [])
    for i, s in enumerate(scenes):
        if not isinstance(s, dict) or ("light" not in s and not references(s)):
            continue
        try:
            scenes[i] = resolve_scene(s, lights)
        except LightError as e:
            raise LightError(f"scène {s.get('id')!r} : {e}") from e
    return data


# ------------------------------------------------------------- catalogue (I/O)
def _resolver(cid):
    return text


def _validate(cid, fields, to_world):
    if "setup" in fields:
        compose(fields["setup"])
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
