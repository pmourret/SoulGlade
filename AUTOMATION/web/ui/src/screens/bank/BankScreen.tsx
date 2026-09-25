/* The scene bank — THREE sub-views, three routes.

   `#scenes` and `#scenes/poses` were one screen with two wrappers shown or
   hidden. They are `/bank/scenes`, `/bank/poses` and `/bank/tones` now. The
   reason for the split has not changed: the bank held everything in one
   column, and the skeleton block sat between the composer and the scene
   cards, in the middle of a page one scrolls to edit scenes. Three different
   workshops, not three sections.

   THREE PANELS (design-pass screen-7b, 23/09/2026). Scènes used to be a
   narrow list plus an inspector CARD floating in a `max-h` aside, with the
   seven sections as a row of unlabelled icons inside it and a stack of
   full-width bars under every panel. It is now a workshop bar and three
   columns filling the height of `<main>`, same shape as Produire (screen-3b)
   and Revue (screen-5b): the list picks (260 px), the composer works
   (labelled rail + a form capped at 880 px), and the living preview of the
   prompt stands on the right (340 px) instead of hiding in one section.

   WHAT THE PASS DID NOT TOUCH: drafts and the writing of scenes.json
   (`ScenesStoreContext`), the Personnage/Monde tab and the place inheritance
   (ADR-0015), the `?scene=` entry from Produire, the world guard, the
   gestures of `useSceneWorkbench`, and the seven sections' own fields — not
   one added, not one removed.

   THE SAVE BUTTON LEFT THE SCENES BAR (§S1). `DirtyBar` (chrome) already
   states what is pending and carries the save with its Ctrl S; a second,
   icon-only button saying the same thing at rest was a permanent control for
   an occasional act. It STAYS on Poses and Tons, whose own passes are still
   to come and whose tooltip is the only place saying what a save means there
   — see SAVE_HINT below. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useApi } from '../../api/useApi'
import { useChrome } from '../../chrome/ChromeContext'
import { useConfirm } from '../../chrome/ConfirmContext'
import { REVERT_CONFIRM } from '../../chrome/DirtyBar'
import { Icon } from '../../chrome/Icon'
import { useToast } from '../../chrome/ToastContext'
import { useScenes } from '../../state/ScenesStoreContext'
import { useTaxonomy } from '../../state/TaxonomyContext'
import { PATHS } from '../../app/routes'
import { PlaceInspector } from '../worlds/PlaceInspector'
import { usePlaceDraft } from '../worlds/usePlaceDraft'
import { useWorldPlaces } from '../worlds/useWorldPlaces'
import { useOverlayPanel } from '../produce/useOverlayPanel'
import { ToneWorkshop } from '../expression-editor/ToneWorkshop'
import { PosesView } from './poses/PosesView'
import { SceneListPanel, type ScenePreview } from './SceneList'
import { DocumentPane, SceneInspector } from './SceneInspector'
import { SceneHeader } from './composer/SceneHeader'
import { ScenePreviewPanel } from './composer/ScenePreviewPanel'
import { changedFields, hasChanges, savedScenes, type SceneField } from './sceneChanges'
import { useSceneWorkbench } from './useSceneWorkbench'
import { useWorldCatalogue } from './useWorldCatalogue'
import { WorldBanner, WorldDriftBand, worldDrift } from './WorldBanner'
import { WorldCatalogueDialog } from './WorldCatalogueDialog'

const NO_CHANGES: Set<SceneField> = new Set()

export function BankScreen({ view }: { view: 'scenes' | 'poses' | 'tones' }) {
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const { narrow } = useChrome()
  const {
    bank,
    drafts,
    anchor,
    direction,
    poses,
    world,
    documentWorld,
    setAnchor,
    setDirection,
    patchDraft,
    save,
    load,
  } = useScenes()
  const { creative } = useTaxonomy()
  const bench = useSceneWorkbench()
  const [status, setStatus] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  /* screen-3-produire §B3: Produire's ✎ shortcut opens a scene directly by
     its id (`?scene=<id>`) — the caller knows the scene, never the draft's
     internal `uid` `useSceneWorkbench` selects on. Consumed once: the param
     is dropped from the URL right after opening it, so it does not fight a
     later `select(null)` or survive a manual re-navigation to the bare
     route. */
  useEffect(() => {
    if (view !== 'scenes') return
    const wanted = searchParams.get('scene')
    if (!wanted || !drafts.length) return
    const draft = drafts.find((d) => d.base.id === wanted)
    if (draft) bench.select(draft.uid)
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('scene')
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, drafts, searchParams])

  // « Depuis le monde » (21/09): the places of the character's world that
  // its bank does not hold yet, ordinary ones and — armed only — adult ones.
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const catalogue = useWorldCatalogue(catalogueOpen ? (world?.id ?? null) : null)

  /* Under 1100 px the list is a drawer (§S6) — same non-modal overlay
     contract as Revue's own inspector: Escape closes it, the focus goes in
     and comes back out. */
  const [listOpen, setListOpen] = useState(false)
  const listPanelRef = useRef<HTMLDivElement | null>(null)
  const closeList = () => setListOpen(false)
  useOverlayPanel(narrow && listOpen, closeList, listPanelRef, '#sceneFilter')

  // Monde | Personnage (ADR-0015) — the catalog of the CHARACTER's world,
  // loaded once and shared by every scene the Banque opens.
  const worldPlaces = useWorldPlaces(world?.id ?? null)
  const [placeStatus, setPlaceStatus] = useState<string | null>(null)
  const [placeSaving, setPlaceSaving] = useState(false)
  const worldLinked = bench.selected?.base.origin === 'world'
  const selectedPlace =
    worldLinked && bench.selected
      ? (worldPlaces.places?.find((p) => p.id === bench.selected!.base.world_ref) ?? null)
      : null

  /* The draft of the open place lives in `usePlaceDraft` since the design-pass
     screen-11: `PlaceInspector` became controlled there, so the Mondes screen
     could hand its dirty state to the chrome's banner. The Banque keeps its own
     immediate save, which is its contract — one place tied to one scene, not a
     document one composes. */
  const placeDraft = usePlaceDraft(selectedPlace)

  const onSavePlace = async () => {
    if (!selectedPlace || !worldPlaces.places) return
    const patch = { ...placeDraft.draft, prompt: placeDraft.draft.prompt.trim() }
    setPlaceSaving(true)
    // `idEditable` is not set below, so `patch.id` always equals `selectedPlace.id` here.
    const next = worldPlaces.places.map((p) => (p.id === selectedPlace.id ? { ...p, ...patch } : p))
    const result = await worldPlaces.save(next)
    setPlaceSaving(false)
    setPlaceStatus(result.ok ? 'lieu enregistré · hérité par tous les personnages du monde' : (result.erreur ?? 'échec'))
    if (result.ok) {
      toast('catalogue du monde enregistré')
      await load() // le prompt affiché côté Personnage doit suivre tout de suite
    }
  }

  const previews = (bank?.previews ?? {}) as Record<string, ScenePreview>
  const stats = (bank?.stats ?? {}) as Record<string, { n: number; avg: number | null }>

  /* What the last save left on disk, and what each draft owes it (§S3, §S4.2,
     §S4.3, §S5) — the ONE comparison the dots, the borders and the refusal of
     « Produire cette scène » all read. */
  const saved = useMemo(() => savedScenes(bank), [bank])
  const changedUids = useMemo(
    () => new Set(drafts.filter((draft) => hasChanges(draft, saved)).map((draft) => draft.uid)),
    [drafts, saved],
  )
  const changed = bench.selected ? changedFields(bench.selected, saved) : NO_CHANGES
  /* The SCENE is pending, which is not the same question as which of its
     fields moved: a scene created in the page has no saved version to differ
     from, and still owes everything to the next save. */
  const pending = bench.selected ? changedUids.has(bench.selected.uid) : false

  /* Le même geste que le bandeau, offert depuis le panneau JSON (§7.5) : la
     question posée est la sienne, pas une copie. */
  const onRevert = async () => {
    if (!(await confirm(REVERT_CONFIRM))) return
    await load()
    toast('modifications ignorées — dernière version enregistrée reprise')
  }

  const onSave = async () => {
    const result = await save()
    setStatus(result.ok ? 'enregistré · sauvegarde .bak faite' : (result.erreur ?? 'échec'))
    if (result.ok) toast('scenes.json enregistré')
  }

  const drift = worldDrift(world, documentWorld)

  /* THE THREE SUB-VIEWS ARE THREE DESTINATIONS, so three links: shareable,
     and the browser's back button walks between them.

     A NAV, NOT A TABLIST. It looked like a segmented control so it wore
     `role="tablist"`, and the roles lied twice: there is no `tabpanel` for a
     tab to control, and these links NAVIGATE — a screen reader announced
     « onglet 1 sur 3 » for something that changes the URL and unmounts the
     screen. Three links in a nav say exactly what they do, and
     `aria-current="page"` marks the one we are on.

     Hoisted out of the bar because Poses builds its OWN bar around it
     (design-pass screen-7d §S1): the bank's five controls need
     `usePoseBank`'s state, which lives in that view, and a second 44 px row
     above the table would be chrome saying what one row already says. */
  const subViewNav = (
    <nav className="seg flex-none" id="bankView" aria-label="Sous-vue des ateliers">
      <SubViewLink to={PATHS.bankScenes} label="Scènes" active={view === 'scenes'} vue="scenes" />
      <SubViewLink to={PATHS.bankPoses} label="Poses" active={view === 'poses'} vue="poses" />
      <SubViewLink to={PATHS.bankTones} label="Tons" active={view === 'tones'} vue="tones" />
    </nav>
  )

  if (view === 'poses') {
    return (
      <div className="screen flex h-full flex-col" id="scenes">
        <PosesView nav={subViewNav} />
      </div>
    )
  }

  /* Tons builds its own bar around the nav too (design-pass screen-8 §S2), and
     it is mounted by TWO routes — /bank/tones and /bank/tones/edit/:tone, the
     shareable address of one tone. It reads that parameter itself. */
  if (view === 'tones') {
    return (
      <div className="screen flex h-full flex-col" id="scenes">
        <ToneWorkshop nav={subViewNav} />
      </div>
    )
  }

  return (
    <div className="screen flex h-full flex-col" id="scenes">
      {catalogueOpen && world && (
        <WorldCatalogueDialog
          worldLabel={world.label}
          ordinary={catalogue.ordinaryMissing}
          adult={catalogue.adultMissing}
          adultAllowed={catalogue.adultAllowed}
          adultNotice={catalogue.adultNotice}
          nativeLevel={catalogue.nativeLevel}
          loading={catalogue.loading}
          error={catalogue.error}
          onPick={(place, adult) => {
            bench.addFrom(catalogue.toScene(place, adult))
            setCatalogueOpen(false)
            toast(`« ${place.label || place.id} » ajouté — enregistre la banque pour le garder`)
          }}
          onClose={() => setCatalogueOpen(false)}
        />
      )}

      {/* THE WORKSHOP BAR (§S2): which workshop, which world, and the
          document-level action — one row, 44 px, above the three columns. */}
      <div className="flex h-[44px] flex-none items-center gap-[12px] border-b border-b-line px-[16px]">
        {view === 'scenes' && narrow && (
          /* ECART ASSUME sur §S6, mesure a 1024 : le cadrage appelle ce
             bouton « Scenes », mot que la barre porte deja a 12 px de la —
             l'entree de sous-vue juste a cote. Deux « Scenes » cote a cote,
             l'un qui ouvre un tiroir et l'autre qui navigue, ne se
             distinguent pas. Le tiroir prend donc le mot qui dit ce qu'il
             ouvre. */
          <button type="button" className="btn sm flex-none" id="btnScenesDrawer" onClick={() => setListOpen(true)}>
            Liste des scènes
          </button>
        )}
        {subViewNav}

        {view === 'scenes' && <WorldBanner world={world} sceneCount={drafts.length} />}

        <div className="flex-1" />

        {/* TRANSIENT ONLY — no resting text (2026-09-01: a permanent
            "scenes.json / une sauvegarde .bak est faite..." sat here at all
            times, reported as not worth the permanent space). What a save
            just DID (success, or the refusal message) still needs to be seen
            without hovering, so it stays a visible, if transient, status
            line — `role="status"` matches DirtyBar/FaultBar's own transient
            message pattern. */}
        {status && (
          <span id="scMsg" role="status" className="tiny flex-none text-right leading-tight">
            {status}
          </span>
        )}
        {/* THE ICON-ONLY SAVE HAS LEFT THE WHOLE APPLICATION. Scènes lost it
            in 7b, Poses in 7d, and Tons — the last holder — in screen-8, each
            time for the same reason: `DirtyBar` already states what is pending
            and carries the Ctrl S, so a permanent control for an occasional
            act said the same thing twice. Only Scènes reaches this bar now, so
            the branch has nothing left to choose between. */}
        <button
          className="btn sm flex-none"
          id="btnBankDocument"
          aria-pressed={!bench.selected}
          onClick={() => bench.select(null)}
        >
          Réglages de l'atelier
        </button>
      </div>

      {view === 'scenes' && drift && <WorldDriftBand drift={drift} />}

      {view === 'scenes' && (
        <div
          id="bankScenes"
          /* Three tracks while a scene is open, two when none is — an empty
             340 px of « aperçu de rien » is not worth the width. Under
             1100 px everything stacks in one scrolling column and the list
             becomes the drawer above. */
          /* Sous 1100 px la grille cede a une COLONNE qui defile d'un bloc
             (§S6) : en restant une grille de hauteur definie, chaque piste
             gardait sa part de l'ecran et le formulaire defilait dans 340 px
             pendant que l'apercu occupait le reste — mesure a 1024. En flex
             colonne, chaque bloc prend sa hauteur de contenu et c'est le
             conteneur qui defile, une seule fois. */
          className={`grid min-h-0 flex-1 overflow-y-auto max-[1100px]:flex
                      max-[1100px]:flex-col ${
                        bench.selected
                          ? 'grid-cols-[260px_minmax(0,1fr)_340px]'
                          : 'grid-cols-[260px_minmax(0,1fr)]'
                      }`}
        >
          <div
            ref={listPanelRef}
            id="sceneListPanel"
            aria-label="Scènes de l'atelier"
            role={narrow ? 'dialog' : undefined}
            className={`min-h-0 flex-col border-r border-r-line bg-panel ${
              narrow
                ? `fixed top-0 bottom-0 left-0 z-[9] w-[min(300px,100vw)] shadow-elev ${
                    listOpen ? 'flex' : 'hidden'
                  }`
                : 'flex'
            }`}
          >
            {narrow && (
              <button
                type="button"
                className="flex-none self-end border-0 bg-transparent px-[12px] py-[8px] text-[16px] text-dim hover:text-txt"
                aria-label="Fermer la liste des scènes"
                onClick={closeList}
              >
                ×
              </button>
            )}

            <div className="flex flex-none flex-col gap-[8px] border-b border-b-line px-[12px] py-[10px]">
              <div className="flex items-center gap-[6px]">
                {/* A real <label>, not a placeholder posing as one: the
                    placeholder disappears at the first keystroke. It is
                    removed VISUALLY (`sr-only` clips it) because the field
                    sits in a toolbar, and it stays the control's accessible
                    name. */}
                <label className="sr-only" htmlFor="sceneFilter">
                  filtrer les scènes
                </label>
                <input
                  id="sceneFilter"
                  ref={searchRef}
                  className="flex-1"
                  type="search"
                  placeholder="Rechercher"
                  value={bench.filter}
                  onChange={(e) => bench.setFilter(e.target.value)}
                />
                {/* The filter is already live — clicking this does not trigger
                    a search that keystrokes did not already run. It gives the
                    search field a real, honest affordance instead of a
                    decorative icon: it puts the cursor back in it, which is
                    what one wants right after this click. */}
                <button
                  type="button"
                  className="btn sm"
                  aria-label="Rechercher"
                  onClick={() => searchRef.current?.focus()}
                >
                  <Icon name="search" className="h-[15px] w-[15px]" />
                </button>
              </div>
              <div className="flex items-center gap-[6px]">
                <button className="btn primary sm flex-1" id="btnAddScene" onClick={bench.add}>
                  Nouvelle scène
                </button>
                {world && (
                  <button className="btn sm flex-1" id="btnAddFromWorld" onClick={() => setCatalogueOpen(true)}>
                    Depuis le monde
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-[8px] py-[10px]">
              {drafts.length === 0 ? (
                <div className="empty rounded-card border border-line bg-panel px-[12px] py-[24px] text-[13px]">
                  <b className="mb-[4px] block">Atelier vide</b>
                  Ajoute une première scène avec « Nouvelle scène » ci-dessus.
                </div>
              ) : bench.shown.length === 0 ? (
                <div className="empty rounded-card border border-line bg-panel px-[12px] py-[24px] text-[13px]">
                  aucune scène ne porte « {bench.filter} » — le filtre ne cache rien du document,
                  il ne montre que ce qui répond.
                </div>
              ) : (
                <SceneListPanel
                  shown={bench.shown}
                  creative={creative}
                  filterActive={Boolean(bench.filter.trim())}
                  previews={previews}
                  stats={stats}
                  selectedUid={bench.selected?.uid}
                  changedUids={changedUids}
                  imageUrl={api.image}
                  onOpen={(uid) => {
                    bench.select(uid)
                    if (narrow) closeList()
                  }}
                  listRef={bench.listRef}
                  onKeyDown={bench.onListKeyDown}
                />
              )}
            </div>
          </div>

          {/* `shrink-0` sous 1100 px : en colonne flex qui deborde, un enfant
              retrecit au lieu de pousser le defilement — le formulaire se
              retrouvait a defiler dans 340 px sous l'apercu. */}
          <div className="flex min-h-0 min-w-0 flex-col bg-bg max-[1100px]:shrink-0">
            {/* The header is HERE and not inside the composer: the Monde tab
                replaces the whole column below it, and losing sight of which
                scene is open at that exact moment is the one thing it must
                not do (§S4.1). */}
            {bench.selected && (
              <SceneHeader
                draft={bench.selected}
                creative={creative}
                produced={stats[bench.selected.base.id]?.n ?? null}
                preview={previews[bench.selected.base.id]}
                imageUrl={api.image}
                changed={pending}
                worldLinked={worldLinked}
                inspectorMode={bench.inspectorMode}
                onInspectorMode={bench.setInspectorMode}
                onPrevScene={bench.hasPrevScene ? () => bench.stepScene(-1) : undefined}
                onNextScene={bench.hasNextScene ? () => bench.stepScene(1) : undefined}
                onDuplicate={() => bench.duplicate(bench.selectedIndex)}
                onRemove={() => void bench.remove(bench.selectedIndex)}
              />
            )}

            {bench.selected && worldLinked && bench.inspectorMode === 'world' ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-[20px] [&>*]:max-w-[880px]">
                {selectedPlace ? (
                  <PlaceInspector
                    place={{
                      id: selectedPlace.id ?? '',
                      label: selectedPlace.label ?? '',
                      intention: selectedPlace.intention ?? '',
                      prompt: selectedPlace.prompt ?? '',
                    }}
                    draft={placeDraft.draft}
                    worldLabel={world?.label ?? bench.selected.base.world ?? ''}
                    saving={placeSaving}
                    status={placeStatus}
                    onPatch={placeDraft.patch}
                    onSave={() => void onSavePlace()}
                    onClose={bench.close}
                  />
                ) : (
                  <div className="empty rounded-card border border-line bg-panel px-[16px] py-[28px] text-[13px]">
                    {worldPlaces.error ?? 'lieu introuvable dans le catalogue du monde'}
                  </div>
                )}
              </div>
            ) : bench.selected ? (
              <SceneInspector
                draft={bench.selected}
                saved={saved.get(bench.selected.base.id ?? '')}
                creative={creative}
                poses={poses}
                produced={stats[bench.selected.base.id]?.n ?? null}
                changed={changed}
                narrow={narrow}
                onPatch={(patch) => patchDraft(bench.selectedIndex, patch)}
                onPrevScene={bench.hasPrevScene ? () => bench.stepScene(-1) : undefined}
                onNextScene={bench.hasNextScene ? () => bench.stepScene(1) : undefined}
                onClose={bench.close}
                onSaveDocument={onSave}
                onRevert={() => void onRevert()}
              />
            ) : (
              <DocumentPane
                anchor={anchor}
                direction={direction}
                count={drafts.length}
                onAnchor={setAnchor}
                onDirection={setDirection}
              />
            )}
          </div>

          {bench.selected && (
            <ScenePreviewPanel
              draft={bench.selected}
              stats={stats[bench.selected.base.id]}
              changed={pending}
              className="max-[1100px]:w-auto max-[1100px]:overflow-visible max-[1100px]:border-l-0
                         max-[1100px]:border-t max-[1100px]:border-t-line"
            />
          )}
        </div>
      )}
    </div>
  )
}

function SubViewLink({
  to,
  label,
  active,
  vue,
}: {
  to: string
  label: string
  active: boolean
  vue: string
}) {
  return (
    <Link
      to={to}
      /* `on` is what `.seg` itself styles (screens.css): a `--panel3` ground,
         never an accent flat — the accent marks where one IS, it does not
         paint controls (charte graphite, écran 0). */
      className={
        'inline-flex cursor-pointer items-center border-none px-[15px] py-[8px]' +
        ' text-[13.5px] no-underline focus-visible:outline-2' +
        ' focus-visible:outline-focus focus-visible:-outline-offset-2' +
        (active ? ' on bg-panel3 font-semibold text-txt' : ' bg-transparent text-dim')
      }
      data-vue={vue}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}

/* Route wrappers: the ROUTER names the sub-view, the screen does not read it
   back out of the path. */
export function BankScenesScreen() {
  return <BankScreen view="scenes" />
}
export function BankPosesScreen() {
  return <BankScreen view="poses" />
}
export function BankTonesScreen() {
  return <BankScreen view="tones" />
}
