/* « Améliorer » as a revision IN the field (design-pass screen-ameliorer,
   option 18b; IT-10 chantier 8 for the call itself).

   THE STATE AND THE GESTURES, NOT THE LOOK: `EnhanceTrigger` paints the head
   row, `RevisionView` the field, `EnhanceField` puts both together for the
   common case. A caller with a field of its own shape (the composer's prompt
   field, the edit instruction) takes this hook and places the two pieces.

   NOTHING IS SAVED. The call comes in with `enhancer`, the write goes out as
   `onApply`: the screen owning the field decides both, and its own save stays
   the only save.

   THE PROPOSAL ANSWERS FOR ONE TEXT. It remembers the text it was asked about
   and is only shown while the field still holds it. The field is read-only
   during the revision, so a change can only come from elsewhere (undo,
   another panel): the revision then closes without writing anything, and the
   focus goes back to the trigger rather than to the page.

   A TRANSLATED PROPOSAL IS NOT DIFFED (no word in common): it is shown, the
   original one click away. Words not kept are said in words (`lost`).

   NOTHING TO CHANGE IS SAID, NOT SHOWN: no revision of a text with itself.

   THE FOCUS IS NEVER DROPPED (audit of 27/09, measured). The trigger is
   disabled while the model answers, and a disabled button loses the focus to
   the page: the revision takes it when it arrives; Appliquer, Rejeter and
   Escape give it back to the trigger. An error, like a proposal, answers for
   one text and goes when the text changes. */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

import type { EnhanceKind, Enhancer } from '../api/useEnhance'

type Proposal = { before: string; text: string; translated: boolean; lost: string[] }

/** Move the focus after the next render — `focusAfter(ref)` — unless the
    user put it somewhere else meanwhile: only from the page body (where a
    disabled button or an unmounted element drops it) or from inside `root`.
    Shared with the AI panel. */
export function useFocusAfter(root: RefObject<HTMLElement | null>) {
  const next = useRef<RefObject<HTMLElement | null> | null>(null)
  useEffect(() => {
    const target = next.current?.current
    if (!target) return
    next.current = null
    const active = document.activeElement
    if (active === document.body || !active || root.current?.contains(active)) target.focus()
  })
  return (target: RefObject<HTMLElement | null>) => {
    next.current = target
  }
}

export function useEnhance({
  label,
  kind,
  value,
  onApply,
  enhancer,
  disabled,
}: {
  /** The field's own label, for the accessible names. */
  label: string
  /** What the fragment is, for the rules the model gets (`enhance.KINDS`). */
  kind: EnhanceKind
  value: string
  onApply: (text: string) => void
  /** The screen's `useEnhancer()`: the call, and whether ComfyUI is up. */
  enhancer: Enhancer
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState<{ before: string; text: string } | null>(null)
  const [showRemoved, setShowRemoved] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const runRef = useRef<HTMLButtonElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const focusAfter = useFocusAfter(rootRef)

  const current = proposal && proposal.before === value ? proposal : null
  const revision = current && current.text !== current.before ? current : null
  /* An edit instruction is only translated: the trigger says so. */
  const translateOnly = kind === 'edit'

  /* The value moved elsewhere while a revision was open: it closes, and the
     focus it held goes back to the trigger. Only a REVISION: the field is
     hidden then, so the focus cannot be in it; after « rien à changer » the
     user may be typing in the field, and must keep the focus there. */
  useEffect(() => {
    if (proposal && proposal.before !== value) {
      setProposal(null)
      if (proposal.text !== proposal.before) focusAfter(runRef)
    }
  })

  async function run() {
    const before = value
    setBusy(true)
    setError(null)
    setProposal(null)
    setShowRemoved(false)
    setShowOriginal(false)
    const outcome = await enhancer.enhance(kind)(before)
    setBusy(false)
    if (!outcome.ok) {
      setError({ before, text: outcome.erreur })
      focusAfter(runRef)
      return
    }
    setProposal({ before, text: outcome.text, translated: outcome.translated, lost: outcome.lost })
    focusAfter(outcome.text === before ? runRef : boxRef)
  }

  function reject() {
    setProposal(null)
    focusAfter(runRef)
  }

  function apply() {
    if (revision) onApply(revision.text)
    reject()
  }

  /* Enter applies from the box only: on a button of the head row it presses
     that button. */
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      apply()
    }
  }

  /* Escape rejects from ANYWHERE in the revision — the box, « Voir les
     retraits », « Voir l'original », Appliquer — not only from the box
     (audit of 27/09: from « Voir l'original » it did nothing at 1440, and at
     1024 it closed the inspector's drawer around the field instead). A native
     listener on the root runs before the drawer's, and stops the key there. */
  const open = Boolean(revision)
  useEffect(() => {
    const root = rootRef.current
    if (!open || !root) return
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setProposal(null)
      focusAfter(runRef)
    }
    root.addEventListener('keydown', onEscape)
    return () => root.removeEventListener('keydown', onEscape)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focusAfter only writes a ref
  }, [open])

  return {
    label,
    translateOnly,
    action: translateOnly ? 'Traduire' : 'Améliorer',
    busy,
    comfy: enhancer.comfy,
    canRun: !busy && !disabled && enhancer.comfy && Boolean(value.trim()),
    revision,
    same: Boolean(current && !revision),
    error: error && error.before === value ? error.text : null,
    showRemoved,
    toggleRemoved: () => setShowRemoved((shown) => !shown),
    showOriginal,
    toggleOriginal: () => setShowOriginal((shown) => !shown),
    run,
    apply,
    reject,
    onKeyDown,
    rootRef,
    runRef,
    boxRef,
    helpId,
  }
}

export type Enhance = ReturnType<typeof useEnhance>
