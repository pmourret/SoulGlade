/* The body the zones are read on (design-pass tenues, S5) — presentational.

   NOT AN ILLUSTRATION: simple shapes in the neutral tokens, the same family as
   the light workshop's direction diagram. Three variants of one footprint
   (240 x 520) — Féminine, Masculine, Neutre — that only move the shoulders,
   the waist and the hips. Changing it changes neither the slots, nor what is
   proposed, nor the prompt.

   Each part echoes the state of its zone: worn (filled), empty (dotted),
   active (ringed with the accent). The state is SAID in words on the zone
   card; the body only repeats it, so it is hidden from assistive technology
   and a pointer shortcut to the card's own gesture. */
import type { ZoneKey } from './outfitSlots'

export type Figure = 'feminine' | 'masculine' | 'neutral'
export type ZoneState = { worn: boolean; active: boolean; warn: boolean }

export const FIGURE_W = 240
export const FIGURE_H = 520
const CX = FIGURE_W / 2

/* Half-widths of the shoulders, the waist and the hips. */
const BUILD: Record<Figure, { s: number; w: number; h: number }> = {
  feminine: { s: 52, w: 34, h: 54 },
  masculine: { s: 66, w: 48, h: 48 },
  neutral: { s: 58, w: 42, h: 50 },
}

/** Where a zone's connector lands on the body, in figure coordinates. */
export function anchorOf(zone: ZoneKey, figure: Figure): { x: number; y: number } {
  const { s } = BUILD[figure]
  switch (zone) {
    case 'head': return { x: CX, y: 50 }
    case 'neck': return { x: CX, y: 98 }
    case 'torso': return { x: CX, y: 170 }
    case 'arms': return { x: CX - s - 12, y: 262 }
    case 'legs': return { x: CX, y: 330 }
    case 'feet': return { x: CX, y: 494 }
    case 'carried': return { x: CX + s + 26, y: 330 }
  }
}

export function Silhouette({
  figure, states, width = FIGURE_W, onZone,
}: {
  figure: Figure
  states: Record<ZoneKey, ZoneState>
  /** Drawn size; the geometry stays 240 x 520. */
  width?: number
  onZone: (zone: ZoneKey) => void
}) {
  const { s, w, h } = BUILD[figure]
  const part = (zone: ZoneKey) => {
    const st = states[zone]
    return {
      className: `cursor-pointer ${st.warn ? 'fill-warn-bg stroke-warn-line' : st.worn ? 'fill-panel3 stroke-line2' : 'fill-transparent stroke-line2'} ${
        st.active ? 'stroke-acc!' : ''}`,
      strokeWidth: st.active ? 2 : 1.2,
      strokeDasharray: st.worn || st.warn ? undefined : '4 3',
      'data-zone-part': zone,
      onClick: () => onZone(zone),
    }
  }
  const armX = CX - s - 20
  const legTop = 250
  return (
    <svg width={width} height={(width * FIGURE_H) / FIGURE_W} viewBox={`0 0 ${FIGURE_W} ${FIGURE_H}`}
         aria-hidden="true" className="block flex-none" strokeLinejoin="round">
      <ellipse cx={CX} cy={50} rx={28} ry={34} {...part('head')} />
      <rect x={CX - 12} y={86} width={24} height={22} rx={6} {...part('neck')} />
      <path d={`M ${CX - s} 112 L ${CX + s} 112 L ${CX + w} ${legTop} L ${CX - w} ${legTop} Z`} {...part('torso')} />
      <path
        d={`M ${armX} 118 l 14 0 l 2 170 l -14 0 Z M ${2 * CX - armX - 14} 118 l 14 0 l -2 170 l -14 0 Z
            M ${armX + 7} 300 m -9 0 a 9 11 0 1 0 18 0 a 9 11 0 1 0 -18 0
            M ${2 * CX - armX - 7} 300 m -9 0 a 9 11 0 1 0 18 0 a 9 11 0 1 0 -18 0`}
        {...part('arms')}
      />
      <path
        d={`M ${CX - w} ${legTop} L ${CX + w} ${legTop} L ${CX + h} 300 L ${CX + 20} 474 L ${CX + 4} 474 L ${CX} 320
            L ${CX - 4} 474 L ${CX - 20} 474 L ${CX - h} 300 Z`}
        {...part('legs')}
      />
      <path d={`M ${CX - 24} 480 h 22 v 18 h -26 Z M ${CX + 2} 480 h 22 l 4 18 h -26 Z`} {...part('feet')} />
      <rect x={CX + s + 10} y={300} width={32} height={40} rx={5} {...part('carried')} />
      <path d={`M ${CX + s + 18} 300 q 8 -14 16 0`} className="fill-none stroke-line2" strokeWidth={1.2}
            aria-hidden="true" />
    </svg>
  )
}
