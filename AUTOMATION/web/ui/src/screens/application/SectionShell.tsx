/* The shared model of an Application section (design-pass screen-12 §S4):
   a header that says WHO is concerned, the current actions as ruled rows, and
   the stop apart, below them.

   Presentation only: every button receives its callback. The stop block is
   an outline in the danger text colour on its own dark plate — never a full
   red button, which would make « stop » the loudest thing on the screen. */
import { useId, type ReactNode } from 'react'

import { StatusPill, type Tone } from './StatusPill'

export function SectionHeader({
  title,
  state,
  scope,
  stateId,
}: {
  title: string
  state?: { tone: Tone; text: string }
  /** The sentence that says who the setting applies to. */
  scope: ReactNode
  stateId?: string
}) {
  return (
    <div className="mb-[24px]">
      <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px]">
        <h1 className="m-0 text-[22px] font-[650] text-txt">{title}</h1>
        {state && (
          <span className="rounded-[4px] border border-line2 px-[8px] py-[3px] text-[11.5px]">
            <StatusPill tone={state.tone} id={stateId}>
              {state.text}
            </StatusPill>
          </span>
        )}
      </div>
      <p className="mt-[8px] mb-0 text-[13px] text-dim">{scope}</p>
    </div>
  )
}

export function SubTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="lab mt-[28px] mb-[10px]">
      {children}
    </h2>
  )
}

/* A block of action rows, ruled by 1 px lines. */
export function ActionRows({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-line2 rounded-card border border-line2">{children}</div>
  )
}

export function ActionRow({
  title,
  consequence,
  button,
  unavailable,
}: {
  title: string
  consequence: ReactNode
  /** The button, rendered by the caller (it owns its id and its handler). It
      receives the id of the written reason, to wire `aria-describedby`. */
  button: (describedBy: string | undefined) => ReactNode
  /** Why the action is unavailable, written under the sentence — a greyed
      button that does not say why is still an invitation. */
  unavailable?: string
}) {
  const reasonId = useId()
  return (
    <div className="flex items-center gap-[20px] px-[16px] py-[14px]">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-txt">{title}</div>
        <p className="mt-[3px] mb-0 text-[12.5px] text-dim">{consequence}</p>
        {unavailable && (
          <p className="mt-[4px] mb-0 text-[12px] text-dim2" id={reasonId}>
            Indisponible : {unavailable}.
          </p>
        )}
      </div>
      <div className="flex-none">{button(unavailable ? reasonId : undefined)}</div>
    </div>
  )
}

export function StopBlock({
  consequence,
  button,
}: {
  consequence: ReactNode
  button: ReactNode
}) {
  return (
    <>
      <SubTitle>Arrêt</SubTitle>
      <div className="flex items-center gap-[20px] rounded-card border border-danger-line bg-danger-bg px-[16px] py-[14px]">
        <p className="m-0 min-w-0 flex-1 text-[12.5px] text-dim">{consequence}</p>
        <div className="flex-none">{button}</div>
      </div>
    </>
  )
}
