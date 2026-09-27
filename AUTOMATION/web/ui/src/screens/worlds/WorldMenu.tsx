/* The world picker of the screen bar (design-pass 19 §S2) — it replaces the
   260 px registry column: a world is chosen once per session, and a column
   spent on that choice was a column not spent on the world itself.

   Presentation only: props and callbacks, no API call.

   `role="menu"` after `bank/assets/ImportMenu`'s pattern: arrows, Home and End
   move the focus, Escape closes, an outside click dismisses, and the opener
   gets the focus back. The menu sits in the button's own wrapper, so a click
   on the button is not « outside » and toggles instead of closing then
   reopening. */
import { useEffect, useRef, useState } from 'react'

import type { WorldSummary } from './useWorldRegistry'

const ITEM =
  'flex w-full cursor-pointer flex-col border-0 bg-transparent px-[12px] py-[7px] text-left' +
  ' hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]'

export function WorldMenu({
  worlds,
  current,
  onSelect,
  onNew,
}: {
  worlds: WorldSummary[]
  current: WorldSummary
  onSelect: (id: string) => void
  onNew: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement | null>(null)
  const menu = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const close = () => {
      setOpen(false)
      wrapper.current?.querySelector<HTMLElement>('#worldPick')?.focus()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      close()
    }
    const onOutside = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onOutside)
    ;(menu.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? items()[0])?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onOutside)
    }
  }, [open])

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const list = items()
    if (!list.length) return
    const index = list.indexOf(document.activeElement as HTMLElement)
    const to = { ArrowDown: index + 1, ArrowUp: index - 1 + list.length, Home: 0, End: list.length - 1 }[
      event.key as 'ArrowDown']
    if (to === undefined) return
    event.preventDefault()
    list[to % list.length].focus()
  }

  const pick = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div ref={wrapper} className="relative min-w-0 flex-none">
      <button
        type="button"
        id="worldPick"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-[32px] max-w-[320px] cursor-pointer items-center gap-[8px] rounded-[6px] border-0 bg-panel3
                   px-[10px] text-[15px] font-[650] text-txt hover:bg-panel2
                   focus-visible:outline-2 focus-visible:outline-focus"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 truncate">{current.label}</span>
        <span aria-hidden="true" className="text-[11px] text-dim2">
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={menu}
          id="worldMenu"
          role="menu"
          aria-label="Mondes"
          onKeyDown={onMenuKeyDown}
          className="absolute top-[calc(100%+4px)] left-0 z-[10] w-[300px] rounded-card border border-line2 bg-panel
                     py-[4px] shadow-elev"
        >
          <p className="lab m-0 px-[12px] pt-[4px] pb-[6px]">Mondes · {worlds.length}</p>
          {worlds.map((world) => (
            <button
              key={world.id}
              type="button"
              role="menuitemradio"
              aria-checked={world.id === current.id}
              tabIndex={-1}
              data-world-card
              className={`${ITEM} ${world.id === current.id ? 'bg-panel3 [box-shadow:inset_2px_0_0_var(--acc)]' : ''}`}
              onClick={() => pick(() => onSelect(world.id))}
            >
              <span className="flex w-full items-baseline gap-[8px]">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{world.label}</span>
                <span className={`flex-none text-[11.5px] tabular-nums ${world.id === current.id ? 'text-dim' : 'text-dim2'}`}>
                  {world.scenes_count > 0
                    ? `${world.scenes_count} scène${world.scenes_count > 1 ? 's' : ''}`
                    : 'vide'}
                </span>
              </span>
              <span className={`mt-[2px] block w-full truncate text-[11px] ${world.id === current.id ? 'text-dim' : 'text-dim2'}`}>
                <code className="font-code text-[11px] leading-[normal]">{world.id}</code>
                {(world.compatible_families ?? []).length > 0 && (
                  <> · {(world.compatible_families ?? []).join(', ')}</>
                )}
              </span>
            </button>
          ))}
          <div className="mt-[4px] border-t border-t-line pt-[4px]">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              data-new
              className={`${ITEM} text-[13px] text-dim hover:text-txt`}
              onClick={() => pick(onNew)}
            >
              + Nouveau monde
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
