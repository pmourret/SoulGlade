/* Test unitaire des fonctions pures de la planche de publication
   (`screens/review/gallery/boardLayout.ts`, design-pass ecran 5c).

   POURQUOI IL N'Y A PAS DE FRAMEWORK ICI. Le depot n'a ni vitest ni jest, et
   en ajouter un pour trois fonctions pures serait payer une dependance, une
   configuration et un second lanceur de tests pour ce qu'un `assert` fait.
   Node 22.11 retire les types TypeScript nativement
   (`--experimental-strip-types`, pose par run_browser_tests.py), donc ce
   fichier importe le module SOURCE tel quel : pas de build, pas de copie, et
   ce qui est teste est exactement ce qui est livre.

   C'est la contrepartie du choix de `boardLayout.ts` de ne rien importer a
   l'execution : il declare sa propre forme d'entree au lieu de lire
   `GalleryItem`. Si quelqu'un y ajoute un `import` depuis `useTriage`, ce
   test cesse de charger, et c'est exactement le signal voulu. */
import {
  DEFAULT_RATIO,
  dayOf,
  groupBy,
  justifyRows,
  ratioOf,
} from '../web/ui/src/screens/review/gallery/boardLayout.ts'

let ko = 0
const dire = (bon, quoi) => {
  console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`)
  if (!bon) ko++
}
const proche = (a, b, eps = 0.01) => Math.abs(a - b) < eps

const img = (name, format) => ({ name, format, scene: name, date: '23/09 16:02' })

console.log('\n[1] ratioOf : ce que le serveur ecrit vraiment dans `format`')
dire(proche(ratioOf('4:5'), 0.8), '« 4:5 » vaut 0,8')
dire(proche(ratioOf('9:16'), 0.5625), '« 9:16 » vaut 0,5625')
dire(proche(ratioOf('2:3'), 0.6667), '« 2:3 » vaut 0,667')
dire(proche(ratioOf('1:1'), 1), '« 1:1 » vaut 1')
/* Les quatre cas mesures sur l'arbre de Lena qui NE SONT PAS des rapports :
   `upscale` est un marqueur de chaine tombe dans le meme champ, et deux
   images n'ont pas de format du tout. Un NaN ici empoisonne la somme d'une
   ligne entiere, donc toutes ses largeurs, donc la ligne disparait. */
dire(ratioOf('upscale') === DEFAULT_RATIO, '« upscale » retombe sur 4:5, jamais NaN')
dire(ratioOf('') === DEFAULT_RATIO, 'la chaine vide aussi')
dire(ratioOf(null) === DEFAULT_RATIO, 'null aussi')
dire(ratioOf(undefined) === DEFAULT_RATIO, 'undefined aussi')
dire(ratioOf('0:5') === DEFAULT_RATIO, 'un zero au numerateur ne passe pas')
dire(ratioOf('4:0') === DEFAULT_RATIO, 'ni au denominateur')
dire(ratioOf('4:5:6') === DEFAULT_RATIO, 'ni trois termes')
dire(ratioOf('a:b') === DEFAULT_RATIO, 'ni deux mots')
dire(Number.isFinite(ratioOf('upscale')), 'et le resultat est toujours fini')

console.log('\n[2] justifyRows : une ligne pleine remplit EXACTEMENT la largeur')
/* DOUZE images, pas cinq : a 190 px de haut une 4:5 fait 152 px, donc cinq
   tiennent sur 1000 px sans jamais fermer de ligne — et le test ne verifiait
   alors PAS l'etirement, qui est pourtant tout l'algorithme. Vu en lisant la
   sortie : « 1 ligne(s) pour 5 images ». Douze en ferment au moins deux. */
const cinq = Array.from({ length: 5 }, (_, i) => img(`a${i}`, '4:5'))
const douze = Array.from({ length: 12 }, (_, i) => img(`b${i}`, i % 3 ? '4:5' : '9:16'))
const rows = justifyRows(douze, 1000, 190, 10)
dire(rows.length >= 2, `${rows.length} lignes pour 12 images sur 1000 px`)
dire(rows.length - 1 >= 1, `${rows.length - 1} ligne(s) fermee(s), donc etiree(s)`)
for (const [i, row] of rows.entries()) {
  const large = row.items.reduce((t, p) => t + p.width, 0) + 10 * (row.items.length - 1)
  const derniere = i === rows.length - 1
  if (!derniere) {
    dire(proche(large, 1000, 0.5), `ligne ${i} etiree a ${large.toFixed(1)} px sur 1000`)
    dire(row.items.every((p) => proche(p.height, row.height)),
         `et ses ${row.items.length} images partagent la hauteur ${row.height.toFixed(1)}`)
  } else {
    dire(large <= 1000.5, `derniere ligne : ${large.toFixed(1)} px, jamais plus que 1000`)
  }
}
dire(rows.flatMap((r) => r.items).length === 12, 'les 12 images sont placees, aucune perdue')

console.log('\n[3] la DERNIERE ligne ne s etire pas');
/* Une image seule en fin de planche, etiree sur 1400 px, deviendrait une
   banniere qui dit « celle-ci compte plus » — ce qui est faux, c'est juste la
   derniere. Elle garde la hauteur cible. */
{
  const r = justifyRows([img('seule', '4:5')], 1400, 190, 10)
  dire(r.length === 1 && proche(r[0].height, 190),
       `une image seule garde 190 px de haut (${r[0].height.toFixed(1)})`)
  dire(proche(r[0].items[0].width, 190 * 0.8),
       `et sa largeur reste son vrai rapport (${r[0].items[0].width.toFixed(1)})`)
}

console.log('\n[4] une image trop large pour le conteneur est REDUITE, pas debordee')
{
  // 16:9 a 190 px de haut fait ~338 px : on lui donne 200 px de large
  const r = justifyRows([img('large', '16:9')], 200, 190, 10)
  dire(r.length === 1, 'elle a quand meme sa ligne')
  dire(r[0].items[0].width <= 200.5,
       `reduite a ${r[0].items[0].width.toFixed(1)} px au lieu de deborder`)
  dire(r[0].height < 190, `en baissant la hauteur (${r[0].height.toFixed(1)} px)`)
}

console.log('\n[5] les gardes : rien a mettre en page, ou pas encore de largeur')
dire(justifyRows([], 1000, 190, 10).length === 0, 'aucune image rend aucune ligne')
/* Le ResizeObserver tire une premiere fois avant que l'element ait une mise
   en page : une largeur nulle donnerait des hauteurs negatives, qui ne se
   voient pas a l'ecran — donc une planche vide plutot qu'une planche fausse. */
dire(justifyRows(cinq, 0, 190, 10).length === 0, 'une largeur nulle rend une planche vide')
dire(justifyRows(cinq, -50, 190, 10).length === 0, 'une largeur negative aussi')
dire(justifyRows(cinq, 1000, 0, 10).length === 0, 'une hauteur cible nulle aussi')

console.log('\n[6] aucune largeur NaN, meme avec des formats mixtes et cabosses')
{
  const mixte = [
    img('a', '4:5'), img('b', 'upscale'), img('c', '9:16'),
    img('d', ''), img('e', '2:3'), img('f', null),
  ]
  const r = justifyRows(mixte, 900, 190, 10)
  const toutes = r.flatMap((x) => x.items)
  dire(toutes.length === 6, `les 6 images sont placees (${toutes.length})`)
  dire(toutes.every((p) => Number.isFinite(p.width) && p.width > 0),
       'toutes ont une largeur finie et positive')
  dire(toutes.every((p) => Number.isFinite(p.height) && p.height > 0),
       'et une hauteur finie et positive')
}

console.log('\n[7] groupBy : intention, scene, jour')
{
  const items = [
    { name: 'i1', scene: 'cafe_terrasse', date: '23/09 16:02', format: '4:5' },
    { name: 'i2', scene: 'selfie_miroir', date: '23/09 09:10', format: '9:16' },
    { name: 'i3', scene: 'cafe_terrasse', date: '22/09 18:00', format: '4:5' },
  ]
  const intentions = { cafe_terrasse: 'lifestyle', selfie_miroir: 'selfie' }

  const parIntention = groupBy(items, 'intention', intentions)
  dire(parIntention.map((g) => g.key).join(',') === 'lifestyle,selfie',
       `par intention : ${parIntention.map((g) => `${g.key}(${g.items.length})`).join(' ')}`)
  dire(parIntention[0].items.length === 2, 'les deux cafe_terrasse tombent ensemble')

  const parScene = groupBy(items, 'scene', intentions)
  dire(parScene.length === 2, `par scene : ${parScene.map((g) => g.key).join(', ')}`)

  const parJour = groupBy(items, 'date', intentions)
  dire(parJour.map((g) => g.key).join(',') === '23/09,22/09',
       `par jour, du plus recent au plus ancien : ${parJour.map((g) => g.key).join(', ')}`)

  /* Une scene qui n'est plus dans la banque : on retombe sur la `categorie`
     que l'image porte elle-meme, puis sur « Sans intention ». Jamais sur
     `undefined`, qui ferait un groupe nomme « undefined » a l'ecran. */
  const orpheline = groupBy(
    [{ name: 'x', scene: 'disparue', date: '01/01 00:00', categorie: 'mode' }],
    'intention', {})
  dire(orpheline[0].key === 'mode', 'une scene absente retombe sur sa categorie')
  const sansRien = groupBy([{ name: 'y', scene: 'disparue', date: '01/01 00:00' }],
                           'intention', {})
  dire(sansRien[0].key === 'Sans intention', 'et sans categorie, sur « Sans intention »')
  dire(!sansRien.some((g) => g.key.includes('undefined')), 'jamais un groupe « undefined »')

  dire(dayOf('23/09 16:02') === '23/09', 'dayOf coupe a l espace')
  dire(dayOf('') === 'sans date', 'et nomme l absence de date')
  dire(dayOf(null) === 'sans date', 'null aussi')
}

console.log('\n[8] l ordre des images dans un groupe est celui d entree')
{
  const items = [img('premier', '4:5'), img('second', '4:5')]
  items[1].scene = items[0].scene = 'meme'
  const g = groupBy(items, 'scene', {})
  dire(g[0].items.map((i) => i.name).join(',') === 'premier,second',
       'le serveur rend deja du plus recent au plus ancien, on ne retrie pas')
}

console.log('\n' + '='.repeat(70))
console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert')
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
