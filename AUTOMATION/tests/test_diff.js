/* Test unitaire de `ui/src/lib/diff.ts` — le diff du panneau JSON du
   composeur (design-pass screen-7c §7) et de la comparaison Actuel / Proposé
   de l'amelioration IA (§6).

   POURQUOI IL N'Y A PAS DE FRAMEWORK ICI. Meme raison que
   test_board_layout.js : le depot n'a ni vitest ni jest, Node 22.11 retire
   les types TypeScript nativement (`--experimental-strip-types`, pose par
   run_browser_tests.py), donc ce fichier importe le module SOURCE tel quel.
   Pas de build, pas de copie, et ce qui est teste est exactement ce qui est
   livre.

   CE QUE CE TEST PROTEGE VRAIMENT. Un diff faux ne plante pas : il affiche
   quelque chose de plausible. Une ligne reecrite montree comme une
   suppression suivie d'une addition reste lisible, et fait pourtant perdre
   le surlignage mot a mot qui est tout l'interet du panneau. C'est le genre
   de regression qu'aucune fumigation navigateur ne verrait. */
import { countChanges, diffLines, diffWords } from '../web/ui/src/lib/diff.ts'

let ko = 0
const dire = (bon, quoi) => {
  console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`)
  if (!bon) ko++
}
const formes = (rows) => rows.map((r) => r.kind).join(',')

console.log('\n[1] deux textes identiques : que des lignes inchangees')
{
  const lignes = ['{', '  "id": "cafe_terrasse",', '  "count": 2', '}']
  const rows = diffLines(lignes, lignes)
  dire(formes(rows) === 'same,same,same,same', `${rows.length} lignes, toutes « same »`)
  const n = countChanges(rows)
  dire(n.added === 0 && n.removed === 0 && n.changed === 0, 'aucun ajout, aucun retrait')
  dire(rows.every((r, i) => r.a === i + 1 && r.b === i + 1),
       'les deux gouttieres de numeros suivent, 1-indexees')
}

console.log('\n[2] une ligne ajoutee, une retiree')
{
  const rows = diffLines(['a', 'b'], ['a', 'b', 'c'])
  dire(formes(rows) === 'same,same,add', 'une addition en fin')
  dire(rows[2].b === 3 && rows[2].text === 'c', 'elle porte son numero et son texte')
  const inverse = diffLines(['a', 'b', 'c'], ['a', 'b'])
  dire(formes(inverse) === 'same,same,del', 'et le retrait dans l autre sens')
  dire(countChanges(inverse).removed === 1, 'compte : 1 retrait')
}

console.log('\n[3] une ligne REECRITE est une modification, pas un couple retrait/ajout')
{
  // Le vrai cas : une cle de scenes.json dont la valeur change.
  const avant = ['{', '  "prompt": "a sunlit kitchen",', '  "count": 2', '}']
  const apres = ['{', '  "prompt": "a sunlit kitchen, golden hour",', '  "count": 2', '}']
  const rows = diffLines(avant, apres)
  dire(formes(rows) === 'same,mod,same,same', 'la ligne « prompt » est appariee (mod)')
  const mod = rows[1]
  dire(mod.a === 2 && mod.b === 2, 'elle porte ses deux numeros de ligne')
  dire(mod.before.includes('sunlit kitchen"') && mod.after.includes('golden hour'),
       'et ses deux versions, pretes a etre mises face a face')
  const n = countChanges(rows)
  dire(n.changed === 1 && n.added === 1 && n.removed === 1,
       'une modification compte pour +1 et -1 dans l en-tete')
}

console.log('\n[4] deux cles DIFFERENTES ne s apparient pas')
{
  // Le piege symetrique : appariller « pose » avec « tags » produirait un
  // surlignage mot a mot qui compare deux choses sans rapport.
  const rows = diffLines(['  "pose": "x",'], ['  "tags": "y",'])
  dire(formes(rows) === 'del,add', 'une suppression et une addition, pas une modification')
}

console.log('\n[5] diffWords : ce qui bouge DANS une ligne')
{
  const { before, after } = diffWords('a sunlit kitchen', 'a sunlit kitchen, golden hour')
  dire(before.map((s) => s.text).join('') === 'a sunlit kitchen',
       'le cote gauche se recolle exactement en son texte d origine')
  dire(after.map((s) => s.text).join('') === 'a sunlit kitchen, golden hour',
       'le cote droit aussi — espaces compris')
  dire(before.every((s) => s.kind === 'same'), 'rien n a ete retire a gauche')
  const ajoutes = after.filter((s) => s.kind === 'add').map((s) => s.text).join('')
  dire(ajoutes.includes('golden hour'), `l ajout est isole (« ${ajoutes.trim()} »)`)
}

console.log('\n[6] un mot REMPLACE se dit des deux cotes')
{
  const { before, after } = diffWords('golden hour light', 'blue hour light')
  dire(before.some((s) => s.kind === 'del' && s.text.includes('golden')), '« golden » est barre a gauche')
  dire(after.some((s) => s.kind === 'add' && s.text.includes('blue')), '« blue » est surligne a droite')
  dire(before.some((s) => s.kind === 'same' && s.text.includes('hour')),
       'et « hour light », commun, reste neutre')
}

console.log('\n[7] spans adjacents de meme nature fusionnes')
{
  // Trois mots retires d'affilee doivent faire UN barre, pas trois.
  const { before } = diffWords('one two three four', 'four')
  const dels = before.filter((s) => s.kind === 'del')
  dire(dels.length === 1, `${dels.length} span supprime pour trois mots d affilee`)
}

console.log('\n[8] scene jamais enregistree : tout est en ajout')
{
  const rows = diffLines([], ['{', '  "id": "neuve"', '}'])
  dire(rows.length === 3 && rows.every((r) => r.kind === 'add'), 'les trois lignes sont des ajouts')
  dire(countChanges(rows).added === 3, 'compte : +3')
  const vide = diffLines([], [])
  dire(vide.length === 0, 'et deux textes vides ne produisent aucune ligne')
}

console.log('\n' + '='.repeat(70))
console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert')
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
