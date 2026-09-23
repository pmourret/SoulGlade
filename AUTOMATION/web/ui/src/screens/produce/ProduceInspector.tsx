/* The right panel of Produire: Scène · Réglages · Prompt, or Instruction ·
   Réglages on the tier that edits (design-pass screen-3b, §S4).

   IT ENDS TWO SUPERIMPOSITIONS. The settings used to be a card floating at
   the bottom-right corner and the prompt preview a sheet above the launch
   bar; both covered the grid one was working in, both needed an Escape and a
   focus trap, and the old fumigation had to close the preview in order to
   tick a second scene. Three tabs in a column that is always there cost none
   of that.

   RADIX OWNS THE KEYBOARD. `@radix-ui/react-tabs` was already a dependency
   (the Ateliers' scene composer uses it) and carries the roving tabindex,
   the arrows and `aria-controls`. Its ids are ITS OWN: the composer
   documents the bug that an `id` written on a `Tabs.Trigger` replaces the
   attribute without replacing Radix's internal reference to it, which breaks
   both `aria-controls` and the focus group. Everything a fumigation needs to
   select is therefore a `data-tab` on a trigger, or a plain `<div id>` INSIDE
   a `Tabs.Content` — never the Content itself.

   UNDER 1100 px IT IS A DRAWER, same component. `useOverlayPanel` gives it
   the Escape and the focus contract it no longer needs at full width. */
