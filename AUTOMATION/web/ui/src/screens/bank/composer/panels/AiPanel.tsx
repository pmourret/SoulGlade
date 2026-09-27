/* Amélioration IA de la scène entière (design-pass screen-7c §6, option 6a ;
   mise en page de screen-ameliorer §S4 ; IT-10 chantier 8, étape 3).

   Une demande en une rangée — consigne, portée, « Proposer » —, des raccourcis
   qui remplissent la consigne. Le serveur réécrit chaque fragment par son
   propre appel, sous la consigne, qui passe avant ses règles
   (`enhance.enhance_scene`). La proposition se lit en TABLEAU, Fragment ·
   Actuel · Proposé, une ligne par fragment changé, chacune avec sa case
   Garder.

   APPLIQUER EST UNE SEULE MODIFICATION. Les fragments GARDÉS partent dans UN
   `onPatch`, donc un seul Ctrl+Z les rend tous. Rien n'est enregistré : c'est
   le brouillon de la scène.

   LA PROPOSITION RÉPOND POUR UN ÉTAT. Elle garde les trois fragments qu'elle
   a lus, et disparaît dès que l'un d'eux change ailleurs.

   « PROPOSER AUTRE CHOSE » relance la même demande à une température plus
   libre : mesuré le 27/09, c'est une vraie autre version.

   LES LIGNES S'EMPILENT PAR LE CONTENEUR, JAMAIS PAR LA FENÊTRE. Seuil 560 px,
   et non les 720 de la spec : mesuré le 27/09, ce panneau fait 624 px à 1440
   et 880 à 1024 (la grille du composeur passe en une colonne), donc 720 aurait
   empilé la grande fenêtre et pas la petite. 132 + 2 × 214 garde une
   trentaine de caractères par colonne. */
import { useEffect, useRef, useState } from 'react'

import type { Enhancer, ScenePart } from '../../../../api/useEnhance'
import { useFocusAfter } from '../../../../chrome/useEnhance'
import { WordLine } from '../../../../chrome/WordDiff'
import { diffWords } from '../../../../lib/diff'
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

const ALL_KEPT: Record<ScenePart, boolean> = { base: true, light: true, pose: true }

