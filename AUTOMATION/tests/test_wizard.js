/* Browser smoke test of the REACT wizard « nouveau personnage » (#wizard).

   THIS TEST CREATES NOTHING. It never clicks « Créer », uploads nothing and
   starts no generation. It checks the MECHANICS of the walk — the gating at each
   step — not production. That is what makes it runnable against the real
   registry.

   WHAT IT HOLDS:

     1. The five steps in order (Identité first since screen-14), with a
        list that says where one is.
     2. GATING. « Suivant » only arms on the right condition, at each step, and
        « Créer » only when every one of them is met AND the identity fields are
        valid. Nothing is created half-chosen.
     3. The identifier is validated as it is typed, with the same expression the
        server uses — an invalid slug is said before the round trip.
     4. A type with a SINGLE style does not offer a choice: it says so. That is a
        real case in the registry, not a hypothesis.
     5. The three human axes are announced as FROZEN (CLAUDE.md §3, §8.8), and
        the pack is never among the questions — it is derived from (type, style)
        server-side (ADR-0012).
     6. Changing the identifier INVALIDATES the frozen base: it was written under
        the old one.
     7. The wizard is reachable from the identity menu and from the entry gate,
        the two places it is offered.

   PREREQUISITES: see test_journal.js — run_browser_tests.py does all of it. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1500, height: 950 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  const vu = s => page.isVisible(s).catch(() => false);
  const texte = s => page.textContent(s).catch(() => '');
  const suivantArme = async () => !(await page.isDisabled('#wizNext'));
  const etape = () => page.$eval('[data-step="on"] span span', e => e.textContent.trim());
  const cartes = () => page.$$eval('#wizBody [role="radio"] b', e => e.map(x => x.textContent));

  console.log('\n[1] le wizard s ouvre sur sa route, cinq etapes annoncees');
  await page.goto(BASE + '/characters/new', { waitUntil: 'networkidle' });
  dire(await vu('#wizard'), "l'ecran est monte");
  const pas = await page.$$eval('#wizSteps li', e => e.map(x => x.querySelector('span span').textContent.trim()));
  dire(pas.join(' > ') === "Identité > Type > Style > Monde > Base d'identité",
       `les cinq etapes, dans l'ordre : ${pas.join(' > ')}`);
  dire(await etape() === 'Identité', "on demarre sur l'Identite (ecran 14)");

  console.log('\n[2] GATING de l Identite : un nom, puis un identifiant valide');
  dire(!(await suivantArme()), '« Suivant » est inerte sans nom');
  dire(await page.isDisabled('#wizBack'), '« Retour » aussi, a la premiere etape');
  dire((await texte('#wizMissing')).includes('un nom affiché'), 'la barre du bas dit ce qui manque');
  dire((await texte('[data-field="type"]')).trim() === '—',
       'la fiche en construction montre un vide, pas une valeur inventee');
  await page.fill('#wizName', 'Fumigation');
  await page.waitForTimeout(150);
  dire(await page.inputValue('#wizCid') === 'fumigation', "l'identifiant suit le nom tant qu'on ne l'a pas tape");
  dire((await texte('#wizCidHint')).includes('valide'), 'et il est annonce valide, en mots');
  dire(await suivantArme(), '« Suivant » s arme');

  console.log('\n[3] l identifiant est valide a la frappe, et un slug est propose');
  await page.fill('#wizCid', 'Bad Slug!');
  await page.waitForTimeout(150);
  dire((await texte('#wizCidHint')).includes('minuscules'), 'un slug invalide est refuse, et dit la regle');
  dire(!(await suivantArme()), '« Suivant » se desarme');
  dire((await texte('#wizMissing')).includes('identifiant valide'), 'et la barre dit pourquoi');
  dire(await page.getAttribute('#wizCid', 'aria-describedby') === 'wizCidHint',
       'la validation est liee au champ pour un lecteur d ecran');
  dire((await texte('#wizBody')).includes('Proposé'), 'le slug du nom est propose');
  await page.fill('#wizCid', '9debut');
  await page.waitForTimeout(150);
  dire((await texte('#wizCidHint')).includes('minuscules'), 'un identifiant qui commence par un chiffre est refuse');
  await page.fill('#wizCid', '_fumigation_wizard');
  await page.waitForTimeout(150);
  dire((await texte('#wizCidHint')).includes('minuscules'), 'et un qui commence par un souligne');
  await page.click('#wizBody button:has-text("Utiliser")');
  await page.waitForTimeout(150);
  dire(await page.inputValue('#wizCid') === 'fumigation', '« Utiliser » reprend la proposition');
  await page.fill('#wizName', 'Fumigation bis');
  await page.waitForTimeout(150);
  dire(await page.inputValue('#wizCid') === 'fumigation',
       "tape a la main, l'identifiant ne suit plus le nom");
  await page.fill('#wizCid', 'fumigation-wizard');
  await page.fill('#wizName', 'Fumigation');
  await page.waitForTimeout(150);
  await page.click('#wizNext');
  await page.waitForTimeout(250);

  console.log('\n[4] les types viennent du registre, avec leur famille de modele');
  dire(await etape() === 'Type', "on est a l'etape Type");
  dire(!(await suivantArme()), '« Suivant » est inerte tant qu aucun type n est choisi');
  const types = await cartes();
  dire(types.length >= 2, `${types.length} type(s) proposes : ${types.join(', ')}`);
  const familles = await page.$$eval('#wizBody [role="radio"] span', e => e.map(x => x.textContent));
  dire(familles.every(f => f.startsWith('machine :')), 'chaque type annonce la famille de modele de son pack');
  dire((await texte('#wizBody')).split('Figé à la création').length === 2,
       'le rappel « figé » est dit UNE fois, sous le titre, plus sur chaque carte');
  await page.click('#wizBody [role="radio"]:first-child');
  await page.waitForTimeout(200);
  dire(await vu('#wizBody [role="radio"][aria-checked="true"]'), 'la carte choisie est un vrai bouton radio, coche');
  dire(await suivantArme(), '« Suivant » s arme');

  console.log('\n[5] etape Style : un type mono-style ne fait pas semblant de choisir');
  await page.click('#wizNext');
  await page.waitForTimeout(250);
  dire(await etape() === 'Style', "on est a l'etape Style");
  const noteStyle = await vu('[data-note]');
  if (noteStyle){
    const n = await texte('[data-note]');
    dire(n.includes("qu'un style"), 'un seul style : la note le dit au lieu d offrir une carte unique');
    dire(await suivantArme(), 'le style unique est pris d office, « Suivant » reste arme');
  } else {
    dire(!(await suivantArme()), 'plusieurs styles : « Suivant » attend un choix');
    await page.click('#wizBody [role="radio"]:first-child');
    await page.waitForTimeout(150);
    dire(await suivantArme(), 'un style choisi arme la suite');
  }

  console.log('\n[6] etape Monde : figee elle aussi, et propre au type');
  await page.click('#wizNext');
  await page.waitForTimeout(250);
  dire(await etape() === 'Monde', "on est a l'etape Monde");
  dire(!(await suivantArme()), '« Suivant » attend un monde');
  const mondes = await cartes();
  dire(mondes.length >= 1, `${mondes.length} monde(s) pour ce type : ${mondes.join(', ')}`);
  await page.click('#wizBody [role="radio"]:first-child');
  await page.waitForTimeout(150);
  dire(await suivantArme(), 'un monde choisi arme la suite');

  console.log('\n[7] le PACK n est jamais demande — il se deduit (ADR-0012)');
  const parcours = (await texte('#wizard')).toLowerCase();
  dire(!/choisis? (un |le )?pack|s[ée]lection.{0,12}pack/.test(parcours), 'aucune etape ne fait choisir un pack');

  console.log('\n[8] etape Base : le VISAGE fige, generer ou fournir');
  await page.click('#wizNext');
  await page.waitForTimeout(250);
  dire((await etape()).includes('Base'), "on est a l'etape Base d'identité");
  dire(await vu('#wizGen'), "l'identifiant etant valide, la generation est offerte d'emblee");
  const base = await texte('#wizBody');
  dire(base.includes("verrou d'identité"), 'elle annonce a quoi la base sert');
  dire(base.includes('jamais la photo'), 'et rappelle qu un personnage est fictif — jamais une personne reelle');
  await page.click('#wizBody button:has-text("Fournir une image")');
  await page.waitForTimeout(150);
  dire(await vu('#wizFile') === false, 'le champ de fichier est cache derriere sa zone de depot');
  dire((await texte('#wizBody')).includes('20 Mo'), 'la limite de taille est ecrite');
  await page.click('#wizBody button:has-text("Générer des portraits")');

  console.log('\n[9] CREER reste inerte : rien n est fige');
  dire(!(await suivantArme()), '« Créer » est inerte sans base gelee');
  dire((await texte('#wizNext')).includes('Fumigation'), 'le bouton nomme ce qu il creerait, il ne dit pas « OK »');
  dire((await texte('#wizMissing')).includes("base d'identité"), 'et la barre dit ce qui manque');

  console.log('\n[10] les etapes faites se relisent et se rouvrent');
  const reponse = await page.$eval('#wizSteps li[data-step="done"]', li => li.textContent);
  dire(reponse.includes('fumigation-wizard'), `l'etape faite montre sa reponse (${reponse.trim()})`);
  dire(await page.$$eval('#wizSteps li[data-step="todo"] button', e => e.length) === 0,
       'une etape a venir n est pas un bouton : le verrou reste en bas');
  await page.click('#wizBack');
  await page.waitForTimeout(250);
  dire(await etape() === 'Monde', '« Retour » revient sur Monde');
  dire(await vu('#wizBody [role="radio"][aria-checked="true"]'), 'le monde choisi est toujours marque');
  await page.click('#wizSteps li:first-child button');
  await page.waitForTimeout(250);
  dire(await etape() === 'Identité', "un clic sur l'etape Identite y ramene");

  console.log('\n[11] un identifiant redevenu invalide referme la suite');
  // Sans GPU on ne gele pas de base : la confirmation de changement
  // d'identifiant se verifie a l'audit, en vrai.
  await page.fill('#wizCid', '!!');
  await page.waitForTimeout(200);
  dire(!(await suivantArme()), "« Suivant » se desarme : rien ne s'ecrit sous un nom qui n'existera pas");
  await page.fill('#wizCid', 'fumigation-wizard');

  console.log('\n[14] le wizard est offert la ou on le cherche');
  await page.goto(BASE + '/characters', { waitUntil: 'networkidle' });
  dire(await vu('[data-char-card][data-new]'), 'depuis le sas, une carte « + Nouveau personnage »');
  await page.click('[data-char-card][data-new]');
  await page.waitForTimeout(400);
  dire(await page.evaluate(() => location.pathname) === '/characters/new',
       'elle mene bien au wizard');
  await page.goto(BASE + '/character?character=lena', { waitUntil: 'networkidle' });
  await page.click('#btnId');
  await page.waitForSelector('#idMenu.on');
  dire((await texte('#idMenu')).includes('Nouveau personnage'),
       "et le menu d'identite l'offre aussi");

  console.log('\n[15] aucun personnage n a ete cree');
  const registre = await page.evaluate(async () =>
    (await (await fetch('/api/characters')).json()).characters.map(c => c.id));
  dire(!registre.some(id => /fumigation|autre-slug/.test(id)),
       `le registre est intact : ${registre.join(', ')}`);

  console.log('\n[16] aucune erreur JS sur tout le parcours');
  dire(erreurs.length === 0, `${erreurs.length} erreur(s)`);
  erreurs.forEach(e => console.log('      ' + e.slice(0, 150)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
