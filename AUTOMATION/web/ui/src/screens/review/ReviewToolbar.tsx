/* The centre's toolbar: what is on screen, and how to look at it
   (design-pass screen-5b, §S3.1-2).

   IT BECOMES THE BULK BAR DURING A SELECTION, in place — the filters no
   longer disappear to make room (they freeze in their own panel, see
   `ReviewFilters.tsx`), so what the bar replaces is only itself.

   `#viewSel` STAYS PUT IN BOTH STATES. That is not a detail: Comparer lives
   in it, and Comparer is only reachable once something is selected. A version
   of this bar that swallowed the whole selector made the feature unreachable
   by the exact path one takes to use it — found by the fumigation, which
   still walks it (§7quinquies).

   NO « Comparer (N) » BUTTON (§S3.2). The segment already says it, and two
   controls for one destination is one too many.

   Every child is `flex-none whitespace-nowrap`: this bar must never wrap, and
   it must never let a long scene name push a control off its own edge. */
import { useRovingChoice } from '../../chrome/useRovingChoice'
import type { View } from './useTriage'

const VIEWS: { key: View; label: string }[] = [
  /* « Loupe », not « Revue » — the view had the same name as the module it
     lives in, so « Revue > Revue » was a real thing one could read (§S3.1).
     `data-v="revue"` is the wire key and does not move. */
  { key: 'revue', label: 'Loupe' },
  { key: 'grille', label: 'Grille' },
  { key: 'comparer', label: 'Comparer' },
]

function ViewSelector({ view, onView }: { view: View; onView: (view: View) => void }) {
  const roving = useRovingChoice(VIEWS.map((v) => v.key), view)
  return (
    <div className="seg flex-none" id="viewSel" role="radiogroup" aria-label="Affichage">
      {VIEWS.map((entry) => (
        <button
          key={entry.key}
          ref={roving.registerRef(entry.key)}
          role="radio"
          aria-checked={view === entry.key}
          tabIndex={roving.tabIndexFor(entry.key)}
          className={view === entry.key ? 'on' : undefined}
          data-v={entry.key}
          onClick={() => onView(entry.key)}
          onKeyDown={(event) => roving.onKeyDown(event, entry.key, (id) => onView(id as View))}
        >
          {entry.label}
        </button>
      ))}
    </div>
  )
}

export function ReviewToolbar({
  title,
  position,
  view,
  onView,
  selectedCount,
  onBulk,
  onClearSelection,
  narrow,
  onOpenInspector,
}: {
  /** The scene of the image on screen, or the folder's own name in grid. */
  title: string
  /** « 3 / 12 · filtre : Excellentes », already assembled by the screen. */
  position: string
  view: View
  onView: (view: View) => void
  selectedCount: number
  onBulk: (action: string) => void
  onClearSelection: () => void
  narrow: boolean
  onOpenInspector: () => void
}) {
  const selecting = view === 'grille' && selectedCount > 0

  if (selecting)
    return (
      <div
        className="flex h-[48px] flex-none items-center gap-[10px] overflow-x-auto border-b
                   border-b-line2 bg-panel2 px-[16px]"
      >
        <span
          className="flex-none text-[13px] font-[650] whitespace-nowrap text-txt"
          role="status"
          id="bulkCount"
        >
          {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}
        </span>
        <div className="flex flex-none gap-[8px] whitespace-nowrap" id="bulkBar">
          <button
            type="button"
            className="h-[32px] flex-none rounded-[7px] border-0 bg-pri px-[13px] text-[13px]
                       font-semibold whitespace-nowrap text-on-pri hover:bg-pri-h"
            data-a="valider"
            onClick={() => onBulk('valider')}
          >
            Garder
          </button>
          <button type="button" className="btn sm flex-none" data-a="rejeter" onClick={() => onBulk('rejeter')}>
            Rejeter
          </button>
          <button type="button" className="btn sm flex-none" data-a="archiver" onClick={() => onBulk('archiver')}>
            Archiver
          </button>
        </div>
        <button type="button" className="link flex-none whitespace-nowrap" onClick={onClearSelection}>
          Annuler{' '}
          <span className="kbd" aria-hidden="true">
            Échap
          </span>
        </button>
        <div className="flex-1" />
        <ViewSelector view={view} onView={onView} />
      </div>
    )

  return (
    <div
      className="flex h-[44px] flex-none items-center gap-[10px] overflow-x-auto border-b
                 border-b-line px-[16px]"
      id="reviewToolbar"
    >
      <h2 className="m-0 max-w-[280px] flex-none truncate text-[13px] font-semibold normal-case
                     tracking-normal text-txt">
        {title}
      </h2>
      <span className="flex-none text-[12px] whitespace-nowrap text-dim2">{position}</span>
      <div className="flex-1" />
      {narrow && (
        <button type="button" className="btn sm flex-none" id="btnInspector" onClick={onOpenInspector}>
          Inspecteur
        </button>
      )}
      <ViewSelector view={view} onView={onView} />
    </div>
  )
}
