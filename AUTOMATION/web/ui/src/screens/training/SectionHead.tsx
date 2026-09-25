/* The heading of a report section: the name, and the rule that says how to read
   it, on ONE line. Shared by four sections and owned by none of them
   (frontend.md), so it lives in its own file.

   Two ranks, and the tag says neither: `.lab` when the heading names a group
   (the studio's one section label, `base.css`), a plain size when it names the
   thing itself. Until the bilan graphique of 25/09/2026 this file had to write
   `normal-case` to UNDO the look `base.css` put on every `h2`; that rule now
   carries the reset only. */
export function SectionHead({ title, rule, upper = true }:
                            { title: string; rule?: string; upper?: boolean }) {
  return (
    <div className="mb-[12px] flex items-baseline gap-[12px] border-b border-line pb-[7px]">
      <h2 className={`m-0 shrink-0 ${
        upper ? 'lab' : 'text-[15px] font-[650] text-txt'}`}>
        {title}
      </h2>
      {rule ? <span className="min-w-0 truncate text-[12px] text-dim2">{rule}</span> : null}
    </div>
  )
}
