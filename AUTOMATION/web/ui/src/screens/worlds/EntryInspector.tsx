/* Editing ONE place, intention or scene of a world (ADR-0027) — the inspector
   of Référentiel › Mondes. The three catalogs share the frame (head, scope
   line, the foot with the identity and « Retirer ») and differ by their
   fields, which the spec lists (`catalogSpecs.ts`).

   PRESENTATION ONLY, AND CONTROLLED: the draft lives in `useCatalogueEditor`,
   because the chrome's `DirtyBar` carries the save (§S5.4 of screen-11).

   A SCENE OPENS ON ITS SENTENCE (design-pass 19 §S5): « {Intention} au
   {Lieu} », the two selects of `SCENE_SPEC` drawn as pills, because that pair
   IS what a scene is; what happens there comes after.

   « RETIRER » SAYS WHY IT CANNOT (§S5): a place or an intention a scene uses
   does not leave the world (`services/worlds.py`). The button is disabled and
   the scenes are named under it, rather than a click answered by a refusal.

   THE IDENTITY FREEZES AT CREATION. It is written into scenes, character banks,
   the base and export folders; renaming it would orphan all of them, and
   nothing here repairs that. While creating, it follows the name until typed
   by hand — the proposal the world and tone ids already get (`slugify.ts`). */
import type { Enhancer } from '../../api/useEnhance'
import { EnhanceField } from '../../chrome/EnhanceField'
import { Icon } from '../../chrome/Icon'
import { selectOptions, type CatalogContext, type CatalogSpec, type Draft, type FieldSpec } from './catalogSpecs'

const FIELD = 'flex flex-col gap-[5px]'
const LABEL = 'lab'
const HINT = 'text-[11.5px] text-dim2'
/* A changed field takes a `--warn` border — a SECOND signal, never the only
   one: the card of the book says « modifié », and the banner names the file. */
const CHANGED = 'border-warn!'
const PILL = '!w-auto h-[30px] max-w-[150px] rounded-[6px] border-line2 bg-panel3 py-0 text-[13px]'

