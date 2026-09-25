/* The bottom bar (design-pass screen-14 §S9): what is missing on the left,
   Back and Next / Create on the right. Part of the grid, not a fixed layer
   laid over the content. Presentation only — the gating is `missingFor.ts`. */
export function WizardFooter({
  missing,
  last,
  name,
  canGoBack,
  canGoOn,
  creating,
  onBack,
  onNext,
}: {
  missing: string | null
  last: boolean
  name: string
  canGoBack: boolean
  canGoOn: boolean
  creating: boolean
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="flex h-[60px] flex-none items-center gap-[10px] border-t border-line bg-panel px-[20px]">
      <p className="m-0 min-w-0 flex-1 truncate text-[12.5px] text-dim" id="wizMissing" aria-live="polite">
        {missing ? (
          `Il manque : ${missing}`
        ) : last ? (
          <span className="inline-flex items-center gap-[7px]">
            <i className="h-[7px] w-[7px] rounded-full bg-ok" aria-hidden="true" />
            Tout est prêt
          </span>
        ) : null}
      </p>
      <button type="button" className="btn" id="wizBack" disabled={!canGoBack} onClick={onBack}>
        Retour
      </button>
      <button type="button" className="btn primary" id="wizNext" disabled={!canGoOn || creating} onClick={onNext}>
        {creating ? 'Création…' : last ? (name.trim() ? `Créer ${name.trim()}` : 'Créer le personnage') : 'Suivant'}
      </button>
    </div>
  )
}
