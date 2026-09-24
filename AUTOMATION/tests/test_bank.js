/* Browser smoke test of the REACT scene bank — both sub-views.

   Replaces three legacy fumigations: test_scenes_aller_retour (nothing is lost
   on a round trip), test_pose_scene_card (the pose selector on a scene card),
   and test_rail_repli (the rail used to collapse to icons — see the
   2026-09-02 note below for why that check is gone, not just moved).

   WHY THE ROUND TRIP IS THE HEART OF IT. On 25/08/2026 the save rebuilt each
   scene from the fields the card displays. Everything the card did NOT display
   was erased: `wardrobe`, `intensity`, `tags`, `tones` and `intention`
   disappeared from the bank's 16 scenes in ONE save, the « Suggestif » tier fell
   to zero scenes, and no test said a word. This one reads the bank, edits it
   through the interface, saves, reloads, and demands that nothing moved but what
   was touched.

   SINCE 31/08/2026 THE SCREEN IS A WORKBENCH — a grid of scenes and an
   inspector — so the walk it exercises is OPEN, EDIT, SAVE, and no longer « type
   into the third form down ». Three things it now also holds:
     - the world of the bank is SHOWN and not editable (ADR-0014);
     - a scene created in the browser reaches the disk STAMPED with that world,
       which is what lets the server lock be strict;
     - the fields did not move house without moving their names: the same
       `data-f` controls, in the inspector instead of in the card.

   THE COMPOSER IS SEVEN TABS, NOT ONE FORM (31/08/2026, wireframe-driven,
   `bank/composer/SceneComposer.tsx`). A `data-f` control now only exists in
   the DOM while ITS tab is open — the `onglet()` helper below switches tabs
   the same way a person would, by clicking the icon. The scene's `prompt` is
   no longer one field: it is composed from up to four fragments
   (`prompt_base`/`prompt_light`/`prompt_wardrobe`/`prompt_pose`, edited in the
   "Prompt global" tab), joined with `, ` on save exactly like `build_jobs`
   joins its own fragments — see the round-trip in [11] and the "never the
   outfit" guard in [12].

   THE 31/08/2026 CONSOLIDATION PASS moved « + Ajouter une scène » from a card
   in the grid to a toolbar button (same id, `#btnAddScene`, so most of this
   file did not need to change) and turned OFF the tool rail on `/bank/scenes`
   — the screen's own toolbar covers what it offered there. THE 2026-09-02
   POSE EDITOR PASS did the same to `/bank/poses`: five build phases later
   (undo/redo, hand close-ups, reference photo, mirror/IK, multi-select) the
   editor has its own complete navigation, so the rail's "Poses" entry
   pointed at a screen that no longer needed pointing at from inside itself
   (`chrome/ToolRail.tsx`, `RAIL_ON`). The rail-specific checks that used to
   run at [15]-[17] are gone rather than moved: there is no longer a rail
   anywhere in this walk to collapse or mark active.

   IT RESTORES WHAT IT CHANGES. The bank is real user data: the test snapshots
   scenes.json through the API, does its round trip, then writes the snapshot
   back and checks it matches. Nothing is left behind — verified at the end,
   including the scene it creates itself.

   `edite`, NOT `cible`, IS THE EDIT TARGET (2026-09-04). A prior world-catalog
   migration left all 16 of lena's real scenes `origin: "world"` — their 3
   prompt fragments are therefore all LOCKED (ADR-0015), which broke every
   check here that used to type into one on `cible` (the first real card,
   established in [4]). `cible` still serves the checks that only need an
   EXISTING id — search ([4quater]), filter ([10], [13]) — nothing about
   world-linking touches those. Everything that types into a prompt fragment
   now runs on `edite`, a scene created fresh in [5ter] (never linked to a
   world, so never locked) and kept open through [11], where its first save
   also folds in what a separate `idNeuf` scene used to check on its own
   (world stamp, `origin: "manual"`, the default wardrobe never joining the
   prompt) — one scene created and round-tripped instead of two.

   test_pose_extraction stays separate: it needs ComfyUI online and a real GPU
   job, and it ignores itself without one.

   PREREQUISITES: see test_journal.js — run_browser_tests.py does all of it. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const SCENES = BASE + '/bank/scenes?character=lena';

/* Aller a un module depuis n'importe ou (contrat de navigation du 23/09) : les
   modules d'une categorie fermee ne sont pas dans le DOM, il faut d'abord
   ouvrir sa categorie. Survole, clique l'item du menu. */
