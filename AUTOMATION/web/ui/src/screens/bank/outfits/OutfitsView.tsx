/* The outfit catalogue — the fifth sub-view of the Atelier (IT-10 chantier 6).

   WHAT AN OUTFIT IS HERE: a label and ordered pieces, written or taken from
   the garments of the asset library. A scene wears it by its key, at a level,
   from the Vêtements panel of the composer, and the launch resolves it into
   text (`DOCS/cadrage/2026-09-26-it10-c6-tenues.md`). Correcting an outfit
   here corrects every scene that wears it.

   THE SHAPE IS THE ASSET LIBRARY'S next door: the same workshop bar handed
   down by `BankScreen`, the same 340 px inspector that becomes a drawer under
   1100 px. A LIST AND NOT A GRID: an outfit is recognised by what it says,
   and what it says is the text a scene receives — shown on the row, in full
   on two lines. */
import { useEnhancer } from '../../../api/useEnhance'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useChrome } from '../../../chrome/ChromeContext'
import { useConfirm } from '../../../chrome/ConfirmContext'
import { Icon } from '../../../chrome/Icon'
import { useToast } from '../../../chrome/ToastContext'
import { useApi } from '../../../api/useApi'
import { useScenes } from '../../../state/ScenesStoreContext'
import { useOverlayPanel } from '../../produce/useOverlayPanel'
import { libraryPicks } from '../assets/libraryPicks'
import { useAssetLibrary } from '../assets/useAssetLibrary'
import { OutfitInspector } from './OutfitInspector'
import { useOutfits, type OutfitEntry, type OutfitPiece } from './useOutfits'

const NEW = '\u0000new'

