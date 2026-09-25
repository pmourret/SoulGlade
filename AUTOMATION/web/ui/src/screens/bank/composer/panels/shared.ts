/* Ce que deux panneaux ou plus partagent, et qu'aucun ne possède
   (frontend.md). Rien ici ne monte React : ce sont des chaînes et des
   fonctions pures. */
import type { SceneField } from '../../sceneChanges'

/** A field that differs from the saved scene wears a `--warn` border (design
    pass screen-7c). The value is never the only signal: the rail's own dot
    says the same thing at the section level. */
export const warnIf = (changed: Set<SceneField>, field: SceneField) =>
  changed.has(field) ? 'border-warn' : undefined

/** Column and block headings inside a panel — 10,5 px capitals, `--dim2`. */
export const HEAD =
  'lab'

/** A comma-separated field (`tones`, `tags`) read as a list, and written back
    as the same comma string the model has always carried. */
export const listOf = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export const listToText = (items: string[]) => items.join(', ')
