/* Browser smoke test of the Mondes screen — registry, catalogues and place
   inspector, at /worlds and /worlds/:id/places.

   L'écran existait sans fumigation — trou comblé le 21/09, le jour où il a
   gagné un second catalogue. Il a fusionné avec le registre le 25/09
   (design-pass screen-11) : une seule page à trois colonnes, deux onglets à
   la place du bloc adulte replié, et l'enregistrement rendu au DirtyBar du
   chrome. Les quatre garanties que ce test tient n'ont pas bougé, seule leur
   formulation suit l'écran.

   Ce que ce test tient :

     1. LE CATALOGUE ADULTE EST ANNONCE, JAMAIS IMPOSE : son nombre est sur
        l'onglet, et son contenu n'est monté qu'une fois l'onglet choisi.
        C'est l'arbitrage du 21/09, et c'est précisément le genre de détail
        qu'un refactor "améliore" sans le vouloir.
     2. LES DEUX CATALOGUES NE SE MELANGENT PAS. Un lieu adulte n'apparaît
        jamais dans la liste ordinaire — la garantie côté serveur a son test
        Python, celle-ci est la garantie à l'écran.
     3. DEUX SELECTIONS INDEPENDANTES : revenir à un onglet retrouve le lieu
        qu'on y avait ouvert. C'est ce que coûte un `useCatalogueEditor` par
        catalogue, et ce qu'on perdrait en n'en partageant qu'un.
     4. L'ALLER-RETOUR ECRIT VRAIMENT : un lieu adulte ajouté par le DirtyBar
        puis retiré par l'inspecteur, et le catalogue revient à son état de
        départ.

   IL NETTOIE. Le lieu qu'il crée est retiré par l'interface à la fin, et la
   liste est comparée à celle du départ — même garde que test_pose_editor.js :
   ne jamais retirer que ce que CE run a créé. Il ne crée JAMAIS de monde :
   aucune route n'en supprime un, donc il ne saurait pas nettoyer derrière lui.

   PREREQUIS : voir test_journal.js — run_browser_tests.py fait tout. */
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
  const lieux = () => page.$$eval('#worldPlaces [data-place-row] b', e => e.map(x => x.textContent.trim()));
  const onglet = (nom) => page.locator(`#worldPlaces [role="tab"]:has-text("${nom}")`);
  const ouvrir = async (nom) => {
    await page.click(`#worldPlaces [data-place-row]:has-text("${nom}")`);
    await page.waitForTimeout(150);
  };

  console.log('\n[1] les trois colonnes, et le catalogue adulte annonce sans s imposer');
  await page.goto(`${BASE}/worlds/${MONDE}/places?character=lena`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#worldPlaces [data-place-row]');
  dire(await page.$('#worlds [data-world-card]') !== null, 'le registre liste ses mondes');
  const actif = await page.$eval('#worlds [data-world-card][aria-selected="true"]', e => e.textContent);
  dire(/slow/i.test(actif), `le monde de l URL est celui qui est actif : « ${actif.trim().split('\n')[0]} »`);

  const libelleAdulte = (await onglet('Adulte').textContent()).trim();
  dire(/\d/.test(libelleAdulte), `l onglet Adulte annonce son nombre : « ${libelleAdulte} »`);
  /* Radix garde le panneau inactif dans le DOM, `hidden`, et n'en rend pas le
     contenu : ce qui compte est qu'aucun lieu adulte ne soit a l'ecran ni dans
     l'arbre d'accessibilite tant que l'onglet n'est pas choisi. Mesure, pas
     lecture — `hidden` et `display` sont deux facons de ne pas s'afficher. */
  const auChargement = await page.$eval('#adulteBlock', e => ({
    cache: e.hidden || getComputedStyle(e).display === 'none',
    lignes: e.querySelectorAll('[data-place-row]').length,
  })).catch(() => null);
  dire(auChargement === null || (auChargement.cache && auChargement.lignes === 0),
       'et aucun lieu adulte n est a l ecran au chargement — rien ne s impose');
  const ordinaires = await lieux();
  dire(ordinaires.length > 0, `le catalogue ordinaire liste ses lieux (${ordinaires.length})`);

  console.log('\n[2] l onglet Adulte montre le catalogue adulte, et lui seul');
  await onglet('Adulte').click();
  await page.waitForTimeout(200);
  dire(Boolean(await page.$('#adulteBlock')), 'le panneau adulte est monte');
  const adultes = await lieux();
  dire(adultes.length > 0, `il liste ses propres lieux (${adultes.length})`);
  dire(!adultes.some(a => ordinaires.includes(a)),
       'et aucun d eux n apparait dans le catalogue ordinaire');
  dire(Boolean(await page.$('#worldPlaces [role="alert"], #adulteBlock code')),
       'le fichier du catalogue adulte est nomme a l ecran');

  console.log('\n[3] les deux selections sont independantes');
  await ouvrir(adultes[0]);
  const titreAdulte = await page.textContent('#placeInspector header b');
  await onglet('Ordinaire').click();
  await page.waitForTimeout(200);
  await ouvrir(ordinaires[0]);
  const titreOrdinaire = await page.textContent('#placeInspector header b');
  await onglet('Adulte').click();
  await page.waitForTimeout(200);
  const retour = await page.textContent('#placeInspector header b');
  dire(retour.trim() === titreAdulte.trim(),
       `revenir a l onglet Adulte retrouve son lieu ouvert (« ${retour.trim()} »)`);
  await onglet('Ordinaire').click();
  await page.waitForTimeout(200);
  dire((await page.textContent('#placeInspector header b')).trim() === titreOrdinaire.trim(),
       `et l onglet Ordinaire le sien (« ${titreOrdinaire.trim()} »)`);

  console.log('\n[4] aller-retour : ajouter un lieu adulte par le DirtyBar, puis le retirer');
  await onglet('Adulte').click();
  await page.waitForTimeout(200);
  const avant = await lieux();
  await page.click('#worldPlaces button:has-text("+ Ajouter un lieu adulte")');
  await page.waitForSelector('#placeId');
  dire(!(await page.$('#pendingBar')), 'un formulaire vide ne declare rien au DirtyBar');
  await page.fill('#placeId', NEUF);
  await page.fill('#placeLabel', 'Essai fumigation');
  await page.fill('#placeIntention', 'boudoir');
  await page.fill('#placePrompt', 'a plain room, wide shot');
  await page.waitForSelector('#pendingBar');
  const banniere = await page.textContent('#pendingBar');
  dire(/adulte\.json/.test(banniere),
       'le DirtyBar nomme le fichier adulte, pas le fichier ordinaire');
  await page.click('#btnPendingSave');
  await page.waitForTimeout(700);
  const apres = await lieux();
  dire(apres.length === avant.length + 1, `le lieu est enregistre (${avant.length} -> ${apres.length})`);
  dire(!(await page.$('#pendingBar')), 'et la banniere disparait : plus rien en attente');

  await page.reload({ waitUntil: 'networkidle' });
  await onglet('Adulte').click();
  await page.waitForTimeout(250);
  dire((await lieux()).length === avant.length + 1,
       'il survit au rechargement : le fichier a bien ete ecrit');

  /* La confirmation est la boite partagee de `chrome/ConfirmContext` : son
     bouton d'accord porte l'id #cfOui, et son libelle est celui que
     l'appelant a choisi (« Retirer » ici). Le retrait vit dans l'en-tete de
     l'inspecteur depuis le design-pass screen-11, plus sur la ligne. */
  await ouvrir('Essai fumigation');
  await page.click('#btnPlaceRemove');
  await page.waitForSelector('#cfOui');
  await page.click('#cfOui');
  await page.waitForTimeout(800);
  const fin = await lieux();
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
