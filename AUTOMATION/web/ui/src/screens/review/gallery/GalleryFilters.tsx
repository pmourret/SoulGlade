/* The Galerie's filter bar (design-pass screen-5c, §S2).

   NO LEFT PANEL HERE. The Revue gives its filters a column because sorting is
   a long pass through folders one walks back and forth; the Galerie reads one
   folder — the kept images — and what one changes is the ANGLE on it. A 44 px
   bar is the right weight for that, and it gives the board the whole width.

   `#spaceSel`, `#scoreSel` and `#viewSel` keep their ids, their `data-*` keys
   and their radiogroup mechanics: they are the same three choices the Revue
   offers, in another shape.

   Presentation only: it receives the counts and the callbacks, it computes
   nothing about the images (.claude/rules/frontend.md). */
import { Icon } from '../../../chrome/Icon'
import { useRovingChoice } from '../../../chrome/useRovingChoice'
import { SCORE_FILTERS } from '../ReviewFilters'
import type { GroupBy } from './boardLayout'
import type { ScoreFilter, Space, View } from '../useTriage'

/* `py-0` AVEC `px-[8px]`, et pas seulement le second. `chrome.css` donne
   `padding:8px 10px` a tout `select` : dans une boite de 28 px en
   `border-box`, 16 px de padding vertical ne laissent que 10 px de contenu
   pour du texte de 12,5 px, et le libelle se retrouve rogne. Le DOM ne le
   signale pas — `scrollHeight` vaut `clientHeight`, un `<select>` dessinant
   sa propre boite de texte — c'est la CAPTURE qui l'a montre (audit 5c). */
const FIELD =
  'h-[28px] flex-none rounded-[6px] border border-line2 bg-panel2 px-[8px] py-0 text-[12.5px]'
const LABEL = 'flex-none text-[11px] whitespace-nowrap text-dim'

/* « Planche » rather than « Grille », because that is what it is now — but
   `data-v="grille"` is the WIRE key the view state and the fumigation use,
   and renaming a label never renames a key. */
const VIEWS: { key: View; label: string }[] = [
  { key: 'grille', label: 'Planche' },
  { key: 'revue', label: 'Loupe' },
  { key: 'comparer', label: 'Comparer' },
]

const GROUPS: { key: GroupBy; label: string }[] = [
  { key: 'intention', label: 'Intention' },
  { key: 'scene', label: 'Scène' },
  { key: 'date', label: 'Date' },
]

