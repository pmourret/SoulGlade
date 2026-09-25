/* A state in word + shape + colour (design-pass screen-12 §S3, §S7) — never
   the colour alone (.claude/rules/frontend.md). One shape per meaning, the
   same in the nav, the section headers and the journal: dot = fine, square =
   to look at, diamond = wrong. */
export type Tone = 'ok' | 'warn' | 'bad' | 'none'

const PAINT: Record<Tone, string> = {
  ok: 'bg-ok rounded-full',
  warn: 'bg-warn',
  bad: 'bg-bad rotate-45',
  none: 'bg-dim2 rounded-full',
}

export function StatusMark({ tone }: { tone: Tone }) {
  return <i aria-hidden="true" className={`inline-block h-[7px] w-[7px] flex-none ${PAINT[tone]}`} />
}

/* The words' own colour: « activé » reads in the warn text colour, a neutral
   state in dim — the header pill and the nav state share it. */
const TEXT: Record<Tone, string> = {
  ok: 'text-dim',
  warn: 'text-warn-txt',
  bad: 'text-danger-txt',
  none: 'text-dim2',
}

export function StatusPill({
  tone,
  children,
  id,
  mark = true,
}: {
  tone: Tone
  children: React.ReactNode
  id?: string
  mark?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-[6px] ${TEXT[tone]}`} id={id}>
      {mark && <StatusMark tone={tone} />}
      {children}
    </span>
  )
}
