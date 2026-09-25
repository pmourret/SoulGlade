/* Test unitaire de `ui/src/screens/characters/characterFilter.ts` — la
   recherche du registre des personnages (design-pass screen-14 §S2).

   Meme patron que test_slugify.js : pas de framework, Node retire les types
   (`--experimental-strip-types`, pose par run_browser_tests.py).

   CE QU'IL PROTEGE. Une recherche qui rate un accent ne plante pas : elle
   repond « aucun personnage » a quelqu'un qui tape « lena » pour Léna, et
   l'ecran a l'air de dire que le personnage n'existe pas. */
import { filterCharacters } from '../web/ui/src/screens/characters/characterFilter.ts'

let ko = 0
const dire = (bon, quoi) => {
  console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`)
  if (!bon) ko++
}
const ROWS = [
  { id: 'lena', name: 'Léna', type: 'instagram-influenceur', world: { id: 'littoral', label: 'Littoral' } },
  { id: 'abyssiaelle', name: 'Abyssiaelle', type: 'fantasy', world: { id: 'abysses', label: 'Abysses' } },
  { id: 'sans-monde', name: 'Sans monde', type: 'fantasy', world: null },
]
const ids = q => filterCharacters(ROWS, q).map(r => r.id).join(',')

console.log('\n[1] une recherche vide rend tout, dans l ordre')
dire(ids('') === 'lena,abyssiaelle,sans-monde', `'' -> ${ids('')}`)
dire(ids('   ') === 'lena,abyssiaelle,sans-monde', 'des espaces seuls ne filtrent rien')

console.log('\n[2] les quatre champs sont lus')
dire(ids('léna') === 'lena', 'le nom')
dire(ids('abyssiaelle') === 'abyssiaelle', 'l identifiant')
dire(ids('fantasy') === 'abyssiaelle,sans-monde', 'le type')
dire(ids('littoral') === 'lena', 'le libelle du monde')

console.log('\n[3] casse et accents ne comptent pas')
dire(ids('LENA') === 'lena', '« LENA » trouve Léna')
dire(ids('lena') === 'lena', '« lena » trouve Léna')

console.log('\n[4] sans resultat, une liste vide ; un monde absent ne plante pas')
dire(ids('zzz') === '', 'rien ne correspond')
dire(ids('monde') === 'sans-monde', 'une ligne sans monde reste cherchable')

console.log('\n' + '='.repeat(70))
console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert')
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
