/* Chrome state of the studio: collapsed tool rail, focus mode.

   THE GEAR HALF IS GONE TOO (23/09/2026, design-pass screen-3b §S4). It held
   `gearOpen` / `toggleGear` / `closeGear` because TWO buttons opened the
   generation settings — the gear of the launch bar and the one of the tool
   rail — and a second settings surface could have drifted from the first.
   The settings are now a TAB of Produire's inspector: they are never opened
   and never closed, so there is no shared open state left to hold. Produire
   was the only live reader; the rail's own button pointed at a panel that no
   longer floats, on a rail that no longer mounts anywhere (`RAIL_ON` is
   empty), and went with it.

   THE NAVBAR HALF IS GONE (23/09/2026, design-pass screen-0-chrome §S1). This
   module used to hold a second, symmetric pair — `navCollapsed` / `toggleNav`,
   the `studio.nav-mince` key, and an `iconsOnly` derived from « collapsed by
   preference, by focus, or by width ». The side navbar it described no longer
   exists: the categories live in the header and their modules in a 34 px
   sub-bar, and a bar that costs no width has nothing to collapse. The RAIL's
   collapse stays, because the rail stays.

   « focus » remains a work MODE, not a preference: it hides the header for as
   long as it lasts and is deliberately NOT persisted — finding the studio next
   morning with its header gone, without remembering asking for it, reads as a
   breakdown, not a setting.

   PERSISTENCE. `studio.rail-mince` keeps the legacy key and values ('1'/'0'),
   so a preference set before the React migration still survives it.

   Reads and writes are guarded: localStorage throws for real in a private
   window, with third-party cookies blocked, or during a thumbnail capture. A
   lost comfort setting must give a NORMAL chrome, never a studio stuck in
   focus. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const RAIL_KEY = 'studio.rail-mince'

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* tant pis */
  }
}

type ChromeContextValue = {
  /* The identity menu lives in the header, but the character sheet reopens it
     from inside the screen: « Tous les personnages » must lead to the ONE place
     a character is changed, not replay a choice grid of its own (F1.2). Its
     open state therefore belongs to the chrome, not to the header component. */
  identityMenuOpen: boolean
  openIdentityMenu: () => void
  closeIdentityMenu: () => void
  railCollapsed: boolean
  focus: boolean
  /** True under the narrow bound, where the sub-bar and the identity card
      shrink. Read from the SAME 1100 px value as the stylesheet. */
  narrow: boolean
  toggleRail: () => void
  toggleFocus: () => void
}

const Ctx = createContext<ChromeContextValue | null>(null)

/* Below this width the chrome sheds what is contextual — the brand, the probe
   labels, the identity card's second line. `matchMedia` reads the SAME bound as
   the stylesheet instead of duplicating it in a comparison. */
const NARROW = '(max-width:1100px)'

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [railCollapsed, setRailCollapsed] = useState(() => readFlag(RAIL_KEY))
  const [focus, setFocus] = useState(false)
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches)
  const [identityMenuOpen, setIdentityMenuOpen] = useState(false)

  const openIdentityMenu = useCallback(() => setIdentityMenuOpen(true), [])
  const closeIdentityMenu = useCallback(() => setIdentityMenuOpen(false), [])

  useEffect(() => {
    const query = window.matchMedia(NARROW)
    const onChange = () => setNarrow(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const toggleRail = useCallback(() => {
    setRailCollapsed((current) => {
      writeFlag(RAIL_KEY, !current)
      return !current
    })
  }, [])

  const toggleFocus = useCallback(() => setFocus((current) => !current), [])

  /* « f » toggles focus. Same guards as the legacy handler: we do not steal a
     keystroke from a text field, nor from a mode that already has its own.
     Escape is NOT used — it already closes the identity menu, the lightbox and
     the editor, and a fourth meaning would make the most-used key of the chrome
     unpredictable. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'f' && event.key !== 'F') return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && /input|textarea|select/i.test(target.tagName)) return
      if (target?.isContentEditable) return
      if (document.querySelector('dialog[open]')) return
      /* The identity menu lives IN the header: entering focus would make it
         vanish mid-interaction, leaving it open in the DOM. We do nothing —
         Escape closes first, then « f » finds its meaning back. */
      if (identityMenuOpen) return
      event.preventDefault()
      toggleFocus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [toggleFocus, identityMenuOpen])

  const value = useMemo<ChromeContextValue>(
    () => ({
      identityMenuOpen,
      openIdentityMenu,
      closeIdentityMenu,
      railCollapsed,
      focus,
      narrow,
      toggleRail,
      toggleFocus,
    }),
    [
      identityMenuOpen,
      openIdentityMenu,
      closeIdentityMenu,
      railCollapsed,
      focus,
      narrow,
      toggleRail,
      toggleFocus,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useChrome(): ChromeContextValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('useChrome hors de ChromeProvider')
  return value
}
