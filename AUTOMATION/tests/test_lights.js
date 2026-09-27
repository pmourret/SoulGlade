/* Browser smoke test of the light catalogue — /bank/lights and the Lumière
   tab of the composer (IT-10 chantier 7, and the studio sheet of 7 bis).

   WHAT IT LOCKS, in the order a user meets it:
     1. a light is created in the workshop from a scheme, its direction moved
        on the diagram, the colour of an effect changed (palette and free), a
        user's own effect created and carried — and the English sentence under
        the sheet follows, IDENTICAL to the one the server gives the saved
        light (the screen composes it with the served vocabulary, the server
        at launch: two grammars that must not drift). Then rewritten by hand,
        the sheet says so;
     2. in the Lumière tab the catalogue replaces the « bientôt » line, and a
        light is added as a variant — ONE line, shown by its label and its
        text, never by `@key` — and, when the scene is not bound to the world,
        posed as the scene's light;
     3. saved, the scene carries the reference on disk, and reopened it still
        shows the light where it was put: in the Lumière tab;
     4. (7 bis) a scene that carries a light calls its variants « autres
        lumières », and a scene text that already describes a light is
        flagged in the Lumière tab.

   IT TOUCHES REAL DATA (the character's creative.json and scenes.json) and
   cleans up behind itself, with the guard frontend.md asks for: the scene
   bank is put back EXACTLY as it was read at the start (through the API), and
   what is removed from the catalogue is the SET DIFFERENCE against its state
   at the very start, never a name pattern. It writes on the CHARACTER side
   only: a world file is versioned.

   Lancer :  python AUTOMATION/tests/run_browser_tests.py --only test_lights
   (SMOKE_CHARACTER choisit le personnage, lena par défaut) */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const CID = process.env.SMOKE_CHARACTER || 'lena';
