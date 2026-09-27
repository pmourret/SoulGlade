/* State and mutations behind the light catalogue (IT-10 chantier 7, 7 bis).

   The routes of `/api/lights`, `/api/light-effects` and `/api/lighting`, and
   nothing else: LightsView composes, this hook loads and mutates,
   LightSheet only shows (frontend.md, the three roles). Every light
   carries its `couche`, its `texte` — what a scene that wears it receives —
   and its `erreur` when it does not resolve.

   NO OPTIMISTIC WRITE, same rule as the outfits: the server may refuse a
   sheet, and what a scene receives is the server's to say. */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type ActionLike, type Schema } from '../../../api/client'
import { useApi } from '../../../api/useApi'
import type { Setup, Vocabulary } from './lightCompose'

export type LightEntry = Schema<'LightEntry'>
export type LightEffectEntry = Schema<'LightEffectEntry'>
/** What a save writes: an omitted field is left as it is on the server. */
export type LightFields = { label?: string; text?: string; setup?: Setup }

type Result = { ok: true; light?: LightEntry } | { ok: false; erreur: string }

export function useLights() {
  const api = useApi()
  const [lights, setLights] = useState<LightEntry[]>([])
  const [effects, setEffects] = useState<LightEffectEntry[]>([])
  const [vocabulary, setVocabulary] = useState<Vocabulary | null>(null)
  const [marker, setMarker] = useState('@')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const [response, own] = await Promise.all([
      api.get<{ lights?: LightEntry[]; marqueur?: string }>('/api/lights'),
      api.get<{ effects?: LightEffectEntry[] }>('/api/light-effects'),
    ])
    setLights(response.lights ?? [])
    setEffects(own.effects ?? [])
    if (response.marqueur) setMarker(response.marqueur)
    setLoaded(true)
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  // The platform's vocabulary: the same for every character, read once.
  useEffect(() => {
    void api.get<Vocabulary & ActionLike>('/api/lighting').then((response) => {
      if (Array.isArray(response.settings)) setVocabulary(response)
    })
  }, [api])

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
    (label: string, fields: { text: string; setup: Setup | null }, auMonde: boolean) =>
      call('/api/lights/create', { label, text: fields.text, setup: fields.setup, au_monde: auMonde }),
    [call],
  )

  const save = useCallback(
    (key: string, fields: LightFields, auMonde = false) =>
      call('/api/lights/save', { key, ...fields, au_monde: auMonde }),
    [call],
  )

  const remove = useCallback((key: string) => call('/api/lights/delete', { key }), [call])

  const createEffect = useCallback(
    (label: string, fragment: string, auMonde: boolean) =>
      call('/api/light-effects/create', { label, fragment, au_monde: auMonde }),
    [call],
  )

  const removeEffect = useCallback((key: string) => call('/api/light-effects/delete', { key }), [call])

  return {
    lights, effects, vocabulary, marker, loaded, busy,
    reload, create, save, remove, createEffect, removeEffect,
  }
}
