/* Where a piece of an outfit is worn (design-pass tenues, table T of
   `DOCS/design-pass/screen-tenues.md`). The only table of the screen; the
   server holds the same keys (`tenues.EMPLACEMENTS`), and test_tenues.py
   checks that the two lists are identical.

   THE ORDER IS THE PROMPT'S, from the most visible to the most discreet:
   garments (1-6), underwear (7-8), details (9-16). An underwear worn under a
   shirt does not come before it; worn alone, it still reads.

   NO SLOT IS GENDERED, and the words only PROPOSE: any garment may go on any
   slot. Pure and import-free: `AUTOMATION/tests/test_outfit_slots.js`
   imports it as source under Node. */

export type ZoneKey = 'head' | 'neck' | 'torso' | 'arms' | 'legs' | 'feet' | 'carried'

export type Slot = {
  key: string
  label: string
  zone: ZoneKey
  /** Several pieces at once (earrings, rings); otherwise posing replaces. */
  many: boolean
  /** Whole words of a fragment that propose this slot. */
  words: string[]
}

export const SLOTS: Slot[] = [
  { key: 'onepiece', label: 'Une pièce', zone: 'torso', many: false,
    words: ['dress', 'jumpsuit', 'one-piece swimsuit', 'romper'] },
  { key: 'top', label: 'Haut', zone: 'torso', many: false,
    words: ['shirt', 'blouse', 't-shirt', 'sweater', 'tank top', 'bodysuit'] },
  { key: 'outer', label: 'Par-dessus', zone: 'torso', many: false,
    words: ['jacket', 'coat', 'blazer', 'trench', 'cardigan'] },
  { key: 'bottom', label: 'Bas', zone: 'legs', many: false,
    words: ['jeans', 'trousers', 'pants', 'skirt', 'shorts'] },
  { key: 'legwear', label: 'Jambes', zone: 'legs', many: false,
    words: ['tights', 'stockings', 'socks', 'leggings'] },
  { key: 'feet', label: 'Pieds', zone: 'feet', many: false,
    words: ['shoes', 'boots', 'sandals', 'loafers', 'sneakers', 'heels'] },
  { key: 'under_top', label: 'Dessous haut', zone: 'torso', many: false,
    words: ['bra', 'bralette', 'sports bra', 'bikini top', 'undershirt'] },
  { key: 'under_bottom', label: 'Dessous bas', zone: 'legs', many: false,
    words: ['panties', 'thong', 'briefs', 'boxer briefs', 'swim trunks'] },
  { key: 'head', label: 'Couvre-chef', zone: 'head', many: false,
    words: ['hat', 'cap', 'beanie', 'headband'] },
  { key: 'eyes', label: 'Lunettes', zone: 'head', many: false,
    words: ['glasses', 'sunglasses'] },
  { key: 'ears', label: 'Oreilles', zone: 'head', many: true,
    words: ['earrings', 'studs', 'hoops'] },
  { key: 'neck', label: 'Cou', zone: 'neck', many: true,
    words: ['necklace', 'scarf', 'tie', 'choker'] },
  { key: 'waist', label: 'Taille', zone: 'legs', many: false,
    words: ['belt', 'garter belt'] },
  { key: 'hands', label: 'Mains', zone: 'arms', many: true,
    words: ['gloves', 'rings'] },
  { key: 'wrists', label: 'Poignets', zone: 'arms', many: true,
    words: ['watch', 'bracelet'] },
  { key: 'carried', label: 'Porté', zone: 'carried', many: true,
    words: ['bag', 'handbag', 'backpack', 'umbrella'] },
]

/** The seven body zones, in the keyboard's order (top to bottom). */
export const ZONES: { key: ZoneKey; label: string }[] = [
  { key: 'head', label: 'Tête' },
  { key: 'neck', label: 'Cou' },
  { key: 'torso', label: 'Buste' },
  { key: 'arms', label: 'Bras et mains' },
  { key: 'legs', label: 'Taille et jambes' },
  { key: 'feet', label: 'Pieds' },
  { key: 'carried', label: 'Porté' },
]

const ORDER = new Map(SLOTS.map((slot, index) => [slot.key, index]))

export const slotOf = (key: string | null | undefined) => SLOTS.find((slot) => slot.key === key) ?? null
/** 1-based: the number shown next to a slot is its place in the prompt. */
export const slotNumber = (key: string) => (ORDER.get(key) ?? -1) + 1
export const slotsOfZone = (zone: ZoneKey) => SLOTS.filter((slot) => slot.zone === zone)
export const zoneLabel = (zone: ZoneKey) => ZONES.find((z) => z.key === zone)?.label ?? zone

const escape = (word: string) => word.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&')

/** The slot a fragment proposes, by a whole word of the table, case ignored
    (the rule of `lightWordsIn`). The first slot of the table wins: « t-shirt
    dress » is a one-piece. `null` when no word is there. */
export function proposeSlot(fragment: string): { slot: string; word: string } | null {
  const lower = (fragment ?? '').toLowerCase()
  for (const slot of SLOTS) {
    /* The longest word first, so « boxer briefs » is named rather than
       « briefs » — same slot either way, only the word shown changes. */
    const words = [...slot.words].sort((a, b) => b.length - a.length)
    for (const word of words)
      if (new RegExp(`\\b${escape(word)}\\b`).test(lower)) return { slot: slot.key, word }
  }
  return null
}

/** Pieces in the order of the prompt: by slot, the posing order kept within a
    slot (stable), and the pieces without a slot at the end in their original
    order — so an outfit composed before the slots comes out unchanged. */
export function sortPieces<P extends { slot?: string | null }>(pieces: P[]): P[] {
  const rank = (piece: P) => (piece.slot && ORDER.has(piece.slot) ? ORDER.get(piece.slot)! : SLOTS.length)
  return pieces
    .map((piece, index) => ({ piece, index }))
    .sort((a, b) => rank(a.piece) - rank(b.piece) || a.index - b.index)
    .map(({ piece }) => piece)
}
