/* Le cadre que personne n'a demande : `2px outset` sur un <button>.

   POURQUOI CE TEST EXISTE. Un <button> qui ne declare AUCUNE `border` herite
   du cadre `outset` de la feuille de style du navigateur — gris, en relief,
   etranger a tout le reste du studio. Le bug est passe deux fois :

     - 2026-09-23 (75d6417) : les lignes d'Intensite, d'Intention et de « a
       peupler » de `ProduceSidebar`, signalees par Pierre a 2560 px. Elles
       portaient `bg-transparent` mais pas `border-0` ; `IntentRail.tsx`
       portait les deux moities du garde-fou, celui-ci une seule ;
     - 2026-09-24 : les lignes du selecteur de scenes, apres la refonte a
       trois panneaux. Le cas y etait couvert PAR ACCIDENT (`border-2
       border-transparent`, parce que la selection se disait par une bordure
       d'accent) ; en passant la selection a un fond, la bordure est partie,
       et le garde-fou avec elle.

   Les deux fois, la relecture du JSX n'a rien vu : le defaut n'existe qu'une
   fois le style calcule. Les deux fois, une mesure au navigateur l'a donne
   en une ligne. C'est donc une mesure, et elle vaut pour TOUS les ecrans, pas
   pour celui du jour — un test transverse plutot qu'une assertion de plus
   dans la fumigation de chaque ecran.

   CE QU'IL COUVRE. Le repos de chaque ecran, et les surimpressions qu'un
   geste ouvre : modales, menus, confirmations. Il n'a longtemps vu que le
   repos — les deux occurrences reelles y etaient visibles — mais un bouton
   dans une modale echappait encore au balayage, et une modale est exactement
   l'endroit ou une refonte oublie une bordure sans que personne regarde. Ce
   qu'il ne rejoue pas : les parcours eux-memes, qui sont le travail des
   fumigations d'ecran, chacune pour le sien.

   `outset` est la signature du defaut, et elle est sans ambiguite : aucune
   feuille du depot ne declare ce style. Un faux positif est donc impossible,
   et un vrai positif se corrige toujours de la meme facon — `border-0`, ou
   une bordure declaree.

   PREREQUIS : voir test_journal.js — run_browser_tests.py fait tout. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';

/* Un ecran = une route. Les sous-vues d'un meme ecran comptent pour des
   ecrans : ce sont des arbres DOM differents (Banque, Revue/Galerie).

   TROISIEME CASE : LES ETATS OUVERTS (24/09/2026, complete le 25/09). Une
   liste de [nom, le selecteur qui l'ouvre, le marqueur qui dit qu'elle EST
   ouverte, le geste], rejouee apres la sonde de repos. Chaque ecran refondu
   ajoute les siens en passant.

   LE MARQUEUR N'EST PAS DECORATIF. Un `<dialog>` vit dans le DOM ferme, et
   les menus du chrome y vivent en permanence : sans verifier qu'il est
   AFFICHE, un declencheur qui pourrit ferait sonder l'ecran au repos et rendre
   vert. Le marqueur est ce qui empeche ce vert menteur.

   LE GESTE, quand ce n'est pas un clic gauche : « survol » pour les menus de
   categorie (le clic, lui, navigue), « droit » pour le menu contextuel d'une
   vignette (design-pass screen-5b : le tri passe par ce menu).

   TOUS SE FERMENT PAR ECHAP, et c'est volontaire : frontend.md l'exige de
   toute surimpression, donc s'en servir ici teste la regle en meme temps
   qu'il rend l'ecran a son repos pour l'etat suivant.

   CE QUI N'EST PAS DANS LA LISTE, ET POURQUOI. Une surimpression sans
   <button> n'a rien a offrir a la sonde : le depot d'une photo sur la banque
   de poses, et — mesure du 25/09 — la loupe (`#lightbox`), le menu
   d'identite et les trois menus de categorie, dont les entrees sont des
   liens. Le menu d'arret, lui, porte deux vrais boutons, donc il y est. Le
   jour ou l'un des autres gagne un bouton, il rejoint la liste. */
