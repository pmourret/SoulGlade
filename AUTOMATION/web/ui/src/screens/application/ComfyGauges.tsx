/* The detailed view of the probes — the Application screen's half of the pair
   (design-pass screen-12 §S5): three equal cells, VRAM, RAM, GPU.

   ONE CALL, TWO SURFACES. The banner (compact, ProbeStrip) and this one read the
   SAME result, held by ComfyStatsContext. Two fetches for the same data would
   double the nvidia-smi spawns and could show two truths.

   ONLY WHAT THE PROBE RETURNS. Every figure below is a field of
   `ComfyStatsResponse` (ram, vram) or of the driver payload (gpu); nothing is
   derived that the probe does not carry. */
import type { ComfyStats } from '../../state/ComfyStatsContext'

/* `gpu` is `Optional[Any]` in the Pydantic model, deliberately: it is a driver
   payload that varies. This is the narrow shape this view READS. */
type GpuProbe = {
  nom?: string | null
  temperature?: number | null
  charge?: number | null
  puissance?: number | null
  vram_totale?: number | null
  vram_utilisee?: number | null
}

/** GB, not GiB — the unit nvidia-smi and the spec sheets use. */
const gb = (bytes: number) => (bytes / 1e9).toFixed(1)
const percent = (used: number, total: number) => (total > 0 ? Math.round((100 * used) / total) : 0)
/* Same steps as the banner probes (ProbeStrip). Colour never carries the
   reading alone — the figure is the cell's headline. */
const fill = (p: number) => (p >= 90 ? 'bg-bad' : p >= 70 ? 'bg-warn' : 'bg-ok')

const OFFLINE = 'ComfyUI ne répond pas'

function Cell({
  title,
  value,
  bar,
  sub,
  gauge,
}: {
  title: string
  value: string
  /** 0–100, or null for a cell without a bar reading. */
  bar: number | null
  sub: string
  /** Marks the memory cells for the fumigation (`[data-gauge]`), which
      compares their percent with the banner's. */
  gauge?: boolean
}) {
  return (
    <div className="min-w-0 px-[18px] py-[14px]" data-gauge={gauge ? '' : undefined}>
      <div className="text-[12px] text-dim" data-gauge-title={gauge ? '' : undefined}>
        {title}
      </div>
      <div
        className="mt-[4px] text-[20px] font-[650] text-txt tabular-nums"
        data-gauge-value={gauge ? '' : undefined}
      >
        {value}
      </div>
      <div className="mt-[8px] h-[4px] overflow-hidden rounded-[2px] bg-panel3">
        {bar != null && (
          <i
            className={`block h-full transition-[width] duration-300 ease-[ease] motion-reduce:transition-none ${fill(bar)}`}
            style={{ width: `${Math.min(100, bar)}%` }}
          />
        )}
      </div>
      <div className="mt-[6px] truncate text-[11.5px] text-dim2">{sub}</div>
    </div>
  )
}

export function ComfyGauges({ stats }: { stats: ComfyStats | null }) {
  const gpu = (stats?.gpu ?? null) as GpuProbe | null
  const online = Boolean(stats?.en_ligne)

  /* ComfyUI stopped: the RAM it reports is unknown, but the DRIVER may still
     know the VRAM and the temperature — which is exactly when one wants to know
     whether something is holding the card. */
  const vram = online && stats?.vram
    ? { used: stats.vram.utilisee, total: stats.vram.total }
    : gpu?.vram_totale
      ? { used: gpu.vram_utilisee ?? 0, total: gpu.vram_totale }
      : null
  const ram = online && stats?.ram ? { used: stats.ram.utilisee, total: stats.ram.total } : null
  const vramP = vram ? percent(vram.used, vram.total) : null
  const ramP = ram ? percent(ram.used, ram.total) : null

  const gpuSub = gpu
    ? [gpu.charge != null ? `charge ${gpu.charge} %` : '', gpu.puissance != null ? `${gpu.puissance.toFixed(0)} W` : '']
        .filter(Boolean)
        .join(' · ') || (gpu.nom ?? '')
    : 'nvidia-smi absent sur cette machine'

  return (
    <>
      <div
        className="grid grid-cols-3 divide-x divide-line2 rounded-card border border-line2 bg-panel"
        id={online ? 'comfyStats' : undefined}
        data-probes
      >
        {/* The percent stands alone in the value and last after its `·`:
            test_application.js reads it as `split('·').pop()`. */}
        <Cell
          title="VRAM"
          value={vramP != null ? `${vramP}%` : '·'}
          bar={vramP}
          sub={vram ? `${gb(vram.used)} / ${gb(vram.total)} Go${gpu?.nom ? ` · ${gpu.nom}` : ''}` : OFFLINE}
          gauge={vram != null}
        />
        <Cell
          title="RAM"
          value={ramP != null ? `${ramP}%` : '·'}
          bar={ramP}
          sub={ram ? `${gb(ram.used)} / ${gb(ram.total)} Go` : OFFLINE}
          gauge={ram != null}
        />
        <Cell
          title="GPU"
          value={gpu?.temperature != null ? `${gpu.temperature} °C` : '·'}
          bar={gpu?.charge ?? null}
          sub={gpuSub}
        />
      </div>
      <p className="mt-[8px] mb-0 text-[12px] text-dim2">
        {online
          ? 'Relevé toutes les 2 s sur cet écran.'
          : `${OFFLINE} : la mémoire vive qu'il rapporte est donc inconnue.${vram || gpu ? ' Le reste vient du pilote.' : ''}`}
      </p>
    </>
  )
}
