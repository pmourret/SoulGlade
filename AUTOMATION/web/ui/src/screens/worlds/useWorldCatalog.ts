/* Loads and saves ONE catalog of ONE world (ADR-0027) — the only place that
   calls `/api/worlds/{id}/places | intentions | scenes | scenes-adulte`. A
   sub-component never calls the API (`.claude/rules/frontend.md`); the
   editors and inspectors receive what this hook loads and the callback that
   saves it. The tones keep their own twin (`useWorldTones`).

   SHARED BY TWO SCREENS. Référentiel › Mondes edits the four catalogs; the
   Banque reads the world's scenes to offer the ones a character does not hold
   (`screens/bank/useWorldCatalogue.ts`). It lives here because it is a world
   concern, not a scene-bank one.

   A WORLD RESOURCE, NOT A CHARACTER ONE: `useApi()` still appends
   `?character=`, and the route ignores it. Saving here affects every character
   of the world. */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'

export type WorldPlace = Schema<'WorldPlace'>
export type WorldIntention = Schema<'WorldIntention'>
export type WorldScene = Schema<'WorldScene'>

export type CatalogResource = 'places' | 'intentions' | 'scenes' | 'scenes-adulte'

/* The key of the list in the response and in the save payload. The adult
   branch IS a scenes catalog stored elsewhere (ADR-0027 §6), hence `scenes`. */
const FIELD: Record<CatalogResource, string> = {
  places: 'places',
  intentions: 'intentions',
  scenes: 'scenes',
  'scenes-adulte': 'scenes',
}

type SaveResult = { ok: boolean; erreur?: string }

export function useWorldCatalog<T>(worldId: string | null, resource: CatalogResource) {
  const api = useApi()
  const [entries, setEntries] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const field = FIELD[resource]

  const load = useCallback(async () => {
    if (!worldId) {
      setEntries(null)
      return
    }
    let response: (Record<string, unknown> & { ok?: boolean; erreur?: string }) | null = null
    try {
      response = await api.get(`/api/worlds/${encodeURIComponent(worldId)}/${resource}`)
    } catch {
      response = null
    }
    const failure = !response
      ? 'serveur injoignable'
      : errorOf(response) || (Array.isArray(response[field]) ? null : 'catalogue illisible')
    setError(failure)
    if (!failure) setEntries(response![field] as T[])
  }, [api, field, resource, worldId])

  useEffect(() => {
    void load()
  }, [load])

  /* Replaces the WHOLE catalog, like saving a scene bank replaces the whole
     document — same shape of contract, one level up. */
  const save = useCallback(
    async (next: T[]): Promise<SaveResult> => {
      if (!worldId) return { ok: false, erreur: 'aucun monde' }
      const response = await api.post<{ ok?: boolean; erreur?: string }>(
        `/api/worlds/${encodeURIComponent(worldId)}/${resource}`,
        { [field]: next },
      )
      const failure = errorOf(response)
      if (failure) return { ok: false, erreur: failure }
      await load()
      return { ok: true }
    },
    [api, field, load, resource, worldId],
  )

  return { entries, error, load, save }
}
