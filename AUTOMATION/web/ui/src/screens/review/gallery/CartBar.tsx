/* The cart bar (design-pass screen-5c, §S5): what one is about to take out,
   and the one gesture that takes it out.

   IT ONLY EXISTS WHEN THE CART DOES. An empty bar would be 64 px of chrome
   saying nothing on a screen whose subject is the images — and its absence is
   itself the answer to « is anything selected ».

   THE MINI THUMBNAILS KEEP THEIR RATIO, like the board's: the cart is where
   one checks that the three files about to leave are the three one meant, and
   a story squashed into a square is not recognisable as a story.

   THE COUNT IS ANNOUNCED (`aria-live="polite"` on the summary): ticking a box
   on the board is a gesture whose only feedback is here, and a screen reader
   would otherwise hear nothing at all. */
import { ratioOf } from './boardLayout'
import type { GalleryItem } from '../useTriage'

export function CartBar({
  items,
  imageUrl,
  onRemove,
  onClear,
  onDownload,
  downloading,
}: {
  items: GalleryItem[]
  imageUrl: (ref: Record<string, unknown>) => string
  onRemove: (name: string) => void
  onClear: () => void
  onDownload: () => void
  downloading: boolean
}) {
  if (!items.length) return null

  /* « 3 images · 2 feed, 1 story » — the breakdown is by SHAPE, because that
     is what decides where a file goes. Portrait-or-taller reads as a story,
     the rest as feed; the ratio is the fact, the word is the shorthand. */
  const story = items.filter((i) => ratioOf(i.format) < 0.6).length
  const feed = items.length - story
  const parts = [feed ? `${feed} feed` : '', story ? `${story} story` : '']
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className="flex h-[64px] flex-none items-center gap-[14px] overflow-x-auto border-t
                 border-t-line bg-panel px-[16px]"
      id="cartBar"
    >
      <div className="flex-none">
        <b className="block text-[13px] font-[650] whitespace-nowrap text-txt">Panier</b>
        <span
          className="block text-[11.5px] whitespace-nowrap text-dim"
          id="cartSummary"
          aria-live="polite"
        >
          {items.length} image{items.length > 1 ? 's' : ''}
          {parts ? ` · ${parts}` : ''}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-[6px] overflow-x-auto">
        {items.map((item) => (
          <div
            key={item.name}
            className="relative h-[44px] flex-none overflow-hidden rounded-[3px] bg-panel2"
            style={{ width: 44 * ratioOf(item.format) }}
            data-cart-item={item.name}
          >
            <img
              className="h-full w-full object-cover"
              src={imageUrl({ ...item, thumb: true })}
              alt=""
            />
            <button
              type="button"
              className="absolute top-0 right-0 flex h-[16px] w-[16px] items-center justify-center
                         border-0 bg-scrim p-0 text-[11px] leading-none text-txt hover:bg-bad
                         focus-visible:outline-2 focus-visible:outline-focus
                         focus-visible:outline-offset-[-2px]"
              aria-label={`Retirer ${item.scene || item.name} du panier`}
              onClick={() => onRemove(item.name)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="link flex-none whitespace-nowrap" id="btnCartClear" onClick={onClear}>
        Vider
      </button>
      <button
        type="button"
        className="flex h-[36px] flex-none items-center rounded-[7px] border-0 bg-pri px-[16px]
                   text-[13.5px] font-semibold whitespace-nowrap text-on-pri hover:bg-pri-h
                   disabled:cursor-not-allowed disabled:opacity-40"
        id="btnCartDownload"
        disabled={downloading}
        onClick={onDownload}
      >
        {downloading
          ? 'Téléchargement…'
          : `Télécharger ${items.length} image${items.length > 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
