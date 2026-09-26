/* Values read from config.json, ONE source. Ported from `static/config.js`.

   NO THRESHOLD IS EVER WRITTEN IN THE FRONTEND (CLAUDE.md §8.4): the disk sort
   and the screen must speak of the same threshold. The score reading bands and
   the reference values of the generation settings come from here, never from a
   constant in a component.

   The response is typed as an open record on purpose — `/api/config` has NO
   response model, and its docstring says why: a model there would be a second,
   silently diverging copy of that file's shape. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { useApi } from '../api/useApi'
import { useCharacter } from '../character/CharacterContext'

/** Score reading bands. The defaults only ever serve the instant before
    /api/config answers — they are the same ones the legacy module carried. */
export type QcBands = { ok: number; watch: number; high: number }

const DEFAULT_QC: QcBands = { ok: 0.72, watch: 0.6, high: 0.75 }

/* Mains (P4.3) has no third "excellent" tier — only OK / suspect / cassées
   (DOCS/cadrage/2026-09-07-p4-3-metrique-mains.md). `high: Infinity` keeps
   `scoreClass` from ever picking the extra tier rather than special-casing
   a fourth reader of the thresholds. Defaults mirror the fallback in
   AUTOMATION/runner/sortie.py::mesurer_mains for a character whose
   config.json has no qc.mains block yet (unmeasured — same discipline as
   `"measured": false` elsewhere in the repo). */
const DEFAULT_QC_MAINS: QcBands = { ok: 1, watch: 0.7, high: Infinity }

type CharacterConfig = Record<string, unknown>

type ConfigContextValue = {
  qc: QcBands
  qcMains: QcBands
  /** The whole file, for whoever reads a key this layer must not get to choose. */
  config: CharacterConfig | null
  /** The formats the character renders, in the file's order — the ONE list
      (IT-10, chantier 3). The first is a new scene's default. */
  formats: string[]
}

/** « 4:5 — portrait », « 16:9 — paysage »: what a ratio looks like, never
    what it is for on some platform (that is the pack's business). */
export function formatLabel(format: string): string {
  const [w, h] = format.split(':').map(Number)
  return `${format} — ${w > h ? 'paysage' : w < h ? 'portrait' : 'carré'}`
}

const Ctx = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const api = useApi()
  const { claimed } = useCharacter()
  const [config, setConfig] = useState<CharacterConfig | null>(null)
  const [qc, setQc] = useState<QcBands>(DEFAULT_QC)
  const [qcMains, setQcMains] = useState<QcBands>(DEFAULT_QC_MAINS)

  const load = useCallback(async () => {
    // No character claimed yet (entry gate): /api/config now requires one,
    // and there is nothing to read before a character is even picked
    // (2026-09-01 — see SystemStateContext's own note on the same pattern).
    if (!claimed) return
    try {
      const response = await api.get<CharacterConfig>('/api/config')
      setConfig(response)
      const bands = response.qc as Record<string, unknown> | undefined
      if (bands) {
        const ok = Number(bands.threshold_ok)
        setQc({
          ok,
          watch: Number(bands.threshold_watch),
          high: Number(bands.threshold_high ?? ok + 0.03),
        })
        const mains = bands.mains as Record<string, number> | undefined
        if (mains) {
          setQcMains({
            ok: Number(mains.threshold_ok),
            watch: Number(mains.threshold_watch),
            high: Infinity,
          })
        }
      }
    } catch {
      /* keep the defaults — a comfort reading must not break the screen */
    }
  }, [api, claimed])

  // the settings belong to a character: switching reloads them
  useEffect(() => {
    void load()
  }, [load, claimed])

  const value = useMemo(
    () => ({ qc, qcMains, config, formats: Object.keys((config?.formats as object) ?? {}) }),
    [qc, qcMains, config],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useConfig(): ConfigContextValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('useConfig hors de ConfigProvider')
  return value
}
