/* Test unitaire de `ui/src/screens/worlds/slugify.ts` — l'identifiant proposé
   depuis le nom, dans la modale « Nouveau monde » et pour un lieu neuf
   (design-pass screen-11 §S7).

   POURQUOI IL N'Y A PAS DE FRAMEWORK ICI. Meme raison que test_diff.js : le
   depot n'a ni vitest ni jest, Node retire les types TypeScript nativement
   (`--experimental-strip-types`, pose par run_browser_tests.py), donc ce
   fichier importe le module SOURCE tel quel. Pas de build, pas de copie.

   CE QUE CE TEST PROTEGE VRAIMENT. Un identifiant mal derive ne plante pas :
   il propose quelque chose de plausible que l'utilisateur accepte. `caf_`
   pour « Café » part sur le disque comme nom de fichier
   (`WORLDS/caf_.json`), et un identifiant de lieu devient le `world_ref` des
   scenes qui en derivent — il ne se renomme plus jamais apres. C'est le genre
   de regression qu'aucune fumigation navigateur ne verrait, parce que l'ecran
   marche parfaitement avec un mauvais identifiant. */
import { ID_RE, isValidId, slugify } from '../web/ui/src/screens/worlds/slugify.ts'

let ko = 0
const dire = (bon, quoi) => {
  console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`)
  if (!bon) ko++
}
const propose = (nom, attendu) =>
  dire(slugify(nom) === attendu,
       `« ${nom} » -> « ${slugify(nom)} »${slugify(nom) === attendu ? '' : ` (attendu « ${attendu} »)`}`)

console.log('\n[1] le cas nominal : minuscules et espaces')
propose('Terres sauvages', 'terres_sauvages')
propose('slow-life', 'slow-life')
propose('Slow Life', 'slow_life')

console.log('\n[2] les accents sont retires, jamais remplaces par un souligne')
/* Le piege de la normalisation : 'é'.toLowerCase() vaut 'é', donc sans NFD
   l'accent tombe dans la branche « caractere interdit » et « Café » proposerait
   « caf_ ». */
propose('Café', 'cafe')
propose('Forêt d’hiver', 'foret_d_hiver')
propose('Île à midi', 'ile_a_midi')
propose('Àçñü', 'acnu')

console.log('\n[3] un nom qui commence par un chiffre recoit un prefixe')
/* `_WID_RE` (AUTOMATION/worlds.py) exige une lettre en premier. */
propose('3 collines', 'id_3_collines')
propose('1984', 'id_1984')
dire(isValidId(slugify('3 collines')), 'et ce qui sort est un identifiant valide')

console.log('\n[4] caracteres interdits, doublons et bords')
propose('Rue  des   Lilas', 'rue_des_lilas')
propose('a/b\\c:d', 'a_b_c_d')
propose('  marge  ', 'marge')
propose('!!!', '')
propose('', '')
propose('Bar (fermé) !', 'bar_ferme')

console.log('\n[5] tout ce qui sort de non vide passe la validation')
const noms = ['Terres sauvages', 'Café', '3 collines', 'Rue  des   Lilas', 'a/b\\c:d',
              'Forêt d’hiver', 'Bar (fermé) !', 'slow-life', 'Àçñü', '1984']
const sorties = noms.map(slugify).filter(Boolean)
dire(sorties.every((s) => ID_RE.test(s)), `${sorties.length} identifiants, tous valides`)
dire(sorties.every((s) => !s.includes('__') && !s.startsWith('_') && !s.endsWith('_')),
     'aucun souligne double, ni en tete, ni en fin')

console.log('\n[6] la validation refuse ce qu elle doit refuser')
dire(!isValidId(''), 'vide')
dire(!isValidId('3collines'), 'commence par un chiffre')
dire(!isValidId('Terres'), 'une majuscule')
dire(!isValidId('terres sauvages'), 'un espace')
dire(isValidId('terres-sauvages_2'), 'mais « terres-sauvages_2 » passe')

console.log(`\n${'='.repeat(70)}`)
console.log(ko === 0 ? 'tout est vert' : `${ko} ECHEC(S)`)
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