export function GalleryFilters({
  space,
  spaceCounts,
  onSpace,
  formats,
  format,
  onFormat,
  groupBy,
  onGroupBy,
  filter,
  filterCounts,
  onFilter,
  qc,
  search,
  onSearch,
  view,
  onView,
  narrow,
  onOpenFraming,
}: {
  space: Space
  spaceCounts: { sfw: number | undefined; nsfw: number | undefined }
  onSpace: (space: Space) => void
  /** The formats actually present, with their counts — never a fixed list. */
  formats: { key: string; label: string; n: number }[]
  format: string
  onFormat: (format: string) => void
  groupBy: GroupBy
  onGroupBy: (by: GroupBy) => void
  filter: ScoreFilter
  filterCounts: Record<string, number>
  onFilter: (filter: ScoreFilter) => void
  qc: { ok: number; high: number }
  search: string
  onSearch: (value: string) => void
  view: View
  onView: (view: View) => void
  narrow: boolean
  onOpenFraming: () => void
}) {
  const spaceRoving = useRovingChoice(['sfw', 'nsfw'], space)
  const viewRoving = useRovingChoice(VIEWS.map((v) => v.key), view)

  return (
    <div
      className="flex h-[44px] flex-none items-center gap-[10px] overflow-x-auto border-b
                 border-b-line bg-panel px-[16px]"
      id="galleryFilters"
    >
      {/* `data-sp="sfw"` is the WIRE key sent to /api/gallery and /img: SFW,
          not the name of a character (AUDIT §5.3). */}
      <div className="seg flex-none" id="spaceSel" role="radiogroup" aria-label="Espace">
        {(['sfw', 'nsfw'] as Space[]).map((key) => (
          <button
            key={key}
            ref={spaceRoving.registerRef(key)}
            role="radio"
            aria-checked={space === key}
            tabIndex={spaceRoving.tabIndexFor(key)}
            className={space === key ? 'on' : undefined}
            data-sp={key}
            data-hint-text={
              key === 'sfw'
                ? 'Espace SFW — la production normale du personnage.'
                : 'Espace NSFW — isolé, jamais exporté.'
            }
            onClick={() => onSpace(key)}
            onKeyDown={(event) => spaceRoving.onKeyDown(event, key, (id) => onSpace(id as Space))}
          >
            {key === 'sfw' ? 'SFW' : 'NSFW'}{' '}
            {Boolean(spaceCounts[key]) && (
              <span className="text-[11px] tabular-nums text-dim">{spaceCounts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* The list is built from the formats REALLY present (§S2). On Léna's
          tree that means `upscale` and « sans format » sit next to 4:5 and
          9:16: they are what the data says, and hiding them would hide the
          four images that carry them. */}
      <label className={LABEL} htmlFor="galFormat">
        format
      </label>
      <select
        id="galFormat"
        className={`${FIELD} w-[130px]`}
        value={format}
        onChange={(event) => onFormat(event.target.value)}
      >
        {formats.map((entry) => (
          <option key={entry.key} value={entry.key}>
            {entry.label}
            {entry.n ? ` (${entry.n})` : ''}
          </option>
        ))}
      </select>

      <label className={LABEL} htmlFor="galGroup">
        grouper par
      </label>
      <select
        id="galGroup"
        className={`${FIELD} w-[110px]`}
        value={groupBy}
        onChange={(event) => onGroupBy(event.target.value as GroupBy)}
      >
        {GROUPS.map((entry) => (
          <option key={entry.key} value={entry.key}>
            {entry.label}
          </option>
        ))}
      </select>

      {/* Reduced to a selector (§S2): the Galerie reads one folder, so the
          score band is one choice among five rather than a column of rows.
          `#scoreSel` and `data-f` are kept — on the `<select>` and on its
          options, so the same contract answers. */}
      <label className={LABEL} htmlFor="scoreSel">
        score
      </label>
      <select
        id="scoreSel"
        className={`${FIELD} w-[150px]`}
        value={filter}
        aria-label={`Filtre de score — ${scoreBound(filter, qc)}`}
        onChange={(event) => onFilter(event.target.value as ScoreFilter)}
      >
        {SCORE_FILTERS.map((entry) => (
          <option key={entry.key} value={entry.key} data-f={entry.key}>
            {entry.label}
            {filterCounts[entry.key] ? ` (${filterCounts[entry.key]})` : ''}
          </option>
        ))}
      </select>

      <div className="relative w-[190px] flex-none">
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-[8px] h-[14px] w-[14px]
                     -translate-y-1/2 text-dim2"
        />
        <input
          type="search"
          id="galSearch"
          className="h-[28px] w-full rounded-[6px] border border-line2 bg-panel2 py-0 pr-[8px]
                     pl-[26px] text-[12.5px]"
          placeholder="scène ou date"
          aria-label="Rechercher par scène ou par date"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>

      <div className="flex-1" />

      {narrow && (
        <button type="button" className="btn sm flex-none" id="btnFraming" onClick={onOpenFraming}>
          Cadrage
        </button>
      )}

      <div className="seg flex-none" id="viewSel" role="radiogroup" aria-label="Affichage">
        {VIEWS.map((entry) => (
          <button
            key={entry.key}
            ref={viewRoving.registerRef(entry.key)}
            role="radio"
            aria-checked={view === entry.key}
            tabIndex={viewRoving.tabIndexFor(entry.key)}
            className={view === entry.key ? 'on' : undefined}
            data-v={entry.key}
            onClick={() => onView(entry.key)}
            onKeyDown={(event) => viewRoving.onKeyDown(event, entry.key, (id) => onView(id as View))}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** The bound of a score band in figures, read from `qc` and never written
    here — the same sentence the Revue's own filter announces. */
function scoreBound(key: ScoreFilter, qc: { ok: number; high: number }): string {
  return {
    tout: 'toutes les images du dossier',
    haut: `score ≥ ${qc.high.toFixed(2)}`,
    moyen: `score ${qc.ok.toFixed(2)} à ${qc.high.toFixed(2)}`,
    bas: `score < ${qc.ok.toFixed(2)}, ou visage non mesuré`,
  }[key]
}
