/* Référentiel > Mondes — ONE screen for both `/worlds` and
   `/worlds/:worldId/places` (design-pass screen-11).

   IT USED TO BE TWO. `/worlds` was a grid of cards linking to a second screen
   that held the catalog, and that second screen carried the adult catalog as a
   folded `<details>` with a full copy of the list and the inspector inside. The
   split cost a navigation to see what a world holds, and made « which world am
   I editing » a question one answered by reading the URL.

   THE SELECTED WORLD IS DERIVED, NEVER STORED: `worldId` comes from the route,
   and falls back to the first row of the registry. There is no second source of
   truth to drift from the URL — the same reasoning as `activeCategory` in
   `app/routes.ts`. `WorldPlacesScreen` is gone; its route mounts this file.

   THE SAVE BELONGS TO THE CHROME. A place is edited in the third column and
   written by the `DirtyBar` (§S5.4), like the tones workshop writes
   `creative.json`. That is also what makes leaving a modified place a QUESTION
   rather than a silent loss: changing world, changing tab or opening another
   place all pass through `leaveGuard`. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useChrome } from '../../chrome/ChromeContext'
import { useConfirm } from '../../chrome/ConfirmContext'
import { useRegisterPendingSave, type PendingSave } from '../../chrome/PendingSaveContext'
import { useToast } from '../../chrome/ToastContext'
import { PATHS, worldPlacesPath } from '../../app/routes'
import { CatalogueColumn, type CatalogueTab } from './CatalogueColumn'
import { NewWorldDialog } from './NewWorldDialog'
import { PlaceInspector } from './PlaceInspector'
import { useCatalogueEditor, type CatalogueEditor } from './useCatalogueEditor'
import { useWorldPlaces, type Place } from './useWorldPlaces'
import { useWorldRegistry } from './useWorldRegistry'
import { WorldList } from './WorldList'

const SHELL = 'screen flex h-full min-h-0 overflow-hidden'
const LEFT = 'flex w-[260px] shrink-0 flex-col overflow-hidden border-r border-line max-[1100px]:hidden'
const MIDDLE = 'flex w-[400px] shrink-0 flex-col overflow-hidden border-r border-line max-[1100px]:w-[340px]'
const RIGHT = 'flex min-w-0 flex-1 flex-col overflow-hidden bg-panel2'

export function WorldsScreen() {
  const { worldId } = useParams<{ worldId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const confirm = useConfirm()
  const { narrow } = useChrome()
  const registry = useWorldRegistry()

  const [tab, setTab] = useState<CatalogueTab>('ordinaire')
  const [dialogOpen, setDialogOpen] = useState(false)
  /* The world a creation just made, consumed once ITS empty catalog has
     loaded: one lands on its first place (§S8), because an empty catalog is
     not something one came to look at.

     IT HOLDS THE ID, NOT A BOOLEAN. Measured on the first build: a flag fired
     the moment it was set, against the PREVIOUS world's places — `useWorldPlaces`
     keeps the loaded catalog until the next one answers, so there is a window
     where the route already names the new world and the list is still the old
     one. Waiting for « this world, and it is empty » closes it without
     touching the loader. */
  const [freshWorld, setFreshWorld] = useState<string | null>(null)

  const worlds = registry.worlds
  const selectedId = worldId ?? worlds?.[0]?.id ?? null
  const world = worlds?.find((w) => w.id === selectedId) ?? null

  const ordinary = useWorldPlaces(selectedId)
  const adult = useWorldPlaces(selectedId, { adulte: true })

  /* The same warning for both catalogs: a retired place breaks the frame of
     every character scene that references it, adult or not. */
  const confirmRemoval = useCallback(
    (place: Place) =>
      confirm({
        title: `Retirer le lieu « ${place.label || place.id} » ?`,
        button: 'Retirer',
        danger: true,
        body: (
          <p>
            Toute scène de personnage qui le référence (`world_ref`) perdra son cadre au prochain
            enregistrement de son atelier — elle ne sera plus produisible sans être réassignée.
          </p>
        ),
      }),
    [confirm],
  )

  const handlers = useMemo(() => ({ onSaved: toast, confirmRemoval }), [toast, confirmRemoval])
  const ordinaryEditor = useCatalogueEditor(ordinary, handlers)
  const adultEditor = useCatalogueEditor(adult, handlers)
  const editor: CatalogueEditor = tab === 'adulte' ? adultEditor : ordinaryEditor
  const file = `WORLDS/${selectedId}${tab === 'adulte' ? '.adulte' : ''}.json`

  const saveDraft = useCallback(async () => {
    const draft = editor.draft
    if (!draft.prompt.trim() || (editor.creatingNew && !draft.id.trim())) {
      toast(
        editor.creatingNew && !draft.id.trim()
          ? 'un lieu a besoin d’un identifiant'
          : 'un lieu a besoin d’un prompt : c’est le cadre que les scènes héritent',
      )
      return false
    }
    return editor.save({ ...draft, id: draft.id.trim(), prompt: draft.prompt.trim() })
  }, [editor, toast])

  /** Three honest issues before losing what is typed: write it, drop it, stay. */
  const leaveGuard = useCallback(async (): Promise<boolean> => {
    if (!editor.dirty) return true
    const outcome = await confirm({
      title: `Abandonner les modifications de « ${editor.draft.label || editor.draft.id || 'ce lieu'} » ?`,
      button: 'Enregistrer puis continuer',
      alt: 'Abandonner',
      body: (
        <p>
          Ce lieu n'est pas écrit dans <code>{file}</code>. Les personnages de ce monde héritent
          toujours de ce que le fichier contient.
        </p>
      ),
    })
    if (outcome === false) return false
    if (outcome === true) return await saveDraft()
    editor.reset()
    return true
  }, [confirm, editor, file, saveDraft])

  const goToWorld = useCallback(
    async (id: string) => {
      if (id === selectedId) return
      if (!(await leaveGuard())) return
      /* `replace` when we came from the bare /worlds: the registry picked that
         first world, the user did not, so Back should leave the screen rather
         than walk back through a choice nobody made. Search carried forward
         explicitly, or `CharacterContext` would re-add `?character=` a tick
         later and push a second entry. */
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

  const onOpenPlace = useCallback(
    async (id: string) => {
      if (!(await leaveGuard())) return
      editor.open(id)
    },
    [leaveGuard, editor],
  )

  const onAddPlace = useCallback(async () => {
    if (!(await leaveGuard())) return
    editor.add()
  }, [leaveGuard, editor])

  const onClosePlace = useCallback(async () => {
    if (!(await leaveGuard())) return
    editor.close()
  }, [leaveGuard, editor])

  useEffect(() => {
    if (!freshWorld || freshWorld !== selectedId) return
    if (ordinary.places === null || ordinary.places.length > 0) return
    setFreshWorld(null)
    ordinaryEditor.add()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshWorld, selectedId, ordinary.places])

  const onCreateWorld = async (fields: Parameters<typeof registry.create>[0]) => {
    const result = await registry.create(fields)
    if (result.erreur) return result.erreur
    toast(`monde « ${fields.label} » créé`)
    setDialogOpen(false)
    setTab('ordinaire')
    setFreshWorld(result.id!)
    navigate({ pathname: worldPlacesPath(result.id!), search: location.search })
    return null
  }

  /* Declared to the chrome's banner, which draws it and owns Ctrl S. MEMOIZED:
     handing a fresh object every render would set state on every render. */
  const characters = selectedId ? registry.characterCount(selectedId) : null
  const pendingSave = useMemo<PendingSave | null>(
    () =>
      editor.dirty && world
        ? {
            title: `Lieu « ${editor.draft.label || editor.draft.id || 'sans nom'} » modifié`,
            body: (
              <>
                <code>{file}</code>
                {/* Only when a route already answered it, and only from 1 up:
                    `CHARACTERS/` is outside the repo, and « 0 personnage »
                    would read as a measurement made on data that is absent. */}
                {characters && characters > 0 ? (
                  <> — {characters} personnage{characters > 1 ? 's' : ''} compose
                    {characters > 1 ? 'nt' : ''} dans ce monde et hérite
                    {characters > 1 ? 'nt' : ''} de ce cadre.</>
                ) : (
                  <> — les personnages de ce monde héritent de ce cadre.</>
                )}
              </>
            ),
            saveLabel: 'Enregistrer le lieu',
            onSave: () => void saveDraft(),
            onRevert: () => editor.reset(),
          }
        : null,
    [editor.dirty, editor.draft.label, editor.draft.id, editor.reset, world, file, characters, saveDraft],
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
            Un monde porte le catalogue de lieux où les personnages composent leurs scènes.
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
              ordinaryCount={ordinary.places?.length ?? world.places_count}
              adultCount={adult.places?.length ?? 0}
              ordinary={ordinary.places}
              adult={adult.places}
              ordinaryEditor={ordinaryEditor}
              adultEditor={adultEditor}
              ordinaryError={ordinary.error}
              adultError={adult.error}
              narrow={narrow}
              worlds={worlds}
              onSelectWorld={(id) => void goToWorld(id)}
              onOpenPlace={(id) => void onOpenPlace(id)}
              onAddPlace={() => void onAddPlace()}
            />
          </div>

          <div className={RIGHT}>
            {editor.selected ? (
              <PlaceInspector
                place={editor.creatingNew ? BLANK : toPatch(editor.selected)}
                draft={editor.draft}
                worldLabel={world.label}
                saving={editor.saving}
                status={editor.status}
                idEditable={editor.creatingNew}
                takenIds={(tab === 'adulte' ? adult.places : ordinary.places)?.map((p) => p.id) ?? []}
                onPatch={editor.patch}
                onRemove={
                  editor.creatingNew ? undefined : () => void editor.remove(editor.selected!.id)
                }
                onClose={() => void onClosePlace()}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-[24px]">
                <div className="empty text-[13px]">Ouvre un lieu dans la liste, ou ajoutes-en un.</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const BLANK = { id: '', label: '', intention: '', prompt: '' }
const toPatch = (place: Place) => ({
  id: place.id ?? '',
  label: place.label ?? '',
  intention: place.intention ?? '',
  prompt: place.prompt ?? '',
})

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
