/* State and mutations behind the outfit catalogue (IT-10 chantier 6).

   The four routes of `/api/outfits` and nothing else: OutfitsView composes,
   this hook loads and mutates, OutfitInspector only shows (frontend.md, the
   three roles). Every entry carries its `couche`, its `texte` — what a scene
   that wears it receives, resolved by the server — and its `erreur` when it
   does not resolve.

   NO OPTIMISTIC WRITE, same rule as the asset library: the server may refuse
   a piece (an asset of the character in a world outfit, a décor as a
   garment), and the resolved text is the server's to say. */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type ActionLike, type Schema } from '../../../api/client'
import { useApi } from '../../../api/useApi'

export type OutfitEntry = Schema<'OutfitEntry'>
export type OutfitPiece = Schema<'OutfitPiece'>

type Result = { ok: true; outfit?: OutfitEntry } | { ok: false; erreur: string }

export function useOutfits() {
  const api = useApi()
  const [outfits, setOutfits] = useState<OutfitEntry[]>([])
  const [marker, setMarker] = useState('@')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const response = await api.get<{ outfits?: OutfitEntry[]; marqueur?: string }>(
      '/api/outfits',
    )
    setOutfits(response.outfits ?? [])
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
        const response = await api.post<ActionLike & { outfit?: OutfitEntry }>(path, body)
        const failure = errorOf(response)
        if (failure) return { ok: false, erreur: failure }
        await reload()
        return { ok: true, outfit: response.outfit }
      } finally {
        setBusy(false)
      }
    },
    [api, reload],
  )

  const create = useCallback(
    (label: string, pieces: OutfitPiece[], auMonde: boolean) =>
      call('/api/outfits/create', { label, pieces, au_monde: auMonde }),
    [call],
  )

  const save = useCallback(
    (key: string, fields: { label?: string; pieces?: OutfitPiece[] }, auMonde = false) =>
      call('/api/outfits/save', { key, ...fields, au_monde: auMonde }),
    [call],
  )

  const remove = useCallback((key: string) => call('/api/outfits/delete', { key }), [call])

  return { outfits, marker, loaded, busy, reload, create, save, remove }
}
