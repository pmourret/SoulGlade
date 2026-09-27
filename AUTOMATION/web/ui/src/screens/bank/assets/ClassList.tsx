/* The class column of the asset library, 260 px (design-pass screen-assets
   §S2) — and ClassChips, the same thing as a row under 1100 px (§S7).
   Presentation only: the view hands over the entries, what the open one is,
   and the drop handlers of each row.

   THE CLASSES ARE ALSO THE DROP TARGETS. A file released on a row enters as
   that class; one released on « Toutes » or « Sans fragment » asks which. While
   a file hovers a row, the row says the action in words — the class an import
   takes decides the vision model's instruction, and it never changes after.

   ↑ ↓ MOVE THE FOCUS, Entrée or a click opens (`worlds/listKeys`, the
   « manual selection » variant): opening a class only filters, but a row that
   opened under a held arrow would refilter the grid once per row crossed. */
import type { ReactNode } from 'react'

import { Icon } from '../../../chrome/Icon'
import { Segmented } from '../../../chrome/Segmented'
import { moveFocusInList, tabIndexInList } from '../../worlds/listKeys'
import { UNFRAGMENTED, type OpenClass } from './classDestination'

export type ClassEntry = { key: string; label: string; count: number; note?: string }

export type Owner = 'personnage' | 'monde'

type DropHandlers = { onDragOver: React.DragEventHandler; onDrop: React.DragEventHandler }

export type ClassNavProps = {
  /** « Toutes » first, then one entry per server class. */
  entries: ClassEntry[]
  unfragmented: number
  open: OpenClass
  onOpen: (key: OpenClass) => void
  /** `dragover`/`drop` of the row, from `useFileDrop.targetHandlers`. */
  dropOf: (key: OpenClass) => DropHandlers
  /** What a row says while a file hovers it, or null when it is not hovered. */
  dropText: (key: OpenClass) => string | null
  owner: Owner
  onOwner: (owner: Owner) => void
  characterName: string
  worldLabel: string | null
}

const NO_WORLD = "Ce personnage n'a pas de monde : l'asset ne peut être que le sien."

