/* Permanent banner while scenes.json has pending changes.

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
       drawn: a printed shortcut that does nothing is worse than none. It is
       bound while the banner is mounted, which is exactly while there is
       something to save, and it overrides the browser's own "save page". */
import { useEffect } from 'react'

import { useConfirm } from './ConfirmContext'
import { useToast } from './ToastContext'
import { useScenes } from '../state/ScenesStoreContext'

export function DirtyBar() {
  const { dirty, save, load } = useScenes()
  const confirm = useConfirm()
  const toast = useToast()

  const onSave = async () => {
    const result = await save()
    toast(result.ok ? 'scenes.json enregistré' : result.erreur || "échec de l'enregistrement")
  }

  /* Declared before the early return: a hook cannot sit behind a condition.
     The handler itself does nothing when nothing is pending. */
  useEffect(() => {
    if (!dirty) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 's' && event.key !== 'S') return
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      void onSave()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, save, toast])

  if (!dirty) return null

  const onRevert = async () => {
    const ok = await confirm({
      title: 'Revenir à la dernière version enregistrée ?',
      button: 'Revenir en arrière',
      body: (
        <p>
          Toutes les modifications faites dans cette page depuis le dernier
          enregistrement seront perdues — l'atelier revient à ce que
          <code> scenes.json</code> contient déjà sur disque.
        </p>
      ),
    })
    if (!ok) return
    await load()
    toast('modifications ignorées — dernière version enregistrée reprise')
  }

  return (
    <div id="dirtyBar" role="status">
      <b>Modifications non enregistrées</b>
      <span>
        <code>scenes.json</code> — des scènes existent seulement dans cette page
        et la production ne les voit pas.
      </span>
      <div className="acts">
        <button className="link" id="btnDirtyRevert" onClick={() => void onRevert()}>
          Annuler
        </button>
        <button className="btn sm primary" id="btnDirtySave" onClick={() => void onSave()}>
          Enregistrer
        </button>
        <span className="kbd" aria-hidden="true">
          Ctrl S
        </span>
      </div>
    </div>
  )
}
