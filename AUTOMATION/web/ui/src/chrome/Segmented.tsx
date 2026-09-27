/* A small segmented choice — one of a few values, all in view (the character
   sheet's gender, the outfit workshop's silhouette). Presentation only.

   Toggle buttons with `aria-pressed` inside a named group: each value is a
   plain button a keyboard reaches with Tab, and the picked one reads by its
   flat ground AND its weight, not by a tint alone. */
export function Segmented<T extends string>({
  label, options, value, disabled, onPick, id,
}: {
  /** The group's accessible name. */
  label: string
  options: { value: T; label: string }[]
  value: T | null
  disabled?: boolean
  onPick: (value: T) => void
  id?: string
}) {
  return (
    <div role="group" aria-label={label} id={id}
         className="inline-flex flex-none gap-[2px] rounded-[6px] border border-line2 p-[2px]">
      {options.map((option) => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            data-value={option.value}
            disabled={disabled}
            className={`h-[24px] rounded-[4px] border-0 px-[9px] text-[12px] ${
              on ? 'bg-txt font-semibold text-bg' : 'bg-transparent text-dim hover:text-txt'}`}
            onClick={() => onPick(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
