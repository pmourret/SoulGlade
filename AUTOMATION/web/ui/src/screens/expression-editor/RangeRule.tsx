/* One parameter's range, drawn instead of read (design-pass screen-8 §S5.4) —
   purely presentational (frontend.md: a sub-component never calls the API).

   WHAT IT REPLACES. A row used to carry a `<input type="range">` for the trial
   value and two number fields for min and max, three controls saying three
   numbers with no relation drawn between them. The question one actually asks
   of a row is « where does this tone wander, and is my trial inside it » —
   which is a picture, not three figures.

   The track spans `PARAM_BOUNDS`, the whole physical range of the ComfyUI node,
   so two rows are comparable: a band covering a third of the track means the
   same thing on `smile` [-0.3, 1.3] as on `aaa` [-30, 120]. The grey tick is
   ZERO, the neutral face, which is the reference every parameter is read
   against. */
import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

const fr = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })

export function RangeRule({
  label, lo, hi, step, trial, min, max, included, onTrial,
}: {
  /** The parameter's French name — the slider's accessible name. */
  label: string
  lo: number
  hi: number
  step: number
  trial: number
  min: number
  max: number
  included: boolean
  onTrial: (value: number) => void
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  const pct = (value: number) => ((value - lo) / (hi - lo)) * 100
  const clamp = (value: number) => Math.min(hi, Math.max(lo, value))
  /** Snapped to the parameter's own step, then rounded: `0.01` steps
      accumulate float noise fast, and a trial value is what gets sent to the
      node — « 0.30000000000000004 » is not a value anyone typed. */
  const snap = (value: number) => Number((Math.round(clamp(value) / step) * step).toFixed(4))

  const fromClientX = (clientX: number) => {
    const box = trackRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return trial
    return snap(lo + ((clientX - box.left) / box.width) * (hi - lo))
  }

  /* Pointer capture, not a document-level mousemove pair: the browser keeps
     sending moves to this element once captured, even outside it, and releases
     on its own if the gesture is interrupted. Nothing to unbind, nothing left
     listening after an alt-tab mid-drag. */
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    onTrial(fromClientX(event.clientX))
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    onTrial(fromClientX(event.clientX))
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    /* `Maj` multiplies the step by 10 (§A) — 12 parameters at 0.01 would
       otherwise take 160 presses to cross their own range. */
    const stride = step * (event.shiftKey ? 10 : 1)
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') onTrial(snap(trial + stride))
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') onTrial(snap(trial - stride))
    else if (event.key === 'Home') onTrial(lo)
    else if (event.key === 'End') onTrial(hi)
    else return
    event.preventDefault()
  }

  return (
    <div
      ref={trackRef}
      className="relative h-[18px] min-w-[60px] flex-1 cursor-pointer touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      {/* The physical span of the node's own bounds. */}
      <div className="absolute inset-x-0 top-[8px] h-[2px] bg-line2" aria-hidden="true" />

      {/* ZERO, when the parameter actually crosses it (`wink` starts at 0 and
          never does — a tick on its left edge would say nothing). */}
      {lo < 0 && hi > 0 && (
        <div
          className="absolute top-[4px] h-[10px] w-px bg-line2"
          style={{ left: `${pct(0)}%` }}
          aria-hidden="true"
        />
      )}

      {/* WHAT THE GENERATION DRAWS FROM, and only when the parameter is part of
          the saved range: an excluded row has a trial one can still explore,
          but no band, because nothing is drawn from it. */}
      {included && (
        <div
          className="absolute top-[5px] h-[8px] rounded-[2px] bg-acc/60"
          style={{ left: `${pct(Math.min(min, max))}%`, width: `${Math.abs(pct(max) - pct(min))}%` }}
          aria-hidden="true"
        />
      )}

      {/* THE TRIAL. It is the only focusable thing here: the band follows from
          min and max, which have their own fields, and a second slider handle
          per edge would be three targets in 18 px of height. */}
      <div
        role="slider"
        data-param-trial
        tabIndex={0}
        aria-label={label}
        aria-valuemin={lo}
        aria-valuemax={hi}
        aria-valuenow={trial}
        /* Says the RANGE too: a lone « 0,62 » does not answer the question the
           row exists for, which is whether the trial sits inside the band. */
        aria-valuetext={
          included
            ? `essai ${fr(trial)}, plage ${fr(min)} à ${fr(max)}`
            : `essai ${fr(trial)}, paramètre non inclus`
        }
        onKeyDown={onKeyDown}
        className="absolute top-[2px] h-[14px] w-[3px] -translate-x-[1px] rounded-[1px] bg-txt
                   focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
        style={{ left: `${pct(trial)}%` }}
      />
    </div>
  )
}
