/* Step 5, Base d'identité (design-pass screen-14 §S7). Presentation only.

   A segmented switch between the two ways in — generating four portraits, or
   providing one image — where there used to be two columns side by side.
   Nothing is written here: generating, freezing and uploading are the screen's
   callbacks, unchanged.

   CANDIDATES. Four 4:5 cards, one per state: in progress, ready (a radio),
   failed (the server's `detail` WRITTEN under the card, not hidden in a
   `title`), and frozen (the accent and a caption). */
import { useRef, useState } from 'react'

import { Icon } from '../../chrome/Icon'
import type { useRovingChoice } from '../../chrome/useRovingChoice'
import { SPIN, candidateUrl, type CandidateState } from './shared'

type Mode = 'generate' | 'upload'

const SEG = 'cursor-pointer rounded-[6px] border-0 px-[12px] py-[6px] text-[13px]'
const SEG_ON = 'bg-panel3 font-semibold text-txt'
const SEG_OFF = 'bg-transparent text-dim hover:text-txt'
const CARD = 'relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-card p-0'

export function BaseStep(props: {
  frozenBase: string | null
  basePreview: string
  fileMessage: string
  genMessage: string
  candidates: CandidateState[] | null
  candidateRoving: ReturnType<typeof useRovingChoice>
  onFile: (file: File) => void
  onGenerate: () => void
  onFreeze: (file: string) => void
}) {
  /* An uploaded base is previewed from its data URL: reopen on that side. */
  const [mode, setMode] = useState<Mode>(props.basePreview.startsWith('data:') ? 'upload' : 'generate')
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const candidates = props.candidates ?? []
  const pending = candidates.some((c) => c.state === 'pending')
  const ready = candidates.filter((c) => c.state === 'ready').length
  const status = pending
    ? `${ready} sur ${candidates.length} prêts · environ 1 à 2 min par portrait`
    : props.genMessage

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="inline-flex self-start rounded-[8px] border border-line bg-panel p-[3px]" role="group" aria-label="Origine de la base">
        <button type="button" className={`${SEG} ${mode === 'generate' ? SEG_ON : SEG_OFF}`} aria-pressed={mode === 'generate'} onClick={() => setMode('generate')}>
          Générer des portraits
        </button>
        <button type="button" className={`${SEG} ${mode === 'upload' ? SEG_ON : SEG_OFF}`} aria-pressed={mode === 'upload'} onClick={() => setMode('upload')}>
          Fournir une image
        </button>
      </div>

      {mode === 'generate' ? (
        <div className="flex flex-col gap-[12px]">
          <div className="flex flex-wrap items-center gap-[12px]">
            <button className="btn" type="button" id="wizGen" onClick={props.onGenerate}>
              {props.candidates ? 'Relancer 4 portraits' : 'Générer 4 portraits'}
            </button>
            <p className="m-0 flex items-center gap-[8px] text-[12.5px] text-dim" id="wizGenMsg" aria-live="polite">
              {pending && <span className={SPIN} aria-hidden="true" />}
              {status}
            </p>
          </div>
          <div
            className="grid grid-cols-[repeat(4,minmax(0,200px))] gap-[12px] max-[1100px]:grid-cols-[repeat(2,minmax(0,200px))]"
            id="wizCands"
            role="radiogroup"
            aria-label="Portraits générés"
          >
            {candidates.map((candidate, index) => {
              if (candidate.state === 'ready') {
                const chosen = props.basePreview === candidateUrl(candidate.file)
                return (
                  <div key={candidate.file}>
                    <button
                      type="button"
                      className={`${CARD} cursor-pointer border-2 bg-panel2 ${chosen ? 'border-acc' : 'border-line hover:border-line2'}`}
                      role="radio"
                      aria-checked={chosen}
                      aria-label={`Portrait ${index + 1}`}
                      tabIndex={props.candidateRoving.tabIndexFor(candidate.file)}
                      ref={props.candidateRoving.registerRef(candidate.file)}
                      data-file={candidate.file}
                      data-chosen={chosen ? '1' : undefined}
                      onClick={() => props.onFreeze(candidate.file)}
                      onKeyDown={(event) => props.candidateRoving.onKeyDown(event, candidate.file, props.onFreeze)}
                    >
                      <img className="block h-full w-full object-cover" alt="" src={candidateUrl(candidate.file)} />
                      {chosen && (
                        <span className="absolute top-[8px] right-[8px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-acc text-on-acc">
                          <Icon name="check" className="h-[13px] w-[13px]" />
                        </span>
                      )}
                    </button>
                    {chosen && <p className="mt-[6px] mb-0 text-[12px] text-dim">gelé comme base</p>}
                  </div>
                )
              }
              if (candidate.state === 'error') {
                return (
                  <div key={candidate.file || index}>
                    <div className={`${CARD} flex-col gap-[6px] border-2 border-danger-line bg-panel2 text-[13px] text-danger-txt`} data-cand="error">
                      <i className="h-[9px] w-[9px] rotate-45 bg-bad" aria-hidden="true" />
                      Échec
                    </div>
                    {candidate.detail && (
                      <p className="mt-[6px] mb-0 text-[12px] break-words text-danger-txt">{candidate.detail}</p>
                    )}
                  </div>
                )
              }
              return (
                <div
                  key={candidate.file || index}
                  className={`${CARD} border-2 border-dashed border-line2 bg-panel`}
                  data-cand="pending"
                  aria-label="Portrait en cours"
                >
                  <span className={SPIN} aria-hidden="true" />
                </div>
              )
            })}
          </div>
          {ready > 0 && (
            <p className="m-0 text-[12.5px] text-dim">
              Cliquer un portrait le gèle comme base. Un autre clic remplace ce choix tant que le
              personnage n'est pas créé.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          <button
            type="button"
            className={`flex aspect-[4/5] w-[240px] cursor-pointer flex-col items-center justify-center gap-[8px] rounded-card border-2 border-dashed p-[16px] text-center text-[13px] text-dim
                        ${dragging ? 'border-acc bg-panel2' : 'border-line2 bg-panel hover:border-dim2'}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              const file = event.dataTransfer.files?.[0]
              if (file) props.onFile(file)
            }}
          >
            {props.basePreview.startsWith('data:') ? (
              <img className="h-full w-full rounded-[6px] object-cover" alt="image fournie" src={props.basePreview} />
            ) : (
              <>
                <Icon name="image" className="h-[22px] w-[22px] text-dim2" />
                Déposer une image ici, ou cliquer pour la choisir
              </>
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            id="wizFile"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) props.onFile(file)
              event.target.value = ''
            }}
          />
          <p className="m-0 text-[12px] text-dim2">PNG, JPEG ou WebP, 20 Mo au plus.</p>
          <p className="m-0 text-[12.5px] text-dim" id="wizFileMsg" aria-live="polite">
            {props.fileMessage}
          </p>
        </div>
      )}

      {/* Kept for the smoke tests: the base itself is shown in the sheet. */}
      <div id="wizBasePreview" hidden={!props.frozenBase} />
    </div>
  )
}
