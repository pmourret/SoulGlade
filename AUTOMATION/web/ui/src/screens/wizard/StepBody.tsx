/* The body of one wizard step — and only the body: the steps list, the gating
   and the writes stay in the screen.

   Each step opens on a title and one sentence (design-pass screen-14 §S7). The
   three frozen steps (type, style, world) say ONCE, under that sentence, that
   the choice is frozen at creation (CLAUDE.md §8.8) — it used to hang on every
   card. Identity and Base have their own component; the three choice lists
   share this one, because they share a layout.

   All `useRovingChoice` calls happen unconditionally at the top, even though
   only one group is ever shown — the Rules of Hooks forbid a hook inside a
   branch; an empty id list is the cheap way to keep every call unconditional.

   It renders and it calls back: every `on*` prop is the screen's decision. */
import type { ReactNode } from 'react'

import { useRovingChoice } from '../../chrome/useRovingChoice'
import { BaseStep } from './BaseStep'
import { IdentityStep } from './IdentityStep'
import { OptionCard } from './OptionCard'
import {
  FROZEN_HINT, NOTE_ERR, NOTE_OK, SKELETON_CARD, candidateUrl,
  type CandidateState, type CharacterType, type Step,
} from './shared'

const HEAD: Record<Step, { title: string; sentence: string; frozen?: boolean }> = {
  identity: {
    title: 'Identité',
    sentence: "Le nom s'affiche dans le studio. L'identifiant nomme ses dossiers et ne change plus.",
  },
  type: { title: 'Type', sentence: 'La machine qui le produira.', frozen: true },
  style: { title: 'Style', sentence: 'Le rendu de ses images.', frozen: true },
  world: { title: 'Monde', sentence: 'Là où il vit : ses lieux et ses tons.', frozen: true },
  base: {
    title: "Base d'identité",
    sentence: "Le visage de référence, figé à la création : le verrou d'identité s'y accroche pour toute la production.",
  },
}

const LIST = 'flex max-w-[640px] flex-col gap-[8px]'

function Frame({ step, children }: { step: Step; children: ReactNode }) {
  const head = HEAD[step]
  return (
    <section aria-labelledby="wizStepTitle">
      <h2 className="m-0 text-[22px] font-[650] tracking-normal normal-case text-txt" id="wizStepTitle">{head.title}</h2>
      <p className="mt-[6px] mb-0 max-w-[640px] text-[13.5px] text-dim">
        {head.sentence}
        {step === 'base' && (
          <>
            {' '}
            <b className="font-semibold text-txt">Personnage fictif, jamais la photo d'une personne réelle.</b>
          </>
        )}
      </p>
      {head.frozen && <p className="mt-[4px] mb-0 text-[12.5px] text-dim2">{FROZEN_HINT}</p>}
      <div className="mt-[22px]">{children}</div>
    </section>
  )
}

