/* "+ Nouvelle pose" opens this instead of navigating straight to the editor
   — a full-screen template picker for what is really one short decision
   "n'a pas de sens" (studio session, 2026-09-02). This modal collects that
   decision (name, starting template, optional "create a template too") and
   hands it off as router state; it saves nothing itself — PoseEditorScreen
   reads the state back out and does the actual load/save. */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { PATHS } from '../../app/routes'
import { useApi } from '../../api/useApi'
import { Dialog } from '../../chrome/Dialog'

/** The handoff contract to `PoseEditorScreen` — read back out of
    `useLocation().state` there. */
export type NewPoseIntent = {
  presetName: string
  label: string
  createTemplate: boolean
}

export function NewPoseModal({ onClose }: { onClose: () => void }) {
  const api = useApi()
  const navigate = useNavigate()
  const location = useLocation()
  const [presets, setPresets] = useState<{ nom: string; label: string }[] | null>(null)
  const [chosenPreset, setChosenPreset] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [createTemplate, setCreateTemplate] = useState(false)

  useEffect(() => {
    let cancelled = false
    void api
      .get<{ presets?: { nom: string; label: string }[] }>('/api/pose/presets')
      .then((response) => {
        if (cancelled) return
        const list = response.presets ?? []
        setPresets(list)
        // A pose from scratch always starts from a template, never a blank
        // canvas (2026-09-01) — pre-selecting the obvious one leaves the
        // name as the only decision left, when there is just one template.
        setChosenPreset((current) => current ?? list[0]?.nom ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const canCreate = Boolean(chosenPreset) && label.trim() !== ''

  const onCreate = () => {
    if (!canCreate || !chosenPreset) return
    const intent: NewPoseIntent = { presetName: chosenPreset, label: label.trim(), createTemplate }
    // `search: location.search` carries `?character=` forward explicitly —
    // without it, CharacterContext's own URL-catches-up-to-state effect
    // (see its comment on `selectCharacter`) replaces this navigation a
    // tick later to re-add the query param, and that replace does not
    // forward `state`, silently dropping `intent` right after arrival.
    navigate({ pathname: PATHS.poseEditor, search: location.search }, { state: intent })
  }

  return (
    <Dialog
      id="newPoseBox"
      open
      onDismiss={onClose}
      initialFocus="#newPoseName"
      className="w-[min(460px,calc(100vw-32px))] max-w-[min(460px,calc(100vw-32px))]"
      cardClassName="w-[min(460px,100%)]! p-[20px]!"
    >
      <h3 className="mb-[6px]! text-[16px]!">Nouvelle pose</h3>
      <p className="mt-0 mb-[16px] text-[13px]!">
        Coordonnées entièrement inventées, jamais issues d'une photo : le point
        de départ se corrige ensuite point par point.
      </p>

      <label className="mb-[6px] block text-[12.5px] text-dim" htmlFor="newPoseName">
        Nom
      </label>
      <input
        id="newPoseName"
        className="mb-[16px] w-full"
        value={label}
        placeholder="ex. assise sur un tabouret"
        onChange={(event) => setLabel(event.target.value)}
      />

      <div className="mb-[6px] text-[12.5px] text-dim" id="newPosePresetsLabel">Gabarit de départ</div>
      {/* Name only: /api/pose/presets carries no thumbnail (design-pass
          screen-13 §S8), and none is invented here. */}
      {presets === null ? (
        <p className="mb-[16px] text-[13px] text-dim2">chargement…</p>
      ) : presets.length === 0 ? (
        <div className="empty mb-[16px] rounded-card border border-line bg-panel px-[12px] py-[16px] text-[13px]">
          aucun gabarit disponible.
        </div>
      ) : (
        <div
          className="mb-[16px] grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-[8px]"
          role="group"
          aria-labelledby="newPosePresetsLabel"
        >
          {presets.map((p) => {
            const chosen = chosenPreset === p.nom
            return (
              <button
                key={p.nom}
                type="button"
                aria-pressed={chosen}
                className={`h-[44px] cursor-pointer rounded-[8px] bg-panel2 px-[12px] text-left text-[13px] ${
                  chosen ? 'border-2 border-txt font-semibold text-txt' : 'border border-line2 text-dim hover:border-dim2'
                }`}
                onClick={() => setChosenPreset(p.nom)}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      )}

      <label className="mb-[20px] flex items-center gap-[8px] text-[13px] text-txt">
        <input
          type="checkbox"
          className="w-auto shrink-0"
          checked={createTemplate}
          onChange={(event) => setCreateTemplate(event.target.checked)}
        />
        Créer aussi un gabarit réutilisable à partir de cette pose
      </label>

      <div className="flex items-center justify-end gap-[14px]">
        <button type="button" className="link" onClick={onClose}>
          Annuler
        </button>
        <button type="button" className="btn primary" disabled={!canCreate} onClick={onCreate}>
          Créer
        </button>
      </div>
    </Dialog>
  )
}
