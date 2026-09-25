/* The foldable header every section of the right panel wears (design-pass
   screen-10 §S5.3): chevron, title, a summary that says « neutre » or
   « N modifiés », and a « Réinitialiser » that is only there when there IS
   something to put back.

   Presentational only (frontend.md): what a section owns and how far it is
   from neutral is `layerSummary.ts`'s answer, the one-step write is
   `usePhotoEditorAdvanced.ts`'s.

   STILL A `details.adv`. The four panels were already folds, and the two
   fumigations find them by `details.adv:has-text("…")` — the class and the
   summary's text are the contract, the rest is paint.

   The open/closed state lives HERE, in local state, so it survives a change
   of selected layer (§S5.3: « les sections gardent leur état ») without
   being persisted anywhere. `onToggle` keeps it honest: the user can also
   open a fold by clicking its summary, and React would otherwise re-apply
   its own idea of `open` on the next render. */
import { useState, type ReactNode } from 'react'

export function AdjustSection({
  title, summary, changed, defaultOpen = false, onReset, children,
}: {
  title: ReactNode
  /** « neutre » or « N modifiés » — `sectionSummary()` writes it. */
  summary: string
  /** How many settings are off neutral; 0 hides the reset link. */
  changed: number
  defaultOpen?: boolean
  onReset: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <details
      className="adv adjsec"
      onToggle={(e) => setOpen(e.currentTarget.open)}
      open={open}
    >
      <summary>
        <span className="min-w-0 flex-1 truncate text-[13px] font-[600] text-txt">{title}</span>
        <span className="shrink-0 text-[11.5px] text-dim2">{summary}</span>
        {changed > 0 && (
          /* Inside the summary, so a `preventDefault` is what keeps the
             click from ALSO folding the section it belongs to. */
          <button
            className="link shrink-0 text-[11.5px]"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onReset()
            }}
            type="button"
          >
            Réinitialiser
          </button>
        )}
      </summary>
      <div>{children}</div>
    </details>
  )
}
