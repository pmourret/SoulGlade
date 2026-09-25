/* Garde de la charte graphique — `ui/src/styles/DESIGN.md`, section « La charte
   du design-pass ». Lecture statique des sources de l'interface, aucun
   navigateur : ce qu'il protège ne se voit pas à l'écran d'un seul écran, il se
   voit en comparant quatorze écrans, ce qu'aucune fumigation ne fait.

   POURQUOI CE TEST EXISTE. Le design-pass a refait quatorze écrans un par un.
   Ce qui se répétait a été recopié plutôt qu'écrit une fois, et a donc dérivé :
   le même sur-titre de section existait en 25 exemplaires sur quatre axes
   (10 à 12 px, sept interlettrages, deux gris, deux graisses), la barre de tête
   d'écran en 44 et en 48 px, et la moitié des cartes figeaient le rayon que le
   pack a le droit de changer. Mesuré et corrigé le 25/09/2026
   (DOCS/design-pass/bilan-graphique.md).

   Chacune des trois règles ci-dessous a un porteur unique, et ce fichier vérifie
   qu'on ne s'est pas remis à l'écrire à la main. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../web/ui/src/', import.meta.url))

let ko = 0
const dire = (bon, quoi) => {
  console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`)
  if (!bon) ko++
}

/** Tous les .ts/.tsx de l'interface, en [chemin relatif, contenu]. */
function sources(dir = SRC, prefixe = '') {
  const out = []
  for (const nom of readdirSync(dir)) {
    const p = join(dir, nom)
    if (statSync(p).isDirectory()) out.push(...sources(p, `${prefixe}${nom}/`))
    else if (/\.tsx?$/.test(nom)) out.push([`${prefixe}${nom}`, readFileSync(p, 'utf8')])
  }
  return out
}
const FICHIERS = sources()

/** Les lignes d'un fichier qui contiennent `motif`, numérotées. */
const lignes = (texte, motif) =>
  texte.split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => motif.test(l))

console.log(`\n[0] la lecture elle-meme`)
dire(FICHIERS.length > 100, `${FICHIERS.length} fichiers source lus sous ui/src`)

/* ------------------------------------------------------------------ [1] */
console.log('\n[1] le sur-titre de section est `.lab`, jamais reecrit a la main')
/* La signature d'un sur-titre : des capitales ET une graisse. Une pastille ou
   une etiquette de donnee porte aussi `uppercase`, mais jamais `font-semibold`
   — c'est ce qui rend ce couple discriminant sans liste d'exceptions. */
{
  const coupables = []
  for (const [nom, texte] of FICHIERS)
    for (const [n, l] of lignes(texte, /font-semibold/))
      if (/\buppercase\b/.test(l)) coupables.push(`${nom}:${n}`)
  dire(coupables.length === 0,
       coupables.length === 0
         ? 'aucun couple uppercase + font-semibold hors de `.lab`'
         : `${coupables.length} sur-titre(s) ecrit(s) a la main : ${coupables.join(', ')}`)
}

/* ------------------------------------------------------------------ [2] */
console.log('\n[2] la barre de tete fait 48 px, et l echelle des barres est close')
/* 48 px est la hauteur du header : une barre d'ecran, une tete de modale et une
   tete de panneau se lisent sur le meme rythme vertical. Le reste de l'echelle
   est mesure, pas decrete — chaque valeur a un role et au moins un porteur :
     40  tete de panneau compacte      52  tete de panneau, pied de modale
     60  barre de lancement            64  panier de la planche
     72  en-tete de scene du composeur 26  echantillon d'apparence (pas une barre)
   Une valeur hors de cette liste est une barre de plus a inventer : elle doit
   passer par la charte, pas par un `h-[46px]` de plus. */
{
  const ECHELLE = new Set([26, 40, 48, 52, 60, 64, 72])
  const coupables = []
  for (const [nom, texte] of FICHIERS)
    for (const [n, l] of lignes(texte, /h-\[\d+px\]/)) {
      if (!/border-(b|t)\b|border-b-|border-t-/.test(l)) continue
      if (!/items-(center|baseline)/.test(l)) continue
      const h = Number(/h-\[(\d+)px\]/.exec(l)[1])
      if (!ECHELLE.has(h)) coupables.push(`${nom}:${n} (${h}px)`)
    }
  dire(coupables.length === 0,
       coupables.length === 0
         ? `${[...ECHELLE].sort((a, b) => a - b).join(' / ')} px, et rien d autre`
         : `hauteur(s) de barre hors echelle : ${coupables.join(', ')}`)
}

