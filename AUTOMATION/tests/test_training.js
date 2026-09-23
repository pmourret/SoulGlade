/* Browser smoke test of the Entraînement screen (2026-09-10).

   WHAT IT HOLDS, and why each one is here rather than in a unit test:

     1. The screen mounts on a DEEP LINK and the navbar lights `training` — a
        destination reachable only by typing a URL is not a destination.
     2. THE NUMBERS ON SCREEN ARE THE NUMBERS THE ROUTE RETURNED. « file » and
        « exportables » are two different counts (an embedding survives the
        disappearance of its PNG), and a screen that merged them would be a
        count hiding its own margin. Read through `data-count`, the explicit
        contract, and compared with the JSON.
     3. The excluded list names a REASON per row. A training set that hides
        its rejections is one nobody can argue with.
     4. The export gesture is wired end to end — payload, pending state,
        toast — WITHOUT the export ever running. The POST is intercepted:
        a real one copies ~75 Mo and writes a dated folder that the backend
        then refuses to overwrite. A smoke test does not manufacture a piece
        of history.
     5. Leaving the repetitions field empty sends `null`, never a number the
        screen invented. It is a training setting; it belongs to the user.
     6. The 409 « une production tourne » reaches the screen as its French
        message, verbatim.
     7. Changing character reloads the set without reloading the page.
     8. No JS error over the whole run.

   PREREQUISITES — identical to test_journal.js, run_browser_tests.py does them.
     node AUTOMATION/tests/test_training.js */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const ECRAN = `${BASE}/training?character=lena`;

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1500, height: 900 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  const compte = (k) => page.$eval(`[data-count="${k}"]`,
    e => Number(e.firstChild.textContent.trim()));

  console.log('\n[1] le lien profond ouvre l ecran, et la navbar l allume');
  await page.goto(ECRAN, { waitUntil: 'networkidle' });
  dire(await page.isVisible('#training'), "l'ecran Entrainement est monte");
  dire(await page.evaluate(() => location.pathname) === '/training',
       'le chemin est /training');
  // Deux grains depuis le 23/09 : la categorie en en-tete, le module en
  // sous-barre. Entrainement vit dans Atelier.
  const allume = await page.$$eval('.tabs .cat.on', els => els.map(e => e.dataset.s));
  dire(allume.length === 1 && allume[0] === 'atelier',
       `une seule categorie allumee, et c'est atelier (${allume.join(',') || 'aucune'})`);
  const mod = await page.$$eval('.modbar .mod.on', els => els.map(e => e.dataset.m));
  dire(mod.length === 1 && mod[0] === 'training',
       `un seul module allume, et c'est training (${mod.join(',') || 'aucun'})`);

  console.log('\n[2] les nombres a l ecran sont ceux que la route a rendus');
  const json = await page.evaluate(async () =>
    (await fetch('/api/training/proposal?character=lena')).json());
  dire(json.ok === true, 'la route repond');
  for (const k of ['file', 'exportables', 'ecartes', 'sans_etiquette']) {
    dire(await compte(k) === json.compteurs[k],
         `${k} : ${json.compteurs[k]} a l'ecran comme dans la reponse`);
  }
  // LE PIEGE QUE CETTE LIGNE FERME : fondre les deux en « N images pretes »
  // serait un compte qui cache sa marge, donc un compte faux.
  dire(json.compteurs.sans_fichier === 0
       || (await compte('file')) !== (await compte('exportables')),
       `file et exportables restent deux nombres distincts `
       + `(${json.compteurs.file} / ${json.compteurs.exportables})`);

  console.log('\n[3] les ecartees sont listees AVEC leur raison');
  if (json.ecartes.length) {
    const resume = await page.textContent('details.adv summary');
    dire(/\d+ image\(s\) ecartee|\d+ image\(s\) écartée/.test(resume),
         `le repli les annonce : « ${resume.trim().slice(0, 70)} »`);
    await page.click('details.adv summary');
    await page.waitForTimeout(150);
    const raisons = await page.$$eval('details.adv tbody tr td:nth-child(2)',
      c => c.map(x => x.textContent.trim()));
    dire(raisons.length > 0 && raisons.every(r => r.length > 0),
         `${raisons.length} ligne(s), chacune avec sa raison`);
  } else {
    dire(true, 'aucune ecartee sur ce personnage — rien a lister');
  }

  console.log('\n[4] le champ de repetitions est un vrai champ etiquete');
  const pourQui = await page.getAttribute('label[for="trainRepetitions"]', 'for');
  dire(pourQui === 'trainRepetitions',
       'un <label for>, jamais un <span> pose a cote');
  dire(await page.getAttribute('#trainRepetitions', 'placeholder') === 'défaut',
       'et vide veut dire « defaut », pas zero');

  console.log('\n[5] l export part avec le bon corps — sans jamais s executer');
  // INTERCEPTE : un vrai export copie ~75 Mo et ecrit un dossier date que le
  // backend refusera ensuite d'ecraser. On verifie le cablage, pas la copie.
  /* ON REMPLACE `window.fetch`, PAS LA ROUTE PLAYWRIGHT, et c'est le seul
     point de ce test qui a demande deux essais : `route.request().postData()`
     rend `null` sur ce corps-la — on ne voyait donc pas ce que l'ecran envoie,
     qui est precisement ce qu'on verifie. Le stub lit le corps la ou il est
     ecrit, et aucune requete ne part : pas de 409 dans le journal reseau du
     navigateur, donc pas de fausse erreur en section [8] non plus. */
  await page.evaluate(() => {
    window.__envois = [];
    window.__reponse = { status: 200, corps: {} };
    const vrai = window.fetch.bind(window);
    window.fetch = (url, init) => {
      /* Chemin EXACT et methode POST, jamais un `includes` : `/api/training/
         exports` (l'historique, en GET) porte `/api/training/export` comme
         prefixe. Un stub trop large l'avalait et faisait echouer le
         rechargement d'apres-export sur un `init.body` inexistant. */
      const chemin = new URL(String(url), location.origin).pathname;
      if (init && init.method === 'POST' && chemin === '/api/training/export') {
        window.__envois.push(JSON.parse(init.body));
        return Promise.resolve(new Response(JSON.stringify(window.__reponse.corps),
          { status: window.__reponse.status,
            headers: { 'Content-Type': 'application/json' } }));
      }
      return vrai(url, init);
    };
  });
  const succes = { ok: true, dossier: 'D:/faux/20260910-120000',
    dossier_images: 'D:/faux/20260910-120000/dataset/8_lenadaab', images: 24,
    declencheur: 'lenadaab', declencheur_cree: false, famille: 'flux',
    repetitions: 8, script: 'flux_train_network.py', legendes: { prompt: 24 } };
  const dernierEnvoi = () => page.evaluate(() => window.__envois.at(-1) ?? null);

  const actif = await page.isEnabled('#btnTrainExport');
  if (actif) {
    await page.evaluate((c) => { window.__reponse = { status: 200, corps: c }; }, succes);
    await page.click('#btnTrainExport');
    await page.waitForTimeout(400);
    const vide = await dernierEnvoi();
    dire(vide !== null && vide.repetitions === null,
         `champ vide -> repetitions: null, jamais un nombre invente `
         + `(${JSON.stringify(vide)})`);
    dire((await page.textContent('body')).includes('24 image(s) exportées'),
         'le compte-rendu remonte a l ecran');

    await page.fill('#trainRepetitions', '5');
    await page.click('#btnTrainExport');
    await page.waitForTimeout(400);
    const saisi = await dernierEnvoi();
    dire(saisi !== null && saisi.repetitions === 5,
         `le nombre saisi part tel quel (${JSON.stringify(saisi)})`);
    await page.fill('#trainRepetitions', '');
  } else {
    dire(true, 'rien d exportable sur ce personnage : le bouton est desactive');
    dire(true, 'rien a envoyer non plus');
    dire((await page.textContent('#training')).includes('aucune image de la file'),
         'et l ecran dit pourquoi, plutot que de laisser un bouton mort');
  }

  console.log('\n[6] un 409 remonte son message francais, tel quel');
  if (actif) {
    await page.evaluate(() => {
      window.__reponse = { status: 409,
        corps: { ok: false, erreur: 'une production tourne — export après' } };
    });
    await page.click('#btnTrainExport');
    await page.waitForTimeout(400);
    dire((await page.textContent('body')).includes('une production tourne'),
         'le refus s affiche mot pour mot, jamais reecrit');
  } else {
    dire(true, 'bouton desactive : rien a refuser');
  }

  console.log('\n[7] changer de personnage recharge le jeu, pas la page');
  await page.evaluate(() => { window.__temoinSansRechargement = 'vivant'; });
  await page.click('#btnId');
  await page.waitForSelector('#idMenu.on a[href*="abyssiaelle"]');
  await page.click('#idMenu a[href*="abyssiaelle"]');
  await page.waitForTimeout(900);
  dire(await page.evaluate(() => window.__temoinSansRechargement) === 'vivant',
       'le temoin a survecu : aucun rechargement');
  dire(await page.evaluate(() => location.pathname) === '/training',
       'on est reste sur le meme ecran');
  dire((await page.evaluate(() => location.search)).includes('character=abyssiaelle'),
       '?character= a suivi dans l URL');
  // Un jeu d'entrainement appartient a UN personnage : l'ecran doit avoir
  // rejoue sa lecture, et montrer l'etat de l'autre — meme vide.
  const apres = await page.textContent('#training');
  dire(/Proposition d|Pas de proposition|Aucune donnée|indisponible/.test(apres),
       "l'ecran s'est recharge pour l'autre personnage");

  console.log('\n[8] aucune erreur JS sur tout le parcours');
  dire(erreurs.length === 0, `${erreurs.length} erreur(s)`);
  erreurs.forEach(e => console.log('      ' + e.slice(0, 150)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
