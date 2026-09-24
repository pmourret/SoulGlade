/* The middle column: the photos a range is tried on, and what the node makes
   of them (design-pass screen-8 §S4) — purely presentational (frontend.md: a
   sub-component never calls the API).

   ALWAYS AN ALREADY-PRODUCED PHOTO, never a fresh upload. That is a deliberate
   design choice, not a limitation: `AUTOMATION/expression.py`'s own reasoning
   is that the warp's identity cost varies from photo to photo, so only a photo
   the character actually produced makes the measured score mean anything.

   ONE VIEW TOGGLE FOR THE THREE CARDS, where each card used to carry its own.
   The question « does the expression hold » is asked by comparing three
   renders against three originals at the same instant; three independent
   toggles made that a four-click dance and let two cards sit in different
   states without saying so. */
import { Link } from 'react-router-dom'

import { PATHS } from '../../app/routes'
import { MAX_SELECTED_PHOTOS, type GalleryItem, type PhotoResult } from './useExpressionEditor'

type ImageUrl = (ref: {
  bucket: string
  space: string
  name: string
  v?: string | number | null
  thumb?: boolean
}) => string

export function TrialColumn({
  photos, photosError, selected, results, imageUrl, paramsChangedAt,
  viewingOriginal, rendering, canRender, renderHint, neutral, toneLabel,
  ok, watch,
  onSelectPhoto, onViewingOriginal, onRender, onRetry, openLightbox,
}: {
  photos: GalleryItem[] | null
  photosError: string | null
  selected: GalleryItem[]
  results: Record<string, PhotoResult>
  imageUrl: ImageUrl
  /** `useExpressionEditor`'s own timestamp of the last params change — a card
      rendered before it is stale (§S4.3). */
  paramsChangedAt: number
  viewingOriginal: boolean
  rendering: boolean
  canRender: boolean
  /** Why « Rendre l'essai » is unavailable, or null when it is. */
  renderHint: string | null
  /** No parameter included: the tone always draws a neutral face. */
  neutral: boolean
  toneLabel: string
  ok: number
  watch: number
  onSelectPhoto: (photo: GalleryItem) => void
  onViewingOriginal: (value: boolean) => void
  onRender: () => void
  onRetry: (name: string) => void
  openLightbox: (src: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-col bg-bg">
      <div className="flex h-[40px] flex-none items-center gap-[10px] border-b border-b-line px-[14px]">
        <span className="flex-none text-[12.5px] font-semibold">Photos d'essai</span>
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-dim2">
          {selected.length} / {MAX_SELECTED_PHOTOS} · choisies dans la Galerie
        </span>

        <div className="seg flex-none" role="group" aria-label="Ce que les cartes montrent">
          <SegButton active={viewingOriginal} onClick={() => onViewingOriginal(true)}>
            Original
          </SegButton>
          <SegButton active={!viewingOriginal} onClick={() => onViewingOriginal(false)}>
            Rendu
          </SegButton>
        </div>

        {/* THE HINT IS ON THE WRAPPER, not on the button. A disabled <button>
            fires no mouse event and takes no focus, so HintLayer's delegated
            listeners would never see it — the one state where the reason
            matters is the one where it would not show (the lesson of
            `#btnPoseExtract`, design-pass screen-7d). */}
        <span className="flex-none" data-hint-text={renderHint ?? undefined}>
          <button
            type="button"
            className="btn primary sm"
            id="btnRenderTrial"
            disabled={!canRender}
            onClick={onRender}
          >
            {rendering ? 'Rendu en cours…' : 'Rendre l’essai'}
            <span className="kbd ml-[6px]" aria-hidden="true">R</span>
          </button>
        </span>
      </div>

      <div className="flex-none border-b border-b-line px-[14px] py-[8px]">
        <PhotoPicker
          photos={photos}
          error={photosError}
          selected={selected}
          onSelect={onSelectPhoto}
          imageUrl={imageUrl}
        />
      </div>

      <div className="min-h-0 flex-1 p-[14px]">
        {selected.length === 0 ? (
          <div className="empty flex h-full flex-col items-center justify-center gap-[8px] rounded-card
                          border border-line bg-panel px-[16px] py-[28px] text-center text-[13px]">
            {neutral ? (
              <>
                <b>« {toneLabel} » tire toujours un visage neutre.</b>
                <span className="text-dim">
                  Aucun paramètre n'est inclus dans sa plage : la génération ne
                  déforme rien. Coche un paramètre à droite, ou reprends la plage
                  d'un autre ton avec « Copier depuis… ».
                </span>
              </>
            ) : photos !== null && photos.length === 0 ? (
              /* FOUND ON A REAL SCREENSHOT with an emptied gallery: this box
                 said « Choisis jusqu'à 3 photos d'essai » directly under a
                 line stating there were none to choose — an instruction one
                 cannot follow. The strip above says WHAT is missing, this says
                 what to do about it. */
              <>
                <b>Aucune image validée à essayer.</b>
                <span className="text-dim">
                  La plage se juge sur de vraies photos du personnage. Produis-en
                  une, puis garde-la depuis{' '}
                  <Link className="link" to={PATHS.review}>
                    la Revue
                  </Link>
                  . Les réglages ci-contre restent modifiables et enregistrables
                  sans essai.
                </span>
              </>
            ) : (
              <>
                <b>Choisis jusqu'à {MAX_SELECTED_PHOTOS} photos d'essai.</b>
                <span className="text-dim">
                  La plage se juge sur de vraies photos du personnage : le coût en
                  identité change de l'une à l'autre.
                </span>
              </>
            )}
          </div>
        ) : (
          <div
            /* Equal tracks and the remaining height, no scroll (§S4.3): three
               cards one compares must be side by side at the same size, and a
               scrollbar here would mean comparing by memory. */
            className="grid h-full gap-[10px] max-[1100px]:grid-cols-2"
            style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}
          >
            {selected.map((photo) => (
              <TrialCard
                key={photo.name}
                photo={photo}
                result={results[photo.name]}
                imageUrl={imageUrl}
                viewingOriginal={viewingOriginal}
                stale={
                  results[photo.name]?.renderedAt != null &&
                  paramsChangedAt > (results[photo.name]?.renderedAt ?? 0)
                }
                ok={ok}
                watch={watch}
                onRetry={() => onRetry(photo.name)}
                openLightbox={openLightbox}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        'cursor-pointer border-none px-[12px] py-[6px] text-[12.5px] focus-visible:outline-2' +
        ' focus-visible:outline-focus focus-visible:-outline-offset-2' +
        (active ? ' on bg-panel3 font-semibold text-txt' : ' bg-transparent text-dim')
      }
    >
      {children}
    </button>
  )
}

function PhotoPicker({
  photos, error, selected, onSelect, imageUrl,
}: {
  photos: GalleryItem[] | null
  error: string | null
  selected: GalleryItem[]
  onSelect: (photo: GalleryItem) => void
  imageUrl: ImageUrl
}) {
  if (error) return <p className="tiny m-0 text-danger-txt">{error}</p>
  if (photos === null) return <p className="tiny m-0">chargement…</p>
  if (photos.length === 0) {
    return (
      <p className="tiny m-0">
        Aucune image validée pour essayer une expression —{' '}
        <Link className="link" to={PATHS.review}>
          la Revue en produira à mesurer
        </Link>
        .
      </p>
    )
  }
  return (
    /* A horizontal strip, not a wrapping grid: the choice is a band of a fixed
       height above the cards, and a grid that grows with the gallery would
       push those cards off the screen. */
    <div className="flex gap-[6px] overflow-x-auto pb-[2px]">
      {photos.map((item) => {
        const isSelected = selected.some((p) => p.name === item.name)
        return (
          <button
            key={item.name}
            type="button"
            data-photo={item.name}
            className="h-[64px] w-[64px] flex-none overflow-hidden rounded-[6px] border-0 p-0"
            style={{
              outline: isSelected ? '2px solid var(--acc)' : 'none',
              outlineOffset: '-2px',
              opacity: isSelected ? 1 : 0.6,
            }}
            aria-pressed={isSelected}
            /* Scene, date and score as a hint, not a `title` — the studio's own
               tooltip shows on focus too and closes on Escape (§A1). */
            data-hint-text={[item.scene, item.date, item.score].filter(Boolean).join(' · ')}
            onClick={() => onSelect(item)}
          >
            <img
              className="h-full w-full object-cover"
              loading="lazy"
              src={imageUrl({ bucket: item.bucket, space: item.space, name: item.name, v: item.v, thumb: true })}
              alt={item.scene || item.name}
            />
          </button>
        )
      })}
    </div>
  )
}

/** One photo's own render, isolated from the other two: a photo the node
    cannot find a face in must never hide the ones it did (§S4.3). */
function TrialCard({
  photo, result, imageUrl, viewingOriginal, stale, ok, watch, onRetry, openLightbox,
}: {
  photo: GalleryItem
  result: PhotoResult | undefined
  imageUrl: ImageUrl
  viewingOriginal: boolean
  stale: boolean
  ok: number
  watch: number
  onRetry: () => void
  openLightbox: (src: string) => void
}) {
  const originalSrc = imageUrl({ bucket: photo.bucket, space: photo.space, name: photo.name, v: photo.v })
  const shown = result?.previewUrl && !viewingOriginal ? result.previewUrl : originalSrc
  const failed = Boolean(result?.renderError)

  return (
    <div
      data-photo-result={photo.name}
      /* `role="alert"` ONLY on a failed card, so the message is announced once
         when it appears and the two healthy cards stay silent (§A). */
      role={failed ? 'alert' : undefined}
      className={`flex min-h-0 flex-col overflow-hidden rounded-card border bg-panel2 ${
        failed ? 'border-danger-line' : 'border-line2'
      }`}
    >
      {stale && !viewingOriginal && (
        /* Not a live region (§A): it appears while one is looking at the card
           it belongs to, and it is read when that card takes focus. */
        <div className="flex-none border-b border-b-warn-line bg-warn-bg px-[8px] py-[4px] text-[11px] text-warn-txt">
          Réglages modifiés depuis ce rendu
        </div>
      )}

      {failed ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[6px] p-[12px] text-center">
          <span className="text-[18px] text-danger-txt" aria-hidden="true">
            ◆
          </span>
          <b className="text-[12.5px] text-danger-txt">{result?.renderError}</b>
          <span className="text-[11.5px] text-dim">
            Les autres photos de l'essai ne sont pas touchées.
          </span>
          <button type="button" className="btn sm mt-[2px]" data-photo-retry onClick={onRetry}>
            Réessayer celle-ci
          </button>
        </div>
      ) : (
        <img
          className="min-h-0 w-full flex-1 cursor-zoom-in object-contain"
          src={shown}
          alt=""
          onClick={() => openLightbox(shown)}
        />
      )}

      {/* TWO LINES, not one. Measured at 1440 with three cards: a card is
          ~240 px, and « salon_lecture · identité 0.780 (conforme) » truncated
          at « (confor… » — cutting the WORD, which is the half of the verdict
          that does not depend on colour (frontend.md: statut jamais par la
          couleur seule). The scene name yields instead; the verdict never
          does. */}
      <div className="flex-none border-t border-t-line2 px-[8px] py-[5px] text-[11.5px]">
        <div className="truncate text-dim">{photo.scene || photo.name}</div>
        {result?.rendering ? (
          <div>rendu…</div>
        ) : (
          result?.scoreAfter != null &&
          !viewingOriginal &&
          !failed && (
            <div className="truncate">
              <ScoreBadge score={result.scoreAfter} ok={ok} watch={watch} />
            </div>
          )
        )}
      </div>
    </div>
  )
}

/** Text AND colour, never the colour alone (frontend.md). */
function ScoreBadge({ score, ok, watch }: { score: number; ok: number; watch: number }) {
  const level = score >= ok ? 'ok' : score >= watch ? 'watch' : 'reject'
  const color = level === 'ok' ? 'text-ok' : level === 'watch' ? 'text-warn-txt' : 'text-danger-txt'
  const label = level === 'ok' ? 'conforme' : level === 'watch' ? 'à surveiller' : 'dérive'
  return (
    <span className={color}>
      identité {score.toFixed(3)} ({label})
    </span>
  )
}
