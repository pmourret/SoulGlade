/* The living preview: what this scene says, whichever section is open.

   The composed prompt used to live in a three-line clamp inside the header,
   and its per-fragment breakdown only in the « Prompt global » section — so
   the one thing the whole screen builds was hidden behind a tab while its
   own fields were being typed. Here it is a column of its own (design pass
   screen-7b §S5), always visible, updated at the keystroke.

   IT ASSEMBLES NOTHING (CLAUDE.md §3). `sceneFragments` cuts — the same
   function the Prompt global panel uses for its own tinted preview — and the
   décor of the scene's place comes last, as `worlds.materialize` joins it at
   launch. This panel only draws them. */
import { Link } from 'react-router-dom'

import { PATHS } from '../../../app/routes'
import type { SceneDraft } from '../../../state/ScenesStoreContext'
import type { WorldPlace } from '../../worlds/useWorldCatalog'
import { decorOf, sceneFragments } from './sceneFragments'

export function ScenePreviewPanel({
  draft,
  places,
  stats,
  changed,
  className,
}: {
  draft: SceneDraft
  /** The world's places: the décor joins the scene's text at launch. */
  places: WorldPlace[]
  /** The scene's produced shots, as `/api/scenes` counts them. */
  stats: { n: number; avg: number | null } | undefined
  /** Unsaved edits: Produire reads scenes.json, so it would not see them. */
  changed: boolean
  className?: string
}) {
  const fragments = sceneFragments(draft, decorOf(places, draft.place))
  const composed = fragments.map((f) => f.text).join(', ')

  return (
    <aside
      className={`flex w-[340px] flex-none flex-col overflow-y-auto border-l border-l-line
                  bg-panel ${className ?? ''}`}
      aria-label="Aperçu du prompt"
    >
      <div className="flex flex-none items-baseline justify-between gap-[8px] border-b border-b-line px-[14px] py-[11px]">
        <b className="text-[13px] font-[650]">Aperçu du prompt</b>
        <span className="text-[11.5px] text-dim2">{composed.length} car.</span>
      </div>

      {/* Same id the header's own clamp carried: it is still « the composed
          prompt of the open scene, visible from every section », just in its
          own column now. */}
      <div id="scenePromptPreview" className="flex flex-col gap-[10px] px-[14px] py-[12px]">
        {fragments.length === 0 ? (
          <span className="text-[12px] text-dim">— vide —</span>
        ) : (
          fragments.map((fragment) => (
            <div key={fragment.key} className="flex gap-[8px]">
              <span
                aria-hidden="true"
                className="w-[3px] flex-none rounded-[2px]"
                style={{ backgroundColor: fragment.color }}
              />
              <div className="min-w-0">
                <span className="lab block">
                  {fragment.source}
                </span>
                <span className="block text-[12px] break-words">{fragment.text}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <dl className="m-0 grid grid-cols-[92px_minmax(0,1fr)] gap-x-[10px] gap-y-[7px] border-t
                     border-t-line px-[14px] py-[12px] text-[12px]">
        <Row label="tons affins" value={draft.tones || '—'} />
        <Row label="pose" value={draft.pose || 'aucune'} />
        <Row
          label="score moyen"
          value={stats?.avg != null ? `${stats.avg.toFixed(2)} · ${stats.n} image${stats.n > 1 ? 's' : ''}` : 'jamais produite'}
        />
      </dl>

      <div className="mt-auto flex flex-none flex-col gap-[6px] border-t border-t-line px-[14px] py-[12px]">
        {changed ? (
          <>
            <button type="button" className="btn w-full" disabled>
              Produire cette scène
            </button>
            <span className="text-[11.5px] text-warn-txt">
              Enregistre d'abord : Produire lit <code className="font-code">scenes.json</code>.
            </span>
          </>
        ) : (
          // `.btn` is an inline-block (base.css), so the label is centred by
          // `text-center`, not by a flex alignment that would not apply.
          <Link className="btn w-full text-center" to={PATHS.produce}>
            Produire cette scène
          </Link>
        )}
      </div>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="m-0 text-dim2">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{value}</dd>
    </>
  )
}
