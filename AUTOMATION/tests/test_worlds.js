/* Browser smoke test of Référentiel › Mondes — registry, four catalogs and
   their inspectors, at /worlds and /worlds/:id/places (IT-11 chantier 4,
   ADR-0027).

   Ce que ce test tient, sur le parcours du critère de sortie d'IT-11 :

     1. UN MONDE NEUF SE REMPLIT DEPUIS L'ECRAN, sans JSON : il est cree par le
        dialogue, s'ouvre sur Lieux en creation, recoit un lieu, une intention,
        une scene qui les CHOISIT dans les listes (aperçu du prompt compose
        visible), et un ton.
     2. LES IDENTIFIANTS SE FIGENT A LA CREATION : proposes depuis le nom, ils ne
        sont plus editables une fois l'entree enregistree.
     3. UN LIEU UTILISE NE SE RETIRE PAS : le geste est refuse avant meme la
        question, et le message nomme la scene.
     4. LA BRANCHE ADULTE EST ANNONCEE, JAMAIS IMPOSEE (arbitrage du 21/09) : son
        nombre est sur le selecteur de l'onglet Scenes, son contenu n'apparait
        qu'une fois choisie, avec son bandeau et son fichier. Lu sur slow-life,
        sans rien y ecrire.

   IL NETTOIE. Le monde qu'il cree n'a pas de route de suppression : il est
   retire du disque a la fin, par son chemin exact (WORLDS/<id>.json), jamais
   par un motif. Rien n'est ecrit dans un monde existant.

   PREREQUIS : voir test_journal.js — run_browser_tests.py fait tout. */
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const NEUF = 'zz-essai-monde';
const FICHIER = path.join(__dirname, '..', '..', 'WORLDS', `${NEUF}.json`);

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1500, height: 950 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      erreurs.push('console: ' + m.text());
  });
  page.on('response', r => {
    if (r.status() >= 400) erreurs.push(`HTTP ${r.status()} : ${r.url()}`);
  });

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  const onglet = (nom) => page.locator(`#worldPlaces [role="tab"]:has-text("${nom}")`);
  const lignes = () => page.$$eval('#worldPlaces [data-entry-row] b', e => e.map(x => x.textContent.trim()));
  const enregistrer = async () => {
    await page.waitForSelector('#pendingBar');
    await page.click('#btnPendingSave');
    await page.waitForSelector('#pendingBar', { state: 'detached', timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
  };

  try {
    fs.rmSync(FICHIER, { force: true });

    console.log('\n[1] un monde neuf s ouvre sur Lieux, en creation');
    await page.goto(`${BASE}/worlds?character=lena`, { waitUntil: 'networkidle' });
    await page.click('#worlds [data-new]');
    await page.fill('#nwLabel', 'Zz essai monde');
    await page.fill('#nwId', NEUF);
    await page.click('[data-new-open] button.btn.primary');
    await page.waitForSelector('#entryInspector[data-entry="lieu"]', { timeout: 6000 }).catch(() => {});
    dire(Boolean(await page.$('#entryInspector[data-entry="lieu"]')),
         'le monde cree ouvre l inspecteur d un premier lieu');
    dire(await onglet('Lieux').getAttribute('aria-selected') === 'true', 'sur l onglet Lieux');
    dire(await page.evaluate(() => document.activeElement?.id) === 'entry-label',
         'le focus est dans le nom');

    console.log('\n[2] un lieu, dont l identifiant suit le nom puis se fige');
    await page.fill('#entry-label', 'Petite cuisine');
    dire(await page.inputValue('#entryIdInput') === 'petite_cuisine', 'l identifiant est propose depuis le nom');
    await page.fill('#entry-prompt', 'small sunlit kitchen, wooden shelves');
    await enregistrer();
    dire((await lignes()).includes('Petite cuisine'), 'le lieu est enregistre et liste');
    dire(!(await page.$('#entryIdInput')) && (await page.textContent('#entryId')).trim() === 'petite_cuisine',
         'son identifiant n est plus editable');

    console.log('\n[3] une intention, avec un ton propose seulement parmi ceux du monde');
    await onglet('Intentions').click();
    await page.waitForTimeout(150);
    dire(/intention/i.test(await page.textContent('#intentionsBlock')), 'l onglet vide dit ce qu est une intention');
    await page.click('#intentionsBlock button:has-text("Créer la première intention")');
    await page.waitForSelector('#entryInspector[data-entry="intention"]');
    await page.fill('#entry-label', 'Cuisine maison');
    dire(await page.inputValue('#entryIdInput') === 'cuisine_maison', 'la cle est proposee depuis le nom');
    const tons = await page.$$eval('#entry-tone option', o => o.map(x => x.value));
    dire(tons.length === 1 && tons[0] === '', 'un monde sans ton ne propose que « aucun »');
    await page.fill('#entry-prompt_add', 'home cooking, everyday gestures');
    await enregistrer();
    dire((await lignes()).some(l => l.includes('Cuisine maison')), 'l intention est enregistree');

    console.log('\n[4] une scene qui choisit son intention et son lieu dans les listes');
    await onglet('Scènes').click();
    await page.waitForTimeout(150);
    await page.click('#btnAddEntry');
    await page.waitForSelector('#entryInspector[data-entry="scène"]');
    await page.fill('#entry-label', 'Cuisine au matin');
    await page.selectOption('#entry-intention', 'cuisine_maison');
    await page.selectOption('#entry-place', 'petite_cuisine');
    await page.fill('#entry-prompt', 'stirring a pot, morning light');
    const apercu = (await page.textContent('#entryPreview')).trim();
    dire(apercu === 'stirring a pot, morning light, small sunlit kitchen, wooden shelves',
         `l apercu compose la scene et son decor : « ${apercu} »`);
    await enregistrer();
    dire((await lignes()).includes('Cuisine au matin'), 'la scene est enregistree');
    const surDisque = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
    const sc = surDisque.scenes.find(s => s.id === 'cuisine_au_matin');
    dire(sc && sc.intention === 'cuisine_maison' && sc.place === 'petite_cuisine' && !('intensity' in sc),
         'le fichier porte la scene avec ses deux references, sans niveau non demande');

    console.log('\n[5] un lieu utilise ne se retire pas, et le dit');
    await onglet('Lieux').click();
    await page.waitForTimeout(150);
    await page.click('#worldPlaces [data-entry-row="petite_cuisine"]');
    await page.click('#btnEntryRemove');
    await page.waitForTimeout(300);
    dire(!(await page.$('#cfOui')), 'aucune question n est posee pour un geste impossible');
    dire(/Cuisine au matin/.test(await page.textContent('#toastTxt')), 'le message nomme la scene');
    dire((await lignes()).includes('Petite cuisine'), 'et le lieu est toujours la');

    console.log('\n[6] un ton, et l intention peut alors le proposer');
    await onglet('Tons').click();
    await page.waitForTimeout(150);
    await page.click('#tonesEmpty button');
    await page.waitForSelector('#toneKey');
    await page.fill('#toneLabel', 'Doux');
    await page.fill('#tonePrompt', 'soft window light');
    await enregistrer();
    await onglet('Intentions').click();
    await page.waitForTimeout(150);
    await page.click('#worldPlaces [data-entry-row="cuisine_maison"]');
    await page.selectOption('#entry-tone', 'doux');
    await enregistrer();
    const relu = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
    dire(relu.intentions[0].defaults?.tone === 'doux' && relu.tones.length === 1,
         'le monde porte un lieu, une intention qui propose son ton, une scene et un ton');

    console.log('\n[7] la branche adulte de slow-life : annoncee, jamais imposee');
    await page.goto(`${BASE}/worlds/slow-life/places?character=lena&onglet=scenes`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#worldPlaces [data-entry-row]');
    const ordinaires = await lignes();
    dire(/\d/.test(await page.textContent('#branchAdultes')), 'le selecteur Adultes annonce son nombre');
    dire(!(await page.$('#adulteBanner')), 'et rien d adulte n est a l ecran au chargement');
    await page.click('#branchAdultes');
    await page.waitForTimeout(200);
    const adultes = await lignes();
    dire(adultes.length > 0 && !adultes.some(a => ordinaires.includes(a)),
         `la branche liste ses propres scenes (${adultes.length}), aucune dans les ordinaires`);
    dire(/slow-life\.adulte\.json/.test(await page.textContent('#adulteBanner')),
         'le bandeau nomme le fichier de la branche');
  } finally {
    fs.rmSync(FICHIER, { force: true });
  }

  console.log('\n[8] aucune erreur JS sur tout le parcours');
  dire(erreurs.length === 0, `${erreurs.length} erreur(s)`);
  erreurs.forEach(e => console.log('      ' + e));

  console.log(`\n${'='.repeat(70)}`);
  console.log(ko === 0 ? 'tout est vert' : `${ko} ECHEC(S)`);
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