async function allerA(page, categorie, module) {
  await page.hover(`.tabs [data-s="${categorie}"]`);
  await page.waitForSelector(`.cat-wrap:has([data-s="${categorie}"]) .catmenu.on`);
  await page.click(`.catmenu.on [data-m="${module}"]`);
}

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
  // lecture de la banque par l'API, hors de l'interface : c'est la reference
  const banque = () => page.evaluate(async () =>
    (await (await fetch('/api/scenes?character=lena')).json()).data);

  // une carte de la grille — le carrousel n'a plus de carte « ajouter » depuis
  // le 31/08/2026, mais le selecteur reste tolerant si elle revenait un jour
  const CARTE = '[data-scene-card]:not([data-new])';
  const champ = f => `#sceneInspector [data-f="${f}"]`;
  // la carte d'un id PRECIS, pas juste « la premiere du DOM » — necessaire
  // depuis que `edite` (voir [5ter]) coexiste avec les 16 scenes reelles :
  // son id ne trie pas forcement en tete du groupe une fois la liste
  // regroupee par intention
  const carteDe = async (id) => {
    for (const c of await page.$$(CARTE)) {
      const t = await c.$eval('[data-card-id]', e => e.textContent).catch(() => null);
      if (t === id) return c;
    }
    return null;
  };
  // le compositeur (31/08/2026) est un tablist : un champ n'est dans le DOM
  // que si son onglet est ouvert — voir bank/composer/SceneComposer.tsx
  const onglet = async cle => {
    await page.click(`[data-tab="${cle}"]`);
    // les 7 panneaux restent montes (`forceMount` cote Radix) — seul celui
    // qui n'est plus `hidden` compte, et c'est deja l'etat 'visible' par
    // defaut de waitForSelector
    await page.waitForSelector(`[data-tabpanel="${cle}"]`);
  };

  await page.goto(SCENES, { waitUntil: 'networkidle' });
  await page.waitForSelector(CARTE);

  console.log('\n[0] instantane de scenes.json — il sera REECRIT a la fin');
  const avant = await banque();
  dire(Array.isArray(avant.scenes) && avant.scenes.length > 0,
       `${avant.scenes.length} scene(s) en banque au depart`);

  console.log('\n[1] la banque ouvre sur sa sous-vue, et l autre est une destination');
  dire(await page.evaluate(() => location.pathname) === '/bank/scenes', 'chemin /bank/scenes');
  dire(await vu('#bankScenes'), 'la sous-vue Scenes est montee');
  dire(!(await vu('#bankPoses')), 'la sous-vue Poses ne l est pas — une route, pas un attribut');
  const onglets = await page.$$eval('#bankView [data-vue]', e => e.map(x => x.dataset.vue));
  dire(onglets.join(',') === 'scenes,poses,tones', 'les trois sous-vues sont offertes');
  const allume = await page.$$eval('.tabs .cat.on', e => e.map(x => x.dataset.s));
  dire(allume.join(',') === 'atelier', "la categorie Atelier est allumee");
  const mod = await page.$$eval('.modbar .mod.on', e => e.map(x => x.dataset.m));
  dire(mod.join(',') === 'bank', "et le module Ateliers dans la sous-barre");

  console.log('\n[1bis] barre d atelier : le switch, le monde et les reglages sur une ligne — l enregistrement est au bandeau (23/09/2026)');
  dire(!(await vu('.launch')), "la banque n'a plus de barre de lancement fixe au bas de l'ecran");
  dire(await vu('#btnBankDocument'),
       "« Reglages de l'atelier » est visible sans avoir a chercher en bas de page");
  // design-pass screen-7b §S1 : le bouton a icone seule disparait de la vue
  // Scenes au profit du bandeau, qui dit deja ce qui est en attente ET porte
  // le geste. Il reste sur Poses et Tons, dont la refonte vient apres — voir
  // [14] et [15bis], qui lisent toujours son infobulle.
  dire(!(await vu('#btnSaveScenes')),
       "la vue Scenes n'a plus de bouton d'enregistrement : c'est le bandeau qui l'a");
  dire(!(await vu('#scMsg')), 'au repos, aucun texte de statut ne traine en permanence');
  // les CENTRES, pas les sommets : les trois boites n'ont pas la meme hauteur,
  // c'est leur ligne de base commune dans la barre de 44 px qui est verifiee
  const milieu = s => page.$eval(s, e => {
    const r = e.getBoundingClientRect();
    return r.top + r.height / 2;
  });
  const hautNav = await milieu('#bankView');
  const hautReglages = await milieu('#btnBankDocument');
  const hautMonde = await milieu('#worldBanner');
  dire(Math.abs(hautNav - hautReglages) < 3 && Math.abs(hautNav - hautMonde) < 3,
       `le monde et « Réglages de l'atelier » sont sur la meme ligne que le switch Scenes/Poses (${Math.round(hautNav)} / ${Math.round(hautMonde)} / ${Math.round(hautReglages)} px)`);

  console.log('\n[2] LE RAIL D OUTILS n apparait PAS sur Scenes (31/08/2026)');
  dire(!(await vu('#toolRail')),
       "l'ecran createur de scenes a son propre outillage — le rail n'y ajoute rien");

  console.log('\n[3] LE MONDE de la banque est dit, et il ne s edite pas (ADR-0014)');
  dire(await vu('#worldBanner'), 'le bandeau monde est present');
  const monde = await page.$eval('#worldBanner [data-world]', e => e.dataset.world);
  dire(monde === avant.world, `il porte le monde du document (${monde})`);
  dire((await page.$$('#worldBanner input, #worldBanner select, #worldBanner textarea')).length === 0,
       'aucun controle : le monde est fige a la creation, pas un reglage');
  // la derive a quitte la ligne du monde pour un bandeau --warn sous la barre
  // d atelier (§S2) : son marqueur se cherche dans la page, plus dans #worldBanner
  dire(!(await vu('[data-world-drift]')),
       'et aucune derive signalee — la fiche et le fichier disent le meme monde');

  console.log('\n[4] la LISTE montre l essentiel, une carte par scene, groupee par intention');
  const nCartes = await page.$$eval(CARTE, e => e.length);
  dire(nCartes === avant.scenes.length, `${nCartes} cartes pour ${avant.scenes.length} scenes`);
  dire(await vu('#btnAddScene'), "le bouton « + Ajouter une scene » est dans la barre d'outils");
  // le regroupement par intention reordonne l'AFFICHAGE (studio-IA,
  // 2026-09-01) : la premiere carte du DOM n'est plus forcement avant.scenes[0]
  // — on verifie l'ensemble des identifiants, pas un ordre precis
  const idsAffiches = await page.$$eval(CARTE + ' [data-card-id]', e => e.map(x => x.textContent));
  dire(JSON.stringify([...idsAffiches].sort()) === JSON.stringify(avant.scenes.map(s => s.id).sort()),
       'chaque scene du document a exactement une carte, quel que soit le groupe');
  dire((await page.$$(CARTE + ' [data-f]')).length === 0,
       "une carte ne porte AUCUN champ : le detail vit dans l'inspecteur");
  dire((await texte(CARTE + ' [data-card-produced]')).length > 0,
       'elle dit en toutes lettres si la scene a deja ete produite');
  // la scene CIBLE de tout le reste du parcours est celle que la premiere
  // carte ouvre reellement — plus une hypothese sur l'ordre du document
  const premiereCarteId = await page.$eval(CARTE + ' [data-card-id]', e => e.textContent);
  const cible = avant.scenes.find(s => s.id === premiereCarteId);
  dire(Boolean(cible), `la premiere carte du DOM correspond a une scene reelle (« ${premiereCarteId} »)`);

  console.log('\n[4ter] les scenes sont groupees par intention, en sections repliables (studio-IA, 2026-09-01)');
  const groupes = await page.$$eval('#sceneCards > details', els => els.map(d => ({
    label: d.querySelector('summary span')?.textContent,
    compte: Number(d.querySelector('summary span:last-child')?.textContent),
    ouvert: d.open,
  })));
  dire(groupes.length > 0, `${groupes.length} groupe(s) d intention affiche(s)`);
  dire(groupes.every(g => g.ouvert), 'chaque groupe s ouvre deplie par defaut');
  dire(groupes.reduce((n, g) => n + (g.compte || 0), 0) === avant.scenes.length,
       'la somme des groupes couvre toute la banque, sans doublon ni perte');
  // un groupe est un PICKER que l'oeil parcourt, pas un journal en ordre de
  // creation — decision explicite, 2026-09-01
  const idsParGroupe = await page.$$eval('#sceneCards > details', els =>
    els.map(d => Array.from(d.querySelectorAll('[data-card-id]')).map(e => e.textContent)));
  dire(idsParGroupe.every(ids =>
         JSON.stringify(ids) === JSON.stringify([...ids].sort((a, b) => a.localeCompare(b, 'fr')))),
       'les scenes de chaque groupe sont triees par ordre alphabetique');
  // fleches gauche/droite plient/deplient — convention d un arbre de fichiers
  // (Explorer, VS Code), pas une invention de cet ecran
  const premierGroupe = await page.$('#sceneCards > details');
  await premierGroupe.evaluate(d => d.querySelector('summary').focus());
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(100);
  dire(await premierGroupe.evaluate(d => !d.open), 'fleche gauche replie le groupe qui a le focus');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  dire(await premierGroupe.evaluate(d => d.open), 'fleche droite le redeplie');

  console.log('\n[4quater] une recherche qui trouve une scene dans un groupe replie le redeplie de force');
  // `cible` appartient forcement a `premierGroupe` : c est la scene de la
  // toute premiere carte du DOM, donc de la premiere ligne du premier groupe
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(100);
  dire(await premierGroupe.evaluate(d => !d.open), 'le groupe est replie manuellement, hors recherche');
  await page.fill('#sceneFilter', cible.id);
  await page.waitForTimeout(200);
  dire(await premierGroupe.evaluate(d => d.open),
       'une recherche qui trouve « ' + cible.id + '» dans ce groupe le redeplie, meme replie a la main');
  await page.fill('#sceneFilter', '');
  await page.waitForTimeout(200);
  dire(await premierGroupe.evaluate(d => !d.open),
       'et une fois la recherche videe, le groupe RETROUVE son pli manuel d avant la recherche — pas de reouverture surprise');
  // on le redeplie pour la suite du parcours, qui a besoin de voir sa premiere carte
  const resume = await premierGroupe.$('summary');
  await resume.click();
  await page.waitForTimeout(100);
  dire(await premierGroupe.evaluate(d => d.open), 'et un clic sur son en-tete le redeplie normalement');

  console.log('\n[5] OUVRIR une carte remplit l inspecteur');
  dire(await vu('#bankDocument'),
       'sans selection, l inspecteur tient les reglages de l atelier (ancre, direction)');
  dire(await vu('#anchor') && await vu('#direction'),
       "l'ancre d'identite et la note de direction y sont");
  await page.click(CARTE);
  await page.waitForSelector('#sceneInspector');
  dire(!(await vu('#bankDocument')), 'la scene ouverte remplace les reglages de l atelier');
  // TROIS PANNEAUX (design-pass screen-7b §S1) : la liste choisit, le
  // compositeur travaille, l apercu montre le prompt en direct. L ancienne
  // mesure de hauteur (le panneau-carte remplissait-il son aside ?) n a plus
  // d objet : il n y a plus de carte flottante, les trois colonnes sont des
  // pistes de la grille et remplissent la hauteur de <main> par construction.
  const larges = await page.evaluate(() => ({
    liste: document.querySelector('#sceneListPanel').getBoundingClientRect().width,
    apercu: document.querySelector('#scenePromptPreview').closest('aside').getBoundingClientRect().width,
  }));
  dire(Math.abs(larges.liste - 260) < 2, `la liste tient ses 260 px (${Math.round(larges.liste)})`);
  dire(Math.abs(larges.apercu - 340) < 2, `l apercu tient ses 340 px (${Math.round(larges.apercu)})`);
  const enTete = await page.$eval('#scenePreviewThumb', e => e.closest('#sceneInspector') === null);
  dire(enTete, "l'en-tete de scene est AU-DESSUS du compositeur, pas dedans : il survit a l onglet Monde");
  dire((await page.$$eval('#sceneInspector [role="tab"]', e => e.length)) === 7,
       'le compositeur ouvre sur ses 7 sections (wireframe 31/08/2026, en rail depuis le 23/09)');
  const railVertical = await page.$eval('#sceneInspector [role="tablist"]',
    e => e.getAttribute('aria-orientation'));
  dire(railVertical === 'vertical', 'et son rail est un tablist VERTICAL a libelles');
  dire((await page.$$eval('#sceneInspector [role="tab"]', e => e.map(t => t.textContent.trim())))
         .includes('Prompt global'),
       'chaque section dit son nom, plus seulement son icone');
  // audit UX/UI (M2) : aria-controls doit resoudre a un id REELLEMENT present
  // dans le DOM pour les 7 onglets, pas seulement celui actif — un panneau
  // demonte pour les 6 autres cassait la reference ARIA en silence
  const controlesResolus = await page.$$eval('#sceneInspector [role="tab"]', tabs =>
    tabs.every(t => document.getElementById(t.getAttribute('aria-controls') || '') !== null));
  dire(controlesResolus, 'aria-controls des 7 onglets pointe vers un panneau qui existe vraiment dans le DOM');
  // les champs du compositeur sont repartis par onglet — un champ absent du
  // DOM tant que son onglet n'est pas ouvert, contrairement a l'ancien
  // formulaire plat qui les montrait tous a la fois
  const parOnglet = {
    general: ['id', 'intention', 'format', 'count', 'guidance', 'band_lo', 'tones', 'tags'],
    light: ['prompt_light', 'variants'],
    clothing: ['wardrobe_0', 'wardrobe_1', 'wardrobe_2', 'wardrobe_3'],
    pose: ['prompt_pose', 'pose'],
    recap: ['prompt_base', 'prompt_light_recap', 'prompt_pose_recap', 'wardrobe_recap'],
  };
  for (const [cle, champsAttendus] of Object.entries(parOnglet)) {
    await onglet(cle);
    const presents = await page.$$eval('#sceneInspector [data-f]', e => e.map(x => x.dataset.f));
    champsAttendus.forEach(f => dire(presents.includes(f), `onglet ${cle} : champ « ${f} »`));
  }

  // CIBLE D EDITION (2026-09-04) : les 16 scenes REELLES de lena sont
  // desormais TOUTES origin=world (migration du catalogue de lieux,
  // anterieure et hors perimetre de cette fumigation) — leurs 3 fragments
  // de prompt sont donc TOUS verrouilles (ADR-0015, worldLinked). `cible`
  // (la premiere carte du DOM, etablie en [4]) ne peut plus servir a
  // tester l'edition d'un fragment de prompt : elle reste utilisee la ou
  // seule une carte EXISTANTE compte (recherche en [4quater], filtre en
  // [10]). `edite` est une scene neuve — jamais liee a un monde, donc
  // jamais verrouillee — creee ici et gardee ouverte jusqu'a [13] : c'est
  // elle que [5ter] a [13] editent et enregistrent desormais.
  console.log('\n[5ter] scene d edition : une scene neuve (jamais liee a un monde, donc jamais verrouillee)');
  await page.click('#btnAddScene');
  await page.waitForSelector('#sceneInspector');
  // le compositeur n'est pas remonte (la meme colonne change de scene) : le
  // retour a la section General vient d'un effet, donc d'un rendu apres celui
  // du clic — il se laisse le temps d'arriver, comme partout ailleurs ici
  await page.waitForTimeout(250);
  dire((await page.$eval('[data-tab="general"]', e => e.getAttribute('aria-selected'))) === 'true',
       'une scene neuve (comme une autre) ouvre sur l onglet General');
  dire(await vu('#dirtyBar'),
       'elle n existe que dans la page tant qu on n enregistre pas — le bandeau le dit');
  const idEdite = 'fumigation_edition_' + Date.now();
  await page.fill(champ('id'), idEdite);

  // audit UX/UI (m1) : les miroirs du recapitulatif disent qu'ils sont le
  // MEME champ que leur onglet d'origine (pas une copie propre au recap),
  // et editer l'un met bien a jour l'autre — pas juste le libelle qui le dit
  console.log('\n[5ter bis] les miroirs du recapitulatif se disent lies a leur onglet, et le sont vraiment');
  await onglet('recap');
  const libelleLumiereRecap = await page.$eval(
    `label[for="scene-prompt-prompt_light_recap"] span`, e => e.textContent);
  dire(libelleLumiereRecap.includes('même champ que l'), 'le libelle du miroir lumiere dit qu il est lie a son onglet');
  const marqueurSync = 'fumigation_sync_' + Date.now();
  await onglet('light');
  await page.fill(champ('prompt_light'), marqueurSync);
  await onglet('recap');
  dire((await page.$eval(champ('prompt_light_recap'), e => e.value)) === marqueurSync,
       'et la frappe dans l onglet Lumiere se reflete bien dans le miroir du recap');
  await page.fill(champ('prompt_light_recap'), '');

  await onglet('general');
  dire((await page.$eval(champ('id'), e => e.value)) === idEdite,
       'et c est bien LA scene ouverte qui est editee');
  const carteEdite = await carteDe(idEdite);
  dire(Boolean(carteEdite) && (await carteEdite.getAttribute('aria-pressed')) === 'true',
       'la carte ouverte se dit selectionnee (pas seulement par sa bordure)');

  // direction "studio IA" (2026-09-01) : le compositeur montre une image et
  // le prompt compose EN PERMANENCE, quel que soit l'onglet ouvert — plus
  // question d'editer une scene a l'aveugle, texte seul, comme un tableur
  console.log('\n[5quater] en-tete persistant : vignette + prompt compose en direct, sur tous les onglets');
  dire(await vu('#scenePreviewThumb'), 'la vignette de la scene est visible des l ouverture');
  const previewInitial = await page.$eval('#scenePromptPreview', e => e.textContent.trim());
  dire(previewInitial === '— vide —',
       `une scene neuve n a pas encore de prompt compose (« ${previewInitial.slice(0, 40)}… »)`);
  await onglet('light');
  dire(await vu('#scenePreviewThumb') && await vu('#scenePromptPreview'),
       'l en-tete reste visible en changeant d onglet — ce n est pas un contenu d onglet');
  const marqueurHeader = 'fumigation_header_' + Date.now();
  await page.fill(champ('prompt_light'), marqueurHeader);
  await page.waitForTimeout(150);
  dire((await page.$eval('#scenePromptPreview', e => e.textContent)).includes(marqueurHeader),
       'et se met a jour EN DIRECT depuis un onglet qui n est pas Prompt global, sans y aller');
  await page.fill(champ('prompt_light'), '');
  await page.waitForTimeout(150);
  await onglet('general');

  console.log('\n[5bis] le rail se pilote au clavier — fleches HAUT/BAS (tablist vertical) + roving tabindex (Radix)');
  await page.focus('[data-tab="general"]');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  dire((await page.$eval('[data-tab="light"]', e => e.getAttribute('aria-selected'))) === 'true',
       'fleche bas selectionne la section suivante');
  dire((await page.evaluate(() => document.activeElement?.dataset?.tab)) === 'light',
       'et deplace le focus AVEC la selection (roving tabindex)');
  await page.keyboard.press('Home');
  await page.waitForTimeout(100);
  dire((await page.$eval('[data-tab="general"]', e => e.getAttribute('aria-selected'))) === 'true',
       'Home revient au premier onglet');

  console.log('\n[6] Echap referme et rend le focus a sa carte');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  dire(await vu('#bankDocument'), "l'inspecteur revient aux reglages de l atelier");
  dire(await page.evaluate(() => document.activeElement?.dataset?.uid !== undefined),
       'le focus est revenu sur la carte, pas en haut du document');
  await (await carteDe(idEdite)).click();
  await page.waitForSelector('#sceneInspector');

  console.log('\n[6bis] Echap dans une modale de prompt ne ferme QUE la modale, pas tout le compositeur');
  await onglet('light');
  await page.click('[data-tabpanel="light"] button[aria-label*="Modifier"]');
  await page.waitForSelector('dialog[open]');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  dire(!(await vu('dialog[open]')), 'la modale se referme');
  dire(await vu('#sceneInspector'), 'mais le compositeur reste ouvert — la scene reste selectionnee');
  dire(!(await vu('#bankDocument')), 'et Echap ne retombe pas sur les reglages de l atelier');

  // La barre Suivant/Precedent/Dupliquer/Supprimer du bas de chaque panneau a
  // disparu (§S4.1) : le rail a libelles fait le pas de section en un clic, et
  // les deux actions de scene sont dans l en-tete. Ce que ce point verifie
  // desormais est la regle qui l a remplacee : un formulaire se lit en colonne,
  // jamais sur toute la largeur d un ecran de studio (§S4.3).
  console.log('\n[6ter] le formulaire est borne a 880 px, quelle que soit la largeur de la colonne');
  const largeurForm = await page.$eval('[data-tabpanel="light"] > div',
    e => e.getBoundingClientRect().width);
  const largeurColonne = await page.$eval('#sceneInspector', e => e.getBoundingClientRect().width);
  dire(largeurForm <= 882 && largeurColonne > largeurForm,
       `formulaire a ${Math.round(largeurForm)}px dans une colonne de ${Math.round(largeurColonne)}px`);
  dire((await page.$$('[data-tabpanel="light"] button:has-text("Suivant")')).length === 0,
       'et la barre « Suivant / Precedent » du bas de panneau a disparu');

  console.log('\n[7] le plafond de niveau se DEDUIT des tenues, a la frappe — meme lu depuis un AUTRE onglet');
  // le compositeur (31/08/2026) est un tablist : un champ n'est dans le DOM
  // que si son onglet est ouvert — voir bank/composer/SceneComposer.tsx.
  // Le prompt de vetement (25/08/2026) est desormais 4 champs, un par
  // niveau (design pass ecran 7, §V2) — `tenues` snapshotte/restaure le
  // TEXTE BRUT du niveau 3 seul, celui que ce bloc modifie.
  await onglet('clothing');
  const tenues = await page.$eval(champ('wardrobe_3'), e => e.value);
  await page.fill(champ('wardrobe_3'), tenues ? `${tenues}\na test outfit` : 'a test outfit');
  await page.waitForTimeout(200);
  await onglet('general');
  // la jauge de bande (design pass ecran 7, §V1) remplace le texte "jusqu'a
  // N" — son etat se lit dans son aria-label, pas dans un <b> qui n'existe
  // plus
  const plafond = () => page.$eval(
    '[data-tabpanel="general"] button[aria-label^="Niveaux"]',
    e => e.getAttribute('aria-label').match(/Niveaux (\d+) à (\d+)/)[2]);
  dire(await plafond() === '3', `le plafond (onglet General) suit la tenue tapee (onglet Vetements) (${await plafond()})`);
  await onglet('clothing');
  await page.fill(champ('wardrobe_3'), tenues);
  await page.waitForTimeout(200);

  console.log('\n[7bis] le selecteur de vetement : filtre, SELECTION puis "+" — jamais un ajout au simple survol/clic de la piece');
  // le "+" ecrit desormais dans le CHAMP du niveau actif (§V2), sans prefixe
  // — le niveau par defaut du selecteur suit `band_lo`, verifie zero plus haut
  const niveau0Avant = await page.$eval(champ('wardrobe_0'), e => e.value);
  const filtre = 'select#wardrobeFilter';
  const options = await page.$$eval(`${filtre} option`, e => e.map(o => o.value).filter(Boolean));
  dire(options.length > 0, `${options.length} categorie(s) au filtre (Haut, Bas, ...)`);
  await page.selectOption(filtre, options[0]);
  await page.waitForTimeout(100);
  const boutonAjout = '#sceneInspector button[aria-label="Ajouter la pièce sélectionnée comme nouvelle ligne"]';
  dire(await page.isDisabled(boutonAjout), 'le bouton "+" est INACTIF tant qu aucune piece n est choisie');
  const [piece] = await page.$$(`#sceneInspector [aria-pressed]`);
  const libellePiece = (await piece.textContent()).trim();
  await piece.click();
  await page.waitForTimeout(100);
  dire(await piece.getAttribute('aria-pressed') === 'true', 'cliquer une piece la SELECTIONNE (ne touche pas encore la tenue)');
  const avantAjout = await page.$eval(champ('wardrobe_0'), e => e.value);
  dire(avantAjout === niveau0Avant, 'la selection seule n a rien ecrit dans le prompt de vetement');
  dire(!(await page.isDisabled(boutonAjout)), 'le bouton "+" s active une fois une piece choisie');
  await page.click(boutonAjout);
  await page.waitForTimeout(150);
  const apresAjout = await page.$eval(champ('wardrobe_0'), e => e.value);
  dire(apresAjout === (avantAjout ? `${avantAjout}\n${libellePiece}` : libellePiece),
       `« + » a ajoute "${libellePiece}" au champ niveau 0, sans prefixe a taper, sans toucher au reste`);
  await page.fill(champ('wardrobe_0'), niveau0Avant);
  await page.waitForTimeout(200);

  console.log('\n[7ter] le niveau de la ligne ajoutee se choisit — plus limite au niveau 0 (audit UX/UI, M4)');
  await page.selectOption('select#wardrobeLevel', '2');
  await page.waitForTimeout(100);
  const niveau2Avant = await page.$eval(champ('wardrobe_2'), e => e.value);
  const [autrePiece] = await page.$$(`#sceneInspector [aria-pressed]`);
  const libelleAutre = (await autrePiece.textContent()).trim();
  await autrePiece.click();
  await page.waitForTimeout(100);
  await page.click(boutonAjout);
  await page.waitForTimeout(150);
  const apresAjout2 = await page.$eval(champ('wardrobe_2'), e => e.value);
  dire(apresAjout2 === (niveau2Avant ? `${niveau2Avant}\n${libelleAutre}` : libelleAutre),
       `le niveau choisi (2) est utilise, plus fige a 0 : le champ niveau 2 recoit "${libelleAutre}"`);
  dire((await page.$eval(champ('wardrobe_0'), e => e.value)) === niveau0Avant,
       'et le champ niveau 0 n a pas bouge — chaque "+" ne touche que le niveau actif');
  await page.fill(champ('wardrobe_2'), niveau2Avant);
  await page.waitForTimeout(200);
  await onglet('general');

  console.log('\n[8] une frappe arme le bandeau « modifications non enregistrees »');
  dire(await vu('#dirtyBar'), 'le bandeau est la');
  dire((await texte('#dirtyBar')).includes('production ne les voit pas'),
       'il dit pourquoi ca compte, pas seulement qu il y a des changements');
  dire(await vu('#btnDirtySave'), 'et il porte l enregistrement');

  console.log('\n[9] il survit a la navigation — l ecran demonte, pas la saisie');
  // Application a quitte les categories : c'est le bouton de la zone d'etat.
  await page.click('#btnApplication');
  await page.waitForTimeout(400);
  dire(await vu('#dirtyBar'), "le bandeau suit sur l'ecran Application");
  await allerA(page, 'atelier', 'bank');
  await page.waitForTimeout(500);
  await page.waitForSelector(CARTE);
  await (await carteDe(idEdite)).click();
  await page.waitForSelector('#sceneInspector');
  await onglet('clothing');
  dire(await page.$eval(champ('wardrobe_3'), e => e.value) === tenues,
       'la saisie est intacte au retour');

  console.log('\n[10] FILTRER retrecit la grille, jamais le document');
  // `cible` est deja etabli en [4] — la premiere carte reelle du DOM, pas une
  // hypothese sur l'ordre du document (le regroupement par intention reordonne
  // l'affichage). Le total attendu est celui de la banque + `edite`, la scene
  // d'edition ajoutee en [5ter] — elle existe deja dans la grille bien
  // qu'encore non enregistree (meme raisonnement que le compte affiche).
  const totalAvecEdite = avant.scenes.length + 1;
  await page.fill('#sceneFilter', cible.id);
  await page.waitForTimeout(200);
  const filtrees = await page.$$eval(CARTE, e => e.length);
  dire(filtrees < totalAvecEdite && filtrees >= 1,
       `${filtrees} carte(s) pour « ${cible.id} »`);
  dire((await texte('#nScenes')).includes(String(totalAvecEdite)),
       'le compte rappelle le total du document (banque + edite), pas seulement ce qui est montre');
  await page.fill('#sceneFilter', '');
  await page.waitForTimeout(200);
  dire(await page.$$eval(CARTE, e => e.length) === totalAvecEdite,
       'vider le filtre rend toute la banque, edite comprise');

  console.log('\n[11] ALLER-RETOUR : on modifie 2 fragments dans 2 onglets sur `edite`, et rien d autre ne bouge');
  // `edite` (creee en [5ter]) n a encore JAMAIS ete enregistree — ce premier
  // "Enregistrer" est donc aussi celui qui la fait naitre sur le disque
  // (ex-[12], fusionne ici : meme geste, memes verifications, une seule
  // scene neuve plutot que deux).
  await (await carteDe(idEdite)).click();
  await page.waitForSelector('#sceneInspector');
  await onglet('recap');
  const marque = 'a quiet fumigation corner';
  await page.fill(champ('prompt_base'), marque);
  const eclairage = 'fumigation lumiere marker';
  await page.fill(champ('prompt_light_recap'), eclairage);
  await page.waitForTimeout(150);
  const promptAttendu = `${marque}, ${eclairage}`;
  dire((await page.$eval('#sceneInspector textarea[readonly]', e => e.value)) === promptAttendu,
       'le "prompt compose" affiche deja la jointure des 2 fragments, virgule separee');
  dire(await vu('#dirtyBar'),
       'elle n existe que dans la page tant qu on n enregistre pas — le bandeau le dit');
  // §S3 : la scene non enregistree porte son point dans la liste, et l apercu
  // refuse d envoyer a Produire ce que scenes.json ne contient pas encore
  const carteAvantSave = await carteDe(idEdite);
  dire((await carteAvantSave.$$('.sr-only')).length > 0 &&
       (await carteAvantSave.textContent()).includes('modifiée'),
       'sa ligne de liste se dit « modifiée », pas seulement par un point de couleur');
  dire(await page.isDisabled('aside[aria-label="Aperçu du prompt"] button'),
       "« Produire cette scene » est inactif tant que rien n'est enregistre");
  // §S1 : l enregistrement est au bandeau, et son resultat se dit au toast
  await page.click('#btnDirtySave');
  await page.waitForTimeout(1400);
  dire((await texte('#toastTxt')).includes('enregistré'),
       `le toast le confirme : « ${await texte('#toastTxt')} »`);
  dire(!(await vu('#dirtyBar')), 'le bandeau disparait : plus rien en attente');
  dire(Boolean(await page.$('aside[aria-label="Aperçu du prompt"] a[href*="/produce"]')),
       'et « Produire cette scene » redevient un lien une fois la banque a jour');

  const apres = await banque();
  dire(apres.scenes.length === avant.scenes.length + 1,
       `${avant.scenes.length} scene(s) d origine + edite = ${apres.scenes.length} — aucune perdue`);
  const edite = apres.scenes.find(s => s.id === idEdite);
  dire(Boolean(edite), 'edite est bien arrivee sur le disque');
  dire(edite && edite.prompt === promptAttendu,
       'les 2 fragments tapes dans des onglets differents ont bien ete joints, virgule separee');
  dire(edite && edite.world === avant.world, `elle porte le monde du personnage (${edite && edite.world})`);
  dire(edite && edite.origin === 'manual', 'et son origine dit d ou elle vient');
  // NEW_SCENE nait avec `wardrobe: {"0": "everyday clothing"}` (ScenesStoreContext) :
  // une valeur connue, pas une donnee reelle imprevisible, pour verifier que la
  // tenue ne se glisse JAMAIS dans le prompt (elle est injectee a part, par
  // niveau — voir le commentaire de SceneDraft).
  dire(edite && !edite.prompt.includes('everyday clothing'),
       'et la tenue par defaut de la scene neuve n a jamais rejoint le prompt');

  // LE POINT DU TEST : tout ce que l'inspecteur ne montre pas doit avoir
  // traverse — sur les scenes D ORIGINE, `edite` est ajoutee en fin de
  // tableau (addScene() ne fait qu ajouter), donc les index 0..15
  // continuent de s aligner sur `avant.scenes`
  const ecarts = [];
  avant.scenes.forEach((s, i) => {
    const a = apres.scenes[i] || {};
    Object.keys(s).forEach(k => {
      if (k === 'category') return;                        // cle morte, retiree a l'enregistrement
      if (JSON.stringify(s[k]) !== JSON.stringify(a[k]))
        ecarts.push(`${s.id}.${k} : ${JSON.stringify(s[k])} -> ${JSON.stringify(a[k])}`);
    });
  });
  dire(ecarts.length === 0, `aucune cle perdue ni alteree (${ecarts.length} ecart(s))`);
  ecarts.slice(0, 6).forEach(e => console.log('      ' + e));
  dire(apres.world === avant.world, 'le monde du document a traverse');
  dire(apres.scenes.every(s => s.world === avant.world),
       'et chaque scene porte toujours le sien');
  dire(JSON.stringify(apres.anchor) === JSON.stringify(avant.anchor),
       "l'ancre d'identite a traverse");
  dire(JSON.stringify(apres.direction) === JSON.stringify(avant.direction),
       'la note de direction aussi');

  console.log('\n[13] une tenue sans niveau REFUSE l enregistrement');
  // `cible` (une scene EXISTANTE, etablie en [4]) — `edite` vient d etre
  // enregistree avec un wardrobe valide en [11], ce test veut le cas
  // REFUSE sur une scene qui en a deja un, pas sur une scene neuve
  await page.fill('#sceneFilter', cible.id);
  await page.waitForTimeout(200);
  await page.click(CARTE);
  await page.waitForSelector('#sceneInspector');
  await page.fill('#sceneFilter', '');
  // les 4 champs de l'onglet Vetements (§V2) prefixent le niveau eux-memes —
  // taper une ligne SANS niveau n'y est plus possible. Le mirroir texte brut
  // du recapitulatif (meme etat que `wardrobe`) reste le seul champ libre qui
  // peut encore produire ce cas, donc c'est lui que ce test tape desormais.
  await onglet('recap');
  await page.fill(champ('wardrobe_recap'), 'une tenue sans niveau');
  await page.waitForTimeout(150);
  await page.click('#btnDirtySave');
  await page.waitForTimeout(600);
  dire((await texte('#toastTxt')).includes('tenue sans niveau'),
       `le refus est dit a l'ecran : « ${(await texte('#toastTxt')).slice(0, 70)}… »`);
  const pendant = await banque();
  dire(JSON.stringify(pendant.scenes.find(s => s.id === cible.id).wardrobe) ===
       JSON.stringify(apres.scenes.find(s => s.id === cible.id).wardrobe),
       "et rien n'a ete ecrit : la tenue d'origine est toujours en banque");
  dire(await vu('#dirtyBar'), 'le bandeau reste : le travail est toujours en attente');

  console.log('\n[14] sous-vue POSES : une route, une infobulle de sauvegarde qui suit');
  await page.click('#bankView [data-vue="poses"]');
  await page.waitForTimeout(400);
  dire(await page.evaluate(() => location.pathname) === '/bank/poses', 'chemin /bank/poses');
  dire(await vu('#bankPoses'), 'la sous-vue Poses est montee');
  dire(!(await vu('#bankScenes')), 'la sous-vue Scenes ne l est plus');
  // le texte permanent a disparu (voir [1bis]) : ce qui est enregistre ICI —
  // et ce qui ne l'est PAS — se dit desormais dans l'infobulle du bouton
  const infobullePoses = await page.$eval('#btnSaveScenes', e => e.dataset.hintText || '');
  dire(infobullePoses.includes('attributions de pose'),
       `l'infobulle dit ce qu elle enregistre ICI : « ${infobullePoses} »`);
  dire(infobullePoses.toLowerCase().includes('squelette'),
       'et precise ce qu elle N enregistre PAS');
  dire(await vu('#btnSaveScenes'), "le bouton reste : une edition en attente garde son action");
  dire(await vu('#dirtyBar'), 'et le bandeau aussi');
  dire((await texte('#bankPoses')).includes('ne reste jamais sur le disque'),
       'la vue dit que la photo source n est jamais gardee');

  console.log('\n[15] LE RAIL D OUTILS n apparait PLUS sur Poses non plus (2026-09-02)');
  // Meme raisonnement que Scenes (voir [2]) : l'editeur de pose a grandi sa
  // propre navigation complete sur cinq passes de developpement (retour a la
  // banque, annuler/retablir, panneaux mains, photo de reference, miroir/IK) —
  // le rail pointait vers un ecran qui n'en avait plus besoin depuis
  // lui-meme. Les verifications de repli en icones et de marquage de la
  // sous-vue active (ex-[16]/[17]) n'ont plus de sens : il n'y a plus de
  // rail ici a replier ou a marquer.
  dire(!(await vu('#toolRail')),
       "l'editeur de pose a son propre outillage — le rail n'y ajoute plus rien");

  console.log('\n[15bis] sous-vue TONS : une carte par ton, lien vers son propre editeur (2026-09-03)');
  await page.click('#bankView [data-vue="tones"]');
  await page.waitForTimeout(400);
  dire(await page.evaluate(() => location.pathname) === '/bank/tones', 'chemin /bank/tones');
  dire(await vu('#bankTones'), 'la sous-vue Tons est montee');
  dire(!(await vu('#bankPoses')), 'la sous-vue Poses ne l est plus');
  const infobulleTons = await page.$eval('#btnSaveScenes', e => e.dataset.hintText || '');
  dire(infobulleTons.toLowerCase().includes('propre'),
       `l'infobulle precise que la plage d'un ton s'enregistre ailleurs (« ${infobulleTons} »)`);
  const tons = await page.$$eval('[data-tone-card]', e => e.map(x => x.dataset.key));
  dire(tons.length > 0, `au moins un ton est propose (${tons.join(', ')})`);
  await page.click('[data-tone-card] a:has-text("éditer l’expression")');
  await page.waitForTimeout(400);
  dire((await page.evaluate(() => location.pathname)).startsWith('/bank/tones/edit/'),
       'le lien de la carte ouvre bien le propre editeur du ton');
  await page.goBack();
  await page.waitForTimeout(400);

  console.log('\n[16] REMISE EN ETAT : scenes.json revient a son instantane');
  const remis = await page.evaluate(async avant => {
    const r = await fetch('/api/scenes?character=lena', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({data: avant})});
    return (await r.json()).ok;
  }, avant);
  dire(remis === true, 'la banque d origine est reecrite');
  await page.goto(SCENES, { waitUntil: 'networkidle' });
  const final = await banque();
  dire(!final.scenes.some(s => s.id === idEdite),
       'la scene creee par la fumigation a bien disparu');
  const restant = [];
  avant.scenes.forEach((s, i) => {
    const a = final.scenes[i] || {};
    Object.keys(s).forEach(k => {
      if (k === 'category') return;
      if (JSON.stringify(s[k]) !== JSON.stringify(a[k])) restant.push(`${s.id}.${k}`);
    });
  });
  dire(restant.length === 0,
       `aucune trace laissee par la fumigation (${restant.length} ecart(s))`);
  restant.slice(0, 6).forEach(e => console.log('      ' + e));

  console.log('\n[17] aucune erreur JS sur tout le parcours');
  dire(erreurs.length === 0, `${erreurs.length} erreur(s)`);
  erreurs.forEach(e => console.log('      ' + e.slice(0, 150)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
