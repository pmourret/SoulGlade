/* The studio sheet of the selected light (IT-10 chantier 7 bis) — purely
   presentational: it receives what it shows and the callbacks that act
   (frontend.md, a sub-component never calls the API).

   WHAT IT MUST SAY: the English sentence a scene that wears this light
   receives, composed from the sheet as it is adjusted, and where the light
   comes from. The sentence sits in the footer, always in view while the sheet
   scrolls: adjusting a direction and not seeing the sentence move would hide
   the one thing the sheet is for. Rewritten by hand, the sentence wins and the
   sheet says so; it no longer overwrites it. */
import type { Enhancer } from '../../../api/useEnhance'
import { EnhanceControl } from '../../../chrome/EnhanceControl'
import { useEffect, useMemo, useState } from 'react'

import { LightEffectsField } from './LightEffectsField'
import { LightSetupFields } from './LightSetupFields'
import { composeLight, SETTINGS, type EffectDef, type Setup, type Vocabulary } from './lightCompose'
import type { LightEffectEntry, LightEntry, LightFields } from './useLights'

/** The sheet as it is on screen, saved or not: what a render trial tries. */
export type LightDraft = { label: string; setup: Setup; text: string; sentence: string; dirty: boolean }

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

/** One shape for a sheet, whatever the server or the screen left unset. */
function normal(setup: Partial<Setup> | null | undefined): Setup {
  const out: Setup = { effects: (setup?.effects ?? []).map((e) => ({ key: e.key, color: e.color ?? '' })) }
  for (const key of SETTINGS) out[key] = setup?.[key] || null
  return out
}

const same = (a: Partial<Setup> | null | undefined, b: Partial<Setup> | null | undefined) =>
  JSON.stringify(normal(a)) === JSON.stringify(normal(b))
const blank = (setup: Setup) => same(setup, null)

