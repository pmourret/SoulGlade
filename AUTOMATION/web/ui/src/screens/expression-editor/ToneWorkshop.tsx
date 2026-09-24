/* Ateliers > Tons — the tone list and its expression editor side by side
   (design-pass screen-8, 2026-09-24). Replaces `ExpressionEditorScreen.tsx`.

   TWO SCREENS BECAME ONE. `/bank/tones` was a grid of cards, each linking out
   to `/bank/tones/edit/:tone`, a full-frame editor with no way back to the
   next tone: setting up three tones cost six navigations, and nothing said of
   a tone whether it was configured without opening it. Both routes now mount
   THIS screen — the path is the shareable address of a selection, not a second
   destination — and picking a tone in the left column navigates in place.

   THE WORKSHOP BAR IS SHARED, NOT REBUILT. `BankScreen` owns the 44 px row and
   the sub-view nav inside it; this view is handed that nav as `nav` and puts
   its own sentence next to it, exactly as `PosesView` does since screen-7d.

   WHAT THIS SCREEN NEVER DOES: create, rename or delete a tone. Tones are
   hand-authored in `creative.json`; this only tunes the `expression` range of
   one that already exists. */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useApi } from '../../api/useApi'
import { PATHS } from '../../app/routes'
import { useChrome } from '../../chrome/ChromeContext'
import { useConfirm } from '../../chrome/ConfirmContext'
import { useLightbox } from '../../chrome/LightboxContext'
import { useRegisterPendingSave, type PendingSave } from '../../chrome/PendingSaveContext'
import { useToast } from '../../chrome/ToastContext'
import { useConfig } from '../../state/ConfigContext'
import { useSystemState } from '../../state/SystemStateContext'
import { ParamPanel } from './ParamPanel'
import { ToneList } from './ToneList'
import { TrialColumn } from './TrialColumn'
import { MAX_SELECTED_PHOTOS, useExpressionEditor, type GalleryItem } from './useExpressionEditor'
import { PARAM_NAMES, useToneList, type ToneRow } from './useToneList'

const BANK_SENTENCE =
  'Les tons se déclarent dans creative.json · cet écran règle leur plage d’expression'

export function ToneWorkshop({ nav }: { nav: ReactNode }) {
  const { tone: routeTone } = useParams<{ tone?: string }>()
  const { rows, loaded } = useToneList()

  /* No `:tone` in the path: the FIRST declared tone, in `creative.tones`
     order (§S1). The URL is left alone until the user picks one — arriving on
     /bank/tones and being bounced to /bank/tones/edit/<something> before
     touching anything would put a choice in the history nobody made. */
  const toneKey = routeTone ?? rows[0]?.key ?? null

  if (!loaded) {
    return (
      <div className="flex h-full min-h-0 flex-col" id="bankTones">
        <div className="flex h-[44px] flex-none items-center gap-[12px] border-b border-b-line px-[16px]">
          {nav}
        </div>
        <p className="tiny p-[16px]">chargement…</p>
      </div>
    )
  }

  return <ToneWorkshopInner nav={nav} toneKey={toneKey} routeTone={routeTone ?? null} rows={rows} />
}

