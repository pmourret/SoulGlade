/* Where a class's fragment lands — THE one table of the asset screen
   (design-pass screen-assets §S2).

   Keyed by the scene FIELD a class feeds (`champ` of `/api/assets`), never by
   the class itself (invariant 7): a class the server adds with an existing
   field is described without a line here, and one with a new field falls back
   to the library-only sentence rather than to nothing. */
import type { AssetClass } from './useAssetLibrary'

const BY_FIELD: Record<string, { short: string; long: string }> = {
  wardrobe: {
    short: 'onglet Vêtements, tenues',
    long: "leur fragment se pose dans l'onglet Vêtements du composeur, ou dans une tenue",
  },
  prompt: {
    short: 'Scène et lieu',
    long: 'leur fragment se pose dans « Scène et lieu » du composeur',
  },
}

const LIBRARY_ONLY = { short: 'bibliothèque seule', long: 'gardés dans la bibliothèque, sans destination dans le composeur' }

export const destinationOf = (field: string | null | undefined) => BY_FIELD[field ?? ''] ?? LIBRARY_ONLY

// ponytail: French plural by a trailing « s », true of the three server
// classes; a `label_pluriel` on `/api/assets` the day a class contradicts it.
export const pluralOf = (label: string) => (label.endsWith('s') ? label : `${label}s`)

/** The open entry of the class column: a class key, or one of two views. */
export type OpenClass = 'all' | 'unfragmented' | string

export const ALL = 'all'
export const UNFRAGMENTED = 'unfragmented'

/** The class an import enters as when `open` is shown, or null when it has
    to be asked (« Toutes », « Sans fragment »). */
export const importClassOf = (open: OpenClass, classes: AssetClass[]) =>
  classes.find((c) => c.key === open) ?? null
