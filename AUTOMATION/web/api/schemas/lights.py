"""Payload shapes of the light catalogue (IT-10 chantier 7)."""
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class LightEntry(BaseModel):
    """One light as the catalogue shows it. `couche` says where it comes from
    (`monde`, `surcharge`, `personnage`); `texte` is what a scene that wears
    it receives; `erreur` says why it does not resolve, and `texte` is then
    empty."""
    model_config = ConfigDict(extra="allow")

    key: str
    label: str = ""
    text: str = ""
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
    au_monde: bool = False


class LightSaveRequest(BaseModel):
    """Label and/or text. Omitted field = untouched, so adjusting one of the
    two never freezes a copy of the other."""
    model_config = ConfigDict(extra="allow")

    key: str = ""
    label: Optional[str] = None
    text: Optional[str] = None
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
