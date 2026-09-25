/* Editing ONE lieu of a world's catalog (ADR-0015). Writes `WORLDS/<id>.json`
   through its own routes, never `POST /api/scenes` — and it affects every
   character composing in this world.

   SHARED BY TWO SCREENS, same reasoning as `useWorldPlaces`: the Banque's
   Monde tab (`screens/bank/BankScreen.tsx`) edits one place tied to a
   selected scene, the Mondes screen in this folder manages the whole catalog.
   Neither owns it; it lives here because it is a world concern.

   PRESENTATION ONLY, AND CONTROLLED since the design-pass screen-11: the draft
   lives in `usePlaceDraft`, above this file, because the chrome's `DirtyBar`
   carries the save on the Mondes screen (§S5.4) and a banner cannot ask a field
   below it whether it changed. The Banque keeps its own button, hence `onSave`
   being optional rather than a second copy of this form.

   THE SCOPE LINE REPLACED A ⚠ PARAGRAPH (§S5.2). The warning sign was the
   loudest thing in the column, every time, for a fact that is simply what a
   world catalog IS — not an incident. It reads as a statement now, in the same
   ink as the rest of the panel. */
import { Icon } from '../../chrome/Icon'
import { isValidId } from './slugify'
import type { PlacePatch } from './usePlaceDraft'

const FIELD = 'flex flex-col gap-[5px]'
const LABEL = 'text-[11.5px] tracking-[.3px] text-dim uppercase'
const HINT = 'text-[11.5px] text-dim2'
/* A changed field takes a `--warn` border (§S5.3) — which is a SECOND signal,
   never the only one: the row of the list carries a dot, and the banner says
   the file. Colour alone would not survive `frontend.md`. */
const CHANGED = 'border-warn!'

