/* The effects of a studio sheet (IT-10 7 bis) — presentational.

   Several at once. An effect whose fragment says `{color}` takes a colour: a
   swatch of the short palette, or « Autre… », the free colour picked on a
   wheel and stored as the user's own English words (« deep violet »). The
   grid runs in three columns; a ticked effect that takes a colour spans the
   whole row to carry its swatches (design-pass lumieres, S3/S6).
   The user's own effects (`light_effects`) sit under the platform's, and a
   new one is created right here: a label, an English fragment. */
import { useRef, useState } from 'react'

import { oklchToHex } from '../../../chrome/theme/oklch'
import { colorFromName, frenchName } from './colorName'
import { EffectColorPicker } from './EffectColorPicker'
import type { LightEffectEntry } from './useLights'
import { takesColor, type EffectChoice, type EffectDef, type Vocabulary } from './lightCompose'

function EffectRow({
  effect, choice, vocabulary, disabled, mark, picking, onPicking, onToggle, onColor, onDelete,
}: {
  effect: EffectDef
  choice: EffectChoice | undefined
  vocabulary: Vocabulary
  disabled: boolean
  /** Where a user's effect comes from; '' for the platform's. */
  mark: string
  /** Its free-colour picker is the open one: one at a time, one set of ids. */
  picking: boolean
  onPicking: (open: boolean) => void
  onToggle: (on: boolean) => void
  onColor: (color: string) => void
  onDelete?: () => void
}) {
  const id = `lightFx-${effect.key}`
  const color = choice?.color ?? ''
  const free = vocabulary.palette.some((c) => c.key === color) ? '' : color
  const otherRef = useRef<HTMLButtonElement | null>(null)
  const colored = Boolean(choice && takesColor(effect))
  const approx = free ? colorFromName(free) : null
  const closePicker = () => {
    onPicking(false)
    otherRef.current?.focus()
  }
  return (
    <li className={`flex min-w-0 flex-col gap-[5px] ${colored ? 'col-span-full' : ''}`} data-light-effect={effect.key}>
      <div className="flex items-start gap-[6px] text-[12.5px]">
        <input id={id} type="checkbox" className="mt-[2px] w-auto" checked={Boolean(choice)} disabled={disabled}
               onChange={(event) => onToggle(event.target.checked)} />
        <label htmlFor={id} className="min-w-0 flex-1">
          {effect.label}
          {effect.term && <span className="text-dim2"> · {effect.term}</span>}
          {mark && <span className="ml-[4px] rounded-pill border border-line px-[5px] text-[11px] text-dim2">{mark}</span>}
        </label>
        {onDelete && (
          <button type="button" className="border-0 bg-transparent px-[4px] text-[14px] text-dim hover:text-txt"
                  aria-label={`Retirer l'effet ${effect.label}`} disabled={disabled} onClick={onDelete}>
            ×
          </button>
        )}
      </div>
      {colored && (
        <>
          <div className="relative ml-[20px] flex flex-wrap items-center gap-[5px]" role="group"
               aria-label={`Couleur de ${effect.label}`}>
            {vocabulary.palette.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-label={c.label}
                aria-pressed={color === c.key}
                title={c.label}
                data-color={c.key}
                disabled={disabled}
                className={`h-[20px] w-[20px] rounded-[4px] border-2 ${color === c.key ? 'border-txt' : 'border-line'}`}
                style={{ backgroundColor: c.swatch }}
                onClick={() => onColor(c.key)}
              />
            ))}
            <button
              ref={otherRef}
              type="button"
              aria-pressed={Boolean(free)}
              aria-haspopup="dialog"
              aria-expanded={picking}
              data-color-other
              disabled={disabled}
              className={`flex h-[20px] items-center gap-[5px] rounded-[4px] border bg-transparent py-0 pr-[7px] pl-[2px]
                          text-[12px] ${free ? 'border-txt text-txt' : 'border-line text-dim hover:text-txt'}`}
              onClick={() => onPicking(!picking)}
            >
              <span
                aria-hidden="true"
                className={`h-[14px] w-[14px] rounded-[3px] ${approx ? '' : 'border border-dashed border-dim2'}`}
                style={approx ? { background: oklchToHex(approx.l, approx.c, approx.h) } : undefined}
              />
              Autre…
            </button>
            {picking && (
              <EffectColorPicker
                effectLabel={effect.label}
                initial={free}
                onCancel={closePicker}
                onUse={(words) => {
                  onColor(words)
                  closePicker()
                }}
              />
            )}
          </div>
          {free && (
            <span className="ml-[20px] text-[12px] text-dim" data-color-free>
              {frenchName(free) ?? 'Couleur libre'} · <span className="font-code">{free}</span>
            </span>
          )}
        </>
      )}
    </li>
  )
}

