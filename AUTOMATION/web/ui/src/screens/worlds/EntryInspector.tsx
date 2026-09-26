/* Editing ONE place, intention or scene of a world (ADR-0027) — the third
   column of Référentiel › Mondes. It replaces `PlaceInspector`: the three
   catalogs share the frame (header, scope line, frozen identity) and differ by
   their fields, which the spec lists (`catalogSpecs.ts`).

   PRESENTATION ONLY, AND CONTROLLED: the draft lives in `useCatalogueEditor`,
   because the chrome's `DirtyBar` carries the save (§S5.4).

   THE IDENTITY FREEZES AT CREATION. It is written into scenes, character banks,
   the base and export folders; renaming it would orphan all of them, and
   nothing here repairs that. While creating, it follows the name until typed
   by hand — the proposal the world and tone ids already get (`slugify.ts`). */
import { Icon } from '../../chrome/Icon'
import { selectOptions, type CatalogContext, type CatalogSpec, type Draft } from './catalogSpecs'

const FIELD = 'flex flex-col gap-[5px]'
const LABEL = 'lab'
const HINT = 'text-[11.5px] text-dim2'
/* A changed field takes a `--warn` border (§S5.3) — a SECOND signal, never the
   only one: the row of the list carries a dot, and the banner names the file. */
const CHANGED = 'border-warn!'