import { useEffect, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'

import { EditStep } from './EditStep'
import { PromptPreview, type SceneAmendments } from './PromptPreview'
import { SceneDevelopPanel } from './SceneDevelopPanel'
import { SettingsPanel, type SettingValues } from './SettingsPanel'
import { useOverlayPanel } from './useOverlayPanel'
import type { Scene } from '../../state/ScenesStoreContext'
import type { Preview } from './useProduceState'
import type { SceneMeta, SceneStats } from './useSceneChoice'

export type InspectorTab = 'scene' | 'settings' | 'prompt' | 'instruction'

const TAB_LABEL: Record<InspectorTab, string> = {
  scene: 'Scène',
  settings: 'Réglages',
  prompt: 'Prompt',
  instruction: 'Instruction',
}

const TRIGGER =
  'flex-1 cursor-pointer border-0 bg-transparent px-[6px] pb-[9px] pt-[10px] text-[13px]' +
  ' focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-[-2px]'
const TRIGGER_ON = 'font-semibold text-txt [box-shadow:inset_0_-2px_0_var(--txt)]'
const TRIGGER_OFF = 'text-dim hover:text-txt'

export function ProduceInspector({
  editing,
  editTier,
  narrow,
  open,
  onClose,
  scene,
  meta,
  stats,
  preview,
  tone,
  isSelected,
  onToggleSelect,
  onEditScene,
  imageUrl,
  values,
  presetRef,
  nsfwRef,
  deviations,
  onChangeSetting,
  onResetSettings,
  promptPreview,
  singleScene,
  override,
  onOverride,
  amendments,
  onAmendmentChange,
  instruction,
  onInstruction,
  alerts,
  nsfwOut,
}: {
  /** The tier edits AND does not generate first: there is no scene to point
      at and no prompt to preview, so those two tabs go away. */
  editing: boolean
  /** The tier edits at all. `editTier && !editing` is the generate-then-edit
      chain: the scene grid is still the centre, so Scène and Prompt stay —
      and Instruction joins them, because an instruction is still needed. */
  editTier: boolean
  /** Under 1100 px the panel is a drawer opened from the centre toolbar. */
  narrow: boolean
  open: boolean
  onClose: () => void
  scene: Scene | null
  meta?: SceneMeta[string]
  stats?: SceneStats[string]
  preview?: { name: string; bucket: string; space?: string; v?: number }
  tone: string
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onEditScene: (id: string) => void
  imageUrl: (ref: Record<string, unknown>) => string
  values: SettingValues
  presetRef: Record<string, unknown>
  nsfwRef: Record<string, unknown>
  /** How many settings sit away from their measured value — the tab's badge.
      Computed once by the screen (`deviationCount`), never a second time. */
  deviations: number
  onChangeSetting: (id: string, value: string | boolean) => void
  onResetSettings: () => void
  promptPreview: Preview | null
  singleScene: boolean
  override: string
  onOverride: (value: string) => void
  amendments: SceneAmendments
  onAmendmentChange: (field: keyof SceneAmendments, value: string) => void
  instruction: string
  onInstruction: (value: string) => void
  alerts: string[]
  nsfwOut: string
}) {
  const [tab, setTab] = useState<InspectorTab>('scene')
  const containerRef = useRef<HTMLDivElement | null>(null)
  useOverlayPanel(narrow && open, onClose, containerRef)

  /* Which tabs exist, in order. Three cases, not two: the generate-then-edit
     chain (`editTier && !editing`, the « générer avant » switch) still shows
     the scene grid in the centre AND needs an instruction — dropping
     Instruction there would make it unreachable, which is what happened when
     the numbered `EditStep` of the old centre column went away. */
  const tabs: InspectorTab[] = editing
    ? ['instruction', 'settings']
    : editTier
      ? ['scene', 'settings', 'prompt', 'instruction']
      : ['scene', 'settings', 'prompt']

  /* A tier change can leave `value` pointing at a trigger that no longer
     exists, and Radix then shows no panel at all. */
  useEffect(() => {
    setTab((current) => (tabs.includes(current) ? current : tabs[0]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, editTier])

  /* ONE display utility in the chain, never two. `flex` in the base plus a
     conditional `hidden` would be two utilities writing the same property,
     and which one wins is decided by their order in the GENERATED sheet, not
     by their order in this string — the trap this folder has now hit four
     times (SceneCard, IntensityBar, IntentRail, the header's buttons). Here
     it would have left the drawer permanently open at 1024 px. */
  const shell = narrow
    ? `fixed top-0 right-0 bottom-0 z-[9] w-[min(340px,100vw)] shadow-elev ${
        open ? 'flex' : 'hidden'
      }`
    : 'flex'

  return (
    <aside
      ref={containerRef}
      className={`w-[340px] flex-none flex-col overflow-hidden border-l border-l-line
                  bg-panel ${shell}`}
      id="produceInspector"
      aria-label="Inspecteur"
      /* A drawer is a dialog; a column beside the grid is a complementary
         landmark. The role is what changes, the component is not.

         NO `aria-modal`, deliberately. It would CLAIM the rest of the screen
         is inert, and it is not: there is no scrim, the grid behind stays
         clickable and stays in the accessibility tree. That is on purpose —
         both panels this replaced were non-modal so the prompt could keep
         updating while scenes were ticked (see useOverlayPanel's own header).
         An honest `role="dialog"` with Escape and a × is the truth; the
         attribute would have been a promise the drawer does not keep. */
      role={narrow ? 'dialog' : undefined}
    >
      <Tabs.Root
        value={tab}
        onValueChange={(v) => setTab(v as InspectorTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Tabs.List
          className="flex flex-none border-b border-b-line px-[6px]"
          aria-label="Sections de l'inspecteur"
        >
          {tabs.map((key) =>
            key === 'settings' ? (
              <SettingsTrigger key={key} active={tab === 'settings'} deviations={deviations} />
            ) : (
              <Tabs.Trigger
                key={key}
                value={key}
                data-tab={key}
                className={`${TRIGGER} ${tab === key ? TRIGGER_ON : TRIGGER_OFF}`}
              >
                {TAB_LABEL[key]}
              </Tabs.Trigger>
            ),
          )}
          {narrow && (
            <button
              type="button"
              className="flex-none border-0 bg-transparent px-[10px] text-[16px] text-dim
                         hover:text-txt"
              aria-label="Fermer l'inspecteur"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </Tabs.List>

        {/* Each panel scrolls for its own account — the column has a fixed
            height and three contents of very different lengths. */}
        <Tabs.Content value="scene" className="min-h-0 flex-1 overflow-y-auto p-[14px]">
          <SceneDevelopPanel
            scene={scene}
            meta={meta}
            stats={stats}
            preview={preview}
            tone={tone}
            isSelected={isSelected}
            onToggleSelect={onToggleSelect}
            onEdit={onEditScene}
            imageUrl={imageUrl}
          />
        </Tabs.Content>

        <Tabs.Content value="instruction" className="min-h-0 flex-1 overflow-y-auto p-[14px]">
          <EditStep
            instruction={instruction}
            onInstruction={onInstruction}
            alerts={alerts}
            output={nsfwOut}
          />
        </Tabs.Content>

        <Tabs.Content value="settings" className="min-h-0 flex-1 overflow-y-auto p-[14px]">
          <SettingsPanel
            values={values}
            presetRef={presetRef}
            nsfwRef={nsfwRef}
            editTier={editTier}
            nsfwLevel={editTier}
            /* The NSFW section and the noqc guard follow the TIER, not
               whether it generates first. */
            onChange={onChangeSetting}
            onReset={onResetSettings}
          />
        </Tabs.Content>

        <Tabs.Content value="prompt" className="min-h-0 flex-1 overflow-y-auto p-[14px]">
          <PromptPreview
            preview={promptPreview}
            singleScene={singleScene}
            override={override}
            onOverride={onOverride}
            amendments={amendments}
            onAmendmentChange={onAmendmentChange}
          />
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  )
}

/* The Réglages trigger, written once because both tab sets show it — and
   because it is the only one carrying a badge. The count is VISIBLE TEXT
   inside the tab, never a coloured dot: a status is never carried by colour
   alone (frontend.md). */
function SettingsTrigger({ active, deviations }: { active: boolean; deviations: number }) {
  return (
    <Tabs.Trigger
      value="settings"
      data-tab="settings"
      className={`${TRIGGER} ${active ? TRIGGER_ON : TRIGGER_OFF}`}
    >
      Réglages
      {deviations > 0 && (
        <span
          className="ml-[6px] rounded-[9px] bg-warn px-[5px] py-px text-[10px] font-semibold
                     tabular-nums text-bg"
          id="gearBadge"
          aria-label={`${deviations} réglage${deviations > 1 ? 's' : ''} modifié${deviations > 1 ? 's' : ''}`}
        >
          {deviations}
        </span>
      )}
    </Tabs.Trigger>
  )
}
