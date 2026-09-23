/* The left panel of the Revue: what narrows the list (design-pass
   screen-5b, §S2).

   THE FOUR SEGMENTED CONTROLS WERE ONE LINE. Space, folder, score filter and
   view sat side by side above the grid, so the three that FILTER and the one
   that CHANGES THE VIEW read as one row of equal things. The view selector
   stayed in the toolbar where the view is; the three filters came here, and
   each got the room to say what it filters ON: the folder counts, the score
   bounds in figures rather than in a `title` only a mouse could reach.

   PRESENTATION ONLY: it receives the counts and the callbacks (frontend.md).

   FROZEN, NOT REPLACED, DURING A SELECTION (§S2.5). The bulk bar used to
   replace the filter row outright, which meant the screen forgot what it was
   filtering on at the exact moment one acted on a batch. The panel stays
   readable at `.45` and goes `inert` — React 19 renders the attribute
   natively, and it takes the children out of the tab order too. */
import { useRovingChoice } from '../../chrome/useRovingChoice'
import type { ScoreFilter, Space, Trade } from './useTriage'

export const SCORE_FILTERS: { key: ScoreFilter; label: string }[] = [
  { key: 'tout', label: 'Tout' },
  { key: 'haut', label: 'Excellentes' },
  { key: 'moyen', label: 'Correctes' },
  { key: 'bas', label: 'Sous la bande' },
]

/* Bucket selector of the Revue trade. `OK` is NOT offered here: the kept
   images have their destination, the Galerie. */
export const REVIEW_BUCKETS = [
  { key: 'A_REVOIR', label: 'À revoir' },
  { key: 'REJET', label: 'Rejetées' },
  // SANS_VISAGE is a real QC verdict (no face detected): the runner filled that
  // folder while nothing led to it, so its images became unfindable
  { key: 'SANS_VISAGE', label: 'Sans visage' },
  { key: 'ARCHIVE', label: 'Archivées' },
]

const TITLE = 'mb-[8px] text-[10.5px] font-semibold uppercase tracking-[.7px] text-dim'
/* `border-0` as well as `bg-transparent`: a <button> that declares neither
   inherits the browser's own light face AND its `2px outset` frame — both
   halves of the guard, the lesson of ProduceSidebar at 2560 px. */
const ROW =
  'flex h-[30px] w-full items-center gap-[8px] rounded-[6px] border-0 bg-transparent' +
  ' px-[9px] text-left text-[13px] [transition:background-color_.12s]' +
  ' focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-[-2px]'
const ROW_ON = 'bg-panel3! font-semibold text-txt [box-shadow:inset_2px_0_0_var(--acc)]'
const ROW_IDLE = 'text-dim hover:bg-panel2 hover:text-txt'
/* `--dim2` on `--panel3` measures 4.27 — the exception tokens.css names in so
   many words. An active row IS `--panel3`, so its counter steps up. */
const COUNT_ON = 'text-dim'
const COUNT_IDLE = 'text-dim2'

/* The hue of a score band, as an 8 px square. « Toutes » has none: it is not
   a band, it is the absence of one. */
const BAND_TINT: Record<string, string> = {
  haut: 'bg-ok',
  moyen: 'bg-warn',
  bas: 'bg-bad',
}

/** The bounds of a score band, in figures, read from `qc` — never written
    here, and no longer hidden in a `title` (§S2.3). */
export function scoreFilterTitle(key: ScoreFilter, qc: { ok: number; high: number }): string {
  return {
    tout: 'toutes les images du dossier',
    haut: `score ≥ ${qc.high.toFixed(2)}`,
    moyen: `score ${qc.ok.toFixed(2)} à ${qc.high.toFixed(2)}`,
    bas: `score < ${qc.ok.toFixed(2)}, ou visage non mesuré`,
  }[key]
}

const BOUND: Record<ScoreFilter, (qc: { ok: number; high: number }) => string> = {
  tout: () => '',
  haut: (qc) => `≥ ${qc.high.toFixed(2)}`,
  moyen: (qc) => `${qc.ok.toFixed(2)}–${qc.high.toFixed(2)}`,
  bas: (qc) => `< ${qc.ok.toFixed(2)}`,
}

/* How many images the space holds in the CURRENT bucket (23/09). Producing at
   a non-exporting tier files into the NSFW space while the Review opens on
   SFW: thirty images landed next door and nothing said so. Silent on zero and
   on an absent count, and part of the LABEL rather than an aria-hidden
   decoration, so the button announces « NSFW 30 ». */
function SpaceCount({ n }: { n: number | undefined }) {
  if (!n) return null
  return <span className="text-[11px] tabular-nums text-dim">{n}</span>
}

