/* The draft of ONE place being edited — its four fields, whether they differ
   from what is on disk, and the way back.

   IT USED TO LIVE INSIDE `PlaceInspector`, four `useState` reset by an effect.
   It comes up here because the chrome's `DirtyBar` (design-pass screen-11 §S5.4)
   now carries the save, and a banner cannot ask a component below it whether it
   is dirty.

   ITS OWN FILE, not a slice of `useCatalogueEditor`: the Banque's Monde tab
   (`screens/bank/BankScreen.tsx`) edits one place too, without a catalog editor
   of any kind, and would otherwise copy the reset by hand
   (`.claude/rules/frontend.md`: shared by two, owned by neither).

   THE RESET IS KEYED ON THE PLACE'S ID, NOT ON ITS CONTENT. Saving reloads the
   catalog, so `place` becomes a NEW object holding what was just written —
   resetting on content would be harmless there, but it would also wipe a field
   typed while the save was in flight. The id changes exactly when another place
   is opened, which is the one moment the draft is stale. `epoch` bumps it for
   the one other case: a deliberate `reset()`. */
import { useCallback, useMemo, useState } from 'react'

import type { Place } from './useWorldPlaces'

export type PlacePatch = { id: string; label: string; intention: string; prompt: string }

const patchOf = (place: Place | null): PlacePatch => ({
  id: place?.id ?? '',
  label: place?.label ?? '',
  intention: place?.intention ?? '',
  prompt: place?.prompt ?? '',
})

export function usePlaceDraft(place: Place | null) {
  const [edits, setEdits] = useState<Partial<PlacePatch>>({})
  const [epoch, setEpoch] = useState(0)
  const [key, setKey] = useState<string | null>(null)

  const saved = useMemo(() => patchOf(place), [place])
  const currentKey = `${place?.id ?? ''}#${epoch}`

  /* Derived during render rather than in an effect: an effect would paint one
     frame of the PREVIOUS place's text under the new place's title. */
  const live = key === currentKey ? edits : {}
  if (key !== currentKey) {
    setKey(currentKey)
    setEdits({})
  }

  const draft: PlacePatch = { ...saved, ...live }
  const patch = useCallback((next: Partial<PlacePatch>) => {
    setEdits((previous) => ({ ...previous, ...next }))
  }, [])
  const reset = useCallback(() => setEpoch((n) => n + 1), [])

  const dirty = (Object.keys(draft) as (keyof PlacePatch)[]).some((k) => draft[k] !== saved[k])

  return { draft, patch, dirty, reset }
}
