/* Pose — la prose d'un côté, le squelette de l'autre (design-pass screen-7c
   §4, option 4a).

   CE QUE ÇA CLARIFIE. Les deux mécanismes vivaient l'un sous l'autre, le
   champ de prose puis une grille de vignettes, et rien ne disait qu'ils sont
   INDÉPENDANTS : la prose rejoint le prompt, le squelette est imposé par
   ControlNet à la génération. Deux colonnes titrées le disent sans phrase.

   LA BANDE DE SQUELETTES EST REPLIÉE quand la scène en porte un : une grille
   de vingt vignettes pour dire « c'est celle-ci » coûtait la moitié du
   panneau à une décision déjà prise. « Changer » la rouvre, et elle est
   ouverte d'office quand il n'y a rien à montrer. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useApi } from '../../../../api/useApi'
import { Dialog } from '../../../../chrome/Dialog'
import { Icon } from '../../../../chrome/Icon'
import { PATHS } from '../../../../app/routes'
import type { SceneDraft } from '../../../../state/ScenesStoreContext'
import type { SceneField } from '../../sceneChanges'
import { PoseEditorModal } from '../../../pose-editor/PoseEditorModal'
import { FRAGMENT_COLORS } from '../sceneFragments'
import { PromptField } from '../PromptField'
import { HEAD } from './shared'

/** Filename + human label — the same shape `usePoseBank`/`PoseCard` resolve
    for the Poses screen. */
export type PoseSummary = { name: string; label: string | null }

/* Skeletons of INPUTS/POSE/, served by /api/scenes. A scene pointing at a
   missing skeleton (file moved, renamed) KEEPS it in the list rather than lose
   it in silence — same rule as an out-of-taxonomy intention. */
function poseOptions(poses: PoseSummary[], current: string) {
  return current && !poses.some((p) => p.name === current)
    ? [...poses, { name: current, label: null }]
    : poses
}