export function OutfitsView({ nav }: { nav: ReactNode }) {
  const enhancer = useEnhancer()
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const { narrow } = useChrome()
  const { world } = useScenes()
  const { outfits, loaded, busy, create, save, remove } = useOutfits()
  const { assets, classes } = useAssetLibrary()
  /* The pieces an outfit may take from the library: the classes whose
     fragment lands in `wardrobe`, said by the server's own table — never a
     class named here (invariant 7). */
  const garments = useMemo(
    () =>
      libraryPicks(assets, classes, (key) => api.url(`/img/asset?key=${encodeURIComponent(key)}`))
        .filter((pick) => pick.champ === 'wardrobe'),
    [assets, classes, api],
  )

  const [selected, setSelected] = useState<string | null>(null)
  const selectedOutfit = outfits.find((o) => o.key === selected) ?? null
  const inspecting = selected === NEW || selectedOutfit !== null

  // An outfit removed under the selection leaves nothing to inspect.
  useEffect(() => {
    if (selected && selected !== NEW && loaded && !outfits.some((o) => o.key === selected))
      setSelected(null)
  }, [outfits, selected, loaded])

  const drawerRef = useRef<HTMLDivElement | null>(null)
  useOverlayPanel(narrow && inspecting, () => setSelected(null), drawerRef)

  const onCreate = async (label: string, pieces: OutfitPiece[], toWorld: boolean) => {
    const result = await create(label, pieces, toWorld)
    if (!result.ok) {
      toast(result.erreur)
      return
    }
    if (result.outfit) setSelected(result.outfit.key)
    toast(toWorld ? 'tenue créée dans le monde' : 'tenue créée')
  }

  const onSave = async (key: string, fields: { label: string; pieces: OutfitPiece[] }, toWorld: boolean) => {
    const result = await save(key, fields, toWorld)
    toast(result.ok ? 'tenue enregistrée — les scènes qui la portent suivent' : result.erreur)
  }

  const onDelete = async (outfit: OutfitEntry) => {
    const adjusted = outfit.couche === 'surcharge'
    const ok = await confirm({
      title: adjusted ? 'Rendre cette tenue au monde ?' : 'Retirer cette tenue ?',
      button: adjusted ? 'Rendre au monde' : 'Retirer',
      danger: !adjusted,
      body: adjusted ? (
        <p>
          Ce qui a été ajusté ici est effacé ; <b>{outfit.label || outfit.key}</b> revient à ce
          que le monde en dit, et les scènes qui la portent avec elle.
        </p>
      ) : (
        <p>
          <b>{outfit.label || outfit.key}</b> quitte{' '}
          {outfit.couche === 'monde' ? 'le monde — tous ses personnages la perdent' : 'ce personnage'}.
          Une tenue qu'une scène porte encore ne part pas : le studio dit laquelle.
        </p>
      ),
    })
    if (!ok) return
    const result = await remove(outfit.key)
    toast(result.ok ? (adjusted ? 'rendue au monde' : 'tenue retirée') : result.erreur)
  }

  return (
    <div className="flex h-full min-h-0 flex-col" id="bankOutfits">
      <div className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]
                      [&>*]:whitespace-nowrap">
        {nav}

        <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim2 max-[1280px]:hidden">
          <span id="nOutfits">{outfits.length}</span> tenue{outfits.length > 1 ? 's' : ''} ·
          réutilisées d'une scène à l'autre, du monde et de ce personnage
        </span>
        <span className="flex-1 min-[1281px]:hidden" />

        <button
          type="button"
          className="btn primary sm flex-none"
          id="btnOutfitNew"
          disabled={busy}
          onClick={() => setSelected(NEW)}
        >
          Nouvelle tenue
        </button>
      </div>

      <div
        className={`grid min-h-0 flex-1 ${
          inspecting && !narrow ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'
        }`}
      >
        <div className="min-h-0 overflow-y-auto">
          {loaded && !outfits.length ? (
            <div className="flex h-full items-center justify-center p-[24px]">
              <div
                className="flex max-w-[520px] flex-col items-center gap-[12px] rounded-card border-2
                           border-dashed border-line2 px-[28px] py-[36px] text-center text-[13px] text-dim"
                id="outfitsEmpty"
              >
                <p className="m-0">
                  Aucune tenue. Une tenue rassemble des pièces — écrites, ou prises dans les
                  vêtements des Assets — et se pose ensuite dans une scène, onglet Vêtements.
                  La corriger ici corrige toutes les scènes qui la portent.
                </p>
                {/* Secondaire : « Nouvelle tenue », dans la barre, reste le seul
                    appel primaire de la vue (audit du 26/09). */}
                <button type="button" className="btn sm" onClick={() => setSelected(NEW)}>
                  Créer une tenue
                </button>
              </div>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-[8px] p-[14px]">
              {outfits.map((outfit) => (
                <li key={outfit.key}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-[4px] rounded-card border bg-panel px-[12px]
                                py-[9px] text-left ${outfit.key === selected ? 'border-txt' : 'border-line'}`}
                    data-outfit={outfit.key}
                    aria-pressed={outfit.key === selected}
                    onClick={() => setSelected(outfit.key)}
                  >
                    <span className="flex items-center gap-[6px] text-[13px]">
                      <b className="truncate font-medium">{outfit.label || outfit.key}</b>
                      <span className="text-[11.5px] text-dim2">
                        {outfit.pieces?.length ?? 0} pièce{(outfit.pieces?.length ?? 0) > 1 ? 's' : ''}
                      </span>
                      {outfit.couche !== 'personnage' && (
                        <span className="rounded-pill border border-line px-[5px] text-[11px] text-dim2">
                          {outfit.couche === 'monde' ? 'monde' : 'ajustée'}
                        </span>
                      )}
                    </span>
                    {outfit.erreur ? (
                      <span className="flex items-center gap-[4px] text-[12px] text-warn-txt">
                        <Icon name="warn" className="h-[11px] w-[11px] flex-none" aria-hidden="true" />
                        {outfit.erreur}
                      </span>
                    ) : (
                      <span className="line-clamp-2 font-code text-[12px] text-dim">{outfit.texte}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {inspecting && (
          <div
            ref={drawerRef}
            id="outfitPanel"
            aria-label="Fiche de la tenue"
            role={narrow ? 'dialog' : undefined}
            className={`min-h-0 border-l border-l-line bg-panel ${
              narrow ? 'fixed top-0 right-0 bottom-0 z-[9] w-[min(340px,100vw)] shadow-elev' : ''
            }`}
          >
            {narrow && (
              <button
                type="button"
                className="ml-auto block border-0 bg-transparent px-[12px] py-[8px] text-[16px] text-dim hover:text-txt"
                aria-label="Fermer la fiche"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            )}
            <OutfitInspector
              enhancer={enhancer}
              outfit={selected === NEW ? null : selectedOutfit}
              garments={garments}
              busy={busy}
              worldLabel={world ? world.label : null}
              onCreate={(label, pieces, toWorld) => void onCreate(label, pieces, toWorld)}
              onSave={(fields, toWorld) => selectedOutfit && void onSave(selectedOutfit.key, fields, toWorld)}
              onDelete={() => selectedOutfit && void onDelete(selectedOutfit)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
