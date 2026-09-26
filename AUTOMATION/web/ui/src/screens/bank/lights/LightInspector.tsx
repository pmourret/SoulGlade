/* The 340 px column of the selected light (IT-10 chantier 7) — purely
   presentational: it receives what it shows and the callbacks that act
   (frontend.md, a sub-component never calls the API).

   WHAT IT MUST SAY: the text a scene that wears this light receives, and
   where the light comes from. A light is one sentence; the text field IS
   what the scene receives, said again under it once saved. */
import { useEffect, useState } from 'react'

import type { LightEntry } from './useLights'

const LAYER: Record<string, { label: string; hint: string }> = {
  monde: {
    label: 'Du monde',
    hint: "Livrée par le monde : tous ses personnages l'ont. L'ajuster ici ne change rien pour eux.",
  },
  surcharge: {
    label: 'Ajustée ici',
    hint: "Du monde, ajustée pour ce personnage. Le monde fournit toujours ce qui n'a pas été ajusté.",
  },
  personnage: {
    label: 'Propre au personnage',
    hint: 'Créée pour ce personnage : lui seul la voit.',
  },
}

export function LightInspector({
  light, busy, marker, worldLabel, onSave, onCreate, onDelete,
}: {
  /** `null` = a new light, not yet written anywhere. */
  light: LightEntry | null
  busy: boolean
  /** The reference marker: a light's text never starts with it. */
  marker: string
  /** The character's world, `null` when it has none: a new light can then
      only be the character's. */
  worldLabel: string | null
  onSave: (fields: { label: string; text: string }, toWorld: boolean) => void
  onCreate: (label: string, text: string, toWorld: boolean) => void
  onDelete: () => void
}) {
  const [label, setLabel] = useState(light?.label ?? '')
  const [text, setText] = useState(light?.text ?? '')
  /* On a world light: correct the world rather than adjust it here. On a new
     light: create it in the world. OFF by default both ways — the world is
     inherited by every character in it. */
  const [toWorld, setToWorld] = useState(false)

  // A new selection must not carry the previous light's draft.
  useEffect(() => {
    setLabel(light?.label ?? '')
    setText(light?.text ?? '')
    setToWorld(false)
  }, [light?.key, light?.label, light?.text])

  const isNew = light === null
  const layer = LAYER[light?.couche ?? 'personnage'] ?? LAYER.personnage
  const dirty = isNew
    ? Boolean(label.trim() || text.trim())
    : label.trim() !== (light.label ?? '') || text.trim() !== (light.text ?? '')
  const problem = text.trim().startsWith(marker)
    ? `le texte d'une lumière ne commence pas par « ${marker} »`
    : ''

  const submit = () => {
    if (isNew) onCreate(label.trim(), text.trim(), toWorld)
    else onSave({ label: label.trim(), text: text.trim() }, toWorld)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-[12px] overflow-y-auto p-[14px]" id="lightInspector">
      {isNew ? (
        <p className="m-0 text-[12px] text-dim2">
          Nouvelle lumière. Elle se pose ensuite dans une scène, onglet Lumière, ou en variante.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-[6px] text-[12px] text-dim2">
            <span className="rounded-pill border border-line px-[7px] py-[2px]" data-light-layer>
              {layer.label}
            </span>
          </div>
          <p className="m-0 text-[12px] text-dim2">{layer.hint}</p>
        </>
      )}

      <div className="flex flex-col gap-[4px]">
        <label className="lab" htmlFor="lightLabel">Libellé</label>
        <input
          id="lightLabel"
          className="w-full text-[13px]"
          value={label}
          placeholder="Fin d'après-midi"
          disabled={busy}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-[4px]">
        <label className="lab" htmlFor="lightText">Ce que la scène reçoit</label>
        <textarea
          id="lightText"
          className={`min-h-[96px] w-full font-code text-[12.5px] ${problem ? 'border-warn!' : ''}`}
          value={text}
          placeholder="warm low sunlight from the side, long soft shadows"
          disabled={busy}
          aria-describedby="lightTextHint"
          onChange={(event) => setText(event.target.value)}
        />
        <span className={`text-[11.5px] ${problem ? 'text-warn-txt' : 'text-dim2'}`} id="lightTextHint">
          {problem ||
            'En anglais, comme le reste du prompt. Ajouté après le décor ; en variante, à la fin du prompt.'}
        </span>
        {!isNew && light.erreur && (
          <span className="text-[12px] text-warn-txt" role="status">{light.erreur}</span>
        )}
      </div>

      {(isNew ? worldLabel !== null : light.couche !== 'personnage') && (
        <label className="flex items-center gap-[6px] text-[12px]" htmlFor="lightToWorld">
          <input
            id="lightToWorld"
            type="checkbox"
            className="w-auto"
            checked={toWorld}
            disabled={busy}
            onChange={(event) => setToWorld(event.target.checked)}
          />
          {isNew
            ? `Créer dans le monde ${worldLabel}, pour tous ses personnages`
            : 'Corriger dans le monde, pour tous ses personnages'}
        </label>
      )}

      <div className="flex flex-wrap gap-[6px]">
        <button
          type="button"
          className="btn primary sm"
          id="btnLightSave"
          disabled={busy || !dirty || !label.trim() || !text.trim() || Boolean(problem)}
          onClick={submit}
        >
          {isNew ? 'Créer la lumière' : 'Enregistrer'}
        </button>
        {!isNew && (
          <button type="button" className="btn sm" id="btnLightDelete" disabled={busy} onClick={onDelete}>
            {light.couche === 'surcharge' ? 'Rendre au monde' : 'Retirer'}
          </button>
        )}
      </div>
    </div>
  )
}