const ECRANS = [
  ['/characters', 'sas d entree'],
  ['/character', 'fiche du personnage'],
  // Le menu d'arret appartient au chrome, le meme sur tous les ecrans : le
  // sonder une fois suffit, et Produire est l'ecran ou on l'ouvre vraiment.
  ['/produce', 'Produire', [
    ['menu « Arrêter »', '#btnHeaderPower', '.pwrmenu.on'],
  ]],
  ['/review', 'Revue', [
    ['menu contextuel d une vignette', '[data-tile]', '#tileMenu', 'droit'],
  ]],
  ['/gallery', 'Galerie', [
    ['menu contextuel d une vignette', '[data-tile]', '#tileMenu', 'droit'],
  ]],
  ['/bank/scenes', 'Ateliers, Scenes', [
    ['modale « Depuis le monde »', '#btnAddFromWorld', 'dialog[open]'],
  ]],
  ['/bank/poses', 'Ateliers, Poses', [
    ['modale « Nouvelle depuis un gabarit »', '#btnNewPose', 'dialog[open]'],
  ]],
  ['/bank/tones', 'Ateliers, Tons', [
    ['boite « Copier depuis… »', 'button:has-text("Copier depuis")', 'dialog[open]'],
  ]],
  ['/training', 'Entrainement'],
  ['/worlds', 'Mondes', [
    ['modale « Nouveau monde »', 'button:has-text("Nouveau monde")', 'dialog[open]'],
  ]],
  // Application montre UNE section a la fois depuis le 25/09 (design-pass
  // screen-12) : chaque section est un ecran pour la sonde. Les etats ouverts
  // sont des confirmations, qu'Echap annule sans rien envoyer.
  ['/app', 'Application, ComfyUI', [
    ['confirmation « Arrêter ComfyUI »', '#btnComfyStop', 'dialog[open]'],
  ]],
  ['/app/server', 'Application, Serveur', [
    ['confirmation « Redémarrer »', '#btnAppRestart', 'dialog[open]'],
  ]],
  ['/app/adult', 'Application, Contenu adulte', [
    ['modale d activation', '#btnNsfwOn', 'dialog[open]'],
    ['confirmation de desactivation', '#btnNsfwOff', 'dialog[open]'],
  ]],
  ['/app/appearance', 'Application, Apparence'],
  ['/app/journal', 'Application, Productions'],
  ['/app/log', 'Application, Serveur (journal)'],
];

/* Tout controle rendu, et le style que le navigateur lui calcule. On ne
   regarde que les <button> : un <a>, un <input> ou un <select> n'a pas ce
   defaut (aucun cadre `outset` par defaut), et `dialog`/`summary` non plus. */
const SONDE = () => Array.from(document.querySelectorAll('button'))
  .filter((b) => b.offsetParent !== null)          // ce qui est reellement affiche
  .map((b) => ({
    style: getComputedStyle(b).borderTopStyle,
    largeur: getComputedStyle(b).borderTopWidth,
    quoi: (b.getAttribute('aria-label') || b.id || b.dataset.tab || b.textContent || '(sans nom)')
      .trim().replace(/\s+/g, ' ').slice(0, 50),
  }))
  .filter((x) => x.style === 'outset' || x.style === 'inset');

