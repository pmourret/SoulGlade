/* P4.5.1 — the body-proportions label. NOT a score, NOT a sort: a human
   judgement collected to build the labelled corpus ADR-0025 demands before any
   measurement is allowed to discard an image on its own.

   FULL FRAME ONLY, unlike `FlagButtons`. Two reasons, both deliberate:
   proportions cannot be honestly judged on a 200 px thumbnail, and this is a
   calibration instrument on a one-off job, not a gesture of the nominal path
   (PROJET.md, règle 2) — it earns a place next to the image being examined,
   not on every tile of every grid.

   Three values and not two: `na` (not judgeable — tight portrait, body out of
   frame) exists so that portraits do not fall into `ok`. DWPose finds no
   usable skeleton on them, and counting them as correct would show a
   separation that measures nothing — the exact trap behind the 33 % false
   positives of the `mains` measure. */
import type { GalleryItem } from './useTriage'
import { TACT, TACT_ANATOMY, TACT_IDLE } from './actionStyles'

const CHOICES = [
  { value: 'ok', glyph: '↕', label: 'Proportions correctes', key: 'P' },
  { value: 'ko', glyph: '⤡', label: 'Proportions fausses', key: 'F' },
  { value: 'na', glyph: '—', label: 'Proportions non jugeables', key: 'N' },
]

export function AnatomyButtons({
  item,
  onLabel,
}: {
  item: GalleryItem
  onLabel: (value: string) => void
}) {
  return (
    <>
      {CHOICES.map((choice) => (
        <button
          key={choice.value}
          data-anat={choice.value}
          aria-label={choice.label}
          aria-pressed={item.anatomie === choice.value}
          className={`${TACT} ${
            item.anatomie === choice.value ? TACT_ANATOMY[choice.value] : TACT_IDLE
          }`}
          title={`${choice.label} (${choice.key})`}
          onClick={(e) => {
            e.stopPropagation()
            onLabel(choice.value)
          }}
        >
          {choice.glyph}
        </button>
      ))}
    </>
  )
}
