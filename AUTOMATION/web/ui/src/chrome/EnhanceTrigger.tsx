/* The right half of a field's head row (design-pass screen-ameliorer §S1, §S2):
   « Améliorer » at rest, then, while a revision is open, what to do with it.
   Laid in a flex row after the field's `.lab`; `ml-auto` pushes the buttons
   to the right edge, after what the field already carries there (`extra`: a
   counter, « modifié »), in that order. PRESENTATIONAL: everything comes from
   `useEnhance`. */
import type { ReactNode } from 'react'

import type { Enhance } from './useEnhance'

/* A control, not a surface: its own radius, never `rounded-card`. */
const GHOST =
  'h-[24px] flex-none cursor-pointer rounded-[5px] border-0 bg-panel3 px-[8px] text-[12px] text-txt ' +
  'hover:bg-line2 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-line2 aria-pressed:font-semibold'
const PRIMARY =
  'h-[24px] flex-none cursor-pointer rounded-[5px] border-0 bg-pri px-[10px] text-[12px] font-semibold ' +
  'text-on-pri hover:bg-pri-h'

export function EnhanceTrigger({ enhance, extra }: { enhance: Enhance; extra?: ReactNode }) {
  const { revision } = enhance
  if (!revision)
    return (
      /* The hint sits on the WRAPPER: a disabled button fires no mouse event,
         so the one state where it matters would never show it. */
      <span className="ml-auto flex flex-none items-center gap-[8px]">
        {extra}
        <span data-hint-text={enhance.comfy ? undefined : 'nécessite ComfyUI en ligne'}>
          <button
            ref={enhance.runRef}
            type="button"
            className={GHOST}
            data-enhance-run
            aria-label={`${enhance.action} « ${enhance.label} » par l'IA`}
            disabled={!enhance.canRun}
            onClick={() => void enhance.run()}
          >
            {enhance.busy ? (enhance.translateOnly ? 'Traduction…' : 'Amélioration…') : enhance.action}
          </button>
        </span>
      </span>
    )
  return (
    <>
      <span className="flex-none text-[12px] text-txt">· proposition de l’IA</span>
      <span className="ml-auto flex flex-wrap items-center justify-end gap-[6px]">
        {extra}
        {!revision.translated && (
          <button type="button" className={GHOST} aria-pressed={enhance.showRemoved} onClick={enhance.toggleRemoved}>
            Voir les retraits
          </button>
        )}
        <button type="button" className={PRIMARY} data-enhance-apply onClick={enhance.apply}>
          Appliquer
        </button>
        <button type="button" className={GHOST} data-enhance-reject onClick={enhance.reject}>
          Rejeter
        </button>
      </span>
    </>
  )
}
