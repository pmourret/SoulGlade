/* Référentiel > Mondes — ONE screen for both `/worlds` and
   `/worlds/:worldId/places` (design-pass screen-11), with a world's four
   catalogs: Lieux, Intentions, Scènes (and their adult branch), Tons
   (ADR-0027, IT-11 chantier 4).

   THE SELECTED WORLD IS DERIVED, NEVER STORED: `worldId` comes from the route,
   and falls back to the first row of the registry — the same reasoning as
   `activeCategory` in `app/routes.ts`.

   THE SAVE BELONGS TO THE CHROME. An entry is edited in the third column and
   written by the `DirtyBar` (§S5.4). That is also what makes leaving a
   modified entry a QUESTION rather than a silent loss: changing world, tab or
   branch, or opening another entry, all pass through `leaveGuard`. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useChrome } from '../../chrome/ChromeContext'
import { useConfirm } from '../../chrome/ConfirmContext'
import { useRegisterPendingSave, type PendingSave } from '../../chrome/PendingSaveContext'
import { useToast } from '../../chrome/ToastContext'
import { PATHS, worldPlacesPath } from '../../app/routes'
import { CatalogueColumn, type CatalogueTab, type ColumnCatalog, type RowView, type SceneBranch } from './CatalogueColumn'
import { INTENTION_SPEC, PLACE_SPEC, SCENE_SPEC, composedPrompt, type CatalogContext } from './catalogSpecs'
import { EntryInspector } from './EntryInspector'
import { NewWorldDialog } from './NewWorldDialog'
import { ToneInspector } from './ToneInspector'
import { useCatalogueEditor } from './useCatalogueEditor'
import { useToneCatalogue } from './useToneCatalogue'
import { useWorldCatalog, type WorldIntention, type WorldPlace, type WorldScene } from './useWorldCatalog'
import { useWorldTones, type WorldTone } from './useWorldTones'
import { useWorldRegistry } from './useWorldRegistry'
import { WorldList } from './WorldList'

const SHELL = 'screen flex h-full min-h-0 overflow-hidden'
const LEFT = 'flex w-[260px] shrink-0 flex-col overflow-hidden border-r border-line max-[1100px]:hidden'
const MIDDLE = 'flex w-[400px] shrink-0 flex-col overflow-hidden border-r border-line max-[1100px]:w-[340px]'
const RIGHT = 'flex min-w-0 flex-1 flex-col overflow-hidden bg-panel2'

const TABS: CatalogueTab[] = ['lieux', 'intentions', 'scenes', 'tons']

/** « <noun> » with its article and agreement, for the banner and questions. */
const NOUNS = {
  lieux: { name: 'Lieu', this: 'Ce lieu', done: 'modifié', save: 'Enregistrer le lieu' },
  intentions: { name: 'Intention', this: 'Cette intention', done: 'modifiée', save: 'Enregistrer l’intention' },
  scenes: { name: 'Scène', this: 'Cette scène', done: 'modifiée', save: 'Enregistrer la scène' },
  tons: { name: 'Ton', this: 'Ce ton', done: 'modifié', save: 'Enregistrer le ton' },
} as const

