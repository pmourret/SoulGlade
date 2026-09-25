/* What the grid says when it has nothing to show.

   Two different silences, and they must not read alike: an EMPTY folder is
   an outcome (« Tout est trié. »), a folder hidden by the score filter is a
   filter still on — which is why the second one offers the way out.

   AND A THIRD CASE, NEW (design-pass screen-5b, §S6): the folder is empty
   HERE and full next door. Producing at a non-exporting tier files into the
   NSFW space while the Revue opens on SFW, so « Tout est trié » could be
   true of the space one is looking at and false of the work one just did.
   The count already exists (`/api/state` returns one map per space, and the
   space selector already prints it) — this only says it where the silence
   is, and offers the one click across. */
import type { Space } from './useTriage'

const EMPTY_DONE: Record<string, string> = {
  A_REVOIR: 'Tout est trié.',
  OK: "Aucune image validée pour l'instant.",
  REJET: 'Aucun rejet.',
  ARCHIVE: 'Aucune image archivée.',
  SANS_VISAGE: 'Aucune image sans visage détecté.',
}

const BUCKET_LABEL: Record<string, string> = {
  A_REVOIR: 'à revoir',
  OK: 'validées',
  REJET: 'rejetées',
  ARCHIVE: 'archivées',
  SANS_VISAGE: 'sans visage',
}

export function EmptyState({
  empty,
  bucket,
  total,
  onShowAll,
  space,
  otherCount,
  onSwitchSpace,
  gallery,
}: {
  empty: boolean
  bucket: string
  total: number
  onShowAll: () => void
  /** The space being looked at — the callout names the OTHER one. */
  space: Space
  /** How many images the other space holds in THIS folder. */
  otherCount: number | undefined
  onSwitchSpace: () => void
  /* Galerie only (design-pass screen-5c, §S3). « Aucune image validée » is
     not a state one fixes by looking harder: the images are one screen away,
     waiting to be judged, or they have to be produced. An empty screen that
     only names its emptiness leaves one to work out both. */
  gallery?: { toReview: number; onReview: () => void; onProduce: () => void }
}) {
  const other: Space = space === 'sfw' ? 'nsfw' : 'sfw'
  return (
    <div className="empty">
      <b>{empty ? EMPTY_DONE[bucket] : 'Aucune image dans cette bande de score.'}</b>
      {empty
        ? bucket === 'A_REVOIR'
          ? 'Les images dont le score sort de la bande conforme atterrissent ici après chaque batch.'
          : bucket === 'SANS_VISAGE'
            ? "Le contrôle d'identité range ici les images où aucun visage n'a été détecté : dos, plan très large, visage masqué. Elles n'ont pas de score."
            : 'Rien à afficher dans ce dossier.'
        : `${total} image(s) dans ce dossier, aucune dans cette bande.`}
      {!empty && (
        <div className="mt-[16px]">
          <button className="btn" id="btnEmptyAll" onClick={onShowAll}>
            Tout afficher
          </button>
        </div>
      )}
      {empty && gallery && (
        <div className="mt-[20px] flex justify-center gap-[10px]" id="galleryEmptyActions">
          <button
            type="button"
            className="flex h-[36px] items-center rounded-[7px] border-0 bg-pri px-[16px]
                       text-[13.5px] font-semibold text-on-pri hover:bg-pri-h"
            id="btnEmptyReview"
            onClick={gallery.onReview}
          >
            Ouvrir la Revue
            {gallery.toReview > 0 && (
              <span className="ml-[7px] text-[12px] font-normal opacity-70">
                {gallery.toReview} à revoir
              </span>
            )}
          </button>
          <button type="button" className="btn" id="btnEmptyProduce" onClick={gallery.onProduce}>
            Produire
          </button>
        </div>
      )}
      {empty && Boolean(otherCount) && (
        <div
          className="mx-auto mt-[22px] flex max-w-[420px] items-center gap-[12px] rounded-card
                     border border-warn-line bg-warn-bg px-[14px] py-[11px] text-left
                     text-[12.5px] leading-[1.45] text-warn-txt"
          id="autreEspace"
        >
          <span className="min-w-0 flex-1">
            {otherCount} image{(otherCount ?? 0) > 1 ? 's' : ''}{' '}
            {BUCKET_LABEL[bucket] ?? bucket} dans l'espace {other.toUpperCase()}.
          </span>
          <button className="btn sm flex-none" id="btnAutreEspace" onClick={onSwitchSpace}>
            Ouvrir
          </button>
        </div>
      )}
    </div>
  )
}
