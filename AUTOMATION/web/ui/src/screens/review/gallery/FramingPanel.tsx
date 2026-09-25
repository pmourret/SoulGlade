/* The framing panel: what a feed or a story frame keeps of an image, and
   roughly where a platform tends to cover it (design-pass screen-5c, §S4).

   NO PLATFORM INTERFACE IS REPRODUCED. No icon, no avatar, no button, no
   name. What is drawn is a hatched band and a caption saying « zone souvent
   recouverte », which is the only thing a framing preview has to say: do not
   put the face there. Anything more would be imitating a product we do not
   control, on a screen whose whole job is to be honest about what the image
   is.

   AND THE NUMBERS ARE MARKERS, NOT MEASUREMENTS. `SAFE_ZONES` holds rough
   fractions, declared in `boardLayout.ts` and printed as such. A panel that
   showed 16 % as a fact would be inventing a precision nobody measured — the
   same trap the hands metric documented for itself.

   DIMENSIONS ARE READ, NEVER DEDUCED: `naturalWidth`/`naturalHeight` come
   from the loaded image, because `format` is a nominal label (« upscale »
   lives in that field too) and not a size. */
import { useState } from 'react'

import { FRAMES, SAFE_ZONES } from './boardLayout'
import type { GalleryItem } from '../useTriage'

export function FramingPanel({
  item,
  src,
  inCart,
  onCartToggle,
  onEdit,
}: {
  item: GalleryItem | undefined
  src: string | null
  inCart: boolean
  onCartToggle: () => void
  onEdit: () => void
}) {
  const [frame, setFrame] = useState<'feed' | 'story'>('feed')
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  const zone = SAFE_ZONES[frame]
  const spec = FRAMES[frame]

  return (
    <>
      <div className="flex-none border-b border-b-line px-[14px] py-[12px]">
        <h2 className="lab mb-[10px]">
          Cadrage
        </h2>
        <div className="seg w-full" role="radiogroup" aria-label="Cadre" id="frameSel">
          {(['feed', 'story'] as const).map((key) => (
            <button
              key={key}
              role="radio"
              aria-checked={frame === key}
              className={`flex-1 ${frame === key ? 'on' : ''}`}
              data-frame={key}
              onClick={() => setFrame(key)}
            >
              {FRAMES[key].label}{' '}
              <span className="text-[11px] text-dim">{key === 'feed' ? '4:5' : '9:16'}</span>
            </button>
          ))}
        </div>
      </div>

      {!item || !src ? (
        <p className="m-0 px-[14px] py-[16px] text-[12.5px] text-dim">
          Aucune image sous le curseur.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-y-auto px-[14px] py-[13px]">
          <div
            className="relative w-full overflow-hidden border border-line2 bg-bg"
            style={{ aspectRatio: String(spec.ratio) }}
            id="framePreview"
          >
            <img
              className="h-full w-full object-cover object-center"
              src={src}
              alt=""
              onLoad={(event) =>
                setSize({
                  w: event.currentTarget.naturalWidth,
                  h: event.currentTarget.naturalHeight,
                })
              }
            />
            {/* The hatch is a repeating gradient rather than an image: no
                asset, and it scales with the frame.

                `color-mix` ON `--txt`, NOT A HEX. It was written `#e8e8e814`,
                which is `--txt` with an alpha glued on — a copy of a token
                that would stop following it the day a pack redefines it, and
                exactly the « aucune valeur en dur hors tokens.css » the
                frontend rules forbid. The comment here also claimed
                `DESIGN.md` listed that value among its raw ones; it does not,
                and justifying a shortcut by an authorisation that does not
                exist is worse than the shortcut. `color-mix` is already how
                this repo derives a veil from a token (chrome.css:142,
                SceneComposer.tsx:1212). */}
            {(['top', 'bottom'] as const).map((edge) =>
              zone[edge] > 0 ? (
                <div
                  key={edge}
                  className="pointer-events-none absolute inset-x-0 border-dashed border-dim2
                             [background:repeating-linear-gradient(45deg,color-mix(in_srgb,var(--txt)_8%,transparent)_0_6px,transparent_6px_12px)]"
                  style={{
                    [edge]: 0,
                    height: `${zone[edge] * 100}%`,
                    [edge === 'top' ? 'borderBottomWidth' : 'borderTopWidth']: 1,
                  }}
                  data-safe={edge}
                  aria-hidden="true"
                />
              ) : null,
            )}
          </div>

          <p className="m-0 font-code text-[10.5px] leading-[1.45] text-dim2" id="frameLegend">
            zone souvent recouverte · repère générique, pas une mesure
          </p>

          <div>
            <b className="block truncate text-[13px] font-semibold text-txt">
              {item.scene || item.name}
            </b>
            <span className="text-[11.5px] text-dim2">
              {size ? `${size.w} × ${size.h} px` : 'dimensions en lecture…'}
            </span>
          </div>

          <div className="flex gap-[8px]">
            <button
              type="button"
              className={`btn sm flex-1${inCart ? ' on' : ''}`}
              id="btnFrameCart"
              onClick={onCartToggle}
            >
              {inCart ? 'Retirer du panier' : 'Ajouter au panier'}{' '}
              <span className="kbd" aria-hidden="true">
                B
              </span>
            </button>
            <button type="button" className="btn sm flex-none" id="btnFrameEdit" onClick={onEdit}>
              Éditer
            </button>
          </div>

          {/* The panel says what it does NOT hold, rather than letting one
              hunt for it: declining, the measurements, the prompt and the
              seed are readings of a single image, and they live in the loupe. */}
          <p className="m-0 text-[11.5px] leading-[1.45] text-dim2">
            Décliner, mesures, prompt et graine restent en loupe (double-clic ou{' '}
            <span className="kbd">Entrée</span>).
          </p>
        </div>
      )}
    </>
  )
}
