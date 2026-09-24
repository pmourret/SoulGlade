/* Bank of OpenPose skeletons (INPUTS/POSE/), consumed by the pose selector of
   the scene composer. Ported from the poses half of `static/advanced.js`, then
   reworked twice: search/filter/sort/rename/duplicate on a card grid
   (2026-09-02), then this — a TABLE, an inspector and a drop target
   (design-pass screen-7d, 2026-09-24).

   THE ONLY PLACE OF THE STUDIO WHERE A REAL PHOTO CAN TRANSIT — and it is never
   kept: AUTOMATION/pose_tools.py removes it from ComfyUI/input at the end of the
   extraction, success or failure. The interface says so where the file is
   chosen or dropped, because the person doing it is the one who needs to know.

   THE WORKSHOP BAR IS SHARED, NOT REBUILT. `BankScreen` owns the 44 px row and
   the sub-view nav inside it; this view is handed that nav as `nav` and puts
   its own controls next to it. Rendering a second bar here would put two rows
   of chrome above a table whose whole point is to be read in one go. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { errorOf, type ActionLike } from '../../../api/client'
import { PATHS } from '../../../app/routes'
import { useApi } from '../../../api/useApi'
import { useChrome } from '../../../chrome/ChromeContext'
import { useConfirm } from '../../../chrome/ConfirmContext'
import { Icon } from '../../../chrome/Icon'
import { useToast } from '../../../chrome/ToastContext'
import { useSystemState } from '../../../state/SystemStateContext'
import { NewPoseModal } from '../../pose-editor/NewPoseModal'
import { useOverlayPanel } from '../../produce/useOverlayPanel'
import { PoseInspector } from './PoseInspector'
import { PoseTable } from './PoseTable'
import { usePoseBank, type ProvenanceFilter, type UsageFilter } from './usePoseBank'
import { usePoseDrop } from './usePoseDrop'

type ExtractResponse = ActionLike & { name?: string }

const OFFLINE_HINT = 'nécessite ComfyUI en ligne'
/* THE PROMISE, said where the file is chosen. The drop overlay carries it in
   full (§S4); the button opens a NATIVE file picker, which leaves no surface
   to write on, so it says it on hover and on focus instead. It is the one
   sentence this screen may not lose: pose_tools.py deletes the photo from
   ComfyUI/input, success or failure, and the person handing over a real photo
   is the one who needs to know that. */
const PHOTO_HINT =
  "La photo source ne reste jamais sur le disque : elle est supprimée après l'extraction, seul le squelette est gardé"

