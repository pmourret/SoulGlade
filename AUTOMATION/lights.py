# -*- coding: utf-8 -*-
"""Lights: a scene lighting reused from one scene to the next.

IT-10 chantier 7 — DOCS/cadrage/2026-09-26-it10-c7-lumieres.md.

WHAT A LIGHT IS. A label and a text (`{"key", "label", "text"}`): a sentence,
not an assembly. It acts through the prompt only; relighting through a graph
is on the horizon.

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
import layered_catalog
import worlds

FIELDS = ("label", "text")


class LightError(RuntimeError):
    """Refused on the lights side — message ready for the screen."""


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


def text(light):
    """The text of a light. RAISES on an empty one rather than returning it."""
    value = str(light.get("text") or "").strip()
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
    if "text" in fields:
        value = str(fields["text"] or "").strip()
        if not value:
            raise LightError("une lumière porte un texte")
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


def create(cid, label, light_text, to_world=False):
    return CATALOG.create(cid, label, {"text": light_text}, to_world)


def save(cid, key, fields, to_world=False):
    return CATALOG.save(cid, key, fields, to_world)


def delete(cid, key):
    return CATALOG.delete(cid, key)
