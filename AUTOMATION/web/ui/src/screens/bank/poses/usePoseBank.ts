/* State and mutations behind the pose bank table — search/filter/sort plus
   the three mutations that go beyond a plain list (rename, duplicate,
   remove). Extraction stays in PosesView.tsx: it is orthogonal to browsing
   an existing bank (file input, not a row action) and does not touch any
   state this hook owns.

   THE DENSITY TOGGLE IS GONE (design-pass screen-7d §S2). It sized the
   thumbnails of a card grid; the table has one density, so the setting had
   nothing left to choose between. Its localStorage key goes with it — a
   stored value nothing reads is not compatibility, it is litter. */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { errorOf, type ActionLike, type Schema } from '../../../api/client'
import { useApi } from '../../../api/useApi'
import { useScenes } from '../../../state/ScenesStoreContext'
import type { RawPoseFrame } from '../../pose-editor/poseFrame'

export type PoseBankEntry = Schema<'PoseBankEntry'>

export type PoseBankRow = {
  name: string
  label: string | null
  source: string | null
  createdAt: string | null
  scenesUsing: string[]
}

export type ProvenanceFilter = 'all' | 'preset' | 'extraction'
export type UsageFilter = 'all' | 'used' | 'unused'
export type SortBy = 'recent' | 'name' | 'usage'
export type SortDir = 'asc' | 'desc'

type MutationResult = { ok: true; name: string } | { ok: false; erreur: string }

/** Which way a column reads on its FIRST click — never a blanket 'asc'.
    A name sorts A→Z, a usage count and a date sort biggest/newest first;
    landing on "least used" or "oldest" is nobody's first question. */
const FIRST_DIR: Record<SortBy, SortDir> = { name: 'asc', usage: 'desc', recent: 'desc' }

