/* Test unitaire de `ui/src/screens/application/verdictLabels.ts` — le verdict
   du journal de production en mots et en forme (design-pass screen-12 §S7).

   Pas de framework : meme raison que test_slugify.js, Node retire les types
   TypeScript nativement (`--experimental-strip-types`, pose par
   run_browser_tests.py), donc ce fichier importe le module SOURCE tel quel.

   CE QUE CE TEST PROTEGE. Le code brut du CSV (`A_REVOIR`) n'est plus
   affiche : une correspondance fausse montrerait « OK » sur un rejet sans que
   rien ne plante. Et un verdict inconnu doit rester VISIBLE tel quel, jamais
   blanchi. */
import { VERDICT_FILTERS, verdictCounts, verdictLabel } from '../web/ui/src/screens/application/verdictLabels.ts'

let ko = 0
const dire = (bon, quoi) => {
  console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`)
  if (!bon) ko++
}
const attend = (code, texte, forme) => {
  const v = verdictLabel(code)
  dire(v.text === texte && v.tone === forme,
       `« ${code} » -> « ${v.text} » / ${v.tone} (attendu « ${texte} » / ${forme})`)
}

console.log('\n[1] les trois verdicts connus, en mots et en forme')
attend('OK', 'OK', 'ok')
attend('A_REVOIR', 'À revoir', 'warn')
attend('REJET', 'Rejet', 'bad')

console.log('\n[2] un verdict inconnu reste lisible tel quel')
attend('EN_ATTENTE', 'EN_ATTENTE', 'none')

console.log('\n[3] une ligne sans verdict reste vide')
attend(undefined, '', 'none')
attend('', '', 'none')

console.log('\n[4] les compteurs du filtre')
const c = verdictCounts([{ verdict: 'OK' }, { verdict: 'OK' }, { verdict: 'REJET' }, {}])
dire(c[''] === 4, `Tout = ${c['']} (attendu 4, lignes sans verdict comprises)`)
dire(c.OK === 2 && c.REJET === 1 && (c.A_REVOIR ?? 0) === 0, 'OK 2, Rejet 1, À revoir 0')
dire(VERDICT_FILTERS.map((f) => f.value).join(',') === ',OK,A_REVOIR,REJET',
     'le filtre garde son ordre : Tout, OK, À revoir, Rejet')

console.log('\n' + '='.repeat(70))
console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert')
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
