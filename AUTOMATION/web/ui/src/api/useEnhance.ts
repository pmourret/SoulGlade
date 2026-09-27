/* The AI enhancer of a prompt fragment (IT-10 chantier 8): one call, bound to
   the current character like every other request, and turned into a result a
   control can show without checking any shape itself.

   The server translates a French fragment first, then improves it for its
   kind; it writes nothing. The screen that owns the field decides what
   « Appliquer » writes — this hook only proposes. */
import { useCallback, useMemo } from 'react'

import { useSystemState } from '../state/SystemStateContext'
import { errorOf } from './client'
import type { components } from './schema'
import { useApi } from './useApi'

type EnhanceResponse = components['schemas']['EnhanceResponse']
type EnhanceSceneResponse = components['schemas']['EnhanceSceneResponse']
/** What the AI panel sends: the three fragments, a free instruction, and
    optionally the one fragment to rewrite or a request for another version. */
export type EnhanceSceneBody = components['schemas']['EnhanceSceneRequest']
export type ScenePart = 'base' | 'light' | 'pose'

/** The fragment kinds the server knows (`enhance.KINDS`), and "edit": an
    edit instruction, only ever translated, never improved. */
export type EnhanceKind = 'place' | 'intention' | 'tone' | 'scene' | 'pose' | 'light' | 'outfit' | 'edit'

export type EnhanceOutcome =
  | { ok: true; text: string; translated: boolean; lost: string[] }
  | { ok: false; erreur: string }

/** `enhance(text)` for ONE kind — what a field hands to its `EnhanceControl`. */
export type EnhanceFn = (text: string) => Promise<EnhanceOutcome>

/** What a screen passes down to its fields: the call for a kind, and whether
    ComfyUI — which serves the model — is up. One prop, not two, through the
    screens that only forward it. */
export type SceneOutcome =
  | { ok: true; parts: Record<ScenePart, string>; translated: boolean; lost: Record<ScenePart, string[]> }
  | { ok: false; erreur: string }

export type Enhancer = {
  enhance: (kind: EnhanceKind) => EnhanceFn
  enhanceScene: (body: EnhanceSceneBody) => Promise<SceneOutcome>
  comfy: boolean
}

export function useEnhancer(): Enhancer {
  const api = useApi()
  const { state } = useSystemState()
  const comfy = Boolean(state?.comfy)
  const enhance = useCallback(
    (kind: EnhanceKind): EnhanceFn => async (text: string): Promise<EnhanceOutcome> => {
      const response = await api.post<EnhanceResponse>('/api/enhance', { kind, text })
      const error = errorOf(response)
      if (error) return { ok: false, erreur: error }
      return { ok: true, text: response.text, translated: response.translated, lost: response.lost }
    },
    [api],
  )
  const enhanceScene = useCallback(
    async (body: EnhanceSceneBody): Promise<SceneOutcome> => {
      const response = await api.post<EnhanceSceneResponse>('/api/enhance/scene', body)
      const error = errorOf(response)
      if (error) return { ok: false, erreur: error }
      const lost = response.lost ?? {}
      return {
        ok: true,
        parts: { base: response.base, light: response.light, pose: response.pose },
        translated: response.translated,
        lost: { base: lost.base ?? [], light: lost.light ?? [], pose: lost.pose ?? [] },
      }
    },
    [api],
  )
  return useMemo(() => ({ enhance, enhanceScene, comfy }), [enhance, enhanceScene, comfy])
}
