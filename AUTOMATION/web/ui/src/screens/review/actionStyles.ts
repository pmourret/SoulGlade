/* Style chain of the action row, shared by the tile and the full frame.

   It lives in its own file because two components need it and neither owns
   it: a constant exported from `Tile.tsx` would make the full frame depend
   on the tile for a reason that has nothing to do with tiles.

   The action row under a thumbnail, and the two realism judgements which also
   appear in the full frame. No ground, border colour or text colour in the base
   chain: two utilities that set the same property are decided by their order in
   the GENERATED sheet, not by their order in the class string, so a state
   appended after them would never win. Each state names its own. */
export const TACT =
  'flex-1 cursor-pointer rounded-[6px] border px-0 py-[5px] text-[14px] leading-none' +
  ' focus-visible:outline-offset-[-2px]'
export const TACT_IDLE =
  'border-transparent bg-transparent text-dim hover:border-line2 hover:bg-panel2 hover:text-txt'
/* Green for convincing, red for « you can tell it is generated » — they used to
   render in the same accent, and only the glyph told them apart. */
export const TACT_FLAG: Record<string, string> = {
  ok: 'border-ok bg-ok text-bg',
  ia: 'border-bad bg-bad text-bg',
}
/* P4.5.1 corpus labels, shared by both axes. Same three-state chain as
   TACT_FLAG, one ground per value: `na` stays neutral on purpose — « non
   jugeable » is an answer, not a verdict, and colouring it like the other two
   would read as one. */
export const TACT_LABEL: Record<string, string> = {
  ok: 'border-ok bg-ok text-bg',
  ko: 'border-bad bg-bad text-bg',
  na: 'border-line2 bg-panel2 text-txt',
}
