/* The heading of a report section: the name, and the rule that says how to read
   it, on ONE line. Shared by four sections and owned by none of them
   (frontend.md), so it lives in its own file.

   `normal-case` is not decorative: `base.css` sets `text-transform:uppercase`
   on every `h2`, and no utility class resets it — a Tailwind class and a bare
   element selector have the same specificity, but only the class that exists
   wins. The sections that ARE uppercase say so; the ones that are not have to
   say that too. */
export function SectionHead({ title, rule, upper = true }:
                            { title: string; rule?: string; upper?: boolean }) {
  return (
    <div className="mb-[12px] flex items-baseline gap-[12px] border-b border-line pb-[7px]">
      <h2 className={`m-0 shrink-0 font-normal tracking-[.5px] text-dim ${
        upper ? 'text-[10.5px] uppercase' : 'text-[15px] font-[650] normal-case text-txt'}`}>
        {title}
      </h2>
      {rule ? <span className="min-w-0 truncate text-[12px] text-dim2">{rule}</span> : null}
    </div>
  )
}
