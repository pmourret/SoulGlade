# -*- coding: utf-8 -*-
"""Layered catalogues: entries a world owns and a character overrides.

IT-10 chantier 7 — DOCS/cadrage/2026-09-26-it10-c7-lumieres.md. The outfits
(chantier 6) wrote this mechanism first; the lights reuse it instead of
copying it, and `tests/test_tenues.py` guards the extraction.

WHAT A CATALOGUE IS. A list of `{"key", "label", ...}` entries, in
`WORLDS/<id>.json / <world_key>` for the world and in
`creative.json / <world_key>` for the character. The character sees the world
entries merged field by field with its own (`worlds.merge_catalog`,
ADR-0019): it adjusts a world entry without copying it, and goes back to the
world by dropping its override.

WHAT STAYS WITH EACH CATALOGUE. What an entry holds and how it reads as text
(`resolver`), which fields may be written and how they are checked
(`validate`), and how a scene refers to an entry (`uses`). A reference is
`@<key>` in a scene string (`MARKER`), shared by every catalogue so that one
rule reads them all.

Error messages are French, for the screen, and take the catalogue's noun,
which they agree with: feminine by default (« tenue », « lumière »),
`masculine=True` for « effet » (chantier 7 bis).

WHAT HOLDS AN ENTRY. Scenes, by default: an entry a scene refers to is not
deleted. A catalogue whose entries are held by something else (an effect, by
the lights whose sheet carries it) passes `in_use` and its `holder` noun.
"""
import json
import re
import unicodedata

import worlds

MARKER = "@"
LAYERS = ("monde", "surcharge", "personnage")


def is_reference(line):
    return isinstance(line, str) and line.strip().startswith(MARKER)


def key_of(line):
    return line.strip()[len(MARKER):].strip()


def slug(text):
    ascii_ = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_.lower()).strip("-")[:40]


