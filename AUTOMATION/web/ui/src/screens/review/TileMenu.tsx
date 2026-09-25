/* The context menu of a grid tile (design-pass screen-5b, §S3.4).

   IT IS WHERE THE SEVEN GLYPHS WENT. The tile used to carry a row of icon
   buttons; twenty tiles carried twenty rows, and the photograph was the
   smallest thing on its own tile. The gestures are the same, they have a
   name now instead of a glyph, and they say their key — which is the point:
   this screen is sorted at the keyboard, and the menu is where one LEARNS
   that V keeps and X rejects.

   THE SAME ACTIONS AS THE LOUPE'S BAR, from the same table (`sortActions`),
   so a gesture can never exist in one place and not the other.

   `role="menu"` after `IdentityMenu`'s pattern, and the WHOLE pattern: the
   arrows, Home and End move the focus between items, each item is taken out
   of the tab order so Tab LEAVES the menu rather than walking it, Escape
   closes, an outside click dismisses, and focus returns to the tile that
   opened it. Declaring the role and wiring only Escape would be worse than
   declaring nothing: a screen reader announces « menu » and then the gestures
   it promises do not answer. While the menu is open the screen's keyboard
   guard ignores the sorting keys — otherwise pressing V to read the menu's
   own hint would sort behind it. */
import { useEffect, useRef } from 'react'

import type { Trade } from './useTriage'

export type MenuAction = {
  /** `data-a` of the sort, or one of the three local verbs below. */
  action: string
  label: string
  key?: string
  /** Drawn in the danger family and placed after a separator. */
  danger?: boolean
  /** A download rather than a call: rendered as `<a download>`. */
  href?: string
}

/* The sorting gestures a folder offers, in the order the loupe's bar shows
   them. Shared with `ActionBar.tsx`: one table, two surfaces. */
export function sortActions(trade: Trade, bucket: string | undefined): MenuAction[] {
  if (trade === 'galerie')
    return [
      { action: 'decliner', label: 'Décliner', key: 'D' },
      { action: 'skip', label: 'Suivante', key: '→' },
    ]
  if (bucket === 'REJET')
    return [
      { action: 'valider', label: 'Restaurer', key: 'V' },
      { action: 'archiver', label: 'Archiver', key: 'A' },
      { action: 'skip', label: 'Suivante', key: '→' },
    ]
  if (bucket === 'ARCHIVE')
    return [
      { action: 'valider', label: 'Restaurer', key: 'V' },
      { action: 'rejeter', label: 'Rejeter', key: 'X' },
      { action: 'skip', label: 'Suivante', key: '→' },
    ]
  if (bucket === 'OK')
    return [
      { action: 'decliner', label: 'Décliner', key: 'D' },
      { action: 'archiver', label: 'Archiver', key: 'A' },
      { action: 'rejeter', label: 'Rejeter', key: 'X' },
      { action: 'skip', label: 'Suivante', key: '→' },
    ]
  return [
    { action: 'valider', label: 'Garder', key: 'V' },
    { action: 'decliner', label: 'Décliner', key: 'D' },
    { action: 'rejeter', label: 'Rejeter', key: 'X' },
    { action: 'archiver', label: 'Archiver', key: 'A' },
    { action: 'skip', label: 'Suivante', key: '→' },
  ]
}

const ITEM =
  'flex w-full cursor-pointer items-center gap-[14px] border-0 bg-transparent px-[12px]' +
  ' py-[7px] text-left text-[13px] no-underline hover:bg-panel2' +
  ' focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-[-2px]'

export function TileMenu({
  trade,
  bucket,
  /** Where the pointer opened it; `null` centres it on the tile instead. */
  at,
  downloadHref,
  onAct,
  onEdit,
  onDelete,
  onClose,
}: {
  trade: Trade
  bucket?: string
  at: { x: number; y: number } | null
  downloadHref: string
  onAct: (action: string) => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  /* Arrows, Home and End, exactly as `IdentityMenu.onMenuKeyDown` does them.
     Read from the DOM rather than from an index of state: the entries differ
     per folder and per trade, and a list that computed its own length twice
     is a list that can disagree with itself. */
  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    if (!items.length) return
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[(index + 1) % items.length].focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length].focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      items[0].focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      items[items.length - 1].focus()
    }
  }

  /* Escape and the outside click, same contract as IdentityMenu. The opener
     restores its own focus: `onClose` is called by the screen, which knows
     which tile it came from. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    const onOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onOutside)
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onOutside)
    }
  }, [onClose])

  const actions = sortActions(trade, bucket)

  return (
    <div
      ref={ref}
      role="menu"
      id="tileMenu"
      aria-label="Actions sur cette image"
      onKeyDown={onMenuKeyDown}
      className="fixed z-[20] min-w-[210px] overflow-hidden rounded-card border border-line2
                 bg-panel py-[5px] shadow-elev"
      style={at ? { left: at.x, top: at.y } : { left: '50%', top: '40%' }}
    >
      {actions.map((entry) => (
        <button
          key={entry.action}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={ITEM}
          data-a={entry.action}
          onClick={() => {
            onAct(entry.action)
            onClose()
          }}
        >
          <span className="min-w-0 flex-1 truncate">{entry.label}</span>
          {entry.key && <span className="kbd flex-none">{entry.key}</span>}
        </button>
      ))}

      <span className="my-[5px] block h-px bg-line" role="separator" />

      {trade === 'galerie' && (
        <a
          role="menuitem"
          tabIndex={-1}
          className={ITEM}
          data-dl
          download
          href={downloadHref}
          onClick={onClose}
        >
          <span className="min-w-0 flex-1 truncate">Télécharger</span>
        </a>
      )}
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        className={ITEM}
        data-e="1"
        onClick={() => {
          onEdit()
          onClose()
        }}
      >
        <span className="min-w-0 flex-1 truncate">Éditer</span>
      </button>
      {/* The only irreversible gesture of the screen, last, after a separator
          and in the danger family. It opens the SAME confirmation as the
          loupe's own (`deleteForever`, which has always confirmed). */}
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        className={`${ITEM} text-danger-txt`}
        data-suppr="1"
        onClick={() => {
          onDelete()
          onClose()
        }}
      >
        <span className="min-w-0 flex-1 truncate">Supprimer…</span>
      </button>
    </div>
  )
}
