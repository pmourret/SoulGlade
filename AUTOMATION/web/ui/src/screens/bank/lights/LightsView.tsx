/* The light catalogue — the sixth sub-view of the Atelier (IT-10 chantier 7).

   WHAT A LIGHT IS HERE: a label and a studio sheet, whose English sentence
   the launch composes from the platform's vocabulary (7 bis,
   `DOCS/cadrage/2026-09-26-it10-c7bis-studio-lumiere.md`). A scene wears it by
   its key, in its Lumière field or as a variant, and the launch resolves it
   into text after the décor. Correcting a light here corrects every scene
   that wears it.

   THREE ZONES (design-pass lumieres, DOCS/design-pass/screen-lumieres.md):
   the list at 260, the sheet in the centre, the render trial as a 340 px
   inspector. The sheet is never empty: with nothing chosen the first light
   is open, and with no light at all the new sheet is — « Créer la lumière »
   is then the only call. Under 1100 px the list narrows to 240 and the trial
   becomes a drawer: adjusting the sheet is the gesture that decides. */
import { useEnhancer } from '../../../api/useEnhance'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useChrome } from '../../../chrome/ChromeContext'
import { useConfirm } from '../../../chrome/ConfirmContext'
import { useLightbox } from '../../../chrome/LightboxContext'
import { useToast } from '../../../chrome/ToastContext'
import { useScenes } from '../../../state/ScenesStoreContext'
import { useSystemState } from '../../../state/SystemStateContext'
import { useOverlayPanel } from '../../produce/useOverlayPanel'
import { RenderTrialPanel } from '../../render-trial/RenderTrialPanel'
import { useRenderTrial } from '../../render-trial/useRenderTrial'
import { LightList } from './LightList'
import { LightSheet, type LightDraft } from './LightSheet'
import type { Setup } from './lightCompose'
import { useLights, type LightEffectEntry, type LightEntry, type LightFields } from './useLights'

const NEW = '\u0000new'

