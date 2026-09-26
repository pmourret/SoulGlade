/* Browser smoke test of the outfit catalogue — /bank/outfits and the
   Vêtements panel of the composer (IT-10 chantier 6).

   WHAT IT LOCKS, in the order a user meets it:
     1. an outfit of two written pieces is created in the workshop, and the
        text a scene will receive is shown IN FULL before it is saved;
     2. in the composer it is added as ONE line — shown by its label and its
        resolved text, never by `@key`;
     3. a garment piece clicked in the catalogue COMPLETES the outfit written
        at that level instead of becoming an outfit of its own (two lines at
        one level are two images — the defect the cadrage measured).

   IT TOUCHES REAL DATA (the character's creative.json and scenes.json) and
   cleans up through the interface, with the guard frontend.md asks for: the
   scene is reverted without saving, and what is removed from the catalogue is
   the SET DIFFERENCE against its state at the very start, never a name
   pattern. It writes on the CHARACTER side only: a world file is versioned.

   Lancer :  python AUTOMATION/tests/run_browser_tests.py --only test_outfits
   (SMOKE_CHARACTER choisit le personnage, lena par défaut) */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const CID = process.env.SMOKE_CHARACTER || 'lena';
const LABEL = 'Tenue de fumigation';

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1400, height: 900 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  const cles = () => page.$$eval('#bankOutfits [data-outfit]', e => e.map(x => x.dataset.outfit));

  await page.goto(`${BASE}/bank/outfits?character=${CID}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#bankOutfits');
  const avant = await cles();

  console.log('\n[1] la sous-vue existe et se nomme dans la barre des ateliers');
  dire(await page.isVisible('#bankView [data-vue="outfits"]'), 'l\'onglet « Tenues » est là');

  console.log('\n[2] créer une tenue de deux pièces écrites');
  await page.click('#btnOutfitNew');
  await page.waitForSelector('#outfitInspector');
  await page.fill('#outfitLabel', LABEL);
  for (const piece of ['a beige knit sweater', 'light blue denim jeans']) {
    await page.fill('#outfitWritten', piece);
    await page.press('#outfitWritten', 'Enter');
  }
  const apercu = await page.textContent('#outfitText');
  dire(apercu === 'wearing a beige knit sweater, light blue denim jeans',
       `le texte que la scène recevra est dit en entier avant l'enregistrement (${apercu})`);
  await page.click('#btnOutfitSave');
  await page.waitForFunction(
    (n) => document.querySelectorAll('#bankOutfits [data-outfit]').length > n,
    avant.length, { timeout: 10000 });
  const nouvelles = (await cles()).filter((k) => !avant.includes(k));
  dire(nouvelles.length === 1, `une tenue et une seule est créée (${nouvelles})`);
  const cle = nouvelles[0];
  dire((await page.textContent('[data-outfit-layer]')).includes('Propre au personnage'),
       'la couche est dite : propre au personnage');

  console.log('\n[3] le composeur la pose en UNE ligne, montrée par son libellé');
  await page.goto(`${BASE}/bank/scenes?character=${CID}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-scene-card]');
  await page.click('[data-scene-card]');
  await page.waitForSelector('[data-tabpanel]', { timeout: 10000 });
  await page.click('[data-tab="clothing"]');
  await page.waitForSelector('[data-f^="wardrobe_"]');
  dire(!(await page.isVisible('button:has-text("Une pièce")')),
       'les puces écrites en dur ont disparu du catalogue');
  const tenue = `[data-catalog-kind="outfit"][data-piece="@${cle}"]`;
  await page.waitForSelector(tenue);
  const niveau = '[data-f^="wardrobe_"][data-value]'  // pas le bloc « hors des quatre niveaux »
  const lignes = async () => ((await page.getAttribute(niveau, 'data-value')) || '')
    .split('\n').filter((l) => l.trim());
  const avantNiveau = await lignes();
  await page.click(tenue);
  await page.waitForTimeout(300);
  const apresNiveau = await lignes();
  dire(apresNiveau.length === avantNiveau.length + 1 && apresNiveau.includes(`@${cle}`),
       'un clic ajoute UNE ligne, la référence de la tenue');
  const ligne = `[data-outfit-line="@${cle}"]`;
  const vue = (await page.textContent(ligne)) || '';
  dire(vue.includes(LABEL) && vue.includes('wearing a beige knit sweater, light blue denim jeans')
       && !vue.includes(`@${cle}`),
       'la ligne se lit par son libellé et son texte résolu, jamais par sa clé');

  console.log('\n[4] une pièce complète la tenue écrite, elle n\'en fait pas une de plus');
  const piece = '[data-catalog-kind="piece"]:not([disabled])';
  if (await page.$(piece)) {
    await page.fill('[id^="free-"]', 'a white cotton t-shirt');
    await page.press('[id^="free-"]', 'Enter');
    const avantPiece = await lignes();
    const fragment = await page.getAttribute(piece, 'data-piece');
    await page.click(piece);
    await page.waitForTimeout(300);
    const apresPiece = await lignes();
    dire(apresPiece.length === avantPiece.length
         && apresPiece.some((l) => l.endsWith(`a white cotton t-shirt, ${fragment}`)),
         'le fragment rejoint la ligne libre, le nombre de tenues ne bouge pas');
  } else {
    console.log('   IGNORE — aucune pièce dans les assets de ce personnage');
  }

  console.log('\n[5] NETTOYAGE : la scène n\'est pas enregistrée, la tenue est retirée');
  await page.goto(`${BASE}/bank/outfits?character=${CID}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#bankOutfits');
  const aRetirer = (await cles()).filter((k) => !avant.includes(k));
  console.log('   à retirer :', aRetirer);
  for (const k of aRetirer) {
    await page.click(`#bankOutfits [data-outfit="${k}"]`);
    await page.waitForSelector('#btnOutfitDelete');
    await page.click('#btnOutfitDelete');
    await page.waitForSelector('#armBox[open]');
    await page.click('#cfOui');
    await page.waitForTimeout(500);
  }
  const final = await cles();
  dire(final.length === avant.length && avant.every((k) => final.includes(k)),
       `le catalogue est revenu exactement à son état de départ (${final.length})`);

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