/* Under 560 px of container, a row stacks: Actuel over Proposé. */
const STACK = '@max-[560px]:block @max-[560px]:w-auto'

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
  const [keep, setKeep] = useState(ALL_KEPT)
  /* The focus is never dropped: see chrome/useEnhance. */
  const rootRef = useRef<HTMLDivElement>(null)
  const runRef = useRef<HTMLButtonElement>(null)
  const proposalRef = useRef<HTMLDivElement>(null)
  const focusAfter = useFocusAfter(rootRef)

  const current = fragmentsOf(draft)
  const shown =
    proposal && PARTS.every(({ key }) => proposal.before[key] === current[key]) ? proposal : null
  const changed = shown ? PARTS.filter(({ key }) => shown.after[key] !== shown.before[key]) : []
  const kept = changed.filter(({ key }) => keep[key])
  const targets = scope === 'all' ? PARTS.map((p) => p.key) : [scope]
  const empty = targets.every((key) => !current[key].trim())

  /* A fragment moved elsewhere (undo, another tab): the proposal goes, and
     the focus it held goes back to « Proposer ». */
  useEffect(() => {
    if (proposal && !shown) {
      setProposal(null)
      focusAfter(runRef)
    }
  })

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
    if (!outcome.ok) {
      setError(outcome.erreur)
      focusAfter(runRef)
      return
    }
    setKeep(ALL_KEPT)
    setProposal({ before, after: outcome.parts, translated: outcome.translated, lost: outcome.lost })
    focusAfter(proposalRef)
  }

  function close() {
    setProposal(null)
    focusAfter(runRef)
  }

  function apply() {
    if (!shown || kept.length === 0) return
    onPatch(Object.fromEntries(kept.map(({ key, field }) => [field, shown.after[key]])))
    close()
  }

  return (
    /* Un champ, des puces et une comparaison : ce panneau garde sa mesure de
       lecture plutôt que de s'étaler sur toute la colonne. */
    <div className="@container flex max-w-[880px] flex-col gap-[12px]" data-ai-panel ref={rootRef}>
      <div className="flex flex-wrap items-end gap-[10px]">
        <div className="min-w-[200px] flex-1">
          <label className="lab mb-[4px] block" htmlFor="aiInstruction">
            Consigne (facultative)
          </label>
          <input
            id="aiInstruction"
            placeholder="ex : rends la lumière plus douce, garde le cadrage"
            value={instruction}
            disabled={worldLinked}
            onChange={(event) => setInstruction(event.target.value)}
          />
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
        {/* Secondary: the screen's primary stays « Enregistrer ». */}
        <span data-hint-text={enhancer.comfy ? undefined : 'nécessite ComfyUI en ligne'}>
          <button
            ref={runRef}
            type="button"
            className="btn sm"
            data-ai-run
            disabled={busy || worldLinked || !enhancer.comfy || empty}
            onClick={() => void run(false)}
          >
            {busy ? 'Amélioration…' : 'Proposer'}
          </button>
        </span>
      </div>

      <div className="flex flex-wrap gap-[6px]">
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
            {instruction === shortcut && <span aria-hidden="true">✓ </span>}
            {shortcut}
          </button>
        ))}
      </div>

      {worldLinked ? (
        <p className="m-0 text-[12px] text-dim2">Fragments {lockedNote}</p>
      ) : (
        empty && <p className="m-0 text-[12px] text-dim2">Rien à améliorer : ce fragment est vide.</p>
      )}

      {error && (
        <p className="m-0 text-[12px] text-danger-txt" role="alert">
          {error}
        </p>
      )}

      {shown && (
        <div
          ref={proposalRef}
          tabIndex={-1}
          aria-label="Réécriture proposée"
          className="rounded-card border border-line bg-panel"
          data-ai-proposal
        >
          <p className="m-0 px-[12px] pt-[10px] pb-[6px] text-[12.5px]" data-ai-summary>
            {changed.length === 0
              ? 'Aucun fragment ne change.'
              : `${changed.length} fragment${changed.length > 1 ? 's changent' : ' change'} : ${changed
                  .map((p) => p.label)
                  .join(', ')}`}
          </p>
          {changed.length > 0 && (
            <table className="w-full table-fixed border-collapse text-[12.5px]">
              <thead className="@max-[560px]:sr-only">
                <tr>
                  <th scope="col" className="lab w-[132px]">Fragment</th>
                  <th scope="col" className="lab">− Actuel</th>
                  <th scope="col" className="lab">{shown.translated ? '+ Proposé, traduit' : '+ Proposé'}</th>
                </tr>
              </thead>
              <tbody>
                {changed.map(({ key, label }) => {
                  const words = shown.translated ? null : diffWords(shown.before[key], shown.after[key])
                  const lost = shown.lost[key]
                  return (
                    <tr key={key} data-ai-part={key} className={keep[key] ? undefined : 'opacity-50'}>
                      <td className={`align-top ${STACK}`}>
                        <label className="flex cursor-pointer items-start gap-[6px]">
                          <input
                            type="checkbox"
                            className="mt-[1px] w-auto flex-none"
                            checked={keep[key]}
                            data-ai-keep={key}
                            onChange={(event) => setKeep({ ...keep, [key]: event.target.checked })}
                          />
                          <span>
                            <span className="sr-only">Garder </span>
                            <span className="lab block">{label}</span>
                            {!keep[key] && (
                              <span className="block text-[12px] text-dim">écarté, reste tel quel</span>
                            )}
                          </span>
                        </label>
                      </td>
                      <td className={`align-top ${STACK}`} style={{ backgroundColor: 'var(--diff-del-bg)' }}>
                        <span aria-hidden="true">− </span>
                        <span className="sr-only">Actuel : </span>
                        {words ? <WordLine spans={words.before} side="del" /> : shown.before[key]}
                      </td>
                      <td className={`align-top ${STACK}`} style={{ backgroundColor: 'var(--diff-add-bg)' }}>
                        <span aria-hidden="true">+ </span>
                        <span className="sr-only">Proposé : </span>
                        {words ? <WordLine spans={words.after} side="add" /> : shown.after[key]}
                        {lost.length > 0 && (
                          <span className="mt-[4px] block text-[12px] text-warn-txt">
                            {shown.translated ? 'Mots de la traduction non repris' : 'Mots non repris'} :{' '}
                            {lost.join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <div className="flex min-h-[52px] flex-wrap items-center gap-[8px] px-[12px] py-[8px]">
            <button
              type="button"
              className="btn sm primary"
              data-ai-apply
              disabled={kept.length === 0}
              onClick={apply}
            >
              Appliquer {kept.length} fragment{kept.length > 1 ? 's' : ''}
            </button>
            <button type="button" className="btn sm" data-ai-vary disabled={busy} onClick={() => void run(true)}>
              Proposer autre chose
            </button>
            <button type="button" className="btn sm" data-ai-reject onClick={close}>
              Rejeter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
