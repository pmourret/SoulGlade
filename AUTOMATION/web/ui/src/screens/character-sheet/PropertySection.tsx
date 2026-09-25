/* One section of the sheet's property panel: a title, the RULE that governs
   what it lists, and the rows themselves. Presentation only — it receives what
   it shows and never calls the API.

   THE RULE IS PART OF THE SECTION, not a footnote under it. « figée à la
   création », « déduit du type et du style », « se règle dans Application » are
   what turn a list of values into an explanation of why they are what they are,
   and why some of them cannot be changed here. The previous sheet printed them
   as a grey sentence AFTER the card, where they read as an afterthought.

   `<section>` + `<h2>` + `<dl>`: the properties of a thing are a description
   list, and a screen reader gets the term/value pairing for free. */
import type { ReactNode } from 'react'

export function PropertySection({
  title,
  rule,
  children,
}: {
  title: string
  rule: string
  children: ReactNode
}) {
  return (
    <section className="mb-[26px]">
      <div className="flex flex-wrap items-baseline gap-x-[12px] gap-y-[2px]
                      border-b border-line2 pb-[7px]">
        <h2 className="lab m-0">
          {title}
        </h2>
        <span className="text-[12px] text-dim2">{rule}</span>
      </div>
      <dl className="m-0">{children}</dl>
    </section>
  )
}

/* One row. The action link lives INSIDE the <dd>, pushed right — not as a third
   grid column. A <dl> may only contain dt/dd (or <div> wrappers grouping
   them), so an <a> as their sibling would be invalid markup for a layout the
   <dd> can carry itself. */
export function PropertyRow({
  term,
  children,
  action,
}: {
  term: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="grid grid-cols-[190px_minmax(0,1fr)] items-baseline gap-[16px]
                    border-b border-line py-[11px] last:border-b-0
                    max-[900px]:grid-cols-1 max-[900px]:gap-[3px]">
      <dt className="text-[13px] text-dim">{term}</dt>
      <dd className="m-0 flex flex-wrap items-baseline justify-between gap-x-[16px]
                     gap-y-[4px] text-[14px] text-txt">
        <span className="min-w-0">{children}</span>
        {action}
      </dd>
    </div>
  )
}

/* A dot or a diamond, plus words. Status is never carried by colour alone
   (.claude/rules/frontend.md): the shape separates good from bad for anyone who
   does not see the hue, and the label says it outright for everyone. */
export function StatusDot({ tone }: { tone: 'ok' | 'bad' | 'warn' | 'none' }) {
  const paint =
    tone === 'ok' ? 'bg-ok' : tone === 'bad' ? 'bg-bad' : tone === 'warn' ? 'bg-warn' : 'bg-dim2'
  const shape = tone === 'bad' ? 'rotate-45' : 'rounded-full'
  return (
    <span
      className={`mr-[7px] inline-block h-[7px] w-[7px] flex-none align-baseline ${paint} ${shape}`}
      aria-hidden="true"
    />
  )
}