export function PosePanel({
  draft,
  poses,
  worldLinked,
  lockedNote,
  changed,
  onPatch,
}: {
  draft: SceneDraft
  poses: PoseSummary[]
  worldLinked: boolean
  lockedNote: string
  changed: Set<SceneField>
  onPatch: (patch: Partial<SceneDraft>) => void
}) {
  const options = poseOptions(poses, draft.pose)
  // Same `label || name` fallback as `PoseCard`'s own accessible name.
  const currentLabel = options.find((p) => p.name === draft.pose)?.label || draft.pose
  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(!draft.pose)
  /* "+ Nouvelle pose" (design pass écran 7, §V3): two steps, both without
     leaving the scene. `naming` collects name + starting template, then
     `creating` opens the SAME `PoseEditorModal` the pencil uses to correct an
     assigned pose, here with a `preset` source, and its `onSaved` assigns the
     result to `draft.pose` instead of returning to the pose list. */
  const [naming, setNaming] = useState(false)
  const [creating, setCreating] = useState<{ presetName: string; label: string } | null>(null)

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="grid grid-cols-2 gap-[16px] max-[860px]:grid-cols-[1fr]">
        {/* En mots */}
        <div>
          <span className={HEAD}>En mots · rejoint le prompt</span>
          <div
            className="mt-[8px] border-l-[3px] pl-[10px]"
            style={{ borderColor: FRAGMENT_COLORS.pose }}
          >
            <PromptField
              dataField="prompt_pose"
              label="Prompt de pose"
              hideLabel
              placeholder="ex : leaning against the doorway, arms crossed"
              value={draft.promptPose}
              disabled={worldLinked}
              lockedNote={worldLinked ? lockedNote : undefined}
              changed={changed.has('promptPose')}
              onChange={(value) => onPatch({ promptPose: value })}
            />
            <p className="tiny mt-[6px] mb-0">
              Décris la pose. Les deux peuvent coexister : la prose guide, le squelette impose.
            </p>
          </div>
        </div>

        {/* En squelette */}
        <div>
          <span className={HEAD}>En squelette · imposé, option</span>
          <div className="mt-[8px] rounded-[10px] border border-line bg-panel p-[12px]">
            {draft.pose ? (
              <div className="flex gap-[12px]">
                <img
                  className="h-[140px] w-[112px] flex-none rounded-[8px] border border-line2 bg-black object-contain"
                  src={`/img/pose?name=${encodeURIComponent(draft.pose)}`}
                  alt={currentLabel}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                  <b className="truncate text-[13px]">{currentLabel}</b>
                  <code className="truncate font-code text-[11px] text-dim2">{draft.pose}</code>
                  <span className="self-start rounded-[999px] bg-panel2 px-[8px] py-[2px] text-[10.5px] text-dim">
                    cran SFW uniquement
                  </span>
                  <div className="mt-auto flex flex-wrap gap-[6px]">
                    <button
                      type="button"
                      className="btn sm"
                      aria-label={`Modifier « ${currentLabel} » point par point`}
                      data-hint-text="Retoucher ce squelette, sans quitter la scène"
                      onClick={() => setEditing(true)}
                    >
                      <Icon name="pencil" className="h-[14px] w-[14px]" />
                      <span className="ml-[5px]">Retoucher</span>
                    </button>
                    <button type="button" className="btn sm" onClick={() => setPicking((open) => !open)}>
                      Changer
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-[6px] border-0 bg-transparent px-[8px]
                                 text-[13px] text-danger-txt hover:bg-danger-bg focus-visible:outline-2
                                 focus-visible:outline-focus focus-visible:outline-offset-2"
                      onClick={() => onPatch({ pose: '' })}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-[12px]">
                <span
                  aria-hidden="true"
                  className="flex h-[140px] w-[112px] flex-none items-center justify-center
                             rounded-[8px] border border-dashed border-line2 text-[11px] text-dim2"
                >
                  aucun
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
                  <b className="text-[13px]">Aucun squelette</b>
                  <p className="tiny m-0">La pose reste celle que la prose décrit.</p>
                  <button
                    type="button"
                    className="btn sm self-start"
                    onClick={() => setPicking(true)}
                  >
                    Choisir
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="tiny mt-[6px] mb-0">
            Un squelette de dos ou de profil peut ne pas être suivi : vérifier à l'œil.
          </p>
        </div>
      </div>

      {picking && (
        <div className="border-t border-t-line pt-[12px]">
          <div className="mb-[8px] flex items-center justify-between gap-[10px]">
            <span className={HEAD}>Choisir un squelette</span>
            <Link className="link text-[12px]" to={PATHS.bankPoses}>
              Éditeur de pose
            </Link>
          </div>
          {/* `data-f`/`data-value` conservés sur la bande : c'est le contrat
              que `test_pose_editor` et `test_pose_extract` visent. */}
          <div className="flex gap-[8px] overflow-x-auto pb-[6px]" data-f="pose" data-value={draft.pose}>
            <Tile
              label="aucune"
              on={!draft.pose}
              onClick={() => onPatch({ pose: '' })}
            />
            <Tile label="+ nouvelle" dashed onClick={() => setNaming(true)} />
            {options.map(({ name, label }) => (
              <Tile
                key={name}
                label={label || name}
                title={label || name}
                on={draft.pose === name}
                src={`/img/pose?name=${encodeURIComponent(name)}`}
                onClick={() => {
                  onPatch({ pose: name })
                  setPicking(false)
                }}
              />
            ))}
            {options.length === 0 && (
              <p className="m-0 p-[12px] text-[12px] text-dim2">
                aucun squelette dans les ateliers — l'éditeur de pose en extrait depuis une photo
              </p>
            )}
          </div>
        </div>
      )}

      {editing && draft.pose && (
        <PoseEditorModal
          source={{ kind: 'pose', name: draft.pose }}
          onClose={() => setEditing(false)}
          onSaved={(name) => {
            onPatch({ pose: name })
            setEditing(false)
          }}
        />
      )}
      {naming && (
        <NewPoseDialog
          onCancel={() => setNaming(false)}
          onStart={(intent) => {
            setCreating(intent)
            setNaming(false)
          }}
        />
      )}
      {creating && (
        <PoseEditorModal
          source={{ kind: 'preset', nom: creating.presetName, initialLabel: creating.label }}
          onClose={() => setCreating(null)}
          onSaved={(name) => {
            onPatch({ pose: name })
            setCreating(null)
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

function Tile({
  label,
  title,
  on,
  dashed,
  src,
  onClick,
}: {
  label: string
  title?: string
  on?: boolean
  dashed?: boolean
  src?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={on}
      className={`flex w-[76px] flex-none cursor-pointer flex-col gap-[4px] rounded-[8px] border
                 bg-transparent p-[4px] focus-visible:outline-2 focus-visible:outline-focus
                 focus-visible:outline-offset-2 ${
                   on ? 'border-acc' : dashed ? 'border-dashed border-line2' : 'border-line2'
                 }`}
      onClick={onClick}
    >
      <span
        className={`flex h-[92px] w-full items-center justify-center overflow-hidden
                   rounded-[5px] ${src ? 'bg-black' : 'bg-panel2'}`}
      >
        {/* `alt` vide : le libellé sous la vignette dit déjà de quelle pose il
            s'agit, et le bouton porte son `title`. Une tuile SANS image ne
            répète pas son mot dans le carré ET dessous (mesuré à l'audit :
            « aucune » s'affichait deux fois). */}
        {src && <img className="h-full w-full object-contain" loading="lazy" src={src} alt="" />}
      </span>
      <span className="truncate text-[10.5px] text-dim">{label}</span>
    </button>
  )
}

/* Name + starting-template step for a from-scratch pose, opened by the "+
   nouvelle" tile above. Deliberately a SMALLER form than the Poses screen's
   own `NewPoseModal` (no "créer aussi un gabarit réutilisable" — a one-off
   pose for this scene has no reason to also seed the shared preset library)
   and it hands its result to a CALLBACK instead of navigating: the scene
   composer stays open. */
function NewPoseDialog({
  onCancel,
  onStart,
}: {
  onCancel: () => void
  onStart: (intent: { presetName: string; label: string }) => void
}) {
  const api = useApi()
  const [presets, setPresets] = useState<{ nom: string; label: string }[] | null>(null)
  const [chosenPreset, setChosenPreset] = useState<string | null>(null)
  const [label, setLabel] = useState('')

  useEffect(() => {
    let cancelled = false
    void api
      .get<{ presets?: { nom: string; label: string }[] }>('/api/pose/presets')
      .then((response) => {
        if (cancelled) return
        const list = response.presets ?? []
        setPresets(list)
        setChosenPreset((current) => current ?? list[0]?.nom ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const canStart = Boolean(chosenPreset) && label.trim() !== ''

  return (
    <Dialog
      id="newPoseInlineBox"
      open
      onDismiss={onCancel}
      initialFocus="#newPoseInlineName"
      className="w-[min(460px,calc(100vw-32px))] max-w-[min(460px,calc(100vw-32px))]"
      cardClassName="w-[min(460px,100%)]! p-[20px]!"
    >
      <h3 className="mb-[4px]! text-[16px]!">Nouvelle pose</h3>
      <p className="tiny mb-[14px]">
        Coordonnées entièrement inventées, jamais issues d'une photo — le point de départ se
        corrige ensuite point par point, sans quitter la scène.
      </p>

      <label className="tiny mb-[4px] block" htmlFor="newPoseInlineName">
        Nom
      </label>
      <input
        id="newPoseInlineName"
        className="mb-[14px] w-full"
        value={label}
        placeholder="ex. assise sur un tabouret"
        onChange={(event) => setLabel(event.target.value)}
      />

      <div className="tiny mb-[6px]">Gabarit de départ</div>
      {presets === null ? (
        <p className="tiny mb-[14px]">chargement…</p>
      ) : presets.length === 0 ? (
        <div className="empty mb-[14px] rounded-card border border-line bg-panel px-[12px] py-[16px] text-[13px]">
          aucun gabarit disponible.
        </div>
      ) : (
        <div className="mb-[14px] grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-[8px]">
          {presets.map((p) => (
            <button
              key={p.nom}
              type="button"
              aria-pressed={chosenPreset === p.nom}
              className={`cursor-pointer rounded-[8px] border px-[12px] py-[8px] text-[13px] ${
                chosenPreset === p.nom ? 'border-acc bg-panel2' : 'border-line2 bg-panel'
              }`}
              onClick={() => setChosenPreset(p.nom)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-[12px]">
        <button
          type="button"
          className="btn primary"
          disabled={!canStart}
          onClick={() => chosenPreset && onStart({ presetName: chosenPreset, label: label.trim() })}
        >
          Continuer
        </button>
        <button type="button" className="link" onClick={onCancel}>
          annuler
        </button>
      </div>
    </Dialog>
  )
}
