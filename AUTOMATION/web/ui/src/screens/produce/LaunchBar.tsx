/* The anchored launch bar of Produire (design-pass screen-3b, §S5): what is
   about to run, at which quality, and the one button that runs it.

   IT IS A ROW OF THE SCREEN GRID, NOT `.launch`. The shared `.launch` class
   is `position:fixed` and offsets itself by `calc(var(--nav) + var(--rail))`
   — which is what a CENTRED article needs, and what the wizard still is
   (`screens/wizard/WizardScreen.tsx`). Produire is no longer that: its three
   columns each scroll on their own, so the bar is simply the last row of the
   grid and nothing has to be kept in sync with it.

   `#btnRun.disabled` IS `runDisabled`, RECEIVED AS A PROP (AUDIT §5.6, trap
   3). It is computed once in ProduceScreen and read here — this component
   never derives a second answer. The reason a launch is blocked is `sumT`,
   likewise computed once by `runSummary.ts`: a disabled button with no word
   reads as a breakdown.

   Presentation only, no API call (.claude/rules/frontend.md). */
import { useRovingChoice } from '../../chrome/useRovingChoice'
import type { SummaryTone } from './runSummary'

export const QUALITY_OPTIONS = [
  ['realisme', 'Réalisme', 'Pipeline mesuré (peau, grain). Pas le style du personnage.'],
  ['rapide', 'Rapide', 'Coupe la repasse de texture — plus vite, peau plus lisse.'],
  ['brut', 'Brut', 'Coupe repasse, reprise du visage et mise à la taille.'],
] as const

export function LaunchBar({
  sumN,
  sumT,
  /** What kind of thing `sumT` says — computed by `runSummary` with the text
      itself, never re-derived here (one ladder of branches, one answer). */
  tone,
  quality,
  onPickQuality,
  editTier,
  runLabel,
  runDisabled,
  onRun,
}: {
  sumN: string
  sumT: string
  tone: SummaryTone
  quality: string
  onPickQuality: (key: string) => void
  editTier: boolean
  runLabel: string
  runDisabled: boolean
  onRun: () => void
}) {
  /* The NSFW pipeline inherits the refiner and the grain from the preset: the
     presets that cut them are disabled there rather than left clickable with
     no effect (double guard, see guard_intensity server-side). Excluded from
     the roving id list so arrows skip them exactly as Tab already does. */
  const available = QUALITY_OPTIONS.filter(([key]) => !(editTier && key !== 'realisme')).map(
    ([key]) => key,
  )
  const roving = useRovingChoice(available, quality)

  return (
    <div
      className="flex h-[60px] flex-none items-center gap-[16px] border-t border-t-line
                 bg-panel px-[20px]"
      id="launchBar"
    >
      <div className="min-w-0">
        <b className="block text-[17px] font-[650] tabular-nums" id="sumN">
          {sumN}
        </b>
        <div
          className={`text-[12.5px] leading-[1.3] ${
            tone === 'bad' ? 'text-danger-txt' : tone === 'warn' ? 'text-warn-txt' : 'text-dim'
          }`}
          id="sumT"
        >
          {sumT}
        </div>
      </div>
      <div className="flex-1" />
      <div className="seg" id="qual" role="radiogroup" aria-label="Qualité de rendu">
        {QUALITY_OPTIONS.map(([key, label, hint]) => {
          const disabled = editTier && key !== 'realisme'
          return (
            <button
              key={key}
              ref={disabled ? undefined : roving.registerRef(key)}
              role="radio"
              aria-checked={quality === key}
              tabIndex={disabled ? undefined : roving.tabIndexFor(key)}
              className={quality === key ? 'on' : undefined}
              data-q={key}
              data-hint-text={hint}
              disabled={disabled}
              onClick={() => onPickQuality(key)}
              onKeyDown={
                disabled ? undefined : (event) => roving.onKeyDown(event, key, onPickQuality)
              }
            >
              {label}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="flex h-[36px] flex-none items-center gap-[9px] rounded-[7px] bg-pri
                   px-[16px] text-[13.5px] font-semibold text-on-pri hover:bg-pri-h
                   disabled:cursor-not-allowed disabled:opacity-40"
        id="btnRun"
        disabled={runDisabled}
        onClick={onRun}
      >
        {runLabel}
        {/* The shortcut is written where the gesture is, not only in a help
            page. `aria-hidden`: a screen reader announces the button, and
            « Ctrl flèche » in the middle of its name helps nobody. */}
        <span className="font-code text-[11px] opacity-60" aria-hidden="true">
          Ctrl ↵
        </span>
      </button>
    </div>
  )
}
