/* The Produire "develop" panel — the sticky right column, screen-3-produire
   design pass §S. Replaces `Inspector.tsx` on this screen: same "last
   image" role, condensed to a single line + a 44×56 thumbnail instead of a
   full hero shot, to make room for what the panel adds — the detail of
   whichever scene is POINTED (hovered or focused in the grid, not
   necessarily ticked for launch): its score, which tones it suits, the pose
   it imposes, and "Sélectionner" to add it to the run without leaving the
   panel. Points AT a scene and SELECTS it are two different gestures on
   purpose — a photographer's loupe view previews a frame before deciding to
   keep it.

   THE HEADER IS SELF-CONTAINED, LIKE ITS PREDECESSOR. `Inspector.tsx` read
   its own two sources (STATE.recent, then a gallery fallback) rather than
   taking them as props — the "last image" is a fact about the CHARACTER,
   not about anything this screen already tracks. Same shape kept here. */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { errorOf, type ActionLike, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useCharacter } from '../../character/CharacterContext'
import { useConfig } from '../../state/ConfigContext'
import { useLightbox } from '../../chrome/LightboxContext'
import { useSystemState } from '../../state/SystemStateContext'
import { screenForImage } from '../../app/routes'
import type { Scene } from '../../state/ScenesStoreContext'
import type { SceneMeta, SceneStats } from './useSceneChoice'

type GalleryResponse = Schema<'GalleryResponse'>
type GalleryItem = Schema<'GalleryItem'>

type Shown = {
  name: string
  bucket?: string
  space?: string
  scene?: string | null
  score?: string | number | null
}

