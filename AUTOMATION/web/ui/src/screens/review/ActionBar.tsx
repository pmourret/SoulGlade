/* The loupe's action bar (design-pass screen-5b, §S3.3) — replaces
   `ReviewActions.tsx`, which lived in the meta column as a two-column grid of
   buttons.

   IT SITS UNDER THE IMAGE, where the gesture is. The actions used to be on
   the right, below five stacked `.meta` boxes, so the eye that had just
   judged the photograph travelled across the screen to act on it. Now the
   image, the bar, and the filmstrip are one column.

   EVERY BUTTON SHOWS ITS KEY, and that is the screen's real interface: a
   sorting pass is a hundred keystrokes, not a hundred clicks. The key is
   `aria-hidden` and repeated in `aria-keyshortcuts`, so it is announced once
   rather than read in the middle of the label.

   ONE TABLE FOR TWO SURFACES: the list comes from `sortActions` in
   `TileMenu.tsx`, so a gesture cannot exist in the menu and not here. */
import { sortActions } from './TileMenu'
import type { Trade } from './useTriage'

const BTN =
  'flex h-[34px] flex-none items-center gap-[7px] rounded-[7px] border border-line2' +
  ' bg-panel2 px-[13px] text-[13px] whitespace-nowrap text-txt hover:border-dim2' +
  ' focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-2'
const BTN_PRIMARY =
  'flex h-[34px] flex-none items-center gap-[7px] rounded-[7px] border-0 bg-pri px-[14px]' +
  ' text-[13px] font-semibold whitespace-nowrap text-on-pri hover:bg-pri-h' +
  ' focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-2'

function Key({ label }: { label: string }) {
  return (
    <span className="kbd" aria-hidden="true">
      {label}
    </span>
  )
}

export function ActionBar({
  trade,
  bucket,
  src,
  onAct,
  onEdit,
  onDelete,
}: {
  trade: Trade
  bucket?: string
  src: string
  onAct: (action: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const actions = sortActions(trade, bucket)
  /* The first entry of a Revue folder is the one that RESOLVES it — keep,
     restore — and it is the only one painted as primary. In the Galerie
     nothing is resolved, so nothing is primary except the download. */
  const primary = trade === 'revue' ? actions[0]?.action : null

  return (
    <div
      className="flex h-[52px] flex-none items-center justify-center gap-[8px] overflow-x-auto
                 border-t border-t-line bg-sub px-[16px]"
      data-acts
    >
      {trade === 'galerie' && (
        <a className={BTN_PRIMARY} download href={src} data-dl>
          Télécharger
        </a>
      )}
      {actions.map((entry) => (
        <button
          key={entry.action}
          type="button"
          className={entry.action === primary ? BTN_PRIMARY : BTN}
          data-a={entry.action}
          aria-keyshortcuts={entry.key && entry.key !== '→' ? entry.key : undefined}
          onClick={() => onAct(entry.action)}
        >
          {entry.label}
          {entry.key && <Key label={entry.key} />}
        </button>
      ))}

      <span className="mx-[4px] h-[22px] w-px flex-none bg-line2" />

      <button type="button" className={BTN} id="btnOuvrirEditeur" onClick={onEdit}>
        Éditer
      </button>
      {trade === 'galerie' && (
        /* INERT, and it says why — a disabled button with no readable reason
           reads as a breakdown. The destination exists in this pack's trade,
           not yet in the code; an absent button would suggest the question is
           not even asked. The reason moved from `title` (mouse only) to a
           hint bubble, which the keyboard reaches too. */
        <button
          type="button"
          className={`${BTN} opacity-50`}
          id="btnInsta"
          disabled
          data-hint-text="Poster sur Instagram — pas encore branché"
        >
          Poster sur Instagram
          <span className="text-[11px] text-dim2">pas encore branché</span>
        </button>
      )}
      {/* §S5: no longer a permanent red button. Plain text in the danger
          family, last, and it opens the confirmation `deleteForever` has
          always carried. */}
      <button
        type="button"
        className="flex h-[34px] flex-none items-center rounded-[7px] border-0 bg-transparent
                   px-[10px] text-[13px] whitespace-nowrap text-danger-txt hover:bg-danger-bg
                   focus-visible:outline-2 focus-visible:outline-[var(--focus)]
                   focus-visible:outline-offset-2"
        id="btnSupprDef"
        onClick={onDelete}
      >
        Supprimer…
      </button>
    </div>
  )
}
