/* « Texte de la pose » — what the scene composer puts in « En mots » when
   this skeleton is picked (IT-10, chantier 4). Read from the photo at
   extraction; after a retouch it is marked « à revoir », never rewritten in
   silence: the button rewrites it from the skeleton as it is now. Shared by
   the full screen (side panel) and the composer's modal (`inline`). */
import { useId, useState } from 'react'

export function PoseTextPanel({
  text,
  stale,
  rewriting,
  onChange,
  onRewrite,
  inline = false,
}: {
  text: string
  stale: boolean
  rewriting: boolean
  onChange: (text: string) => void
  /** Resolves to an error to show, or null. */
  onRewrite: () => Promise<string | null>
  inline?: boolean
}) {
  const fieldId = useId()
  const [error, setError] = useState<string | null>(null)
  const rewrite = async () => {
    setError(null)
    setError(await onRewrite())
  }
  return (
    <section
      className={inline ? 'flex flex-none items-start gap-[12px] border-t border-line px-[16px] py-[10px]' : 'border-b border-line px-[16px] py-[14px]'}
      aria-labelledby={`${fieldId}-title`}
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
      </div>
      <div className="min-w-0 flex-1">
        <textarea
          id={fieldId}
          className="w-full resize-y font-code text-[12px]"
          rows={inline ? 2 : 3}
          value={text}
          placeholder="ex : standing, left arm raised above the head"
          onChange={(event) => onChange(event.target.value)}
        />
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
        disabled={rewriting}
        onClick={() => void rewrite()}
      >
        {rewriting ? 'Réécriture…' : 'Réécrire depuis le squelette'}
      </button>
    </section>
  )
}
