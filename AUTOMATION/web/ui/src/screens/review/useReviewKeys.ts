/* The Review's keyboard, and the stack of guards each key carries.

   EVERY GUARD HERE HAS A REASON, and none may be dropped: a text field being
   typed into, an open modal `<dialog>` (which swallows the page), the lightbox,
   the photo editor, an open tile menu, and the Galerie trade — where the
   sorting shortcuts do not exist any more than their buttons do.

   That last one is the important one. Hiding the buttons and letting the
   keyboard sort anyway would be the worst of both halves: one would sort blind,
   with nothing on screen to say it happened.

   ONE LISTENER, REGISTERED ONCE, READING A REF. The handler used to be
   re-registered on every change of its ten dependencies, and that is a real
   defect, not a style question: a keypress that makes this screen RE-RENDER
   can tear the listener down mid-dispatch, before it has run. Measured on the
   23/09 — `f` (« proportions fausses ») also toggles the chrome's focus mode,
   whose listener runs first; once the Revue started reading ChromeContext for
   its narrow layout, that toggle re-rendered the screen, React swapped the
   listener during the same keydown, and `f` fired the focus mode and NOTHING
   else, silently. `n`, `p`, `b` and `m` kept working, which is exactly how
   quiet this class of bug is.

   The fix is not to chase the flush timing: the handler goes in a ref, the
   `document` listener is posted once on mount and removed once on unmount, and
   no re-render can take it away under a key that is already travelling. */
import { useEffect, useRef } from 'react'

import { LABEL_AXES } from './CorpusLabels'
import type { JudgementAxis } from './useSortActions'
import type { GalleryItem, Trade, View } from './useTriage'

/* Corpus-label shortcuts, derived from the axes themselves so a key can never
   drift from the letter its own button advertises: { p: ['anatomie', 'ok'], … }.
   Six letters, all outside the sorting set (v r x a d u) and the realism pair
   (c i) — a labelling pass and a sorting pass share the same keyboard. */
const LABEL_KEYS: Record<string, [JudgementAxis, string]> = Object.fromEntries(
  LABEL_AXES.flatMap((axis) =>
    axis.choices.map((choice) => [choice.key.toLowerCase(), [axis.axe, choice.value]]),
  ),
)

/* A text field being typed into, never a checkbox. `<input>` alone used to
   be the whole test — found live (design-pass screen-5, §D): a selection
   checkbox is an `<input>` too and stays focused after a click (expected,
   accessible behaviour), so Échap pressed right after checking a box never
   reached this hook at all, silently swallowed by this guard before it
   could clear the selection. Narrowed to the input TYPES that actually take
   text, everything else (checkbox/radio/range/button/…) falls through. */
function isTextEntry(el: HTMLElement | null): boolean {
  if (!el) return false
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName !== 'INPUT') return false
  const NOT_TEXT = ['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color']
  return !NOT_TEXT.includes((el as HTMLInputElement).type)
}

export function useReviewKeys({
  trade,
  view,
  setView,
  step,
  act,
  setFlag,
  undo,
  current,
  lightboxSrc,
  selectedCount,
  onClearSelection,
  menuOpen,
  onToggleCart,
}: {
  trade: Trade
  view: View
  setView: (view: View) => void
  step: (delta: number) => void
  act: (action: string, index?: number) => Promise<void> | void
  setFlag: (item: GalleryItem, flag: string, axe?: JudgementAxis) => Promise<void> | void
  undo: () => Promise<void> | void
  current: GalleryItem | undefined
  lightboxSrc: string | null
  /** Multi-select (design-pass screen-5, §D) — Échap clears it, nothing else
      here owned this key before. */
  selectedCount: number
  onClearSelection: () => void
  /** The tile context menu is open (design-pass screen-5b, §S3.4). It LISTS
      the sorting keys, so a key pressed while reading it must not also fire
      the gesture behind the menu — one would sort the tile one was inspecting,
      with the menu still covering it. The menu owns Escape itself. */
  menuOpen: boolean
  /** Galerie only: `B` puts the aimed image in the cart, or takes it out
      (design-pass screen-5c, §S3). Undefined in the Revue, where that letter
      belongs to the corpus labels and to nothing else. */
  onToggleCart?: () => void
}) {
  /* The handler, rebuilt on every render — cheap — and read through a ref by
     the one listener below. */
  const latest = useRef<(event: KeyboardEvent) => void>(() => {})
  latest.current = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    if (isTextEntry(target)) return
    if (target?.isContentEditable) return
    // an open modal <dialog> swallows the page: its keys must not percolate
    if (document.querySelector('dialog[open]')) return
    if (lightboxSrc) return
    if (document.body.classList.contains('editing')) return
    if (menuOpen) return
    /* The filmstrip (design-pass screen-5, §A) is a `role="listbox"` with
       its OWN ArrowLeft/Right handling (chrome/useRovingChoice.ts) that
       already calls `onSelectIndex` -> `setCursor`. This listener is a raw
       `document` listener, outside React's synthetic event tree: a
       `stopPropagation()` inside the filmstrip's own `onKeyDown` would
       NOT stop it from also firing here and calling `step()` a second
       time for the same keypress. Same guard idiom as the four checks
       above. */
    if (target?.closest('[role="listbox"]')) return

    const key = event.key.toLowerCase()
    if (key === 'escape' && selectedCount > 0) {
      onClearSelection()
      return
    }
    if (key === 'arrowright') return step(1)
    if (key === 'arrowleft') return step(-1)
    /* Enter on the grid = open the aimed tile full frame (the keyboard
       equivalent of clicking the thumbnail). Not when the focus is on a
       button: Enter would then sort AND magnify. */
    if (key === 'enter' && view === 'grille' && !target?.closest('button, a')) {
      setView('revue')
      return
    }
    if (trade === 'galerie' && 'vrxadu'.includes(key)) return
    /* `B` ON THE BOARD ONLY. In the loupe that same letter already means
       « mains bonnes » (CorpusLabels), and a letter doing two things on one
       screen is a letter one stops trusting. The VIEW tells them apart: the
       board carries no corpus instrument, the loupe carries no cart. */
    if (key === 'b' && onToggleCart && view === 'grille') {
      onToggleCart()
      return
    }
    if (key === 'v') void act('valider')
    else if (key === 'r') void act('revoir')
    else if (key === 'x') void act('rejeter')
    else if (key === 'a') void act('archiver')
    else if (key === 'd') void act('decliner')
    else if (key === 'c') current && void setFlag(current, 'ok')
    else if (key === 'i') current && void setFlag(current, 'ia')
    /* P4.5.1 labelling, the keyboard half of `CorpusLabels` — the corpus is
       ~100 images and nobody builds it with a mouse. Full frame ONLY, like
       the buttons: neither a proportion nor a hand can be judged on a
       thumbnail, and a corpus labelled from the grid would be a corpus
       labelled blind. */
    else if (LABEL_KEYS[key] && view === 'revue' && current)
      void setFlag(current, LABEL_KEYS[key][1], LABEL_KEYS[key][0])
    else if (key === 'u') void undo()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => latest.current(event)
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
}