export function LightInspector({
  light, busy, marker, worldLabel, vocabulary, customEffects,
  onSave, onCreate, onDelete, onCreateEffect, onDeleteEffect, onDraft,
  enhancer,
}: {
  /** `null` = a new light, not yet written anywhere. */
  light: LightEntry | null
  busy: boolean
  /** The reference marker: a light's text never starts with it. */
  marker: string
  /** The character's world, `null` when it has none: a new light can then
      only be the character's. */
  worldLabel: string | null
  /** The platform's vocabulary, `null` while it loads. */
  vocabulary: Vocabulary | null
  /** The user's own effects, offered next to the platform's. */
  customEffects: LightEffectEntry[]
  onSave: (fields: LightFields, toWorld: boolean) => void
  onCreate: (label: string, fields: { text: string; setup: Setup | null }, toWorld: boolean) => void
  onDelete: () => void
  onCreateEffect: (label: string, fragment: string, toWorld: boolean) => Promise<boolean>
  onDeleteEffect: (effect: LightEffectEntry) => void
  /** Told of every change of the sheet, for the render trial. */
  onDraft: (draft: LightDraft) => void
  /** « Améliorer » on the hand-written text (IT-10 chantier 8). */
  enhancer: Enhancer
}) {
  const [label, setLabel] = useState(light?.label ?? '')
  const [setup, setSetup] = useState<Setup>(normal(light?.setup))
  /* The sentence written by hand, or `null` when the sheet composes it. A
     light of chantier 7 (a text, no sheet) opens written by hand. */
  const [hand, setHand] = useState<string | null>(light?.text ? light.text : null)
  /* On a world light: correct the world rather than adjust it here. On a new
     light: create it in the world. OFF by default both ways — the world is
     inherited by every character in it. */
  const [toWorld, setToWorld] = useState(false)

  // A new selection must not carry the previous light's draft.
  const origin = JSON.stringify([light?.key, light?.label, light?.text, light?.setup])
  useEffect(() => {
    setLabel(light?.label ?? '')
    setSetup(normal(light?.setup))
    setHand(light?.text ? light.text : null)
    setToWorld(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin])

  const custom: EffectDef[] = useMemo(
    () => customEffects.map((e) => ({ key: e.key, label: e.label || e.key, fragment: e.fragment ?? '' })),
    [customEffects],
  )
  const composed = vocabulary ? composeLight(setup, vocabulary, custom) : { text: '', problem: '' }
  const sentence = hand ?? composed.text

  const isNew = light === null
  const layer = LAYER[light?.couche ?? 'personnage'] ?? LAYER.personnage
  const changed = {
    label: label.trim() !== (light?.label ?? ''),
    setup: !same(setup, light?.setup),
    text: (hand ?? '').trim() !== (light?.text ?? ''),
  }
  const dirty = isNew ? Boolean(label.trim() || sentence.trim()) : changed.label || changed.setup || changed.text

  const draftKey = JSON.stringify([label, setup, hand, sentence, dirty])
  useEffect(() => {
    onDraft({ label: label.trim(), setup, text: (hand ?? '').trim(), sentence: sentence.trim(), dirty })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])
  const problem = hand !== null && hand.trim().startsWith(marker)
    ? `le texte d'une lumière ne commence pas par « ${marker} »`
    : hand === null ? composed.problem : ''

  const submit = () => {
    const text = (hand ?? '').trim()
    if (isNew) {
      onCreate(label.trim(), { text, setup: blank(setup) ? null : setup }, toWorld)
      return
    }
    const fields: LightFields = {}
    if (changed.label) fields.label = label.trim()
    if (changed.setup) fields.setup = setup
    if (changed.text) fields.text = text
    onSave(fields, toWorld)
  }

  const disabled = busy || !vocabulary

  return (
    <div className="flex h-full min-h-0 flex-col" id="lightInspector">
      <div className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto p-[14px]">
        {isNew ? (
          <p className="m-0 text-[12px] text-dim2">
            Nouvelle lumière. Partir d'un schéma, l'ajuster, puis la poser dans une scène — onglet
            Lumière, ou en variante.
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

        {!vocabulary ? (
          <p className="m-0 text-[12px] text-dim2" role="status">Chargement du vocabulaire de la lumière…</p>
        ) : (
          <>
            <div className="flex flex-col gap-[5px]">
              <span className="lab">Partir d'un schéma</span>
              <div className="chips" id="lightSchemes">
                {vocabulary.schemes.map((scheme) => (
                  <button
                    key={scheme.key}
                    type="button"
                    className={`chip-t ${same(setup, scheme.setup) ? 'on' : ''}`}
                    data-scheme={scheme.key}
                    title={scheme.term}
                    disabled={disabled}
                    onClick={() => setSetup(normal(scheme.setup))}
                  >
                    {scheme.label}
                  </button>
                ))}
              </div>
              <span className="tiny">Un schéma remplit la fiche, qu'on ajuste ensuite.</span>
            </div>

            <LightSetupFields vocabulary={vocabulary} setup={setup} disabled={disabled} onChange={setSetup} />

            <LightEffectsField
              vocabulary={vocabulary}
              custom={customEffects}
              chosen={setup.effects ?? []}
              disabled={disabled}
              worldLabel={worldLabel}
              toWorld={toWorld}
              onChange={(effects) => setSetup({ ...setup, effects })}
              onCreateEffect={(effectLabel, fragment) => onCreateEffect(effectLabel, fragment, toWorld)}
              onDeleteEffect={onDeleteEffect}
            />
          </>
        )}

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
      </div>

      <div className="flex flex-none flex-col gap-[8px] border-t border-t-line p-[14px]" id="lightFooter">
        <div className="flex items-center gap-[8px]">
          <span className="lab flex-1">Ce que la scène reçoit</span>
          {hand === null ? (
            <button type="button" className="btn sm" id="btnLightHand" disabled={disabled || !composed.text}
                    onClick={() => setHand(composed.text)}>
              Écrire à la main
            </button>
          ) : (
            <button type="button" className="btn sm" id="btnLightSheet" disabled={disabled}
                    onClick={() => setHand(null)}>
              Revenir à la fiche
            </button>
          )}
        </div>
        {hand === null ? (
          <p className={`m-0 font-code text-[12.5px] ${composed.text ? '' : 'text-dim2'}`} id="lightPhrase"
             aria-live="polite">
            {composed.text || 'Choisir un schéma ou un réglage : la phrase anglaise se compose ici.'}
          </p>
        ) : (
          <>
            <label className="sr-only" htmlFor="lightText">Texte écrit à la main</label>
            <textarea
              id="lightText"
              className={`min-h-[80px] w-full font-code text-[12.5px] ${problem ? 'border-warn!' : ''}`}
              value={hand}
              placeholder="warm low sunlight from the side, long soft shadows"
              disabled={busy}
              aria-describedby="lightTextHint"
              onChange={(event) => setHand(event.target.value)}
            />
            <EnhanceControl
              label="Texte écrit à la main"
              kind="light"
              value={hand}
              onApply={setHand}
              enhancer={enhancer}
              disabled={busy}
            />
            <span className="text-[11.5px] text-dim2" id="lightTextHint" data-light-hand>
              Texte écrit à la main : la fiche ne l'écrase plus. En anglais, comme le reste du prompt.
            </span>
          </>
        )}
        {problem && <span className="text-[12px] text-warn-txt" role="status">{problem}</span>}
        {!isNew && light.erreur && (
          <span className="text-[12px] text-warn-txt" role="status">{light.erreur}</span>
        )}
        <span className="tiny">Ajoutée après le décor ; en variante, à la place de la lumière de la scène.</span>

        <div className="flex flex-wrap gap-[6px]">
          <button
            type="button"
            className="btn primary sm"
            id="btnLightSave"
            disabled={busy || !dirty || !label.trim() || !sentence.trim() || Boolean(problem)}
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
    </div>
  )
}
