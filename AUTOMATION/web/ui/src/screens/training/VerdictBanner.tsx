/* The verdict, at the head of the report. Pure presentation.

   THE WORD CARRIES THE STATUS. The shape and the colour only repeat it
   (frontend.md, WCAG 2.2 AA): « Pas de proposition d'entraînement » is legible
   with the banner rendered in grey, which is how it reads to anyone who does
   not separate the two ambers.

   `blocage` is printed exactly as the server wrote it. It is the sentence that
   says WHAT is missing, and rewriting it here would be a second copy of a rule
   that lives in `entrainement.py`. */
type Props = {
  ready: boolean
  /** The server's own sentence. Empty when nothing blocks. */
  blocking: string
  /** One line computed from the response — see `trainingSummary.ts`. */
  summary: string
}

export function VerdictBanner({ ready, blocking, summary }: Props) {
  return (
    <div
      className={`mb-[18px] rounded-[var(--r)] border p-[13px_15px] ${
        ready ? 'border-ok-line bg-ok-bg' : 'border-warn-line bg-warn-bg'}`}
      id="trainVerdict"
      role="status"
    >
      <b className="flex items-center gap-[8px] text-[15px] font-[650] text-txt">
        <span aria-hidden="true" style={{ color: ready ? 'var(--ok)' : 'var(--warn)' }}>
          {ready ? '●' : '◆'}
        </span>
        {ready
          ? 'Proposition d’entraînement prête'
          : 'Pas de proposition d’entraînement'}
      </b>
      {blocking ? (
        <p className={`m-0 mt-[6px] text-[12.5px] ${
          ready ? 'text-dim' : 'text-warn-txt'}`}>
          {blocking}
        </p>
      ) : null}
      <p className="m-0 mt-[6px] text-[12.5px] text-dim">{summary}</p>
    </div>
  )
}
