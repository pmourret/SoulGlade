/* ↑ ↓ inside a listbox: they move the FOCUS, and Entrée (or a click) picks.

   `chrome/useRovingChoice` is the studio's other answer to the same keys, and
   it is not reusable here: its arrows SELECT as they move, like a native radio
   group. On these two lists selecting is a navigation (the registry changes
   world) or an opening (the catalog changes what the inspector holds), and
   both ask to save or discard when something is pending — one arrow press
   would then pop a dialog, and holding the arrow would pop one per row.

   That makes these listboxes the « manual selection » variant of the ARIA
   pattern rather than the « follows focus » one, which is exactly what the
   design-pass asks for by writing « ↑ ↓, Entrée ouvre dans l'inspecteur »
   (§S3, §S4.3).

   A FUNCTION, NOT A HOOK: it reads the DOM it is given and returns nothing. */
export function moveFocusInList(event: React.KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const current = event.currentTarget
  const list = current.closest('[role="listbox"]')
  if (!list) return
  const options = Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'))
  const next = options[options.indexOf(current) + (event.key === 'ArrowDown' ? 1 : -1)]
  if (!next) return
  event.preventDefault()
  next.focus()
}

/** One Tab stop per list: the selected row, or the first one while nothing is
    selected — same contract as `useRovingChoice.tabIndexFor`. */
export function tabIndexInList(isSelected: boolean, isFirst: boolean, hasSelection: boolean): 0 | -1 {
  return (hasSelection ? isSelected : isFirst) ? 0 : -1
}
