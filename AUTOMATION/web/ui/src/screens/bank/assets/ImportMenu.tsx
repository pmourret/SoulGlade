/* The class an import enters as, asked when the open view is not a class
   (« Toutes », « Sans fragment ») — from the import button, or on releasing a
   file over « Toutes » (design-pass screen-assets §S1, §S4). Presentation
   only: it lists `classes` and hands the pick back.

   `role="menu"` after `review/TileMenu`'s whole pattern: arrows, Home and End
   move the focus, Escape closes, an outside click dismisses, and the opener
   gets the focus back. It sits in the button's own wrapper, so a click on the
   button is not « outside » and toggles instead of closing then reopening. */
import { useEffect, useRef } from 'react'

import type { AssetClass } from './useAssetLibrary'

const ITEM =
  'flex w-full cursor-pointer items-center border-0 bg-transparent px-[12px] py-[7px] text-left text-[13px]' +
  ' hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-[-2px]'

export function ImportMenu({
  classes, fileName, onPick, onClose,
}: {
  classes: AssetClass[]
  /** The file already dropped, when the menu opened on a release. */
  fileName: string | null
  onPick: (classKey: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    if (!items.length) return
    const index = items.indexOf(document.activeElement as HTMLElement)
    const to = { ArrowDown: index + 1, ArrowUp: index - 1 + items.length, Home: 0, End: items.length - 1 }[
      event.key as 'ArrowDown']
    if (to === undefined) return
    event.preventDefault()
    items[to % items.length].focus()
  }

  useEffect(() => {
    const wrapper = ref.current?.parentElement
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
      wrapper?.querySelector<HTMLElement>('button')?.focus()
    }
    const onOutside = (event: MouseEvent) => {
      if (!wrapper?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onOutside)
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onOutside)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      id="assetClass"
      role="menu"
      aria-label="Classe de l'import"
      onKeyDown={onMenuKeyDown}
      className="absolute top-[calc(100%+4px)] right-0 z-[10] w-[240px] rounded-card border border-line2 bg-panel
                 py-[4px] shadow-elev"
    >
      <p className="m-0 truncate px-[12px] pt-[4px] pb-[6px] text-[12px] text-dim2">
        {fileName ? `Importer ${fileName} comme…` : 'Importer comme…'}
      </p>
      {classes.map((c) => (
        <button
          key={c.key}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={ITEM}
          data-import-class={c.key}
          onClick={() => onPick(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
