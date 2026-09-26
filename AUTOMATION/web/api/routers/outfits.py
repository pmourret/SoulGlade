"""Outfit catalogue — a garment set reused from one scene to the next
(IT-10 chantier 6).

    GET  /api/outfits          this character's outfits, layered and resolved
    POST /api/outfits/create   a new outfit, character or world side
    POST /api/outfits/save     its label and/or pieces
    POST /api/outfits/delete   drops the outfit, or only this character's tweak

A scene wears an outfit through a wardrobe line « @<key> », resolved before
the prompt assembler (`tenues.resoudre_banque`). `import tenues` is the core
module (`AUTOMATION/tenues.py`), the same arrangement as `routers/assets.py`.
Nothing here is blocking: no executor.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

import shared_state as ss
import tenues

from ..dependencies import RequiredCharacterId
from ..schemas.common import ERROR_RESPONSES
from ..schemas.outfits import (
    OutfitCreateRequest, OutfitDeleteResponse, OutfitKeyRequest,
    OutfitResponse, OutfitSaveRequest, OutfitsResponse,
)

router = APIRouter(responses=ERROR_RESPONSES)


def _refus(message, status=400):
    return JSONResponse({"ok": False, "erreur": message}, status_code=status)


def _pieces(pieces):
    return [p.model_dump(exclude_none=True) for p in pieces]


@router.get("/api/outfits", response_model=OutfitsResponse,
            summary="Tenues de ce personnage")
async def get_outfits(character_id: RequiredCharacterId):
    """The world's outfits, adjusted by this character, plus its own — each
    with the text a scene that wears it receives."""
    return {"outfits": tenues.catalogue(character_id), "marqueur": tenues.MARQUEUR}


@router.post("/api/outfits/create", response_model=OutfitResponse,
             summary="Créer une tenue")
async def create_outfit(payload: OutfitCreateRequest,
                        character_id: RequiredCharacterId):
    try:
        entry = tenues.creer(character_id, payload.label, _pieces(payload.pieces),
                             au_monde=payload.au_monde)
    except tenues.TenueError as e:
        return _refus(str(e))
    ss.push_log(f"tenue créée : {entry['key']} ({entry['couche']})")
    return {"ok": True, "outfit": entry}


@router.post("/api/outfits/save", response_model=OutfitResponse,
             summary="Ajuster le libellé ou les pièces d'une tenue")
async def save_outfit(payload: OutfitSaveRequest, character_id: RequiredCharacterId):
    """Writes this character's adjustment — or the world's own entry with
    `au_monde`, which only an outfit the world owns accepts."""
    fields = {}
    if payload.label is not None:
        fields["label"] = payload.label
    if payload.pieces is not None:
        fields["pieces"] = _pieces(payload.pieces)
    if not fields:
        return _refus("rien à enregistrer")
    try:
        entry = tenues.enregistrer(character_id, payload.key.strip(), fields,
                                   au_monde=payload.au_monde)
    except tenues.TenueError as e:
        return _refus(str(e))
    ss.push_log(f"tenue {payload.key!r} ajustée ({', '.join(fields)})"
                + (" dans le monde" if payload.au_monde else ""))
    return {"ok": True, "outfit": entry}


@router.post("/api/outfits/delete", response_model=OutfitDeleteResponse,
             summary="Retirer une tenue")
async def delete_outfit(payload: OutfitKeyRequest, character_id: RequiredCharacterId):
    """Removes the outfit from the layer it lives in — refused while a scene
    wears it. On an adjusted world outfit only the adjustment goes."""
    try:
        couche = tenues.supprimer(character_id, payload.key.strip())
    except tenues.TenueError as e:
        return _refus(str(e))
    ss.push_log(f"tenue {payload.key!r} retirée ({couche})")
    return {"ok": True, "couche": couche}
