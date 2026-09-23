/* The studio's three categories, centred in the header (design-pass
   screen-0-chrome §S1/§S2.4, 23/09/2026). Replaces `SideNav.tsx`.

   WHY CATEGORIES. The side navbar listed eight destinations flat, 208 px wide,
   which gave « produire une image » and « éditer un monde » the same weight and
   spent a fifth of a 1024 px screen saying where one could go rather than
   showing what one was doing. Three categories in the header, and the modules
   of the open one in a 34 px sub-bar (`ModuleBar.tsx`), cost 0 px of width.

   THE NAVIGATION CONTRACT, amended in the same commit. `.tabs` stays the
   container class and now names THIS bar; `data-s` carries a CategoryKey
   (three values) where it used to carry a ScreenKey (eight). Modules keep an
   explicit attribute of their own, `data-m`, in the sub-bar. See
   `app/routes.ts`, which owns both tables.

   POINTER AND KEYBOARD DO NOT DO THE SAME THING, deliberately:

     - hovering an inactive category opens its menu (a pointer can explore
       without committing);
     - CLICKING it opens its first module (a pointer that committed wants to
       go somewhere, not to read a list it has already seen);
     - Enter / Space / ArrowDown open the menu and move focus into it — a
       keyboard has no hover, so the menu must have a key of its own, and
       `aria-haspopup="menu"` promises exactly that to a screen reader.

   The keydown handler calls `preventDefault()`, which is what stops the
   browser from synthesising the click that would otherwise navigate.

   The menu mechanics (outside click, Escape, arrows, focus returned to the
   trigger) mirror `IdentityMenu.tsx` rather than sharing a hook with it: the
   two have different containers and different item sets, and factoring them
   would mean touching the identity menu for a saving of about twenty lines. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import {
  CATEGORIES,
  activeCategory,
  characterPath,
  isDestinationActive,
  modulesOf,
  type CategoryKey,
} from '../app/routes'
import { useCharacter } from '../character/CharacterContext'
import { useSystemState } from '../state/SystemStateContext'
import { Icon } from './Icon'

export function CategoryBar() {
  const { isClaimed } = useCharacter()
  const { state } = useSystemState()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState<CategoryKey | null>(null)
  const barRef = useRef<HTMLElement | null>(null)
  const triggers = useRef(new Map<CategoryKey, HTMLButtonElement>())
  const menus = useRef(new Map<CategoryKey, HTMLDivElement>())

  const close = useCallback(
    (giveFocusBack: CategoryKey | null = null) => {
      setOpen(null)
      if (giveFocusBack) triggers.current.get(giveFocusBack)?.focus()
    },
    [],
  )

  /* Outside click and Escape close, like every overlay of the chrome. */
  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !barRef.current?.contains(event.target)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(open)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  /* The gate has no category bar: with no character claimed there is nothing to
     navigate, and choosing one is what makes you enter (§S6). */
  if (!isClaimed) return null

  const current = activeCategory(pathname)
  const waiting = state?.counts?.A_REVOIR ?? 0

  /* `#nTri` is an ID, so exactly ONE node may carry it. It lives on the Revue
     module in the sub-bar while Production is open, and climbs onto the
     Production category otherwise — the counter says work is WAITING, which is
     needed most precisely when one is looking elsewhere. At zero it has nothing
     to announce and is not rendered (`data-zero` tells the stylesheet, which
     cannot read a number). */
  const badgeHere = (category: CategoryKey) =>
    category === 'production' && current !== 'production' && waiting > 0

  const pathOf = (key: string, path: string) =>
    key === 'character' ? characterPath(isClaimed) : path

  const openMenu = (category: CategoryKey) => {
    setOpen(category)
    /* role=menu implies focus lands on the first item. */
    requestAnimationFrame(() => {
      menus.current.get(category)?.querySelector<HTMLElement>('a')?.focus()
    })
  }

  const onTriggerKeyDown = (event: React.KeyboardEvent, category: CategoryKey) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown') return
    event.preventDefault()
    openMenu(category)
  }

  const onMenuKeyDown = (event: React.KeyboardEvent, category: CategoryKey) => {
    const items = Array.from(menus.current.get(category)?.querySelectorAll<HTMLElement>('a') ?? [])
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

  return (
    <nav className="tabs" id="studioNav" aria-label="Navigation du studio" ref={barRef}>
      {CATEGORIES.map((category) => {
        const modules = modulesOf(category.key)
        const on = current === category.key
        const menuOpen = open === category.key

        return (
          <div
            key={category.key}
            className="cat-wrap"
            onPointerEnter={(event) => {
              /* Hover opens, but only for a real pointer: a touch « hover »
                 fires alongside the click and would open a menu the tap is
                 already navigating away from. */
              if (event.pointerType === 'touch' || on) return
              setOpen(category.key)
            }}
            onPointerLeave={() => setOpen((c) => (c === category.key ? null : c))}
          >
            <button
              type="button"
              className={`cat${on ? ' on' : ''}`}
              data-s={category.key}
              ref={(el) => {
                if (el) triggers.current.set(category.key, el)
                else triggers.current.delete(category.key)
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-current={on ? 'true' : undefined}
              onKeyDown={(event) => onTriggerKeyDown(event, category.key)}
              onClick={() => {
                close()
                const first = modules[0]
                if (first) navigate(pathOf(first.key, first.path))
              }}
            >
              <span className="nav-lab">{category.label}</span>
              {badgeHere(category.key) && (
                <span className="n" id="nTri" data-zero="0">
                  {waiting}
                </span>
              )}
              {!on && <Icon name="chevron" className="cat-chev" />}
            </button>

            <div
              className={`catmenu${menuOpen ? ' on' : ''}`}
              role="menu"
              aria-label={category.label}
              ref={(el) => {
                if (el) menus.current.set(category.key, el)
                else menus.current.delete(category.key)
              }}
              onKeyDown={(event) => onMenuKeyDown(event, category.key)}
            >
              <span className="catmenu-lab" role="none">
                {category.label}
              </span>
              {modules.map((destination) => (
                <NavLink
                  key={destination.key}
                  to={pathOf(destination.key, destination.path)}
                  data-m={destination.key}
                  role="menuitem"
                  tabIndex={-1}
                  aria-current={
                    isDestinationActive(destination, pathname) ? 'page' : undefined
                  }
                  onClick={() => close()}
                >
                  <Icon name={destination.icon} className="mod-ic" />
                  <span className="nav-lab">
                    {(isClaimed && destination.labelWhenClaimed) || destination.label}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
