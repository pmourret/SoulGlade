/* The Galerie's cart: what one has chosen to take out (design-pass
   screen-5c, §S5).

   IT IS THE SELECTION, AND THERE IS ONLY ONE. The Galerie used to carry a
   multi-selection whose three actions — Garder, Rejeter, Archiver — are
   SORTS, on a screen whose first invariant is that it does not sort. That bar
   is gone, and the checkbox it fed now fills the cart; Comparer reads the
   same set. One tick, one meaning (décidé avec Pierre, 23/09/2026).

   IT IS SAVED NOWHERE, and that is deliberate rather than unfinished. A cart
   is what one is carrying right now, not a state of the character: written to
   disk it would outlive the session that made sense of it, and be the fourth
   place where an image's fate is recorded. Closing the tab empties it.

   `claimed` IS THE RESET KEY, and that is the real safety here. Two
   characters must never mix — the isolation rule of 29/08 applies to what one
   is about to DOWNLOAD as much as to what one reads. Keying the reset on the
   claimed id makes a mixed cart impossible by construction rather than by
   remembering to clear it. */
import { useCallback, useEffect, useRef, useState } from 'react'

export function useCart(claimed: string | null) {
  const [cart, setCart] = useState<Set<string>>(new Set())
  const anchorRef = useRef<number | null>(null)

  /* Emptied on every change of character, INCLUDING on the way out (claimed
     becomes null at the entry gate). */
  useEffect(() => {
    setCart(new Set())
    anchorRef.current = null
  }, [claimed])

  /* Same gesture grammar as the Revue's own selection (`useSelection.ts`): a
     real checkbox is already a toggle, so only Shift adds a second gesture —
     the range from the anchor to here, a union and never a removal. */
  const toggle = useCallback(
    (name: string, index: number, event: { shiftKey: boolean }, order: string[]) => {
      if (event.shiftKey && anchorRef.current != null) {
        const [lo, hi] =
          anchorRef.current <= index ? [anchorRef.current, index] : [index, anchorRef.current]
        const names = order.slice(lo, hi + 1)
        setCart((prev) => new Set([...prev, ...names]))
        return
      }
      setCart((prev) => {
        const next = new Set(prev)
        if (next.has(name)) next.delete(name)
        else next.add(name)
        return next
      })
      anchorRef.current = index
    },
    [],
  )

  const remove = useCallback((name: string) => {
    setCart((prev) => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }, [])

  const addAll = useCallback((names: string[]) => {
    setCart((prev) => new Set([...prev, ...names]))
  }, [])

  const clear = useCallback(() => {
    setCart(new Set())
    anchorRef.current = null
  }, [])

  return { cart, toggle, remove, addAll, clear }
}

/* THE DOWNLOAD, FILE BY FILE (design-pass §S5). V1 adds no route: each image
   is an `<a download>` on `/img`, which already serves those bytes bound to
   the character (isolation of 29/08). A browser refuses a burst of
   programmatic downloads, so they are fired in turn with a short delay.

   It returns what did NOT go, so the caller can name the files rather than
   report a number: « 2 sur 3 » tells one that something failed and nothing
   about what to do next. */
export async function downloadAll(
  files: { name: string; href: string }[],
  delayMs = 250,
): Promise<string[]> {
  const failed: string[] = []
  for (const file of files) {
    try {
      const a = document.createElement('a')
      a.href = file.href
      a.download = file.name
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      failed.push(file.name)
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return failed
}
