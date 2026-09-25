/* "Historique" tab — design-pass §7b: "liste des actions structurantes
   (ajout/suppression de calque, préréglage appliqué), clic = retour à cet
   état". A FILTERED view of the full undo/redo array (coalesced slider
   drags still step through with Ctrl+Z, they just never get their own row
   here) — see usePhotoEditorAdvanced.ts's own note on `structural`.

   Restyled by screen-10 §S3: 30 px rows, the current one on `--panel3` in
   600, and everything PAST the cursor dimmed — those are the steps a redo
   would walk back into, and they must not read as still standing.

   Presentational only (frontend.md): each row's real index is what
   `onJump` receives, so a click lands on the exact entry shown. */
type HistoryEntry = { label: string; structural: boolean }

export function HistoryPanel({
  history, cursor, onJump,
}: {
  history: readonly HistoryEntry[]
  cursor: number
  onJump: (index: number) => void
}) {
  return (
    <ul className="m-0 flex list-none flex-col p-0" data-history>
      {history.map((entry, index) =>
        entry.structural ? (
          <li key={index}>
            <button
              aria-current={index === cursor}
              className={`flex h-[30px] w-full cursor-pointer items-center truncate rounded-[4px]
                          border-0 px-[8px] text-left text-[12.5px] ${
                            index === cursor
                              ? 'bg-panel3 font-[600] text-txt'
                              : index > cursor
                                ? 'bg-transparent text-dim2'
                                : 'bg-transparent text-dim hover:bg-panel2'
                          }`}
              onClick={() => onJump(index)}
              type="button"
            >
              {entry.label}
            </button>
          </li>
        ) : null,
      )}
    </ul>
  )
}
