/* Le rendu d'une ligne comparée, mot à mot (design-pass screen-7c §7 pour le
   panneau JSON, §6 pour la comparaison Actuel / Proposé de l'amélioration IA
   le jour où sa route existe).

   LA COULEUR N'EST JAMAIS SEULE : la ligne porte son signe − ou +, et un
   texte visuellement masqué dit « supprimé » ou « ajouté » à qui n'en voit
   aucun des deux. Le fond du mot ne fait que trouver l'endroit.

   Le calcul vit dans `lib/diff.ts`, pur et testé à part : ce fichier ne fait
   que peindre ce qu'il rend. */
import type { Span } from '../../../lib/diff'
import { diffWords } from '../../../lib/diff'

/** One side of a rewritten line: the untouched runs plain, the ones that
    moved on their own ground. */
export function WordLine({ spans, side }: { spans: Span[]; side: 'del' | 'add' }) {
  return (
    <>
      {spans.map((span, index) =>
        span.kind === 'same' ? (
          <span key={index}>{span.text}</span>
        ) : (
          <span
            key={index}
            className="rounded-[2px]"
            style={{
              backgroundColor: side === 'del' ? 'var(--diff-del-word)' : 'var(--diff-add-word)',
            }}
          >
            {span.text}
          </span>
        ),
      )}
    </>
  )
}

/** Both sides of a rewritten line at once, for a caller that has the two
    strings and no reason to call `diffWords` itself. */
export function wordSides(before: string, after: string) {
  return diffWords(before, after)
}