export function SceneDevelopPanel({
  scene,
  meta,
  stats,
  preview,
  tone,
  isSelected,
  onToggleSelect,
  onEdit,
  imageUrl,
}: {
  /** The scene currently pointed (hovered/focused) in the grid — `null` when
      nothing has been pointed at yet this session. */
  scene: Scene | null
  meta?: SceneMeta[string]
  stats?: SceneStats[string]
  preview?: { name: string; bucket: string; space?: string; v?: number }
  tone: string
  isSelected: boolean
  onToggleSelect: (id: string) => void
  /** screen-3-produire §B3: opens this scene in the Banque's composer. */
  onEdit: (id: string) => void
  imageUrl: (ref: Record<string, unknown>) => string
}) {
  const api = useApi()
  const navigate = useNavigate()
  const { claimed } = useCharacter()
  const { qc } = useConfig()
  const { state } = useSystemState()
  const { open: openLightbox } = useLightbox()
  const [fallback, setFallback] = useState<GalleryItem | null>(null)

  const fromState: Shown | null =
    state && state.character === claimed && Array.isArray(state.recent) && state.recent.length
      ? (state.recent[state.recent.length - 1] as Shown)
      : null

  const loadFallback = useCallback(async () => {
    try {
      const response = await api.get<GalleryResponse>('/api/gallery?bucket=OK&space=sfw')
      if (errorOf(response as ActionLike)) return
      const items = (response.items ?? []) as GalleryItem[]
      setFallback(items[0] ?? null)
    } catch {
      /* silent: comfort reading, the fault banner already carries a real load failure */
    }
  }, [api])

  useEffect(() => {
    setFallback(null)
    void loadFallback()
  }, [loadFallback, claimed])

  const last: Shown | null = fromState ?? (fallback as Shown | null)
  const lastThumb = last ? api.image({ ...last, thumb: true }) : null

  const dot =
    stats?.avg == null
      ? 'var(--dim2)'
      : stats.avg >= qc.high
        ? 'var(--ok)'
        : stats.avg >= qc.ok
          ? 'var(--warn)'
          : 'var(--bad)'
  const affines = meta?.tones ?? []

  return (
    /* A plain block since the design-pass screen-3b: it is the content of the
       inspector's « Scène » tab, which owns the column, the scrolling and the
       landmark. It used to be the sticky `<aside>` itself. */
    <div className="flex flex-col gap-[14px]">
      {/* Condensed "last image" — a single line + a small thumbnail, in place
          of Inspector's full hero shot: the panel's room now goes to the
          pointed scene below. */}
      <div className="flex items-center gap-[10px]">
        <button
          type="button"
          className="relative h-[45px] w-[36px] flex-none overflow-hidden rounded-[5px]
                     border border-line bg-panel2 p-0 disabled:cursor-default"
          disabled={!last || !lastThumb}
          onClick={() => last && openLightbox(api.image(last))}
          aria-label={last ? `dernière image — ${last.scene ?? ''}` : 'aucune image encore'}
        >
          {last && lastThumb && (
            <img className="h-full w-full object-cover" src={lastThumb} alt="" />
          )}
        </button>
        <div className="min-w-0 flex-1 text-[12.5px] leading-[1.4]">
          <div className="text-dim">Dernière image</div>
          {last ? (
            <button
              className="link truncate text-[13px]"
              onClick={() => navigate(screenForImage(last.bucket, last.name))}
            >
              {last.scene || last.name}
            </button>
          ) : (
            <span className="text-dim2">rien encore</span>
          )}
        </div>
      </div>

      <div className="border-t border-t-line" />

      {/* The pointed scene's detail — the panel's real estate now goes here.
          Order from the design-pass screen-3b §S4: who it is, what it looks
          like, then what is known about it. The preview moved ABOVE the
          figures: one recognises a scene by its image, and reading three
          lines of statistics to find out which one is on screen was the wrong
          way round. */}
      {scene ? (
        <div className="flex flex-col gap-[12px]" id="developScene">
          <div>
            {/* `normal-case` + `tracking-normal` + an explicit colour: the
                studio's `h2` rule (base.css) uppercases, letter-spaces and
                greys SECTION TITLES, and this heading carries an IDENTIFIER.
                Measured on screen: the panel read « CAFE_TERRASSE » while the
                card two columns left read « cafe_terrasse » — the same id in
                two spellings, on a screen whose whole job is matching one
                against the other. */}
            <h2 className="m-0 truncate text-[13.5px] font-semibold normal-case
                           tracking-normal text-txt">
              {scene.id}
            </h2>
            <span className="text-[11.5px] text-dim2">
              {scene.format || '4:5'} · {scene.count || 1} img
            </span>
          </div>

          {preview && (
            <div
              className="aspect-[4/5] w-full rounded-[8px] border border-line bg-panel2 bg-cover bg-center"
              style={{ backgroundImage: `url('${imageUrl({ ...preview, thumb: true })}')` }}
              aria-hidden="true"
            />
          )}

          {/* Label / value, as a description list: the panel answers « what do
              we know about this scene », which is a set of named facts, not a
              paragraph. */}
          <dl className="m-0 grid grid-cols-[76px_minmax(0,1fr)] gap-x-[10px] gap-y-[9px] text-[12.5px]">
            <dt className="text-dim">score</dt>
            <dd className="m-0">
              <div className="mb-[4px] flex items-center gap-[6px]">
                <span
                  className="h-[7px] w-[7px] flex-none rounded-[50%]"
                  style={{ background: dot }}
                  aria-hidden="true"
                />
                {stats ? (
                  <span className="tabular-nums">
                    {stats.avg != null ? stats.avg.toFixed(3) : '—'} · {stats.ok ?? 0}/{stats.n}{' '}
                    validée{stats.n > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-dim2">jamais produite</span>
                )}
              </div>
              {stats && stats.ok != null && stats.n > 0 && (
                <div
                  className="h-[4px] w-full overflow-hidden rounded-[2px] bg-line2"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-[2px]"
                    style={{ width: `${Math.round((100 * stats.ok) / stats.n)}%`, background: dot }}
                  />
                </div>
              )}
            </dd>

            {affines.length > 0 && (
              <>
                <dt className="text-dim">tons affins</dt>
                <dd className="m-0 flex flex-wrap gap-[5px]">
                  {affines.map((t) => (
                    <span
                      key={t}
                      className={`rounded-[4px] border px-[6px] py-px text-[11px] ${
                        t === tone ? 'border-acc text-acc' : 'border-line text-dim'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </dd>
              </>
            )}

            {meta?.pose && (
              <>
                <dt className="text-dim">pose</dt>
                {/* `tabIndex` + `data-hint-text` (design pass écran 7, §A2):
                    a plain `title` only reaches a mouse. The « ⛓ » glyph is
                    gone (screen-3b §S3) — it announced itself literally and
                    the word « imposée » says it better. */}
                <dd className="m-0">
                  <span
                    className="rounded-[4px] bg-panel2 px-[6px] py-px text-[11px] text-dim"
                    tabIndex={0}
                    data-hint-text={`pose imposée : ${meta.pose}`}
                  >
                    imposée
                  </span>
                </dd>
              </>
            )}
          </dl>

          <div className="flex gap-[8px]">
            <button
              type="button"
              id="developSelect"
              className={`btn sm flex-1${isSelected ? ' on' : ''}`}
              onClick={() => onToggleSelect(scene.id)}
            >
              {isSelected ? 'Retirer de la sélection' : 'Sélectionner'}
            </button>
            <button
              type="button"
              id="developEdit"
              className="btn sm flex-none"
              data-hint-text="Ouvrir cette scène dans les Ateliers, pré-sélectionnée"
              onClick={() => onEdit(scene.id)}
            >
              Éditer
            </button>
          </div>
        </div>
      ) : (
        <p className="tiny m-0 text-dim">survole ou choisis une scène pour voir son détail</p>
      )}
    </div>
  )
}
