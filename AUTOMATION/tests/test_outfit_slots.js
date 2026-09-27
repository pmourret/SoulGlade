/* Test unitaire : la table des emplacements d'une tenue
   (`screens/bank/outfits/outfitSlots.ts`, design-pass tenues).

   CE QU'IL TIENT :
     1. `proposeSlot` sur les exemples de la table, dont les cas ou deux mots
        se recouvrent (bra / sports bra, briefs / boxer briefs, dress dans
        t-shirt dress) et un fragment sans mot connu ;
     2. seize cles uniques, et chaque zone porte au moins un emplacement ;
     3. `sortPieces` : stable, ordre du prompt, pieces sans emplacement en fin
        dans leur ordre d'origine — donc une tenue d'avant les emplacements
        ressort telle quelle et son rendu ne bouge pas tant qu'elle n'est pas
        rangee.

   L'egalite avec `tenues.EMPLACEMENTS` vit dans test_tenues.py (cote Python).

   Lancer :  python AUTOMATION/tests/run_browser_tests.py --only test_outfit_slots */
import { proposeSlot, SLOTS, sortPieces, ZONES } from '../web/ui/src/screens/bank/outfits/outfitSlots.ts'

let ko = 0
const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++ }

console.log('\n[1] proposeSlot sur les exemples')
for (const [fragment, slot] of [
  ['white linen shirt', 'top'], ['light blue denim jeans', 'bottom'], ['camel wool coat', 'outer'],
  ['brown leather ankle boots', 'feet'], ['black lace bra', 'under_top'], ['sports bra', 'under_top'],
  ['boxer briefs', 'under_bottom'], ['one-piece swimsuit', 'onepiece'], ['green silk slip dress', 'onepiece'],
  ['t-shirt dress', 'onepiece'], ['thin gold necklace', 'neck'], ['small leather handbag', 'carried'],
  ['thin brown leather belt', 'waist'], ['strappy high heels', 'feet'], ['Red Lace BRIEFS with floral pattern', 'under_bottom'],
  ['small silver clutch', null], ['', null],
]) {
  const got = proposeSlot(fragment)
  dire((got?.slot ?? null) === slot, `« ${fragment} » -> ${got ? `${got.slot} (${got.word})` : 'aucun'}`)
}
dire(proposeSlot('boxer briefs').word === 'boxer briefs', 'le mot le plus long est nomme (« boxer briefs », pas « briefs »)')

console.log('\n[2] la table')
const cles = SLOTS.map((s) => s.key)
dire(cles.length === 16 && new Set(cles).size === 16, `16 cles uniques (${cles.length})`)
dire(ZONES.every((z) => SLOTS.some((s) => s.zone === z.key)), 'chaque zone porte au moins un emplacement')

console.log('\n[3] sortPieces')
const p = (id, slot) => ({ id, ...(slot ? { slot } : {}) })
const trie = sortPieces([p('sac', 'carried'), p('soutien', 'under_top'), p('chemise', 'top'),
  p('libre1'), p('bague1', 'hands'), p('libre2'), p('bague2', 'hands'), p('jean', 'bottom')])
dire(trie.map((x) => x.id).join(',') === 'chemise,jean,soutien,bague1,bague2,sac,libre1,libre2',
  `ordre du prompt, pose gardee, sans emplacement en fin (${trie.map((x) => x.id).join(',')})`)
const avant = [p('c'), p('a'), p('b')]
dire(sortPieces(avant).map((x) => x.id).join() === 'c,a,b', 'une tenue sans emplacement ressort dans son ordre')
dire(sortPieces(avant) !== avant && avant.map((x) => x.id).join() === 'c,a,b', 'le tableau recu n est pas modifie')

console.log(`\n${'='.repeat(70)}`)
console.log(ko === 0 ? 'tout est vert' : `${ko} ECHEC(S)`)
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
