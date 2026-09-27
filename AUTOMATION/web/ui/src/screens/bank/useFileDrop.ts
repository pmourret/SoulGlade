/* Drag-and-drop of ONE image file onto a bank view — the pose table
   (design-pass screen-7d §S4), the asset library since IT-10 chantier 5.

   SHARED BY TWO SUB-VIEWS AND OWNED BY NEITHER, so it lives here rather than
   in one of them (frontend.md). Nothing in it was pose-specific: only the
   drag state and the type filter, both the same for a photo to extract and
   for an asset to import.

   IT SENDS NOTHING ITSELF. The whole point of the section is « on appelle LA
   MÊME fonction extract() que le bouton » — a second upload path would be a
   second place to keep the base64-in-JSON contract (api/security.py) and the
   "the photo is never kept" promise true. This hook owns the drag STATE and
   the type filter; `extract` is handed to it.

   THE COUNTER. `dragenter`/`dragleave` fire for every child the pointer
   crosses, so a plain boolean flickers off the moment the cursor passes from
   the table onto a row. Counting enters minus leaves is the usual answer and
   the only one that does not need a timer.

   SEVERAL TARGETS, ONE COUNTER (design-pass screen-assets §S4). The asset
   library drops onto a class row, the grid, a drop cell inside the grid — each
   one says which class the file enters as. The counter stays on `handlers`,
   laid on the common ancestor; a target only takes `dragover` and `drop`, and
   stops them there. `dragover` repeats on the innermost element under the
   pointer, so the innermost target is the one `overTarget` names, and a cell
   nested in the grid is never counted twice. The pose table uses `handlers`
   alone, as before. */
import { useCallback, useRef, useState } from 'react'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

export function useFileDrop<T = undefined>({
  enabled, extract, onRefused,
}: {
  /** False while an extraction runs or ComfyUI is offline — the overlay then
      still SHOWS (it explains why), but a drop does nothing. */
  enabled: boolean
  /** What the button next to the drop zone calls too — never a second
      upload path (that is the whole point of the section). */
  extract: (file: File, target?: T) => void | Promise<void>
  onRefused: (message: string) => void
}) {
  const [over, setOver] = useState(false)
  const [overTarget, setOverTarget] = useState<T | undefined>(undefined)
  const depth = useRef(0)

  const carriesFiles = (event: React.DragEvent) =>
    Array.from(event.dataTransfer.types).includes('Files')

  const onDragEnter = useCallback((event: React.DragEvent) => {
    if (!carriesFiles(event)) return
    depth.current += 1
    setOver(true)
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!carriesFiles(event)) return
    // Without this the browser navigates to the dropped file instead.
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    // Reached only outside every target: they stop their own `dragover`.
    setOverTarget(undefined)
  }, [])

  const onDragLeave = useCallback(() => {
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) {
      setOver(false)
      setOverTarget(undefined)
    }
  }, [])

  const take = useCallback(
    (event: React.DragEvent, target: T | undefined) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth.current = 0
      setOver(false)
      setOverTarget(undefined)
      if (!enabled) return
      const file = event.dataTransfer.files[0]
      if (!file) return
      if (!ACCEPTED.includes(file.type)) {
        onRefused(`format non pris en charge : ${file.type || 'inconnu'} — PNG, JPEG ou WebP`)
        return
      }
      void extract(file, target)
    },
    [enabled, extract, onRefused],
  )

  const onDrop = useCallback((event: React.DragEvent) => take(event, undefined), [take])

  /** `dragover` and `drop` of ONE target: the file enters as `target`. */
  const targetHandlers = (target: T) => ({
    onDragOver: (event: React.DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'copy'
      setOverTarget(target)
    },
    onDrop: (event: React.DragEvent) => {
      event.stopPropagation()
      take(event, target)
    },
  })

  return { over, overTarget, targetHandlers, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } }
}
