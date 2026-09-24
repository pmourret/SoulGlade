/* The prompt of a scene, cut into the fragments that compose it.

   NOT A SECOND ASSEMBLER (CLAUDE.md §3). `composePrompt` — and server-side
   `build_jobs` before it — remains the only thing that JOINS: this only says
   which fragment is which, in the order the join uses them, so two readers
   can show the same breakdown. The Prompt global panel already drew that
   breakdown for its own tinted preview; the living preview of the right-hand
   panel (design pass screen-7b §S5) shows the same one rather than rebuilding
   a prompt of its own next door. */
import type { SceneDraft } from '../../../state/ScenesStoreContext'

/* Border/highlight tints tying a fragment field to its segment in the composed
   preview (design pass écran 7, §V4) — platform tokens (`tokens.css`), not
   values chosen here: `--frag-light`/`--frag-pose` are their own, `--acc` for
   the base fragment is the app's existing accent. */
export const FRAGMENT_COLORS = {
  base: 'var(--acc)',
  light: 'var(--frag-light)',
  pose: 'var(--frag-pose)',
} as const

export type PromptFragment = {
  key: keyof typeof FRAGMENT_COLORS
  /** What this fragment describes, said in the interface's own words. */
  source: string
  text: string
  color: string
}

/** The non-empty fragments, in the order `composePrompt` joins them. */
export function sceneFragments(
  draft: Pick<SceneDraft, 'promptBase' | 'promptLight' | 'promptPose'>,
): PromptFragment[] {
  return [
    { key: 'base' as const, source: 'décor', text: draft.promptBase },
    { key: 'light' as const, source: 'lumière', text: draft.promptLight },
    { key: 'pose' as const, source: 'pose', text: draft.promptPose },
  ]
    .map((fragment) => ({ ...fragment, text: fragment.text.trim(), color: FRAGMENT_COLORS[fragment.key] }))
    .filter((fragment) => fragment.text)
}