function ToneWorkshopInner({
  nav, toneKey, routeTone, rows,
}: {
  nav: ReactNode
  toneKey: string | null
  /** Null when the path carries no tone — the `replace` rule of §S1. */
  routeTone: string | null
  rows: ToneRow[]
}) {
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const location = useLocation()
  const { narrow } = useChrome()
  const { qc } = useConfig()
  const { state } = useSystemState()
  const { open: openLightbox } = useLightbox()
  const {
    tone, params, dirty, reset,
    setTrial, setMin, setMax, toggleIncluded, setAsMin, setAsMax,
    undo, redo, canUndo, canRedo,
    copySources, copyFromTone,
    photos, photosError,
    selectedPhotos, togglePhotoSelection, results,
    renderAll, retryPhoto,
    paramsChangedAt,
    save,
  } = useExpressionEditor(toneKey ?? '')

  const [viewingOriginal, setViewingOriginal] = useState(false)

  const toneLabel = tone?.label || tone?.key || (toneKey ?? '')
  const comfy = Boolean(state?.comfy)
  const anyRendering = selectedPhotos.some((p) => results[p.name]?.rendering)
  const canRender = selectedPhotos.length > 0 && comfy && !anyRendering
  /* The reason must be ACTIONABLE. Measured with an emptied gallery: the
     button said « choisis d'abord une photo d'essai » while the strip right
     next to it said there were none — so the empty gallery gets its own
     reason, ahead of the missing selection it causes. */
  const renderHint = !comfy
    ? 'nécessite ComfyUI en ligne'
    : photos !== null && photos.length === 0
      ? 'aucune image validée à essayer : la Revue en produira'
      : selectedPhotos.length === 0
        ? "choisis d'abord une photo d'essai"
        : anyRendering
          ? 'un rendu est déjà en cours'
          : null

  const onSaveRange = useCallback(async () => {
    const result = await save()
    toast(result.ok ? 'plage d’expression enregistrée' : result.erreur)
  }, [save, toast])

  const onRevertRange = useCallback(async () => {
    const ok = await confirm({
      title: 'Revenir à la plage enregistrée ?',
      button: 'Revenir en arrière',
      body: (
        <p>
          Les réglages faits dans cette page seront perdus — le ton reprend la
          plage que <code>creative.json</code> contient déjà sur disque.
        </p>
      ),
    })
    if (ok) reset()
  }, [confirm, reset])

  /* Declared to the chrome's banner (§S2), which draws it and owns Ctrl S.
     MEMOIZED: handing a fresh object every render would set state on every
     render, which is a render loop. */
  const pendingSave = useMemo<PendingSave | null>(
    () =>
      dirty && tone
        ? {
            title: `Plage de « ${toneLabel} » modifiée`,
            body: (
              <>
                <code>creative.json</code> — la génération tire toujours dans la
                plage enregistrée, pas dans celle affichée ici.
              </>
            ),
            saveLabel: 'Enregistrer la plage',
            onSave: onSaveRange,
            onRevert: onRevertRange,
          }
        : null,
    [dirty, tone, toneLabel, onSaveRange, onRevertRange],
  )
  useRegisterPendingSave(pendingSave)

  const goTo = useCallback(
    (key: string) => {
      navigate(
        { pathname: `${PATHS.expressionEditor}/${encodeURIComponent(key)}`, search: location.search },
        /* `replace` when we came from the bare /bank/tones: that entry never
           named a tone, so the back button should leave the workshop rather
           than walk back through a selection the user did not make. */
        { replace: routeTone === null },
      )
    },
    [navigate, location.search, routeTone],
  )

  /** Changing tone throws away what is not saved, so it asks first (§S1) —
      three issues, because saving and discarding are two different acts. */
  const onSelectTone = useCallback(
    async (key: string) => {
      if (key === toneKey) return
      if (dirty) {
        const outcome = await confirm({
          title: `Abandonner les modifications de « ${toneLabel} » ?`,
          button: 'Enregistrer puis continuer',
          alt: 'Abandonner',
          body: (
            <p>
              La plage de ce ton n'est pas écrite dans <code>creative.json</code>.
              Ouvrir un autre ton la reprend telle qu'elle est sur disque.
            </p>
          ),
        })
        if (outcome === false) return
        if (outcome === true) {
          const result = await save()
          if (!result.ok) {
            toast(result.erreur)
            return
          }
        }
      }
      goTo(key)
    },
    [toneKey, dirty, confirm, toneLabel, save, toast, goTo],
  )

  const onSelectPhoto = (photo: GalleryItem) => {
    if (togglePhotoSelection(photo) === 'limit') {
      toast(`${MAX_SELECTED_PHOTOS} photos maximum — décoche-en une pour en ajouter une autre`)
    }
  }

  /* `R` renders, Ctrl+Z / Ctrl+Maj+Z (or Ctrl+Y) walk the history — bound on
     the SCREEN, not on one column: undoing works the same whether the focus
     sits in a bound field, on the rule, or on a photo. A bare `R` is skipped
     while typing, which is the whole reason it is guarded rather than the
     shortcut being given a modifier nobody would remember. */
  useEffect(() => {
    const typing = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      return Boolean(el?.closest('input,textarea,select,[contenteditable="true"]'))
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase()
        if (key === 'z') {
          event.preventDefault()
          if (event.shiftKey) redo()
          else undo()
        } else if (key === 'y') {
          event.preventDefault()
          redo()
        }
        return
      }
      if ((event.key === 'r' || event.key === 'R') && !event.altKey && !typing(event.target)) {
        if (!canRender) return
        event.preventDefault()
        renderAll()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, renderAll, canRender])

  /* The open tone's strip shows what is on SCREEN, the others what is on disk:
     ticking a parameter must light its marker before the save, or the strip
     would contradict the panel next to it. */
  const listRows = useMemo(
    () =>
      rows.map((row) =>
        row.key === toneKey && params
          ? { key: row.key, label: row.label, includedParams: PARAM_NAMES.filter((n) => params[n].included) }
          : { key: row.key, label: row.label, includedParams: row.configuredParams },
      ),
    [rows, toneKey, params],
  )

  if (rows.length === 0) {
    return (
      <Frame nav={nav} narrow={narrow} rows={[]} toneKey={null} onSelectTone={onSelectTone}>
        <div className="empty m-[16px] rounded-card border border-line bg-panel px-[16px] py-[28px] text-[13px]">
          <b className="mb-[4px] block">Aucun ton déclaré pour ce personnage.</b>
          Les tons s'ajoutent dans <code>creative.json</code>.
        </div>
      </Frame>
    )
  }

  if (!tone || !params) {
    return (
      <Frame nav={nav} narrow={narrow} rows={listRows} toneKey={null} onSelectTone={onSelectTone}>
        <div className="empty m-[16px] rounded-card border border-line bg-panel px-[16px] py-[28px] text-[13px]">
          ton introuvable : {toneKey}
        </div>
      </Frame>
    )
  }

  const neutral = PARAM_NAMES.every((name) => !params[name].included)

  return (
    <Frame nav={nav} narrow={narrow} rows={listRows} toneKey={toneKey} onSelectTone={onSelectTone}>
      <div
        id="expressionEditor"
        /* Three columns (§S2). Under 1100 px the list left the grid for a
           picker in the bar above, so there are two. */
        className={`grid min-h-0 flex-1 ${
          narrow ? 'grid-cols-[minmax(0,1fr)_380px]' : 'grid-cols-[220px_minmax(0,1fr)_440px]'
        }`}
      >
        {!narrow && (
          <ToneList
            rows={listRows}
            selected={toneKey}
            dirtyKey={dirty ? toneKey : null}
            onSelect={(key) => void onSelectTone(key)}
          />
        )}

        <TrialColumn
          photos={photos}
          photosError={photosError}
          selected={selectedPhotos}
          results={results}
          imageUrl={api.image}
          paramsChangedAt={paramsChangedAt.current}
          viewingOriginal={viewingOriginal}
          rendering={anyRendering}
          canRender={canRender}
          renderHint={renderHint}
          neutral={neutral}
          toneLabel={toneLabel}
          ok={qc.ok}
          watch={qc.watch}
          onSelectPhoto={onSelectPhoto}
          onViewingOriginal={setViewingOriginal}
          onRender={renderAll}
          onRetry={retryPhoto}
          openLightbox={openLightbox}
        />

        <ParamPanel
          toneLabel={toneLabel}
          params={params}
          copySources={copySources}
          canUndo={canUndo}
          canRedo={canRedo}
          onTrial={setTrial}
          onMin={setMin}
          onMax={setMax}
          onToggle={toggleIncluded}
          onSetAsMin={setAsMin}
          onSetAsMax={setAsMax}
          onCopy={copyFromTone}
          onUndo={undo}
          onRedo={redo}
        />
      </div>
    </Frame>
  )
}

