/* Compare mode (design-pass screen-5, §B) — up to 4 selected images side by
   side, each with its real score/judgement, and a "Garder cette version"
   that resolves the comparison: this one validated, the rest of the
   COMPARED set (not the whole original selection — see `overflowCount`)
   rejected.

   Reuses `FlagButtons` as-is. The three realism sub-scores are NOT repeated
   under each candidate since the design-pass screen-5b: four columns of three
   bars was twelve bars to compare two photographs with, and the comparison is
   made on the images. The identity score stays, next to the judgement. The confirmation ritual lives
   HERE rather than in `ReviewScreen.tsx`: it is this component that knows
   exactly which images are being compared and can name the real
   consequence, the same reasoning `DeclineDialog.tsx`/`PhotoEditor.tsx`
   already follow for their own confirmations. The actual mutation
   (`actMany`) stays in `ReviewScreen.tsx`, reached only through `onKeep`. */
import { useConfirm } from '../../chrome/ConfirmContext'
import { FlagButtons } from './FlagButtons'
import type { GalleryItem } from './useTriage'

export function SurveyMode({
  compared,
  overflowCount,
  onFlag,
  onKeep,
}: {
  compared: { item: GalleryItem; src: string }[]
  overflowCount: number
  onFlag: (item: GalleryItem, flag: string) => void
  onKeep: (kept: GalleryItem, compared: GalleryItem[]) => void
}) {
  const confirm = useConfirm()

  if (compared.length < 2) {
    return (
      <p className="tiny" role="status">
        Sélectionne au moins deux images pour comparer.
      </p>
    )
  }

  const keep = async (kept: GalleryItem) => {
    const others = compared.map((c) => c.item).filter((i) => i.name !== kept.name)
    const ok = await confirm({
      title: 'Garder cette version ?',
      button: 'Garder cette version',
      body: (
        <>
          <p>
            <b>{kept.scene || kept.name}</b> sera validée.
          </p>
          <p className="tiny">
            {others.length === 1
              ? "L'autre image comparée sera rejetée."
              : `Les ${others.length} autres images comparées seront rejetées.`}
          </p>
        </>
      ),
    })
    if (!ok) return
    onKeep(kept, compared.map((c) => c.item))
  }

  return (
    <div>
      {overflowCount > 0 && (
        <p className="tiny mb-[14px]">
          {compared.length} affichées sur {compared.length + overflowCount} sélectionnées — les {compared.length}
          {' '}premières.
        </p>
      )}
      <div
        className="grid gap-[16px]"
        style={{ gridTemplateColumns: `repeat(${compared.length}, minmax(0, 1fr))` }}
      >
        {compared.map(({ item, src }) => (
          <div
            key={item.name}
            className="flex flex-col gap-[10px] rounded-card border border-line bg-panel p-[12px]"
          >
            <img
              className="block aspect-[4/5] w-full rounded-[6px] object-cover"
              src={src}
              alt=""
            />
            {/* The IDENTITY score, and only it. Four columns of three realism
                bars was twelve bars to compare two photographs with; the thing
                being compared is the image, and the one figure that decides
                whether a candidate is even eligible is this one. */}
            <div className="flex items-baseline gap-[8px] text-[12.5px]">
              <span className="flex-1 truncate text-dim">{item.scene || item.name}</span>
              <b className="flex-none tabular-nums text-txt">
                {item.score ? Number.parseFloat(item.score).toFixed(3) : '—'}
              </b>
            </div>
            <FlagButtons item={item} onFlag={(flag) => onFlag(item, flag)} />
            <button className="btn primary w-full" data-keep onClick={() => void keep(item)}>
              Garder cette version
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
