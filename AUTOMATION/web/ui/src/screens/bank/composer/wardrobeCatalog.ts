/* The wardrobe text of a scene, level by level. The static starter chips that
   lived here (a beige knit sweater, light blue denim jeans…) are gone since
   IT-10 chantier 6: the Vêtements catalogue shows what the server holds — the
   character's outfits and the garments of its asset library — and nothing
   written into the frontend (`DOCS/cadrage/2026-09-26-it10-c6-tenues.md`).
   What remains is the round trip between the flat "N: description" text of a
   draft and the four level fields. A line may be an outfit reference
   (`@<key>`); these helpers carry it like any other line. */
/** The 4 levels the composer edits as separate fields (design pass écran 7,
    §V2) — `wardrobe_for` (backend) reads whichever of these a scene
    declares, walking down to the first non-empty one it finds. */
export const WARDROBE_LEVELS = [0, 1, 2, 3] as const

/** Splits the flat "N: description" wardrobe text (`draft.wardrobe`, one
    outfit per line) into one text block per level, prefix stripped — what
    each of `ClothingPanel`'s 4 fields shows. A line that does not parse as
    "0-3: description" lands in `extra` rather than being dropped: it may
    already be malformed via the Recap tab's raw mirror field
    (`PromptField` on `wardrobe_recap`, same underlying state), and a visit
    to this panel must not silently erase it — same "never lose an outfit in
    silence" rule `invalidOutfits` enforces at save time. */
export function splitWardrobeByLevel(text: string): { byLevel: Record<number, string>; extra: string[] } {
  const grouped: Record<number, string[]> = {}
  const extra: string[] = []
  ;(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/^([0-3])\s*:\s*(.+)$/)
      if (match) {
        const level = Number(match[1])
        ;(grouped[level] ??= []).push(match[2].trim())
      } else {
        extra.push(line)
      }
    })
  const byLevel: Record<number, string> = {}
  WARDROBE_LEVELS.forEach((level) => {
    byLevel[level] = (grouped[level] ?? []).join('\n')
  })
  return { byLevel, extra }
}

/** Inverse of `splitWardrobeByLevel`: one "N: description" line per non-empty
    line of each level field, level order first, any unparsed leftover last
    (never dropped) — the same syntax `textToWardrobe`
    (ScenesStoreContext.tsx) reads back into the scene's `wardrobe` object. */
export function joinWardrobeByLevel(byLevel: Record<number, string>, extra: string[] = []): string {
  const lines = WARDROBE_LEVELS.flatMap((level) =>
    (byLevel[level] ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `${level}: ${line}`),
  )
  return [...lines, ...extra].join('\n')
}