const LABEL = 'Lumière de fumigation';
const TEXTE = 'fumigation dusk light from the left';
const EFFET = 'Fumée de fumigation';

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1400, height: 900 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });

  let ko = 0;
  const dire = (bon, quoi) => { console.log(`   ${bon ? 'ok  ' : 'ECHEC'} ${quoi}`); if (!bon) ko++; };
  const cles = () => page.$$eval('#bankLights [data-light]', e => e.map(x => x.dataset.light));
  const banque = () => page.evaluate(async (cid) =>
    (await (await fetch(`/api/scenes?character=${cid}`)).json()).data, CID);
  const champ = f => `#sceneInspector [data-f="${f}"]`;

  await page.goto(`${BASE}/bank/lights?character=${CID}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#bankLights');
  const avant = await cles();
  const banqueAvant = await banque();
  const effets = () => page.evaluate(async (cid) =>
    ((await (await fetch(`/api/light-effects?character=${cid}`)).json()).effects || [])
      .map((e) => e.key), CID);
  const effetsAvant = await effets();
  const phrase = () => page.textContent('#lightPhrase');
  let cle = null;
  let sceneTouchee = false;

  try {
    console.log('\n[1] la sous-vue existe et se nomme dans la barre des ateliers');
    dire(await page.isVisible('#bankView [data-vue="lights"]'), 'l\'onglet « Lumières » est là');

    console.log('\n[2] créer une lumière depuis un schéma, la phrase suit sous les yeux');
    /* Design-pass lumieres: with no light the new sheet is already open and
       « Créer la lumière » is the only call; « Nouvelle lumière » only exists
       next to a list. */
    if (avant.length === 0) {
      dire(!(await page.isVisible('#btnLightNew')) && await page.isVisible('#lightsEmpty'),
           'aucune lumière : la fiche neuve est ouverte, un seul appel de création');
    } else {
      await page.click('#btnLightNew');
    }
    await page.waitForSelector('#lightSchemes [data-scheme="cyberpunk"]');
    await page.fill('#lightLabel', LABEL);
    await page.click('#lightSchemes [data-scheme="cyberpunk"]');
    const depart = await phrase();
    dire(depart.startsWith('hard cool neon light from the side'),
         `le schéma « néon cyberpunk » remplit la fiche (${depart})`);
    await page.click('#lightSetup [data-light-setting="direction"] [data-option="back"]');
    dire((await phrase()).includes('from behind the subject'), 'la direction, choisie sur le schéma, suit');
    await page.click('[data-light-effect="neon_reflections"] [data-color="green"]');
    dire((await phrase()).includes('green neon reflections'), 'la couleur de palette d\'un effet suit');
    // The free colour: « Autre… » opens the wheel, which proposes words; the
    // words are the user's to rewrite, and only they reach the prompt.
    await page.click('[data-light-effect="wet_floor"] [data-color-other]');
    await page.waitForSelector('#lightFxColor');
    const propose = await page.inputValue('#lightFxColorName');
    dire(/^[a-z ]+$/.test(propose), `la roue propose des mots anglais (« ${propose} »), jamais une valeur`);
    await page.fill('#lightFxColorName', 'deep violet');
    await page.click('#btnLightFxColorUse');
    dire((await phrase()).includes('wet ground reflecting deep violet lights'), 'une couleur libre aussi');
    await page.click('#btnLightEffectNew');
    await page.fill('#lightEffectLabel', EFFET);
    await page.fill('#lightEffectFragment', '{color} smoke haze');
    await page.click('#btnLightEffectCreate');
    await page.waitForFunction(() => !document.querySelector('#lightEffectNew'), null, { timeout: 10000 });
    const cleEffet = (await effets()).find((k) => !effetsAvant.includes(k));
    dire(Boolean(cleEffet), `un effet à soi est créé depuis la fiche (${cleEffet})`);
    await page.check(`#lightFx-${cleEffet}`);
    await page.click(`[data-light-effect="${cleEffet}"] [data-color="amber"]`);
    const ecran = await phrase();
    dire(ecran.endsWith('amber smoke haze'), `et la fiche le porte, en couleur (${ecran})`);
    await page.click('#btnLightSave');
    await page.waitForFunction(
      (n) => document.querySelectorAll('#bankLights [data-light]').length > n,
      avant.length, { timeout: 10000 });
    const nouvelles = (await cles()).filter((k) => !avant.includes(k));
    dire(nouvelles.length === 1, `une lumière et une seule est créée (${nouvelles})`);
    cle = nouvelles[0];
    const serveur = await page.evaluate(async ({ cid, k }) =>
      ((await (await fetch(`/api/lights?character=${cid}`)).json()).lights || [])
        .find((l) => l.key === k), { cid: CID, k: cle });
    dire(serveur && serveur.texte === ecran && !serveur.text,
         `la phrase de l'écran est celle du serveur, à l'octet près (« ${serveur && serveur.texte} »)`);
    dire((await page.textContent('[data-light-layer]')).includes('Propre au personnage'),
         'la couche est dite : propre au personnage');

    console.log('\n[2 bis] réécrite à la main, elle prime et la fiche le dit');
    await page.click('#btnLightHand');
    await page.fill('#lightText', TEXTE);
    dire(await page.isVisible('[data-light-hand]'), 'la fiche dit « texte écrit à la main »');
    await page.click('#btnLightSave');
    await page.waitForFunction((k) => ((document.querySelector(`#bankLights [data-light="${k}"]`)
      || {}).textContent || '').includes('fumigation dusk'), cle, { timeout: 10000 });
    dire((await page.textContent(`#bankLights [data-light="${cle}"]`)).includes(TEXTE),
         'la ligne dit le texte que la scène recevra');

    console.log('\n[3] l\'onglet Lumière la pose en variante, montrée par son libellé');
    await page.goto(`${BASE}/bank/scenes?character=${CID}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-scene-card]');
    await page.click('[data-scene-card]');
    await page.waitForSelector('[data-tabpanel]', { timeout: 10000 });
    // le composeur s'ouvre sur Général, qui porte l'identifiant de la scène
    const idScene = await page.$eval(champ('id'), (e) => e.value);
    await page.click('[data-tab="light"]');
    await page.waitForSelector('#lightCatalog');
    dire(!(await page.isVisible('text=Templates de lumière')),
         'la ligne « bientôt » a laissé la place au catalogue');
    const variantes = async () => ((await page.getAttribute(champ('variants'), 'data-value')) || '')
      .split('\n').filter((l) => l.trim());
    const avantVar = await variantes();
    await page.click(`[data-catalog-light="${cle}"] [data-light-use="variant"]`);
    await page.waitForTimeout(300);
    const apresVar = await variantes();
    dire(apresVar.length === avantVar.length + 1 && apresVar.includes(`@${cle}`),
         'un clic ajoute UNE variante, la référence de la lumière');
    const vue = (await page.textContent(`[data-f="variants"] [data-light-line="@${cle}"]`)) || '';
    dire(vue.includes(LABEL) && vue.includes(TEXTE) && !vue.includes(`@${cle}`),
         'la variante se lit par son libellé et son texte, jamais par sa clé');

    const poser = `[data-catalog-light="${cle}"] [data-light-use="field"]`;
    // Une scène reprise du monde verrouille sa lumière (le monde la dit) : le
    // geste d'une personne est d'en faire la copie du personnage d'abord.
    if (await page.isDisabled(poser) && await page.isVisible('#sceneCopy')) {
      await page.click('#sceneCopy');
      await page.waitForTimeout(300);
    }
    const libre = !(await page.isDisabled(poser));
    if (libre) {
      await page.click(poser);
      await page.waitForTimeout(300);
      dire((await page.getAttribute(champ('prompt_light'), 'data-value')) === `@${cle}`,
           'posée comme lumière de la scène, le champ porte sa référence');
      dire((await page.textContent('#scenePromptPreview')).includes(TEXTE),
           'l\'aperçu du prompt montre son texte, pas sa clé');
      dire((await page.textContent('#lightVariantsHead')) === 'Autres lumières',
           'la scène porte une lumière : ses variantes se disent « autres lumières »');

      // une lumière écrite dans le texte de la scène se signale, puis le texte revient
      await page.click('[data-tab="recap"]');
      const texte = await page.$eval(champ('prompt_base'), (e) => e.value);
      await page.fill(champ('prompt_base'), `${texte}, golden hour`);
      await page.click('[data-tab="light"]');
      await page.waitForSelector('#lightCatalog');
      dire(((await page.textContent('#lightAlreadyWritten').catch(() => '')) || '').includes('golden hour'),
           'le texte de la scène décrit déjà une lumière : l\'onglet le dit');
      await page.click('[data-tab="recap"]');
      await page.fill(champ('prompt_base'), texte);
      await page.click('[data-tab="light"]');
      await page.waitForSelector('#lightCatalog');
    } else {
      console.log('   IGNORE — lumière verrouillée, et aucune copie possible');
    }

    console.log('\n[4] enregistrée puis rouverte, la scène la rend à l\'onglet Lumière');
    sceneTouchee = true;
    await page.click('#btnDirtySave');
    await page.waitForFunction(() => !document.querySelector('#dirtyBar'), null, { timeout: 10000 })
      .catch(() => {});
    const disque = (await banque()).scenes.find((s) => s.id === idScene) || {};
    dire((disque.variants || []).includes(`@${cle}`),
         `le disque garde la référence, pas le texte (${JSON.stringify(disque.variants)})`);
    if (libre) dire(disque.light === `@${cle}`, `et « light » aussi (${disque.light})`);
    await page.goto(`${BASE}/bank/scenes?character=${CID}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-scene-card]');
    await page.fill('#sceneFilter', idScene);
    await page.waitForTimeout(250);
    await page.click('[data-scene-card]');
    await page.waitForSelector('[data-tabpanel]', { timeout: 10000 });
    await page.click('[data-tab="light"]');
    await page.waitForSelector('#lightCatalog');
    dire(await page.isVisible(`[data-f="variants"] [data-light-line="@${cle}"]`),
         'rouverte, la variante est toujours là, par son libellé');
    if (libre) dire(await page.isVisible(`[data-f="prompt_light"] [data-light-line="@${cle}"]`),
                    'et la lumière de la scène aussi');
  } finally {
    console.log('\n[5] NETTOYAGE : la banque revient à son état de départ, la lumière est retirée');
    if (sceneTouchee) {
      const ok = await page.evaluate(async ({ cid, doc }) => {
        const r = await fetch(`/api/scenes?character=${cid}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: doc }) });
        return (await r.json()).ok;
      }, { cid: CID, doc: banqueAvant });
      dire(ok === true, 'la banque d\'origine est réécrite');
      dire(JSON.stringify(await banque()) === JSON.stringify(banqueAvant),
           'et elle est identique à celle lue au départ');
    }
    await page.goto(`${BASE}/bank/lights?character=${CID}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#bankLights');
    const aRetirer = (await cles()).filter((k) => !avant.includes(k));
    console.log('   à retirer :', aRetirer);
    for (const k of aRetirer) {
      await page.click(`#bankLights [data-light="${k}"]`);
      await page.waitForSelector('#btnLightDelete');
      await page.click('#btnLightDelete');
      await page.waitForSelector('#armBox[open]');
      await page.click('#cfOui');
      await page.waitForTimeout(500);
    }
    const final = await cles();
    dire(final.length === avant.length && avant.every((k) => final.includes(k)),
         `le catalogue est revenu exactement à son état de départ (${final.length})`);
    for (const k of (await effets()).filter((k) => !effetsAvant.includes(k))) {
      await page.evaluate(async ({ cid, k }) => fetch(`/api/light-effects/delete?character=${cid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k }) }), { cid: CID, k });
    }
    const effetsFin = await effets();
    dire(effetsFin.length === effetsAvant.length, `les effets aussi (${effetsFin.length})`);
  }

  console.log('\n[6] aucune erreur JS réelle sur tout le parcours');
  const reelles = erreurs.filter(e => !/Failed to load resource.*404/.test(e));
  dire(reelles.length === 0, `${reelles.length} erreur(s)`);
  reelles.forEach(e => console.log('      ' + e.slice(0, 150)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