(async () => {
  const nav = await chromium.launch();
  // 2560 px : la largeur ou Pierre l'a vu la premiere fois. Un cadre ne depend
  // pas de la largeur, mais la fumigation se tient a l'endroit du signalement.
  const page = await nav.newPage({ viewport: { width: 2560, height: 1000 } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };

  /* Une surimpression est ouverte quand son marqueur est AFFICHE : un
     `<dialog>` vit dans le DOM ferme, et les menus du chrome y vivent en
     permanence — leur seule presence dirait « ouvert » sur un ecran au repos.
     On cherche donc s'il en existe un REELLEMENT rendu, et on ne regarde pas
     seulement le premier : `[role="menu"]` tombe d'abord sur les menus du
     chrome, caches, avant celui que le geste vient d'ouvrir. */
  const ouvert = async (marqueur) => page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel)).some((e) => e.getClientRects().length > 0),
    marqueur,
  );

  const sonder = async (etiquette) => {
    const nBoutons = await page.$$eval('button', (e) => e.filter((b) => b.offsetParent !== null).length);
    const cadres = await page.evaluate(SONDE);
    dire(cadres.length === 0,
         `${etiquette} : ${nBoutons} bouton(s) visible(s), ${cadres.length} cadre(s) du navigateur`);
    cadres.forEach((c) => console.log(`      « ${c.quoi} » : ${c.largeur} ${c.style}`));
  };

  /* Ouvre chaque etat, le sonde, le referme. Une seule mecanique pour les
     trois familles d'ecrans : ceux de la liste, et les deux qui n'ont pas
     d'adresse fixe (editeur de pose, editeur photo avance). */
  const jouerEtats = async (nom, etats) => {
    for (const [etat, ouvre, marqueur, geste] of etats || []) {
      // Un etat dont le declencheur n'existe pas sur cette machine (« Copier
      // depuis… » n'apparait que si un AUTRE ton a deja une plage) s'ignore :
      // la sonde n'a rien a mesurer, ce n'est pas un echec.
      if (!(await page.locator(ouvre).count())) {
        console.log(`   IGNORE ${nom}, ${etat} — declencheur absent (${ouvre})`);
        continue;
      }
      const cible = page.locator(ouvre).first();
      if (geste === 'survol') await cible.hover();
      else await cible.click({ button: geste === 'droit' ? 'right' : 'left' });
      await page.waitForTimeout(350);

      // L'ETAT S'EST-IL VRAIMENT OUVERT ? Sans cette verification, un
      // declencheur qui pourrit (un id renomme, un bouton deplace) laisse la
      // sonde mesurer l'ecran AU REPOS et rendre vert : le trou se rouvre en
      // silence, ce qui est exactement ce que ce test doit empecher. Pris sur
      // le fait le 25/09 : « Copier depuis… » s'ouvrait, et un marqueur mal
      // choisi le declarait ferme.
      if (!(await ouvert(marqueur))) {
        dire(false, `${nom}, ${etat} : le geste n'a rien ouvert (${marqueur} absent)`);
        continue;
      }
      await sonder(`${nom}, ${etat}`);

      await page.keyboard.press('Escape');
      // La souris quitte le declencheur : un menu qui s'ouvre au survol
      // resterait ouvert sous elle, et le repos de l'etat suivant serait faux.
      await page.mouse.move(3, 990);
      await page.waitForTimeout(300);
      // frontend.md : Echap ferme toute surimpression. On s'en sert pour rendre
      // l'ecran a son repos, donc on verifie aussi que ca marche.
      dire(!(await ouvert(marqueur)), `${nom}, ${etat} : Echap la referme`);
    }
  };

  console.log('\n[1] aucun <button> ne porte le cadre du navigateur, ecran par ecran');
  for (const [route, nom, etats] of ECRANS) {
    await page.goto(`${BASE}${route}?character=lena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.screen', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(250);
    await sonder(nom);

    await jouerEtats(nom, etats);
  }

  /* Personnages (ecran 14) : le registre filtre sans resultat (le lien
     « Effacer » est un <button>), et le wizard a chacune de ses etapes, dont
     les deux faces de la Base. Rien n'est cree : on ne clique ni « Générer »
     ni « Créer ». */
  await page.goto(`${BASE}/characters`, { waitUntil: 'networkidle' });
  await page.fill('#charSearch', 'zzz-aucun');
  await page.waitForTimeout(150);
  await sonder('sas, recherche sans resultat');
  await page.goto(`${BASE}/characters/new`, { waitUntil: 'networkidle' });
  await sonder('wizard, Identite');
  await page.fill('#wizName', 'Cadres');
  await page.fill('#wizCid', 'cadres-ua');
  for (const etape of ['Type', 'Style', 'Monde']) {
    await page.click('#wizNext');
    await page.waitForTimeout(200);
    if (await page.isDisabled('#wizNext')) await page.click('#wizBody [role="radio"]:first-child');
    await sonder(`wizard, ${etape}`);
  }
  await page.click('#wizNext');
  await page.waitForTimeout(200);
  await sonder('wizard, Base (generer)');
  await page.click('#wizBody button:has-text("Fournir une image")');
  await page.waitForTimeout(150);
  await sonder('wizard, Base (fournir)');

  /* L'editeur de pose (ecran 13) n'a pas d'adresse fixe : il lui faut une
     pose qui porte ses points-cles. On prend la premiere de la banque qui en
     a, et l'ecran s'ignore si aucune n'en a. */
  await page.goto(`${BASE}/bank/poses?character=lena`, { waitUntil: 'networkidle' });
  const poses = await page.$$eval('#poseGrid [data-pose-card]', (e) => e.map((x) => x.dataset.n));
  let editable = null;
  for (const n of poses) {
    const ok = await page.evaluate(
      async (name) => (await fetch(`/api/pose/keypoints?name=${encodeURIComponent(name)}&character=lena`)).ok, n);
    if (ok) { editable = n; break; }
  }
  if (editable) {
    await page.goto(`${BASE}/bank/poses/edit/${encodeURIComponent(editable)}?character=lena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#poseEditor svg', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(250);
    await sonder('Editeur de pose');
    await jouerEtats('Editeur de pose', [
      ['aide des raccourcis', '#btnPoseHelp', '#poseShortcuts'],
      ['menu « Enregistrer sous »', '#btnPoseSave + button', '[role="menu"]'],
    ]);
  } else {
    console.log('   IGNORE Editeur de pose — aucune pose avec points-cles en banque');
  }

  /* L'editeur photo avance (ecran 10) non plus n'a pas d'adresse fixe : il
     lui faut une image validee. On prend la premiere de la galerie SFW, et
     l'ecran s'ignore si le dossier est vide. C'est l'ecran le plus dense du
     studio — trois zones, une pile de calques, sept sections de reglage —
     donc celui ou un cadre a le plus d'endroits ou se cacher. */
  const images = await page.evaluate(async () => {
    const r = await fetch('/api/gallery?bucket=OK&space=sfw&character=lena');
    return r.ok ? (await r.json()).items.map((i) => i.name) : [];
  });
  if (images.length) {
    await page.goto(`${BASE}/photo-editor/${encodeURIComponent(images[0])}`
                    + '?bucket=OK&space=sfw&character=lena', { waitUntil: 'networkidle' });
    await page.waitForSelector('#photoEditorAdvanced', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    await sonder('Editeur photo avance');
    await jouerEtats('Editeur photo avance', [
      ['modale « Ajouter un calque »', 'button:has-text("+ Ajouter")', 'dialog[open]'],
    ]);
  } else {
    console.log('   IGNORE Editeur photo avance — aucune image validee en galerie');
  }

  console.log('\n[2] la sonde sait reconnaitre le defaut (sinon elle dirait vert sur tout)');
  // Un bouton nu, injecte dans la page : si la sonde ne le voit pas, elle ne
  // verrait pas non plus le vrai defaut, et les verts ci-dessus ne valent rien.
  const temoin = await page.evaluate(() => {
    const b = document.createElement('button');
    b.textContent = 'temoin';
    b.setAttribute('aria-label', 'temoin de la sonde');
    b.style.all = 'revert';                        // le style du navigateur, rien d autre
    document.querySelector('.screen')?.appendChild(b);
    return getComputedStyle(b).borderTopStyle;
  });
  dire(temoin === 'outset', `un <button> nu rend bien « ${temoin} » dans ce navigateur`);
  const vuParLaSonde = await page.evaluate(SONDE);
  dire(vuParLaSonde.some((c) => c.quoi.includes('temoin')), 'et la sonde le trouve');

  console.log('\n[3] aucune erreur JS sur le balayage');
  dire(erreurs.length === 0, `${erreurs.length} erreur(s)`);
  erreurs.forEach((e) => console.log('      ' + e.slice(0, 150)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
