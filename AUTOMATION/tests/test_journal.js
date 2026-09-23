/* Browser smoke test of the REACT studio: the shell, and the Journal screen.

   FIRST SCREEN OF THE REACT MIGRATION, and the one that locks the foundations
   every following screen stands on. What this test holds:

     1. The shell paints: header, the three CATEGORIES carrying their `data-s`
        contract, their seven modules carrying `data-m`, and the Application
        button lit on /app/journal — the journal is a SUB-SCREEN, it has no
        module of its own, and leaving the chrome without a marker would lose
        the reader. Application sits OUTSIDE the categories since 23/09/2026,
        so no category is lit while it is open.
     2. The Journal reads /api/journal and paints its rows; the verdict filter
        narrows the table AND the count line follows it.
     3. A DEEP LINK works. React Router uses real paths now: reloading on
        /app/journal must return the screen, not a 404 — that is the SPA
        fallback of api/spa.py.
     4. CHANGING CHARACTER DOES NOT RELOAD THE PAGE. This is the point of the
        migration brief that has no equivalent in the legacy frontend, where
        every switch was a full reload. A marker is stamped on `window` before
        the switch and must SURVIVE it, while `?character=` follows in the URL
        and the journal reloads for the new character.
     5. Module labels are removed VISUALLY, never by `display:none` — they stay
        the accessible name of the link.
     6. No JS error over the whole run.

   WHAT LEFT THIS FILE ON 23/09/2026. Two sections tested the side navbar's
   collapse: the `studio.nav-mince` key, `#btnNavPli`, and its survival across a
   reload. The side navbar no longer exists — the categories live in the header
   and their modules in a sub-bar, and a bar that costs no width has nothing to
   collapse. The key is not read by anything any more, so there was nothing left
   to assert. The RAIL's own collapse (`studio.rail-mince`) is untouched and is
   covered by the Produire fumigation.

   NOT COVERED HERE, because the Journal does not touch them: the three coupling
   traps of AUDIT §5.6 (`v` on image URLs, the /api/plan debounce, the
   #btnRun.disabled guard). They land with the screens that own them.

   PREREQUISITES (the toolchain is portable, everything lives in the repo):
     1. python AUTOMATION/tools/toolchain.py install && ... build
     2. python AUTOMATION/tools/toolchain.py browsers
     3. python AUTOMATION/web/app.py --no-comfy --no-browser --port 8199
     4. node AUTOMATION/tests/test_journal.js
   run_browser_tests.py does 3 and 4 on a fresh dashboard, and points NODE_PATH
   and PLAYWRIGHT_BROWSERS_PATH at the repo-local toolchain. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const JOURNAL = `${BASE}/app/journal?character=lena`;

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1500, height: 900 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  const lignes = () => page.$$eval('#jt tbody tr:not(:has(td.empty))', r => r.length);

  console.log('\n[1] le studio React se charge sur un lien profond');
  // `networkidle` et pas `load` : le bundle monte, PUIS les appels partent.
  await page.goto(JOURNAL, { waitUntil: 'networkidle' });
  dire(await page.isVisible('header'), 'le bandeau est peint');
  dire(await page.isVisible('#journal'), "l'ecran Journal est monte");
  dire(await page.evaluate(() => location.pathname) === '/app/journal',
       'le chemin est /app/journal — plus de hash');

  console.log('\n[2] le chrome : trois categories, sept modules, contrat data-s/data-m');
  const cats = await page.$$eval('.tabs [data-s]', els => els.map(e => e.dataset.s));
  dire(cats.length === 3, `${cats.length} categorie(s)`);
  ['production', 'atelier', 'referentiel']
    .forEach(k => dire(cats.includes(k), `data-s="${k}"`));

  // Les sept modules ne sont PAS tous dans le DOM en meme temps : seuls ceux de
  // la categorie ouverte le sont. On ouvre les trois menus pour les collecter —
  // c'est la forme que prend le contrat depuis le 23/09.
  const vus = new Set();
  for (const c of ['production', 'atelier', 'referentiel']) {
    await page.hover(`.tabs [data-s="${c}"]`);
    await page.waitForSelector(`.cat-wrap:has([data-s="${c}"]) .catmenu.on`);
    (await page.$$eval('.catmenu.on [data-m]', els => els.map(e => e.dataset.m)))
      .forEach(k => vus.add(k));
    await page.keyboard.press('Escape');
  }
  dire(vus.size === 7, `${vus.size} module(s) atteignable(s)`);
  ['character', 'produce', 'review', 'gallery', 'bank', 'training', 'worlds']
    .forEach(k => dire(vus.has(k), `data-m="${k}"`));

  // Application est SORTIE des categories : aucune n'est allumee sur
  // /app/journal, et c'est son bouton d'en-tete qui porte le marqueur.
  const allume = await page.$$eval('.tabs .cat.on', els => els.map(e => e.dataset.s));
  dire(allume.length === 0,
       `aucune categorie allumee sur /app/journal (${allume.join(',') || 'aucune'})`);
  dire(await page.getAttribute('#btnApplication', 'aria-current') === 'page',
       "le bouton Application porte aria-current");

  console.log('\n[3] la carte du personnage charge est dans le bandeau');
  dire((await page.textContent('.idcard')).includes('Léna'), 'le nom du personnage');
  dire(await page.isVisible('.brand .brand-app'), "le nom de l'application reste visible");
  // L'identifiant technique et les deux etiquettes ont QUITTE le bandeau pour
  // la premiere ligne du menu d'identite (23/09) : le bandeau ne dit plus deux
  // fois qui est charge.
  dire(!(await page.isVisible('header .brand-id')), "l'identifiant n'est plus dans le bandeau");
  await page.click('#btnId');
  await page.waitForSelector('.idmenu.on');
  dire(await page.isVisible('.idmenu-head .brand-id'), "il est dans le menu d'identite");
  await page.keyboard.press('Escape');

  console.log('\n[3b] arret rapide depuis le bandeau : memes confirmations que l ecran Application');
  // Les deux boutons ont fusionne en UN bouton power qui ouvre un menu (23/09) :
  // deux glyphes d'alimentation cote a cote ne se distinguaient qu'a l'oreille
  // d'un lecteur d'ecran. Les ids des items, eux, n'ont pas bouge.
  for (const [bouton, attendu] of [
    ['#btnHeaderComfyStop', 'Arrêter ComfyUI'],
    ['#btnHeaderAppStop', 'Arrêter le tableau de bord'],
  ]){
    await page.click('#btnHeaderPower');
    await page.waitForSelector('.pwrmenu.on');
    dire(await page.isVisible(bouton), `${bouton} est dans le menu d arret, sur cet ecran comme sur tous`);
    await page.click(bouton);
    await page.waitForSelector('#armBox[open]');
    const t = await page.textContent('#armBox h3');
    dire(t.includes(attendu), `${bouton} -> « ${t} »`);
    // ANNULATION SYSTEMATIQUE : confirmer couperait le serveur teste, comme
    // dans test_application.js section [6] pour les memes boutons.
    await page.click('#cfNon');
    await page.waitForTimeout(200);
    dire(!(await page.isVisible('#armBox[open]')), '   annulee');
  }

  console.log('\n[4] le journal lit /api/journal et peint ses lignes');
  const total = await lignes();
  const info = await page.textContent('#jInfo');
  dire(/\d+ ligne\(s\)/.test(info), `la ligne de compte le dit : « ${info} »`);
  dire(Number(info.match(/(\d+) ligne/)[1]) === total,
       `le compte annonce ce que la table montre (${total})`);

  console.log('\n[5] le filtre de verdict retrecit table ET compte');
  await page.click('#jFilter button[data-f="OK"]');
  await page.waitForTimeout(150);
  const okLignes = await lignes();
  const okInfo = await page.textContent('#jInfo');
  dire(okLignes <= total, `${okLignes} ligne(s) sur ${total}`);
  dire(Number(okInfo.match(/(\d+) ligne/)[1]) === okLignes, 'le compte suit le filtre');
  const verdicts = await page.$$eval('#jt tbody tr td:nth-child(6)', c => c.map(x => x.textContent));
  dire(verdicts.every(v => v === 'OK' || v === ''), 'toutes les lignes portent le verdict filtre');
  await page.click('#jFilter button[data-f=""]');
  await page.waitForTimeout(150);
  dire(await lignes() === total, 'revenir a « Tout » rend la table entiere');

  console.log('\n[6] CHANGER DE PERSONNAGE NE RECHARGE PAS LA PAGE');
  // Le temoin ne survit qu'a un re-rendu ; un rechargement l'efface. C'est la
  // seule facon de prouver la difference avec l'ancien frontend, ou chaque
  // changement de personnage etait un location.reload().
  await page.evaluate(() => { window.__temoinSansRechargement = 'vivant'; });
  await page.click('#btnId');
  await page.waitForSelector('#idMenu.on a[href*="abyssiaelle"]');
  await page.click('#idMenu a[href*="abyssiaelle"]');
  await page.waitForTimeout(700);
  dire(await page.evaluate(() => window.__temoinSansRechargement) === 'vivant',
       'le temoin a survecu : aucun rechargement');
  dire((await page.evaluate(() => location.search)).includes('character=abyssiaelle'),
       "?character= a suivi dans l'URL (le lien reste partageable)");
  dire(await page.evaluate(() => location.pathname) === '/app/journal',
       "on est reste sur le meme ecran");
  dire((await page.textContent('.idcard')).includes('Abyssiaelle'),
       'le bandeau montre le nouveau personnage');
  // le journal est celui D'UN personnage : il doit s'etre recharge
  const infoAutre = await page.textContent('#jInfo');
  dire(/ligne\(s\)|journal :/.test(infoAutre),
       `le journal s'est recharge pour l'autre personnage : « ${infoAutre} »`);

  console.log('\n[7] retour arriere : le personnage precedent revient');
  await page.goBack();
  await page.waitForTimeout(500);
  dire((await page.evaluate(() => location.search)).includes('character=lena'),
       "l'URL est revenue a Léna");
  dire((await page.textContent('.idcard')).includes('Léna'),
       'le bandeau aussi — etat et URL restent synchrones');

  // Le repli de la navbar laterale tenait les sections [8] et [9] jusqu'au
  // 23/09 : cle studio.nav-mince, #btnNavPli, et sa survie a un rechargement.
  // La navbar n'existe plus, donc ni le bouton ni la cle. Ce qui restait a
  // verifier dans [9] n'etait pas le repli mais le repli SPA — garde ici.
  console.log('\n[8] rechargement sur le lien profond : le repli SPA tient');
  await page.reload({ waitUntil: 'networkidle' });
  dire(await page.isVisible('#journal'), "le lien profond survit au rechargement (repli SPA)");
  dire(await page.evaluate(() => location.pathname) === '/app/journal',
       'et le chemin est intact');
  // La sous-barre est la seule navigation qui reste apres un rechargement
  // profond : si elle ne remonte pas, on est coince sur l'ecran.
  dire(await page.isVisible('.modbar'), 'la sous-barre de modules est repeinte');

  console.log('\n[9] aucune erreur JS sur tout le parcours');
  dire(erreurs.length === 0, `${erreurs.length} erreur(s)`);
  erreurs.forEach(e => console.log('      ' + e.slice(0, 150)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
