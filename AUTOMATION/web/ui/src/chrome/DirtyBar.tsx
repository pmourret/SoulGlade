/* Permanent banner while something is not written to disk yet.

   A toast does not do: it disappears, and the scene then becomes
   indistinguishable from a saved one — until production refuses to see it. The
   banner stays until the save, and it carries the save.

   TEXT LEFT, ACTIONS RIGHT (design-pass screen-0-chrome §S5, 23/09/2026). Two
   departures from that spec, both because the data is not there:

     - it asks for « N modifications non enregistrées ». `useScenes` exposes
       `dirty` as a BOOLEAN, not a count, and there is no honest N to print.
       The sentence stays unnumbered rather than gaining an invented figure —
       same rule the spec itself applies to « dernière réponse il y a N s ».
     - it asks for the `Ctrl S` shortcut to be DISPLAYED. No such handler
       existed anywhere in the frontend, so it is wired here rather than merely
       drawn: a printed shortcut that does nothing is worse than none.

   TWO SOURCES NOW (design-pass screen-8 §S2). `scenes.json` is read straight
   from `useScenes`, as it always was; anything else is DECLARED by the screen
   through `PendingSaveContext` — the tones workshop's expression range is the
   first. Both can show at once, which is the truth when two files are pending.

   CTRL S HAS ONE OWNER, and it is this file — not one handler per banner
   racing on `document`. When a screen declares pending work, the shortcut is
   ITS save: that is the work being looked at. Otherwise it saves the scenes.
   The `Ctrl S` chip is drawn on whichever banner actually owns it, so the
   printed shortcut never lies. */
import { useEffect, type ReactNode } from 'react'

import { useConfirm } from './ConfirmContext'
import { usePendingSave } from './PendingSaveContext'
import { useToast } from './ToastContext'
import { useScenes } from '../state/ScenesStoreContext'

/* La question posée avant de jeter le travail en cours. Exportée parce que le
   panneau JSON du composeur offre le MÊME geste (design-pass screen-7c §7.5) :
   deux boutons qui font la même chose doivent poser la même question, et une
   phrase recopiée dérive au premier ajustement. */
export const REVERT_CONFIRM = {
  title: 'Revenir à la dernière version enregistrée ?',
  button: 'Revenir en arrière',
  body: (
    <p>
      Toutes les modifications faites dans cette page depuis le dernier
      enregistrement seront perdues — l'atelier revient à ce que
      <code> scenes.json</code> contient déjà sur disque.
    </p>
  ),
}

export function DirtyBar() {
  const { dirty, save, load } = useScenes()
  const pending = usePendingSave()
  const confirm = useConfirm()
  const toast = useToast()

  const onSaveScenes = async () => {
    const result = await save()
    toast(result.ok ? 'scenes.json enregistré' : result.erreur || "échec de l'enregistrement")
  }

  /* Declared before the early return: a hook cannot sit behind a condition.
     The handler itself does nothing when nothing is pending. */
  useEffect(() => {
    if (!dirty && !pending) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 's' && event.key !== 'S') return
      if (!event.ctrlKey && !event.metaKey) return
      // Also suppresses the browser's own "save page".
      event.preventDefault()
      if (pending) void pending.onSave()
      else void onSaveScenes()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, pending, save, toast])

  if (!dirty && !pending) return null

  const onRevertScenes = async () => {
    if (!(await confirm(REVERT_CONFIRM))) return
    await load()
    toast('modifications ignorées — dernière version enregistrée reprise')
  }

  return (
    <>
      {pending && (
        <DirtyBanner
          id="pendingBar"
          revertId="btnPendingRevert"
          saveId="btnPendingSave"
          title={pending.title}
          body={pending.body}
          saveLabel={pending.saveLabel}
          hotkey
          onRevert={() => void pending.onRevert()}
          onSave={() => void pending.onSave()}
        />
      )}
      {dirty && (
        <DirtyBanner
          id="dirtyBar"
          revertId="btnDirtyRevert"
          saveId="btnDirtySave"
          title="Modifications non enregistrées"
          body={
            <>
              <code>scenes.json</code> — des scènes existent seulement dans cette
              page et la production ne les voit pas.
            </>
          }
          saveLabel="Enregistrer"
          /* Only when no screen has claimed it above — a chip saying « Ctrl S »
             on a banner the shortcut does not act on is worse than no chip. */
          hotkey={!pending}
          onRevert={() => void onRevertScenes()}
          onSave={() => void onSaveScenes()}
        />
      )}
    </>
  )
}

/** Presentation only — the same 38 px warning row whatever the file. */
function DirtyBanner({
  id, revertId, saveId, title, body, saveLabel, hotkey, onRevert, onSave,
}: {
  id: string
  revertId: string
  saveId: string
  title: string
  body: ReactNode
  saveLabel: string
  hotkey: boolean
  onRevert: () => void
  onSave: () => void
}) {
  return (
    <div id={id} className="dirty-bar" role="status">
      <b>{title}</b>
      <span>{body}</span>
      <div className="acts">
        <button className="link" id={revertId} onClick={onRevert}>
          Annuler
        </button>
        <button className="btn sm primary" id={saveId} onClick={onSave}>
          {saveLabel}
        </button>
        {hotkey && (
          <span className="kbd" aria-hidden="true">
            Ctrl S
          </span>
        )}
      </div>
    </div>
  )
}
