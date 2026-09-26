/* State and mutations behind the light catalogue (IT-10 chantier 7).

   The four routes of `/api/lights` and nothing else: LightsView composes,
   this hook loads and mutates, LightInspector only shows (frontend.md, the
   three roles). Every entry carries its `couche`, its `texte` — what a scene
   that wears it receives — and its `erreur` when it does not resolve.

   NO OPTIMISTIC WRITE, same rule as the outfits: the server may refuse a
   text, and what a scene receives is the server's to say. */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type ActionLike, type Schema } from '../../../api/client'
import { useApi } from '../../../api/useApi'

export type LightEntry = Schema<'LightEntry'>

type Result = { ok: true; light?: LightEntry } | { ok: false; erreur: string }

export function useLights() {
  const api = useApi()
  const [lights, setLights] = useState<LightEntry[]>([])
  const [marker, setMarker] = useState('@')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const response = await api.get<{ lights?: LightEntry[]; marqueur?: string }>('/api/lights')
    setLights(response.lights ?? [])
    if (response.marqueur) setMarker(response.marqueur)
    setLoaded(true)
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  const call = useCallback(
    async (path: string, body: object): Promise<Result> => {
      setBusy(true)
      try {
        const response = await api.post<ActionLike & { light?: LightEntry }>(path, body)
        const failure = errorOf(response)
        if (failure) return { ok: false, erreur: failure }
        await reload()
        return { ok: true, light: response.light }
      } finally {
        setBusy(false)
      }
    },
    [api, reload],
  )

  const create = useCallback(
    (label: string, text: string, auMonde: boolean) =>
      call('/api/lights/create', { label, text, au_monde: auMonde }),
    [call],
  )

  const save = useCallback(
    (key: string, fields: { label?: string; text?: string }, auMonde = false) =>
      call('/api/lights/save', { key, ...fields, au_monde: auMonde }),
    [call],
  )

  const remove = useCallback((key: string) => call('/api/lights/delete', { key }), [call])

  return { lights, marker, loaded, busy, reload, create, save, remove }
}
