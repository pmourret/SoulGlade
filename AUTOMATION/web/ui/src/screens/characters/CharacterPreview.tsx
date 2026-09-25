/* The 360 px preview beside the registry (design-pass screen-14 §S3).
   Presentation only.

   It shows what `/api/characters` carries and nothing more: type, world and
   the adult flag. Style and pack are not in that answer, so their lines are
   absent rather than guessed.

   UNKNOWN PACK. A click on such a row enters the studio like any other, and
   every character-scoped route then answers 400 — that behaviour is kept
   (screen-14 plan). The preview only ANNOUNCES it, in place of the button. */
import { CharacterPortrait } from './CharacterPortrait'
import type { CharacterRow } from '../../character/CharacterContext'

const LABEL = 'text-[12px] text-dim'
const VALUE = 'text-[13px] text-txt text-right'

export function CharacterPreview({ row, onOpen }: { row: CharacterRow; onOpen: () => void }) {
  return (
    <aside className="flex w-[360px] flex-none flex-col gap-[16px] overflow-y-auto border-l border-line bg-panel p-[24px] max-[1100px]:hidden">
      <CharacterPortrait
        key={row.id}
        id={row.id}
        name={row.name}
        knownPack={row.known_universe !== false}
        className="aspect-[4/5] w-full rounded-card"
        initialClass="text-[64px]"
      />
      <div>
        {/* Only the name is live: a screen reader hears who, not the whole sheet. */}
        <h2 className="m-0 text-[20px] font-[650] text-txt" aria-live="polite">{row.name || row.id}</h2>
        <code className="font-code text-[12px] leading-[normal] text-dim2">{row.id}</code>
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-[16px] gap-y-[8px]">
        <dt className={LABEL}>Type</dt>
        <dd className={`m-0 ${VALUE}`}>{row.type || '—'}</dd>
        <dt className={LABEL}>Monde</dt>
        <dd className={`m-0 ${VALUE}`}>{row.world?.label || '—'}</dd>
        <dt className={LABEL}>Adulte</dt>
        <dd className={`m-0 text-right text-[13px] ${row.nsfw ? 'text-warn-txt' : 'text-dim2'}`}>
          {row.nsfw ? 'activé' : 'désactivé'}
        </dd>
      </dl>
      <p className="m-0 text-[12px] text-dim2">Type, style et monde sont figés à la création.</p>
      <div className="mt-auto">
        {row.known_universe === false ? (
          <p className="m-0 flex gap-[8px] rounded-card border border-danger-line bg-danger-bg px-[12px] py-[10px] text-[13px] text-danger-txt">
            <i className="mt-[5px] h-[8px] w-[8px] flex-none rotate-45 bg-bad" aria-hidden="true" />
            Pack inconnu : ce personnage ne peut pas s'ouvrir tant que son pack n'est pas résolu.
          </p>
        ) : (
          <button type="button" className="btn primary flex w-full items-center justify-center gap-[8px]" onClick={onOpen}>
            Ouvrir le studio
            <kbd className="rounded-[4px] border border-on-pri/30 bg-transparent px-[5px] text-[11px]" aria-hidden="true">Entrée</kbd>
          </button>
        )}
      </div>
    </aside>
  )
}
