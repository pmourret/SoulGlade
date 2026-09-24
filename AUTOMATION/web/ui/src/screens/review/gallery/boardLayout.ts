/* The Galerie board's arithmetic: what shape an image is, how images group,
   and how a row of them fills a width (design-pass screen-5c, §S3).

   PURE, AND WITH NO RUNTIME IMPORT. Nothing here touches React, the DOM or
   the API — and it deliberately declares its OWN minimal input shape rather
   than reading `GalleryItem` from `useTriage`. Two reasons, and both matter:
   a layout algorithm has no business depending on the API schema, and a file
   with no runtime import can be loaded by `node --experimental-strip-types`,
   which is what lets `AUTOMATION/tests/test_board_layout.js` test it without
   a bundler and without adding a test framework to the repo. */

/** The little a board needs to know about an image. */
export type BoardItem = {
  name: string
  scene?: string | null
  date?: string | null
  /** As `/api/gallery` writes it — see `ratioOf`, it is NOT always a ratio. */
  format?: string | null
  categorie?: string | null
}

/** 4:5 is the studio's default frame, and the fallback the design-pass asks
    for when a format cannot be read as one. */
export const DEFAULT_RATIO = 4 / 5

/* `format` IS NOT ALWAYS A RATIO, and that is the trap of this whole file.
   Measured on Léna's 46 kept images: `4:5` (26), `9:16` (13), `2:3` (3), but
   also `upscale` (2) and the empty string (2). `upscale` is a pipeline marker
   that landed in the same field. Parsing it as a ratio yields NaN, and a
   single NaN poisons the sum of a whole row, so every width on that line
   becomes NaN and the row disappears. We only accept two positive finite
   numbers around a colon; everything else is 4:5. */
export function ratioOf(format: string | null | undefined): number {
  const parts = String(format ?? '').split(':')
  if (parts.length !== 2) return DEFAULT_RATIO
  const w = Number.parseFloat(parts[0])
  const h = Number.parseFloat(parts[1])
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return DEFAULT_RATIO
  return w / h
}

export type PlacedItem<T> = { item: T; width: number; height: number }
export type Row<T> = { items: PlacedItem<T>[]; height: number }

/* JUSTIFICATION, the Lightroom kind: every image keeps its real ratio, and a
   row is stretched until it fills the width exactly.

   THE LAST ROW IS NOT STRETCHED. That is the one rule people get wrong: a
   trailing row holding one portrait, stretched to 1400 px, becomes a banner
   that says « this image matters more », which is false — it is just the last
   one. It keeps the target height, and is only ever scaled DOWN, never up. */
export function justifyRows<T extends BoardItem>(
  items: T[],
  width: number,
  targetHeight: number,
  gap: number,
): Row<T>[] {
  /* A `ResizeObserver` fires once before the element has a layout, and a
     negative width would produce negative heights that render as nothing at
     all rather than as an obvious fault. An empty board is the honest answer
     until a real width arrives. */
  if (!items.length || !(width > 0) || !(targetHeight > 0)) return []

  const rows: Row<T>[] = []
  let current: T[] = []
  let ratioSum = 0

  const close = (list: T[], sum: number, stretch: boolean): Row<T> => {
    const available = width - gap * (list.length - 1)
    const exact = available / sum
    /* Stretch fills the row; the last row keeps `targetHeight` unless it
       would overflow, in which case it is reduced to fit — the same
       arithmetic, used as a ceiling instead of as a target. */
    const height = stretch ? exact : Math.min(targetHeight, exact)
    return {
      height,
      items: list.map((item) => ({
        item,
        height,
        width: ratioOf(item.format) * height,
      })),
    }
  }

  for (const item of items) {
    const ratio = ratioOf(item.format)
    const nextSum = ratioSum + ratio
    const nextWidth = nextSum * targetHeight + gap * current.length
    /* `current.length > 0`: an image that is on its own too wide for the
       container still gets its row, scaled down by `close`, rather than an
       empty row followed by an overflow. */
    if (current.length > 0 && nextWidth > width) {
      rows.push(close(current, ratioSum, true))
      current = [item]
      ratioSum = ratio
      continue
    }
    current.push(item)
    ratioSum = nextSum
  }
  if (current.length) rows.push(close(current, ratioSum, false))
  return rows
}

export type GroupBy = 'intention' | 'scene' | 'date'
export type Group<T> = { key: string; label: string; items: T[] }

/** The day of a `date` as `/api/gallery` writes it (« 23/09 16:02 »). */
export const dayOf = (date: string | null | undefined): string =>
  String(date ?? '').split(' ')[0] || 'sans date'

/* GROUPING IS ENTIRELY CLIENT-SIDE (design-pass §S2): nothing is asked of the
   server, so a grouping can be added or changed without a route.

   `intentions` is the map the caller resolved from the scene bank
   (`bank.meta[scene].intention`); an image whose scene is no longer in the
   bank falls back on the `categorie` the gallery item carries itself, then on
   « Sans intention ». Order: the groups come back sorted by their most recent
   item, so the newest work is at the top whatever the key. */
export function groupBy<T extends BoardItem>(
  items: T[],
  by: GroupBy,
  intentions: Record<string, string | undefined>,
): Group<T>[] {
  const keyOf = (item: T): string => {
    if (by === 'scene') return item.scene || 'sans scène'
    if (by === 'date') return dayOf(item.date)
    return intentions[item.scene ?? ''] || item.categorie || 'Sans intention'
  }
  const order: string[] = []
  const buckets = new Map<string, T[]>()
  items.forEach((item) => {
    const key = keyOf(item)
    if (!buckets.has(key)) {
      buckets.set(key, [])
      order.push(key)
    }
    buckets.get(key)!.push(item)
  })
  /* `items` already arrives newest first, so first appearance IS most recent:
     no second sort, and no date parsing of a string whose shape the server
     owns. */
  return order.map((key) => ({ key, label: key, items: buckets.get(key)! }))
}

/* THE ZONE A PLATFORM OFTEN COVERS, as a rough marker and nothing more.
   These are not measurements: no interface is reproduced, no icon, no avatar,
   no button (design-pass §S4). They say « do not put the face here », which
   is the only thing a framing preview has to say. The panel prints that they
   are markers, so the number is never read as a fact. */
export const SAFE_ZONES: Record<string, { top: number; bottom: number }> = {
  feed: { top: 0, bottom: 0.16 },
  story: { top: 0.14, bottom: 0.2 },
}

export const FRAMES: Record<string, { label: string; ratio: number }> = {
  feed: { label: 'Feed', ratio: 4 / 5 },
  story: { label: 'Story', ratio: 9 / 16 },
}
