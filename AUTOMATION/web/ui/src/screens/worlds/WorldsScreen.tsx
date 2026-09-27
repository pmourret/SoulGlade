/* Référentiel > Mondes — ONE screen for both `/worlds` and
   `/worlds/:worldId/places`: a world read as a book (design-pass 19,
   option 19d). A screen bar with the world picker, a table of contents, the
   book of the world's four catalogs and its adult branch (ADR-0027), and an
   inspector that always holds an entry.

   THE SELECTED WORLD IS DERIVED, NEVER STORED: `worldId` comes from the route,
   and falls back to the first row of the registry — the same reasoning as
   `activeCategory` in `app/routes.ts`.

   THE INSPECTOR IS NEVER EMPTY (§S1). Opening a world opens its first scene;
   without one, the first entry of the first chapter that has one; an empty
   world opens « Nouveau lieu ». The same rule catches a removal and Escape.

   THE SAVE BELONGS TO THE CHROME. An entry is edited in the inspector and
   written by the `DirtyBar` (screen-11 §S5.4). That is also what makes leaving
   a modified entry a QUESTION rather than a silent loss: changing world,
   opening another card, adding, folding the adult branch, all pass through
   `leaveGuard`. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useEnhancer } from '../../api/useEnhance'
import { useConfirm } from '../../chrome/ConfirmContext'
import { useRegisterPendingSave, type PendingSave } from '../../chrome/PendingSaveContext'
import { useToast } from '../../chrome/ToastContext'
import { PATHS, worldPlacesPath } from '../../app/routes'
import { blockOf, CHAPTERS, type Chapter } from './bookChapters'
import { BookToc } from './BookToc'
import { INTENTION_SPEC, PLACE_SPEC, SCENE_SPEC, composedPrompt, type CatalogContext, type Draft } from './catalogSpecs'
import { EntryInspector, type EntryUsers } from './EntryInspector'
import { NewWorldDialog } from './NewWorldDialog'
import { freeId } from './slugify'
import { ToneInspector } from './ToneInspector'
import { scenesUsing } from './usedBy'
import { useCatalogueEditor } from './useCatalogueEditor'
import { useToneCatalogue } from './useToneCatalogue'
import { useWorldCatalog, type WorldIntention, type WorldPlace, type WorldScene } from './useWorldCatalog'
import { useWorldTones, type WorldTone } from './useWorldTones'
import { useWorldRegistry } from './useWorldRegistry'
import { WorldBook, type SceneBranch } from './WorldBook'
import { WorldMenu } from './WorldMenu'

const SHELL = 'screen flex h-full min-h-0 flex-col overflow-hidden'
const BAR = 'flex h-[48px] flex-none items-center gap-[12px] border-b border-b-line px-[16px]'
/* 240 and 340: the charter's scale (DESIGN.md, « Les largeurs de colonne »).
   Under 1100 px the contents fall into pills over the book, never the centre. */
const TOC = 'w-[240px] shrink-0 overflow-y-auto border-r border-r-line max-[1100px]:hidden'
const INSPECTOR = 'flex w-[340px] shrink-0 flex-col overflow-hidden border-l border-l-line bg-panel2'

/** « <noun> » with its article and agreement, for the banner and questions. */
const NOUNS: Record<Chapter, { name: string; this: string; done: string; save: string }> = {
  lieux: { name: 'Lieu', this: 'Ce lieu', done: 'modifié', save: 'Enregistrer le lieu' },
  intentions: { name: 'Intention', this: 'Cette intention', done: 'modifiée', save: 'Enregistrer l’intention' },
  scenes: { name: 'Scène', this: 'Cette scène', done: 'modifiée', save: 'Enregistrer la scène' },
  adultes: { name: 'Scène adulte', this: 'Cette scène', done: 'modifiée', save: 'Enregistrer la scène' },
  tons: { name: 'Ton', this: 'Ce ton', done: 'modifié', save: 'Enregistrer le ton' },
}

/** `?onglet=` of the tones workshop and of the Banque: a chapter, read once. */
const LINKED: Chapter[] = ['lieux', 'intentions', 'scenes', 'tons']

