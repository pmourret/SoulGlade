/* Journal du serveur — the lifecycle actions of THIS session, as the server
   log context holds them (design-pass screen-12 §S7). Lines shown as they are.

   The empty message is a CSS `::before`, not a text node: `#appliLog` stays
   empty in the DOM until a line exists, which is what the fumigation reads. */
export function ServerLog({ lines }: { lines: string[] }) {
  return (
    <section>
      <div className="mb-[18px]">
        <h1 className="m-0 text-[22px] font-[650] text-txt">Journal du serveur</h1>
        <p className="mt-[8px] mb-0 text-[13px] text-dim">
          Les actions de cycle de vie de cette session · {lines.length} ligne(s)
        </p>
      </div>
      <pre
        className="m-0 block min-h-[calc(100vh-260px)] overflow-auto whitespace-pre-wrap rounded-card
                   border border-line bg-bg p-[14px] font-code text-[12px] leading-[1.6] text-dim
                   empty:before:text-dim2
                   empty:before:content-['Aucune_action_enregistrée_dans_cette_session.']"
        id="appliLog"
      >
        {/* ServerLogContext stamps each line `HH:MM:SS · message`: the stamp
            reads quieter than the message. */}
        {lines.map((line, index) => {
          const cut = line.indexOf(' · ')
          return (
            <span key={index}>
              {index > 0 && '\n'}
              {cut > 0 ? (
                <>
                  <span className="text-dim2">{line.slice(0, cut)}</span>
                  {line.slice(cut)}
                </>
              ) : (
                line
              )}
            </span>
          )
        })}
      </pre>
    </section>
  )
}
