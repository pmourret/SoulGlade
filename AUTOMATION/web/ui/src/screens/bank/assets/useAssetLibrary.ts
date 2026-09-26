/* State and mutations behind the asset library (IT-10 chantier 5).

   The five routes of `/api/assets` and nothing else: AssetsView composes, this
   hook loads and mutates, AssetInspector only shows (frontend.md, the three
   roles). Every entry carries its `couche` — the world's, the world's adjusted
   here, or this character's own — which is what the inspector says and what
   « Rendre au monde » acts on.

   NO OPTIMISTIC WRITE. An import runs the local vision model (3 to 5 s) and
   may come back WITHOUT a fragment; a save may be refused by the server (a
   world asset, adjusted with `au_monde` from the wrong side). The list is
   reloaded from the server after every mutation rather than patched here —
   the same rule the pose bank follows, for the same reason. */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type ActionLike, type Schema } from '../../../api/client'
import { useApi } from '../../../api/useApi'

export type AssetEntry = Schema<'AssetEntry'>
export type AssetClass = Schema<'AssetClass'>

type Result = { ok: true } | { ok: false; erreur: string }

const OK: Result = { ok: true }

/** base64 in a JSON body, never multipart — the origin guard depends on the
    Content-Type being application/json (api/security.py). Same reader as the
    pose extraction: the prefix `data:...;base64,` is dropped, the route wants
    the payload alone. */
function base64Of(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useAssetLibrary() {
  const api = useApi()
  const [assets, setAssets] = useState<AssetEntry[]>([])
  const [classes, setClasses] = useState<AssetClass[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busyKeys, setBusyKeys] = useState<ReadonlySet<string>>(new Set())

  const reload = useCallback(async () => {
    const response = await api.get<{ assets?: AssetEntry[]; classes?: AssetClass[] }>(
      '/api/assets',
    )
    setAssets(response.assets ?? [])
    setClasses(response.classes ?? [])
    setLoaded(true)
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  const withBusy = useCallback(async (key: string, fn: () => Promise<Result>) => {
    setBusyKeys((previous) => new Set(previous).add(key))
    try {
      return await fn()
    } finally {
      setBusyKeys((previous) => {
        const next = new Set(previous)
        next.delete(key)
        return next
      })
    }
  }, [])

  /** Returns the asset that was WRITTEN — the server's copy, not the list's.
      The view needs it to select the new card and to say whether a fragment
      came back, and the state it would read instead is the one from before
      this import. */
  const importFile = useCallback(
    async (file: File, classe: string, auMonde: boolean): Promise<Result & { asset?: AssetEntry }> => {
      const response = await api.post<ActionLike & { asset?: AssetEntry }>(
        '/api/assets/import',
        {
          filename: file.name,
          data_base64: await base64Of(file),
          classe,
          au_monde: auMonde,
        },
      )
      const failure = errorOf(response)
      if (failure) return { ok: false, erreur: failure }
      await reload()
      return { ok: true, asset: response.asset }
    },
    [api, reload],
  )

  const analyse = useCallback(
    (key: string) =>
      withBusy(key, async () => {
        const response = await api.post<ActionLike>('/api/assets/analyse', { key })
        const failure = errorOf(response)
        if (failure) return { ok: false as const, erreur: failure }
        await reload()
        return OK
      }),
    [api, reload, withBusy],
  )

  const save = useCallback(
    (key: string, fields: { label?: string; fragment?: string }, auMonde = false) =>
      withBusy(key, async () => {
        const response = await api.post<ActionLike>('/api/assets/save', {
          key, ...fields, au_monde: auMonde,
        })
        const failure = errorOf(response)
        if (failure) return { ok: false as const, erreur: failure }
        await reload()
        return OK
      }),
    [api, reload, withBusy],
  )

  const remove = useCallback(
    (key: string) =>
      withBusy(key, async () => {
        const response = await api.post<ActionLike>('/api/assets/delete', { key })
        const failure = errorOf(response)
        if (failure) return { ok: false as const, erreur: failure }
        await reload()
        return OK
      }),
    [api, reload, withBusy],
  )

  return { assets, classes, loaded, busyKeys, reload, importFile, analyse, save, remove }
}

/** The label of a class, from the server's own table — never a second list
    written here (invariant 7). An unknown key shows itself rather than
    disappearing: a class added server-side must be visible before the
    interface knows about it. */
export function classLabel(classes: AssetClass[], key: string): string {
  return classes.find((c) => c.key === key)?.label ?? key
}