export function LightsView({ nav }: { nav: ReactNode }) {
  const enhancer = useEnhancer()
  const toast = useToast()
  const confirm = useConfirm()
  const { narrow } = useChrome()
  const { world, bank } = useScenes()
  const { state } = useSystemState()
  const { open: openLightbox } = useLightbox()
  const trial = useRenderTrial('/api/lights/essai')
  const {
    lights, effects, vocabulary, marker, loaded, busy, create, save, remove, createEffect, removeEffect,
  } = useLights()

  const [chosen, setChosen] = useState<string | null>(null)
  const [draft, setDraft] = useState<LightDraft | null>(null)
  const [trialOpen, setTrialOpen] = useState(false)
  /* Nothing chosen: the first light, or the new sheet when there is none. */
  const selected = chosen ?? lights[0]?.key ?? (loaded ? NEW : null)
  /* The label takes the focus when a gesture opens the new sheet — never
     when the screen mounts on it. */
  const focusLabel = useRef(false)
  /* A sheet takes a while to adjust: leaving it with unsaved changes asks
     first (audit 26/09 — it was dropped without a word). Read through a ref:
     the drawer's Escape keeps the close callback of the moment it opened. */
  const draftRef = useRef(draft)
  draftRef.current = draft
  const choose = async (key: string | null) => {
    if (key === selected) {
      setChosen(key)
      return
    }
    if (draftRef.current?.dirty && !(await confirm({
      title: 'Abandonner les réglages de cette lumière ?',
      button: 'Abandonner',
      body: <p>La fiche a des réglages non enregistrés ; ils seront perdus.</p>,
    }))) return
    setDraft(null)
    setChosen(key)
  }
  const openNew = () => {
    focusLabel.current = true
    void choose(NEW)
  }
  useEffect(() => {
    if (selected !== NEW || !focusLabel.current) return
    focusLabel.current = false
    document.getElementById('lightLabel')?.focus()
  }, [selected])
  const selectedLight = lights.find((l) => l.key === selected) ?? null
  const inspecting = selected === NEW || selectedLight !== null

  // A light removed under the selection: back to the first one.
  useEffect(() => {
    if (chosen && chosen !== NEW && loaded && !lights.some((l) => l.key === chosen)) setChosen(null)
  }, [lights, chosen, loaded])

  /* The render trial (7 bis): the scenes that carry a light first — there the
     tried light takes the place of theirs, as a variant would. */
  const bankScenes = ((bank?.data as { scenes?: unknown } | undefined)?.scenes ?? []) as
    { id: string; light?: string }[]
  const trialScenes = [
    ...bankScenes.filter((scene) => scene.light?.trim()),
    ...bankScenes.filter((scene) => !scene.light?.trim()),
  ].map((scene) => scene.id)
  const trialKey = selected === NEW ? '' : (selected ?? '')
  const myTrial = trial.trial && trial.trial.light === trialKey ? trial.trial : null
  /* The images show the sentence that was tried: once the sheet says another
     one, the trial says so in words. */
  const stale = Boolean(myTrial?.sentence && draft && myTrial.sentence !== draft.sentence)

  const drawerRef = useRef<HTMLDivElement | null>(null)
  const drawer = narrow && trialOpen && inspecting
  /* Escape is deferred past its own keydown, as it always was here: a
     confirmation opened meanwhile is a native <dialog> the same Escape would
     cancel at once. */
  useOverlayPanel(drawer, () => void window.setTimeout(() => setTrialOpen(false)), drawerRef)

  const onCreate = async (label: string, fields: { text: string; setup: Setup | null }, toWorld: boolean) => {
    const result = await create(label, fields, toWorld)
    if (!result.ok) {
      toast(result.erreur)
      return
    }
    if (result.light) setChosen(result.light.key)
    toast(toWorld ? 'lumière créée dans le monde' : 'lumière créée')
  }

  const onSave = async (key: string, fields: LightFields, toWorld: boolean) => {
    const result = await save(key, fields, toWorld)
    toast(result.ok ? 'lumière enregistrée — les scènes qui la portent suivent' : result.erreur)
  }

  const onDelete = async (light: LightEntry) => {
    const adjusted = light.couche === 'surcharge'
    const ok = await confirm({
      title: adjusted ? 'Rendre cette lumière au monde ?' : 'Retirer cette lumière ?',
      button: adjusted ? 'Rendre au monde' : 'Retirer',
      danger: !adjusted,
      body: adjusted ? (
        <p>
          Ce qui a été ajusté ici est effacé ; <b>{light.label || light.key}</b> revient à ce que
          le monde en dit, et les scènes qui la portent avec elle.
        </p>
      ) : (
        <p>
          <b>{light.label || light.key}</b> quitte{' '}
          {light.couche === 'monde' ? 'le monde — tous ses personnages la perdent' : 'ce personnage'}.
          Une lumière qu'une scène porte encore ne part pas : le studio dit laquelle.
        </p>
      ),
    })
    if (!ok) return
    const result = await remove(light.key)
    toast(result.ok ? (adjusted ? 'rendue au monde' : 'lumière retirée') : result.erreur)
  }

  const onCreateEffect = async (label: string, fragment: string, toWorld: boolean) => {
    const result = await createEffect(label, fragment, toWorld)
    toast(result.ok ? (toWorld ? 'effet créé dans le monde' : 'effet créé') : result.erreur)
    return result.ok
  }

  const onDeleteEffect = async (effect: LightEffectEntry) => {
    const adjusted = effect.couche === 'surcharge'
    const ok = await confirm({
      title: adjusted ? 'Rendre cet effet au monde ?' : 'Retirer cet effet ?',
      button: adjusted ? 'Rendre au monde' : 'Retirer',
      danger: !adjusted,
      body: (
        <p>
          <b>{effect.label || effect.key}</b>{' '}
          {adjusted ? 'revient à ce que le monde en dit.'
            : `quitte ${effect.couche === 'monde' ? 'le monde' : 'ce personnage'}. Un effet qu'une lumière porte encore ne part pas : le studio dit laquelle.`}
        </p>
      ),
    })
    if (!ok) return
    const result = await removeEffect(effect.key)
    toast(result.ok ? 'effet retiré' : result.erreur)
  }

  const trialPanel = (
    <RenderTrialPanel
      kind="light"
      layout="column"
      title="Essai de rendu de la lumière"
      button="Essayer la fiche"
      scenes={trialScenes}
      trial={myTrial}
      stale={stale}
      columns={[
        { label: 'sans_lumiere', caption: 'Sans lumière' },
        { label: 'avec_lumiere', caption: `Avec « ${draft?.label || 'la fiche'} »` },
      ]}
      hint="deux images, même graine : la scène sans lumière, puis avec la fiche telle qu'elle est"
      reason={!state?.comfy ? 'nécessite ComfyUI en ligne'
        : state?.running ? 'un lot tourne déjà'
          : !draft?.sentence ? 'la fiche est vide' : null}
      error={trial.error}
      note={myTrial?.sentence ? <>phrase essayée : <span className="font-code">{myTrial.sentence}</span></> : undefined}
      onStart={(scene, seed) => draft && void trial.start(scene, seed, {
        key: trialKey, setup: draft.setup, text: draft.text,
      })}
      imageUrl={trial.imageUrl}
      openLightbox={openLightbox}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col" id="bankLights">
      <div className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]
                      [&>*]:whitespace-nowrap">
        {nav}

        <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim2 max-[1280px]:hidden">
          <span id="nLights">{lights.length}</span> lumière{lights.length > 1 ? 's' : ''} ·
          réutilisées d'une scène à l'autre, du monde et de ce personnage
        </span>
        <span className="flex-1 min-[1281px]:hidden" />

        {/* Secondary, and absent while the list is empty: the sheet's own
            « Créer la lumière » is then the only call. */}
        {lights.length > 0 && (
          <button type="button" className="btn sm flex-none" id="btnLightNew" disabled={busy} onClick={openNew}>
            Nouvelle lumière
          </button>
        )}
      </div>

      <div
        className={`grid min-h-0 flex-1 ${
          narrow ? 'grid-cols-[240px_minmax(0,1fr)]' : 'grid-cols-[260px_minmax(0,1fr)_340px]'}`}
      >
        <LightList
          lights={lights}
          loaded={loaded}
          selected={selected}
          dirty={Boolean(draft?.dirty)}
          onChoose={(key) => void choose(key)}
        />

        <div id="lightPanel" aria-label="Fiche de la lumière" className="min-h-0 min-w-0">
          {inspecting && (
            <LightSheet
              enhancer={enhancer}
              light={selected === NEW ? null : selectedLight}
              busy={busy}
              marker={marker}
              worldLabel={world ? world.label : null}
              vocabulary={vocabulary}
              customEffects={effects}
              compact={narrow}
              trial={narrow ? { open: trialOpen, stale, onOpen: () => setTrialOpen(true) } : undefined}
              onCreate={(label, fields, toWorld) => void onCreate(label, fields, toWorld)}
              onCreateEffect={onCreateEffect}
              onDeleteEffect={(effect) => void onDeleteEffect(effect)}
              onDraft={setDraft}
              onSave={(fields, toWorld) => selectedLight && void onSave(selectedLight.key, fields, toWorld)}
              onDelete={() => selectedLight && void onDelete(selectedLight)}
            />
          )}
        </div>

        {inspecting && !narrow && (
          <div className="min-h-0 border-l border-l-line bg-panel">{trialPanel}</div>
        )}
      </div>

      {drawer && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-label="Essai de rendu de la lumière"
          className="fixed top-0 right-0 bottom-0 z-[9] flex w-[min(340px,100vw)] flex-col border-l border-l-line
                     bg-panel shadow-elev"
        >
          <button
            type="button"
            className="absolute top-[8px] right-[8px] z-[1] border-0 bg-transparent px-[8px] py-[4px] text-[16px]
                       text-dim hover:text-txt"
            aria-label="Fermer l'essai"
            onClick={() => setTrialOpen(false)}
          >
            ×
          </button>
          {trialPanel}
        </div>
      )}
    </div>
  )
}
