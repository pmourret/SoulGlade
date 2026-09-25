/* Browser smoke test of the expression editor — `/bank/tones/edit/:tone`.

   Runs against `lena`: this editor previews on an ALREADY-PRODUCED photo (a
   deliberate design choice — see AUTOMATION/expression.py's own reasoning
   for why a fresh upload would not give a meaningful identity cost), and
   only a real character has any. It touches `CHARACTERS/lena/creative.json`
   for real, so it SNAPSHOTS it first and restores it BYTE FOR BYTE at the
   end, success or failure — this is real production configuration, not a
   throwaway fixture (same discipline as test_pose_bank.js's own cleanup
   guard, applied to a file instead of a set of pose cards).

   ComfyUI is used if reachable (the render step measures a real identity
   score), but the test does not require it: the range-only assertions
   ([1], [2], [4]) never touch ComfyUI at all, and [3] tolerates a render
   failure rather than treating it as this test's own failure — the render
   PATH itself is what test_expression_isolation.py already locks down.
   [3] deliberately triggers a 500 when neither ComfyUI nor a proper
   Python (cv2) is available — [6]'s error filter knows about that one. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const fs = require('fs');
const path = require('path');

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const OFM = path.resolve(__dirname, '..', '..');
const CREATIVE_PATH = path.join(OFM, 'CHARACTERS', 'lena', 'creative.json');
const TONE = 'doux';

(async () => {
  const avantCreative = fs.readFileSync(CREATIVE_PATH);
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1400, height: 950 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  /* design-pass screen-8 §S5.4 : une borne se LIT en mono et s'ouvre au clic.
     Deux champs numeriques toujours ouverts par ligne faisaient 24 arrets de
     tabulation dans un panneau qu'on parcourt surtout des yeux. */
  const paramBound = (param, field) => `[data-param="${param}"] [data-param-bound="${field}"]`;
  const paramField = (param, field) => `[data-param="${param}"] [data-param-field="${field}"]`;
  const lireBorne = async (param, field) => (await page.textContent(paramBound(param, field))).trim();
  const ecrireBorne = async (param, field, valeur) => {
    await page.click(paramBound(param, field));
    await page.fill(paramField(param, field), String(valeur));
    await page.press(paramField(param, field), 'Enter');
    await page.waitForTimeout(80);
  };

  try {
    console.log(`\n[1] l'écran charge le ton "${TONE}" et hydrate ce qui est déjà réglé`);
    await page.goto(`${BASE}/bank/tones/edit/${TONE}?character=lena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-tone-name]');
    dire((await page.textContent('[data-tone-name]') || '').includes('Doux'),
         'le libellé du ton s’affiche');
    dire(await page.isChecked('[data-param="smile"] [data-param-included]'),
         '« smile », déjà réglé dans creative.json, part inclus');
    dire((await lireBorne('smile', 'min')) === '0.1',
         'son minimum vient bien du fichier (0.1)');
    dire(!(await page.isChecked('[data-param="wink"] [data-param-included]')),
         '« wink », absent du ton, part NON inclus');

    console.log('\n[2] cocher un paramètre absent, écrire sa plage exacte, enregistrer');
    await page.check('[data-param="wink"] [data-param-included]');
    await ecrireBorne('wink', 'min', 4);
    await ecrireBorne('wink', 'max', 9);
    dire((await lireBorne('wink', 'min')) === '4' && (await lireBorne('wink', 'max')) === '9',
         'la plage affichée reflète les deux bornes saisies (4 / 9)');
    // Le bouton d'enregistrement a quitte l'ecran : c'est le bandeau du chrome
    // qui porte le geste et le Ctrl S (§S2).
    dire(await page.isVisible('#pendingBar'),
         'le bandeau du chrome annonce la plage non enregistrée');
    dire((await page.textContent('#pendingBar') || '').includes('creative.json'),
         'et nomme le fichier concerné');
    await page.click('#btnPendingSave');
    await page.waitForTimeout(400);
    const creativeApres = JSON.parse(fs.readFileSync(CREATIVE_PATH, 'utf-8'));
    const toneApres = creativeApres.tones.find(t => t.key === TONE);
    dire(Array.isArray(toneApres?.expression?.wink)
         && toneApres.expression.wink[0] === 4 && toneApres.expression.wink[1] === 9,
         `creative.json porte la nouvelle plage (${JSON.stringify(toneApres?.expression?.wink)})`);
    dire(Array.isArray(toneApres?.expression?.smile),
         'les paramètres déjà réglés avant ce run (smile) survivent à la sauvegarde');

    console.log('\n[2bis] « [ » et « ] » posent l’essai comme minimum et maximum');
    // Les boutons « mn » / « mx » ont quitte l'affichage (§S5.4) : le geste
    // reste, au clavier, depuis n'importe ou dans la ligne. L'essai n'a plus
    // de champ a lui — il EST le repere de la reglette, et `aria-valuenow` le
    // dit, ce qui est aussi ce qu'un lecteur d'ecran annonce.
    const regle = '[data-param="wink"] [data-param-trial]';
    await page.focus(regle);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const essai = await page.getAttribute(regle, 'aria-valuenow');
    await page.keyboard.press('[');
    await page.waitForTimeout(120);
    dire((await lireBorne('wink', 'min')) === essai,
         `« [ » a posé le minimum sur la valeur d’essai (${essai})`);
    await page.keyboard.press('ArrowRight');
    const essai2 = await page.getAttribute(regle, 'aria-valuenow');
    await page.keyboard.press(']');
    await page.waitForTimeout(120);
    dire((await lireBorne('wink', 'max')) === essai2,
         `« ] » a posé le maximum sur la valeur d’essai (${essai2})`);
    // Rien de tout cela n'est enregistre : [4] relit le disque plus bas.

    console.log('\n[3] compteur de groupe, puis choisir jusqu’à 3 photos et rendre un aperçu chacune');
    // "Bouche —" (avec le tiret), pas juste "Bouche" : le modal "Copier
    // depuis…" (fermé mais toujours dans le DOM, <dialog> natif) porte
    // aussi un `.tiny` listant "bouche ouverte (a)" en sous-titre — un
    // match insensible à la casse sur "Bouche" seul choisissait CE texte
    // au lieu de l'en-tête de groupe, plus tôt dans le DOM depuis que le
    // modal existe en permanence.
    const compteurBouche = (await page.textContent('.tiny:has-text("Bouche —")')) || '';
    dire(/\d+\/4 inclus/.test(compteurBouche), `le groupe « Bouche » affiche son compteur (${compteurBouche.trim()})`);

    const miniatures = await page.$$('[data-photo]');
    if (miniatures.length === 0) {
      console.log('  IGNORE [3] — aucune photo dans PROD/LENA/OK sur cette machine');
    } else {
      const aSelectionner = miniatures.slice(0, Math.min(3, miniatures.length));
      for (const vignette of aSelectionner) await vignette.click();
      dire((await page.textContent('#bankTones') || '').includes(`${aSelectionner.length} / 3`),
           `${aSelectionner.length} photo(s) sélectionnée(s), compteur à jour`);

      if (miniatures.length > 3) {
        await miniatures[3].click();
        const texteToast = (await page.textContent('#toast').catch(() => '')) || '';
        dire(texteToast.includes('3 photos maximum'),
             `clic sur une 4ᵉ vignette — toast explicite plutôt qu’un clic mort ("${texteToast}")`);
      }

      // §S4.1 : le motif de l'indisponibilite vit sur l'ENVELOPPE du bouton,
      // pas sur le bouton — un <button> desactive ne recoit ni survol ni
      // focus, donc HintLayer ne le verrait jamais dans le seul etat ou la
      // raison compte (la lecon de #btnPoseExtract, screen-7d).
      const motif = await page.$eval('#btnRenderTrial',
                                     e => e.closest('[data-hint-text]')?.dataset.hintText || '');
      if (await page.isDisabled('#btnRenderTrial')) {
        dire(motif.length > 0,
             `« Rendre l’essai » est désarmé et dit pourquoi (« ${motif} ») — ComfyUI hors ligne ici`);
      } else {
        dire(motif === '', 'ComfyUI est en ligne : le bouton est armé, sans motif d’indisponibilité');
        await page.click('#btnRenderTrial');
        // A flat, bounded wait rather than chasing the button's transient
        // label — the round trip is either a fast local rejection (~0.1s,
        // e.g. no cv2 in this venv) or a real ComfyUI render (a few seconds);
        // this assertion is informational either way, never gating [4].
        await page.waitForTimeout(5000);
        // Une carte en echec porte `role="alert"` (§A), et elle seule : les
        // deux autres restent muettes. Scope a CET ecran, le chrome monte ses
        // propres regions vivantes plus haut dans le DOM.
        const statut = (await page.textContent('#expressionEditor [role="alert"]').catch(() => null)) || '';
        dire(true, `rendu tenté (${aSelectionner.length} carte(s)) — ${statut ? 'erreur affichée : ' + statut : 'pas d’erreur affichée (ou succès)'}`);
      }

      console.log('\n[3b] modal « Copier depuis… » : ouvre, applique en un geste, se referme');
      const menuCopie = page.locator('button:has-text("Copier depuis…")');
      if (await menuCopie.count() === 0) {
        console.log('  IGNORE [3b] — aucun autre ton n’a de plage enregistrée sur ce personnage');
      } else {
        const boite = page.locator('#copyFromToneBox');
        await menuCopie.click();
        dire(await boite.isVisible(), 'la boîte s’ouvre sur clic');
        await boite.locator('button').first().click();
        dire(!(await boite.isVisible().catch(() => false)),
             'la boîte se referme après avoir choisi une source');
        dire((await page.textContent('#pendingBar').catch(() => '') || '').includes('modifiée'),
             'la copie fait apparaître le bandeau de plage non enregistrée');
      }
    }

    console.log('\n[4] revisiter la page relit bien la plage tout juste enregistrée');
    await page.goto(`${BASE}/bank/tones/edit/${TONE}?character=lena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-tone-name]');
    dire(await page.isChecked('[data-param="wink"] [data-param-included]'),
         'wink reste inclus après rechargement');
    dire((await lireBorne('wink', 'min')) === '4',
         'la plage relue correspond à ce qui a été enregistré');
    dire(!(await page.isVisible('#pendingBar')),
         'et rien n’est en attente : le bandeau a disparu avec l’enregistrement');

    console.log('\n[4bis] la liste des tons : flèches, adresse partageable, confirmation à trois issues');
    const tons = await page.$$eval('#tonesGrid [data-tone-card]', e => e.map(x => x.dataset.key));
    dire(tons.includes(TONE), `la liste porte les tons du personnage (${tons.join(', ')})`);
    const marqueurs = await page.$$eval(
      `#tonesGrid [data-tone-card][data-key="${TONE}"] [aria-hidden="true"] span`, e => e.length);
    dire(marqueurs === 12, `la bande de repères compte un trait par paramètre (${marqueurs})`);

    const autre = tons.find(t => t !== TONE);
    if (!autre) {
      console.log('  IGNORE [4bis] — un seul ton déclaré sur ce personnage');
    } else {
      // §S3 : les flèches déplacent la sélection dans la liste, comme la table
      // des poses. La sélection EST la navigation : l'URL suit, l'écran non.
      await page.focus(`#tonesGrid [data-tone-card][data-key="${TONE}"]`);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(350);
      dire((await page.evaluate(() => location.pathname)) !== `/bank/tones/edit/${TONE}`,
           'la flèche bas ouvre le ton suivant');
      dire(await page.isVisible('#expressionEditor'), 'sans quitter l’écran');

      // §S1 : une plage en attente pose une VRAIE question à trois issues —
      // enregistrer, abandonner, annuler — pas un oui/non déguisé.
      await page.goto(`${BASE}/bank/tones/edit/${TONE}?character=lena`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-tone-name]');
      await page.click('[data-param="eyebrow"] [data-param-included]');
      await page.waitForTimeout(120);
      await page.click(`#tonesGrid [data-tone-card][data-key="${autre}"]`);
      await page.waitForSelector('#armBox[open]');
      dire(await page.isVisible('#cfAlt'),
           'la boîte offre bien trois issues, pas deux');
      await page.click('#cfNon');
      await page.waitForTimeout(300);
      dire((await page.evaluate(() => location.pathname)) === `/bank/tones/edit/${TONE}`,
           '« annuler » laisse le ton ouvert et ses modifications intactes');
      dire(await page.isVisible('#pendingBar'), 'et la plage est toujours en attente');

      await page.click(`#tonesGrid [data-tone-card][data-key="${autre}"]`);
      await page.waitForSelector('#armBox[open]');
      await page.click('#cfAlt');
      await page.waitForTimeout(400);
      dire((await page.evaluate(() => location.pathname)) === `/bank/tones/edit/${autre}`,
           '« abandonner » passe au ton demandé');
      dire(!(await page.isVisible('#pendingBar')),
           'et jette les modifications : plus rien en attente, rien écrit sur disque');
    }

    /* IT-10 (25/09) : le fragment de prompt d'un ton se LIT ici, et s'ajuste
       pour ce personnage. C'est le fragment de `joueur` (« slight motion
       blur ») qui degradait les selfies sans qu'aucun ecran ne le montre. */
    console.log('\n[4ter] le fragment du ton se lit, s ajuste pour ce personnage, et revient au monde');
    await page.goto(`${BASE}/bank/tones/edit/joueur?character=lena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#toneText');
    const origine = (await page.textContent('#toneTextFragment')).trim();
    dire(origine.length > 0 && origine !== 'aucun fragment', `le fragment se lit : « ${origine.slice(0, 50)} »`);
    dire(await page.getAttribute('[data-tone-layer]', 'data-tone-layer') === 'monde',
         'et sa couche est dite : du monde');
    dire((await page.textContent('#bankTones')).includes('viennent du monde'),
         'le bandeau ne pretend plus que les tons se declarent dans creative.json');
    await page.click('#btnToneAdjust');
    await page.fill('#toneTextPrompt', 'candid movement, spontaneous gesture');
    await page.click('#btnToneTextSave');
    await page.waitForSelector('#toneTextFragment');
    await page.waitForTimeout(300);
    dire((await page.textContent('#toneTextFragment')).trim() === 'candid movement, spontaneous gesture',
         'le fragment ajuste s affiche');
    dire(await page.getAttribute('[data-tone-layer]', 'data-tone-layer') === 'surcharge'
         && (await page.$('[data-key="joueur"] [data-tone-couche="surcharge"]')) !== null,
         'la couche passe a « ajuste », dans la carte et dans la liste');
    const ecrit = JSON.parse(fs.readFileSync(CREATIVE_PATH, 'utf-8')).tones.find(t => t.key === 'joueur');
    dire(ecrit && ecrit.prompt_add === 'candid movement, spontaneous gesture' && !('label' in ecrit && ecrit.label === undefined),
         'creative.json de lena porte le fragment ajuste');
    await page.click('#toneText button:has-text("Revenir au monde")');
    await page.waitForTimeout(400);
    dire((await page.textContent('#toneTextFragment')).trim() === origine,
         'revenir au monde rend le fragment d origine');
    const rendu = JSON.parse(fs.readFileSync(CREATIVE_PATH, 'utf-8')).tones.find(t => t.key === 'joueur');
    dire(!rendu || !('prompt_add' in rendu), 'et creative.json ne le porte plus');

    console.log('\n[5] un ton inconnu affiche un état vide explicite, pas un crash');
    await page.goto(`${BASE}/bank/tones/edit/ce-ton-n-existe-pas?character=lena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#bankTones .empty');
    dire((await page.textContent('#bankTones')).includes('introuvable'),
         'message explicite plutôt qu’un écran blanc');

    console.log('\n[6] aucune erreur JS réelle sur tout le parcours');
    // [3] deliberately triggers ITS OWN 500 (no cv2 / ComfyUI unreachable) to
    // exercise the error path — that echo is expected noise, not a real bug,
    // same treatment as the 404 filter every other fumigation already uses.
    const reelles = erreurs.filter(e =>
      !/Failed to load resource.*404/.test(e) &&
      !/Failed to load resource.*500/.test(e));
    dire(reelles.length === 0, `${reelles.length} erreur(s)`);
    reelles.forEach(e => console.log('      ' + e.slice(0, 150)));
  } finally {
    fs.writeFileSync(CREATIVE_PATH, avantCreative);
    await nav.close();
  }

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  process.exit(ko ? 1 : 0);
})();
