/* One frozen choice of the wizard: a type, a style or a world — always one pick
   among a mutually exclusive set, shown as a list card (design-pass screen-14
   §S7).

   `role="radio"` + `aria-checked`: what a screen reader must say is
   « selected », not « pressed ». The check glyph is `aria-hidden`.

   `tabIndex` is a prop: the group owns roving tabindex (`useRovingChoice`) —
   one Tab stop per group, arrows move the selection.

   The border is 2 px in BOTH states, only its colour changes: a width that
   grew on selection would shift the text by a pixel. */
import { Icon } from '../../chrome/Icon'

export function OptionCard({
  active,
  title,
  sub,
  tabIndex,
  onClick,
  onKeyDown,
  elementRef,
}: {
  active: boolean
  title: string
  sub?: string
  tabIndex: 0 | -1
  onClick: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  elementRef: (el: HTMLButtonElement | null) => void
}) {
  return (
    <button
      ref={elementRef}
      className={`relative flex w-full cursor-pointer flex-col items-start gap-[2px] rounded-card border-2 bg-panel
                  px-[14px] py-[11px] pr-[36px] text-left
                  ${active ? 'border-txt' : 'border-line hover:border-line2'}`}
      type="button"
      role="radio"
      aria-checked={active}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <b className="text-[14px] font-semibold text-txt">{title}</b>
      {sub && <span className="text-[12.5px] text-dim2">{sub}</span>}
      {active && (
        <Icon name="check" className="absolute top-1/2 right-[12px] h-[16px] w-[16px] -translate-y-1/2 text-txt" />
      )}
    </button>
  )
}
