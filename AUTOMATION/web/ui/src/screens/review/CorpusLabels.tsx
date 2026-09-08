/* P4.5.1 — the corpus labels. NOT scores, NOT sorts: human judgements collected
   to answer the question ADR-0025 asks before any measure is allowed to discard
   an image on its own — how many false positives, how many false negatives, on
   images someone actually looked at.

   TWO AXES THROUGH ONE COMPONENT, because they are one gesture repeated:
     - `anatomie`  body proportions (P4.5)
     - `mains`     hands (P4.3, whose two closed leads were both judged against
                   Pierre's SORT and two bad images, never against a labelled
                   corpus — DOCS/recherche/2026-09-07-juge-pixel-mains-*.md)

   FULL FRAME ONLY, unlike `FlagButtons`. Neither a hand nor a proportion can be
   judged on a 200 px thumbnail, and this is a calibration instrument for a
   one-off pass, not a gesture of the nominal path (PROJET.md, règle 2).

   Three values everywhere, and `na` (not judgeable) is structural in both: a
   tight portrait has no arms to compare and no hand to inspect. Counting those
   as `ok` would show a separation that measures nothing — the exact trap behind
   the 33 % false positives of `mains` v1, and behind the 53 % of the Florence-2
   rule, both of which turned out to follow framing rather than anatomy. */
import type { GalleryItem } from './useTriage'
import { TACT, TACT_LABEL, TACT_IDLE } from './actionStyles'

export type LabelAxis = {
  axe: 'anatomie' | 'mains'
  field: 'anatomie' | 'mains_juge'
  title: string
  choices: { value: string; glyph: string; label: string; short: string; key: string }[]
}

export const LABEL_AXES: LabelAxis[] = [
  {
    axe: 'anatomie',
    field: 'anatomie',
    title: 'proportions du corps',
    choices: [
      { value: 'ok', glyph: '↕', label: 'Proportions correctes', short: 'correctes', key: 'P' },
      { value: 'ko', glyph: '⤡', label: 'Proportions fausses', short: 'fausses', key: 'F' },
      { value: 'na', glyph: '—', label: 'Proportions non jugeables', short: 'non jugeables', key: 'N' },
    ],
  },
  {
    axe: 'mains',
    field: 'mains_juge',
    title: 'mains',
    choices: [
      { value: 'ok', glyph: '✓', label: 'Mains bonnes', short: 'bonnes', key: 'B' },
      { value: 'ko', glyph: '✗', label: 'Mains mauvaises', short: 'mauvaises', key: 'M' },
      { value: 'na', glyph: '—', label: 'Mains non jugeables', short: 'hors champ', key: 'H' },
    ],
  },
]

export function CorpusLabels({
  item,
  onLabel,
}: {
  item: GalleryItem
  onLabel: (axis: LabelAxis, value: string) => void
}) {
  return (
    <>
      {LABEL_AXES.map((axis) => {
        const current = item[axis.field]
        return (
          <div className="meta" key={axis.axe}>
            <dt className="mb-[9px]">{axis.title}</dt>
            <div className="flex gap-[3px]" data-tlabel={axis.axe}>
              {axis.choices.map((choice) => (
                <button
                  key={choice.value}
                  data-label={`${axis.axe}:${choice.value}`}
                  aria-label={choice.label}
                  aria-pressed={current === choice.value}
                  className={`${TACT} ${
                    current === choice.value ? TACT_LABEL[choice.value] : TACT_IDLE
                  }`}
                  title={`${choice.label} (${choice.key})`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onLabel(axis, choice.value)
                  }}
                >
                  {choice.glyph}
                </button>
              ))}
            </div>
            {/* No glyph repeated in the legend, unlike the realism one above: at
                three entries the line overflowed and left the last key orphaned
                on a second row. The glyphs are already on the buttons, 7 px up. */}
            <div className="tiny mt-[7px]">
              {axis.choices.map((choice, i) => (
                <span key={choice.value}>
                  {i > 0 && ' · '}
                  {choice.short} <span className="kbd">{choice.key}</span>
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