export function PlaceInspector({
  place,
  draft,
  worldLabel,
  saving,
  status,
  idEditable = false,
  takenIds,
  onPatch,
  onSave,
  onRemove,
  onClose,
}: {
  /** What is on disk — the comparison that lights a modified field. */
  place: PlacePatch
  draft: PlacePatch
  worldLabel: string
  saving: boolean
  status: string | null
  /* Editable only for a place just being created (ADR-0016) — never for one
     already in the catalog: renaming it would silently orphan every
     character scene whose `world_ref` points at the old id, and nothing
     here repairs that (same "the server refuses, it does not repair"
     stance as ADR-0014 §4/ADR-0015 §5). */
  idEditable?: boolean
  /** The ids already in THIS catalog, to say « déjà utilisé » before the save
      rather than after it. Only read while `idEditable`. */
  takenIds?: string[]
  onPatch: (patch: Partial<PlacePatch>) => void
  /** The Banque's own immediate save. Absent on the Mondes screen, where the
      `DirtyBar` carries it. */
  onSave?: () => void
  /** Retiring the place, from the inspector's header (§S5.1). Absent for a
      place being created, and in the Banque, which does not retire from a
      world's catalog. */
  onRemove?: () => void
  onClose: () => void
}) {
  const taken = idEditable && takenIds?.includes(draft.id.trim())
  const idProblem = !draft.id.trim()
    ? null
    : taken
      ? 'déjà utilisé'
      : isValidId(draft.id.trim())
        ? null
        : 'minuscules, chiffres, - et _'
  const changed = (key: keyof PlacePatch) => (draft[key] !== place[key] ? CHANGED : '')

  return (
    <section
      aria-label={`Lieu ${draft.label || draft.id || 'nouveau'}`}
      id="placeInspector"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      className="flex h-full min-h-0 flex-col"
    >
      <header className="flex h-[52px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]">
        <b className="min-w-0 flex-1 truncate text-[15px] font-[650]">
          {draft.label || draft.id || 'Nouveau lieu'}
        </b>
        {onRemove && (
          <button
            type="button"
            className="link flex-none text-danger-txt"
            id="btnPlaceRemove"
            onClick={onRemove}
          >
            Retirer…
          </button>
        )}
      </header>

      {/* §S5.2 — FIXED under the header, outside the scroller: it says what one
          is editing, and scrolling it away is exactly when it stops being read. */}
      <p className="m-0 flex flex-none items-start gap-[7px] border-b border-b-line px-[16px]
                    py-[9px] text-[12.5px] leading-[1.45] text-dim">
        <Icon name="worlds" className="mt-[2px] h-[13px] w-[13px] flex-none" aria-hidden="true" />
        <span>
          Partagé par <b className="font-semibold text-txt">tous les personnages</b> de «&nbsp;
          {worldLabel}&nbsp;». Le modifier change ce qu'ils héritent.
        </span>
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto p-[16px]">
        <div className="flex max-w-[720px] flex-col gap-[14px]">
          {idEditable ? (
            <div className={FIELD}>
              <label className={LABEL} htmlFor="placeId">
                Identifiant
              </label>
              <div className="flex items-center gap-[10px]">
                <input
                  id="placeId"
                  className="font-code max-w-[280px]"
                  spellCheck={false}
                  aria-describedby="placeIdNote"
                  value={draft.id}
                  onChange={(e) => onPatch({ id: e.target.value })}
                />
                {/* WRITTEN, never a lone tick (§S7): a ✓ says « something is
                    right » without ever saying WHAT, and the two failing cases
                    here are not the same problem at all. */}
                <span
                  id="placeIdNote"
                  className={`flex items-center gap-[5px] text-[11.5px] ${
                    idProblem ? 'text-warn-txt' : 'text-dim2'
                  }`}
                >
                  {draft.id.trim() && (
                    <span aria-hidden="true" className="text-[9px]">
                      {idProblem ? '◆' : '●'}
                    </span>
                  )}
                  {draft.id.trim() ? (idProblem ?? 'valide') : 'proposé depuis le nom'}
                </span>
              </div>
              <span className={HINT}>servira de world_ref aux scènes composées ici</span>
            </div>
          ) : (
            <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-[10px]">
              <span className={LABEL}>Identifiant</span>
              <span className="min-w-0">
                <code className="font-code text-[12px] leading-[normal]">{place.id}</code>
                <span className={`ml-[8px] ${HINT}`}>figé, sert de world_ref aux scènes</span>
              </span>
            </div>
          )}

          <div className={FIELD}>
            <label className={LABEL} htmlFor="placeLabel">
              Nom du lieu
            </label>
            <input
              id="placeLabel"
              className={`h-[34px] ${changed('label')}`}
              value={draft.label}
              onChange={(e) => onPatch({ label: e.target.value })}
            />
          </div>

          <div className={FIELD}>
            <label className={LABEL} htmlFor="placeIntention">
              Intention
            </label>
            <input
              id="placeIntention"
              className={`h-[34px] ${changed('intention')}`}
              value={draft.intention}
              onChange={(e) => onPatch({ intention: e.target.value })}
            />
            <span className={HINT}>sert aussi de dossier d'export</span>
          </div>

          <div className={FIELD}>
            <label className={LABEL} htmlFor="placePrompt">
              Prompt du lieu
            </label>
            <textarea
              id="placePrompt"
              className={`min-h-[110px] resize-y ${changed('prompt')}`}
              value={draft.prompt}
              onChange={(e) => onPatch({ prompt: e.target.value })}
            />
            <span className={HINT}>
              Décor, cadrage, lumière. Jamais le visage, jamais la tenue : c'est un cadre, pas
              une garde-robe.
            </span>
          </div>

          {/* The server's own sentence, under the fields it is about — and it
              is not always a refusal (the Banque says what a save propagated),
              so it is announced rather than alarmed, and ink alone never tells
              the two apart. */}
          {status && (
            <p className="m-0 text-[12px] text-dim" role="status">
              {status}
            </p>
          )}

          {onSave && (
            <div className="flex items-center gap-[10px]">
              <button
                className="btn primary sm"
                disabled={saving || !draft.prompt.trim() || (idEditable && !draft.id.trim())}
                onClick={onSave}
              >
                Enregistrer le lieu
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
