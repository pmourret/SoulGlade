/* The two realism judgements. They MEASURE, they do not sort — which is why
   they appear in both trades, and why they sit in the inspector next to the
   realism scores rather than among the sorting gestures.

   WORDS, NOT GLYPHS (design-pass screen-5b, §S4.2). They were « ◉ » and
   « ◌ », told apart by a colour and a `title` that only a mouse could reach.
   A screen reader read them as « heavy circle » and « dotted circle »; the
   `aria-label` corrected that, but the sighted reader still had to learn two
   rings. The label is the answer now, and the key is next to it. */
import type { GalleryItem } from './useTriage'

const BTN =
  'flex flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border' +
  ' px-[8px] py-[6px] text-[12.5px] whitespace-nowrap' +
  ' focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-[-2px]'
/* No ground, border colour or text colour in the base chain: two utilities
   setting the same property are decided by their order in the GENERATED
   sheet, so a state appended after them would never win. Each names its own. */
const BTN_ON = 'border-txt bg-panel3 font-semibold text-txt'
const BTN_OFF = 'border-line2 bg-transparent text-dim hover:border-dim2 hover:text-txt'

export function FlagButtons({
  item,
  onFlag,
}: {
  item: GalleryItem
  onFlag: (flag: string) => void
}) {
  /* THE ACCESSIBLE NAME CONTAINS THE VISIBLE ONE (WCAG 2.5.3, Label in Name).
     It did not, and that is a regression this refonte introduced: while these
     were glyphs (« ◉ » / « ◌ ») a free `aria-label` was the right answer,
     because there was no visible label to match. Now the button reads « Fait
     IA » and someone saying « fait IA » to a voice control must reach it — so
     the label OPENS with the visible words and only then explains. */
  const button = (value: string, label: string, key: string, hint: string) => (
    <button
      type="button"
      data-f={value}
      aria-label={`${label} — ${hint}`}
      aria-pressed={item.flag === value}
      aria-keyshortcuts={key}
      className={`${BTN} ${item.flag === value ? BTN_ON : BTN_OFF}`}
      onClick={(event) => {
        event.stopPropagation()
        onFlag(value)
      }}
    >
      {label}
      <span className="kbd" aria-hidden="true">
        {key}
      </span>
    </button>
  )
  return (
    <div className="flex gap-[6px]" data-tacts>
      {button('ok', 'Convaincante', 'C', 'elle passe pour une photo')}
      {button('ia', 'Fait IA', 'I', "ça se voit que c'est généré")}
    </div>
  )
}
