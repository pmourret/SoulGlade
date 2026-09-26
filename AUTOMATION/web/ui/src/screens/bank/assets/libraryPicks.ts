/* What a composer panel needs of an asset, and nothing else (IT-10 chantier 5).

   THE COMPOSER PULLS, THE LIBRARY DOES NOT PUSH. A panel offers the assets
   whose fragment lands in the field IT edits — the gesture of the pose
   selector next door. Pushing from `/bank/assets` would need a scene open on
   the other screen, and would be a second way of doing the same thing.

   A PANEL NEVER NAMES A CLASS. It filters on `champ`, the model field it
   writes and already owns; which class lands in which field is said once, by
   the server's own table (`AUTOMATION/assets.py / CLASSES`, invariant 7). A
   class added there reaches the right panel without a line changing here.

   Shared by `BankScreen` (which builds the list, being the one with an API
   caller) and by the panels (which only show it), owned by neither — so it
   lives on its own (frontend.md). The panels get `src` already built rather
   than an image URL to assemble. */
import type { AssetClass, AssetEntry } from './useAssetLibrary'

export type LibraryPick = {
  key: string
  label: string
  /** The prompt fragment. EMPTY is a real state: the vision model was offline
      or silent at import. Such an asset is shown and NOT offered — hiding it
      would lose track of the image the user just brought in. */
  fragment: string
  /** The scene field this asset's class lands in, `null` for a class with no
      destination yet (a plain reference). */
  champ: string | null
  src: string
}

export function libraryPicks(
  assets: AssetEntry[],
  classes: AssetClass[],
  srcOf: (key: string) => string,
): LibraryPick[] {
  const champs = new Map(classes.map((c) => [c.key, c.champ ?? null]))
  return assets.map((asset) => ({
    key: asset.key,
    label: asset.label || asset.key,
    fragment: asset.fragment ?? '',
    champ: champs.get(asset.classe) ?? null,
    src: srcOf(asset.key),
  }))
}
