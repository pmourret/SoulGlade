/* Diff de texte, en deux passes : les lignes, puis les mots des lignes
   appariées. Sert le panneau JSON du composeur de scène (design-pass
   screen-7c §7) et la comparaison Actuel / Proposé de l'amélioration IA (§6).

   POURQUOI PAS UNE DÉPENDANCE. `diff` ou `jsdiff` rendraient le même service,
   et davantage — patchs unifiés, diff de structures, de mots avec
   normalisation Unicode. Ce qui est utilisé ici tient en une table LCS sur
   deux entrées d'au plus quelques dizaines de lignes : le JSON d'UNE scène
   contre lui-même. La règle du dépôt (frontend.md) est de ne pas ajouter de
   dépendance pour ce que quelques lignes font, et une dépendance de rendu
   arrive avec sa surface d'API, ses types et ses mises à jour.

   PUR ET SANS REACT : il se lit et se teste sans monter un composant
   (`AUTOMATION/tests/test_diff.js`), comme `runSummary.ts` ou
   `boardLayout.ts` avant lui. */

/** One line of the comparison. `a` and `b` are 1-based line numbers in the
    before/after texts, so a renderer can print both gutters without
    recounting. */
export type Row =
  | { kind: 'same'; a: number; b: number; text: string }
  | { kind: 'del'; a: number; text: string }
  | { kind: 'add'; b: number; text: string }
  /** A line present on both sides but rewritten: the two versions travel
      together so the renderer can put them face to face and ask `diffWords`
      what moved inside. */
  | { kind: 'mod'; a: number; b: number; before: string; after: string }

/** A run of characters, said to be untouched, removed or added. */
export type Span = { kind: 'same' | 'del' | 'add'; text: string }

/* ponytail: table LCS naïve, O(n·m) en temps et en mémoire. Le domaine est le
   JSON d'une scène (quelques dizaines de lignes) et deux fragments de prompt ;
   à ces tailles, c'est instantané et c'est la version qu'on relit sans notes.
   Si un jour cette fonction voit un document entier, passer à Myers. */
function lcs<T>(a: T[], b: T[], same: (x: T, y: T) => boolean): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  )
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = same(a[i], b[j])
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  return table
}

/** The raw walk: same / del / add, in reading order, no pairing yet. */
function walk<T>(a: T[], b: T[], same: (x: T, y: T) => boolean) {
  const table = lcs(a, b, same)
  const out: { kind: 'same' | 'del' | 'add'; value: T; a?: number; b?: number }[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (same(a[i], b[j])) {
      out.push({ kind: 'same', value: a[i], a: i, b: j })
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ kind: 'del', value: a[i], a: i })
      i++
    } else {
      out.push({ kind: 'add', value: b[j], b: j })
      j++
    }
  }
  while (i < a.length) out.push({ kind: 'del', value: a[i], a: i++ })
  while (j < b.length) out.push({ kind: 'add', value: b[j], b: j++ })
  return out
}

/* Two lines are "the same line rewritten" rather than one removed and one
   added when they sit in the same run and start the same way. The JSON of a
   scene is one key per line, so the key is what decides: `"prompt": "a"` and
   `"prompt": "b"` are the same line, `"pose": …` and `"tags": …` are not.
   Without this the panel would show every edit as a deletion plus an
   addition, and word-level highlighting would have nothing to work on. */
function pairs(before: string, after: string): boolean {
  const key = (line: string) => line.match(/^\s*"([^"]+)"\s*:/)?.[1] ?? null
  const ka = key(before)
  const kb = key(after)
  if (ka !== null || kb !== null) return ka === kb
  // Not JSON (a prompt fragment, a free line): same leading word is enough.
  return before.trim().split(/\s+/)[0] === after.trim().split(/\s+/)[0]
}

/** Line-level comparison, with deletion/addition runs paired into `mod` rows
    where the two lines are recognisably the same line rewritten. */
export function diffLines(before: string[], after: string[]): Row[] {
  const raw = walk(before, after, (x, y) => x === y)
  const rows: Row[] = []
  for (let k = 0; k < raw.length; k++) {
    const step = raw[k]
    if (step.kind === 'same') {
      rows.push({ kind: 'same', a: step.a! + 1, b: step.b! + 1, text: step.value })
      continue
    }
    /* A run of deletions immediately followed by a run of additions is where
       a rewrite hides. Both runs are collected, then paired index by index —
       any leftover on either side stays a plain del/add. */
    if (step.kind === 'del') {
      const dels: typeof raw = []
      while (k < raw.length && raw[k].kind === 'del') dels.push(raw[k++])
      const adds: typeof raw = []
      while (k < raw.length && raw[k].kind === 'add') adds.push(raw[k++])
      k--
      const n = Math.min(dels.length, adds.length)
      let paired = 0
      while (paired < n && pairs(dels[paired].value, adds[paired].value)) {
        rows.push({
          kind: 'mod',
          a: dels[paired].a! + 1,
          b: adds[paired].b! + 1,
          before: dels[paired].value,
          after: adds[paired].value,
        })
        paired++
      }
      dels.slice(paired).forEach((d) => rows.push({ kind: 'del', a: d.a! + 1, text: d.value }))
      adds.slice(paired).forEach((x) => rows.push({ kind: 'add', b: x.b! + 1, text: x.value }))
      continue
    }
    rows.push({ kind: 'add', b: step.b! + 1, text: step.value })
  }
  return rows
}

/* Whitespace travels WITH the tokens rather than being dropped: the two sides
   have to render back to the original strings character for character, or a
   diff of an indented JSON line would lose its indentation on screen.

   PUNCTUATION IS ITS OWN TOKEN, and that is not cosmetic. Splitting on
   whitespace alone makes « kitchen » and « kitchen, » two different words, so
   appending a fragment to a prompt marks the LAST WORD OF THE OLD TEXT as
   removed — measured on the real case, « a sunlit kitchen » becoming « a
   sunlit kitchen, golden hour ». The eye then looks for what was lost, and
   nothing was. Same story for a JSON line, which is mostly quotes and colons. */
const tokens = (text: string) =>
  text.split(/(\s+|[,.;:!?"'{}[\]()])/).filter((piece) => piece !== '' && piece !== undefined)

/** Word-level comparison of two lines, as two independent runs of spans: what
    the before side shows (same + del) and what the after side shows
    (same + add). Concatenating either side's `text` gives back its line. */
export function diffWords(before: string, after: string): { before: Span[]; after: Span[] } {
  const raw = walk(tokens(before), tokens(after), (x, y) => x === y)
  const left: Span[] = []
  const right: Span[] = []
  /* Adjacent spans of the same kind are merged: « a » « b » « c » removed in
     a row is ONE strike-through, not three. */
  const push = (into: Span[], kind: Span['kind'], text: string) => {
    const last = into[into.length - 1]
    if (last && last.kind === kind) last.text += text
    else into.push({ kind, text })
  }
  for (const step of raw) {
    if (step.kind === 'same') {
      push(left, 'same', step.value)
      push(right, 'same', step.value)
    } else if (step.kind === 'del') {
      push(left, 'del', step.value)
    } else {
      push(right, 'add', step.value)
    }
  }
  return { before: left, after: right }
}

/** How many lines each side gains and loses — the `+N` / `−N` of the header. */
export function countChanges(rows: Row[]): { added: number; removed: number; changed: number } {
  let added = 0
  let removed = 0
  let changed = 0
  for (const row of rows) {
    if (row.kind === 'add') added++
    else if (row.kind === 'del') removed++
    else if (row.kind === 'mod') {
      changed++
      added++
      removed++
    }
  }
  return { added, removed, changed }
}
