/* The gestures of ONE catalog: select, create, save, remove. Extracted from
   `WorldPlacesScreen` on 21/09, the day a world gained a second catalog —
   the adult one — and the screen would otherwise have grown a copy of its
   own body.

   It holds state and calls back into `useWorldPlaces`; it never talks to the
   API itself (`.claude/rules/frontend.md`: the loader owns the calls, this
   owns the gestures).

   ONE INSTANCE PER CATALOG, and that is the point: two catalogs open at once
   each keep their own selection and their own « creating » state. Sharing
   one would make opening a place on one side close the other's inspector,
   which is exactly the kind of coupling a second instance costs nothing to
   avoid. */
import { useCallback, useState } from 'react'

import type { Place } from './useWorldPlaces'

export type PlacePatch = { id: string; label: string; intention: string; prompt: string }

type Catalogue = {
  places: Place[] | null
  save: (next: Place[]) => Promise<{ ok: boolean; erreur?: string }>
}

export const BLANK_PLACE: Place = { id: '', label: '', intention: '', prompt: '' }

export function useCatalogueEditor(
  catalogue: Catalogue,
  handlers: {
    onSaved: (message: string) => void
    confirmRemoval: (place: Place) => Promise<boolean>
  },
) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const selected = creatingNew
    ? BLANK_PLACE
    : (catalogue.places?.find((p) => p.id === selectedId) ?? null)

  const open = useCallback((id: string) => {
    setSelectedId(id)
    setCreatingNew(false)
    setStatus(null)
  }, [])

  const add = useCallback(() => {
    setSelectedId(null)
    setCreatingNew(true)
    setStatus(null)
  }, [])

  const close = useCallback(() => {
    setSelectedId(null)
    setCreatingNew(false)
  }, [])

  const save = async (patch: PlacePatch) => {
    const current = catalogue.places ?? []
    if (creatingNew && current.some((p) => p.id === patch.id)) {
      setStatus(`identifiant « ${patch.id} » déjà utilisé dans ce catalogue`)
      return
    }
    setSaving(true)
    const next = creatingNew
      ? [...current, patch]
      : current.map((p) => (p.id === selectedId ? { ...p, ...patch } : p))
    const result = await catalogue.save(next)
    setSaving(false)
    setStatus(result.ok ? 'lieu enregistré' : (result.erreur ?? 'échec'))
    if (result.ok) {
      handlers.onSaved('catalogue du monde enregistré')
      setCreatingNew(false)
      setSelectedId(patch.id)
    }
  }

  const remove = async (id: string) => {
    const place = catalogue.places?.find((p) => p.id === id)
    if (!place) return
    if (!(await handlers.confirmRemoval(place))) return
    const result = await catalogue.save((catalogue.places ?? []).filter((p) => p.id !== id))
    if (!result.ok) {
      handlers.onSaved(result.erreur ?? 'échec du retrait')
      return
    }
    if (selectedId === id) setSelectedId(null)
    handlers.onSaved('lieu retiré')
  }

  return { selected, selectedId, creatingNew, saving, status, open, add, close, save, remove }
}
