/* The 320 px preview of the selected skeleton (design-pass screen-7d §S5) —
   purely presentational (frontend.md: a sub-component never calls the API).
   It owns only its own transient state: whether the label field is open.

   IT INHERITED THE CARD'S `⋯` MENU. Four actions hid behind a per-card
   trigger because a 96 px card had no room for them; a column of 320 px
   does, so they are four visible controls and the menu is gone — with it
   goes the roving-focus handling a `role="menu"` needed.

   `data-pose-label` and `data-pose-label-input` come from `PoseCard`
   unchanged: test_pose_bank renames through them. */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { PATHS } from '../../../app/routes'
import { provenanceLabel } from './PoseTable'
import type { PoseBankRow } from './usePoseBank'

const PROVENANCE_HINT: Record<string, string> = {
  preset: 'Coordonnées inventées, jamais issues d’une photo.',
  extraction: 'Extraite d’une photo — la photo elle-même n’est jamais gardée.',
}

export function PoseInspector({
  row, busy, onRename, onDuplicate, onDelete,
}: {
  row: PoseBankRow
  busy: boolean
  onRename: (label: string) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  // A sidecar-less legacy pose has no frame to load — rename/duplicate both
  // start with `GET /api/pose/keypoints`, which 404s for these (see
  // usePoseBank's own doc). `source` is never null for a pose WITH a
  // sidecar (enregistrer_points always stamps one), so this is the same
  // signal the hook already relies on, not a second guess at it.
  const hasFrame = row.source !== null
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(row.label || '')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // A new selection must not carry the previous pose's open field or draft.
  useEffect(() => {
    setEditing(false)
    setDraft(row.label || '')
  }, [row.name, row.label])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const startEditing = () => {
    if (!hasFrame || busy) return
    setDraft(row.label || '')
    setEditing(true)
  }
  const commitEditing = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== (row.label || '')) onRename(trimmed)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-[12px] overflow-y-auto p-[14px]" id="poseInspector">
      <img
        className="aspect-square w-full rounded-card bg-black object-contain"
        src={`/img/pose?name=${encodeURIComponent(row.name)}`}
        alt={row.label || row.name}
      />

      {editing ? (
        <input
          ref={inputRef}
          className="w-full text-[14px]"
          data-pose-label-input
          aria-label="Libellé du squelette"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitEditing}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitEditing()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setEditing(false)
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="w-full cursor-text truncate border-0 bg-transparent p-0 text-left text-[14px]
                     text-txt hover:text-acc focus-visible:outline-2 focus-visible:outline-focus
                     focus-visible:outline-offset-2 disabled:cursor-default disabled:hover:text-txt"
          data-pose-label
          disabled={!hasFrame || busy}
          title={hasFrame ? 'Cliquer pour renommer' : undefined}
          onClick={startEditing}
        >
          {row.label || row.name}
        </button>
      )}

      <p className="m-0 truncate font-code text-[11px] text-dim2">{row.name}</p>

      <p className="m-0 text-[12px] text-dim">
        {provenanceLabel(row.source)} ·{' '}
        {row.scenesUsing.length ? (
          <>
            utilisée par{' '}
            {row.scenesUsing.map((scene, index) => (
              <span key={scene}>
                {index > 0 && ', '}
                <Link className="text-acc" to={`${PATHS.bankScenes}?scene=${encodeURIComponent(scene)}`}>
                  {scene}
                </Link>
              </span>
            ))}
          </>
        ) : (
          <span className="text-dim2">non utilisée</span>
        )}
      </p>

      {PROVENANCE_HINT[row.source ?? ''] && (
        <p className="m-0 text-[12px] text-dim2">{PROVENANCE_HINT[row.source ?? '']}</p>
      )}

      <div className="mt-auto flex flex-col gap-[6px] pt-[10px]">
        <Link
          className="btn primary sm text-center"
          to={`${PATHS.poseEditor}/${encodeURIComponent(row.name)}`}
        >
          Éditer le squelette
        </Link>
        {/* NO SILENT DISABLED BUTTON for a legacy pose (§S5). Two greyed
            controls said « impossible » without saying why; one sentence in
            their place says it. */}
        {hasFrame ? (
          <button type="button" className="btn sm" data-dup disabled={busy} onClick={onDuplicate}>
            Dupliquer
          </button>
        ) : (
          <p className="m-0 text-[12px] text-dim2">
            Extraite avant les points-clés : ni renommable ni duplicable.
          </p>
        )}
        <button
          type="button"
          className="btn sm border-danger-line text-danger-txt"
          data-del
          disabled={busy}
          onClick={onDelete}
        >
          Retirer…
        </button>
      </div>
    </div>
  )
}