export function usePoseBank() {
  const api = useApi()
  const { poses, load: reloadScenes, drafts } = useScenes()
  const [bankDetail, setBankDetail] = useState<Record<string, PoseBankEntry>>({})
  const [search, setSearch] = useState('')
  const [provenanceFilter, setProvenanceFilter] = useState<ProvenanceFilter>('all')
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [busyNames, setBusyNames] = useState<ReadonlySet<string>>(new Set())

  /** One gesture for a column header: a new column takes its own natural
      direction, the current one flips. */
  const sortOn = useCallback((column: SortBy) => {
    setSortBy((current) => {
      setSortDir((dir) => (current === column ? (dir === 'asc' ? 'desc' : 'asc') : FIRST_DIR[column]))
      return column
    })
  }, [])

  // Label/provenance/date live outside the plain `poses: string[]` every
  // OTHER pose picker reads (ScenesStoreContext) — refetched whenever that
  // list itself changes (extract/delete/duplicate), AND exposed standalone
  // for rename, which changes a label WITHOUT the filename list changing.
  const reloadBankDetail = useCallback(async () => {
    const response = await api.get<{ poses?: PoseBankEntry[] }>('/api/pose/bank')
    const map: Record<string, PoseBankEntry> = {}
    for (const entry of response.poses ?? []) map[entry.nom] = entry
    setBankDetail(map)
  }, [api])

  useEffect(() => {
    void reloadBankDetail()
  }, [reloadBankDetail, poses])

  const withBusy = useCallback(async (name: string, fn: () => Promise<MutationResult>): Promise<MutationResult> => {
    setBusyNames((prev) => new Set(prev).add(name))
    try {
      return await fn()
    } finally {
      setBusyNames((prev) => {
        const next = new Set(prev)
        next.delete(name)
        return next
      })
    }
  }, [])

  const rows = useMemo<PoseBankRow[]>(
    () =>
      poses.map((name) => {
        const entry = bankDetail[name]
        return {
          name,
          label: entry?.label ?? null,
          source: entry?.source ?? null,
          createdAt: entry?.created_at ?? null,
          scenesUsing: drafts.filter((d) => d.pose === name).map((d) => d.id || '(sans nom)'),
        }
      }),
    [poses, bankDetail, drafts],
  )

  const rowsFiltered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const kept = rows.filter((row) => {
      if (needle && !`${row.label ?? ''} ${row.name}`.toLowerCase().includes(needle)) return false
      if (provenanceFilter !== 'all' && row.source !== provenanceFilter) return false
      if (usageFilter === 'used' && row.scenesUsing.length === 0) return false
      if (usageFilter === 'unused' && row.scenesUsing.length > 0) return false
      return true
    })
    /* `desc` is what each column's natural reading is (see FIRST_DIR), so
       the comparators below are written IN that direction and `asc` flips
       them — one sign, not three mirrored branches. */
    const sign = sortDir === 'desc' ? 1 : -1
    return kept.sort((a, b) => {
      if (sortBy === 'name') return sign * -(a.label || a.name).localeCompare(b.label || b.name, 'fr')
      if (sortBy === 'usage') return sign * (b.scenesUsing.length - a.scenesUsing.length)
      // 'recent': most recently created first; a pose with no known date
      // (no sidecar) sorts last rather than first — it is not "brand new",
      // its date is simply unknown.
      const ta = a.createdAt ? Date.parse(a.createdAt) : -Infinity
      const tb = b.createdAt ? Date.parse(b.createdAt) : -Infinity
      return sign * (tb - ta)
    })
  }, [rows, search, provenanceFilter, usageFilter, sortBy, sortDir])

  /** Renaming reuses the plain save path: load the raw frame, patch its
      `label`, save it back under its OWN name. No dedicated route — the
      same reasoning as duplicate below, `/api/pose/save` already does
      exactly this for any other edit. Unavailable for a sidecar-less
      legacy pose (nothing to load) — the caller gates the menu item on
      `source !== null` before ever calling this. */
  const rename = useCallback(
    (name: string, label: string): Promise<MutationResult> => {
      const trimmed = label.trim()
      if (!trimmed) return Promise.resolve({ ok: false, erreur: 'un libellé ne peut pas être vide' })
      return withBusy(name, async () => {
        const raw = await api.get<RawPoseFrame & ActionLike>(
          `/api/pose/keypoints?name=${encodeURIComponent(name)}`,
        )
        const loadFailure = errorOf(raw)
        if (loadFailure) return { ok: false, erreur: loadFailure }
        const response = await api.post<{ ok?: boolean; erreur?: string; name?: string }>('/api/pose/save', {
          name, keypoints: { ...raw, label: trimmed },
        })
        const saveFailure = errorOf(response)
        if (saveFailure || !response.name) return { ok: false, erreur: saveFailure || 'échec' }
        await reloadBankDetail()
        return { ok: true, name: response.name }
      })
    },
    [api, reloadBankDetail, withBusy],
  )

  /** Loads the frame, clears `created_at` (a duplicate is a NEW pose, born
      now — keeping the original's timestamp would misdate it and confuse
      "recent first" sorting), suffixes the label, saves under a fresh
      auto-numbered name. Same "no dedicated route" reasoning as rename. */
  const duplicate = useCallback(
    (name: string): Promise<MutationResult> =>
      withBusy(name, async () => {
        const raw = await api.get<RawPoseFrame & ActionLike>(
          `/api/pose/keypoints?name=${encodeURIComponent(name)}`,
        )
        const loadFailure = errorOf(raw)
        if (loadFailure) return { ok: false, erreur: loadFailure }
        const label = raw.label ? `${raw.label} (copie)` : null
        const response = await api.post<{ ok?: boolean; erreur?: string; name?: string }>('/api/pose/save', {
          name: null, keypoints: { ...raw, label, created_at: null },
        })
        const saveFailure = errorOf(response)
        if (saveFailure || !response.name) return { ok: false, erreur: saveFailure || 'échec' }
        // ORDER MATTERS. `bankDetail` first, `poses` second — not the other
        // way round, and not `Promise.all`. `poses` updating is what makes
        // the new card appear at all (`rows` maps over it); `poses`
        // changing ALSO retriggers this hook's own effect to refetch bank
        // detail, but that effect is async and unawaited from here, so if
        // `poses` updated FIRST the new card would mount for one render
        // with no label yet (`bankDetail` still missing the fresh entry) —
        // caught live, the duplicate's own label flashed the raw filename
        // right after creation. Fetching bank detail first means it
        // already HAS the new entry by the time the card is born.
        await reloadBankDetail()
        await reloadScenes(true)
        return { ok: true, name: response.name }
      }),
    [api, reloadScenes, reloadBankDetail, withBusy],
  )

  const remove = useCallback(
    (name: string): Promise<MutationResult> =>
      withBusy(name, async () => {
        const response = await api.post<ActionLike>('/api/pose/delete', { name })
        const failure = errorOf(response)
        if (failure) return { ok: false, erreur: failure }
        await reloadScenes(true)
        return { ok: true, name }
      }),
    [api, reloadScenes, withBusy],
  )

  return {
    rows: rowsFiltered,
    totalCount: poses.length,
    search, setSearch,
    provenanceFilter, setProvenanceFilter,
    usageFilter, setUsageFilter,
    sortBy, sortDir, sortOn,
    busyNames,
    rename, duplicate, remove,
    /** For the extraction flow (PosesView's own file input) — orthogonal to
        this hook's own mutations, but it lands a NEW filename in `poses`
        the exact same way `duplicate` does, so it needs the same reload. */
    reload: reloadScenes,
  }
}