export function LightEffectsField({
  vocabulary, custom, chosen, disabled, worldLabel, toWorld, onChange, onCreateEffect, onDeleteEffect,
}: {
  vocabulary: Vocabulary
  custom: LightEffectEntry[]
  chosen: EffectChoice[]
  disabled: boolean
  worldLabel: string | null
  /** The light goes to the world: a new effect must go there too, or the
      world's other characters could not resolve it. */
  toWorld: boolean
  onChange: (chosen: EffectChoice[]) => void
  onCreateEffect: (label: string, fragment: string) => Promise<boolean>
  onDeleteEffect: (effect: LightEffectEntry) => void
}) {
  const [creating, setCreating] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [fragment, setFragment] = useState('')

  const row = (effect: EffectDef, mark: string, onDelete?: () => void) => {
    const choice = chosen.find((c) => c.key === effect.key)
    return (
      <EffectRow
        key={effect.key}
        effect={effect}
        choice={choice}
        vocabulary={vocabulary}
        disabled={disabled}
        mark={mark}
        onDelete={onDelete}
        picking={picking === effect.key}
        onPicking={(open) => setPicking(open ? effect.key : null)}
        onToggle={(on) => onChange(on ? [...chosen, { key: effect.key, color: '' }]
                                      : chosen.filter((c) => c.key !== effect.key))}
        onColor={(color) => onChange(chosen.map((c) => (c.key === effect.key ? { ...c, color } : c)))}
      />
    )
  }

  const create = async () => {
    if (await onCreateEffect(label.trim(), fragment.trim())) {
      setLabel('')
      setFragment('')
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-[8px]" id="lightEffects">
      <div className="flex items-center gap-[8px]">
        <span className="lab flex-1">Effets · {chosen.length} choisi{chosen.length > 1 ? 's' : ''}</span>
        {!creating && (
          <button type="button" className="btn sm" id="btnLightEffectNew" disabled={disabled}
                  onClick={() => setCreating(true)}>
            Créer un effet…
          </button>
        )}
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-x-[16px] gap-y-[8px] p-0">
        {vocabulary.effects.map((effect) => row(effect, ''))}
        {custom.map((effect) =>
          row({ key: effect.key, label: effect.label || effect.key, fragment: effect.fragment ?? '' },
              effect.couche === 'personnage' ? 'à vous' : 'du monde',
              () => onDeleteEffect(effect)))}
      </ul>
      {creating && (
        <div className="mt-[4px] flex flex-col gap-[6px] rounded-card border border-line p-[10px]" id="lightEffectNew">
          <label className="lab" htmlFor="lightEffectLabel">Nouvel effet</label>
          <input id="lightEffectLabel" className="text-[13px]" placeholder="Lueur de bougie" value={label}
                 disabled={disabled} onChange={(event) => setLabel(event.target.value)} />
          <label className="sr-only" htmlFor="lightEffectFragment">Fragment anglais</label>
          <input id="lightEffectFragment" className="font-code text-[12.5px]" placeholder="{color} candle glow"
                 value={fragment} disabled={disabled} aria-describedby="lightEffectHint"
                 onChange={(event) => setFragment(event.target.value)} />
          <span className="tiny" id="lightEffectHint">
            En anglais. Écrire {'{color}'} là où la couleur choisie se place, s'il en prend une.
            {toWorld && worldLabel ? ` Créé dans le monde ${worldLabel}, comme la lumière.` : ''}
          </span>
          <div className="flex gap-[6px]">
            <button type="button" className="btn sm" id="btnLightEffectCreate"
                    disabled={disabled || !label.trim() || !fragment.trim()} onClick={() => void create()}>
              Créer l'effet
            </button>
            <button type="button" className="btn sm" disabled={disabled} onClick={() => setCreating(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
