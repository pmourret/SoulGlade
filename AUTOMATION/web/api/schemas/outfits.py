"""Payload shapes of the outfit catalogue (IT-10 chantier 6)."""
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class OutfitPiece(BaseModel):
    """One piece: written text, or an asset of class `vetement` whose
    fragment is read at resolution time. Exactly one of the two is set.
    `slot` says where it is worn (`tenues.EMPLACEMENTS`, design-pass tenues);
    absent on a piece composed before the slots. It never changes the text."""
    model_config = ConfigDict(extra="allow")

    text: Optional[str] = None
    asset: Optional[str] = None
    slot: Optional[str] = None


class OutfitEntry(BaseModel):
    """One outfit as the catalogue shows it. `couche` says where it comes
    from (`monde`, `surcharge`, `personnage`); `texte` is what a scene that
    wears it receives, IN FULL; `erreur` says why it does not resolve, and
    `texte` is then empty."""
    model_config = ConfigDict(extra="allow")

    key: str
    label: str = ""
    pieces: List[OutfitPiece] = []
    couche: str = "personnage"
    texte: str = ""
    erreur: str = ""


class OutfitsResponse(BaseModel):
    outfits: List[OutfitEntry]
    marqueur: str


class OutfitCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    label: str = ""
    pieces: List[OutfitPiece] = []
    au_monde: bool = False


class OutfitSaveRequest(BaseModel):
    """Label and/or pieces. Omitted field = untouched, so adjusting one of
    the two never freezes a copy of the other."""
    model_config = ConfigDict(extra="allow")

    key: str = ""
    label: Optional[str] = None
    pieces: Optional[List[OutfitPiece]] = None
    au_monde: bool = False


class OutfitResponse(BaseModel):
    ok: bool
    outfit: OutfitEntry


class OutfitKeyRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    key: str = ""


class OutfitDeleteResponse(BaseModel):
    """`couche` is what was actually removed: `surcharge` means only this
    character's tweak went, and the world's outfit came back."""
    ok: bool
    couche: str