function Row({
  entry, open, first, hasOpen, warn, onOpen, drop, dropText,
}: {
  entry: ClassEntry
  open: boolean
  first: boolean
  hasOpen: boolean
  warn?: boolean
  onOpen: () => void
  drop: DropHandlers
  dropText: string | null
}) {
  return (
    <div
      role="option"
      aria-selected={open}
      tabIndex={tabIndexInList(open, first, hasOpen)}
      data-asset-class={entry.key}
      onClick={onOpen}
      onKeyDown={(event) => {
        moveFocusInList(event)
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      {...drop}
      className={`relative cursor-pointer rounded-[6px] border-2 px-[10px] py-[7px] ${
        dropText ? 'border-dashed border-acc' : 'border-transparent'} ${
        open ? 'bg-panel3 font-semibold shadow-[inset_2px_0_0_var(--acc)]' : 'hover:bg-panel2'}
        focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-[-2px]`}
    >
      <span className="flex items-center gap-[8px]">
        {warn && <Icon name="warn" className="h-[12px] w-[12px] flex-none text-warn-txt" aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate text-[13px]">{entry.label}</span>
        {/* `--dim2` on the open row's `--panel3` is 4.27:1 (base.css): the open
            row's count takes `--dim`, measured 27/09. */}
        <span className={`font-code text-[12px] font-normal ${warn ? 'text-warn-txt' : open ? 'text-dim' : 'text-dim2'}`}>
          {entry.count}
        </span>
      </span>
      {(dropText || entry.note) && (
        <span className={`tiny mt-[2px] block font-normal ${dropText ? 'text-txt' : ''}`} aria-live="polite">
          {dropText || entry.note}
        </span>
      )}
    </div>
  )
}

export function ClassList(props: ClassNavProps) {
  const { entries, unfragmented, open, onOpen, dropOf, dropText } = props
  const fragmentless: ClassEntry = { key: UNFRAGMENTED, label: 'Sans fragment', count: unfragmented, note: 'à analyser' }
  return (
    <aside className="flex min-h-0 flex-col border-r border-r-line bg-panel" aria-label="Classes d'assets">
      <div className="min-h-0 flex-1 overflow-y-auto p-[12px]">
        <h2 className="lab mb-[8px] px-[4px]" id="assetClassesLab">Classes</h2>
        <div role="listbox" id="assetFilter" aria-labelledby="assetClassesLab" className="flex flex-col gap-[2px]">
          {entries.map((entry, i) => (
            <Row key={entry.key} entry={entry} open={open === entry.key} first={i === 0} hasOpen
                 onOpen={() => onOpen(entry.key)} drop={dropOf(entry.key)} dropText={dropText(entry.key)} />
          ))}
          <hr className="my-[8px] border-0 border-t border-t-line" />
          <Row entry={fragmentless} open={open === UNFRAGMENTED} first={false} hasOpen warn
               onOpen={() => onOpen(UNFRAGMENTED)} drop={dropOf(UNFRAGMENTED)} dropText={dropText(UNFRAGMENTED)} />
        </div>
      </div>
      <OwnerFooter {...props} />
    </aside>
  )
}

function OwnerFooter({ owner, onOwner, characterName, worldLabel }: ClassNavProps) {
  return (
    <div className="flex flex-none flex-col gap-[6px] border-t border-t-line p-[12px]">
      <span className="lab">Importer pour</span>
      <Segmented
        id="assetOwner"
        label="Importer pour"
        value={worldLabel ? owner : 'personnage'}
        disabled={!worldLabel}
        onPick={onOwner}
        options={[
          { value: 'personnage', label: characterName },
          { value: 'monde', label: worldLabel ? `Monde ${worldLabel}` : 'Monde' },
        ]}
      />
      <p className="tiny m-0">
        {worldLabel ? 'Un asset du monde est hérité par tous ses personnages.' : NO_WORLD}
      </p>
    </div>
  )
}

/** The same column as a row of chips, under 1100 px (§S7): toggle buttons
    in a group, each reached by Tab, as a row of chips reads. */
export function ClassChips(props: ClassNavProps) {
  const { entries, unfragmented, open, onOpen, dropOf, dropText, owner, onOwner, characterName, worldLabel } = props
  const chip = (key: OpenClass, label: ReactNode, count: number, warn = false) => {
    const text = dropText(key)
    return (
      <button
        key={key}
        type="button"
        aria-pressed={open === key}
        data-asset-class={key}
        onClick={() => onOpen(key)}
        {...dropOf(key)}
        className={`flex h-[28px] flex-none items-center gap-[6px] rounded-[6px] border-2 px-[9px] text-[12.5px] ${
          text ? 'border-dashed border-acc' : 'border-transparent'} ${
          open === key ? 'bg-panel3 font-semibold' : 'bg-transparent hover:bg-panel2'}`}
      >
        {warn && <Icon name="warn" className="h-[12px] w-[12px] text-warn-txt" aria-hidden="true" />}
        {text ?? label}
        {!text && (
          <span className={`font-code text-[12px] font-normal ${
            warn ? 'text-warn-txt' : open === key ? 'text-dim' : 'text-dim2'}`}>{count}</span>
        )}
      </button>
    )
  }
  return (
    <div className="flex h-[40px] flex-none items-center gap-[4px] overflow-x-auto border-b border-b-line px-[12px]">
      <div role="group" id="assetFilter" aria-label="Classes d'assets"
           className="flex min-w-0 flex-1 items-center gap-[4px]">
        {entries.map((e) => chip(e.key, e.label, e.count))}
        {chip(UNFRAGMENTED, 'Sans fragment', unfragmented, true)}
      </div>
      <label className="sr-only" htmlFor="assetOwner">Importer pour</label>
      <select
        id="assetOwner"
        className="w-[150px] flex-none text-[12.5px]"
        value={worldLabel ? owner : 'personnage'}
        disabled={!worldLabel}
        title={worldLabel ? undefined : NO_WORLD}
        onChange={(event) => onOwner(event.target.value as Owner)}
      >
        <option value="personnage">Pour {characterName}</option>
        <option value="monde">{worldLabel ? `Pour le monde ${worldLabel}` : 'Pour le monde'}</option>
      </select>
    </div>
  )
}