export function WorldsScreen() {
  const { worldId } = useParams<{ worldId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const confirm = useConfirm()
  const { narrow } = useChrome()
  const registry = useWorldRegistry()

  /* `?onglet=` opens a tab: the tones workshop links to Tons, the Banque's
     « ouvrir dans Mondes » to Scènes. Read once, at mount. */
  const [tab, setTab] = useState<CatalogueTab>(() => {
    const asked = new URLSearchParams(location.search).get('onglet') as CatalogueTab | null
    return asked && TABS.includes(asked) ? asked : 'scenes'
  })
  const [branch, setBranch] = useState<SceneBranch>('ordinaires')
  const [dialogOpen, setDialogOpen] = useState(false)
  /* The world a creation just made, consumed once ITS empty places have
     loaded: one lands on creating its first place (§S8). It holds the id,
     not a boolean: the loader keeps the previous world's list until the next
     one answers, and a flag fired against the wrong world. */
  const [freshWorld, setFreshWorld] = useState<string | null>(null)

  const worlds = registry.worlds
  const selectedId = worldId ?? worlds?.[0]?.id ?? null
  const world = worlds?.find((w) => w.id === selectedId) ?? null

  const places = useWorldCatalog<WorldPlace>(selectedId, 'places')
  const intentions = useWorldCatalog<WorldIntention>(selectedId, 'intentions')
  const scenes = useWorldCatalog<WorldScene>(selectedId, 'scenes')
  const adult = useWorldCatalog<WorldScene>(selectedId, 'scenes-adulte')
  const toneList = useWorldTones(selectedId)

  /* A place or an intention a scene uses cannot leave the world: the server
     refuses it (`services/worlds.py`). Said BEFORE the question, with the
     scenes named, so no confirmation is asked for a gesture that cannot happen. */
  const usedBy = useCallback(
    (field: 'place' | 'intention', value: string) =>
      [...(scenes.entries ?? []), ...(adult.entries ?? [])]
        .filter((s) => s[field] === value)
        .map((s) => s.label || s.id),
    [scenes.entries, adult.entries],
  )
  const refuseIfUsed = useCallback(
    (field: 'place' | 'intention', value: string, name: string) => {
      const users = usedBy(field, value)
      if (!users.length) return false
      toast(`« ${name} » sert encore aux scènes ${users.join(', ')} : change-les d’abord`)
      return true
    },
    [usedBy, toast],
  )

  const placeEditor = useCatalogueEditor(places, PLACE_SPEC, {
    onSaved: toast,
    confirmRemoval: async (place) => {
      if (refuseIfUsed('place', place.id, place.label || place.id)) return false
      return confirm({
        title: `Retirer le lieu « ${place.label || place.id} » ?`,
        button: 'Retirer',
        danger: true,
        body: <p>Aucune scène de ce monde ne l’utilise. Il disparaît du monde livré.</p>,
      })
    },
  })
  const intentionEditor = useCatalogueEditor(intentions, INTENTION_SPEC, {
    onSaved: toast,
    confirmRemoval: async (intention) => {
      if (refuseIfUsed('intention', intention.key, intention.label || intention.key)) return false
      return confirm({
        title: `Retirer l’intention « ${intention.label || intention.key} » ?`,
        button: 'Retirer',
        danger: true,
        body: <p>Aucune scène de ce monde ne la porte. Les personnages ne la proposeront plus dans Produire.</p>,
      })
    },
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

  const onTones = tab === 'tons'
  const editor =
    tab === 'lieux' ? placeEditor : tab === 'intentions' ? intentionEditor : branch === 'adultes' ? adultEditor : sceneEditor
  const file = `WORLDS/${selectedId}${tab === 'scenes' && branch === 'adultes' ? '.adulte' : ''}.json`
  const nouns = NOUNS[tab]

  /* What the chrome and the leave guard need, whichever catalog is open. */
  const pending = onTones
    ? {
        dirty: toneCatalogue.dirty,
        name: toneCatalogue.draft.label || toneCatalogue.draft.key || 'sans nom',
        reset: toneCatalogue.reset,
        save: toneCatalogue.save,
      }
    : {
        dirty: editor.dirty,
        name: editor.draft.label || editor.draft[editor.spec.idKey] || 'sans nom',
        reset: editor.reset,
        save: editor.save,
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

  const goToWorld = useCallback(
    async (id: string) => {
      if (id === selectedId) return
      if (!(await leaveGuard())) return
      /* `replace` when we came from the bare /worlds: the registry picked that
         first world, the user did not. Search carried forward explicitly, or
         `CharacterContext` would re-add `?character=` and push a second entry. */
      navigate(
        { pathname: worldPlacesPath(id), search: location.search },
        { replace: location.pathname === PATHS.worlds },
      )
    },
    [selectedId, leaveGuard, navigate, location.search, location.pathname],
  )

  const onTab = useCallback(
    async (next: CatalogueTab) => {
      if (next === tab) return
      if (!(await leaveGuard())) return
      setTab(next)
    },
    [tab, leaveGuard],
  )

  const onBranch = useCallback(
    async (next: SceneBranch) => {
      if (next === branch) return
      if (!(await leaveGuard())) return
      setBranch(next)
    },
    [branch, leaveGuard],
  )

  const onOpen = useCallback(
    async (id: string) => {
      if (!(await leaveGuard())) return
      if (onTones) toneCatalogue.open(id)
      else editor.open(id)
    },
    [leaveGuard, editor, onTones, toneCatalogue],
  )

  const onAdd = useCallback(async () => {
    if (!(await leaveGuard())) return
    if (onTones) toneCatalogue.add()
    else editor.add()
  }, [leaveGuard, editor, onTones, toneCatalogue])

  const onClose = useCallback(async () => {
    if (!(await leaveGuard())) return
    if (onTones) toneCatalogue.close()
    else editor.close()
  }, [leaveGuard, editor, onTones, toneCatalogue])

  useEffect(() => {
    if (!freshWorld || freshWorld !== selectedId) return
    if (places.entries === null || places.entries.length > 0) return
    setFreshWorld(null)
    placeEditor.add()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshWorld, selectedId, places.entries])

  const onCreateWorld = async (fields: Parameters<typeof registry.create>[0]) => {
    const result = await registry.create(fields)
    if (result.erreur) return result.erreur
    toast(`monde « ${fields.label} » créé`)
    setDialogOpen(false)
    setTab('lieux')
    setFreshWorld(result.id!)
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

  /* The rows each list shows — computed here, so the column stays pure. */
  const intentionLabel = (key?: string | null) =>
    key ? (intentions.entries?.find((i) => i.key === key)?.label ?? key) : undefined
  const placeLabel = (id?: string | null) => (id ? (places.entries?.find((p) => p.id === id)?.label ?? id) : '')
  const sceneRows = (list: WorldScene[] | null): RowView[] | null =>
    list?.map((s) => ({
      id: s.id,
      title: s.label || s.id,
      tag: intentionLabel(s.intention),
      line: [placeLabel(s.place), s.prompt].filter(Boolean).join(' · '),
    })) ?? null
  const column = (
    rows: RowView[] | null,
    ed: { creatingNew: boolean; selectedId: string | null; dirty: boolean },
    error: string | null,
    fallback: number,
  ): ColumnCatalog => ({
    rows,
    editor: { creatingNew: ed.creatingNew, selectedId: ed.selectedId, dirty: ed.dirty },
    error,
    count: rows?.length ?? fallback,
  })
  const context: CatalogContext = { places: places.entries, intentions: intentions.entries, tones: toneList.tones }

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
        <div className={LEFT} aria-hidden="true">
          <Skeletons rows={6} />
        </div>
        <div className={MIDDLE} aria-hidden="true">
          <Skeletons rows={5} />
        </div>
        <div className={RIGHT} aria-hidden="true">
          <Skeletons rows={4} />
        </div>
      </div>
    )
  }

  const takenIds = (editor.spec.idKey === 'key'
    ? (intentions.entries ?? []).map((i) => i.key)
    : ((tab === 'lieux' ? places.entries : branch === 'adultes' ? adult.entries : scenes.entries) ?? []).map(
        (e) => e.id,
      )) as string[]

  return (
    <div className={SHELL} id="worlds">
      {dialogOpen && (
        <NewWorldDialog
          packs={registry.packs}
          creating={registry.creating}
          takenIds={worlds.map((w) => w.id)}
          onCreate={onCreateWorld}
          onClose={() => setDialogOpen(false)}
        />
      )}

      <div className={LEFT}>
        <WorldList
          worlds={worlds}
          selectedId={selectedId}
          onSelect={(id) => void goToWorld(id)}
          onNew={() => setDialogOpen(true)}
        />
      </div>

      {world === null ? (
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
      ) : (
        <>
          <div className={MIDDLE} id="worldPlaces">
            <CatalogueColumn
              world={world}
              tab={tab}
              onTab={(next) => void onTab(next)}
              branch={branch}
              onBranch={(next) => void onBranch(next)}
              places={column(
                places.entries?.map((p) => ({ id: p.id, title: p.label || p.id, line: p.prompt })) ?? null,
                placeEditor,
                places.error,
                world.places_count,
              )}
              intentions={column(
                intentions.entries?.map((i) => ({
                  id: i.key,
                  title: `${i.icon ? `${i.icon} ` : ''}${i.label || i.key}`,
                  tag: i.key,
                  line: i.prompt_add || 'aucun fragment de prompt',
                })) ?? null,
                intentionEditor,
                intentions.error,
                world.intentions_count,
              )}
              scenes={column(sceneRows(scenes.entries), sceneEditor, scenes.error, world.scenes_count)}
              adult={column(sceneRows(adult.entries), adultEditor, adult.error, 0)}
              tones={toneList.tones}
              toneCatalogue={toneCatalogue}
              tonesError={toneList.error}
              tonesCount={toneList.tones?.length ?? world.tones_count ?? 0}
              narrow={narrow}
              worlds={worlds}
              onSelectWorld={(id) => void goToWorld(id)}
              onOpen={(id) => void onOpen(id)}
              onAdd={() => void onAdd()}
            />
          </div>

          <div className={RIGHT}>
            {onTones ? (
              toneCatalogue.selected ? (
                <ToneInspector
                  tone={toneCatalogue.selected}
                  draft={toneCatalogue.draft}
                  worldLabel={world.label}
                  status={toneCatalogue.status}
                  creating={toneCatalogue.creatingNew}
                  takenKeys={toneCatalogue.creatingNew ? (toneList.tones ?? []).map((t) => t.key) : []}
                  onPatch={toneCatalogue.patch}
                  onRemove={
                    toneCatalogue.creatingNew ? undefined : () => void toneCatalogue.remove(toneCatalogue.selected!.key)
                  }
                  onClose={() => void onClose()}
                />
              ) : (
                <EmptyInspector noun="un ton" />
              )
            ) : editor.isOpen ? (
              <EntryInspector
                // a fresh inspector per entry: its autofocus and its identity row start over
                key={`${tab}/${branch}/${editor.creatingNew ? '+' : editor.selectedId}`}
                spec={editor.spec as typeof SCENE_SPEC}
                draft={editor.draft}
                saved={editor.saved}
                context={context}
                worldLabel={world.label}
                status={editor.status}
                creating={editor.creatingNew}
                takenIds={editor.creatingNew ? takenIds : []}
                preview={tab === 'scenes' ? composedPrompt(editor.draft, places.entries) : undefined}
                onPatch={editor.patch}
                onRemove={editor.creatingNew ? undefined : () => void editor.remove(editor.selectedId!)}
                onClose={() => void onClose()}
              />
            ) : (
              <EmptyInspector
                noun={tab === 'lieux' ? 'un lieu' : tab === 'intentions' ? 'une intention' : 'une scène'}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyInspector({ noun }: { noun: string }) {
  return (
    <div className="flex h-full items-center justify-center p-[24px]">
      <div className="empty text-[13px]">Ouvre {noun} dans la liste, ou ajoutes-en.</div>
    </div>
  )
}

/** The loading state of the three columns (§S8) — `aria-hidden` on the column
    itself, so a screen reader hears the busy region, not six empty bars. */
function Skeletons({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-[10px] p-[12px]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-[34px] rounded-[6px] bg-panel" />
      ))}
    </div>
  )
}
