/* « Proposer des scènes » — what one wants to show, in French, and the local
   model writes scenes for it (IT-11, chantier 6). Presentation only: props and
   callbacks, no API call (`.claude/rules/frontend.md`); `useSceneProposals`
   holds the state and the call.

   THE WORD « INTENTION » KEEPS ONE MEANING. It used to name this free text as
   well as the catalog key the scene is filed under. The free text is now the
   BRIEF (« ce que tu veux montrer »); the intention and the place are picked
   from the world's lists, and the model never writes the décor of the place:
   it joins the scene at launch. */
import { Dialog } from '../../chrome/Dialog'
import type { Creative } from '../../state/TaxonomyContext'
import type { WorldPlace } from '../worlds/useWorldCatalog'
import type { Proposal, ProposalRequest } from './useSceneProposals'

const FIELD = 'flex flex-col gap-[5px]'

export function ProposeDialog({
  request,
  intentions,
  places,
  busy,
  error,
  proposals,
  onPatch,
  onPropose,
  onAdd,
  onIgnore,
  onClose,
}: {
  request: ProposalRequest
  intentions: Creative['intentions']
  places: WorldPlace[]
  busy: boolean
  error: string | null
  /** `null` until the model answered once. */
  proposals: Proposal[] | null
  onPatch: (patch: Partial<ProposalRequest>) => void
  onPropose: () => void
  onAdd: (index: number) => void
  onIgnore: (index: number) => void
  onClose: () => void
}) {
  const placeLabel = (key: string | undefined) => places.find((p) => p.id === key)?.label || key
  return (
    <Dialog
      id="proposeBox"
      open
      initialFocus="#proposeBrief"
      onDismiss={onClose}
      className="w-[min(640px,calc(100vw-32px))] max-w-[min(640px,calc(100vw-32px))]"
      /* Up to six proposals: the plate scrolls rather than run past the
         viewport, where the shared `dialog` rule would leave them unreachable. */
      cardClassName="w-[min(640px,100%)]! p-[20px]! max-h-[calc(100vh-32px)] overflow-y-auto"
    >
      <h3 className="mb-[4px]! text-[16px]!">Proposer des scènes</h3>
      <p className="tiny mt-0 mb-[14px]">
        Le modèle de langage local écrit ce qui se passe ; le décor du lieu choisi s'ajoute au
        lancement. Rien n'est enregistré avant que tu ajoutes une proposition, puis que tu enregistres
        la banque.
      </p>

      <div className="flex flex-col gap-[12px]">
        <div className={FIELD}>
          <label className="lab" htmlFor="proposeBrief">
            Ce que tu veux montrer
          </label>
          <textarea
            id="proposeBrief"
            className="min-h-[70px]"
            placeholder="ex : elle bouture ses plantes le matin, avant le café"
            value={request.brief}
            onChange={(e) => onPatch({ brief: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-[12px]">
          <div className={FIELD}>
            <label className="lab" htmlFor="proposeIntention">
              Intention
            </label>
            <select
              id="proposeIntention"
              value={request.intention}
              onChange={(e) => onPatch({ intention: e.target.value })}
            >
              <option value="">— le modèle choisit —</option>
              {(intentions ?? []).map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          <div className={FIELD}>
            <label className="lab" htmlFor="proposePlace">
              Lieu
            </label>
            <select id="proposePlace" value={request.place} onChange={(e) => onPatch({ place: e.target.value })}>
              <option value="">— aucun, décrit dans la scène —</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.label || place.id}
                </option>
              ))}
            </select>
          </div>
          <div className={FIELD}>
            <label className="lab" htmlFor="proposeCount">
              Nombre
            </label>
            <input
              id="proposeCount"
              type="number"
              min={1}
              max={6}
              value={request.count}
              onChange={(e) => onPatch({ count: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-[12px]">
          <button type="button" className="btn primary sm" id="btnPropose" disabled={busy} onClick={onPropose}>
            Proposer
          </button>
          <span className="tiny" role="status" id="proposeStatus">
            {busy ? 'le modèle rédige… (~20 s)' : proposals ? `${proposals.length} proposition(s)` : ''}
          </span>
        </div>
        {error && (
          <p className="tiny m-0 text-danger-txt" role="alert">
            {error}
          </p>
        )}
      </div>

      {proposals && proposals.length > 0 && (
        <section aria-label="Propositions" className="mt-[16px] flex flex-col gap-[8px]" id="proposals">
          {proposals.map((proposal, index) => (
            <article
              key={`${proposal.id}-${index}`}
              className="rounded-card border border-line bg-panel px-[13px] py-[10px]"
              data-proposal={proposal.id}
            >
              <div className="flex items-center gap-[10px]">
                <b className="min-w-0 flex-1 truncate text-[13.5px]">{proposal.id}</b>
                <button type="button" className="btn sm" data-add={index} onClick={() => onAdd(index)}>
                  Ajouter
                </button>
                <button type="button" className="link" data-ignore={index} onClick={() => onIgnore(index)}>
                  Ignorer
                </button>
              </div>
              <span className="tiny">
                {proposal.intention || 'sans intention'} · {proposal.place ? `lieu ${placeLabel(proposal.place)}` : 'sans lieu'} ·{' '}
                {proposal.format}
              </span>
              <p className="mt-[6px] mb-[4px] text-[13px] text-dim">{proposal.prompt}</p>
              {Object.entries(proposal.wardrobe ?? {}).map(([level, outfit]) => (
                <div className="text-[12px] text-dim2" key={level}>
                  tenue n{level} · {String(outfit)}
                </div>
              ))}
              {(proposal.variants ?? []).length > 0 && (
                <div className="text-[12px] text-dim2">variantes · {(proposal.variants ?? []).join(' | ')}</div>
              )}
              {(proposal.alertes ?? []).length > 0 && (
                <div className="mt-[4px] text-[12px] text-warn-txt">
                  <span aria-hidden="true">⚠ </span>à relire — {(proposal.alertes ?? []).join(' · ')}
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      <div className="mt-[16px] flex justify-end">
        <button type="button" className="btn sm" onClick={onClose}>
          Fermer
        </button>
      </div>
    </Dialog>
  )
}
