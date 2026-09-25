/* The registry's search (design-pass screen-14 §S2): client side, over the four
   things a row shows — name, id, type, world label.

   A FUNCTION, NOT A HOOK (`.claude/rules/frontend.md`): tested without React,
   `AUTOMATION/tests/test_character_filter.js`.

   Accents are folded on both sides: « lena » must find « Léna », the name one
   types from memory rather than the one written on the sheet. */

export type FilterableCharacter = {
  id: string
  name: string
  type: string
  world?: { label: string } | null
}

const fold = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function filterCharacters<T extends FilterableCharacter>(rows: T[], query: string): T[] {
  const needle = fold(query.trim())
  if (!needle) return rows
  return rows.filter((row) =>
    [row.name, row.id, row.type, row.world?.label ?? ''].some((field) => fold(field).includes(needle)),
  )
}
