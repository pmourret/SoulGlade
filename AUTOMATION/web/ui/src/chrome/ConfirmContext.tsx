/* Confirmation, rendered as a promise. Ported from `static/modal.js`.

   WHY NOT `confirm()`. A native box shows neither formatting nor consequence —
   and consequence is precisely what these gestures have to explain: stopping the
   dashboard, cutting ComfyUI (which Windows cannot do gracefully), unloading the
   VRAM. Every one of them says what it does BEFORE doing it.

   `await confirm({...})` gives true or false. Escape and a backdrop click
   resolve false, like the cancel button.

   A THIRD ISSUE, when the question has one. Leaving a tone with a pending range
   (design-pass screen-8 §S1) is not a yes/no: saving and discarding are two
   different acts, and cancelling is a third. `alt` adds that middle button and
   resolves `'alt'`; a request without it keeps the plain boolean it always had,
   which is why no existing caller changes. */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { Dialog } from './Dialog'

/** `true` = the confirming button, `'alt'` = the middle one when `alt` is set,
    `false` = cancel, Escape, or the backdrop. */
export type ConfirmOutcome = boolean | 'alt'

export type ConfirmRequest = {
  title: string
  /** The body, as JSX: it explains the consequence, so it is rarely one line. */
  body: ReactNode
  /** Label of the confirming button. Says the ACT, never « OK ». */
  button?: string
  /** Label of a SECOND act, resolving `'alt'` — set only when the question has
      three honest issues, never to offer a variant of the same yes. */
  alt?: string
  /** A destructive act: the box opens with « annuler » focused, so Enter on
      arrival cannot be the deletion (design pass screen-7b §A). The safe
      default stays the confirming button for everything else — those are
      questions one came to answer yes to. */
  danger?: boolean
}

/* OVERLOADED so the third issue costs nothing to the callers that do not want
   one: a request carrying `alt` is answered with `boolean | 'alt'`, a request
   without it keeps the plain `Promise<boolean>` every existing call site is
   already typed against. Widening the single signature instead broke three
   unrelated screens that declare `Promise<boolean>` in their own props, for a
   value they can never receive. */
export type Confirm = {
  (request: ConfirmRequest & { alt: string }): Promise<ConfirmOutcome>
  (request: ConfirmRequest): Promise<boolean>
}

type Pending = ConfirmRequest & { resolve: (value: ConfirmOutcome) => void }

const Ctx = createContext<Confirm | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const pendingRef = useRef<Pending | null>(null)
  pendingRef.current = pending

  const confirm = useCallback(
    (request: ConfirmRequest) =>
      new Promise<ConfirmOutcome>((resolve) => {
        setPending({ ...request, resolve })
      }),
    [],
  )

  /* Settles ONCE. Escape then a click on the backdrop, or a double click on the
     confirm button, would otherwise resolve the same promise twice — harmless
     for the promise, but it would run the action twice on the second settle
     path if a caller re-armed it. */
  const settle = useCallback((value: ConfirmOutcome) => {
    const current = pendingRef.current
    if (!current) return
    pendingRef.current = null
    setPending(null)
    current.resolve(value)
  }, [])

  /* The one cast: the implementation always returns `ConfirmOutcome`, and the
     `Promise<boolean>` overload is only reachable for a request with no `alt`,
     where `'alt'` cannot be produced. */
  const value = useMemo(() => confirm as Confirm, [confirm])

  return (
    <Ctx.Provider value={value}>
      {children}
      <Dialog
        id="armBox"
        /* `alertdialog`, not the implicit `dialog` of the element: this box
           always interrupts to state a consequence, and the role is what makes
           a screen reader read the BODY on open rather than only the title. */
        role="alertdialog"
        open={pending !== null}
        onDismiss={() => settle(false)}
        initialFocus={pending?.danger ? '#cfNon' : '#cfOui'}
      >
        {pending && (
          <div
            /* <dialog> does not make Enter mean « confirm » without a <form>:
               wired by hand, except when the focus already carries an action
               (button, link, multi-line field). */
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              if ((event.target as HTMLElement).closest('button,a,textarea')) return
              settle(true)
            }}
          >
            <h3>{pending.title}</h3>
            {pending.body}
            <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* `primary` even for a destructive act, as the legacy confirm
                  did: the box already SAYS the consequence, and the button is
                  the action one came for. A CSS pass comes after the migration;
                  the styling choice belongs there, not here. */}
              <button className="btn primary" id="cfOui" onClick={() => settle(true)}>
                {pending.button ?? 'Confirmer'}
              </button>
              {pending.alt && (
                <button className="btn" id="cfAlt" onClick={() => settle('alt')}>
                  {pending.alt}
                </button>
              )}
              <button className="link" id="cfNon" onClick={() => settle(false)}>
                annuler
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </Ctx.Provider>
  )
}

export function useConfirm(): Confirm {
  const value = useContext(Ctx)
  if (!value) throw new Error('useConfirm hors de ConfirmProvider')
  return value
}