export function WorldsScreen() {
  const enhancer = useEnhancer()
  const { worldId } = useParams<{ worldId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const confirm = useConfirm()
  const registry = useWorldRegistry()

  /* The chapter a link asked for, consumed once the book can scroll to it. */
  const asked = useRef<Chapter | null>(
    (() => {
      const value = new URLSearchParams(location.search).get('onglet') as Chapter | null
      return value && LINKED.includes(value) ? value : null
    })(),
  )
  /* Which catalog the inspector holds. Its entry is the editor's own state. */
  const [active, setActive] = useState<Chapter>(asked.current ?? 'scenes')
  const [branch, setBranch] = useState<SceneBranch>('ordinaires')
  const [current, setCurrent] = useState<Chapter>(asked.current ?? 'lieux')
  const [dialogOpen, setDialogOpen] = useState(false)
  /* What the scene sentence set, posed once the new scene's draft exists: a
     patch in the same gesture as `add()` would be wiped by the draft reset
     that `add()` itself triggers (`useCatalogueEditor`, keyed draft). */
  const [seed, setSeed] = useState<{ chapter: 'scenes' | 'adultes'; draft: Draft } | null>(null)
  const [seededFocus, setSeededFocus] = useState(false)
  const bookRef = useRef<HTMLDivElement | null>(null)
  const jumpedAt = useRef(0)

  const worlds = registry.worlds
  const selectedId = worldId ?? worlds?.[0]?.id ?? null
  const world = worlds?.find((w) => w.id === selectedId) ?? null

  const places = useWorldCatalog<WorldPlace>(selectedId, 'places')
  const intentions = useWorldCatalog<WorldIntention>(selectedId, 'intentions')
  const scenes = useWorldCatalog<WorldScene>(selectedId, 'scenes')
  const adult = useWorldCatalog<WorldScene>(selectedId, 'scenes-adulte')
  const toneList = useWorldTones(selectedId)

  const placeEditor = useCatalogueEditor(places, PLACE_SPEC, {
    onSaved: toast,
    confirmRemoval: (place) =>
      confirm({
        title: `Retirer le lieu « ${place.label || place.id} » ?`,
        button: 'Retirer',
        danger: true,
        body: <p>Aucune scène de ce monde ne l’utilise. Il disparaît du monde livré.</p>,
      }),
  })
  const intentionEditor = useCatalogueEditor(intentions, INTENTION_SPEC, {
    onSaved: toast,
    confirmRemoval: (intention) =>
      confirm({
        title: `Retirer l’intention « ${intention.label || intention.key} » ?`,
        button: 'Retirer',
        danger: true,
        body: <p>Aucune scène de ce monde ne la porte. Les personnages ne la proposeront plus dans Produire.</p>,
      }),
  })
  const confirmSceneRemoval = (scene: WorldScene) =>
    confirm({
      title: `Retirer la scène « ${scene.label || scene.id} » ?`,
      button: 'Retirer',
      danger: true,
      body: (
        <p>
          Les personnages qui la reprennent gardent sa dernière version, qui ne suivra plus aucune
          correction du monde. Un personnage neuf ne la recevra pas.
        </p>
      ),
    })
  const sceneEditor = useCatalogueEditor(scenes, SCENE_SPEC, { onSaved: toast, confirmRemoval: confirmSceneRemoval })
  const adultEditor = useCatalogueEditor(adult, SCENE_SPEC, { onSaved: toast, confirmRemoval: confirmSceneRemoval })

  /* A retired tone breaks no scene: one that still lists it simply stops
     matching it. A character that adjusted it keeps its own setting. */
  const confirmToneRemoval = useCallback(
    (tone: WorldTone) =>
      confirm({
        title: `Retirer le ton « ${tone.label || tone.key} » ?`,
        button: 'Retirer',
        danger: true,
        body: (
          <p>
            Les personnages de ce monde ne le recevront plus. Les scènes qui le citent restent
            produisibles ; un personnage qui l'avait ajusté garde son réglage comme ton propre.
          </p>
        ),
      }),
    [confirm],
  )
  const toneCatalogue = useToneCatalogue(toneList, { onSaved: toast, confirmRemoval: confirmToneRemoval })

  const editors = { lieux: placeEditor, intentions: intentionEditor, scenes: sceneEditor, adultes: adultEditor }
  const onTones = active === 'tons'
  const editor = onTones ? null : editors[active]
  const file = `WORLDS/${selectedId}${active === 'adultes' ? '.adulte' : ''}.json`
  const nouns = NOUNS[active]

  /* What the chrome and the leave guard need, whichever catalog is open. */
  const pending = editor
    ? {
        dirty: editor.dirty,
        name: editor.draft.label || editor.draft[editor.spec.idKey] || 'sans nom',
        reset: editor.reset,
        save: editor.save,
      }
    : {
        dirty: toneCatalogue.dirty,
        name: toneCatalogue.draft.label || toneCatalogue.draft.key || 'sans nom',
        reset: toneCatalogue.reset,
        save: toneCatalogue.save,
      }

  /** Three honest issues before losing what is typed: write it, drop it, stay. */
  const leaveGuard = useCallback(async (): Promise<boolean> => {
    if (!pending.dirty) return true
    const outcome = await confirm({
      title: `Abandonner les modifications de « ${pending.name} » ?`,
      button: 'Enregistrer puis continuer',
      alt: 'Abandonner',
      body: (
        <p>
          {nouns.this} n'est pas écrit{nouns.done.endsWith('e') ? 'e' : ''} dans <code>{file}</code>. Les
          personnages de ce monde reçoivent toujours ce que le fichier contient.
        </p>
      ),
    })
    if (outcome === false) return false
    if (outcome === true) return await pending.save()
    pending.reset()
    return true
  }, [confirm, pending, nouns, file])

  /* Leaving a chapter closes what it held: a card opened later starts clean,
     and no « creating » state waits unseen in a catalog the inspector left. */
  const closeActive = () => (editor ? editor.close() : toneCatalogue.close())
  const closeAll = () => {
    Object.values(editors).forEach((e) => e.close())
    toneCatalogue.close()
  }

  const goToWorld = useCallback(
    async (id: string) => {
      if (id === selectedId) return
      if (!(await leaveGuard())) return
      closeAll()
      setBranch('ordinaires')
      /* `replace` when we came from the bare /worlds: the registry picked that
         first world, the user did not. Search carried forward explicitly, or
         `CharacterContext` would re-add `?character=` and push a second entry. */
      navigate(
        { pathname: worldPlacesPath(id), search: location.search },
        { replace: location.pathname === PATHS.worlds },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, leaveGuard, navigate, location.search, location.pathname],
  )

  const onOpen = async (chapter: Chapter, id: string) => {
    if (!(await leaveGuard())) return
    if (chapter !== active) closeActive()
    setActive(chapter)
    if (chapter === 'tons') toneCatalogue.open(id)
    else editors[chapter].open(id)
  }

  const onAdd = async (chapter: Chapter) => {
    if (!(await leaveGuard())) return
    if (chapter !== active) closeActive()
    setActive(chapter)
    setSeededFocus(false)
    if (chapter === 'tons') toneCatalogue.add()
    else editors[chapter].add()
  }

  const onCreateScene = async (chapter: 'scenes' | 'adultes', intention: string, place: string) => {
    if (!(await leaveGuard())) return
    if (chapter !== active) closeActive()
    const target = editors[chapter]
    const label = `${intentions.entries?.find((i) => i.key === intention)?.label || intention} au ${
      places.entries?.find((p) => p.id === place)?.label || place
    }`
    const taken = ((chapter === 'adultes' ? adult.entries : scenes.entries) ?? []).map((s) => s.id)
    setActive(chapter)
    setSeededFocus(true)
    target.add()
    setSeed({ chapter, draft: { label, id: freeId(label, taken), intention, place } })
  }

  useEffect(() => {
    if (!seed || !editors[seed.chapter].creatingNew) return
    editors[seed.chapter].patch(seed.draft)
    setSeed(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, sceneEditor.creatingNew, adultEditor.creatingNew])

  const onClose = async () => {
    if (!(await leaveGuard())) return
    closeActive()
  }

  const onBranch = async (next: SceneBranch) => {
    if (next === branch) return
    if (next === 'ordinaires' && active === 'adultes') {
      if (!(await leaveGuard())) return
      adultEditor.close()
      setActive('scenes')
    }
    setBranch(next)
  }

  /* §S1 — the inspector is never empty. Runs whenever the open catalog holds
     nothing: at opening, after a removal, after Escape, after a world change.
     The open chapter comes first, then the reading order of the spec. */
  const loaded = places.entries && intentions.entries && scenes.entries && toneList.tones
  const activeOpen = editor ? editor.isOpen : toneCatalogue.creatingNew || toneCatalogue.selected !== null
  useEffect(() => {
    if (!world || !loaded || activeOpen || seed) return
    const first: Record<Chapter, string | undefined> = {
      lieux: places.entries![0]?.id,
      intentions: intentions.entries![0]?.key,
      scenes: scenes.entries![0]?.id,
      tons: toneList.tones![0]?.key,
      adultes: branch === 'adultes' ? adult.entries?.[0]?.id : undefined,
    }
    const order: Chapter[] = [active, 'scenes', 'lieux', 'intentions', 'tons']
    const chapter = order.find((c) => first[c])
    if (chapter) {
      if (chapter !== active) setActive(chapter)
      if (chapter === 'tons') toneCatalogue.open(first.tons!)
      else editors[chapter].open(first[chapter]!)
      return
    }
    // An empty world: « Nouveau lieu », which the book's first row also offers.
    setActive('lieux')
    setSeededFocus(false)
    placeEditor.add()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, loaded, activeOpen, active, branch, seed, places.entries, intentions.entries, scenes.entries, toneList.tones, adult.entries])

  /* ---------------------------------------------------------- the book's scroll */
  const scrollToChapter = useCallback((chapter: Chapter) => {
    const box = bookRef.current
    const target = document.getElementById(blockOf(chapter))
    if (!box || !target) return
    // Manual scrollTop, never `scrollIntoView` (it would scroll the shell too).
    const pills = box.querySelector<HTMLElement>('nav')?.offsetHeight ?? 0
    box.scrollTop = target.offsetTop - pills - 12
    jumpedAt.current = Date.now()
    setCurrent(chapter)
  }, [])

  /* The chapter marked in the contents: the first whose bottom is below a line
     a third of the way down (capped at 120 px). A jump from the contents wins
     for a moment: a short last chapter never reaches the top. */
  const onScroll = useCallback(() => {
    if (Date.now() - jumpedAt.current < 250) return
    const box = bookRef.current
    if (!box) return
    const line = box.scrollTop + Math.min(120, box.clientHeight / 3)
    const seen = CHAPTERS.find((c) => {
      const el = document.getElementById(c.block)
      return el && el.offsetTop + el.offsetHeight > line
    })
    if (seen) setCurrent(seen.id)
  }, [])

  const onGo = (chapter: Chapter) => {
    if (chapter === 'adultes' && branch === 'ordinaires') setBranch('adultes')
    scrollToChapter(chapter)
  }

  useEffect(() => {
    if (!asked.current || !loaded) return
    scrollToChapter(asked.current)
    asked.current = null
  }, [loaded, scrollToChapter])

  const onCreateWorld = async (fields: Parameters<typeof registry.create>[0]) => {
    const result = await registry.create(fields)
    if (result.erreur) return result.erreur
    toast(`monde « ${fields.label} » créé`)
    setDialogOpen(false)
    closeAll()
    setActive('lieux')
    setBranch('ordinaires')
    navigate({ pathname: worldPlacesPath(result.id!), search: location.search })
    return null
  }

  /* Declared to the chrome's banner, which draws it and owns Ctrl S. MEMOIZED:
     handing a fresh object every render would set state on every render. */
  const characters = selectedId ? registry.characterCount(selectedId) : null
  const pendingSave = useMemo<PendingSave | null>(
    () =>
      pending.dirty && world
        ? {
            title: `${nouns.name} « ${pending.name} » ${nouns.done}`,
            body: (
              <>
                <code>{file}</code>
                {/* Only from 1 up: `CHARACTERS/` is outside the repo, and
                    « 0 personnage » would read as a measurement. */}
                {characters && characters > 0 ? (
                  <> — {characters} personnage{characters > 1 ? 's' : ''} de ce monde {characters > 1 ? 'le reçoivent' : 'le reçoit'}.</>
                ) : (
                  <> — les personnages de ce monde le reçoivent.</>
                )}
              </>
            ),
            saveLabel: nouns.save,
            onSave: () => void pending.save(),
            onRevert: () => pending.reset(),
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending.dirty, pending.name, nouns, world, file, characters, pending.save],
  )
  useRegisterPendingSave(pendingSave)

  if (registry.failed) {
    return (
      <div className={SHELL} id="worlds">
        <div className="flex min-w-0 flex-1 items-center justify-center p-[24px]">
          <div className="empty max-w-[420px] rounded-card border border-line bg-panel px-[20px] py-[26px]">
            <span aria-hidden="true" className="mb-[6px] block text-[15px] text-warn-txt">
              ◆
            </span>
            <b>Registre indisponible</b>
            La liste des mondes n'a pas pu être lue.
            <div className="mt-[14px]">
              <button className="btn sm" onClick={() => void registry.load()}>
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (worlds === null) {
    return (
      <div className={SHELL} id="worlds" aria-busy="true">
        <div className={BAR} aria-hidden="true">
          <div className="h-[32px] w-[180px] rounded-[6px] bg-panel" />
        </div>
        <div className="flex min-h-0 flex-1" aria-hidden="true">
          <div className={TOC}>
            <Skeletons rows={5} />
          </div>
          <div className="min-w-0 flex-1">
            <Skeletons rows={6} />
          </div>
          <div className={INSPECTOR}>
            <Skeletons rows={4} />
          </div>
        </div>
      </div>
    )
  }

  const dialog = dialogOpen && (
    <NewWorldDialog
      packs={registry.packs}
      creating={registry.creating}
      takenIds={worlds.map((w) => w.id)}
      onCreate={onCreateWorld}
      onClose={() => setDialogOpen(false)}
    />
  )

  if (world === null) {
    return (
      <div className={SHELL} id="worlds">
        {dialog}
        <div className="flex min-w-0 flex-1 items-center justify-center p-[24px]">
          <div className="empty max-w-[420px]">
            <b>Aucun monde pour l'instant</b>
            Un monde porte les lieux, les intentions et les scènes où ses personnages composent.
            <div className="mt-[14px]">
              <button className="btn primary sm" data-new onClick={() => setDialogOpen(true)}>
                Nouveau monde
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const counts: Record<Chapter, number> = {
    lieux: places.entries?.length ?? world.places_count,
    intentions: intentions.entries?.length ?? world.intentions_count,
    scenes: scenes.entries?.length ?? world.scenes_count,
    tons: toneList.tones?.length ?? world.tones_count ?? 0,
    adultes: adult.entries?.length ?? 0,
  }

  /* The scenes an entry serves: ordinary ones named, adult ones named only
     while their chapter is unfolded (arbitration of 21/09), else counted. */
  const usersOf = (field: 'place' | 'intention' | 'tone', value: string): EntryUsers => {
    const named = (list: WorldScene[]) => list.map((s) => ({ id: s.id, label: s.label || s.id }))
    const ordinary = scenesUsing(scenes.entries ?? [], field, value)
    const adults = scenesUsing(adult.entries ?? [], field, value)
    return branch === 'adultes'
      ? { shown: named([...ordinary, ...adults]), hidden: 0 }
      : { shown: named(ordinary), hidden: adults.length }
  }
  const onOpenScene = (id: string) =>
    void onOpen(scenes.entries?.some((s) => s.id === id) ? 'scenes' : 'adultes', id)

  const context: CatalogContext = { places: places.entries, intentions: intentions.entries, tones: toneList.tones }
  const takenIds = !editor
    ? []
    : ((editor.spec.idKey === 'key'
        ? (intentions.entries ?? []).map((i) => i.key)
        : ((active === 'lieux' ? places.entries : active === 'adultes' ? adult.entries : scenes.entries) ?? []).map(
            (e) => e.id,
          )) as string[])
  const selection = editor
    ? {
        chapter: active,
        id: editor.selectedId,
        creating: editor.creatingNew,
        dirty: editor.dirty ? nouns.done : null,
      }
    : {
        chapter: active,
        id: toneCatalogue.selectedKey,
        creating: toneCatalogue.creatingNew,
        dirty: toneCatalogue.dirty ? nouns.done : null,
      }
  const families = world.compatible_families ?? []

  return (
    <div className={SHELL} id="worlds">
      {dialog}

      <div className={BAR}>
        <WorldMenu
          worlds={worlds}
          current={world}
          onSelect={(id) => void goToWorld(id)}
          onNew={() => setDialogOpen(true)}
        />
        <span className="min-w-0 truncate text-[12.5px] text-dim2">
          {[
            families.join(', '),
            characters && characters > 0
              ? `${characters} personnage${characters > 1 ? 's' : ''} y ${characters > 1 ? 'vivent' : 'vit'}`
              : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className={TOC}>
          <BookToc counts={counts} current={current} onGo={onGo} />
        </aside>

        <WorldBook
          world={world}
          bookRef={bookRef}
          onScroll={onScroll}
          counts={counts}
          current={current}
          places={places.entries}
          intentions={intentions.entries}
          scenes={scenes.entries}
          adult={adult.entries}
          tones={toneList.tones}
          errors={{
            lieux: places.error,
            intentions: intentions.error,
            scenes: scenes.error,
            tons: toneList.error,
            adultes: adult.error,
          }}
          selection={selection}
          branch={branch}
          onBranch={(next) => void onBranch(next)}
          onOpen={(chapter, id) => void onOpen(chapter, id)}
          onAdd={(chapter) => void onAdd(chapter)}
          onCreateScene={(chapter, intention, place) => void onCreateScene(chapter, intention, place)}
          onGo={onGo}
        />

        <div className={INSPECTOR}>
          {onTones ? (
            toneCatalogue.selected && (
              <ToneInspector
                tone={toneCatalogue.selected}
                draft={toneCatalogue.draft}
                worldLabel={world.label}
                status={toneCatalogue.status}
                creating={toneCatalogue.creatingNew}
                takenKeys={toneCatalogue.creatingNew ? (toneList.tones ?? []).map((t) => t.key) : []}
                users={usersOf('tone', toneCatalogue.selected.key)}
                onPatch={toneCatalogue.patch}
                enhancer={enhancer}
                onRemove={
                  toneCatalogue.creatingNew ? undefined : () => void toneCatalogue.remove(toneCatalogue.selected!.key)
                }
                onOpenScene={onOpenScene}
                onClose={() => void onClose()}
              />
            )
          ) : (
            editor!.isOpen && (
              <EntryInspector
                // a fresh inspector per entry: its autofocus and its identity row start over
                key={`${active}/${editor!.creatingNew ? '+' : editor!.selectedId}`}
                spec={editor!.spec as typeof SCENE_SPEC}
                draft={editor!.draft}
                saved={editor!.saved}
                context={context}
                worldLabel={world.label}
                status={editor!.status}
                creating={editor!.creatingNew}
                takenIds={editor!.creatingNew ? takenIds : []}
                preview={
                  active === 'scenes' || active === 'adultes' ? composedPrompt(editor!.draft, places.entries) : undefined
                }
                users={
                  active === 'lieux' && editor!.selectedId
                    ? usersOf('place', editor!.selectedId)
                    : active === 'intentions' && editor!.selectedId
                      ? usersOf('intention', editor!.selectedId)
                      : undefined
                }
                focusField={seededFocus ? 'prompt' : 'label'}
                onPatch={editor!.patch}
                enhancer={enhancer}
                onRemove={editor!.creatingNew ? undefined : () => void editor!.remove(editor!.selectedId!)}
                onOpenScene={onOpenScene}
                onClose={() => void onClose()}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}

/** The loading state (§S8 of screen-11) — `aria-hidden` on the column itself,
    so a screen reader hears the busy region, not six empty bars. */
function Skeletons({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-[10px] p-[12px]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-[34px] rounded-[6px] bg-panel" />
      ))}
    </div>
  )
}
