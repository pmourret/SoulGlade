/* The gestures of a world's TONES: select, create, save, remove — twin of
   `useCatalogueEditor` for places, intentions and scenes.

   A TWIN, NOT A GENERALISATION. A place is keyed by `id` and needs a prompt;
   a tone is keyed by `key`, may carry an empty fragment (a tone can be only an
   expression), and keeps its `expression` range untouched when its text is
   edited here. Bending one hook over both would put those differences behind
   flags in every function.

   THE DRAFT LIVES HERE (same reason as in `useCatalogueEditor`): the chrome's
   `DirtyBar` carries the save, and a banner cannot ask a field below it whether
   it changed. Keyed on the tone's key plus an epoch, never on its content, so a
   save that reloads the list does not wipe a field typed meanwhile. */
import { useCallback, useMemo, useState } from 'react'

import { TONE_KEY_RE } from './slugify'
import type { WorldTone } from './useWorldTones'

export type TonePatch = { key: string; label: string; prompt_add: string }

type Catalogue = {
  tones: WorldTone[] | null
  save: (next: WorldTone[]) => Promise<{ ok: boolean; erreur?: string }>
}

const patchOf = (tone: WorldTone | null): TonePatch => ({
  key: tone?.key ?? '',
  label: tone?.label ?? '',
  prompt_add: tone?.prompt_add ?? '',
})

export function useToneCatalogue(
  catalogue: Catalogue,
  handlers: {
    onSaved: (message: string) => void
    confirmRemoval: (tone: WorldTone) => Promise<boolean>
  },
) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const selected: WorldTone | null = creatingNew
    ? { key: '', label: '', prompt_add: '' }
    : (catalogue.tones?.find((t) => t.key === selectedKey) ?? null)

  // ---------------------------------------------------------------- draft
  const [edits, setEdits] = useState<Partial<TonePatch>>({})
  const [epoch, setEpoch] = useState(0)
  const [draftKey, setDraftKey] = useState<string | null>(null)
  const saved = useMemo(() => patchOf(selected), [selected?.key, selected?.label, selected?.prompt_add]) // eslint-disable-line react-hooks/exhaustive-deps
  const currentKey = `${creatingNew ? '+' : (selected?.key ?? '')}#${epoch}`
  const live = draftKey === currentKey ? edits : {}
  if (draftKey !== currentKey) {
    setDraftKey(currentKey)
    setEdits({})
  }
  const draft: TonePatch = { ...saved, ...live }
  const patch = useCallback((next: Partial<TonePatch>) => setEdits((prev) => ({ ...prev, ...next })), [])
  const reset = useCallback(() => setEpoch((n) => n + 1), [])
  const dirty =
    selected !== null && (Object.keys(draft) as (keyof TonePatch)[]).some((k) => draft[k] !== saved[k])

  // ---------------------------------------------------------------- gestures
  const open = useCallback((key: string) => {
    setSelectedKey(key)
    setCreatingNew(false)
    setStatus(null)
  }, [])

  const add = useCallback(() => {
    setSelectedKey(null)
    setCreatingNew(true)
    setStatus(null)
  }, [])

  const close = useCallback(() => {
    setSelectedKey(null)
    setCreatingNew(false)
  }, [])

  /** Returns whether the write happened, so « Enregistrer puis continuer »
      stays put when the server refuses. */
  const save = async (): Promise<boolean> => {
    const current = catalogue.tones ?? []
    const key = draft.key.trim()
    if (creatingNew) {
      if (!key) return fail('un ton a besoin d’une clé')
      if (!TONE_KEY_RE.test(key)) return fail('la clé ne prend que des minuscules, chiffres et _')
      if (current.some((t) => t.key === key)) return fail(`la clé « ${key} » existe déjà dans ce monde`)
    }
    const fields = { label: draft.label.trim(), prompt_add: draft.prompt_add.trim() }
    const next = creatingNew
      ? [...current, { key, ...fields }]
      : current.map((t) => (t.key === selectedKey ? { ...t, ...fields } : t))
    setSaving(true)
    const result = await catalogue.save(next)
    setSaving(false)
    setStatus(result.ok ? 'ton enregistré' : (result.erreur ?? 'échec'))
    if (!result.ok) return false
    handlers.onSaved('tons du monde enregistrés')
    setCreatingNew(false)
    setSelectedKey(key || selectedKey)
    reset()
    return true
  }

  function fail(message: string) {
    setStatus(message)
    return false
  }

  const remove = async (key: string) => {
    const tone = catalogue.tones?.find((t) => t.key === key)
    if (!tone || !(await handlers.confirmRemoval(tone))) return
    const result = await catalogue.save((catalogue.tones ?? []).filter((t) => t.key !== key))
    if (!result.ok) {
      handlers.onSaved(result.erreur ?? 'échec du retrait')
      return
    }
    if (selectedKey === key) setSelectedKey(null)
    handlers.onSaved('ton retiré')
  }

  return {
    selected, selectedKey, creatingNew, saving, status,
    draft, patch, dirty, reset,
    open, add, close, save, remove,
  }
}

export type ToneCatalogue = ReturnType<typeof useToneCatalogue>
