/* Test unitaire : le nom anglais d'une couleur d'effet libre
   (`screens/bank/lights/colorName.ts`, design-pass lumieres S6).

   CE QU'IL TIENT. Le prompt ne recoit que des mots : la roue propose un nom,
   et apres rechargement la case « Autre… » retrouve une pastille approchee
   depuis ce nom seul. Quatre choses :
     1. les six teintes de PLATFORM/lighting.json, lues en OKLCH depuis leur
        swatch (le fichier, pas une copie), retombent sur leur nom de teinte ;
     2. au plus un qualificatif, et jamais une sortie hors de la table ;
     3. la table inverse fait l'aller-retour pour chaque nom et qualificatif ;
     4. un nom inconnu de la table rend null (case neutre en pointilles).

   Lancer :  python_embeded/python.exe AUTOMATION/tests/run_browser_tests.py --only test_color_name */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  colorFromName, colorName, frenchName, HUE_NAMES, QUALIFIER_NAMES,
} from '../web/ui/src/screens/bank/lights/colorName.ts'

const OFM = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const palette = JSON.parse(readFileSync(join(OFM, 'PLATFORM', 'lighting.json'), 'utf-8')).palette

let ko = 0
const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++ }

/** sRGB hex -> OKLCH (Bjorn Ottosson), what the wheel would read. */
function hexToOklch(hex) {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 }
}
const hueOfName = (name) => name.split(' ').filter((w) => !QUALIFIER_NAMES.includes(w)).join(' ')

console.log('\n[1] les six teintes de la plateforme retombent sur leur nom')
dire(palette.length === 6, `${palette.length} teintes lues dans PLATFORM/lighting.json`)
for (const { key, swatch } of palette) {
  const o = hexToOklch(swatch)
  const name = colorName(o)
  dire(hueOfName(name) === key, `${key} (${swatch}, h ${o.h.toFixed(1)}°) -> « ${name} »`)
}

console.log('\n[2] au plus un qualificatif, jamais une sortie hors table')
{
  const hors = []
  let n = 0
  for (let h = 0; h < 360; h += 1)
    for (let l = 0.3; l <= 0.9; l += 0.05)
      for (let c = 0.02; c <= 0.26; c += 0.02) {
        n++
        const words = colorName({ l, c, h }).split(' ')
        const qualifiers = words.filter((w) => QUALIFIER_NAMES.includes(w))
        const rest = words.filter((w) => !QUALIFIER_NAMES.includes(w)).join(' ')
        if (qualifiers.length > 1 || !HUE_NAMES.includes(rest) || (qualifiers.length && words[0] !== qualifiers[0]))
          hors.push(`${h}/${l.toFixed(2)}/${c.toFixed(2)}`)
      }
  dire(hors.length === 0, hors.length ? `${hors.length} sortie(s) hors table : ${hors.slice(0, 5)}` : `${n} couleurs, toutes nommees par la table`)
}

console.log('\n[3] la table inverse fait l aller-retour')
{
  const rates = []
  for (const hue of HUE_NAMES)
    for (const q of ['', ...QUALIFIER_NAMES]) {
      const name = q ? `${q} ${hue}` : hue
      const back = colorFromName(name)
      if (!back || colorName(back) !== name || !frenchName(name)) rates.push(name)
    }
  dire(rates.length === 0, rates.length ? `rates : ${rates.join(', ')}` : `${HUE_NAMES.length * 5} noms`)
  dire(frenchName('deep violet') === 'Violet profond', `« deep violet » se dit « ${frenchName('deep violet')} »`)
  dire(colorFromName('  Deep  Violet ') !== null, 'la casse et les espaces ne comptent pas')
}

console.log('\n[4] un nom inconnu rend null')
for (const words of ['electric blue', 'smoke', 'deep vivid red', ''])
  dire(colorFromName(words) === null && frenchName(words) === null, `« ${words} » -> null`)

console.log(`\n${'='.repeat(70)}`)
console.log(ko === 0 ? 'tout est vert' : `${ko} ECHEC(S)`)
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