export function EntryInspector<T>({
  spec,
  draft,
  saved,
  context,
  worldLabel,
  status,
  creating,
  takenIds,
  preview,
  onPatch,
  onRemove,
  onClose,
}: {
  spec: CatalogSpec<T>
  draft: Draft
  /** What is on disk — the comparison that lights a modified field. */
  saved: Draft
  context: CatalogContext
  worldLabel: string
  status: string | null
  creating: boolean
  /** Identities already in this catalog, to say « déjà utilisé » before the save. */
  takenIds: string[]
  /** The prompt a scene composes with its place, when the spec has one. */
  preview?: string
  onPatch: (patch: Draft) => void
  /** Absent while creating: there is nothing on disk to retire yet. */
  onRemove?: () => void
  onClose: () => void
}) {
  const idKey = spec.idKey
  const id = (draft[idKey] ?? '').trim()
  const idProblem = !id
    ? null
    : takenIds.includes(id)
      ? 'déjà utilisé'
      : spec.idRule.test(id)
        ? null
        : spec.idRuleText
  const changed = (name: string) => (draft[name] !== saved[name] ? CHANGED : '')
  const inputId = (name: string) => `entry-${name}`

  const onLabel = (label: string) => {
    const follows = creating && (!draft[idKey] || draft[idKey] === spec.propose(draft.label ?? ''))
    onPatch(follows ? { label, [idKey]: spec.propose(label) } : { label })
  }

  return (
    <section
      aria-label={`${spec.noun} ${draft.label || id || 'nouveau'}`}
      id="entryInspector"
      data-entry={spec.noun}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      className="flex h-full min-h-0 flex-col"
    >
      <header className="flex h-[52px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]">
        <b className="min-w-0 flex-1 truncate text-[15px] font-[650]">{draft.label || id || spec.titleNew}</b>
        {onRemove && (
          <button type="button" className="link flex-none text-danger-txt" id="btnEntryRemove" onClick={onRemove}>
            Retirer…
          </button>
        )}
      </header>

      {/* §S5.2 — fixed under the header: it says what one is editing, and
          scrolling it away is exactly when it stops being read. */}
      <p className="m-0 flex flex-none items-start gap-[7px] border-b border-b-line px-[16px]
                    py-[9px] text-[12.5px] leading-[1.45] text-dim">
        <Icon name="worlds" className="mt-[2px] h-[13px] w-[13px] flex-none" aria-hidden="true" />
        <span>
          Partagé par <b className="font-semibold text-txt">tous les personnages</b> de «&nbsp;{worldLabel}
          &nbsp;». Toute modification change ce qu'ils reçoivent.
        </span>
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto p-[16px]">
        <div className="flex max-w-[720px] flex-col gap-[14px]">
          {spec.fields.map((field) => {
            const value = draft[field.name] ?? ''
            const hintId = field.hint ? `${inputId(field.name)}-hint` : undefined
            const control =
              field.kind === 'textarea' ? (
                <textarea
                  id={inputId(field.name)}
                  className={`min-h-[96px] resize-y ${changed(field.name)}`}
                  aria-describedby={hintId}
                  value={value}
                  onChange={(e) => onPatch({ [field.name]: e.target.value })}
                />
              ) : field.kind === 'select' ? (
                <select
                  id={inputId(field.name)}
                  className={`!w-auto max-w-[360px] ${changed(field.name)}`}
                  aria-describedby={hintId}
                  value={value}
                  onChange={(e) => onPatch({ [field.name]: e.target.value })}
                >
                  {selectOptions(field, context, value).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : field.kind === 'level' ? (
                <input
                  id={inputId(field.name)}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className={`h-[34px] max-w-[120px] ${changed(field.name)}`}
                  aria-describedby={hintId}
                  value={value}
                  placeholder="aucun"
                  onChange={(e) => onPatch({ [field.name]: e.target.value })}
                />
              ) : (
                <input
                  id={inputId(field.name)}
                  autoFocus={creating && field.name === 'label'}
                  className={`h-[34px] ${field.name === 'icon' ? 'max-w-[80px]' : ''} ${changed(field.name)}`}
                  aria-describedby={hintId}
                  value={value}
                  onChange={(e) =>
                    field.name === 'label' ? onLabel(e.target.value) : onPatch({ [field.name]: e.target.value })
                  }
                />
              )
            return (
              <div key={field.name} className={FIELD}>
                <label className={LABEL} htmlFor={inputId(field.name)}>
                  {field.label}
                </label>
                {control}
                {field.hint && (
                  <span className={HINT} id={hintId}>
                    {field.hint}
                  </span>
                )}
                {/* The identity sits right under the name it is proposed from. */}
                {field.name === 'label' && (
                  <IdentityRow
                    spec={spec}
                    creating={creating}
                    value={draft[idKey] ?? ''}
                    frozen={saved[idKey] ?? ''}
                    problem={idProblem}
                    onChange={(v) => onPatch({ [idKey]: v })}
                  />
                )}
              </div>
            )
          })}

          {preview !== undefined && (
            <div className={FIELD}>
              <span className={LABEL}>Prompt composé</span>
              <p className="m-0 rounded-[6px] border border-line bg-panel px-[10px] py-[8px] text-[12.5px] text-dim"
                 id="entryPreview">
                {preview || '—'}
              </p>
              <span className={HINT}>
                Ce que reçoit le modèle pour cette scène, avant l'ancre, la tenue et les fragments du personnage.
              </span>
            </div>
          )}

          {/* The server's own sentence, under the fields it is about. */}
          {status && (
            <p className="m-0 text-[12px] text-dim" role="status" id="entryStatus">
              {status}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function IdentityRow<T>({
  spec,
  creating,
  value,
  frozen,
  problem,
  onChange,
}: {
  spec: CatalogSpec<T>
  creating: boolean
  value: string
  frozen: string
  problem: string | null
  onChange: (value: string) => void
}) {
  if (!creating) {
    return (
      <span className="mt-[4px] block">
        <span className={LABEL}>{spec.idLabel}</span>{' '}
        <code className="font-code text-[12px] leading-[normal]" id="entryId">
          {frozen}
        </code>
        <span className={`ml-[8px] ${HINT}`}>{spec.idFrozenHint}</span>
      </span>
    )
  }
  const trimmed = value.trim()
  return (
    <div className="mt-[6px] flex flex-col gap-[5px]">
      <label className={LABEL} htmlFor="entryIdInput">
        {spec.idLabel}
      </label>
      <div className="flex items-center gap-[10px]">
        <input
          id="entryIdInput"
          className="font-code max-w-[280px]"
          spellCheck={false}
          aria-describedby="entryIdNote"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {/* WRITTEN, never a lone tick (§S7): the two failing cases are not the
            same problem at all. */}
        <span
          id="entryIdNote"
          className={`flex items-center gap-[5px] text-[11.5px] ${problem ? 'text-warn-txt' : 'text-dim2'}`}
        >
          {trimmed && (
            <span aria-hidden="true" className="text-[9px]">
              {problem ? '◆' : '●'}
            </span>
          )}
          {trimmed ? (problem ?? 'valide') : 'proposé depuis le nom'}
        </span>
      </div>
      <span className={HINT}>figé une fois créé : {spec.idFrozenHint.replace(/^figée?, /, '')}</span>
    </div>
  )
}
