/* The five chapters of a world's book (design-pass 19 §S3, §S4) — shared by
   the table of contents, the book and the screen, owned by none of them
   (`.claude/rules/frontend.md`). Order is reading order: where, what for,
   what, how, then the adult branch delivered apart. */

export type Chapter = 'lieux' | 'intentions' | 'scenes' | 'tons' | 'adultes'

export const CHAPTERS: { id: Chapter; question: string; name: string; block: string }[] = [
  { id: 'lieux', question: 'Où ?', name: 'Lieux', block: 'lieuxBlock' },
  { id: 'intentions', question: 'Pour quoi ?', name: 'Intentions', block: 'intentionsBlock' },
  { id: 'scenes', question: 'Quoi ?', name: 'Scènes', block: 'scenesBlock' },
  { id: 'tons', question: 'Comment ?', name: 'Tons', block: 'tonsBlock' },
  { id: 'adultes', question: 'Adultes', name: 'branche à part', block: 'adultesBlock' },
]

export const blockOf = (chapter: Chapter) => CHAPTERS.find((c) => c.id === chapter)!.block
