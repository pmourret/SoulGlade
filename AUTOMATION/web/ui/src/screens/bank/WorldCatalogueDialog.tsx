/* « Ajouter depuis le catalogue du monde » — the places the character's world
   offers and its bank does not hold yet. Presentation only: props and one
   callback, no API call (`.claude/rules/frontend.md`).

   Ordinary places first, adult ones after and only when `useWorldCatalogue`
   allowed them — an unarmed character gets no adult section at all, not a
   greyed one. Picking a place adds it and closes the box; the bench opens
   what it created, the same rule as « + nouvelle scène ». */
import { Dialog } from '../../chrome/Dialog'
import type { Place } from '../worlds/useWorldPlaces'

function PlacePick({
  place,
  adult,
  onPick,
}: {
  place: Place
  adult: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      className="block w-full rounded-card border-2 border-line bg-panel px-[13px] py-[9px] text-left
                 cursor-pointer hover:border-line2 focus-visible:outline-2 focus-visible:outline-focus
                 focus-visible:outline-offset-2"
      onClick={onPick}
      data-pick-place={place.id}
      data-adult={adult ? '1' : undefined}
    >
      <b className="block truncate text-[13.5px] font-semibold">{place.label || place.id}</b>
      <span className="tiny">
        {place.id}
        {place.intention ? ` · ${place.intention}` : ''}
      </span>
    </button>
  )
}

export function WorldCatalogueDialog({
  worldLabel,
  ordinary,
  adult,
  adultAllowed,
  adultNotice,
  nativeLevel,
  loading,
  error,
  onPick,
  onClose,
}: {
  worldLabel: string
  ordinary: Place[]
  adult: Place[]
  adultAllowed: boolean
  adultNotice: string | null
  nativeLevel: number | null
  loading: boolean
  error: string | null
  onPick: (place: Place, adult: boolean) => void
  onClose: () => void
}) {
  const nothing = !loading && ordinary.length === 0 && adult.length === 0
  return (
    <Dialog
      id="worldCatalogueBox"
      open
      /* The picks arrive after the box opens: until then the only focusable
         thing is « Fermer », where Enter would close what was just opened.
         Changing the selector re-runs the focus once the list is there. */
      initialFocus={loading ? undefined : '[data-pick-place]'}
      onDismiss={onClose}
      className="w-[min(520px,calc(100vw-32px))] max-w-[min(520px,calc(100vw-32px))]"
      cardClassName="w-[min(520px,100%)]! p-[20px]!"
    >
      <h3 className="mb-[4px]! text-[16px]!">Ajouter depuis le catalogue du monde</h3>
      <p className="tiny mt-0 mb-[14px]">
        Les lieux de « {worldLabel} » que cette banque ne compose pas encore. Le cadre reste
        celui du monde ; tenue, format et tons sont ensuite ceux du personnage.
      </p>

      {error && (
        <p className="tiny mb-[10px] text-danger-txt" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="tiny" role="status">chargement du catalogue…</p>}
      {nothing && (
        <div className="empty px-[16px] py-[18px] text-[13px]">
          <b>Rien à ajouter</b>
          Cette banque compose déjà tous les lieux de son monde.
        </div>
      )}

      {ordinary.length > 0 && (
        <section aria-label="Lieux du monde" className="flex flex-col gap-[6px]">
          {ordinary.map((place) => (
            <PlacePick key={place.id} place={place} adult={false} onPick={() => onPick(place, false)} />
          ))}
        </section>
      )}

      {adultAllowed && adult.length > 0 && (
        <section aria-label="Lieux adultes" className="mt-[16px] flex flex-col gap-[6px]">
          <p className="tiny mt-0 mb-[4px]">
            <b>Lieux adultes</b> — ajoutés au cran natif (niveau {nativeLevel}), sans tenue, et
            invisibles à tous les autres crans.
          </p>
          {adult.map((place) => (
            <PlacePick key={place.id} place={place} adult onPick={() => onPick(place, true)} />
          ))}
        </section>
      )}
      {adultNotice && <p className="tiny mt-[14px]">Lieux adultes : {adultNotice}.</p>}

      <div className="mt-[16px] flex justify-end">
        <button type="button" className="btn sm" onClick={onClose}>
          Fermer
        </button>
      </div>
    </Dialog>
  )
}
