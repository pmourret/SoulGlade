/* A screen's own unsaved work, handed to the chrome's banner.

   `DirtyBar` used to know exactly one pending file — `scenes.json`, read
   straight from `useScenes`. The tones workshop (design-pass screen-8 §S2)
   owes the same banner to `creative.json`, and the screens still to come in
   IT-9 will owe it to their own files. Rather than teach the chrome about each
   one, a screen DECLARES what it has pending and the chrome draws it.

   ONE VALUE, not a list: two screens are never mounted at once. What can
   coexist is this and the scenes banner, and that is honest — two files, two
   sentences, two buttons.

   The caller memoizes what it registers (`useMemo` over the label and the two
   callbacks). Handing a fresh object every render would set state on every
   render, which is a render loop, not a subtle inefficiency. */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type PendingSave = {
  /** The bold line: WHAT is pending. */
  title: string
  /** One sentence: which file, and what not saving costs. */
  body: ReactNode
  /** Says the act, never « Enregistrer » alone when the file is not obvious. */
  saveLabel: string
  onSave: () => void | Promise<void>
  onRevert: () => void | Promise<void>
}

const ValueCtx = createContext<PendingSave | null>(null)
const SetCtx = createContext<((value: PendingSave | null) => void) | null>(null)

export function PendingSaveProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingSave | null>(null)
  const set = useCallback((value: PendingSave | null) => setPending(value), [])
  return (
    <SetCtx.Provider value={set}>
      <ValueCtx.Provider value={pending}>{children}</ValueCtx.Provider>
    </SetCtx.Provider>
  )
}

/** Read by the chrome's banner. */
export function usePendingSave(): PendingSave | null {
  return useContext(ValueCtx)
}

/** Declared by a screen. `null` clears it, and so does unmounting — a screen
    that navigates away never leaves a banner offering to save something that
    is no longer on screen. */
export function useRegisterPendingSave(value: PendingSave | null) {
  const set = useContext(SetCtx)
  useEffect(() => {
    if (!set) return
    set(value)
    return () => set(null)
  }, [set, value])
}
