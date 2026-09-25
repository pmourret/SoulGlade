/* The registry of worlds, the packs a new one can derive its family from, and
   how many characters compose in each world. State and gestures, so the screen
   composes (`.claude/rules/frontend.md`).

   THE CHARACTER COUNT COMES FROM A ROUTE THAT ALREADY EXISTS. The design-pass
   (§S5.2) allows showing « N personnages composent dans ce monde » only if one
   does, and forbids adding one. `GET /api/characters` (the entry gate's
   registry) already carries each character's `world` as `{id, label}`, so the
   count is a filter over a list the studio loads on its own home screen. No new
   route, no change to `WorldSummary`.

   IT STAYS SILENT RATHER THAN SAYING ZERO. `CHARACTERS/` is outside the
   versioned repo: an installation with none, or a listing that failed, must not
   print « 0 personnage » — that reads as a measurement, and it would be one
   made on data that is not there. */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'

export type WorldSummary = Schema<'WorldSummary'>
export type PackOption = Schema<'PackOption'>
type WorldListResponse = Schema<'WorldListResponse'>
type WorldOptionsResponse = Schema<'WorldOptionsResponse'>
type CreateWorldResponse = Schema<'CreateWorldResponse'>
type CharacterListResponse = Schema<'CharacterListResponse'>

export type NewWorldFields = { id: string; label: string; pack: string; tone: string }

export function useWorldRegistry() {
  const api = useApi()
  const [worlds, setWorlds] = useState<WorldSummary[] | null>(null)
  const [packs, setPacks] = useState<PackOption[]>([])
  const [perWorld, setPerWorld] = useState<Record<string, number> | null>(null)
  const [failed, setFailed] = useState(false)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const [registry, options, characters] = await Promise.all([
      api.get<WorldListResponse>('/api/worlds').catch(() => null),
      api.get<WorldOptionsResponse>('/api/worlds/options').catch(() => null),
      api.get<CharacterListResponse>('/api/characters').catch(() => null),
    ])
    if (!registry || errorOf(registry) || !Array.isArray(registry.worlds)) {
      setFailed(true)
      return
    }
    setFailed(false)
    setWorlds(registry.worlds)
    setPacks(options && !errorOf(options) ? (options.packs ?? []) : [])

    if (!characters || errorOf(characters) || !Array.isArray(characters.characters)) {
      setPerWorld(null)
      return
    }
    const counts: Record<string, number> = {}
    for (const row of characters.characters) {
      const id = row.world?.id
      if (id) counts[id] = (counts[id] ?? 0) + 1
    }
    setPerWorld(counts)
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  /** Returns the created world's id, or the server's own refusal. */
  const create = async (fields: NewWorldFields): Promise<{ id?: string; erreur?: string }> => {
    setCreating(true)
    const response = await api.post<CreateWorldResponse>('/api/worlds', fields)
    setCreating(false)
    const failure = errorOf(response)
    if (failure) return { erreur: failure }
    await load()
    return { id: response.id }
  }

  /** How many characters compose in this world, or null when it is not known.
      Never 0 for an empty registry — see the header. */
  const characterCount = (worldId: string): number | null => perWorld?.[worldId] ?? null

  return { worlds, packs, failed, creating, load, create, characterCount }
}
