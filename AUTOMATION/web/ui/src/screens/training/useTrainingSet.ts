/* State and gestures of the training-set screen: load, export, reload.

   TWO ROUTES ARE LOADED TOGETHER because they answer one question. The
   proposal says what WOULD be exported; the history says what already WAS.
   Reading one without the other is how you export the same set twice without
   noticing.

   The export is a single request that copies files and captions them. It can
   take a while — `legendes.repli_vision` on the proposal says how long it is
   likely to take BEFORE the click, which is why the screen shows that count
   next to the button rather than after. */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useCharacter } from '../../character/CharacterContext'
import { useToast } from '../../chrome/ToastContext'

export type Proposal = Schema<'TrainingProposalResponse'>
export type ExportsResponse = Schema<'TrainingExportsResponse'>
export type ExportResult = Schema<'TrainingExportResponse'>

/* The backend models one past export as a free dict, because its fields come
   from a manifest written by an older revision and the set will grow. This is
   the narrow shape THE SCREEN reads, declared where it is read — not a second
   copy of a contract the server deliberately keeps open. Everything is
   optional: a manifest written before a field existed simply lacks it. */
export type PastExport = {
  horodatage?: string
  dossier?: string
  exporte_le?: string
  images?: number
  ancre_reinjectee?: string | null
  declencheur?: string
  famille?: string | null
  repetitions?: number | null
  repetitions_defaut?: boolean
  script?: string | null
  dossier_images?: string
  illisible?: string | null
}

export function useTrainingSet() {
  const api = useApi()
  const { claimed } = useCharacter()
  const toast = useToast()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [past, setPast] = useState<PastExport[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  /* Empty means « laisse le défaut » — the screen never invents a number the
     server would then have to guess was deliberate. A repetition count is a
     training setting: it belongs to the user (PROJET.md). */
  const [repetitions, setRepetitions] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, h] = await Promise.all([
        api.get<Proposal>('/api/training/proposal'),
        api.get<ExportsResponse>('/api/training/exports'),
      ])
      const failure = errorOf(p) || errorOf(h)
        || (Array.isArray(p.file) ? null : 'réponse illisible du serveur')
      setLoading(false)
      if (failure) {
        setError(failure)
        return
      }
      setError(null)
      setProposal(p)
      setPast((h.exports ?? []) as PastExport[])
    } catch {
      setError('serveur injoignable')
      setLoading(false)
    }
  }, [api])

  /* Reloads on entering the screen and on a character switch — a training set
     belongs to a character, and switching no longer reloads the page. */
  useEffect(() => {
    void load()
  }, [load, claimed])

  const runExport = useCallback(async () => {
    setExporting(true)
    let result: (ExportResult & { ok?: boolean; erreur?: string }) | null = null
    try {
      result = await api.post<ExportResult>('/api/training/export', {
        repetitions: repetitions.trim() ? Number(repetitions.trim()) : null,
      })
    } catch {
      setExporting(false)
      toast('serveur injoignable')
      return
    }
    setExporting(false)
    /* The 409 « une production tourne » arrives here like any other refusal,
       with its French message: it is displayed verbatim, never rewritten. */
    const failure = errorOf(result)
    if (failure) {
      toast(failure)
      return
    }
    toast(`${result.images} image(s) exportées — ${result.dossier}`)
    void load()
  }, [api, load, repetitions, toast])

  return {
    proposal, past, error, loading, exporting,
    repetitions, setRepetitions, runExport, reload: load,
  }
}
