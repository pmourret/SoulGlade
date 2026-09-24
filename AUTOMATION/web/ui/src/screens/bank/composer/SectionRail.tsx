/* The seven sections of the open scene, down the left edge of the composer.

   IT WAS SEVEN ICONS IN A ROW. A horizontal strip of unlabelled glyphs made
   « Vêtements » and « Prompt global » look like the same kind of move, and the
   only way to know which was which was to hover one at a time. The rail
   (design pass screen-7b §S4.2) gives each section its WORD back, and the room
   to say which one holds an edit that is not saved yet.

   STILL RADIX'S TABLIST, just vertical (`orientation` comes from `Tabs.Root`
   in SceneComposer): the roving tabindex, ↑/↓/Home/End and the
   aria-selected/aria-controls wiring stay the library's job — see the long
   note in SceneComposer.tsx for the three hand-rolled bugs that decided it.
   `data-tab` and not `id`, for the same reason it always was.

   UNDER 1100 px the label is clipped, never `display:none` (frontend.md): it
   remains the control's accessible name, and `data-hint-text` puts it back
   under the pointer and the focus ring. */
import * as Tabs from '@radix-ui/react-tabs'

import { Icon } from '../../../chrome/Icon'
import type { SceneField } from '../sceneChanges'
import { SECTIONS, type SectionKey } from './sections'

export function SectionRail({
  active,
  changed,
  narrow,
}: {
  active: SectionKey
  /** Draft fields holding an unsaved edit — a section carrying one gets a dot. */
  changed: Set<SceneField>
  narrow: boolean
}) {
  return (
    <Tabs.List
      aria-label="Sections de la scène"
      className={`flex flex-none flex-col gap-[2px] border-r border-r-line bg-panel py-[10px]
                  ${narrow ? 'w-[56px] px-[8px]' : 'w-[176px] px-[10px]'}`}
    >
      {SECTIONS.map((section) => {
        const on = section.key === active
        const dirty = section.fields.some((field) => changed.has(field))
        return (
          <Tabs.Trigger
            key={section.key}
            value={section.key}
            data-tab={section.key}
            data-hint-text={narrow ? section.label : undefined}
            className={`relative flex cursor-pointer items-center gap-[9px] rounded-[7px] border-0
                        py-[8px] text-left text-[13px] focus-visible:outline-2
                        focus-visible:outline-focus focus-visible:-outline-offset-2 ${
                          narrow ? 'justify-center px-[6px]' : 'px-[10px]'
                        } ${on ? 'bg-panel3 font-semibold text-txt' : 'bg-transparent text-dim hover:text-txt'}`}
          >
            {/* The accent no longer paints a ground (charte graphite, écran 0):
                it marks the current section with a bar, and the ground stays
                `--panel3`. */}
            {on && (
              <span
                aria-hidden="true"
                className="absolute top-[6px] bottom-[6px] left-0 w-[2px] rounded-[2px] bg-acc"
              />
            )}
            <Icon name={section.icon} className="h-[16px] w-[16px] shrink-0" />
            {/* Clipped, not removed: it is still what a screen reader reads. */}
            <span className={narrow ? 'sr-only' : 'truncate'}>{section.label}</span>
            {dirty && (
              <>
                <span
                  aria-hidden="true"
                  className={`h-[6px] w-[6px] shrink-0 rounded-[50%] bg-warn ${
                    narrow ? 'absolute top-[6px] right-[6px]' : 'ml-auto'
                  }`}
                />
                <span className="sr-only">modifiée</span>
              </>
            )}
          </Tabs.Trigger>
        )
      })}
    </Tabs.List>
  )
}
