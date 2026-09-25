/* Tiny renders of the real thing (design-pass screen-10 §S3 and §S5.2): the
   preset tiles and the layer rows both show what they WOULD look like,
   rather than a word.

   Shared by two files and owned by neither, so it lives in its own
   (frontend.md). Pure functions, no React: they take an image and a stack,
   they give back a data URL.

   MEASURED BEFORE BEING KEPT (2026-09-25): five 96 × 120 tiles cost 0,80 ms
   in Chromium, against the design-pass's own ~50 ms fallback threshold.
   There is therefore no fallback path here — a representative colour swatch
   for a real layer would have been code written for a case that does not
   happen. The ONE swatch below is not a fallback: a `reglage` layer has no
   image of its own, and drawing it as a copy of the photo would claim it
   contains one.

   It reuses `composeLayers` rather than a cheaper approximation: a tile
   that does not agree with the preview is worse than no tile. */
import { composeLayers, type Layer } from './photoEditorLayersPixels'

/** The whole stack, composed small. */
export function thumbDataUrl(
  image: CanvasImageSource, layers: readonly Layer[], width: number, height: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  composeLayers(ctx, width, height, image, layers)
  return canvas.toDataURL('image/png')
}

/** What one layer does to the average colour of the photo — the swatch a
    `reglage` layer wears instead of a picture. Eight by eight: an average
    needs no more, and the whole point is that it costs nothing. */
export function dominantColour(image: CanvasImageSource, layer: Layer): string {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 8
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'var(--panel2)'
  composeLayers(ctx, 8, 8, image, [{ ...layer, opacity: 100, visible: true }])
  const { data } = ctx.getImageData(0, 0, 8, 8)
  let r = 0
  let g = 0
  let b = 0
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const n = data.length / 4
  return `rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`
}
