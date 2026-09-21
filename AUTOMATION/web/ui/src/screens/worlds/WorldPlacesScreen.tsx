/* The full catalog editor of ONE world, at /worlds/:worldId/places
   (ADR-0016). What the Banque's Monde tab never was: a place to see EVERY
   lieu of a world, add one, or retire one — the Banque only ever edits ONE
   place already tied to a selected scene.

   TWO CATALOGS SINCE 21/09. A world can carry an ADULT catalog, in its own
   file (`WORLDS/<id>.adulte.json`) and behind its own routes. It is the
   second block of this screen, FOLDED by default: nothing is hidden — the
   count is announced on the closed summary — but nothing imposes itself on
   screen either, the same restraint as Produire's technical journal.

   The screen composes; the gestures live in `useCatalogueEditor` and the
   rendering in `CatalogueSection`, one instance of each per catalog. Before
   that split this file held the list, the inspector and the four gestures
   inline, and a second catalog would have meant a second copy of all three. */
import { Link, useParams } from 'react-router-dom'

import { useConfirm } from '../../chrome/ConfirmContext'
import { useToast } from '../../chrome/ToastContext'
import { PATHS } from '../../app/routes'
import { CatalogueSection } from './CatalogueSection'
import { useCatalogueEditor } from './useCatalogueEditor'
import { useWorldPlaces, type Place } from './useWorldPlaces'

export function WorldPlacesScreen() {
  const { worldId } = useParams<{ worldId: string }>()
  const toast = useToast()
  const confirm = useConfirm()
  const ordinaire = useWorldPlaces(worldId ?? null)
  const adulte = useWorldPlaces(worldId ?? null, { adulte: true })

  /* The same warning for both catalogs: a retired place breaks the frame of
     every character scene that references it, adult or not. */
  const confirmRemoval = (place: Place) =>
    confirm({
      title: `Retirer le lieu « ${place.label || place.id} » ?`,
      button: 'Retirer',
      body: (
        <p>
          Toute scène de personnage qui le référence (`world_ref`) perdra son cadre au prochain
          enregistrement de son atelier — elle ne sera plus produisible sans être réassignée.
        </p>
      ),
    })

  const handlers = { onSaved: toast, confirmRemoval }
  const editeurOrdinaire = useCatalogueEditor(ordinaire, handlers)
  const editeurAdulte = useCatalogueEditor(adulte, handlers)

  if (!worldId) return null
  const label = ordinaire.label ?? worldId
  const nbAdulte = adulte.places?.length ?? 0

  return (
    <div className="screen" id="worldPlaces">
      <div className="wrap w-full max-w-none">
        <Link to={PATHS.worlds} className="tiny">
          ← Mondes
        </Link>
        <h2 className="mt-[8px]">
          Lieux — {label} <span className="tiny">{worldId}</span>
        </h2>
        {ordinaire.error && (
          <p className="tiny mt-[6px] text-danger-txt" role="alert">
            {ordinaire.error}
          </p>
        )}

        <div className="mt-[16px]">
          <CatalogueSection
            places={ordinaire.places}
            worldLabel={label}
            addLabel="+ Ajouter un lieu"
            editor={editeurOrdinaire}
            emptyState={
              <>
                <b>Catalogue vide</b>
                Ajoute un premier lieu pour que les personnages de ce monde puissent y composer
                des scènes.
              </>
            }
          />
        </div>

        <details className="mt-[26px] rounded-card border-2 border-line bg-panel" id="adulteBlock">
          <summary className="cursor-pointer px-[14px] py-[11px] text-[13.5px] font-semibold">
            Lieux adultes <span className="tiny">· {nbAdulte}</span>
          </summary>
          <div className="border-t border-t-line px-[14px] py-[14px]">
            <p className="tiny mb-[14px]">
              Des cadres, jamais une tenue : la nudité est la garde-robe du personnage à son
              palier natif, pas une livraison du monde. Ces lieux n'apparaissent dans aucune
              banque ordinaire, et une scène qui en dérive ne se voit qu'au cran natif d'un
              personnage armé.
            </p>
            {adulte.error && (
              <p className="tiny mb-[10px] text-danger-txt" role="alert">
                {adulte.error}
              </p>
            )}
            <CatalogueSection
              places={adulte.places}
              worldLabel={label}
              addLabel="+ Ajouter un lieu adulte"
              editor={editeurAdulte}
              emptyState={
                <>
                  <b>Aucun lieu adulte</b>
                  Ce monde se livre sans branche adulte. En ajouter un crée son catalogue ; le
                  retirer entièrement le supprime.
                </>
              }
            />
          </div>
        </details>
      </div>
    </div>
  )
}
