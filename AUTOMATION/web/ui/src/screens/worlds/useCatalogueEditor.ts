/* The gestures of ONE catalog of a world: select, create, save, remove — for
   places, intentions and scenes alike (IT-11 chantier 4). What differs between
   them is the spec (`catalogSpecs.ts`); the gestures are the same.

   It holds state and calls back into `useWorldCatalog`; it never talks to the
   API itself (`.claude/rules/frontend.md`: the loader owns the calls, this
   owns the gestures).

   ONE INSTANCE PER CATALOG. Each keeps its own selection and its own
   « creating » state, so coming back to a tab finds what was open there.

   THE DRAFT LIVES HERE: the chrome's `DirtyBar` carries the save (§S5.4), and
   a banner above the screen cannot ask a field below it whether it changed.
   It is keyed on the entry's identity plus an epoch, never on its content: a
   save reloads the catalog and hands back NEW objects, and resetting on
   content would wipe a field typed while the save was in flight. The epoch
   bumps for the one other case, a deliberate `reset()`. */
import { useCallback, useMemo, useState } from 'react'

import type { CatalogSpec, Draft } from './catalogSpecs'

type Catalog<T> = {
  entries: T[] | null
  save: (next: T[]) => Promise<{ ok: boolean; erreur?: string }>
}

export function useCatalogueEditor<T extends object>(
  catalog: Catalog<T>,
  spec: CatalogSpec<T>,
  handlers: {
    onSaved: (message: string) => void
    confirmRemoval: (entry: T) => Promise<boolean>
  },
) {
  const idOf = useCallback((entry: T) => String((entry as Record<string, unknown>)[spec.idKey] ?? ''), [spec.idKey])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const selected: T | null = creatingNew
    ? null
    : (catalog.entries?.find((e) => idOf(e) === selectedId) ?? null)
  const isOpen = creatingNew || selected !== null

  // ---------------------------------------------------------------- draft
  const [edits, setEdits] = useState<Draft>({})
  const [epoch, setEpoch] = useState(0)
  const [draftKey, setDraftKey] = useState<string | null>(null)
  const saved = useMemo(() => spec.toDraft(selected), [spec, selected])
  const currentKey = `${creatingNew ? '+' : (selectedId ?? '')}#${epoch}`
  /* Derived during render rather than in an effect: an effect would paint one
     frame of the PREVIOUS entry's text under the new entry's title. */
  const live = draftKey === currentKey ? edits : {}
  if (draftKey !== currentKey) {
    setDraftKey(currentKey)
    setEdits({})
  }
  const draft: Draft = { ...saved, ...live }
  const patch = useCallback((next: Draft) => setEdits((prev) => ({ ...prev, ...next })), [])
  const reset = useCallback(() => setEpoch((n) => n + 1), [])
  const dirty = isOpen && Object.keys(draft).some((k) => draft[k] !== saved[k])

  // ---------------------------------------------------------------- gestures
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

  function fail(message: string) {
    setStatus(message)
    return false
  }

  /* Returns whether the write happened: « Enregistrer puis continuer »
     (design-pass screen-11 §S1) stays put when the save is refused, rather
     than navigating away from what the server just rejected. */
  const save = async (): Promise<boolean> => {
    const current = catalog.entries ?? []
    const id = (draft[spec.idKey] ?? '').trim()
    if (creatingNew) {
      if (!id) return fail(`${spec.article} a besoin d’un ${spec.idLabel.toLowerCase()}`)
      if (!spec.idRule.test(id)) return fail(`${spec.idLabel} : ${spec.idRuleText}`)
      if (current.some((e) => idOf(e) === id)) return fail(`« ${id} » existe déjà dans ce monde`)
    }
    const missing = spec.missing(draft)
    if (missing) return fail(missing)
    const next = creatingNew
      ? [...current, spec.toEntry(draft, null)]
      : current.map((e) => (idOf(e) === selectedId ? spec.toEntry({ ...draft, [spec.idKey]: selectedId! }, e) : e))
    setSaving(true)
    const result = await catalog.save(next)
    setSaving(false)
    setStatus(result.ok ? `${spec.noun} enregistré${spec.article.startsWith('une') ? 'e' : ''}` : (result.erreur ?? 'échec'))
    if (!result.ok) return false
    handlers.onSaved(`${spec.noun} enregistré${spec.article.startsWith('une') ? 'e' : ''}`)
    setCreatingNew(false)
    setSelectedId(creatingNew ? id : selectedId)
    reset()
    return true
  }

  const remove = async (id: string) => {
    const entry = catalog.entries?.find((e) => idOf(e) === id)
    if (!entry || !(await handlers.confirmRemoval(entry))) return
    const result = await catalog.save((catalog.entries ?? []).filter((e) => idOf(e) !== id))
    if (!result.ok) {
      setStatus(result.erreur ?? 'échec du retrait')
      handlers.onSaved(result.erreur ?? 'échec du retrait')
      return
    }
    if (selectedId === id) setSelectedId(null)
    handlers.onSaved(`${spec.noun} retiré${spec.article.startsWith('une') ? 'e' : ''}`)
  }

  return {
    spec, selected, selectedId, creatingNew, isOpen, saving, status,
    draft, saved, patch, dirty, reset,
    open, add, close, save, remove,
  }
}

export type CatalogueEditor<T extends object = object> = ReturnType<typeof useCatalogueEditor<T>>
