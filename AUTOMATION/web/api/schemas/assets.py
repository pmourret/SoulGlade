"""Payload shapes of the asset library (IT-10 chantier 5).

The bytes travel base64 inside a JSON body, never `multipart/form-data` —
same reason as the pose extraction (api/security.py, the origin guard), and
the same 20 MB ceiling before encoding.
"""
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class AssetEntry(BaseModel):
    """One asset as the library shows it. `couche` says where it comes from:
    `monde` (inherited as is), `surcharge` (the world's, adjusted here) or
    `personnage`."""
    model_config = ConfigDict(extra="allow")

    key: str
    label: str = ""
    classe: str = "reference"
    fragment: str = ""
    fichier: str = ""
    couche: str = "personnage"


class AssetClass(BaseModel):
    """A class of asset, as the table in `AUTOMATION/assets.py` declares it.
    `champ` is the scene field the fragment lands in — `null` means the
    library only, no destination yet. The picker reads this list, so a panel
    never has to spell a class out (invariant 7)."""
    key: str
    label: str
    champ: Optional[str] = None


class LibraryResponse(BaseModel):
    assets: List[AssetEntry]
    classes: List[AssetClass]


class AssetImportRequest(BaseModel):
    """An image the user brings in. `au_monde` files it in the character's
    WORLD instead of the character — that is how a world ends up shipping its
    own illustrated garments."""
    model_config = ConfigDict(extra="allow")

    data_base64: str = ""
    filename: str = "asset.png"
    classe: str = "reference"
    au_monde: bool = False


class AssetImportResponse(BaseModel):
    ok: bool
    asset: AssetEntry


class AssetKeyRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    key: str = ""


class AssetSaveRequest(BaseModel):
    """Label and/or fragment. Omitted field = untouched, so adjusting one of
    the two never freezes a copy of the other."""
    model_config = ConfigDict(extra="allow")

    key: str = ""
    label: Optional[str] = None
    fragment: Optional[str] = None
    au_monde: bool = False


class AssetFragmentResponse(BaseModel):
    ok: bool
    fragment: str


class AssetDeleteResponse(BaseModel):
    """`couche` is what was actually removed: `surcharge` means only this
    character's tweak went, and the world's asset came back."""
    ok: bool
    couche: str
