"""Payload shapes of the world catalog module (ADR-0027).

A world's catalogs are a WORLD resource, not a character one: these routes read and
write `WORLDS/<id>.json`, never `CHARACTERS/<id>/scenes.json`. That split is
the isolation guarantee — see `api/services/worlds.py`.
"""
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class WorldPlace(BaseModel):
    """One place of a world: a decor only (ADR-0027 §2)."""
    model_config = ConfigDict(extra="allow")

    id: str
    label: str = ""
    prompt: str


class WorldPlacesResponse(BaseModel):
    world: str
    label: str
    places: list[WorldPlace]


class SaveWorldPlacesRequest(BaseModel):
    """Shape checked in `services/worlds.validate_places`."""
    model_config = ConfigDict(extra="allow")

    places: list[dict[str, Any]] = Field(default_factory=list)


class WorldIntentionDefaults(BaseModel):
    tone: Optional[str] = None


class WorldIntention(BaseModel):
    """One intention of a world: what one wants to show, at every level
    (ADR-0027 §3). At most one proposed tone."""
    model_config = ConfigDict(extra="allow")

    key: str
    label: str = ""
    icon: str = ""
    prompt_add: str = ""
    defaults: Optional[WorldIntentionDefaults] = None


class WorldIntentionsResponse(BaseModel):
    world: str
    label: str
    intentions: list[WorldIntention]


class SaveWorldIntentionsRequest(BaseModel):
    """Shape checked in `services/worlds.validate_intentions`."""
    model_config = ConfigDict(extra="allow")

    intentions: list[dict[str, Any]] = Field(default_factory=list)


class WorldScene(BaseModel):
    """One scene of a world (ADR-0027 §4): an intention in a place (`place`,
    a décor id), with what happens there (`prompt`) and at most the bottom of
    its level band. Never a wardrobe. `extra="allow"` for the same reason as
    `SceneMeta`: this layer relays a file it does not own."""
    model_config = ConfigDict(extra="allow")

    id: str
    label: str = ""
    intention: str = ""
    place: Optional[str] = None
    prompt: str
    intensity: Optional[int] = None


class WorldScenesResponse(BaseModel):
    world: str
    label: str
    scenes: list[WorldScene]


class SaveWorldScenesRequest(BaseModel):
    """The business shape (unique ids, non-empty prompt, no character-only
    key) is validated in `services/worlds.py`, not here — same reasoning as
    `SceneBankSaveRequest`: this is a FILE that belongs to the world, not a
    request payload the schema layer should own the rules of."""
    model_config = ConfigDict(extra="allow")

    scenes: list[dict[str, Any]] = Field(default_factory=list)


class CatalogRejected(BaseModel):
    """400 of a refused save. `erreur` is the first problem — what the screen
    shows; `problemes` is the whole list, for the details panel."""
    ok: bool = False
    erreur: str
    problemes: list[str] = Field(default_factory=list)


class WorldTone(BaseModel):
    """One tone of a world's catalog (25/09): key, label, prompt fragment,
    expression range. `extra="allow"`: the file may carry `_` notes."""
    model_config = ConfigDict(extra="allow")

    key: str
    label: str = ""
    prompt_add: str = ""
    expression: Optional[dict[str, list[float]]] = None


class TonesResponse(BaseModel):
    world: str
    label: str
    tones: list[WorldTone]


class SaveTonesRequest(BaseModel):
    """Shape checked in `services/worlds.validate_tones`, like scenes."""
    model_config = ConfigDict(extra="allow")

    tones: list[dict[str, Any]] = Field(default_factory=list)


# --------------------------------------------------------------- world registry
class WorldSummary(BaseModel):
    """One row of the « Mondes » screen's registry — enough to card it and
    link to its editor, nothing a character sheet needs. `places_count`
    counts décors, `scenes_count` the ordinary scenes (ADR-0027)."""
    model_config = ConfigDict(extra="allow")

    id: str
    label: str
    compatible_families: list[str] = Field(default_factory=list)
    tone: str = ""
    places_count: int = 0
    intentions_count: int = 0
    scenes_count: int = 0
    tones_count: int = 0


class WorldListResponse(BaseModel):
    worlds: list[WorldSummary]


class PackOption(BaseModel):
    """One entry of the pack picker on the world-creation form. `family` is
    shown so the form can explain what `compatible_families` will be derived
    to — never typed by hand (ADR-0016)."""
    id: str
    label: str
    family: Optional[str] = None


class WorldOptionsResponse(BaseModel):
    packs: list[PackOption]


class CreateWorldRequest(BaseModel):
    """The short form of ADR-0016: id, name, an EXISTING pack (to derive
    `compatible_families`/`suggested_styles` from), an optional tone. No
    family field — typing it back in would be the same mistake the pack
    picker exists to avoid."""
    id: str = ""
    label: str = ""
    pack: str = ""
    tone: str = ""


class CreateWorldResponse(BaseModel):
    ok: bool
    id: str
