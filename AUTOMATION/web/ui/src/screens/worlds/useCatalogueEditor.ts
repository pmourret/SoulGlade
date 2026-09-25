/* The gestures of ONE catalog: select, create, save, remove. Extracted from
   `WorldPlacesScreen` on 21/09, the day a world gained a second catalog —
   the adult one — and the screen would otherwise have grown a copy of its
   own body.

   It holds state and calls back into `useWorldPlaces`; it never talks to the
   API itself (`.claude/rules/frontend.md`: the loader owns the calls, this
   owns the gestures).

   ONE INSTANCE PER CATALOG, and that is the point: two catalogs each keep
   their own selection and their own « creating » state. Sharing one would make
   opening a place on one tab close the other's, which is exactly the kind of
   coupling a second instance costs nothing to avoid. The two inspectors used
   to be on screen at once (a `<details>` under the ordinary list); they are
   two tabs since the design-pass screen-11, and the independence is now what
   you find when you come BACK to a tab.

   THE DRAFT LIVES HERE SINCE THE SAME PASS, through `usePlaceDraft` — the
   chrome's `DirtyBar` carries the save (§S5.4), and a banner above the screen
   cannot ask a field below it whether it changed. `save` and `remove` did not
   move: `save` still takes the patch, the screen just hands it the draft. */
import { useCallback, useState } from 'react'

import { usePlaceDraft, type PlacePatch } from './usePlaceDraft'
import type { Place } from './useWorldPlaces'

export type { PlacePatch }

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
  const { draft, patch, dirty, reset } = usePlaceDraft(selected)

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

  /* Returns whether the write happened. The body is the one it has always had;
     the verdict is new, and it is what lets « Enregistrer puis continuer »
     (design-pass screen-11 §S1) stay where it is when the save is refused —
     without it the screen would navigate away from a place the server just
     rejected, and the refusal would scroll off with the inspector. */
  const save = async (patch: PlacePatch): Promise<boolean> => {
    const current = catalogue.places ?? []
    if (creatingNew && current.some((p) => p.id === patch.id)) {
      setStatus(`identifiant « ${patch.id} » déjà utilisé dans ce catalogue`)
      return false
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
      /* The catalog has been reloaded by `save` above, so the draft re-derives
         from what is now on disk. Without this it would stay « modifié » for
         any field the save normalised — a trimmed prompt is enough. */
      reset()
    }
    return result.ok
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

  return {
    selected, selectedId, creatingNew, saving, status,
    draft, patch, dirty, reset,
    open, add, close, save, remove,
  }
}

export type CatalogueEditor = ReturnType<typeof useCatalogueEditor>
