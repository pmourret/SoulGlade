/* What is left of « Améliorer » under the field: the comparison the
   composer's AI panel still shows fragment by fragment (design-pass
   screen-7c §6). The field control itself became a revision in the field
   (`useEnhance`, `EnhanceField`, design-pass screen-ameliorer); this file goes
   with the panel's own pass. */
import { diffWords } from '../lib/diff'
import { WordLine } from './WordDiff'

export { useFocusAfter } from './useEnhance'

/** One proposal against the text it answers for: a word diff in the same
    language, the two texts side by side after a translation, and the words
    not kept said in words. Shared with the composer's AI panel. */
export function ProposalView({
  before,
  after,
  translated,
  lost,
}: {
  before: string
  after: string
  translated: boolean
  lost: string[]
}) {
  return (
    <>
      {translated ? (
        <div className="grid gap-[10px] sm:grid-cols-2">
          <div>
            <span className="lab">Actuel</span>
            <p className="m-0 mt-[4px] text-[12.5px] text-dim">{before}</p>
          </div>
          <div>
            <span className="lab">Proposé (traduit)</span>
            <p className="m-0 mt-[4px] text-[12.5px]" data-enhance-text>
              {after}
            </p>
          </div>
        </div>
      ) : (
        <Compared before={before} after={after} />
      )}
      {lost.length > 0 && (
        <p className="tiny mt-[8px] mb-0" data-enhance-lost>
          {/* After a translation the words are those of the English text
              the user never saw: said so, or « sitting » reads as a word of
              « assise » that vanished (audit of 27/09). */}
          {translated ? 'Mots de la traduction non repris' : 'Mots non repris'} : {lost.join(', ')}
        </p>
      )}
    </>
  )
}

/** Actuel above Proposé, the words that moved on their own ground, each line
    signed − or + and named for a reader who sees neither colour. */
function Compared({ before, after }: { before: string; after: string }) {
  const words = diffWords(before, after)
  return (
    <div className="grid gap-[4px] text-[12.5px]">
      <p className="m-0 rounded-[4px] px-[6px] py-[3px]" style={{ backgroundColor: 'var(--diff-del-bg)' }}>
        <span aria-hidden="true">− </span>
        <span className="sr-only">Actuel : </span>
        <WordLine spans={words.before} side="del" />
      </p>
      <p
        className="m-0 rounded-[4px] px-[6px] py-[3px]"
        style={{ backgroundColor: 'var(--diff-add-bg)' }}
        data-enhance-text
      >
        <span aria-hidden="true">+ </span>
        <span className="sr-only">Proposé : </span>
        <WordLine spans={words.after} side="add" />
      </p>
    </div>
  )
}
