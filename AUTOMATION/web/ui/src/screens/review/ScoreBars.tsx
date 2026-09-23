/* Where the scale of a realism measurement comes from, said in words.

   THE BARS THEMSELVES ARE GONE (design-pass screen-5b, §S4.2): three filled
   bars on every tile and three more in the meta column became five rules of
   one shape, `BandRule.tsx`, which draws the band the value should land in
   rather than a fill whose end means nothing on its own.

   WHAT SURVIVES IS `calibration()`, and it is the important half. The
   calibration band exists when at least 8 images have been judged
   convincing; otherwise the scale is the range observed in the CURRENT
   folder. NO THRESHOLD IS WRITTEN IN THE CODE: the project has no corpus of
   real photographs, so the reference is the user's own judgement
   (CLAUDE.md §8.4). Which is exactly why the scale has to be SAID —
   otherwise one does not know what is being read. */
import type { Band } from './useTriage'

/* The three measurements can be calibrated SEPARATELY: taking the first band
   that comes announced an origin the others do not necessarily share. We say
   what is true of all three. */
export function calibration(
  bands: Record<string, unknown>,
  references: { mesurees: number; total: number },
): string {
  const list = Object.values(bands).filter(Boolean) as Band[]
  if (!list.length) return '· pas de cible, échelle du dossier'
  const partial = list.length < 3 ? ` · ${list.length}/3 mesures calibrées` : ''
  const sources = new Set(list.map((b) => b.source))
  if (sources.size > 1) return `· cibles mixtes (référence et jugements)${partial}`
  return (
    (list[0].source === 'reference'
      ? `· cible : ${references.mesurees} image(s) de référence`
      : `· cible : ${list[0].n} image(s) jugées convaincantes`) + partial
  )
}
