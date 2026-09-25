/* « Nouveau monde » (design-pass screen-11 §S6). It used to be a card that
   unfolded IN PLACE of the dashed « + » card of the registry grid, which meant
   the form appeared somewhere in the middle of a wrapping grid, at a position
   that depended on how many worlds existed.

   THE PACK IS A PROPOSAL, NOT A ROUTING CHOICE (ADR-0016 §2): it is picked
   only so the server can derive `compatible_families`; it never writes an entry
   into `universe.resolve()`'s table, and the created world stays proposable to
   any pack of the same family afterwards. The form says so where the field is.

   THE IDENTIFIER FOLLOWS THE NAME UNTIL IT IS TOUCHED (§S7). `touched` is what
   makes that a proposal rather than a rule: the moment the field is typed in,
   it stops following, and the name can keep changing without stealing it back.

   NOT `label.f`, THE STUDIO'S USUAL FORM ROW: it declares `label.f span
   {display:block}`, an element-plus-class selector that outranks a plain
   utility — the written validation next to the field would be laid out as a
   block under it, whatever `flex` says. */
import { useState } from 'react'

import { Dialog } from '../../chrome/Dialog'
import { isValidId, slugify } from './slugify'
import type { NewWorldFields, PackOption } from './useWorldRegistry'

const FIELD = 'flex flex-col gap-[5px]'
const LABEL = 'text-[11.5px] tracking-[.3px] text-dim uppercase'
const HINT = 'text-[11.5px] text-dim2'

export function NewWorldDialog({
  packs,
  creating,
  takenIds,
  onCreate,
  onClose,
}: {
  packs: PackOption[]
  creating: boolean
  takenIds: string[]
  /** Resolves with the server's refusal, or null when the world was created. */
  onCreate: (fields: NewWorldFields) => Promise<string | null>
  onClose: () => void
}) {
  const [label, setLabel] = useState('')
  const [id, setId] = useState('')
  const [touched, setTouched] = useState(false)
  const [pack, setPack] = useState(packs[0]?.id ?? '')
  const [tone, setTone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const proposed = touched ? id : slugify(label)
  const taken = takenIds.includes(proposed)
  const problem = !proposed
    ? null
    : taken
      ? 'déjà utilisé'
      : isValidId(proposed)
        ? null
        : 'minuscules, chiffres, - et _'
  const family = packs.find((p) => p.id === pack)?.family ?? null
  const ready = Boolean(proposed) && !problem && Boolean(label.trim()) && Boolean(pack)

  const submit = async () => {
    setError(null)
    const failure = await onCreate({ id: proposed, label: label.trim(), pack, tone: tone.trim() })
    if (failure) setError(failure)
  }

  return (
    <Dialog
      open
      onDismiss={onClose}
      initialFocus="#nwLabel"
      cardClassName="w-[440px]! max-w-[calc(100vw-32px)]!"
    >
      <div data-new-open className="flex flex-col gap-[14px]">
        <div>
          <h3 className="mt-0 mb-[6px] text-[16px]">Nouveau monde</h3>
          <p className="m-0 text-[12.5px] text-dim">
            Son catalogue démarre vide. Tu arriveras dessus pour ajouter un premier lieu.
          </p>
        </div>

        <div className={FIELD}>
          <label className={LABEL} htmlFor="nwLabel">
            Nom
          </label>
          <input
            id="nwLabel"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex : Terres sauvages"
          />
        </div>

        <div className={FIELD}>
          <label className={LABEL} htmlFor="nwId">
            Identifiant
          </label>
          <div className="flex items-center gap-[10px]">
            <input
              id="nwId"
              className="font-code min-w-0 flex-1"
              spellCheck={false}
              aria-describedby="nwIdNote"
              value={proposed}
              onChange={(e) => {
                setTouched(true)
                setId(e.target.value)
              }}
            />
            {/* WRITTEN, never a lone tick (§S7): a ✓ says « something is right »
                without ever saying what, and the two refusals here are not the
                same problem. */}
            <span
              id="nwIdNote"
              className={`flex flex-none items-center gap-[5px] text-[11.5px] ${
                problem ? 'text-warn-txt' : 'text-dim2'
              }`}
            >
              {proposed && (
                <span aria-hidden="true" className="text-[9px]">
                  {problem ? '◆' : '●'}
                </span>
              )}
              {proposed ? (problem ?? 'valide') : 'proposé depuis le nom'}
            </span>
          </div>
        </div>

        <div className={FIELD}>
          <label className={LABEL} htmlFor="nwPack">
            Pack
            {family && <span className="ml-[6px] normal-case text-dim2">famille dérivée : {family}</span>}
          </label>
          <select id="nwPack" value={pack} onChange={(e) => setPack(e.target.value)}>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.family})
              </option>
            ))}
          </select>
          <span className={HINT}>sert seulement à dériver la famille compatible</span>
        </div>

        <div className={FIELD}>
          <label className={LABEL} htmlFor="nwTone">
            Ton (optionnel)
          </label>
          <input
            id="nwTone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="ex : calm, natural light"
          />
        </div>

        {/* The server's own sentence, as it comes. */}
        {error && (
          <p className="m-0 text-[12px] text-danger-txt" role="alert">
            {error}
          </p>
        )}

        <div className="mt-[4px] flex items-center gap-[12px]">
          <button className="btn primary" disabled={!ready || creating} onClick={() => void submit()}>
            {creating ? 'Création…' : 'Créer et ouvrir le catalogue'}
          </button>
          <button className="link" onClick={onClose} disabled={creating}>
            annuler
          </button>
        </div>
      </div>
    </Dialog>
  )
}
