/* Test unitaire : la phrase d'une fiche de lumiere, composee par l'ecran
   (`screens/bank/lights/lightCompose.ts`) et par le serveur
   (`AUTOMATION/lights.py::compose`), est la meme — IT-10 chantier 7 bis.

   POURQUOI. L'ecran compose la phrase sous les yeux pendant qu'on regle la
   fiche ; le serveur la recompose au lancement. Deux grammaires qui divergent
   montreraient une phrase et en lanceraient une autre. test_lights.js le
   verifie sur UNE lumiere de bout en bout ; ici, tous les schemas de depart,
   chaque valeur de chaque reglage seule, les couleurs (palette, libre, aucune)
   et un effet de l'utilisateur, d'un coup.

   Le serveur est interroge par le Python du studio (SOULGLADE_PYTHON, pose par
   run_browser_tests.py), la fonction elle-meme, jamais une copie de ses
   resultats. Le module TS est importe SOURCE (--experimental-strip-types,
   meme mecanique que test_board_layout.js).

   Lancer :  python_embeded/python.exe AUTOMATION/tests/run_browser_tests.py --only test_light_compose */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { composeLight } from '../web/ui/src/screens/bank/lights/lightCompose.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const OFM = join(HERE, '..', '..')
const raw = JSON.parse(readFileSync(join(OFM, 'PLATFORM', 'lighting.json'), 'utf-8'))
const vocab = { settings: raw.settings, palette: raw.palette, effects: raw.effects, schemes: raw.schemes }

let ko = 0
const dire = (bon, quoi) => {
  console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`)
  if (!bon) ko++
}

const custom = [{ key: 'lueur', label: 'Lueur', fragment: '  {color}   candle  glow ' }]
const cases = [
  ...vocab.schemes.map((s) => ({ name: `schéma ${s.key}`, setup: s.setup })),
  ...vocab.settings.flatMap((s) => s.options.map((o) => ({ name: `${s.key}=${o.key}`, setup: { [s.key]: o.key } }))),
  ...vocab.effects.map((e) => ({ name: `effet ${e.key}, cyan`, setup: { effects: [{ key: e.key, color: 'cyan' }] } })),
  { name: 'couleur libre', setup: { effects: [{ key: 'gel', color: '  deep violet ' }] } },
  { name: 'sans couleur', setup: { effects: [{ key: 'gel', color: '' }] } },
  { name: 'effet de l\'utilisateur', setup: { source: 'lamp', effects: [{ key: 'lueur', color: 'amber' }] } },
  { name: 'vide', setup: {} },
]

const python = process.env.SOULGLADE_PYTHON || 'python'
const script = [
  'import json, sys',
  `sys.path.insert(0, ${JSON.stringify(join(OFM, 'AUTOMATION'))})`,
  'import lights',
  'data = json.load(sys.stdin)',
  'print(json.dumps([lights.compose(c["setup"], data["custom"]) for c in data["cases"]]))',
].join('\n')
const server = JSON.parse(execFileSync(python, ['-c', script], {
  input: JSON.stringify({ cases, custom }), encoding: 'utf-8',
}))

console.log(`\n[1] ${cases.length} fiches : l'écran compose la phrase du serveur`)
cases.forEach((c, i) => {
  const screen = composeLight({ effects: [], ...c.setup }, vocab, custom)
  if (screen.problem || screen.text !== server[i]) {
    dire(false, `${c.name} : écran « ${screen.text || screen.problem} » / serveur « ${server[i]} »`)
  }
})
dire(true, 'aucune divergence')

console.log('\n[2] ce que le serveur refuse, l\'écran le dit au lieu de composer')
dire(composeLight({ source: 'torche', effects: [] }, vocab, custom).problem === 'source inconnue : « torche »',
     'une source inconnue')
dire(composeLight({ effects: [{ key: 'laser', color: '' }] }, vocab, custom).problem === 'effet inconnu : « laser »',
     'un effet inconnu')

console.log('\n' + '='.repeat(70))
console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert')
console.log('='.repeat(70))
process.exit(ko ? 1 : 0)
