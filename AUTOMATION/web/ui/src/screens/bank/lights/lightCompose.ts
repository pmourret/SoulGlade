/* The English sentence of a studio sheet, composed on screen (IT-10 7 bis).

   THE SAME GRAMMAR AS THE SERVER, `lights.compose` (AUTOMATION/lights.py):
   « <quality> <temperature> <source> <direction>, <mood>, <effect>, ... », an
   unset setting dropping out, « light » standing in for a missing source.
   The vocabulary is the one `/api/lighting` serves, never a copy: this file
   holds the grammar only. test_lights.js checks that the sentence shown here
   is the one the server gives the saved light, to the character.

   It never raises: what the server would refuse comes back as `problem`,
   and the sheet says it instead of a wrong sentence. */
import type { Schema } from '../../../api/client'

export type Vocabulary = Schema<'LightingVocabulary'>
export type Setup = Schema<'LightSetup'>
export type EffectChoice = Schema<'LightEffectChoice'>
/** An effect a sheet can carry: the platform's, or one of the user's own. */
export type EffectDef = { key: string; label: string; fragment: string; term?: string }

export const SETTINGS = ['source', 'direction', 'quality', 'temperature', 'mood'] as const
export type SettingKey = (typeof SETTINGS)[number]

const COLOR = '{color}'

/** A palette key becomes its fragment; anything else is the user's own words. */
export function colorText(vocab: Vocabulary, color: string | undefined): string {
  const value = (color ?? '').trim()
  return vocab.palette.find((c) => c.key === value)?.fragment ?? value
}

export function composeLight(
  setup: Setup,
  vocab: Vocabulary,
  custom: EffectDef[],
): { text: string; problem: string } {
  const pick: Record<SettingKey, string> = { source: '', direction: '', quality: '', temperature: '', mood: '' }
  for (const key of SETTINGS) {
    const value = setup[key]
    if (!value) continue
    const setting = vocab.settings.find((s) => s.key === key)
    const option = setting?.options.find((o) => o.key === value)
    if (!option) return { text: '', problem: `${(setting?.label ?? key).toLowerCase()} inconnue : « ${value} »` }
    pick[key] = option.fragment
  }
  const head =
    pick.quality || pick.temperature || pick.source || pick.direction
      ? [pick.quality, pick.temperature, pick.source || 'light', pick.direction].filter(Boolean).join(' ')
      : ''
  const known = new Map<string, EffectDef>([...vocab.effects, ...custom].map((e) => [e.key, e]))
  const parts = [head, pick.mood]
  for (const chosen of setup.effects ?? []) {
    const effect = known.get(chosen.key)
    if (!effect) return { text: '', problem: `effet inconnu : « ${chosen.key} »` }
    const fragment = effect.fragment.split(COLOR).join(colorText(vocab, chosen.color))
    parts.push(fragment.split(/\s+/).filter(Boolean).join(' '))
  }
  return { text: parts.filter(Boolean).join(', '), problem: '' }
}

/** Whether an effect takes a colour: its fragment says where it goes. */
export const takesColor = (effect: EffectDef) => effect.fragment.includes(COLOR)
