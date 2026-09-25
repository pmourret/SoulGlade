/* Test unitaire de `ui/src/screens/wizard/missingFor.ts` — le verrouillage
   du wizard « nouveau personnage », dit en mots (design-pass screen-14 §S9).

   CE QU'IL PROTEGE. La barre du bas dit ce qui manque, et « Suivant » ne
   s'arme que sur la meme reponse. Une etape dont la condition glisse laisse
   creer un personnage a moitie choisi, ou bloque sans dire pourquoi. */
import { STEPS, missingFor, missingUpTo } from '../web/ui/src/screens/wizard/missingFor.ts'

let ko = 0
const dire = (bon, quoi) => {
  console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`)
  if (!bon) ko++
}
const RIEN = { name: '', cidValid: false, type: null, style: null, world: null, frozenBase: null }
const TOUT = { name: 'Léna', cidValid: true, type: 't', style: 's', world: 'w', frozenBase: 'LENA_BASE.png' }

console.log('\n[1] cinq etapes, Identite en premier')
dire(STEPS.join(',') === 'identity,type,style,world,base', STEPS.join(','))

console.log('\n[2] Identite : un nom, puis un identifiant valide')
dire(missingFor('identity', RIEN) === 'un nom affiché', 'sans nom : le nom')
dire(missingFor('identity', { ...RIEN, name: '  ' }) === 'un nom affiché', 'des espaces ne sont pas un nom')
dire(missingFor('identity', { ...RIEN, name: 'Léna' }) === 'un identifiant valide', 'avec nom : l identifiant')
dire(missingFor('identity', { ...RIEN, name: 'Léna', cidValid: true }) === null, 'les deux : rien ne manque')

console.log('\n[3] chaque etape de choix a sa seule condition')
dire(missingFor('type', RIEN) === 'choisir un type', 'type')
dire(missingFor('style', RIEN) === 'choisir un style', 'style')
dire(missingFor('world', RIEN) === 'choisir un monde', 'monde')
dire(missingFor('base', RIEN).startsWith("une base d'identité"), 'base')
dire(STEPS.every(s => missingFor(s, TOUT) === null), 'tout choisi : aucune etape ne bloque')

console.log('\n[4] la derniere etape exige toute la liste')
dire(missingUpTo('base', TOUT) === null, 'tout est pret')
dire(missingUpTo('base', { ...TOUT, cidValid: false }) === 'un identifiant valide',
     'un identifiant devenu invalide bloque la creation, et le dit')
dire(missingUpTo('base', { ...TOUT, world: null }) === 'choisir un monde', 'un monde perdu aussi')
dire(missingUpTo('type', { ...TOUT, frozenBase: null }) === null,
     'une etape ne regarde pas celles qui viennent apres elle')

console.log('\n' + '='.repeat(70))
console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert')
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
