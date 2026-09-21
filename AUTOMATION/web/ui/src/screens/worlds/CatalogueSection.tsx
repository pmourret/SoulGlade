/* One catalog of a world, rendered: its list on the left, its inspector on
   the right. Presentation only — props and callbacks, no API call
   (`.claude/rules/frontend.md`).

   Rendered TWICE by `WorldPlacesScreen` since 21/09: once for the ordinary
   catalog, once for the adult one. The two differ by their data and by two
   strings, never by their behaviour, so they share this file instead of
   drifting apart. */
import { PlaceInspector } from './PlaceInspector'
import type { PlacePatch } from './useCatalogueEditor'
import type { Place } from './useWorldPlaces'

function PlaceRow({
  place,
  selected,
  onOpen,
}: {
  place: Place
  selected: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      className={`block w-full rounded-card border-2 bg-panel px-[13px] py-[10px] text-left cursor-pointer
                  hover:border-line2 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2
                  ${selected ? 'border-acc' : 'border-line'}`}
      onClick={onOpen}
      data-place-row
    >
      <b className="block truncate text-[13.5px] font-semibold">{place.label || place.id}</b>
      <span className="tiny">
        {place.id}
        {place.intention ? ` · ${place.intention}` : ''}
      </span>
    </button>
  )
}

export function CatalogueSection({
  places,
  worldLabel,
  emptyState,
  addLabel,
  editor,
}: {
  places: Place[] | null
  worldLabel: string
  /** What the column says when the catalog holds nothing yet. */
  emptyState: React.ReactNode
  addLabel: string
  editor: {
    selected: Place | null
    selectedId: string | null
    creatingNew: boolean
    saving: boolean
    status: string | null
    open: (id: string) => void
    add: () => void
    close: () => void
    save: (patch: PlacePatch) => Promise<void>
    remove: (id: string) => Promise<void>
  }
}) {
  return (
    <div
      className="grid gap-[22px] [align-items:start]
                 grid-cols-[minmax(0,320px)_minmax(320px,1fr)]
                 max-[900px]:grid-cols-[1fr]"
    >
      <div className="flex flex-col gap-[8px]">
        {places === null && <p className="tiny">chargement du catalogue…</p>}
        {places?.length === 0 && !editor.creatingNew && (
          <div className="empty px-[16px] py-[24px] text-[13px]">{emptyState}</div>
        )}
        {places?.map((place) => (
          <div key={place.id} className="flex items-center gap-[6px]">
            <div className="flex-1">
              <PlaceRow
                place={place}
                selected={!editor.creatingNew && editor.selectedId === place.id}
                onOpen={() => editor.open(place.id)}
              />
            </div>
            <button
              className="cursor-pointer border-none bg-transparent text-[16px] text-dim2
                         hover:text-bad focus-visible:outline-2 focus-visible:outline-focus
                         focus-visible:outline-offset-2"
              aria-label={`Retirer le lieu ${place.label || place.id}`}
              title="retirer ce lieu"
              onClick={() => void editor.remove(place.id)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded-card border-2 border-dashed border-line bg-transparent px-[13px] py-[10px]
                     text-left text-acc cursor-pointer hover:border-line2"
          onClick={editor.add}
        >
          {addLabel}
        </button>
      </div>

      <div>
        {editor.selected ? (
          <PlaceInspector
            place={editor.selected}
            worldLabel={worldLabel}
            saving={editor.saving}
            status={editor.status}
            idEditable={editor.creatingNew}
            onSave={editor.save}
            onClose={editor.close}
          />
        ) : (
          <div className="empty px-[16px] py-[24px] text-[13px]">
            Ouvre un lieu dans la liste, ou ajoutes-en un.
          </div>
        )}
      </div>
    </div>
  )
}
