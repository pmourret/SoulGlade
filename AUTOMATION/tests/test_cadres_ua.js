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

   CE QU'IL NE COUVRE PAS. L'etat de repos de chaque ecran, rien de plus : pas
   les modales, pas les panneaux qu'un clic ouvre. Les deux occurrences reelles
   etaient visibles au repos, et un balayage exhaustif demanderait de rejouer
   chaque parcours — ce que les fumigations d'ecran font deja, chacune pour le
   sien. Si un cadre apparait un jour dans une modale, ajouter l'etat ici
   plutot que d'accepter le trou.

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
   ecrans : ce sont des arbres DOM differents (Banque, Revue/Galerie). */
const ECRANS = [
  ['/characters', 'sas d entree'],
  ['/character', 'fiche du personnage'],
  ['/produce', 'Produire'],
  ['/review', 'Revue'],
  ['/gallery', 'Galerie'],
  ['/bank/scenes', 'Ateliers, Scenes'],
  ['/bank/poses', 'Ateliers, Poses'],
  ['/bank/tones', 'Ateliers, Tons'],
  ['/training', 'Entrainement'],
  ['/worlds', 'Mondes'],
  ['/app', 'Application'],
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

  console.log('\n[1] aucun <button> ne porte le cadre du navigateur, ecran par ecran');
  for (const [route, nom] of ECRANS) {
    await page.goto(`${BASE}${route}?character=lena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.screen', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(250);
    const nBoutons = await page.$$eval('button', (e) => e.filter((b) => b.offsetParent !== null).length);
    const cadres = await page.evaluate(SONDE);
    dire(cadres.length === 0,
         `${nom} : ${nBoutons} bouton(s) visible(s), ${cadres.length} cadre(s) du navigateur`);
    cadres.forEach((c) => console.log(`      « ${c.quoi} » : ${c.largeur} ${c.style}`));
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
