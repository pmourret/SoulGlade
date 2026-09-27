/* « Texte de la pose » — what the scene composer puts in « En mots » when
   this skeleton is picked (IT-10, chantier 4). Read from the photo at
   extraction; after a retouch it is marked « à revoir », never rewritten in
   silence: the button rewrites it from the skeleton as it is now. Shared by
   the full screen (side panel) and the composer's modal (`inline`). */
import type { Enhancer } from '../../api/useEnhance'
import { EnhanceTrigger } from '../../chrome/EnhanceTrigger'
import { RevisionView } from '../../chrome/RevisionView'
import { useEnhance } from '../../chrome/useEnhance'
import { useId, useState } from 'react'

export function PoseTextPanel({
  text,
  stale,
  rewriting,
  onChange,
  onRewrite,
  inline = false,
  enhancer,
}: {
  text: string
  stale: boolean
  rewriting: boolean
  onChange: (text: string) => void
  /** Resolves to an error to show, or null. */
  onRewrite: () => Promise<string | null>
  inline?: boolean
  /** « Améliorer » on the pose text (IT-10 chantier 8). */
  enhancer: Enhancer
}) {
  const fieldId = useId()
  const [error, setError] = useState<string | null>(null)
  /* « Améliorer » in the head of the text, the proposal read in the field
     (design-pass screen-ameliorer). */
  const enhance = useEnhance({ label: 'Texte de la pose', kind: 'pose', value: text, onApply: onChange, enhancer })
  const rewrite = async () => {
    setError(null)
    setError(await onRewrite())
  }
  return (
    <section
      className={inline ? 'flex flex-none items-start gap-[12px] border-t border-line px-[16px] py-[10px]' : 'border-b border-line px-[16px] py-[14px]'}
      aria-labelledby={`${fieldId}-title`}
      data-enhance
      ref={enhance.rootRef}
    >
      <div className={inline ? 'flex w-[150px] flex-none flex-col gap-[6px] pt-[2px]' : 'mb-[8px] flex items-center gap-[8px]'}>
        <h2 className="lab m-0" id={`${fieldId}-title`}>
          <label htmlFor={fieldId}>Texte de la pose</label>
        </h2>
        {stale && (
          <span
            className="self-start rounded-[999px] bg-warn-bg px-[8px] py-[1px] text-[11px] text-warn-txt"
            data-pose-text-stale
          >
            à revoir
          </span>
        )}
        <EnhanceTrigger enhance={enhance} />
      </div>
      <div className="min-w-0 flex-1">
        <RevisionView enhance={enhance}>
          <textarea
            id={fieldId}
            className="w-full resize-y font-code text-[12px]"
            rows={inline ? 2 : 3}
            value={text}
            placeholder="ex : standing, left arm raised above the head"
            onChange={(event) => onChange(event.target.value)}
          />
        </RevisionView>
        <p className="tiny mt-[4px] mb-0">
          {stale
            ? 'Le squelette a changé depuis que ce texte a été écrit.'
            : 'Rejoint « En mots » quand une scène choisit ce squelette.'}
        </p>
        {error && (
          <p className="mt-[4px] mb-0 text-[12px] text-danger-txt" role="alert">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        className={inline ? 'btn sm flex-none' : 'btn sm mt-[8px]'}
        disabled={rewriting || Boolean(enhance.revision)}
        onClick={() => void rewrite()}
      >
        {rewriting ? 'Réécriture…' : 'Réécrire depuis le squelette'}
      </button>
    </section>
  )
}
