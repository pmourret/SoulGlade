"""Payload shapes of the light catalogue (IT-10 chantier 7) and of the
platform lighting vocabulary (chantier 7 bis)."""
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class LightEffectChoice(BaseModel):
    """An effect a sheet carries. `color` is a palette key or the user's own
    words, used where the effect's fragment says `{color}`."""
    key: str
    color: str = ""


class LightSetup(BaseModel):
    """The studio sheet of a light. An unset setting drops out of the
    sentence."""
    source: Optional[str] = None
    direction: Optional[str] = None
    quality: Optional[str] = None
    temperature: Optional[str] = None
    mood: Optional[str] = None
    effects: List[LightEffectChoice] = []


class LightEntry(BaseModel):
    """One light as the catalogue shows it. `couche` says where it comes from
    (`monde`, `surcharge`, `personnage`); `texte` is what a scene that wears
    it receives; `erreur` says why it does not resolve, and `texte` is then
    empty."""
    model_config = ConfigDict(extra="allow")

    key: str
    label: str = ""
    text: str = ""
    setup: Optional[LightSetup] = None
    couche: str = "personnage"
    texte: str = ""
    erreur: str = ""


class LightsResponse(BaseModel):
    lights: List[LightEntry]
    marqueur: str


class LightCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    label: str = ""
    text: str = ""
    setup: Optional[LightSetup] = None
    au_monde: bool = False


class LightSaveRequest(BaseModel):
    """Label, text and/or sheet. Omitted field = untouched, so adjusting one
    never freezes a copy of the others. An empty `text` goes back to the
    sheet."""
    model_config = ConfigDict(extra="allow")

    key: str = ""
    label: Optional[str] = None
    text: Optional[str] = None
    setup: Optional[LightSetup] = None
    au_monde: bool = False


class LightResponse(BaseModel):
    ok: bool
    light: LightEntry


class LightKeyRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    key: str = ""


class LightDeleteResponse(BaseModel):
    """`couche` is what was actually removed: `surcharge` means only this
    character's tweak went, and the world's light came back."""
    ok: bool
    couche: str


class LightingOption(BaseModel):
    """One value of a setting: its plain name, the trade's term, its
    fragment. `angle` places a direction on the top-view diagram."""
    key: str
    label: str
    term: str = ""
    fragment: str
    angle: Optional[int] = None


class LightingSetting(BaseModel):
    key: str
    label: str
    options: List[LightingOption]


class LightingColor(BaseModel):
    key: str
    label: str
    fragment: str
    swatch: str


class LightingEffect(BaseModel):
    key: str
    label: str
    term: str = ""
    fragment: str


class LightingScheme(BaseModel):
    """A starting point: it fills the sheet, which the user then adjusts."""
    key: str
    label: str
    term: str = ""
    setup: LightSetup


class LightingVocabulary(BaseModel):
    """PLATFORM/lighting.json, the same for everyone."""
    settings: List[LightingSetting]
    palette: List[LightingColor]
    effects: List[LightingEffect]
    schemes: List[LightingScheme]
