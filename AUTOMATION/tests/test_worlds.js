/* Browser smoke test of the world CATALOG editor (/worlds/:id/places).

   L'écran existait sans fumigation — trou comblé le 21/09, le jour où il a
   gagné un second catalogue. Il en porte deux depuis : le catalogue
   ordinaire, et le catalogue ADULTE qui vit dans son propre fichier
   (`WORLDS/<id>.adulte.json`) derrière ses propres routes.

   Ce que ce test tient :

     1. LE BLOC ADULTE EST REPLIÉ, et son nombre est annoncé sur le résumé
        fermé — rien n'est caché, rien ne s'impose. C'est l'arbitrage du
        21/09, et c'est précisément le genre de détail qu'un refactor
        "améliore" sans le vouloir.
     2. LES DEUX CATALOGUES NE SE MÉLANGENT PAS. Un lieu adulte n'apparaît
        jamais dans la liste ordinaire — la garantie côté serveur a son test
        Python, celle-ci est la garantie à l'écran.
     3. DEUX SÉLECTIONS INDÉPENDANTES : ouvrir un lieu d'un côté ne ferme pas
        l'inspecteur de l'autre. C'est ce que coûte un `useCatalogueEditor`
        par catalogue, et ce qu'on perdrait en n'en partageant qu'un.
     4. L'ALLER-RETOUR ÉCRIT VRAIMENT : un lieu adulte ajouté puis retiré par
        l'interface, et le catalogue revient à son état de départ.

   IL NETTOIE. Le lieu qu'il crée est retiré par l'interface à la fin, et la
   liste est comparée à celle du départ — même garde que test_pose_editor.js :
   ne jamais retirer que ce que CE run a créé.

   PRÉREQUIS : voir test_journal.js — run_browser_tests.py fait tout. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const MONDE = 'slow-life';
const NEUF = 'zz_essai_fumigation';

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
  const lieux = (racine) => page.$$eval(`${racine} [data-place-row] b`, e => e.map(x => x.textContent));

  console.log('\n[1] les deux catalogues, et le bloc adulte reste replie');
  await page.goto(`${BASE}/worlds/${MONDE}/places?character=lena`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#worldPlaces [data-place-row]');
  const bloc = await page.$('#adulteBlock');
  dire(Boolean(bloc), 'le bloc « Lieux adultes » existe');
  dire(!(await page.$eval('#adulteBlock', e => e.hasAttribute('open'))),
       'il est REPLIE au chargement — rien ne s impose a l ecran');
  const resume = await page.textContent('#adulteBlock summary');
  dire(/\d/.test(resume), `et son resume annonce le nombre : « ${resume.trim()} »`);

  const ordinaires = await lieux('#worldPlaces > .wrap > div:nth-of-type(1)');
  dire(ordinaires.length > 0, `le catalogue ordinaire liste ses lieux (${ordinaires.length})`);

  console.log('\n[2] ouvrir le bloc montre le catalogue adulte, et lui seul');
  await page.click('#adulteBlock summary');
  await page.waitForTimeout(150);
  dire(await page.$eval('#adulteBlock', e => e.hasAttribute('open')), 'le bloc est ouvert');
  const adultes = await lieux('#adulteBlock');
  dire(adultes.length > 0, `il liste ses propres lieux (${adultes.length})`);
  dire(!adultes.some(a => ordinaires.includes(a)),
       'et aucun d eux n apparait dans le catalogue ordinaire');

  console.log('\n[3] les deux inspecteurs sont independants');
  await page.click('#worldPlaces > .wrap > div:nth-of-type(1) [data-place-row]');
  await page.waitForTimeout(120);
  await page.click('#adulteBlock [data-place-row]');
  await page.waitForTimeout(120);
  const ouverts = await page.$$eval('#worldPlaces section textarea', e => e.length);
  dire(ouverts >= 2,
       `ouvrir un lieu adulte ne ferme pas l inspecteur ordinaire (${ouverts} champs ouverts)`);

  console.log('\n[4] aller-retour : ajouter un lieu adulte, puis le retirer');
  const avant = await lieux('#adulteBlock');
  await page.click('#adulteBlock button:has-text("+ Ajouter un lieu adulte")');
  await page.waitForTimeout(150);
  /* Les champs de PlaceInspector n'ont ni `name` ni `id` : on les vise par
     leur ordre dans le formulaire, qui est celui du libelle affiche —
     identifiant, nom, intention, puis le prompt en textarea. */
  const champs = await page.$$('#adulteBlock section input');
  dire(champs.length >= 3, `le formulaire de creation est ouvert (${champs.length} champs)`);
  await champs[0].fill(NEUF);
  await champs[1].fill('Essai fumigation');
  await champs[2].fill('boudoir');
  await page.fill('#adulteBlock section textarea', 'a plain room, wide shot');
  await page.click('#adulteBlock button:has-text("Enregistrer le lieu")');
  await page.waitForTimeout(700);
  const apres = await lieux('#adulteBlock');
  dire(apres.length === avant.length + 1, `le lieu est enregistre (${avant.length} -> ${apres.length})`);

  await page.reload({ waitUntil: 'networkidle' });
  await page.click('#adulteBlock summary');
  await page.waitForTimeout(200);
  dire((await lieux('#adulteBlock')).length === avant.length + 1,
       'et il survit au rechargement : le fichier a bien ete ecrit');

  /* La confirmation est la boite partagee de `chrome/ConfirmContext` : son
     bouton d'accord porte l'id #cfOui, et son libelle est celui que
     l'appelant a choisi (« Retirer » ici). */
  await page.click('#adulteBlock button[aria-label*="Essai fumigation"]');
  await page.waitForSelector('#cfOui');
  await page.click('#cfOui');
  await page.waitForTimeout(800);
  const fin = await lieux('#adulteBlock');
  dire(fin.length === avant.length && !fin.includes('Essai fumigation'),
       `le catalogue est revenu a son etat de depart (${fin.length})`);

  console.log('\n[5] aucune erreur JS sur tout le parcours');
  dire(erreurs.length === 0, `${erreurs.length} erreur(s)`);
  erreurs.forEach(e => console.log('      ' + e));

  console.log(`\n${'='.repeat(70)}`);
  console.log(ko === 0 ? 'tout est vert' : `${ko} ECHEC(S)`);
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
