"""Le jeu d'entrainement d'un personnage : ce qu'il contient, et son export.

    GET  /api/training/proposal   sur quoi on entrainerait, et ce qui bloque
    GET  /api/training/exports    les dossiers deja sortis, lus dans leur manifeste
    POST /api/training/export     rassembler le jeu dans un dossier date

CE QUE CES ROUTES NE FONT PAS, et ne feront pas ici : lancer un entrainement.
La plateforme prepare le jeu, l'utilisateur l'emporte sur une machine kohya.
L'atelier integre est l'etage 3 du cadrage du 09/09, verse a l'horizon le
10/09 -- pas un oubli, une decision.

Un router lit la requete, appelle un service, et traduit ce qu'il recoit en
code de statut (`.claude/rules/backend.md`). Les regles vivent une couche plus
bas, dans `api/services/training.py`.
"""
import asyncio

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

import shared_state as ss

from ..dependencies import RequiredCharacterId
from ..schemas.common import ERROR_RESPONSES
from ..schemas.training import (
    TrainingExportRequest, TrainingExportResponse, TrainingExportsResponse,
    TrainingProposalResponse,
)
from ..services.training import exports, proposal, run_export

router = APIRouter(responses=ERROR_RESPONSES)


def _refus(e):
    """Un refus du service (`ss.bad_request`) rendu tel quel, jamais en 500.

    LE PIEGE QUE CETTE FONCTION FERME. `bad_request` leve un `BadRequest`, qui
    est une `HTTPException` -- et le `except Exception` large qu'exige
    `backend.md` autour d'un executor l'attraperait AUSSI, transformant « rien
    a exporter » en « erreur serveur ». On le traduit ici plutot que de le
    relancer : rien ne doit s'echapper d'une route qui a attendu un executor.

    `detail` porte deja `{ok: false, erreur: ...}` (api/exceptions.py) ; un
    `HTTPException` leve ailleurs avec un detail nu est enveloppe.
    """
    corps = e.detail if isinstance(e.detail, dict) else {"ok": False,
                                                         "erreur": str(e.detail)}
    return JSONResponse(corps, status_code=e.status_code)


@router.get("/api/training/proposal", response_model=TrainingProposalResponse,
            summary="Sur quoi on entrainerait un LoRA d'identite, et ce qui manque")
async def training_proposal(character_id: RequiredCharacterId):
    """La proposition complete du personnage. LECTURE SEULE.

    Rend un 200 meme quand rien n'est pret : un personnage sans jeu de
    reference actif n'est pas une erreur, c'est un etat, et `blocage` le dit
    en toutes lettres. Un 4xx ici ferait afficher un toast rouge la ou
    l'ecran doit afficher « le gabarit n'existe pas encore ».

    Tourne dans un thread : la lecture ouvre la base et calcule des cosinus
    numpy sur tous les membres du jeu -- court, mais bloquant, et un handler
    async ne bloque jamais la boucle.
    """
    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(
            None, proposal, character_id, ss.cfg(character_id))
    except HTTPException as e:
        return _refus(e)
    except Exception as e:                                   # noqa: BLE001
        # Attrape LARGE, et ici plutot que dans le handler generique : une
        # exception qui s'echappe d'un executor fait raccrocher la reponse
        # sous LocalOriginGuardMiddleware, et bloque la requete SUIVANTE
        # (incident du 03/09 sur /api/expression/preview, `backend.md`).
        ss.push_log(f"/api/training/proposal : {type(e).__name__} — {e}")
        return JSONResponse({"ok": False, "erreur": f"{type(e).__name__} : {e}"},
                            status_code=500)


@router.get("/api/training/exports", response_model=TrainingExportsResponse,
            summary="Les exports deja sortis pour ce personnage")
async def training_exports(character_id: RequiredCharacterId):
    """Du plus recent au plus ancien, lus dans leur manifeste."""
    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(None, exports, character_id)
    except HTTPException as e:
        return _refus(e)
    except Exception as e:                                   # noqa: BLE001
        ss.push_log(f"/api/training/exports : {type(e).__name__} — {e}")
        return JSONResponse({"ok": False, "erreur": f"{type(e).__name__} : {e}"},
                            status_code=500)


@router.post("/api/training/export", response_model=TrainingExportResponse,
             responses={409: {"description": "Une production tourne"}},
             summary="Rassembler le jeu d'entrainement dans un dossier date")
async def training_export(payload: TrainingExportRequest,
                          character_id: RequiredCharacterId):
    """Copie les images, les legende, ecrit le manifeste et la recette kohya.

    409 PENDANT UNE PRODUCTION, meme garde et meme raison que /api/mesurer :
    le legendeur de repli appelle ComfyUI, et il n'y a qu'un GPU et qu'un
    batch (`shared_state.py`). Un export peut attendre la fin d'un lot ; un
    lot ralenti par un export ne se rattrape pas.

    Deux exports dans la meme seconde tombent sur un `FileExistsError` :
    `entrainement.exporter` refuse un horodatage deja pris plutot que
    d'ecraser une piece d'historique. Traduit ici en refus lisible.
    """
    if ss.STATE["running"]:
        return JSONResponse(
            {"ok": False, "erreur": "une production tourne — export après"},
            status_code=409)
    loop = asyncio.get_running_loop()
    try:
        r = await loop.run_in_executor(
            None, run_export, character_id, ss.cfg(character_id),
            payload.repetitions, payload.avec_vision)
    except FileExistsError:
        return JSONResponse(
            {"ok": False, "erreur": "un export porte déjà cet horodatage — "
                                    "attendre une seconde et relancer"},
            status_code=400)
    except HTTPException as e:
        return _refus(e)
    except Exception as e:                                   # noqa: BLE001
        ss.push_log(f"/api/training/export : {type(e).__name__} — {e}")
        return JSONResponse({"ok": False, "erreur": f"{type(e).__name__} : {e}"},
                            status_code=500)
    ss.push_log(f"jeu d'entraînement exporté : {r['images']} image(s), "
                f"{r['repetitions']} répétition(s) — {r['dossier']}")
    return r
