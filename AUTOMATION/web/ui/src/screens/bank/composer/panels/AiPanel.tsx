/* Amélioration IA de la scène entière (design-pass screen-7c §6, option 6a ;
   IT-10 chantier 8, étape 3).

   Une consigne libre, des raccourcis qui la remplissent, une portée (toute la
   scène ou un seul fragment), et « Proposer ». Le serveur réécrit chaque
   fragment par son propre appel, sous la consigne, qui passe avant ses règles
   (`enhance.enhance_scene`). La proposition se lit fragment par fragment, avec
   la même comparaison que le bouton « Améliorer » d'un champ (`ProposalView`).

   APPLIQUER EST UNE SEULE MODIFICATION. Les fragments changés partent dans UN
   `onPatch`, donc un seul Ctrl+Z les rend tous. Rien n'est enregistré : c'est
   le brouillon de la scène.

   LA PROPOSITION RÉPOND POUR UN ÉTAT. Elle garde les trois fragments qu'elle
   a lus, et disparaît dès que l'un d'eux change dans un autre onglet.

   « PROPOSER AUTRE CHOSE » relance la même demande à une température plus
   libre : mesuré le 27/09, c'est une vraie autre version. */
import { useState } from 'react'

import type { Enhancer, ScenePart } from '../../../../api/useEnhance'
import { ProposalView } from '../../../../chrome/EnhanceControl'
import type { SceneDraft } from '../../../../state/ScenesStoreContext'

const SHORTCUTS = [
  'Plus naturel',
  'Plus court',
  'Plus précis sur la lumière',
  'Style photo amateur',
]

/* Where each fragment lives in the draft, and its name on screen. */
const PARTS: { key: ScenePart; field: 'promptBase' | 'promptLight' | 'promptPose'; label: string }[] = [
  { key: 'base', field: 'promptBase', label: 'Ce qui s’y passe' },
  { key: 'light', field: 'promptLight', label: 'Lumière' },
  { key: 'pose', field: 'promptPose', label: 'Pose' },
]

type Scope = 'all' | ScenePart
type Fragments = Record<ScenePart, string>
type Proposal = { before: Fragments; after: Fragments; translated: boolean; lost: Record<ScenePart, string[]> }

function fragmentsOf(draft: SceneDraft): Fragments {
  return { base: draft.promptBase, light: draft.promptLight, pose: draft.promptPose }
}

export function AiPanel({
  draft,
  enhancer,
  worldLinked,
  lockedNote,
  onPatch,
}: {
  draft: SceneDraft
  enhancer: Enhancer
  /** A scene taken from the world: its fragments are locked (see PromptField). */
  worldLinked: boolean
  lockedNote: string
  onPatch: (patch: Partial<SceneDraft>) => void
}) {
  const [instruction, setInstruction] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)

  const current = fragmentsOf(draft)
  const shown =
    proposal && PARTS.every(({ key }) => proposal.before[key] === current[key]) ? proposal : null
  const changed = shown ? PARTS.filter(({ key }) => shown.after[key] !== shown.before[key]) : []
  const targets = scope === 'all' ? PARTS.map((p) => p.key) : [scope]
  const empty = targets.every((key) => !current[key].trim())

  async function run(vary: boolean) {
    const before = current
    setBusy(true)
    setError(null)
    setProposal(null)
    const outcome = await enhancer.enhanceScene({
      ...before,
      instruction,
      only: scope === 'all' ? null : scope,
      vary,
    })
    setBusy(false)
    if (!outcome.ok) setError(outcome.erreur)
    else setProposal({ before, after: outcome.parts, translated: outcome.translated, lost: outcome.lost })
  }

  function apply() {
    if (!shown) return
    onPatch(Object.fromEntries(changed.map(({ key, field }) => [field, shown.after[key]])))
    setProposal(null)
  }

  return (
    /* Un champ, des puces et une comparaison : ce panneau garde sa mesure de
       lecture plutôt que de s'étaler sur toute la colonne. */
    <div className="flex max-w-[880px] flex-col gap-[14px]" data-ai-panel>
      <div>
        <label className="tiny mb-[4px] block" htmlFor="aiInstruction">
          Consigne <span className="text-dim2">(facultative)</span>
        </label>
        <input
          id="aiInstruction"
          placeholder="ex : rends la lumière plus douce, garde le cadrage"
          value={instruction}
          disabled={worldLinked}
          onChange={(event) => setInstruction(event.target.value)}
        />
        <div className="mt-[8px] flex flex-wrap gap-[6px]">
          {SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut}
              type="button"
              disabled={worldLinked}
              aria-pressed={instruction === shortcut}
              className="cursor-pointer rounded-[999px] border border-line2 bg-transparent px-[11px] py-[5px]
                         text-[12px] text-dim hover:text-txt disabled:cursor-not-allowed disabled:opacity-50
                         aria-pressed:border-pri aria-pressed:text-txt"
              onClick={() => setInstruction(shortcut)}
            >
              {shortcut}
            </button>
          ))}
        </div>
      </div>

      <div className="seg" role="radiogroup" aria-label="Portée de l'amélioration">
        {([['all', 'Toute la scène'], ...PARTS.map((p) => [p.key, p.label])] as [Scope, string][]).map(
          ([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={scope === key}
              className={scope === key ? 'on' : undefined}
              data-ai-scope={key}
              onClick={() => setScope(key)}
            >
              {label}
            </button>
          ),
        )}
      </div>

      <div className="flex items-center gap-[12px]">
        <span data-hint-text={enhancer.comfy ? undefined : 'nécessite ComfyUI en ligne'}>
          <button
            type="button"
            className="btn primary"
            data-ai-run
            disabled={busy || worldLinked || !enhancer.comfy || empty}
            onClick={() => void run(false)}
          >
            {busy ? 'Amélioration…' : 'Proposer'}
          </button>
        </span>
        {worldLinked ? (
          <span className="text-[12px] text-dim2">Fragments {lockedNote}</span>
        ) : (
          empty && <span className="text-[12px] text-dim2">Rien à améliorer : ce fragment est vide.</span>
        )}
      </div>

      {error && (
        <p className="m-0 text-[12px] text-danger-txt" role="alert">
          {error}
        </p>
      )}

      {shown && (
        <div className="rounded-card border border-line bg-panel px-[12px] py-[10px]" data-ai-proposal>
          <p className="m-0 mb-[8px] text-[12.5px]" data-ai-summary>
            {changed.length === 0
              ? 'Aucun fragment ne change.'
              : `${changed.length} fragment${changed.length > 1 ? 's changent' : ' change'} : ${changed
                  .map((p) => p.label)
                  .join(', ')}`}
          </p>
          <div className="flex flex-col gap-[12px]">
            {changed.map(({ key, label }) => (
              <div key={key} data-ai-part={key}>
                <span className="lab">{label}</span>
                <div className="mt-[4px]">
                  <ProposalView
                    before={shown.before[key]}
                    after={shown.after[key]}
                    translated={shown.translated}
                    lost={shown.lost[key]}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-[10px] flex flex-wrap items-center gap-[8px]">
            <button
              type="button"
              className="btn sm primary"
              data-ai-apply
              disabled={changed.length === 0}
              onClick={apply}
            >
              Appliquer
            </button>
            <button type="button" className="btn sm" data-ai-vary disabled={busy} onClick={() => void run(true)}>
              Proposer autre chose
            </button>
            <button type="button" className="btn sm" data-ai-reject onClick={() => setProposal(null)}>
              Rejeter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
