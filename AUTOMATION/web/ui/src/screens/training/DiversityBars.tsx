/* Diversity per axis: how many distinct values, and how many of them actually
   count. Pure presentation.

   WHY TWO NUMBERS PER AXIS. A count of distinct values would lie: ten near
   duplicates are one observation, not ten. `entrainement.diversite` returns the
   effective count next to the distinct one, and the bar draws the second inside
   the first so the gap between them is the thing you see.

   The scale is COMMON to every axis (the largest `distinctes` of the response):
   one bar per axis, each normalised to itself, would make four axes of unequal
   corpus look identical. */
const AXIS_LABELS: Record<string, string> = {
  scene: 'scène',
  intention: 'intention',
  ton: 'ton',
  format: 'format',
}

export type Axis = { distinctes: number; effectives: number; sans: number }

export function DiversityBars({ axes }: { axes: Record<string, Axis> }) {
  const rows = Object.entries(axes)
  const scale = Math.max(1, ...rows.map(([, axis]) => axis.distinctes))

  return (
    <section>
      <h2 className="m-0 mb-[10px] text-[10.5px] font-normal uppercase tracking-[.5px] text-dim">
        Diversité
      </h2>
      <ul className="m-0 list-none p-0">
        {rows.map(([name, axis]) => (
          <li key={name} className="mb-[10px] last:mb-0">
            <div className="grid grid-cols-[78px_minmax(0,1fr)_86px] items-center gap-[10px]">
              <span className="text-[12.5px] text-dim">{AXIS_LABELS[name] ?? name}</span>
              {/* Two lengths on ONE scale: `distinctes` is the ground, and the
                  accent drawn over it is what actually counts. */}
              <span aria-hidden="true" className="relative block h-[6px]">
                <span className="absolute inset-y-0 left-0 rounded-[3px] bg-line2"
                      style={{ width: `${(axis.distinctes / scale) * 100}%` }} />
                <span className="absolute inset-y-0 left-0 rounded-[3px] bg-acc"
                      style={{ width: `${(axis.effectives / scale) * 100}%` }} />
              </span>
              <span className="text-right text-[12.5px] tabular-nums text-dim">
                <b className="font-[600] text-txt">{axis.effectives.toFixed(1)}</b>
                {' / '}{axis.distinctes}
              </span>
            </div>
            {axis.sans ? (
              <p className="m-0 ml-[88px] mt-[2px] text-[11.5px] text-dim2">
                {axis.sans} sans donnée
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="m-0 mt-[10px] text-[12px] text-dim2">
        Dix quasi-doublons font une seule observation, pas dix.
      </p>
    </section>
  )
}
