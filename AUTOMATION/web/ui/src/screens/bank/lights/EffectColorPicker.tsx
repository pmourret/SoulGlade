/* The free colour of an effect (design-pass lumieres, S6) — presentational.

   More freedom than the six swatches, without ever putting a colour VALUE in
   the prompt: the wheel, the lightness and the intensity only propose English
   WORDS (`colorName.ts`), which the user can rewrite. What « Utiliser » hands
   back is those words, stored in the effect's `color` as before — no schema
   change.

   Once the user types in the field, the name no longer follows the wheel
   (the same rule as a sentence written by hand). A popover, not a modal: the
   focus lands on the wheel, Tab stays inside, Escape cancels without reaching
   a drawer behind it, and the caller gives the focus back to « Autre… ». */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { HueWheel } from '../../../chrome/theme/HueWheel'
import { oklchToHex } from '../../../chrome/theme/oklch'
import { colorFromName, colorName, DEFAULT_COLOR, intensityWord, lightnessWord, type Oklch } from './colorName'

const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),[tabindex="0"]'
/* The ring is drawn at one readable reference, whatever the chosen lightness
   and intensity: the preview in its centre shows the real pick. */
const RING_L = 0.7
const RING_C = 0.15

export function EffectColorPicker({
  effectLabel, initial, onUse, onCancel,
}: {
  effectLabel: string
  /** The effect's current free words, '' when it has none. */
  initial: string
  onUse: (words: string) => void
  onCancel: () => void
}) {
  const known = initial ? colorFromName(initial) : null
  const [color, setColor] = useState<Oklch>(known ?? DEFAULT_COLOR)
  /* Words that are not the table's own stay the user's: the wheel may move
     under them, it does not overwrite them. */
  const [typed, setTyped] = useState(Boolean(initial) && (!known || colorName(known) !== initial.trim().toLowerCase()))
  const [words, setWords] = useState(initial || colorName(known ?? DEFAULT_COLOR))
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('[role="slider"]')?.focus()
  }, [])

  const pick = (next: Oklch) => {
    setColor(next)
    if (!typed) setWords(colorName(next))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onCancel()
      return
    }
    if (event.key !== 'Tab' || !rootRef.current) return
    const items = [...rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const title = `Couleur de l'effet ${effectLabel}`
  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={title}
      id="lightFxColor"
      className="absolute top-full left-0 z-[5] mt-[6px] flex w-[300px] flex-col gap-[10px] rounded-card border
                 border-line bg-panel p-[12px] shadow-elev"
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center gap-[8px]">
        <span className="lab flex-1 truncate">Couleur · {effectLabel}</span>
        <button type="button" className="border-0 bg-transparent px-[4px] text-[16px] leading-none text-dim hover:text-txt"
                aria-label="Fermer sans choisir" onClick={onCancel}>
          ×
        </button>
      </div>

      <div className="relative self-center">
        <HueWheel label="Teinte" value={color.h} onChange={(h) => pick({ ...color, h })}
                  trackL={RING_L} trackC={RING_C} size={120} />
        <span aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2
                         rounded-full border border-line2"
              style={{ background: oklchToHex(color.l, color.c, color.h) }} />
      </div>

      <Slider id="lightFxColorL" label="Clarté" value={color.l} min={0.3} max={0.9}
              word={lightnessWord(color.l)} onChange={(l) => pick({ ...color, l })} />
      <Slider id="lightFxColorC" label="Intensité" value={color.c} min={0.02} max={0.26}
              word={intensityWord(color.c)} onChange={(c) => pick({ ...color, c })} />

      <div className="flex flex-col gap-[4px]">
        <label className="lab" htmlFor="lightFxColorName">Ce que le prompt reçoit</label>
        <input
          id="lightFxColorName"
          className="w-full font-code text-[12.5px]"
          value={words}
          aria-describedby="lightFxColorHint"
          onChange={(event) => {
            setTyped(true)
            setWords(event.target.value)
          }}
        />
        <span className="tiny" id="lightFxColorHint">
          Nom proposé d'après la teinte, en anglais. Modifiable : le modèle lit des mots, pas une valeur.
        </span>
      </div>

      <div className="flex gap-[6px]">
        <button type="button" className="btn primary sm" id="btnLightFxColorUse" disabled={!words.trim()}
                onClick={() => onUse(words.trim())}>
          Utiliser
        </button>
        <button type="button" className="btn sm" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  )
}

function Slider({
  id, label, value, min, max, word, onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  word: string
  onChange: (value: number) => void
}) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_56px] items-center gap-[8px]">
      <label className="text-[12.5px] text-dim" htmlFor={id}>{label}</label>
      <input id={id} type="range" className="adj" min={min} max={max} step={0.01} value={value}
             aria-valuetext={word} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="text-right text-[12px] text-dim2">{word}</span>
    </div>
  )
}