export function StepBody(props: {
  step: Step
  types: CharacterType[]
  currentType: CharacterType | null
  name: string
  cid: string
  cidValid: boolean
  cidProposal: string
  type: string | null
  style: string | null
  world: string | null
  frozenBase: string | null
  basePreview: string
  fileMessage: string
  genMessage: string
  candidates: CandidateState[] | null
  onName: (value: string) => void
  onCid: (value: string) => void
  onPickType: (id: string) => void
  onPickStyle: (value: string) => void
  onPickWorld: (value: string) => void
  onFile: (file: File) => void
  onGenerate: () => void
  onFreeze: (file: string) => void
}) {
  const { step, types, currentType } = props

  const typeRoving = useRovingChoice(types.map((entry) => entry.id), props.type)
  const styles = currentType?.styles ?? []
  const styleRoving = useRovingChoice(styles, props.style)
  const worldRoving = useRovingChoice((currentType?.worlds ?? []).map((entry) => entry.id), props.world)
  const readyCandidates = (props.candidates ?? []).filter((c) => c.state === 'ready')
  const chosenCandidate =
    readyCandidates.find((c) => candidateUrl(c.file) === props.basePreview)?.file ?? null
  const candidateRoving = useRovingChoice(readyCandidates.map((c) => c.file), chosenCandidate)

  if (step === 'identity') {
    return (
      <Frame step={step}>
        <IdentityStep
          name={props.name}
          cid={props.cid}
          cidValid={props.cidValid}
          proposal={props.cidProposal}
          onName={props.onName}
          onCid={props.onCid}
        />
      </Frame>
    )
  }

  if (step === 'type') {
    return (
      <Frame step={step}>
        {!types.length ? (
          <p className={NOTE_ERR} data-note>
            Aucun type de personnage n'est déclaré. Vérifie <code>PACKS/resolution.json</code> et les{' '}
            <code>universe.json</code> des packs.
          </p>
        ) : (
          <div className={LIST} role="radiogroup" aria-label="Type de personnage">
            {types.map((entry) => (
              <OptionCard
                key={entry.id}
                active={props.type === entry.id}
                title={entry.label}
                sub={`machine : ${entry.family}`}
                tabIndex={typeRoving.tabIndexFor(entry.id)}
                elementRef={typeRoving.registerRef(entry.id)}
                onClick={() => props.onPickType(entry.id)}
                onKeyDown={(event) => typeRoving.onKeyDown(event, entry.id, props.onPickType)}
              />
            ))}
          </div>
        )}
      </Frame>
    )
  }

  if (!currentType) return null

  if (step === 'style') {
    return (
      <Frame step={step}>
        {/* A single style is not a choice: say so instead of one card that can
            only be clicked one way. */}
        {styles.length === 1 ? (
          <p className={`${NOTE_OK} max-w-[640px]`} data-note>
            Ce type ne produit qu'un style : <b className="text-txt">{styles[0]}</b>. Il est fixé à la
            création.
          </p>
        ) : (
          <div className={LIST} role="radiogroup" aria-label="Style de sortie">
            {styles.map((entry) => (
              <OptionCard
                key={entry}
                active={props.style === entry}
                title={entry}
                tabIndex={styleRoving.tabIndexFor(entry)}
                elementRef={styleRoving.registerRef(entry)}
                onClick={() => props.onPickStyle(entry)}
                onKeyDown={(event) => styleRoving.onKeyDown(event, entry, props.onPickStyle)}
              />
            ))}
          </div>
        )}
      </Frame>
    )
  }

  if (step === 'world') {
    const worldEntries = currentType.worlds ?? []
    return (
      <Frame step={step}>
        {!worldEntries.length ? (
          <p className={`${NOTE_OK} max-w-[640px]`} data-note>Aucun monde déclaré pour ce type.</p>
        ) : (
          <div className={LIST} role="radiogroup" aria-label="Monde">
            {worldEntries.map((entry) => (
              <OptionCard
                key={entry.id}
                active={props.world === entry.id}
                title={entry.label}
                sub={entry.tone ?? undefined}
                tabIndex={worldRoving.tabIndexFor(entry.id)}
                elementRef={worldRoving.registerRef(entry.id)}
                onClick={() => props.onPickWorld(entry.id)}
                onKeyDown={(event) => worldRoving.onKeyDown(event, entry.id, props.onPickWorld)}
              />
            ))}
          </div>
        )}
      </Frame>
    )
  }

  return (
    <Frame step={step}>
      <BaseStep
        frozenBase={props.frozenBase}
        basePreview={props.basePreview}
        fileMessage={props.fileMessage}
        genMessage={props.genMessage}
        candidates={props.candidates}
        candidateRoving={candidateRoving}
        onFile={props.onFile}
        onGenerate={props.onGenerate}
        onFreeze={props.onFreeze}
      />
    </Frame>
  )
}

/** Loading placeholder, before `/api/wizard/options` answers: the shape of
    three option cards, not a sentence. */
export function StepBodySkeleton() {
  return (
    <div className={LIST} aria-hidden="true">
      <div className={SKELETON_CARD} />
      <div className={SKELETON_CARD} />
      <div className={SKELETON_CARD} />
    </div>
  )
}
