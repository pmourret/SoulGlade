/* The world of the bank, in read-only — one LINE of the workshop bar since
   the three-panel pass (design pass screen-7b §S2). It was a bordered card of
   its own under the toolbar, which cost a band of screen to say two facts
   that never change during a session.

   A scene is a composition INSIDE a world (ADR-0014). The world is frozen at
   the character's creation, like its type and its output style — no screen
   edits a sheet, and none exists to. This line says which world one is
   composing in, so the rule is visible BEFORE the server has to refuse
   something, and how many scenes the bank holds.

   IT ALSO SAYS WHEN THE FILE AND THE SHEET DISAGREE. Two cases, both real: a
   bank predating ADR-0014 carries no stamp at all, and a document pasted from
   another character carries a foreign one. Either way the next save comes back
   as a 400, and a banner that named neither would leave that refusal
   unexplained — this stays, it is a safety signal, not decoration. It is no
   longer a word inside the line, though: a refusal to come deserves its own
   band under the bar, in the `--warn` family, which is what the studio uses
   everywhere else for "something is pending against you". */

/** The drift sentence, or null when the document and the sheet agree.
    Exported so the bar can put the band UNDER itself rather than inside a
    line that must stay one line high. */
export function worldDrift(
  world: { id: string; label: string } | null,
  documentWorld: string | null,
): string | null {
  if (!world) return null
  if (documentWorld == null)
    return (
      'cet atelier ne porte pas encore son monde — le prochain enregistrement sera refusé ' +
      'tant que la migration n’est pas passée'
    )
  if (documentWorld !== world.id)
    return (
      `cet atelier est estampillé « ${documentWorld} » : il n’appartient pas à ce ` +
      'personnage, l’enregistrement la refusera'
    )
  return null
}

export function WorldBanner({
  world,
  sceneCount,
}: {
  world: { id: string; label: string } | null
  sceneCount: number
}) {
  return (
    <div id="worldBanner" className="flex min-w-0 items-baseline gap-[5px] text-[12.5px] text-dim2">
      {/* The sheet has not landed yet — say nothing about the world rather
          than say « aucun ». The count is the bank's own and stands alone. */}
      {world && (
        <>
          <span>Monde</span>
          <b className="truncate text-txt" data-world={world.id}>
            {world.label}
          </b>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span id="nScenes" className="whitespace-nowrap">
        {sceneCount} scène{sceneCount > 1 ? 's' : ''}
      </span>
    </div>
  )
}

/** The band under the workshop bar — rendered only when `worldDrift` says so. */
export function WorldDriftBand({ drift }: { drift: string }) {
  return (
    /* Never colour alone: the sentence carries the whole message, the warning
       tone only makes it findable. */
    <div
      className="flex-none border-b border-b-warn-line bg-warn-bg px-[16px] py-[7px]
                 text-[12px] text-warn-txt"
      data-world-drift
    >
      <span aria-hidden="true">⚠ </span>
      {drift}
    </div>
  )
}
