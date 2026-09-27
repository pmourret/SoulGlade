/* The outfit catalogue — the fifth sub-view of the Atelier (IT-10 chantier 6,
   design-pass tenues, DOCS/design-pass/screen-tenues.md).

   WHAT AN OUTFIT IS HERE: a label and pieces, written or taken from the
   garments of the asset library, each worn on a SLOT of the body. A scene
   wears it by its key, at a level, from the Vêtements panel of the composer,
   and the launch resolves it into text (`DOCS/cadrage/2026-09-26-it10-c6-
   tenues.md`). Correcting an outfit here corrects every scene that wears it.

   THREE ZONES, the light workshop's skeleton: the list at 260, the sheet in
   the centre (a body and its seven zones), the zone's slots as a 340 px
   inspector. The sheet is never empty: with nothing chosen the first outfit
   is open, with no outfit the new sheet is. Under 1100 px the list narrows to
   240 and the zone inspector becomes a drawer, opened by choosing a zone. */
import { useEnhancer } from '../../../api/useEnhance'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useApi } from '../../../api/useApi'
import { useChrome } from '../../../chrome/ChromeContext'
import { useConfirm } from '../../../chrome/ConfirmContext'
import { useToast } from '../../../chrome/ToastContext'
import { useScenes } from '../../../state/ScenesStoreContext'
import { useOverlayPanel } from '../../produce/useOverlayPanel'
import { libraryPicks } from '../assets/libraryPicks'
import { useAssetLibrary } from '../assets/useAssetLibrary'
import { OutfitList } from './OutfitList'
import { garmentsByKey, pieceName } from './outfitPieces'
import { OutfitSheet } from './OutfitSheet'
import { sortPieces, type ZoneKey } from './outfitSlots'
import { useOutfitDraft } from './useOutfitDraft'
import { useOutfits, type OutfitEntry } from './useOutfits'
import { useSilhouette } from './useSilhouette'
import { ZoneInspector } from './ZoneInspector'

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
  const [figure, setFigure] = useSilhouette()
  /* The pieces an outfit may take from the library: the classes whose
     fragment lands in `wardrobe`, said by the server's own table — never a
     class named here (invariant 7). */
  const garments = useMemo(
    () =>
      libraryPicks(assets, classes, (key) => api.url(`/img/asset?key=${encodeURIComponent(key)}`))
        .filter((pick) => pick.champ === 'wardrobe'),
    [assets, classes, api],
  )
  const byKey = useMemo(() => garmentsByKey(garments), [garments])

  const [chosen, setChosen] = useState<string | null>(null)
  /* Nothing chosen: the first outfit, or the new sheet when there is none. */
  const selected = chosen ?? outfits[0]?.key ?? (loaded ? NEW : null)
  const selectedOutfit = outfits.find((o) => o.key === selected) ?? null
  const inspecting = selected === NEW || selectedOutfit !== null
  const draft = useOutfitDraft(selected === NEW ? null : selectedOutfit, (piece) => pieceName(piece, byKey))

  /* An outfit takes a while to compose: leaving it with unsaved changes asks
     first, as the light sheet does. Read through a ref: a drawer's Escape
     keeps the callback of the moment it opened. */
  const dirtyRef = useRef(draft.dirty)
  dirtyRef.current = draft.dirty
  const focusLabel = useRef(false)
  const choose = async (key: string) => {
    if (key === selected) {
      setChosen(key)
      return
    }
    if (dirtyRef.current && !(await confirm({
      title: 'Abandonner les changements de cette tenue ?',
      button: 'Abandonner',
      body: <p>La tenue a des changements non enregistrés ; ils seront perdus.</p>,
    }))) return
    setChosen(key)
  }
  const openNew = () => {
    focusLabel.current = true
    void choose(NEW)
  }
  useEffect(() => {
    if (selected !== NEW || !focusLabel.current) return
    focusLabel.current = false
    document.getElementById('outfitLabel')?.focus()
  }, [selected])

  // An outfit removed under the selection: back to the first one.
  useEffect(() => {
    if (chosen && chosen !== NEW && loaded && !outfits.some((o) => o.key === chosen)) setChosen(null)
  }, [outfits, chosen, loaded])

  /* Ctrl Z gives back the step before the last change of the pieces — from
     anywhere on the screen (the inspector is a column of its own), except in
     a field being typed in, where it stays the field's own undo. The empty
     « write a piece » field is the exception: a piece was just posed from it. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return
      const target = event.target as HTMLInputElement
      const typing = ['INPUT', 'TEXTAREA'].includes(target.tagName) && !(target.id === 'outfitWritten' && !target.value)
      if (typing || !draft.canUndo) return
      event.preventDefault()
      draft.undo()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [draft])

  /* Under 1100 px the zone inspector is a drawer, opened by choosing a zone;
     its Escape gives the focus back to that zone (useOverlayPanel). */
  const [zoneOpen, setZoneOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const drawer = narrow && zoneOpen && inspecting
  useOverlayPanel(drawer, () => setZoneOpen(false), drawerRef)
  const onZone = (zone: ZoneKey) => {
    draft.chooseZone(zone)
    if (narrow) setZoneOpen(true)
  }

  const submit = async () => {
    const pieces = sortPieces(draft.pieces.filter((p) => p.asset || (p.text ?? '').trim()))
    const label = draft.label.trim()
    if (selected === NEW) {
      const result = await create(label, pieces, draft.toWorld)
      if (!result.ok) {
        toast(result.erreur)
        return
      }
      if (result.outfit) setChosen(result.outfit.key)
      toast(draft.toWorld ? 'tenue créée dans le monde' : 'tenue créée')
      return
    }
    if (!selectedOutfit) return
    const result = await save(selectedOutfit.key, { label, pieces }, draft.toWorld)
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

  const inspector = (
    <ZoneInspector
      zone={draft.zone}
      pieces={draft.pieces}
      garments={garments}
      byKey={byKey}
      openSlot={draft.openSlot}
      busy={busy}
      enhancer={enhancer}
      replaced={draft.replaced}
      onOpenSlot={draft.setOpenSlot}
      onPose={draft.pose}
      onRemove={draft.remove}
      onEditText={draft.editText}
      onUndo={draft.undo}
    />
  )

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

        {/* Secondary, and absent while the list is empty: the sheet's own
            « Créer la tenue » is then the only call. */}
        {outfits.length > 0 && (
          <button type="button" className="btn sm flex-none" id="btnOutfitNew" disabled={busy} onClick={openNew}>
            Nouvelle tenue
          </button>
        )}
      </div>

      <div className={`grid min-h-0 flex-1 ${
        narrow ? 'grid-cols-[240px_minmax(0,1fr)]' : 'grid-cols-[260px_minmax(0,1fr)_340px]'}`}>
        <OutfitList outfits={outfits} loaded={loaded} selected={selected} dirty={draft.dirty}
                    onChoose={(key) => void choose(key)} />

        <div id="outfitPanel" aria-label="Fiche de la tenue" className="min-h-0 min-w-0">
          {inspecting && (
            <OutfitSheet
              outfit={selected === NEW ? null : selectedOutfit}
              draft={draft}
              garments={garments}
              byKey={byKey}
              busy={busy}
              worldLabel={world ? world.label : null}
              figure={figure}
              onFigure={setFigure}
              onZone={onZone}
              onSubmit={() => void submit()}
              onDelete={() => selectedOutfit && void onDelete(selectedOutfit)}
            />
          )}
        </div>

        {inspecting && !narrow && <div className="min-h-0 border-l border-l-line bg-panel">{inspector}</div>}
      </div>

      {drawer && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-label="Emplacements de la zone"
          className="fixed top-0 right-0 bottom-0 z-[9] flex w-[min(340px,100vw)] flex-col border-l border-l-line
                     bg-panel shadow-elev"
        >
          <button
            type="button"
            className="absolute top-[8px] right-[8px] z-[1] border-0 bg-transparent px-[8px] py-[4px] text-[16px]
                       text-dim hover:text-txt"
            aria-label="Fermer la zone"
            onClick={() => setZoneOpen(false)}
          >
            ×
          </button>
          {inspector}
        </div>
      )}
    </div>
  )
}
