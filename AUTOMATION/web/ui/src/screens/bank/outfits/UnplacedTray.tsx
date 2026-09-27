/* The pieces of an outfit composed before the slots (design-pass tenues, S6)
   — presentational.

   UNTIL THEY ARE PLACED, NOTHING CHANGES: the outfit goes to a render in its
   original order, and nothing is written before Enregistrer. Each piece says
   the slot its words propose (« → Haut »); a written piece with no word the
   table knows says so, and stays unplaced until the user decides.

   Three ways to place one, never a drag alone: drag it onto a zone card; Enter
   poses it on the proposed slot; Shift Enter opens the sixteen slots. And
   « Ranger d'après les fragments » places every piece that has a proposal. */
import { useState, type KeyboardEvent } from 'react'

import { SLOTS, slotOf } from './outfitSlots'

export type UnplacedItem = { index: number; name: string; proposal: string | null }

/** Drag payload type: the index of the piece in the draft. */
export const DRAG_TYPE = 'application/x-outfit-piece'

export function UnplacedTray({
  items, busy, onPlace, onArrange,
}: {
  items: UnplacedItem[]
  busy: boolean
  onPlace: (index: number, slot: string) => void
  onArrange: () => void
}) {
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const placeable = items.filter((item) => item.proposal).length

  const onKey = (event: KeyboardEvent, item: UnplacedItem) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (event.shiftKey || !item.proposal) setMenuFor(item.index)
    else onPlace(item.index, item.proposal)
  }

  return (
    <div className="flex flex-col gap-[8px] rounded-card border border-warn-line bg-warn-bg p-[10px] text-warn-txt"
         id="outfitUnplaced">
      <div className="flex flex-wrap items-center gap-[10px]">
        <b className="text-[12.5px] font-semibold">
          {items.length} pièce{items.length > 1 ? 's' : ''} sans emplacement
        </b>
        <span className="min-w-0 flex-1 text-[12px]">
          composée avant les emplacements : elle part au rendu dans son ordre d'origine tant qu'elle n'est pas rangée.
        </span>
        <button type="button" className="btn sm flex-none" id="btnOutfitArrange" disabled={busy || !placeable}
                onClick={onArrange}>
          Ranger d'après les fragments
        </button>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-[6px] p-0">
        {items.map((item) => (
          <li key={item.index} className="relative">
            <button
              type="button"
              draggable
              data-unplaced={item.index}
              disabled={busy}
              aria-haspopup="menu"
              aria-label={`${item.name}, ${item.proposal ? `proposé : ${slotOf(item.proposal)?.label}` : 'aucun emplacement proposé'}. Entrée pour poser, Maj Entrée pour choisir.`}
              className="flex h-[26px] cursor-grab items-center gap-[6px] rounded-[5px] border border-warn-line bg-panel px-[8px]
                         text-[12px] text-txt"
              onDragStart={(event) => {
                event.dataTransfer.setData(DRAG_TYPE, String(item.index))
                event.dataTransfer.effectAllowed = 'move'
              }}
              onKeyDown={(event) => onKey(event, item)}
              onClick={() => (item.proposal ? onPlace(item.index, item.proposal) : setMenuFor(item.index))}
            >
              <span className="max-w-[200px] truncate">{item.name}</span>
              <span className="text-dim">{item.proposal ? `→ ${slotOf(item.proposal)?.label}` : 'aucun mot reconnu'}</span>
            </button>
            {menuFor === item.index && (
              <div
                role="menu"
                aria-label={`Emplacement de ${item.name}`}
                className="absolute top-full left-0 z-[5] mt-[4px] grid w-[300px] grid-cols-2 gap-[2px] rounded-card border
                           border-line bg-panel p-[6px] shadow-elev"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation()
                    setMenuFor(null)
                    document.querySelector<HTMLElement>(`[data-unplaced="${item.index}"]`)?.focus()
                  }
                }}
              >
                {SLOTS.map((slot, n) => (
                  <button
                    key={slot.key}
                    type="button"
                    role="menuitem"
                    autoFocus={n === 0}
                    className="flex h-[26px] items-center gap-[6px] rounded-[4px] border-0 bg-transparent px-[6px] text-left
                               text-[12px] text-txt hover:bg-panel3"
                    onClick={() => {
                      setMenuFor(null)
                      onPlace(item.index, slot.key)
                    }}
                  >
                    <span className="w-[16px] font-code text-[11px] text-dim2">{n + 1}</span>
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
