/* « Améliorer » on one prompt fragment (IT-10 chantier 8, design-pass
   screen-7c §6 for the Actuel / Proposé vocabulary).

   PRESENTATIONAL: the call comes in with `enhancer`, the write goes out as
   `onApply`. The screen owning the field decides both — a composer fragment
   lands in the undoable draft, a catalogue entry in its editor, and nothing
   is saved until the screen's own save.

   THE PROPOSAL ANSWERS FOR ONE TEXT. It remembers the text it was asked
   about and is only shown while the field still holds it: typing in the
   field makes a comparison with a text that no longer exists, so it goes.

   A TRANSLATED PROPOSAL IS NOT DIFFED. A French text against its English
   rewrite has no word in common, a word diff would paint everything red and
   green and say nothing: the two texts sit side by side instead.

   WORDS NOT KEPT ARE SAID IN WORDS. The server checked the proposal still
   carries every word of the input and names the ones it dropped (`lost`);
   a synonym shows up there too, and the user is the judge.

   NOTHING TO CHANGE IS SAID, NOT SHOWN. An English edit instruction comes
   back as it went (it is only translated): a comparison of a text with
   itself would ask the user to find a difference that is not there.

   THE FOCUS IS NEVER DROPPED (audit of 27/09, measured). The button is
   disabled while the model answers, and a disabled button loses the focus
   to the page: the proposal takes it when it arrives, so it is read and Tab
   leads to Appliquer; Appliquer and Rejeter give it back to the button. An
   error, like a proposal, answers for one text and goes when the text
   changes. */
import { useEffect, useRef, useState, type RefObject } from 'react'

import type { EnhanceKind, Enhancer } from '../api/useEnhance'
import { diffWords } from '../lib/diff'
import { WordLine } from './WordDiff'

type Proposal = { before: string; text: string; translated: boolean; lost: string[] }

/** Move the focus after the next render — `focusAfter(ref)` — unless the
    user put it somewhere else meanwhile: only from the page body (where a
    disabled button drops it) or from inside `root`. Shared with the AI panel. */
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

export function EnhanceControl({
  label,
  kind,
  value,
  onApply,
  enhancer,
  disabled,
}: {
  /** The field's own label, for the button's accessible name. */
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
  const shown = proposal && proposal.before === value ? proposal : null
  const shownError = error && error.before === value ? error.text : null
  const rootRef = useRef<HTMLDivElement>(null)
  const runRef = useRef<HTMLButtonElement>(null)
  const proposalRef = useRef<HTMLDivElement>(null)
  const focusAfter = useFocusAfter(rootRef)
  const { comfy } = enhancer
  /* An edit instruction is only translated: the button says so. */
  const translateOnly = kind === 'edit'
  const action = translateOnly ? 'Traduire' : 'Améliorer'

  async function run() {
    const before = value
    setBusy(true)
    setError(null)
    setProposal(null)
    const outcome = await enhancer.enhance(kind)(before)
    setBusy(false)
    if (!outcome.ok) {
      setError({ before, text: outcome.erreur })
      focusAfter(runRef)
      return
    }
    setProposal({ before, text: outcome.text, translated: outcome.translated, lost: outcome.lost })
    focusAfter(outcome.text === before ? runRef : proposalRef)
  }

  function close() {
    setProposal(null)
    focusAfter(runRef)
  }

  return (
    <div className="mt-[6px] max-w-[880px]" data-enhance ref={rootRef}>
      {/* The hint sits on the WRAPPER: a disabled button fires no mouse
          event, so the one state where it matters would never show it. */}
      <span data-hint-text={comfy ? undefined : 'nécessite ComfyUI en ligne'}>
        <button
          ref={runRef}
          type="button"
          className="btn sm"
          data-enhance-run
          aria-label={`${action} « ${label} » par l'IA`}
          disabled={busy || disabled || !comfy || !value.trim()}
          onClick={() => void run()}
        >
          {busy ? (translateOnly ? 'Traduction…' : 'Amélioration…') : action}
        </button>
      </span>

      {shownError && (
        <p className="mt-[4px] mb-0 text-[12px] text-danger-txt" role="alert">
          {shownError}
        </p>
      )}

      {shown && shown.text === shown.before && (
        <p className="tiny mt-[4px] mb-0" data-enhance-same>
          {translateOnly
            ? 'Rien à traduire : l’instruction est déjà en anglais.'
            : 'Rien à changer : l’IA ne propose aucune modification.'}
        </p>
      )}

      {shown && shown.text !== shown.before && (
        <div
          ref={proposalRef}
          tabIndex={-1}
          aria-label={translateOnly ? 'Traduction proposée' : 'Amélioration proposée'}
          className="mt-[8px] rounded-card border border-line bg-panel px-[12px] py-[10px]"
          data-enhance-proposal
        >
          <ProposalView before={shown.before} after={shown.text} translated={shown.translated} lost={shown.lost} />

          <div className="mt-[10px] flex items-center gap-[8px]">
            <button
              type="button"
              className="btn sm primary"
              data-enhance-apply
              onClick={() => {
                onApply(shown.text)
                close()
              }}
            >
              Appliquer
            </button>
            <button type="button" className="btn sm" data-enhance-reject onClick={close}>
              Rejeter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** One proposal against the text it answers for: a word diff in the same
    language, the two texts side by side after a translation, and the words
    not kept said in words. Shared with the composer's AI panel. */
export function ProposalView({
  before,
  after,
  translated,
  lost,
}: {
  before: string
  after: string
  translated: boolean
  lost: string[]
}) {
  return (
    <>
      {translated ? (
        <div className="grid gap-[10px] sm:grid-cols-2">
          <div>
            <span className="lab">Actuel</span>
            <p className="m-0 mt-[4px] text-[12.5px] text-dim">{before}</p>
          </div>
          <div>
            <span className="lab">Proposé (traduit)</span>
            <p className="m-0 mt-[4px] text-[12.5px]" data-enhance-text>
              {after}
            </p>
          </div>
        </div>
      ) : (
        <Compared before={before} after={after} />
      )}
      {lost.length > 0 && (
        <p className="tiny mt-[8px] mb-0" data-enhance-lost>
          {/* After a translation the words are those of the English text
              the user never saw: said so, or « sitting » reads as a word of
              « assise » that vanished (audit of 27/09). */}
          {translated ? 'Mots de la traduction non repris' : 'Mots non repris'} : {lost.join(', ')}
        </p>
      )}
    </>
  )
}

/** Actuel above Proposé, the words that moved on their own ground, each line
    signed − or + and named for a reader who sees neither colour. */
function Compared({ before, after }: { before: string; after: string }) {
  const words = diffWords(before, after)
  return (
    <div className="grid gap-[4px] text-[12.5px]">
      <p className="m-0 rounded-[4px] px-[6px] py-[3px]" style={{ backgroundColor: 'var(--diff-del-bg)' }}>
        <span aria-hidden="true">− </span>
        <span className="sr-only">Actuel : </span>
        <WordLine spans={words.before} side="del" />
      </p>
      <p
        className="m-0 rounded-[4px] px-[6px] py-[3px]"
        style={{ backgroundColor: 'var(--diff-add-bg)' }}
        data-enhance-text
      >
        <span aria-hidden="true">+ </span>
        <span className="sr-only">Proposé : </span>
        <WordLine spans={words.after} side="add" />
      </p>
    </div>
  )
}