/** The scenes an entry serves, as the inspector lists them. */
export type EntryUsers = {
  /** Ordinary scenes, and adult ones only while that chapter is unfolded. */
  shown: { id: string; label: string }[]
  /** Adult scenes counted but not named: their content appears on demand. */
  hidden: number
}

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
  users,
  focusField = 'label',
  onPatch,
  onRemove,
  onOpenScene,
  onClose,
  enhancer,
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
  /** For a place or an intention: the scenes that use it. Absent for a scene. */
  users?: EntryUsers
  /** Where the focus lands on creation: the name, or « Ce qui s'y passe » for
      a scene the sentence already set. */
  focusField?: string
  onPatch: (patch: Draft) => void
  /** Absent while creating: there is nothing on disk to retire yet. */
  onRemove?: () => void
  onOpenScene: (id: string) => void
  onClose: () => void
  /** « Améliorer » in the label row of the fields whose spec names a kind. */
  enhancer: Enhancer
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
  const pair = ['intention', 'place'].every((n) => spec.fields.some((f) => f.name === n))
  const userCount = users ? users.shown.length + users.hidden : 0
  const blocked =
    users && userCount > 0
      ? `Sert encore à ${userCount} scène${userCount > 1 ? 's' : ''} : ${[
          ...users.shown.map((u) => u.label),
          ...(users.hidden ? [`${users.hidden} adulte${users.hidden > 1 ? 's' : ''}`] : []),
        ].join(', ')}. Change-les d'abord.`
      : null

  const onLabel = (label: string) => {
    const follows = creating && (!draft[idKey] || draft[idKey] === spec.propose(draft.label ?? ''))
    onPatch(follows ? { label, [idKey]: spec.propose(label) } : { label })
  }

  const select = (field: FieldSpec, className: string) => (
    <select
      id={inputId(field.name)}
      className={`${className} ${changed(field.name)}`}
      aria-describedby={field.hint ? `${inputId(field.name)}-hint` : undefined}
      value={draft[field.name] ?? ''}
      onChange={(e) => onPatch({ [field.name]: e.target.value })}
    >
      {selectOptions(field, context, draft[field.name] ?? '').map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  )

  const fieldOf = (name: string) => spec.fields.find((f) => f.name === name)!

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
      <header className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]">
        <b className="min-w-0 flex-1 truncate text-[14px] font-[650]">{draft.label || id || spec.titleNew}</b>
        <span className="flex-none text-[11.5px] text-dim2">{spec.noun}</span>
      </header>

      {/* Fixed under the head: it says what one is editing, and scrolling it
          away is exactly when it stops being read. */}
      <p className="m-0 flex flex-none items-start gap-[7px] border-b border-b-line px-[16px]
                    py-[9px] text-[12.5px] leading-[1.45] text-dim">
        <Icon name="worlds" className="mt-[2px] h-[13px] w-[13px] flex-none" aria-hidden="true" />
        <span>
          Partagé par <b className="font-semibold text-txt">tous les personnages</b> de «&nbsp;{worldLabel}
          &nbsp;». Toute modification change ce qu'ils reçoivent.
        </span>
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto p-[16px]">
        <div className="flex flex-col gap-[14px]">
          {pair && (
            <div className="flex flex-wrap items-center gap-[6px] text-[13px]" id="entrySentence">
              <label className="sr-only" htmlFor={inputId('intention')}>
                Intention de la scène
              </label>
              {select(fieldOf('intention'), PILL)}
              <span className="text-dim">au</span>
              <label className="sr-only" htmlFor={inputId('place')}>
                Lieu de la scène
              </label>
              {select(fieldOf('place'), PILL)}
            </div>
          )}

          {spec.fields.map((field) => {
            if (pair && (field.name === 'intention' || field.name === 'place')) return null
            const value = draft[field.name] ?? ''
            const hintId = field.hint ? `${inputId(field.name)}-hint` : undefined
            const control =
              field.kind === 'textarea' ? (
                <textarea
                  id={inputId(field.name)}
                  autoFocus={creating && field.name === focusField}
                  className={`min-h-[96px] resize-y ${changed(field.name)}`}
                  aria-describedby={hintId}
                  value={value}
                  onChange={(e) => onPatch({ [field.name]: e.target.value })}
                />
              ) : field.kind === 'select' ? (
                select(field, '!w-auto max-w-full')
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
                  autoFocus={creating && field.name === focusField}
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
                {field.enhance ? (
                  <EnhanceField
                    label={field.label}
                    htmlFor={inputId(field.name)}
                    kind={field.enhance}
                    value={draft[field.name] ?? ''}
                    onApply={(text) => onPatch({ [field.name]: text })}
                    enhancer={enhancer}
                  >
                    {control}
                  </EnhanceField>
                ) : (
                  <>
                    <label className={LABEL} htmlFor={inputId(field.name)}>
                      {field.label}
                    </label>
                    {control}
                  </>
                )}
                {field.hint && (
                  <span className={HINT} id={hintId}>
                    {field.hint}
                  </span>
                )}
              </div>
            )
          })}

          {preview !== undefined && (
            <div className={FIELD}>
              <span className={LABEL}>Ce que les personnages reçoivent</span>
              <p className="m-0 rounded-card border border-line bg-panel px-[10px] py-[8px] text-[12.5px] text-dim"
                 id="entryPreview">
                {preview || '—'}
              </p>
              <span className={HINT}>
                Le prompt de cette scène, avant l'ancre, la tenue et les fragments du personnage.
              </span>
            </div>
          )}

          {users && !creating && (
            <div className={FIELD} id="entryUsers">
              <span className={LABEL}>Sert à {userCount ? `${userCount} scène${userCount > 1 ? 's' : ''}` : 'aucune scène'}</span>
              {users.shown.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-[2px] p-0">
                  {users.shown.map((u) => (
                    <li key={u.id}>
                      <button type="button" className="link text-left" onClick={() => onOpenScene(u.id)}>
                        {u.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {users.hidden > 0 && (
                <span className={HINT}>
                  et {users.hidden} scène{users.hidden > 1 ? 's' : ''} adulte{users.hidden > 1 ? 's' : ''}, dans la branche
                  à part
                </span>
              )}
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

      <footer className="flex min-h-[52px] flex-none flex-col justify-center gap-[4px] border-t border-t-line px-[16px] py-[8px]">
        <div className="flex items-center gap-[10px]">
          <IdentityRow
            spec={spec}
            creating={creating}
            value={draft[idKey] ?? ''}
            frozen={saved[idKey] ?? ''}
            problem={idProblem}
            onChange={(v) => onPatch({ [idKey]: v })}
          />
          {onRemove && (
            <span className="ml-auto flex-none" data-hint-text={blocked ?? undefined}>
              <button
                type="button"
                className="link text-danger-txt disabled:cursor-not-allowed disabled:opacity-55"
                id="btnEntryRemove"
                disabled={Boolean(blocked)}
                aria-describedby={blocked ? 'entryRemoveWhy' : undefined}
                onClick={onRemove}
              >
                Retirer…
              </button>
            </span>
          )}
        </div>
        {onRemove && blocked && (
          <p className="tiny m-0" id="entryRemoveWhy">
            {blocked}
          </p>
        )}
      </footer>
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
      <span className="min-w-0 truncate text-[12px] text-dim2" data-hint-text={spec.idFrozenHint}>
        <span className="sr-only">{spec.idLabel} </span>
        <code className="font-code text-[12px] leading-[normal] text-dim2" id="entryId">
          {frozen}
        </code>
        <span className="sr-only"> : {spec.idFrozenHint}</span>
      </span>
    )
  }
  const trimmed = value.trim()
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <div className="flex items-center gap-[8px]">
        <label className={LABEL} htmlFor="entryIdInput">
          {spec.idLabel}
        </label>
        <input
          id="entryIdInput"
          className="font-code h-[28px] min-w-0 flex-1 py-0 text-[12px]"
          spellCheck={false}
          aria-describedby="entryIdNote"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {/* WRITTEN, never a lone tick (§S7 of screen-11): the two failing cases
          are not the same problem at all. */}
      <span
        id="entryIdNote"
        className={`flex items-center gap-[5px] text-[11.5px] ${problem ? 'text-warn-txt' : 'text-dim2'}`}
      >
        {trimmed && (
          <span aria-hidden="true" className="text-[9px]">
            {problem ? '◆' : '●'}
          </span>
        )}
        {trimmed ? (problem ?? 'valide') : 'proposé depuis le nom'} · figé une fois créé
      </span>
    </div>
  )
}