export function ReviewFilters({
  trade,
  space,
  spaceCounts,
  onSpace,
  bucket,
  buckets,
  onBucket,
  filter,
  filterCounts,
  onFilter,
  qc,
  unmeasured,
  measuring,
  measureLeft,
  onMeasure,
  canUndo,
  onUndo,
  frozen,
}: {
  trade: Trade
  space: Space
  spaceCounts: { sfw: number | undefined; nsfw: number | undefined }
  onSpace: (space: Space) => void
  bucket: string
  buckets: Record<string, number> | null
  onBucket: (bucket: string) => void
  filter: ScoreFilter
  filterCounts: Record<string, number>
  onFilter: (filter: ScoreFilter) => void
  qc: { ok: number; watch: number; high: number }
  unmeasured: number
  measuring: boolean
  measureLeft: number
  onMeasure: () => void
  canUndo: boolean
  onUndo: () => void
  /** True while a multi-selection is open — see the header. */
  frozen: boolean
}) {
  const spaceRoving = useRovingChoice(['sfw', 'nsfw'], space)
  const bucketRoving = useRovingChoice(REVIEW_BUCKETS.map((e) => e.key), bucket)
  const filterRoving = useRovingChoice(SCORE_FILTERS.map((e) => e.key), filter)

  return (
    <nav
      className={`flex w-[232px] flex-none flex-col overflow-y-auto border-r border-r-line
                  bg-panel ${frozen ? 'opacity-45' : ''}`}
      aria-label="Filtres"
      inert={frozen || undefined}
      id="reviewFilters"
    >
      <div className="flex-1 px-[14px] py-[16px]">
        <div className="mb-[22px]">
          <h2 className={TITLE}>Espace</h2>
          {/* `data-sp="sfw"` is the WIRE key sent to /api/gallery and /img: SFW,
              not the name of a character (AUDIT §5.3). */}
          <div className="seg w-full" id="spaceSel" role="radiogroup" aria-label="Espace">
            {(['sfw', 'nsfw'] as Space[]).map((key) => (
              <button
                key={key}
                ref={spaceRoving.registerRef(key)}
                role="radio"
                aria-checked={space === key}
                tabIndex={spaceRoving.tabIndexFor(key)}
                className={`flex-1 ${space === key ? 'on' : ''}`}
                data-sp={key}
                data-hint-text={
                  key === 'sfw'
                    ? 'Espace SFW — la production normale du personnage.'
                    : 'Espace NSFW — isolé, jamais exporté.'
                }
                onClick={() => onSpace(key)}
                onKeyDown={(event) =>
                  spaceRoving.onKeyDown(event, key, (id) => onSpace(id as Space))
                }
              >
                {key === 'sfw' ? 'SFW' : 'NSFW'} <SpaceCount n={spaceCounts[key]} />
              </button>
            ))}
          </div>
        </div>

        {/* The Galerie does not show the bucket selector at all: its folder is
            said by its tab. */}
        {trade === 'revue' && (
          <div className="mb-[22px]">
            <h2 className={TITLE}>Dossier</h2>
            <div
              className="flex flex-col gap-[1px]"
              id="bucketSel"
              role="radiogroup"
              aria-label="Dossier"
            >
              {REVIEW_BUCKETS.map((entry) => {
                const on = bucket === entry.key
                return (
                  <button
                    key={entry.key}
                    type="button"
                    ref={bucketRoving.registerRef(entry.key)}
                    role="radio"
                    aria-checked={on}
                    tabIndex={bucketRoving.tabIndexFor(entry.key)}
                    className={`${ROW} ${on ? `on ${ROW_ON}` : ROW_IDLE}`}
                    data-b={entry.key}
                    onClick={() => onBucket(entry.key)}
                    onKeyDown={(event) => bucketRoving.onKeyDown(event, entry.key, onBucket)}
                  >
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                    <span
                      className={`flex-none text-[11.5px] tabular-nums ${on ? COUNT_ON : COUNT_IDLE}`}
                      id={`b${entry.key}`}
                    >
                      {buckets?.[entry.key] ?? 0}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className={TITLE}>Score d'identité</h2>
          <div
            className="flex flex-col gap-[1px]"
            id="scoreSel"
            role="radiogroup"
            aria-label="Filtre de score"
          >
            {SCORE_FILTERS.map((entry) => {
              const on = filter === entry.key
              const bound = BOUND[entry.key](qc)
              return (
                <button
                  key={entry.key}
                  type="button"
                  ref={filterRoving.registerRef(entry.key)}
                  role="radio"
                  aria-checked={on}
                  tabIndex={filterRoving.tabIndexFor(entry.key)}
                  className={`${ROW} ${on ? `on ${ROW_ON}` : ROW_IDLE}`}
                  data-f={entry.key}
                  /* The bound stays in the accessible name AS WELL as on
                     screen: the figure is written next to the label now, but
                     « Excellentes ≥ 0.80 » still has to be announced as one
                     thing. The `title` is gone — it only ever reached a mouse. */
                  aria-label={`${entry.label} — ${scoreFilterTitle(entry.key, qc)}`}
                  onClick={() => onFilter(entry.key)}
                  onKeyDown={(event) =>
                    filterRoving.onKeyDown(event, entry.key, (id) => onFilter(id as ScoreFilter))
                  }
                >
                  <i
                    className={`h-[8px] w-[8px] flex-none rounded-[2px] ${
                      BAND_TINT[entry.key] ?? ''
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  {bound && (
                    <span className="flex-none text-[10.5px] tabular-nums text-dim2">{bound}</span>
                  )}
                  <span
                    className={`w-[22px] flex-none text-right text-[11.5px] tabular-nums ${
                      on ? COUNT_ON : COUNT_IDLE
                    }`}
                  >
                    {filterCounts[entry.key] || ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* The two gestures that act on the FOLDER rather than on an image, at
          the foot, behind a rule: they are not filters. */}
      <div className="flex flex-none flex-col gap-[7px] border-t border-t-line px-[14px] py-[12px]">
        {frozen && (
          <p className="m-0 text-[11.5px] text-dim2">Filtres figés pendant la sélection.</p>
        )}
        {unmeasured > 0 && (
          <button className="btn sm w-full" id="btnMesurer" disabled={measuring} onClick={onMeasure}>
            {measuring
              ? measureLeft
                ? `Mesure… ${measureLeft} restante(s)`
                : 'Mesure…'
              : `Mesurer le réalisme (${unmeasured})`}
          </button>
        )}
        {/* Undo has no place in the Galerie: nothing is sorted there. */}
        {trade === 'revue' && (
          <button
            className="btn sm flex w-full items-center justify-center gap-[7px]"
            id="btnUndo"
            disabled={!canUndo}
            onClick={onUndo}
          >
            Annuler le dernier tri
            <span className="kbd" aria-hidden="true">
              U
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}
