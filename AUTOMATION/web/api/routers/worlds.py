"""World registry and catalog.

    /api/worlds                     GET the registry, POST to create one (ADR-0016)
    /api/worlds/options              packs available to derive a new world from
    /api/worlds/{world_id}/places   GET the catalog, POST to save it (ADR-0015)

These routes touch ONLY `WORLDS/<world_id>.json` files. They are a world
resource, not a character one — no `?character=` dependency, unlike every
other router here. `POST /api/scenes` (api/routers/bank.py) never writes
here, and this module never writes `CHARACTERS/<id>/scenes.json`: that split
IS the isolation guarantee (`tests/test_world_catalog_isolation.py`,
`tests/test_world_creation_isolation.py`).
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

import shared_state as ss
import universe
import worlds

from ..schemas.common import ActionResponse, ERROR_RESPONSES
from ..schemas.worlds import (
    CreateWorldRequest, CreateWorldResponse, PackOption, PlacesRejected,
    PlacesResponse, SavePlacesRequest, WorldListResponse, WorldOptionsResponse,
    WorldSummary,
)
from ..services.worlds import validate_places

router = APIRouter(responses=ERROR_RESPONSES)


@router.get("/api/worlds", response_model=WorldListResponse,
            summary="Registre des mondes")
async def get_world_registry():
    """One row per `WORLDS/<id>.json` — the « Mondes » screen's registry.
    Mirrors `GET /api/characters` (state.py): listing only, no validation
    beyond what `worlds.list_worlds()` already scans."""
    out = []
    for wid in worlds.list_worlds():
        w = worlds.load_world(wid)
        out.append({"id": wid, "label": w.get("label", wid),
                    "compatible_families": w.get("compatible_families", []),
                    "tone": w.get("tone", ""),
                    "places_count": len(w.get("places", []))})
    return {"worlds": out}


@router.get("/api/worlds/options", response_model=WorldOptionsResponse,
            summary="Packs proposables pour créer un monde")
async def get_world_options():
    """Packs to pick FROM when creating a world (ADR-0016) — never a family
    field: `compatible_families` is derived server-side from the chosen
    pack, the form never types it."""
    packs = [{"id": uid, "label": universe.load_universe(uid).get("label", uid),
             "family": universe.model_family(uid)}
            for uid in universe.list_universes()]
    return {"packs": packs}


@router.post("/api/worlds", response_model=CreateWorldResponse,
             summary="Créer un monde (catalogue vide, pack curaté)")
async def create_world(payload: CreateWorldRequest):
    """Writes a new `WORLDS/<id>.json` with an EMPTY `places` catalog
    (ADR-0016). The pack is a proposal used once to derive
    `compatible_families`/`suggested_styles` — never a routing change:
    `universe.resolve()` is not touched, and neither is `CHARACTERS/` (this
    world is assigned to no character, ever, by this route)."""
    try:
        wid = worlds.create_world(
            payload.id.strip(), payload.label.strip(), payload.pack.strip(),
            payload.tone.strip())
    except (ValueError, FileExistsError) as e:
        ss.bad_request(str(e))
    ss.push_log(f"monde cree : {wid!r} (pack {payload.pack!r})")
    return {"ok": True, "id": wid}


@router.get("/api/worlds/{world_id}/places", response_model=PlacesResponse,
            summary="Catalogue de lieux d'un monde")
async def get_places(world_id: str):
    """`worlds.load_world` raises `UnknownWorldError` (a ValueError) on an
    unknown id — the generic ValueError handler turns that into a clean 400,
    nothing to catch here."""
    w = worlds.load_world(world_id)
    return {"world": world_id, "label": w.get("label", world_id),
            "places": worlds.places(world_id)}


@router.post("/api/worlds/{world_id}/places", response_model=ActionResponse,
             response_model_exclude_unset=True,
             responses={400: {"model": PlacesRejected,
                              "description": "Catalogue refusé"}},
             summary="Enregistrer le catalogue de lieux d'un monde")
async def save_places(world_id: str, payload: SavePlacesRequest):
    """Replaces the world's WHOLE `places` list, like `POST /api/scenes`
    replaces a character's whole scene bank — same shape of contract, one
    level up. Affects every character composing in this world: the frontend
    warns before calling this, the server does not soften it."""
    worlds.load_world(world_id)             # UnknownWorldError -> 400
    problems = validate_places(payload.places)
    if problems:
        ss.push_log(f"WORLDS/{world_id}.json places REFUSE — {problems[0]}")
        return JSONResponse({"ok": False, "erreur": problems[0],
                             "problemes": problems}, status_code=400)
    worlds.save_places(world_id, payload.places)
    ss.push_log(f"WORLDS/{world_id}.json : catalogue enregistré "
               f"({len(payload.places)} lieu(x))")
    return {"ok": True}


# ------------------------------------------------------- catalogue adulte
# DEUX ROUTES JUMELLES, PAS UN DRAPEAU SUR LES PREMIERES. Un `?adulte=1` sur
# les routes ci-dessus aurait fait dependre d'un booleen de requete le fichier
# ecrit — et un booleen absent ecrit le mauvais. Deux chemins nommes rendent
# l'intention lisible dans le journal du serveur comme dans l'onglet reseau,
# et le catalogue adulte d'un monde reste un objet distinct (decision du
# 21/09, cadrage 2026-09-21-flux-nsfw arbitrage 3).
@router.get("/api/worlds/{world_id}/places-adulte", response_model=PlacesResponse,
            summary="Catalogue adulte d'un monde")
async def get_places_adulte(world_id: str):
    """Le catalogue adulte, vide si le monde n'en porte pas — ce qui est le
    cas nominal. Même forme de réponse que le catalogue ordinaire : c'est le
    même objet, rangé ailleurs."""
    w = worlds.load_world(world_id)
    return {"world": world_id, "label": w.get("label", world_id),
            "places": worlds.places_adulte(world_id)}


@router.post("/api/worlds/{world_id}/places-adulte", response_model=ActionResponse,
             response_model_exclude_unset=True,
             responses={400: {"model": PlacesRejected,
                              "description": "Catalogue refusé"}},
             summary="Enregistrer le catalogue adulte d'un monde")
async def save_places_adulte(world_id: str, payload: SavePlacesRequest):
    """Remplace tout le catalogue adulte. MÊME VALIDATION que l'ordinaire —
    `validate_places`, sans variante : ids uniques et non vides, prompt non
    vide, et surtout aucune clé de personnage. Un lieu adulte qui habillerait
    le personnage serait la même faute qu'ailleurs, parce que la nudité est
    la garde-robe du personnage à son palier natif, pas une livraison du
    monde (ADR-0014).

    Une liste vide retire le fichier : un monde cesse alors de porter une
    branche adulte, ce qui est un état légitime et pas une coquille."""
    worlds.load_world(world_id)             # UnknownWorldError -> 400
    problems = validate_places(payload.places)
    if problems:
        ss.push_log(f"WORLDS/{world_id}.adulte.json REFUSE — {problems[0]}")
        return JSONResponse({"ok": False, "erreur": problems[0],
                             "problemes": problems}, status_code=400)
    worlds.save_places_adulte(world_id, payload.places)
    ss.push_log(f"WORLDS/{world_id}.adulte.json : catalogue adulte enregistré "
                f"({len(payload.places)} lieu(x))")
    return {"ok": True}
