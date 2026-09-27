/* The centre of the asset library (design-pass screen-assets §S3, §S5):
   a 40 px head saying what is open and where its fragments go, the cards,
   the card of the import in flight, and ALWAYS a drop cell last.
   Presentation only.

   THE CARD SHOWS THE FRAGMENT. It is the text the asset puts in a prompt, and
   a card that showed only a file name hid the one thing the workshop is for
   (constat 3, 27/09).

   THE IMPORT IN FLIGHT IS A CARD, where the asset will appear, and not a band
   at the top of the list: measured on 27/09, the band sat 551 px from the
   slot the card then took, and pushed the whole grid down by 40 px while it
   lasted. It keeps the band's id, `#assetImportBand`. */
import { Icon } from '../../../chrome/Icon'
import type { AssetEntry } from './useAssetLibrary'

type DropHandlers = { onDragOver: React.DragEventHandler; onDrop: React.DragEventHandler }

const OFFLINE_RESULT =
  "L'image est gardée. ComfyUI est hors ligne : « Analyser l'image » écrira le fragment quand il reviendra."

export function AssetGrid({
  title, subtitle, rows, selected, busyKeys, srcOf, onSelect, pending, justImported, comfy,
  libraryEmpty, importLabel, onPickFile, gridDrop, cellDrop, cellDropText, gridOver, busy, narrow,
}: {
  title: string
  subtitle: string
  rows: AssetEntry[]
  selected: string | null
  busyKeys: ReadonlySet<string>
  srcOf: (key: string) => string
  onSelect: (key: string) => void
  /** The file being imported, with its local preview. */
  pending: { name: string; url: string } | null
  /** The last asset imported, to say on ITS card why it has no fragment. */
  justImported: string | null
  comfy: boolean
  libraryEmpty: boolean
  /** The class a file dropped here enters as, or null when it is asked. */
  importLabel: string | null
  onPickFile: () => void
  gridDrop: DropHandlers
  cellDrop: DropHandlers
  /** What the drop cell says while a file hovers it. */
  cellDropText: string | null
  /** True while a file hovers the grid itself, outside the cell. */
  gridOver: boolean
  busy: boolean
  narrow: boolean
}) {
  const empty = !rows.length && !pending
  const cellHint = importLabel
    ? `Elle entre comme ${importLabel.toLowerCase()}. PNG, JPEG ou WebP, 20 Mo au plus.`
    : 'La classe se choisit au relâcher. PNG, JPEG ou WebP, 20 Mo au plus.'

  return (
    <section className="relative flex min-h-0 min-w-0 flex-col" aria-label={title} {...gridDrop}>
      <div className="flex h-[40px] flex-none items-baseline gap-[10px] px-[16px] pt-[12px]">
        <h2 className="m-0 text-[14px] font-[650]">{title}</h2>
        <span className="tiny min-w-0 truncate">{subtitle}</span>
      </div>

      <ul
        className={`m-0 grid min-h-0 flex-1 list-none content-start gap-[12px] overflow-y-auto p-[16px] ${
          narrow ? 'grid-cols-[repeat(auto-fill,minmax(160px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(180px,1fr))]'}`}
      >
        {rows.map((asset) => (
          <li key={asset.key}>
            <button
              type="button"
              className={`flex w-full flex-col gap-[6px] rounded-card border-2 bg-panel p-[8px] text-left ${
                asset.key === selected ? 'border-txt' : 'border-line'}`}
              data-asset={asset.key}
              aria-pressed={asset.key === selected}
              disabled={busyKeys.has(asset.key)}
              onClick={() => onSelect(asset.key)}
            >
              <img
                className="aspect-square w-full rounded-[6px] bg-black object-cover"
                src={srcOf(asset.key)}
                alt=""
                loading="lazy"
              />
              <span className="flex min-w-0 items-center gap-[6px]">
                <span className="min-w-0 flex-1 truncate text-[13px]">{asset.label || asset.key}</span>
                {asset.couche !== 'personnage' && (
                  <span className="flex-none rounded-pill border border-line px-[6px] text-[11px] text-dim2">
                    {asset.couche === 'monde' ? 'monde' : 'ajusté'}
                  </span>
                )}
              </span>
              {asset.fragment ? (
                <span className="line-clamp-2 font-code text-[12px] text-dim">{asset.fragment}</span>
              ) : (
                <span className="flex items-center gap-[4px] text-[12px] text-warn-txt">
                  <Icon name="warn" className="h-[12px] w-[12px] flex-none" aria-hidden="true" />
                  sans fragment · à analyser
                </span>
              )}
              {asset.key === justImported && !asset.fragment && !comfy && (
                <span className="tiny">{OFFLINE_RESULT}</span>
              )}
            </button>
          </li>
        ))}

        {pending && (
          <li>
            <div className="flex flex-col gap-[6px] rounded-card border-2 border-line bg-panel p-[8px]"
                 role="status" id="assetImportBand">
              <img className="aspect-square w-full rounded-[6px] bg-black object-cover opacity-60"
                   src={pending.url} alt="" />
              <span className="truncate text-[13px]">{pending.name}</span>
              <span className="text-[12px] text-dim">Lecture de l'image par le modèle local… quelques secondes</span>
              <progress className="block h-[3px] w-full" aria-hidden="true" />
            </div>
          </li>
        )}

        {/* THE LAST CELL IS ALWAYS A DROP CELL: the gesture the screen asks
            for is shown where its result will land, not only once a file is
            already being dragged. Empty, it is the whole state. */}
        <li className={empty ? 'col-span-full' : ''}>
          <button
            type="button"
            data-asset-drop
            id={empty ? 'assetsEmpty' : undefined}
            /* aria-disabled and not `disabled`: a disabled control receives
               no drag event, and the second drop has to be refused IN WORDS on
               the cell it lands on (§S5). */
            aria-disabled={busy}
            onClick={() => !busy && onPickFile()}
            {...cellDrop}
            className={`flex w-full flex-col items-center justify-center gap-[6px] rounded-card border-2 border-dashed
                        bg-transparent p-[16px] text-center ${
              cellDropText ? 'border-acc' : 'border-line2 hover:border-dim2'} ${
              empty ? 'min-h-[220px]' : 'aspect-square'}`}
          >
            {cellDropText ? (
              <b className="text-[13px]" aria-live="polite">{cellDropText}</b>
            ) : (
              <>
                <b className="text-[13px]">
                  {empty && !libraryEmpty ? 'Aucun asset de cette classe.' : 'Déposer une image'}
                </b>
                <span className="tiny max-w-[420px]">
                  {empty && libraryEmpty
                    ? "Déposez une image ici, ou utilisez le bouton d'import. Le fragment de prompt est lu sur l'image, et le composeur va le chercher là où sa classe le pose."
                    : cellHint}
                </span>
              </>
            )}
          </button>
        </li>
      </ul>

      {gridOver && (
        <div
          className="pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-center gap-[8px]
                     border-2 border-dashed border-acc bg-bg/90 text-center"
          aria-live="polite"
        >
          {busy ? (
            <b className="text-[17px]">Un import est déjà en cours</b>
          ) : (
            <>
              <b className="text-[17px]">
                {importLabel ? `Relâcher : importer comme ${importLabel.toLowerCase()}` : 'Relâcher : choisir la classe'}
              </b>
              <span className="text-[12.5px] text-dim">
                {comfy
                  ? "L'image est gardée, et le modèle local en écrit le fragment de prompt"
                  : "L'image est gardée. ComfyUI est hors ligne : l'asset entrera sans fragment, à analyser plus tard"}
              </span>
            </>
          )}
        </div>
      )}
    </section>
  )
}
