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
   a synonym shows up there too, and the user is the judge. */
import { useState } from 'react'

import type { EnhanceKind, Enhancer } from '../api/useEnhance'
import { diffWords } from '../lib/diff'
import { WordLine } from './WordDiff'

type Proposal = { before: string; text: string; translated: boolean; lost: string[] }

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
  const [error, setError] = useState<string | null>(null)
  const shown = proposal && proposal.before === value ? proposal : null
  const { comfy } = enhancer

  async function run() {
    const before = value
    setBusy(true)
    setError(null)
    setProposal(null)
    const outcome = await enhancer.enhance(kind)(before)
    setBusy(false)
    if (!outcome.ok) setError(outcome.erreur)
    else setProposal({ before, text: outcome.text, translated: outcome.translated, lost: outcome.lost })
  }

  return (
    <div className="mt-[6px] max-w-[880px]" data-enhance>
      {/* The hint sits on the WRAPPER: a disabled button fires no mouse
          event, so the one state where it matters would never show it. */}
      <span data-hint-text={comfy ? undefined : 'nécessite ComfyUI en ligne'}>
        <button
          type="button"
          className="btn sm"
          data-enhance-run
          aria-label={`Améliorer « ${label} » par l'IA`}
          disabled={busy || disabled || !comfy || !value.trim()}
          onClick={() => void run()}
        >
          {busy ? 'Amélioration…' : 'Améliorer'}
        </button>
      </span>

      {error && (
        <p className="mt-[4px] mb-0 text-[12px] text-danger-txt" role="alert">
          {error}
        </p>
      )}

      {shown && (
        <div className="mt-[8px] rounded-card border border-line bg-panel px-[12px] py-[10px]" data-enhance-proposal>
          <ProposalView before={shown.before} after={shown.text} translated={shown.translated} lost={shown.lost} />

          <div className="mt-[10px] flex items-center gap-[8px]">
            <button
              type="button"
              className="btn sm primary"
              data-enhance-apply
              onClick={() => {
                onApply(shown.text)
                setProposal(null)
              }}
            >
              Appliquer
            </button>
            <button type="button" className="btn sm" data-enhance-reject onClick={() => setProposal(null)}>
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
          Mots non repris : {lost.join(', ')}
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