export function PosesView({ nav }: { nav: ReactNode }) {
  const api = useApi()
  const confirm = useConfirm()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { narrow } = useChrome()
  const { state } = useSystemState()
  const {
    rows, totalCount,
    search, setSearch,
    provenanceFilter, setProvenanceFilter,
    usageFilter, setUsageFilter,
    sortBy, sortDir, sortOn,
    busyNames,
    rename, duplicate, remove, reload,
  } = usePoseBank()
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingFile, setPendingFile] = useState('')
  const [newPoseOpen, setNewPoseOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const comfy = Boolean(state?.comfy)
  const canExtract = comfy && !busy

  /* The column exists only if the data does (§S3). A bank made entirely of
     poses extracted before the sidecar has no date to show, and a column of
     five « — » is worse than no column. */
  const withDate = useMemo(() => rows.some((row) => row.createdAt), [rows])

  const selectedRow = rows.find((row) => row.name === selected) ?? null
  /* A pose can leave the filtered list under the selection — a filter change,
     a rename, its own removal. The inspector then shows a pose the table no
     longer holds, so the selection is dropped rather than frozen. */
  useEffect(() => {
    if (selected && !rows.some((row) => row.name === selected)) setSelected(null)
  }, [rows, selected])

  /* Under 1100 px the inspector is a drawer opened by the selection — same
     non-modal overlay contract as the scene list next door: Escape closes it,
     the focus goes in and comes back out. */
  const drawerRef = useRef<HTMLDivElement | null>(null)
  useOverlayPanel(narrow && Boolean(selectedRow), () => setSelected(null), drawerRef)

  const onDelete = async (name: string, label: string | null, scenesUsing: string[]) => {
    const ok = await confirm({
      title: 'Retirer ce squelette ?',
      button: scenesUsing.length ? 'Retirer quand même' : 'Retirer',
      danger: true,
      body: scenesUsing.length ? (
        <>
          <p>
            <b>{label || name}</b> est imposée à{' '}
            <b>{scenesUsing.length} scène{scenesUsing.length > 1 ? 's' : ''}</b>.{' '}
            {scenesUsing.length > 1 ? 'Elles la perdront' : 'Elle la perdra'} au prochain
            enregistrement, et la validation le signalera.
          </p>
          {/* The scenes are NAMED, never counted only (§S6, reprise de 7a A3):
              « 3 scènes » does not tell which work is about to change. */}
          <ul className="m-0 max-h-[160px] list-none overflow-y-auto rounded-card bg-bg p-[10px] text-[12px]">
            {scenesUsing.map((scene) => (
              <li key={scene}>{scene}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>
          Aucune scène ne le référence actuellement — <code>{name}</code> peut
          être retiré sans rien casser.
        </p>
      ),
    })
    if (!ok) return
    const result = await remove(name)
    toast(result.ok ? 'squelette retiré' : result.erreur || 'échec')
  }

  const onDuplicate = async (name: string) => {
    const result = await duplicate(name)
    toast(result.ok ? `dupliqué : ${result.name}` : result.erreur || 'échec')
  }

  const onRename = async (name: string, label: string) => {
    const result = await rename(name, label)
    if (!result.ok) toast(result.erreur)
  }

  /** THE single upload path — the button and the drop target both land here
      (§S4). */
  const extract = async (file: File) => {
    setBusy(true)
    setPendingFile(file.name)
    try {
      /* base64 in a JSON body, never multipart — the origin guard depends on
         the Content-Type being application/json (api/security.py). The prefix
         `data:...;base64,` is stripped: the route wants the payload alone. */
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const response = await api.post<ExtractResponse>('/api/pose/extract', {
        filename: file.name,
        data_base64: base64,
      })
      const failure = errorOf(response)
      if (failure) {
        toast(failure || 'échec')
        return
      }
      toast(`squelette extrait : ${response.name}`)
      if (response.name) setSelected(response.name)
      // guarded reload: an edit in progress on the Scenes view is not overwritten
      await reload(true)
    } finally {
      setBusy(false)
      setPendingFile('')
      // Same file twice in a row must re-fire `change`.
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const drop = usePoseDrop({ enabled: canExtract, extract, onRefused: toast })

  const resetFilters = () => {
    setSearch('')
    setProvenanceFilter('all')
    setUsageFilter('all')
  }

  return (
    <div className="flex h-full min-h-0 flex-col" id="bankPoses">
      {newPoseOpen && <NewPoseModal onClose={() => setNewPoseOpen(false)} />}

      {/* §S1/S2 — ONE 44 px row: the sub-view nav, what the bank is, and its
          five controls.

          EVERY CONTROL IS `flex-none`, and the SENTENCE is the only thing
          that gives: it is `flex-1 min-w-0` and truncates, so it both pushes
          the controls right and yields its own tail before any of them is
          pushed off the bar. The spec hid it under 1280 px; letting the
          layout shorten it does the same thing without a breakpoint, and
          keeps working at a width nobody thought to test.

          `flex-none` IS WRITTEN ON EACH CHILD, not once as `[&>*]:flex-none`:
          that variant and `flex-1` set the same property at the same
          specificity, so source order decided, the variant won, and the
          sentence stopped shrinking while still measuring as `flex-1` in the
          markup.

          Measured at 1440 px before this shape: the bar overflowed by
          2 543 px (see the select widths below), then by 45 px once those
          were fixed, then by 11 px until the line above. « Extraire d'une
          photo » was off-screen every time, and no amount of reading the JSX
          said so. */}
      <div className="flex h-[44px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]
                      [&>*]:whitespace-nowrap">
        {nav}

        {/* The bank is SHARED (no `character=` on /api/pose/*) — said here
            rather than assumed, because every other workshop on this screen
            is per-character. */}
        {/* HIDDEN UNDER 1280 px, and that is not decoration (§S1). Left
            visible, it stayed a second `flex-1` next to the search field and
            the two SHARED what little slack a 1024 px bar has: measured, the
            search collapsed to 35 px, wide enough for « nc ». The sentence is
            the one thing here that can be read later; the field cannot be
            typed into narrower. */}
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim2 max-[1280px]:hidden">
          <span id="nPoses">{totalCount}</span> squelette{totalCount > 1 ? 's' : ''} OpenPose ·
          partagés par tous les personnages
        </span>

        {/* Each label travels WITH its control rather than as a sibling of
            it: three 1 px boxes among the bar's own children would each
            still claim their 10 px of `gap`. */}
        {/* UNDER 1280 px THE SEARCH TAKES OVER as the thing that gives: the
            sentence is gone by then, and the six fixed controls still came to
            19 px more than a 1024 px bar (measured). The spec asks for 160 px
            there; letting it take whatever is left holds at every width
            instead of exactly one. */}
        <div className="flex flex-none items-center gap-[5px] max-[1280px]:min-w-0 max-[1280px]:flex-1">
          <label className="sr-only" htmlFor="poseSearch">
            rechercher un squelette
          </label>
          <Icon name="search" className="h-[14px] w-[14px] flex-none text-dim2" aria-hidden="true" />
          <input
            id="poseSearch"
            type="search"
            className="w-[210px] max-[1280px]:w-full"
            placeholder="nom ou libellé…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex-none">
          <label className="sr-only" htmlFor="poseProvenance">
            provenance
          </label>
          {/* WIDTH IS NOT OPTIONAL HERE. `chrome.css` gives every
              `input/select/textarea` `width:100%`, which in a flex row with
              `flex:none` resolves against the WHOLE bar — that is where the
              2 543 px above came from. */}
          <select
            id="poseProvenance"
            className="w-[178px] max-[1100px]:w-[150px]"
            value={provenanceFilter}
            onChange={(event) => setProvenanceFilter(event.target.value as ProvenanceFilter)}
          >
            <option value="all">Toutes provenances</option>
            <option value="preset">Gabarit</option>
            <option value="extraction">Photo</option>
          </select>
        </div>

        <div className="flex-none">
          <label className="sr-only" htmlFor="poseUsage">
            utilisation
          </label>
          <select
            id="poseUsage"
            className="w-[144px] max-[1100px]:w-[130px]"
            value={usageFilter}
            onChange={(event) => setUsageFilter(event.target.value as UsageFilter)}
          >
            <option value="all">Toutes</option>
            <option value="used">Utilisées</option>
            <option value="unused">Non utilisées</option>
          </select>
        </div>

        <button type="button" className="btn sm flex-none" id="btnNewPose" onClick={() => setNewPoseOpen(true)}>
          Nouvelle depuis un gabarit
        </button>

        {/* NO `<label htmlFor>` ON THIS ONE, and it is not the oversight the
            rule guards against. `hidden` takes the input out of the
            accessibility tree entirely: it is not a control a person can
            reach, it is the browser's file dialog behind one. The control is
            the button below, which carries its own visible name. A label
            pointing at a hidden input would announce a field nobody can
            focus. `ReferenceControls.tsx` still uses the label-as-button
            shape and still needs it — there the input IS the control. */}
        <input
          type="file"
          id="poseFile"
          accept="image/png,image/jpeg,image/webp"
          hidden
          ref={fileInput}
          onChange={() => {
            const file = fileInput.current?.files?.[0]
            if (file) void extract(file)
          }}
        />
        {/* THE HINT IS ON THE WRAPPER, not on the button. A disabled
            <button> fires no mouse event and takes no focus, so HintLayer's
            delegated listeners would never see it — the one state where the
            reading matters is the one where it would not show. */}
        <span className="flex-none" data-hint-text={comfy ? PHOTO_HINT : OFFLINE_HINT}>
          <button
            type="button"
            className="btn primary sm"
            id="btnPoseExtract"
            disabled={!canExtract}
            onClick={() => fileInput.current?.click()}
          >
            Extraire d'une photo
          </button>
        </span>
      </div>

      <div
        className={`grid min-h-0 flex-1 ${
          selectedRow && !narrow ? 'grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'
        }`}
      >
        <div
          className="relative min-h-0 overflow-y-auto"
          {...drop.handlers}
        >
          {busy && (
            /* Replaces `#poseMsg`: a thin band at the top of the table rather
               than a line of text at the bottom of the screen, where the one
               thing one watches during 20 s was out of sight. */
            <div
              className="sticky top-0 z-[2] border-b border-b-line bg-panel2 px-[16px] py-[7px] text-[12px]"
              role="status"
              id="poseExtractBand"
            >
              <span className="truncate">{pendingFile}</span> — Extraction en cours… environ 20 s
              {/* Native <progress> with no `value`: the browser draws the
                  indeterminate bar, and honours reduced motion itself. A
                  hand-rolled keyframe would be a second thing to maintain
                  for a band that shows for 20 s. */}
              <progress className="mt-[5px] block h-[3px] w-full" aria-hidden="true" />
            </div>
          )}

          <PoseTable
            rows={rows}
            totalCount={totalCount}
            selected={selected}
            busyNames={busyNames}
            sortBy={sortBy}
            sortDir={sortDir}
            withDate={withDate}
            onSort={sortOn}
            onSelect={setSelected}
            onOpen={(name) =>
              /* `search` carried forward explicitly — same reason as
                 NewPoseModal's own navigation: CharacterContext would
                 otherwise replace this one a tick later to re-add
                 `?character=`. */
              navigate({
                pathname: `${PATHS.poseEditor}/${encodeURIComponent(name)}`,
                search: location.search,
              })
            }
            onDelete={(row) => void onDelete(row.name, row.label, row.scenesUsing)}
            onResetFilters={resetFilters}
          />

          {drop.over && (
            <div
              className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-[8px]
                         border-2 border-dashed border-txt bg-bg/90 text-center"
              aria-live="polite"
            >
              {canExtract ? (
                <>
                  <b className="text-[17px]">Déposer pour extraire le squelette</b>
                  <span className="text-[12.5px] text-dim">
                    La photo est supprimée après l'extraction, seul le squelette est gardé
                  </span>
                  <span className="sr-only">Relâcher pour extraire</span>
                </>
              ) : (
                <b className="text-[17px]">
                  {busy ? 'Une extraction est déjà en cours' : 'Extraction impossible : ComfyUI est hors ligne'}
                </b>
              )}
            </div>
          )}
        </div>

        {selectedRow && (
          <div
            ref={drawerRef}
            id="posePanel"
            aria-label="Aperçu du squelette"
            role={narrow ? 'dialog' : undefined}
            className={`min-h-0 border-l border-l-line bg-panel ${
              narrow ? 'fixed top-0 right-0 bottom-0 z-[9] w-[min(340px,100vw)] shadow-elev' : ''
            }`}
          >
            {narrow && (
              <button
                type="button"
                className="ml-auto block border-0 bg-transparent px-[12px] py-[8px] text-[16px] text-dim hover:text-txt"
                aria-label="Fermer l'aperçu"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            )}
            <PoseInspector
              row={selectedRow}
              busy={busyNames.has(selectedRow.name)}
              onRename={(label) => void onRename(selectedRow.name, label)}
              onDuplicate={() => void onDuplicate(selectedRow.name)}
              onDelete={() => void onDelete(selectedRow.name, selectedRow.label, selectedRow.scenesUsing)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
