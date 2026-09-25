/* THE slider of the two photo editors (design-pass screen-10 §S6) — the
   simplified modal (`screens/review/PhotoEditor.tsx`) and the advanced
   editor's panels both draw theirs from here, so a retouch gesture feels
   the same whichever door it was opened from.

   It is a NATIVE `<input type="range">` restyled (`.adj` in chrome.css),
   never a div pretending to be one: keyboard stepping, page-up/down, the
   arrow keys, `aria-valuenow` and the focus ring are all the platform's,
   and none of them would survive a rewrite.

   TWO THINGS IT ADDS over a bare range, both from §S6, both because a
   studio slider is dragged hundreds of times a session:
     - a NEUTRAL MARK and a fill that runs FROM the neutral value TO the
       current one, so « how far off neutral » is readable without reading
       the number;
     - double-click to come back to neutral, and a click on the value to
       type one.

   `id` is the contract with the fumigations (`#peExpo`, `#edBright`, …) and
   the value is always rendered in a `<span id={'v_' + id}>`, which
   test_editor.js reads by EXACT text (`'0°'`, `'0'`) — hence the sign is
   only ever added to a slider that HAS a neutral in its middle, and never
   to a zero. */
import { useEffect, useRef, useState } from 'react'

export function AdjustSlider({
  id, label, value, min, max, step = 1, suffix = '', neutral, onChange, onCommit,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** Written after the number, in the read-out and in `aria-valuetext`. */
  suffix?: string
  /** Where « neutral » sits. Defaults to 0 when the range straddles it, to
      `min` otherwise (a radius, a strength: nothing to come back to). */
  neutral?: number
  onChange: (value: number) => void
  /** Called instead of `onChange` when the value is RESET or TYPED — the
      callers that group history use it to push one step rather than a
      coalesced drag. Falls back to `onChange` when absent. */
  onCommit?: (value: number) => void
}) {
  const [typing, setTyping] = useState<string | null>(null)
  const fieldRef = useRef<HTMLInputElement | null>(null)

  const zero = neutral ?? (min < 0 && max > 0 ? 0 : min)
  const hasMark = zero > min && zero < max
  const commit = (next: number) => (onCommit ?? onChange)(Math.max(min, Math.min(max, next)))

  useEffect(() => {
    if (typing !== null) fieldRef.current?.select()
  }, [typing])

  const pct = (v: number) => ((v - min) / (max - min)) * 100
  const [from, to] = value >= zero ? [pct(zero), pct(value)] : [pct(value), pct(zero)]
  /* The fill is painted by the track's own background so it sits UNDER the
     thumb at the exact track height — an overlaid div would need to know
     the thumb's width to stop short of it, which it cannot. */
  const track = `linear-gradient(90deg,var(--line2) 0 ${from}%,var(--txt) ${from}% ${to}%,var(--line2) ${to}% 100%)`

  const modified = value !== zero
  const shown = `${modified && min < 0 && value > 0 ? '+' : ''}${value}${suffix}`

  return (
    <div className="grid h-[32px] grid-cols-[96px_minmax(0,1fr)_38px] items-center gap-[8px]">
      <label
        className={`cursor-pointer select-none truncate text-[12.5px] ${modified ? 'text-txt' : 'text-dim'}`}
        htmlFor={id}
        onDoubleClick={() => commit(zero)}
      >
        {label}
      </label>

      <div className="relative flex items-center" onDoubleClick={() => commit(zero)}>
        {hasMark && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-[8px] w-[1px] -translate-y-1/2 bg-[var(--tick)]"
            style={{ left: `${pct(zero)}%` }}
          />
        )}
        <input
          aria-valuetext={shown}
          className="adj"
          id={id}
          max={max}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step}
          style={{ '--adj-track': track } as React.CSSProperties}
          type="range"
          value={value}
        />
      </div>

      {typing === null ? (
        <button
          aria-label={`${label} : ${shown}, modifier la valeur`}
          className="h-[22px] cursor-pointer rounded-[4px] border-0 bg-transparent p-0 text-right
                     text-[12.5px] font-[600] tabular-nums hover:bg-panel2"
          onClick={() => setTyping(String(value))}
          type="button"
        >
          <span className={modified ? 'text-txt' : 'text-dim2'} id={`v_${id}`}>
            {shown}
          </span>
        </button>
      ) : (
        <input
          aria-label={`valeur de ${label}`}
          className="h-[22px] w-full rounded-[4px] px-[3px] py-0 text-right text-[12.5px] tabular-nums"
          onBlur={() => setTyping(null)}
          onChange={(e) => setTyping(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const next = Number(typing)
              if (Number.isFinite(next)) commit(next)
              setTyping(null)
            } else if (e.key === 'Escape') {
              e.stopPropagation() // never let it close the dialog underneath
              setTyping(null)
            }
          }}
          ref={fieldRef}
          type="number"
          value={typing}
        />
      )}
    </div>
  )
}
