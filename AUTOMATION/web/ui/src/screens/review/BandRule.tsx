/* One measurement, drawn as a rule: a 2 px track, the band it should land in,
   and a mark at the value (design-pass screen-5b, §S4).

   FIVE MEASUREMENTS, ONE PRESENTATION. The identity score, the hands score
   and the three realism sub-scores were drawn three different ways: a big
   coloured number, a small coloured number, and a filled bar. They answer the
   same question — is this value inside its band — so they now read alike, and
   only the band's ORIGIN differs:

     - identity and hands: thresholds from `config.json` (`qc`, `qc.mains`),
       cut at `watch` / `ok` / `high`;
     - realism: the calibration band (`min`/`max`) the server computes from
       the images judged convincing, or the folder's own observed range when
       there is no band yet.

   NO THRESHOLD IS WRITTEN HERE. The project has no corpus of real
   photographs, so the reference is the user's own judgement (CLAUDE.md §8.4)
   and it arrives as data. A number in this file would be a second, silent
   definition of « conforme ».

   THE COLOUR NEVER CARRIES THE READING ALONE: the value is printed next to
   the rule, and the verdict is a word. */

/** Where a value sits on [lo,hi], clamped, as a percentage. */
const at = (value: number, lo: number, hi: number): number =>
  hi > lo ? Math.min(100, Math.max(0, (100 * (value - lo)) / (hi - lo))) : 50

export function BandRule({
  /** Left and right ends of the track, in the measurement's own unit. */
  lo,
  hi,
  /** The measured value. `null` draws the track alone. */
  value,
  /** Start and end of the acceptable band, painted on the track. */
  bandFrom,
  bandTo,
  /** True when the value sits inside its band — decides the mark's hue only. */
  inBand,
  /** Extra cuts to show, e.g. the `watch` threshold under the band. */
  marks = [],
}: {
  lo: number
  hi: number
  value: number | null
  bandFrom: number
  bandTo: number
  inBand: boolean
  marks?: number[]
}) {
  return (
    <div className="relative h-[10px] w-full" aria-hidden="true">
      <div className="absolute inset-x-0 top-[4px] h-[2px] rounded-[1px] bg-line2">
        {/* The band itself — a zone to read, which is what `--ok-band` is for. */}
        <div
          className="absolute inset-y-0 bg-ok-band"
          style={{
            left: `${at(bandFrom, lo, hi)}%`,
            width: `${Math.max(0, at(bandTo, lo, hi) - at(bandFrom, lo, hi))}%`,
          }}
        />
        {marks.map((mark) => (
          <span
            key={mark}
            className="absolute top-[-2px] h-[6px] w-px bg-line2"
            style={{ left: `${at(mark, lo, hi)}%` }}
          />
        ))}
      </div>
      {value != null && (
        <span
          className={`absolute top-0 h-[10px] w-[2px] -translate-x-1/2 rounded-[1px] ${
            inBand ? 'bg-ok' : 'bg-warn'
          }`}
          style={{ left: `${at(value, lo, hi)}%` }}
        />
      )}
    </div>
  )
}

/* The two score rules read the SAME thresholds their verdict does — `qc` for
   identity, `qc.mains` for hands — so a rule can never disagree with the word
   next to it. The track runs from `watch - a little` to 1, because a score
   below `watch` still has to be placed somewhere visible. */
export function ScoreRule({
  value,
  qc,
}: {
  value: number | null
  qc: { ok: number; watch: number; high: number }
}) {
  const lo = Math.max(0, Math.min(qc.watch - 0.1, value ?? qc.watch))
  return (
    <BandRule
      lo={lo}
      hi={1}
      value={value}
      bandFrom={qc.ok}
      bandTo={1}
      inBand={value != null && value >= qc.ok}
      marks={[qc.watch, qc.high]}
    />
  )
}
