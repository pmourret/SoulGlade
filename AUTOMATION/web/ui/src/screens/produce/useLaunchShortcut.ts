/* `Ctrl+Entrée` launches — design-pass screen-3b, §A.

   IT READS `runDisabled`, IT NEVER RECOMPUTES IT. That is the whole point of
   AUDIT §5.6 trap 3: the legacy screen had two writers for the button's
   disabled state (the 1.5 s production tick and refreshPlan) and they
   disagreed. A shortcut that decided for itself whether a launch is possible
   would be a third. It takes the single expression as an argument.

   THREE GUARDS, ALL ABOUT NOT STEALING A KEYSTROKE:
     - a `textarea` gets Enter for its own newline, and this screen has three
       (edit instruction, scene amendment, the four fragment fields). With
       Ctrl held the keystroke is unambiguous, so the field keeps only the
       bare Enter;
     - `body.editing` marks the photo editor open over any screen
       (review/PhotoEditor.tsx), and `review/useReviewKeys.ts` already reads
       the same flag for the same reason;
     - a native `<dialog>` open means a tier confirmation is being answered. */
import { useEffect } from 'react'

export function useLaunchShortcut(runDisabled: boolean, launch: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return
      if (runDisabled) return
      if (document.body.classList.contains('editing')) return
      if (document.querySelector('dialog[open]')) return
      event.preventDefault()
      launch()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [runDisabled, launch])
}
