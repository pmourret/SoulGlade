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

export type LabelAxis = {
  axe: 'anatomie' | 'mains'
  field: 'anatomie' | 'mains_juge'
  title: string
  choices: { value: string; label: string; short: string; key: string }[]
}

export const LABEL_AXES: LabelAxis[] = [
  {
    axe: 'anatomie',
    field: 'anatomie',
    title: 'Proportions du corps',
    choices: [
      { value: 'ok', label: 'Proportions correctes', short: 'Correctes', key: 'P' },
      { value: 'ko', label: 'Proportions fausses', short: 'Fausses', key: 'F' },
      { value: 'na', label: 'Proportions non jugeables', short: 'Non jugeables', key: 'N' },
    ],
  },
  {
    axe: 'mains',
    field: 'mains_juge',
    title: 'Mains',
    choices: [
      { value: 'ok', label: 'Mains bonnes', short: 'Bonnes', key: 'B' },
      { value: 'ko', label: 'Mains mauvaises', short: 'Mauvaises', key: 'M' },
      { value: 'na', label: 'Mains non jugeables', short: 'Hors champ', key: 'H' },
    ],
  },
]

/* TEXT, NOT GLYPHS (design-pass screen-5b, §S4.3). The three choices were
   « ↕ ⤡ — » and « ✓ ✗ — », which a reader had to decode and a screen
   reader announced literally. `short` already existed — it was only used in
   the legend under the buttons, where it said in words what the buttons said
   in symbols. Now it IS the button, and the legend goes away with the
   duplication.

   `ko` alone is painted in the danger family: it is the answer that says
   something is wrong. `na` stays neutral on purpose — « non jugeable » is an
   answer, not a verdict, and colouring it like the other two would read as
   one. */
const OPT =
  'flex flex-1 cursor-pointer items-center justify-center gap-[5px] border-0 px-[6px]' +
  ' py-[6px] text-[12px] whitespace-nowrap' +
  ' focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-[-2px]'
const OPT_KO = 'bg-danger-bg font-semibold text-danger-txt'
const OPT_ON = 'bg-panel3 font-semibold text-txt'
const OPT_OFF = 'bg-transparent text-dim hover:text-txt'

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
          <div key={axis.axe}>
            <div className="mb-[6px] text-[11px] text-dim">{axis.title}</div>
            <div
              className="flex overflow-hidden rounded-[6px] border border-line2 bg-bg"
              data-tlabel={axis.axe}
              role="group"
              aria-label={axis.title}
            >
              {axis.choices.map((choice) => {
                const on = current === choice.value
                return (
                  <button
                    key={choice.value}
                    type="button"
                    data-label={`${axis.axe}:${choice.value}`}
                    aria-label={choice.label}
                    aria-pressed={on}
                    aria-keyshortcuts={choice.key}
                    className={`${OPT} ${
                      on ? (choice.value === 'ko' ? OPT_KO : OPT_ON) : OPT_OFF
                    }`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onLabel(axis, choice.value)
                    }}
                  >
                    {choice.short}
                    <span className="kbd" aria-hidden="true">
                      {choice.key}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}
