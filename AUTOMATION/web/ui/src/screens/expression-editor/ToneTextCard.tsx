/* What the open tone ADDS TO THE IMAGE, above the trial photos (IT-10, 25/09).
   Presentation only: the writes come in as `onAdjust` / `onRevert`.

   WHY IT LEADS THE COLUMN. A tone does two things: it adds a fragment to the
   prompt, and it poses an expression after the identity check. This workshop
   only ever showed the second. The first is the one that weighs on the render
   — `joueur`'s « slight motion blur » degraded every selfie on 25/09 while no
   screen displayed it. It is read here first, where the tone is tuned.

   WHERE THE TONE COMES FROM, SAID IN WORDS. From the world as is, from the
   world adjusted for this character, or from this character alone. Adjusting
   writes only this character's file; changing the tone for everyone happens in
   the world, and the link says so. Its own immediate save, NOT the chrome's
   banner: the banner already carries the expression range, and one banner for
   two drafts would save both on one Ctrl S. */
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { worldPlacesPath } from '../../app/routes'
import type { ToneTextFields } from './useToneText'
import type { ToneRow } from './useToneList'

const LAYER_TEXT: Record<ToneRow['couche'], string> = {
  monde: 'du monde',
  surcharge: 'du monde, ajusté pour ce personnage',
  personnage: 'propre à ce personnage',
}

export function ToneTextCard({
  tone, world, onAdjust, onRevert,
}: {
  tone: ToneRow
  world: { id: string; label: string } | null
  onAdjust: (fields: ToneTextFields) => Promise<string | null>
  onRevert: () => Promise<string | null>
}) {
  const [editing, setEditing] = useState<{ label: string; prompt_add: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openedFor, setOpenedFor] = useState(tone.key)
  if (openedFor !== tone.key) {
    // Another tone opened: an edit in progress belonged to the previous one.
    setOpenedFor(tone.key)
    setEditing(null)
    setError(null)
  }

  const inherits = tone.couche !== 'personnage'
  const canRevert = tone.couche === 'surcharge' && tone.adjusted.length > 0

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true)
    const failure = await action()
    setBusy(false)
    setError(failure)
    if (!failure) setEditing(null)
  }

  return (
    <section
      id="toneText"
      aria-label={`Ce que le ton ${tone.label} ajoute à l'image`}
      className="flex-none border-b border-b-line bg-panel px-[14px] py-[10px]"
    >
      <div className="flex items-baseline gap-[8px]">
        <span className="lab flex-none">Ajouté au prompt</span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-dim" data-tone-layer={tone.couche}>
          ton {LAYER_TEXT[tone.couche]}
          {inherits && world ? ` « ${world.label} »` : ''}
        </span>
        {!editing && (
          <>
            {canRevert && (
              <button type="button" className="link flex-none" disabled={busy} onClick={() => void run(onRevert)}>
                Revenir au monde
              </button>
            )}
            <button
              type="button"
              className="btn sm flex-none"
              id="btnToneAdjust"
              onClick={() => setEditing({ label: tone.label, prompt_add: tone.promptAdd })}
            >
              {inherits ? 'Ajuster pour ce personnage' : 'Modifier'}
            </button>
          </>
        )}
      </div>

      {editing ? (
        <div className="mt-[8px] flex flex-col gap-[8px]">
          <div className="flex items-center gap-[8px]">
            <label className="lab w-[70px] flex-none" htmlFor="toneTextLabel">
              Nom
            </label>
            <input
              id="toneTextLabel"
              className="h-[30px] max-w-[320px] flex-1"
              value={editing.label}
              onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            />
          </div>
          <textarea
            id="toneTextPrompt"
            aria-label="Fragment de prompt"
            className="min-h-[64px] resize-y"
            value={editing.prompt_add}
            onChange={(e) => setEditing({ ...editing, prompt_add: e.target.value })}
          />
          <span className="text-[11.5px] text-dim2">
            Écrit pour ce personnage seulement. Jamais un défaut de prise de vue : « flou »,
            « bougé » ou « grain » s'appliquent à toute la photo et la dégradent.
          </span>
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              className="btn primary sm"
              id="btnToneTextSave"
              disabled={busy}
              onClick={() =>
                void run(() => onAdjust({ label: editing.label, prompt_add: editing.prompt_add }))
              }
            >
              Enregistrer pour ce personnage
            </button>
            <button type="button" className="btn sm" disabled={busy} onClick={() => setEditing(null)}>
              Annuler
            </button>
            {inherits && world && (
              <Link className="link ml-auto text-[12px]" to={`${worldPlacesPath(world.id)}?onglet=tons`}>
                Modifier pour tout le monde
              </Link>
            )}
          </div>
        </div>
      ) : (
        <p className="m-0 mt-[5px] text-[13px] leading-[1.45]" id="toneTextFragment">
          {tone.promptAdd || <span className="text-dim2">aucun fragment : ce ton ne change que le visage</span>}
        </p>
      )}

      {error && (
        <p className="m-0 mt-[6px] text-[12px] text-danger-txt" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
