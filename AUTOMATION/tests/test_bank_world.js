/* Browser smoke test of « + Depuis le monde » in the Banque (21/09).

   Ce geste n'existait pour AUCUN lieu : une banque n'était semée depuis son
   monde qu'à la création du personnage. Il sert les lieux ordinaires comme les
   lieux adultes, et ce test tient ce qui sépare les seconds des premiers :

     1. UN PERSONNAGE ARMÉ voit les lieux adultes que sa banque n'a pas, dans
        une section à part, annoncés au cran natif ;
     2. EN CHOISIR UN crée une scène au NIVEAU NATIF que /api/creative annonce,
        avec la tenue « nothing at all » à ce niveau — le niveau est lu, jamais
        deviné par l'écran ;
     3. UN PERSONNAGE NON ARMÉ ne voit AUCUN lieu adulte, ni section grisée ni
        phrase qui l'inviterait à armer — « off par défaut » (ADR-0003) ;
     4. RIEN N'EST ÉCRIT : le geste ajoute un brouillon, la banque n'est jamais
        enregistrée, et le disque est vérifié intact à la fin.

   AUCUNE DONNÉE MODIFIÉE, PAR CONSTRUCTION. Le lieu adulte « manquant » est
   INJECTÉ dans la réponse du catalogue par interception réseau — la banque de
   Léna tient déjà les deux lieux réels. Et le personnage non armé est Léna
   elle-même, sa fiche interceptée avec `nsfw: false`. Aucun fichier, aucun
   registre ne bouge : les deux conditions se testent dans le navigateur.

   PRÉREQUIS : voir test_journal.js — run_browser_tests.py fait tout. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const FAUX = 'zz_essai_banque';
const LIEU_FAUX = { id: FAUX, label: 'Essai banque', intention: 'boudoir',
                    prompt: 'a plain room, wide shot' };

async function ouvrir(nav, { arme }) {
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
  // le lieu adulte « manquant », injecte : jamais ecrit nulle part
  await page.route('**/api/worlds/*/places-adulte*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const vraie = await route.fetch();
    const corps = await vraie.json();
    corps.places = [...(corps.places || []), LIEU_FAUX];
    await route.fulfill({ response: vraie, json: corps });
  });
  if (!arme) {
    // la MEME Lena, sa fiche interceptee desarmee : aucun registre ne bouge
    await page.route('**/api/character?*', async (route) => {
      const vraie = await route.fetch();
      const corps = await vraie.json();
      corps.nsfw = false;
      await route.fulfill({ response: vraie, json: corps });
    });
  }
  await page.goto(BASE + '/bank/scenes?character=lena', { waitUntil: 'networkidle' });
  await page.waitForSelector('#btnAddFromWorld');
  return { page, erreurs };
}

(async () => {
  const nav = await chromium.launch();
  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  const toutesErreurs = [];

  const avant = await (await fetch(BASE + '/api/scenes?character=lena')).json();
  const idsAvant = (avant.data?.scenes || avant.scenes || []).map(s => s.id);

  console.log('\n[1] personnage ARME : les lieux adultes manquants sont proposes');
  const arme = await ouvrir(nav, { arme: true });
  toutesErreurs.push(...arme.erreurs);
  const p = arme.page;
  await p.click('#btnAddFromWorld');
  await p.waitForSelector('#worldCatalogueBox[open]');
  /* Les deux catalogues se chargent en parallele : la liste adulte peut
     arriver un instant apres l'ordinaire. On attend l'element, on ne le
     suppose pas deja la. */
  const faux = await p.waitForSelector(`#worldCatalogueBox [data-pick-place="${FAUX}"]`,
                                       { timeout: 5000 }).catch(() => null);
  dire(Boolean(faux), 'le lieu adulte absent de la banque est propose');
  dire(await p.$eval(`#worldCatalogueBox [data-pick-place="${FAUX}"]`,
                     e => e.dataset.adult === '1'),
       'dans la section adulte, marque comme tel');
  const note = await p.textContent('#worldCatalogueBox section[aria-label="Lieux adultes"]');
  dire(/cran natif \(niveau \d+\)/.test(note),
       `la section annonce le cran natif : « ${(note.match(/cran natif \(niveau \d+\)/) || [''])[0]} »`);
  const dejaTenus = await p.$$eval('#worldCatalogueBox [data-pick-place]',
                                   e => e.map(x => x.dataset.pickPlace));
  dire(!dejaTenus.includes('chambre_lumiere_matin'),
       'un lieu adulte que la banque tient deja n est pas repropose');

  console.log('\n[2] le choisir cree une scene AU NIVEAU NATIF, sans tenue');
  await faux.click();
  await p.waitForSelector('#worldCatalogueBox', { state: 'detached' }).catch(() => {});
  await p.waitForTimeout(300);
  const cartes = await p.$$eval('[data-scene-card]', e => e.map(x => x.textContent));
  dire(cartes.some(t => t.includes(FAUX)), 'la carte de la scene apparait dans l atelier');
  const onglet = await p.$('[data-tab="json"]');
  if (onglet) {
    await onglet.click();
    await p.waitForTimeout(200);
    const json = await p.textContent('[data-tabpanel="json"]');
    dire(/"intensity":\s*3/.test(json), 'la scene porte l intensite du cran natif (3)');
    dire(/"3":\s*"nothing at all"/.test(json), 'et la tenue « nothing at all » a ce niveau');
    dire(/"world_ref":\s*"zz_essai_banque"/.test(json) && /"origin":\s*"world"/.test(json),
         'liee au lieu du monde, pas une scene libre');
  } else {
    dire(false, 'le composeur s ouvre sur la scene creee (onglet JSON introuvable)');
  }
  await p.close();

  console.log('\n[3] personnage NON arme : aucun lieu adulte, aucune invitation');
  const desarme = await ouvrir(nav, { arme: false });
  toutesErreurs.push(...desarme.erreurs);
  const q = desarme.page;
  await q.click('#btnAddFromWorld');
  await q.waitForSelector('#worldCatalogueBox[open]');
  await q.waitForTimeout(300);
  dire(!(await q.$('#worldCatalogueBox [data-adult]')), 'aucun lieu adulte dans la liste');
  dire(!(await q.$('#worldCatalogueBox section[aria-label="Lieux adultes"]')),
       'pas meme une section grisee');
  const texte = await q.textContent('#worldCatalogueBox');
  dire(!/adulte/i.test(texte), 'et pas un mot qui l inviterait a armer');
  /* Trouve a l'audit du 21/09 : fermee par Echap, la boite rendait le focus a
     <body> (Dialog demonte sans restaurer), et Tab repartait du haut de page. */
  await q.keyboard.press('Escape');
  await q.waitForSelector('#worldCatalogueBox', { state: 'detached' }).catch(() => {});
  dire(await q.evaluate(() => document.activeElement?.id === 'btnAddFromWorld'),
       'Echap rend le focus au bouton qui a ouvert la boite');
  await q.close();

  console.log('\n[4] rien n a ete ecrit sur le disque');
  const apres = await (await fetch(BASE + '/api/scenes?character=lena')).json();
  const idsApres = (apres.data?.scenes || apres.scenes || []).map(s => s.id);
  dire(!idsApres.includes(FAUX), 'la scene d essai n a jamais ete enregistree');
  dire(idsApres.length === idsAvant.length, `la banque a le meme nombre de scenes (${idsApres.length})`);

  console.log('\n[5] aucune erreur JS sur tout le parcours');
  dire(toutesErreurs.length === 0, `${toutesErreurs.length} erreur(s)`);
  toutesErreurs.forEach(e => console.log('      ' + e.slice(0, 160)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