/** The 44 px workshop bar and the screen root, shared by the three states
    (loaded, no tone declared, tone unknown) so none of them loses the way out. */
function Frame({
  nav, narrow, rows, toneKey, onSelectTone, children,
}: {
  nav: ReactNode
  narrow: boolean
  rows: { key: string; label: string }[]
  toneKey: string | null
  onSelectTone: (key: string) => void | Promise<void>
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col" id="bankTones">
      <div className="flex h-[44px] flex-none items-center gap-[12px] border-b border-b-line px-[16px]">
        {nav}

        {/* UNDER 1100 px THE LIST BECOMES THIS PICKER (§S6). A 220 px column
            and three cards do not share 1024 px; the choice is rarer than the
            tuning, so it is the choice that folds. */}
        {narrow && rows.length > 0 && (
          <>
            <label className="sr-only" htmlFor="toneSelect">
              ton à régler
            </label>
            <select
              id="toneSelect"
              className="w-[190px] flex-none"
              value={toneKey ?? ''}
              onChange={(event) => void onSelectTone(event.target.value)}
            >
              {rows.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label}
                </option>
              ))}
            </select>
          </>
        )}

        {/* The sentence gives before any control does: it is the one thing
            here that can be read later. Hidden outright under 1280 px, where
            the picker above needs the room. */}
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim2 max-[1280px]:hidden">
          {BANK_SENTENCE}
        </span>
      </div>
      {children}
    </div>
  )
}
