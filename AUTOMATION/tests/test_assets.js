/* Browser smoke test of the asset library — /bank/assets (IT-10 chantier 5).

   NO ComfyUI NEEDED, and that is part of what it checks: the dashboard under
   these smoke tests runs `--no-comfy`, so the local vision model is silent.
   An import must still succeed, and the asset must show as « sans fragment »
   rather than fail — the rule the cadrage sets and `assets.importer` holds.

   IT TOUCHES REAL DATA (lena's creative.json, INPUTS/ASSETS/) and cleans up
   through the interface, with the guard frontend.md asks for: what it removes
   is the SET DIFFERENCE against the library's state at the very start, never
   a name pattern or a list position. A pose bank test once deleted a real
   pose by guessing (02/09) — that lesson is copied here rather than relearnt.

   Lancer :  python AUTOMATION/tests/run_browser_tests.py --only test_assets */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';

/* 1×1 PNG. The server reads the FORMAT in the bytes (Pillow), never in the
   name, so the smallest real PNG is enough to exercise the whole path. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
const FRAGMENT = 'a red linen dress, soft daylight';

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1400, height: 900 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  const cles = () => page.$$eval('#bankAssets [data-asset]', e => e.map(x => x.dataset.asset));

  await page.goto(BASE + '/bank/assets?character=lena', { waitUntil: 'networkidle' });
  await page.waitForSelector('#bankAssets');
  const avant = await cles();

  console.log('\n[1] la sous-vue existe et se nomme dans la barre des ateliers');
  dire(await page.isVisible('#bankView [data-vue="assets"]'), 'l\'onglet « Assets » est là');
  dire(await page.isVisible('#btnAssetImport'), 'et son bouton d\'import aussi');

  console.log('\n[2] import d\'une image, ComfyUI hors ligne — l\'asset naît sans fragment');
  await page.selectOption('#assetClass', 'vetement');
  await page.setInputFiles('#assetFile', { name: 'Robe de fumigation.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForFunction(
    (n) => document.querySelectorAll('#bankAssets [data-asset]').length > n,
    avant.length, { timeout: 30000 });
  const apres = await cles();
  const nouvelles = apres.filter((k) => !avant.includes(k));
  dire(nouvelles.length === 1, `un asset et un seul est entré (${nouvelles})`);
  const cle = nouvelles[0];
  const carte = `#bankAssets [data-asset="${cle}"]`;
  /* Ce que la carte doit dire dépend de ce que le modèle a rendu, et ce test
     ne pilote pas ComfyUI : il vérifie la COHÉRENCE des deux, jamais l'une
     des deux branches en particulier. Une image 1×1 ne décrit rien, donc en
     pratique c'est la branche « sans fragment » qui passe ici — mais un
     modèle qui répondrait ne doit pas faire échouer la fumigation. */
  const sansFragment = (await page.textContent(carte)).includes('sans fragment');
  const fragment = await page.evaluate((c) => {
    document.querySelector(c).click();
    return new Promise(r => setTimeout(() => r(document.querySelector('#assetFragment')?.value ?? ''), 300));
  }, carte);
  dire(sansFragment === !fragment.trim(),
       `la carte et la fiche disent la même chose (« sans fragment » : ${sansFragment})`);

  console.log('\n[3] la fiche : le fragment s\'écrit à la main et l\'image est servie');
  await page.click(carte);
  await page.waitForSelector('#assetInspector');
  const image = await page.getAttribute('#assetInspector img', 'src');
  dire(image.includes('/img/asset?key=') && image.includes('character=lena'),
       `l'image passe par la clé ET le personnage (${image})`);
  dire((await page.textContent('[data-asset-layer]')).includes('Propre au personnage'),
       'la couche est dite : propre au personnage');
  await page.fill('#assetFragment', FRAGMENT);
  await page.click('#btnAssetSave');
  await page.waitForFunction(
    (c) => !document.querySelector(c).textContent.includes('sans fragment'),
    carte, { timeout: 10000 });
  dire(true, 'enregistré : la carte ne dit plus « sans fragment »');

  console.log('\n[4] le composeur va le chercher — panneau Vêtements, catégorie pièces');
  await page.goto(BASE + '/bank/scenes?character=lena', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-scene-card]');
  await page.click('[data-scene-card]');
  await page.waitForSelector('[data-tabpanel]', { timeout: 10000 });
  await page.click('[data-tab="clothing"]');
  await page.waitForSelector('[data-f^="wardrobe_"]');
  // « pièces » depuis IT-10 chantier 6 : les tenues ont leur propre catégorie
  dire(await page.isVisible('button:has-text("pièces")'),
       'la catégorie « pièces » apparaît dès qu\'un asset existe');
  await page.click('button:has-text("pièces")');
  const puce = `[data-piece="${FRAGMENT}"]`;
  await page.waitForSelector(puce);
  dire(await page.isVisible(`${puce} img`), 'et la pièce porte SON image, pas la vignette hachurée');
  // `[data-value]` : le niveau ouvert, jamais le bloc « hors des quatre niveaux »
  const niveauAvant = await page.getAttribute('[data-f^="wardrobe_"][data-value]', 'data-value');
  await page.click(puce);
  await page.waitForTimeout(400);
  const niveauApres = await page.getAttribute('[data-f^="wardrobe_"][data-value]', 'data-value');
  dire(niveauApres.includes(FRAGMENT) && niveauApres !== niveauAvant,
       'un clic ajoute son fragment à la tenue du niveau ouvert');

  console.log('\n[5] NETTOYAGE : retrait UNIQUEMENT de ce que ce test a créé');
  await page.goto(BASE + '/bank/assets?character=lena', { waitUntil: 'networkidle' });
  await page.waitForSelector('#bankAssets');
  const aRetirer = (await cles()).filter((k) => !avant.includes(k));
  console.log('   à retirer :', aRetirer);
  for (const k of aRetirer) {
    await page.click(`#bankAssets [data-asset="${k}"]`);
    await page.waitForSelector('#btnAssetDelete');
    await page.click('#btnAssetDelete');
    await page.waitForSelector('#armBox[open]');
    await page.click('#cfOui');
    await page.waitForTimeout(500);
  }
  const final = await cles();
  dire(final.length === avant.length && avant.every((k) => final.includes(k)),
       `la bibliothèque est revenue exactement à son état de départ (${final.length})`);

  console.log('\n[6] aucune erreur JS réelle sur tout le parcours');
  const reelles = erreurs.filter(e => !/Failed to load resource.*404/.test(e));
  dire(reelles.length === 0, `${reelles.length} erreur(s)`);
  reelles.forEach(e => console.log('      ' + e.slice(0, 150)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
