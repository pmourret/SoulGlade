/* One chapter of a world's book (design-pass 19 §S4): its question as a real
   `h2`, one line that says what it holds, then its cards and the card that
   adds one. Empty, it is a dashed row with the same sentence and a button —
   a world just created reads as four such rows, in order (§S4, D2).

   Presentation only: props and callbacks, no API call. Arrows move between the
   cards of ONE chapter (`listKeys.ts`, `data-arrow-group`). */
import { moveFocusInList, tabIndexInList } from './listKeys'

export function BookChapter({
  block,
  question,
  line,
  error,
  dimmed,
  children,
}: {
  /** The section's id: `lieuxBlock`, `intentionsBlock`… (smoke-test hooks). */
  block: string
  question: string
  line: string
  error?: string | null
  /** « Quoi ? » while a place or an intention is missing (§S4, D2). */
  dimmed?: boolean
  children: React.ReactNode
}) {
  const titleId = `${block}Title`
  return (
    <section id={block} aria-labelledby={titleId} className={dimmed ? 'opacity-55' : undefined}>
      <div className="mb-[10px] flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
        <h2 id={titleId} className="m-0 text-[17px] font-[650]">
          {question}
        </h2>
        <span className="text-[12.5px] text-dim2">{line}</span>
      </div>
      {error && (
        <p className="m-0 mb-[8px] text-[12px] text-danger-txt" role="alert">
          {error}
        </p>
      )}
      {children}
    </section>
  )
}

/** The grid of a chapter: `auto-fill minmax(180px,1fr)`, one arrow group. */
export function CardGrid({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      data-arrow-group
      className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-[10px]"
    >
      {children}
    </div>
  )
}

export function BookCard({
  rowAttr,
  rowId,
  on,
  dirty,
  first,
  hasSelection,
  onOpen,
  children,
}: {
  /** Which smoke-test hook the card carries. */
  rowAttr: 'data-entry-row' | 'data-tone-row'
  rowId: string
  on: boolean
  /** « modifié » or « modifiée » while the open entry is not saved, else null. */
  dirty: string | null
  first: boolean
  hasSelection: boolean
  onOpen: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      {...{ [rowAttr]: rowId }}
      data-arrow-item
      aria-pressed={on}
      tabIndex={tabIndexInList(on, first, hasSelection)}
      onClick={onOpen}
      onKeyDown={moveFocusInList}
      className={`flex min-w-0 cursor-pointer flex-col items-start gap-[3px] rounded-card bg-panel px-[12px] py-[10px]
                  text-left hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-focus
                  ${on ? 'border-2 border-acc px-[11px] py-[9px]' : 'border border-line'}`}
    >
      {children}
      {/* WRITTEN, not a dot (§S4): the banner and the card say the same word. */}
      {on && dirty && <span className="text-[11.5px] text-warn-txt">{dirty}</span>}
    </button>
  )
}

/** The dashed « + » card that ends a chapter. */
export function AddCard({ id, label, onAdd }: { id?: string; label: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      id={id}
      data-arrow-item
      tabIndex={-1}
      onClick={onAdd}
      onKeyDown={moveFocusInList}
      className="flex min-h-[64px] cursor-pointer items-center justify-center rounded-card border border-dashed
                 border-line2 bg-transparent px-[12px] py-[10px] text-[13px] text-dim hover:border-dim2 hover:text-txt
                 focus-visible:outline-2 focus-visible:outline-focus"
    >
      {label}
    </button>
  )
}

/** An empty chapter: a dashed row with its sentence and one button (§S4, D2). */
export function EmptyRow({
  id,
  children,
  action,
  primary,
  actionId,
  onAction,
}: {
  id?: string
  children: React.ReactNode
  action?: string
  primary?: boolean
  actionId?: string
  onAction?: () => void
}) {
  return (
    <div
      id={id}
      className="flex flex-wrap items-center gap-[12px] rounded-card border border-dashed border-line2 px-[14px] py-[12px]"
    >
      <div className="min-w-0 flex-1 text-[13px] text-dim">{children}</div>
      {action && onAction && (
        <button type="button" id={actionId} className={`btn sm flex-none ${primary ? 'primary' : ''}`} onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}
