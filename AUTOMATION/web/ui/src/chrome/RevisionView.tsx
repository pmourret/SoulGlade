/* The field under revision (design-pass screen-ameliorer §S2): the caller's
   own input or textarea, and in its place, while a proposal is open, the
   proposed text read-only, additions on their ground, removals struck through
   at their place on demand (one sequence, `diffWords(...).run`).

   THE FIELD KEEPS ITS SIZE AND ITS PLACE. The box is measured on the field it
   replaces — height, font, padding — so no caller has to repeat its classes,
   and the field stays mounted (hidden): its value is still there, and it comes
   back where it was. A proposal longer than the field makes the box grow,
   never shrink.

   Above the field: the error, « rien à changer », and after a translation the
   original one click away. Under it: the words not kept, as a warning, and the
   one sentence that says why the field no longer takes the keyboard. */
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'

import { diffWords } from '../lib/diff'
import type { Enhance } from './useEnhance'
import { WordRun } from './WordDiff'

export function RevisionView({
  enhance,
  className,
  children,
}: {
  enhance: Enhance
  /** On the wrapper, for a caller that lays it in a row (`min-w-0 flex-1`). */
  className?: string
  /** The field itself: one input or textarea. */
  children: ReactNode
}) {
  const { revision } = enhance
  const fieldRef = useRef<HTMLDivElement>(null)
  /* The field's size and font, taken on every render while it is shown, so
     the box is there in the SAME render as the revision: a second render of
     this component alone would come after the owner's effects, and the focus
     it asked for would find no box to land on (measured: it went to <body>). */
  const metrics = useRef<CSSProperties>({})

  useLayoutEffect(() => {
    if (revision) return
    const field = fieldRef.current?.firstElementChild
    if (!(field instanceof HTMLElement)) return
    const style = getComputedStyle(field)
    metrics.current = {
      minHeight: field.offsetHeight,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      padding: style.padding,
    }
  })

  return (
    <div className={`flex flex-col gap-[4px] ${className ?? ''}`}>
      {enhance.error && (
        <p className="m-0 text-[12px] text-danger-txt" role="alert">
          {enhance.error}
        </p>
      )}
      {enhance.same && (
        <p className="tiny m-0" data-enhance-same>
          {enhance.translateOnly
            ? 'Rien à traduire : l’instruction est déjà en anglais.'
            : 'Rien à changer : l’IA ne propose aucune modification.'}
        </p>
      )}
      {revision?.translated && (
        <p className="m-0 text-[12px] text-dim2">
          Traduit en anglais ·{' '}
          <button
            type="button"
            className="link"
            aria-expanded={enhance.showOriginal}
            onClick={enhance.toggleOriginal}
          >
            {enhance.showOriginal ? 'Masquer l’original' : 'Voir l’original'}
          </button>
        </p>
      )}
      {revision?.translated && enhance.showOriginal && (
        <p className="m-0 text-[12px] text-dim" data-enhance-original>
          {revision.before}
        </p>
      )}

      <div ref={fieldRef} className="min-w-0" hidden={Boolean(revision)}>
        {children}
      </div>
      {revision && (
        <div
          ref={enhance.boxRef}
          tabIndex={-1}
          role="textbox"
          aria-multiline="true"
          aria-readonly="true"
          aria-label={`Proposition de l’IA pour ${enhance.label}`}
          aria-describedby={enhance.helpId}
          className="w-full overflow-auto rounded-[7px] border-2 border-txt bg-panel2 break-words whitespace-pre-wrap
                     text-txt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          style={metrics.current}
          data-enhance-proposal
          onKeyDown={enhance.onKeyDown}
        >
          <span data-enhance-text>
            {revision.translated ? (
              revision.text
            ) : (
              <WordRun spans={diffWords(revision.before, revision.text).run} showRemoved={enhance.showRemoved} />
            )}
          </span>
        </div>
      )}

      {revision && revision.lost.length > 0 && (
        <p className="m-0 text-[12px] text-warn-txt" data-enhance-lost>
          {/* After a translation the words are those of the English text the
              user never saw: said so, or « sitting » reads as a word of
              « assise » that vanished (audit of 27/09). */}
          {revision.translated ? 'Mots de la traduction non repris' : 'Mots non repris'} : {revision.lost.join(', ')}
        </p>
      )}
      {revision && (
        <p className="tiny m-0" id={enhance.helpId}>
          {revision.translated
            ? 'Lecture seule tant que la traduction est ouverte. Entrée applique, Échap rejette.'
            : 'Lecture seule tant que la proposition est ouverte. Surligné : ajouté par l’IA. Entrée applique, Échap rejette.'}
        </p>
      )}
    </div>
  )
}
