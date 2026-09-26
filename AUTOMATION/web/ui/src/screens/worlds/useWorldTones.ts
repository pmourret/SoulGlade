/* Loads and saves the tones of ONE world — the only place that calls
   `/api/worlds/{id}/tones`. Twin of `useWorldCatalog`, and for the same reason:
   a tone is created with its world, like a place (IT-10, 25/09,
   `DOCS/cadrage/2026-09-25-creer-un-ton.md`).

   A WORLD RESOURCE, NOT A CHARACTER ONE: every character of the world inherits
   what is saved here, field by field under its own adjustments. */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'

export type WorldTone = Schema<'WorldTone'>
type TonesResponse = Schema<'TonesResponse'>

export function useWorldTones(worldId: string | null) {
  const api = useApi()
  const [tones, setTones] = useState<WorldTone[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!worldId) {
      setTones(null)
      return
    }
    let response: (TonesResponse & { ok?: boolean; erreur?: string }) | null = null
    try {
      response = await api.get<TonesResponse>(`/api/worlds/${encodeURIComponent(worldId)}/tones`)
    } catch {
      response = null
    }
    const failure = !response
      ? 'serveur injoignable'
      : errorOf(response) || (Array.isArray(response.tones) ? null : 'tons illisibles')
    setError(failure)
    if (!failure) setTones(response!.tones)
  }, [api, worldId])

  useEffect(() => {
    void load()
  }, [load])

  /* Replaces the WHOLE list, same contract as the places catalog. */
  const save = useCallback(
    async (next: WorldTone[]): Promise<{ ok: boolean; erreur?: string }> => {
      if (!worldId) return { ok: false, erreur: 'aucun monde' }
      const response = await api.post<{ ok?: boolean; erreur?: string }>(
        `/api/worlds/${encodeURIComponent(worldId)}/tones`,
        { tones: next },
      )
      const failure = errorOf(response)
      if (failure) return { ok: false, erreur: failure }
      await load()
      return { ok: true }
    },
    [api, load, worldId],
  )

  return { tones, error, load, save }
}
