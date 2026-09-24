/* Browser smoke test of the pose BANK's own tooling (2026-09-02) — search,
   provenance/usage filters, sort, and the two mutations beyond a plain list:
   rename in place and duplicate. Distinct from test_pose_editor.js (the
   editor itself) and test_pose_extract.js (extraction) — this one never
   opens the editor.

   MIGRE LE 2026-09-24 (design-pass screen-7d). La grille de cartes est
   devenue une table, et les gestes ont suivi : les filtres sont dans la
   barre d'atelier (`#poseSearch`, `#poseProvenance`, `#poseUsage`), le tri
   se fait en cliquant l'en-tete d'une colonne, et renommer / dupliquer /
   retirer passent par l'apercu de la ligne selectionnee (`#poseInspector`)
   au lieu du menu `⋯` de la carte. Le selecteur de densite a disparu avec
   la grille : la table n'en a qu'une. `#poseGrid`, `[data-pose-card]` et
   `[data-n]` sont conserves tels quels, sur le <table> et ses <tr>.

   No ComfyUI needed: everything here works off a from-scratch pose (a
   template, never a photo).

   IT CLEANS UP, DETERMINISTICALLY. Every pose this run creates is removed
   through the interface at the end, identified by SET DIFFERENCE against
   the bank's state at the very start — never by name pattern or list
   position. A first version of this exact test guessed instead, matched
   the wrong "duplicate" candidate, and deleted a real, pre-existing pose
   during a live session (2026-09-02). Never again: the guard here compares
   the full name list before and after each mutation. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1400, height: 900 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  const cartes = () => page.$$eval('#poseGrid [data-pose-card]', e => e.map(x => x.dataset.n));

  await page.goto(BASE + '/bank/poses?character=lena', { waitUntil: 'networkidle' });
  await page.waitForSelector('#poseGrid');
  const avant = await cartes();

  console.log('\n[1] créer une pose de test via la modale, pour avoir quelque chose à manipuler');
  await page.click('#btnNewPose');
  await page.waitForSelector('#newPoseBox button:has-text("Debout")');
  await page.fill('#newPoseName', 'Pose banque test');
  await page.click('#newPoseBox button:has-text("Créer")');
  await page.waitForSelector('#poseEditor svg');
  await page.click('button:has-text("Enregistrer")');
  await page.waitForFunction(() => location.pathname.includes('/bank/poses/edit/'), null, { timeout: 5000 });
  const nom = decodeURIComponent(new URL(page.url()).pathname.split('/').pop());
  dire(nom.startsWith('pose__'), `pose créée : ${nom}`);

  await page.goto(BASE + '/bank/poses?character=lena', { waitUntil: 'networkidle' });
  await page.waitForSelector('#poseGrid');

  console.log('\n[2] recherche — filtre par nom/libellé, un résultat vide le dit explicitement');
  await page.fill('#poseSearch', 'Pose banque test');
  await page.waitForTimeout(300);
  let visibles = await cartes();
  dire(visibles.length === 1 && visibles[0] === nom, `seule la pose recherchée reste (${visibles})`);
  await page.fill('#poseSearch', 'zzz_ne_correspond_a_rien');
  await page.waitForTimeout(300);
  dire((await page.textContent('#poseGrid')).includes('Aucun squelette ne correspond'),
       'un filtre sans résultat le dit — pas une table juste vide, sans explication');
  // et il offre la sortie, au lieu de laisser chercher quel filtre mord (§S3)
  dire(await page.isVisible('#btnPoseResetFilters'), 'avec « Réinitialiser les filtres » a portee de clic');
  await page.click('#btnPoseResetFilters');
  await page.waitForTimeout(300);
  dire((await page.inputValue('#poseSearch')) === '', 'le bouton vide bien la recherche');

  console.log('\n[3] filtre provenance — "gabarit" garde une pose from-scratch (source preset)');
  await page.selectOption('#poseProvenance', 'preset');
  await page.waitForTimeout(300);
  visibles = await cartes();
  dire(visibles.includes(nom), `la pose "gabarit" reste visible sous le filtre (${visibles})`);
  await page.selectOption('#poseProvenance', 'all');

  console.log('\n[4] filtre utilisation — "non utilisées" garde une pose sans scène');
  await page.selectOption('#poseUsage', 'unused');
  await page.waitForTimeout(300);
  visibles = await cartes();
  dire(visibles.includes(nom), `non assignée à une scène, elle reste visible (${visibles})`);
  await page.selectOption('#poseUsage', 'all');

  console.log('\n[5] tri par en-tête de colonne — aria-sort suit, et un second clic inverse');
  // Le tri n'est plus un <select> : c'est la colonne elle-meme. Ce qui est
  // verifie est le CONTRAT d'accessibilite (aria-sort sur la colonne triee,
  // et sur elle seule) puis son effet reel sur l'ordre des lignes.
  await page.click('[data-sort="name"]');
  await page.waitForTimeout(200);
  const triees = await page.$$eval('#poseGrid th', e => e.map(x => x.getAttribute('aria-sort') || 'absent'));
  dire(triees.filter(v => v === 'ascending' || v === 'descending').length === 1,
       `une seule colonne se declare triee (${triees.join(' / ')})`);
  // Compare les LIBELLES, pas les noms de fichier : c'est sur eux que porte
  // le tri, et deux poses peuvent porter le meme (une serie de gabarits
  // crees a la suite). A egalite de cle, un tri stable garde l'ordre
  // d'entree dans les DEUX sens — une comparaison par nom de fichier
  // echouerait alors sur un tri parfaitement correct.
  const libelles = () => page.$$eval('#poseGrid [data-pose-card]',
    e => e.map(x => x.querySelector('td:nth-child(2) span').textContent.trim()));
  const parNom = await libelles();
  await page.click('[data-sort="name"]');
  await page.waitForTimeout(200);
  const parNomInverse = await libelles();
  dire((await page.$eval('[data-sort="name"]', e => e.closest('th').getAttribute('aria-sort'))) === 'descending',
       'le second clic sur la meme colonne inverse le sens');
  dire(parNom.length === parNomInverse.length
       && parNom.join('|') === [...parNomInverse].reverse().join('|'),
       `et les libelles sont dans l ordre inverse, pas simplement re-melanges (${parNom.join(' < ')})`);

  console.log('\n[6] renommer en place — selection de la ligne, puis le libelle de l apercu');
  await page.click(`[data-pose-card][data-n="${nom}"]`);
  await page.waitForSelector('#poseInspector');
  await page.click('#poseInspector [data-pose-label]');
  const input = page.locator('#poseInspector [data-pose-label-input]');
  await input.fill('Pose banque renommée');
  await input.press('Enter');
  await page.waitForTimeout(400);
  const labelApres = (await page.textContent('#poseInspector [data-pose-label]')).trim();
  dire(labelApres === 'Pose banque renommée', `le libellé a changé (${labelApres})`);
  // la table lit la MEME donnee que l'apercu : un libelle qui ne changerait
  // qu'a droite serait un compteur qui ment (frontend.md, « Etat visible »)
  dire((await page.textContent(`[data-pose-card][data-n="${nom}"]`)).includes('Pose banque renommée'),
       'et la ligne de la table le porte aussi');

  console.log('\n[6bis] Échap annule un renommage en cours, sans rien enregistrer');
  await page.click('#poseInspector [data-pose-label]');
  await page.locator('#poseInspector [data-pose-label-input]').fill('ceci ne doit jamais être enregistré');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const labelInchange = (await page.textContent('#poseInspector [data-pose-label]')).trim();
  dire(labelInchange === 'Pose banque renommée', `Échap a bien annulé, le libellé n'a pas bougé (${labelInchange})`);

  console.log('\n[7] dupliquer — une nouvelle ligne apparait, libelle suffixe " (copie)"');
  const avantDup = await cartes();
  await page.click('#poseInspector [data-dup]');
  await page.waitForFunction(
    (n) => document.querySelectorAll('#poseGrid [data-pose-card]').length > n,
    avantDup.length, { timeout: 5000 },
  );
  const apresDup = await cartes();
  // Jamais deviné par motif de nom ou position de liste — exactement ce
  // qui a mal tourné la première fois. La seule preuve valable est la
  // différence d'ensemble entre avant et après.
  const nouveaux = apresDup.filter((n) => !avantDup.includes(n));
  dire(nouveaux.length === 1, `exactement une nouvelle ligne est apparue (${nouveaux})`);
  const copie = nouveaux[0];
  const labelCopie = copie ? (await page.textContent(`[data-pose-card][data-n="${copie}"]`)) : '';
  dire(labelCopie.includes('Pose banque renommée (copie)'),
       `son libelle porte "(copie)" — pas un instant le nom de fichier brut (${labelCopie.trim().slice(0, 60)})`);
  dire(nom !== copie, "la pose d'origine et sa copie restent deux fichiers distincts");
  dire((await page.textContent(`[data-pose-card][data-n="${nom}"]`)).includes('Pose banque renommée'),
       "et l'originale garde son propre libelle, intact");

  console.log('\n[8] clavier — la fleche deplace la selection d une ligne');
  await page.click(`[data-pose-card][data-n="${nom}"]`);
  await page.waitForTimeout(200);
  const ordre = await cartes();
  const index = ordre.indexOf(nom);
  const descend = index + 1 < ordre.length;
  const voisine = descend ? ordre[index + 1] : ordre[index - 1];
  await page.keyboard.press(descend ? 'ArrowDown' : 'ArrowUp');
  await page.waitForTimeout(250);
  const selectionnee = await page.$$eval('#poseGrid [aria-selected="true"]', e => e.map(x => x.dataset.n));
  dire(selectionnee.length === 1 && selectionnee[0] === voisine,
       `la fleche a deplace la selection sur la ligne voisine (${selectionnee})`);

  console.log('\n[9] NETTOYAGE : retrait UNIQUEMENT des poses absentes de l\'état de départ');
  const aRetirer = (await cartes()).filter((n) => !avant.includes(n));
  console.log('   à retirer :', aRetirer);
  for (const n of aRetirer) {
    await page.click(`[data-pose-card][data-n="${n}"]`);
    await page.waitForSelector('#poseInspector [data-del]');
    await page.click('#poseInspector [data-del]');
    await page.waitForSelector('#armBox[open]');
    await page.click('#cfOui');
    await page.waitForTimeout(500);
  }
  const final = await cartes();
  dire(final.length === avant.length && avant.every((n) => final.includes(n)),
       `la banque est revenue exactement à son état de départ (${final})`);

  console.log('\n[10] aucune erreur JS réelle sur tout le parcours');
  const reelles = erreurs.filter(e => !/Failed to load resource.*404/.test(e));
  dire(reelles.length === 0, `${reelles.length} erreur(s)`);
  reelles.forEach(e => console.log('      ' + e.slice(0, 150)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
