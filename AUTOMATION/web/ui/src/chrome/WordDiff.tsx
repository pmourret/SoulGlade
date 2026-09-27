/* Le rendu d'une ligne comparée, mot à mot (design-pass screen-7c §7 pour le
   panneau JSON, §6 pour la comparaison Actuel / Proposé de l'amélioration IA
   le jour où sa route existe).

   LA COULEUR N'EST JAMAIS SEULE : la ligne porte son signe − ou +, et un
   texte visuellement masqué dit « supprimé » ou « ajouté » à qui n'en voit
   aucun des deux. Le fond du mot ne fait que trouver l'endroit.

   Le calcul vit dans `lib/diff.ts`, pur et testé à part : ce fichier ne fait
   que peindre ce qu'il rend. */
import type { Span } from '../lib/diff'

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

/** The whole rewrite as ONE paragraph, tracked-changes style (design-pass
    screen-ameliorer §S2): the additions on their ground, the removals struck
    through at their place only when asked for. Each moved run is named for a
    reader who sees neither the colour nor the strike. */
export function WordRun({ spans, showRemoved }: { spans: Span[]; showRemoved: boolean }) {
  return (
    <>
      {spans.map((span, index) =>
        span.kind === 'same' ? (
          <span key={index}>{span.text}</span>
        ) : span.kind === 'add' ? (
          <span key={index} className="rounded-[2px]" style={{ backgroundColor: 'var(--diff-add-word)' }}>
            <span className="sr-only">ajouté : </span>
            {span.text}
          </span>
        ) : showRemoved ? (
          <del key={index} className="rounded-[2px] text-inherit" style={{ backgroundColor: 'var(--diff-del-word)' }}>
            <span className="sr-only">retiré : </span>
            {span.text}
          </del>
        ) : null,
      )}
    </>
  )
}