class Catalog:
    """One layered catalogue.

    - `world_key`: its key in the world file and in creative.json;
    - `noun`: what an entry is called on screen (feminine, see the module);
    - `error`: the exception class raised, its message ready for the screen;
    - `fields`: the fields a save may write, `label` included;
    - `resolver(cid)`: a function entry -> text, raising `error`;
    - `validate(cid, fields, to_world)`: the checked fields, raising `error`;
    - `uses(scene, key)`: whether a scene refers to the entry `key`;
    - `in_use(cid, key, to_world)`: « <character>/<holder> » of what holds the
      entry, `scenes_using` by default, and `holder` what that is called;
    - `reserved()`: keys a new entry never takes (the platform's own).
    """

    def __init__(self, world_key, noun, error, fields, resolver, validate, uses=None,
                 masculine=False, in_use=None, holder="scène", reserved=tuple):
        self.world_key = world_key
        self.noun = noun
        self.error = error
        self.fields = tuple(fields)
        self.resolver = resolver
        self.validate = validate
        self.uses = uses
        self.in_use = in_use or self.scenes_using
        self.holder = holder
        self.reserved = reserved   # keys a new entry never takes (callable)
        # agreement: « tenue inconnue », « effet inconnu »
        self.e, self.a, self.the = ("", "un", "le") if masculine else ("e", "une", "la")

    # `runner` is imported inside the methods: `runner.prompt` imports the
    # catalogues to resolve a bank before assembling it.
    @staticmethod
    def world_of(cid):
        import runner as lb
        wid = lb.character_world(cid)
        return wid if wid and worlds.exists(wid) else None

    def own(self, cid):
        """(creative.json path, raw content, own entries) — the UNMERGED view,
        the only one that tells what belongs to the character."""
        import runner as lb
        path = lb.creative_path(cid)
        raw = lb.load_json(path) if path.exists() else {}
        return path, raw, list(raw.get(self.world_key, []))

    def write_own(self, path, raw, entries):
        raw[self.world_key] = entries
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")

    def merged(self, cid):
        """The entries this character sees, without layer nor text."""
        wid = self.world_of(cid)
        _, _, own = self.own(cid)
        return worlds.merge_catalog(wid, self.world_key, own) if wid else list(own)

    def listing(self, cid):
        """Every entry with its layer (`monde`, `surcharge`, `personnage`) and
        its resolved text — or the error that prevents it, so that the
        workshop shows it instead of a wrong text."""
        wid = self.world_of(cid)
        _, _, own = self.own(cid)
        layers = worlds.catalog_layers(wid, self.world_key, own)
        text_of = self.resolver(cid)
        out = []
        for entry in self.merged(cid):
            try:
                text, error = text_of(entry), ""
            except self.error as e:
                text, error = "", str(e)
            out.append({**entry, "couche": layers.get(entry.get("key"), "personnage"),
                        "texte": text, "erreur": error})
        return out

    def find(self, cid, key):
        entry = next((e for e in self.listing(cid) if e.get("key") == key), None)
        if entry is None:
            raise self.error(f"{self.noun} inconnu{self.e} : « {key} »")
        return entry

    def _label(self, label):
        label = str(label or "").strip()
        if not label:
            raise self.error(f"{self.a} {self.noun} porte un libellé")
        return label

    def create(self, cid, label, fields, to_world=False):
        """A new entry, on the character or on its world. Returns its sheet."""
        label = self._label(label)
        wid = self.world_of(cid)
        if to_world and not wid:
            raise self.error(f"ce personnage n'a pas de monde : {self.the} {self.noun} "
                             f"ne peut appartenir qu'à lui")
        fields = self.validate(cid, dict(fields), to_world)
        taken = {e.get("key") for e in self.merged(cid)} | set(self.reserved())
        base = slug(label) or slug(self.noun)
        key, n = base, 1
        while key in taken:
            n += 1
            key = f"{base}-{n}"
        entry = {"key": key, "label": label, **fields}
        if to_world:
            worlds.save_catalog(wid, self.world_key,
                                worlds.catalog(wid, self.world_key) + [entry])
        else:
            path, raw, own = self.own(cid)
            self.write_own(path, raw, own + [entry])
        return self.find(cid, key)

    def save(self, cid, key, fields, to_world=False):
        """Writes some fields of an entry.

        On the CHARACTER side by default: a world entry gains an override that
        carries only the adjusted fields. `to_world` corrects the world's own
        entry — refused on an entry the world does not own."""
        unknown = [f for f in fields if f not in self.fields]
        if unknown:
            raise self.error(f"champ non ajustable : {', '.join(unknown)}")
        fields = dict(fields)
        if "label" in fields:
            fields["label"] = self._label(fields["label"])
        fields = {**fields, **self.validate(
            cid, {k: v for k, v in fields.items() if k != "label"}, to_world)}
        entry = self.find(cid, key)
        if to_world:
            if entry["couche"] == "personnage":
                raise self.error(f"« {entry.get('label') or key} » appartient au "
                                 f"personnage, pas au monde")
            wid = self.world_of(cid)
            worlds.save_catalog(wid, self.world_key,
                                [{**e, **fields} if e.get("key") == key else e
                                 for e in worlds.catalog(wid, self.world_key)])
            return self.find(cid, key)
        path, raw, own = self.own(cid)
        for i, e in enumerate(own):
            if e.get("key") == key:
                own[i] = {**e, **fields}
                break
        else:
            own.append({"key": key, **fields})
        self.write_own(path, raw, own)
        return self.find(cid, key)

    def concerned(self, cid, to_world):
        """The characters an entry of this layer reaches: this one alone, or
        every character of its world."""
        import runner as lb
        if not to_world:
            return [cid]
        wid = self.world_of(cid)
        return [c for c in lb.list_characters() if lb.character_world(c) == wid]

    def scenes_using(self, cid, key, to_world=False):
        """« <character>/<scene> » of every scene that refers to `key`: this
        character's, or its whole world's when the entry comes from it."""
        import runner as lb
        out = []
        for c in self.concerned(cid, to_world):
            path = lb.scenes_path(c)
            if path.exists():
                out += [f"{c}/{s.get('id')}" for s in lb.load_json(path).get("scenes", [])
                        if isinstance(s, dict) and self.uses(s, key)]
        return out

    def delete(self, cid, key):
        """Removes an entry from the layer it lives in, and returns that layer.

        - `personnage`: the entry goes;
        - `surcharge`: only the adjustments go, the world entry comes back;
        - `monde`: the entry leaves the world.

        Refused while something holds it — a scene by default (precedent of
        the place a scene uses, IT-11 chantier 4). A dropped override is not
        concerned: the entry stays, only its version changes."""
        entry = self.find(cid, key)
        layer = entry["couche"]
        if layer != "surcharge":
            used = self.in_use(cid, key, to_world=layer == "monde")
            if used:
                raise self.error(f"« {entry.get('label') or key} » est porté{self.e} par "
                                 f"{len(used)} {self.holder}(s) : {', '.join(used)} — "
                                 f"{self.the} retirer de ces {self.holder}s d'abord")
        if layer == "monde":
            wid = self.world_of(cid)
            worlds.save_catalog(wid, self.world_key,
                                [e for e in worlds.catalog(wid, self.world_key)
                                 if e.get("key") != key])
            return layer
        path, raw, own = self.own(cid)
        self.write_own(path, raw, [e for e in own if e.get("key") != key])
        return layer
