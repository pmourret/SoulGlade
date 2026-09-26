/* How a scene's light line reads on screen (IT-10 chantier 7).

   A line — the scene's `light` field, or one of its variants — is free text,
   or `@<key>` for a light of the catalogue. The server resolves it at launch
   (`lights.resolve_bank`); the screen only needs to SHOW it: a reference by
   its label and the text the scene will receive, never by `@<key>`.

   NOT A SECOND RESOLVER. The text shown is the one the server computed for
   the catalogue (`texte`); nothing is joined here. */
import type { LightEntry } from './useLights'

export type LightLine = {
  /** `true` when the line refers to a light of the catalogue. */
  reference: boolean
  /** The light's label, or '' for free text. */
  label: string
  /** What the scene receives: the resolved text, or the free text as typed. */
  text: string
  /** Why the reference does not resolve — '' when it does. */
  problem: string
}

export function lightLine(line: string, lights: LightEntry[], marker: string): LightLine {
  const trimmed = line.trim()
  if (!trimmed.startsWith(marker)) return { reference: false, label: '', text: line, problem: '' }
  const key = trimmed.slice(marker.length).trim()
  const light = lights.find((l) => l.key === key)
  if (!light) return { reference: true, label: key, text: '', problem: `lumière inconnue : « ${key} »` }
  return {
    reference: true,
    label: light.label || light.key,
    text: light.texte ?? '',
    problem: light.erreur ?? '',
  }
}

/** The text a line puts in the prompt, for the previews. A reference that
    does not resolve shows as it is stored: the save refuses it and says why. */
export function lightPromptText(line: string, lights: LightEntry[], marker: string): string {
  const view = lightLine(line, lights, marker)
  return view.reference && !view.text ? line.trim() : view.text
}

/** The platform's light words a scene's own text already holds (7 bis). A
    light posed on the scene would add to them: the Lumière tab says so, it
    does not refuse. Whole words, any case. */
export function lightWordsIn(text: string, words: string[]): string[] {
  const lower = text.toLowerCase()
  const escape = (word: string) => word.toLowerCase().replace(/[.*+?^$()|[\]\\{}]/g, '\\$&')
  return words.filter((word) => new RegExp('\\b' + escape(word) + '\\b').test(lower))
}