/* ------------------------------------------------------------------ [3] */
console.log('\n[3] une surface suit --r, un controle garde son rayon brut')
/* `--r` est le SEUL jeton qu'un pack redefinit encore (Phase 0b) : 8 px sous
   instagram-influenceur, 4 px sous rpg-personnage. Il vaut 8 px par defaut, et
   le rayon des controles vaut 8 px aussi — donc une carte ecrite
   `rounded-[8px]` a l'air juste et ne suit plus rien. Mesure du 25/09/2026, meme
   DOM, `data-pack` bascule : 36 surfaces restaient figees.

   Les huit controles ci-dessous gardent leur rayon en dur, chacun pour la meme
   raison : ce n'est pas une surface, c'est un bouton ou un champ. Ajouter une
   entree ici est une decision — la refuser silencieusement en ecrivant un
   neuvieme `rounded-[8px]` n'en est pas une. */
{
  const CONTROLES = [
    ['GeneralPanel.tsx', 'h-[32px] w-[32px]'],          // bouton icone 32 px
    ['PosePanel.tsx', 'px-[12px] py-[8px] text-[13px]'], // pastille de preset
    ['SettingsPanel.tsx', 'const FIELD'],                // champ de reglage
    ['photoEditorStyles.ts', '[border:0] bg-transparent'], // bouton de barre
    ['ExportPanel.tsx', 'w-[92px]'],                     // champ de comptage
    ['BaseStep.tsx', 'inline-flex self-start'],          // enveloppe de segmente
    ['WizardSteps.tsx', 'flex w-full items-start'],      // rangee d etape
    ['FullFrame.tsx', 'bg-scrim'],                       // plaque posee sur image
  ]
  const permis = (nom, ligne) =>
    CONTROLES.some(([f, frag]) => nom.endsWith(f) && ligne.includes(frag))
  const coupables = []
  for (const [nom, texte] of FICHIERS)
    for (const [n, l] of lignes(texte, /rounded-\[8px\]/))
      if (!permis(nom, l)) coupables.push(`${nom}:${n}`)
  dire(coupables.length === 0,
       coupables.length === 0
         ? `${CONTROLES.length} controles declares, aucune surface figee`
         : `${coupables.length} surface(s) figee(s) a 8px : ${coupables.join(', ')}`)

  /* Une seule orthographe pour le jeton, sinon la recherche du suivant en rate
     la moitie. */
  const autre = []
  for (const [nom, texte] of FICHIERS)
    for (const [n] of lignes(texte, /rounded-\[var\(--r\)\]/)) autre.push(`${nom}:${n}`)
  dire(autre.length === 0,
       autre.length === 0
         ? '`rounded-card` est la seule ecriture du jeton'
         : `rounded-[var(--r)] au lieu de rounded-card : ${autre.join(', ')}`)
}

/* ------------------------------------------------------------------ [4] */
console.log('\n[4] les regles partagees n habillent plus une balise')
/* `base.css` habillait `h2` en sur-titre. Quatre ecrans devaient DEFAIRE cet
   habillage (`normal-case`), trois avec un commentaire pour l'expliquer. Une
   balise dit le rang, une classe dit l'aspect. */
{
  const base = readFileSync(join(SRC, 'styles/base.css'), 'utf8')
  const regle = /\bh2\{([^}]*)\}/.exec(base)
  dire(regle !== null, 'la regle h2 de base.css est lisible')
  if (regle) {
    dire(!/text-transform|letter-spacing|color:/.test(regle[1]),
         `h2 ne porte plus que son reset : ${regle[1].trim()}`)
  }
  dire(/\.lab\{/.test(base), '`.lab` est declaree dans base.css')
}

console.log(`\n${'='.repeat(70)}`)
console.log(ko === 0 ? 'tout est vert' : `${ko} ECHEC(S)`)
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
