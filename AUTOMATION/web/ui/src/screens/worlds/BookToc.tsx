/* The table of contents of a world's book (design-pass 19 §S3, §S6): five
   questions, each with its count, the visible chapter marked. A column of
   240 px, and under 1100 px a row of pills stuck to the top of the book — the
   same five entries, never a hidden list.

   Presentation only. Links are real anchors (a middle click still says where
   they go), but a click scrolls the book by hand: the screen owns the
   scrolling, and the hash would push a history entry per chapter. */
import { CHAPTERS, type Chapter } from './bookChapters'

export function BookToc({
  counts,
  current,
  onGo,
  pills = false,
}: {
  counts: Record<Chapter, number>
  current: Chapter
  onGo: (chapter: Chapter) => void
  pills?: boolean
}) {
  if (pills) {
    return (
      <nav
        aria-label="Sommaire du monde"
        className="sticky top-0 z-[2] hidden gap-[6px] overflow-x-auto border-b border-b-line bg-bg px-[16px] py-[8px]
                   max-[1100px]:flex"
      >
        {CHAPTERS.map((c) => (
          <a
            key={c.id}
            href={`#${c.block}`}
            aria-current={current === c.id ? 'true' : undefined}
            onClick={(e) => {
              e.preventDefault()
              onGo(c.id)
            }}
            className={`flex flex-none items-baseline gap-[6px] rounded-[6px] border px-[10px] py-[4px] text-[12.5px]
                        no-underline ${current === c.id ? 'border-acc bg-panel3 text-txt' : 'border-line2 text-dim hover:text-txt'}`}
          >
            {c.question} <span className="font-code text-[11.5px] text-dim2">{counts[c.id]}</span>
          </a>
        ))}
      </nav>
    )
  }
  return (
    <nav aria-label="Sommaire du monde" className="flex flex-col py-[12px]">
      <p className="lab m-0 px-[14px] pb-[8px]">Sommaire</p>
      {CHAPTERS.map((c) => (
        <a
          key={c.id}
          href={`#${c.block}`}
          aria-current={current === c.id ? 'true' : undefined}
          onClick={(e) => {
            e.preventDefault()
            onGo(c.id)
          }}
          className={`flex items-baseline gap-[8px] px-[14px] py-[7px] no-underline hover:bg-panel
                      focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]
                      ${current === c.id ? 'bg-panel3 [box-shadow:inset_2px_0_0_var(--acc)]' : ''}`}
        >
          <span className="text-[13px] font-medium text-txt">{c.question}</span>
          {/* --dim on the current row: --dim2 on --panel3 measured 4.27:1. */}
          <span className={`min-w-0 flex-1 truncate text-[12px] ${current === c.id ? 'text-dim' : 'text-dim2'}`}>{c.name}</span>
          <span className={`font-code flex-none text-[12px] ${current === c.id ? 'text-dim' : 'text-dim2'}`}>{counts[c.id]}</span>
        </a>
      ))}
    </nav>
  )
}
