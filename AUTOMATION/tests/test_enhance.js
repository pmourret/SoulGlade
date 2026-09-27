/* Browser smoke test of « Améliorer » on a prompt fragment (IT-10 chantier 8).

   Ce que ce test tient, dans le composeur de la Banque :
     1. SAME LANGUAGE : la proposition se lit DANS LE CHAMP, en lecture seule,
        ajouts surlignés, retraits sur demande ; Rejeter ne change rien,
        Appliquer écrit la proposition dans le champ ;
     2. LA REQUÊTE porte le type du fragment et son texte, rien d'autre ;
     3. TRADUIT : aucun surlignage, l'original à un clic, et les mots non
        repris dits en toutes lettres, en avertissement ;
     4. LA VALEUR CHANGE AILLEURS (Ctrl+Z) : la révision se ferme sans rien
        écrire, le focus revient au déclencheur ;
     5. UN ÉCHEC s'affiche avec sa cause (`role="alert"`) ;
     6. COMFYUI HORS LIGNE : le bouton est désactivé ;
     6b. LE PANNEAU IA : trois fragments, un seul Ctrl+Z, une case Garder
        décochée qui reste telle quelle, variante, portée, scène du monde
        verrouillée ;
     7. LE CATALOGUE DE MONDE : le décor d'un lieu s'améliore avec son type ;
     7b. L'INSTRUCTION D'ÉDITION : « Traduire », type « edit », et « rien à
         traduire » quand elle est déjà en anglais ;
     7c. LE FOCUS n'est jamais perdu (proposition, Appliquer, erreur, panneau IA),
         une erreur périmée s'en va, les mots perdus d'une traduction le disent ;
     8. RIEN N'EST ÉCRIT : aucun enregistrement, disque intact.

   AUCUN MODÈLE, AUCUNE DONNÉE MODIFIÉE. Le serveur de test tourne sans
   ComfyUI : `/api/enhance` est un bouchon réseau, et l'état système est
   intercepté pour dire ComfyUI en ligne. La scène éditée est une scène
   neuve, jamais enregistrée.

   PRÉREQUIS : voir test_journal.js — run_browser_tests.py fait tout. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('  IGNORE — playwright absent (voir l en-tete du fichier)'); process.exit(0); }

const BASE = process.env.DASHBOARD_URL || 'http://127.0.0.1:8199';
const FIELD = '#sceneInspector [data-f="prompt_base"]';
const inField = sel => `#sceneInspector .f:has([data-f="prompt_base"]) ${sel}`;

async function open(nav, { comfy, path = '/bank/scenes' }) {
  const page = await nav.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = [];
  const sent = [];
  const saves = [];
  const replies = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      errors.push('console: ' + m.text());
  });
  page.on('response', r => {
    if (r.status() >= 400 && !r.url().includes('/api/enhance')) errors.push(`HTTP ${r.status()} : ${r.url()}`);
  });
  page.on('request', r => {
    if (r.method() !== 'GET' && /\/api\/(scenes|worlds)(\/|\?|$)/.test(r.url())) saves.push(r.url());
  });
  await page.route('**/api/state?*', async (route) => {
    const real = await route.fetch();
    const body = await real.json();
    body.comfy = comfy;
    await route.fulfill({ response: real, json: body });
  });
  await page.route(/\/api\/enhance(\/scene)?\?/, async (route) => {
    sent.push(route.request().postDataJSON());
    const [status, body] = replies.shift() || [500, { ok: false, erreur: 'aucune réponse prévue' }];
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(BASE + path + '?character=lena', { waitUntil: 'networkidle' });
  if (path !== '/bank/scenes') return { page, errors, sent, saves, replies };
  await page.click('#btnAddScene');
  await page.waitForSelector('#sceneInspector');
  await page.click('[data-tab="recap"]');
  await page.waitForSelector(FIELD);
  return { page, errors, sent, saves, replies };
}

(async () => {
  const nav = await chromium.launch();
  let ko = 0;
  const say = (good, what) => { console.log(`   ${good ? 'ok  ' : 'ECHEC'} ${what}`); if (!good) ko++; };
  const bank = page => page.evaluate(async () =>
    JSON.stringify((await (await fetch('/api/scenes?character=lena')).json()).data));

  const { page, errors, sent, saves, replies } = await open(nav, { comfy: true });
  const before = await bank(page);
  const run = () => page.click(inField('[data-enhance-run]'));
  const proposal = inField('[data-enhance-proposal]');

  console.log('\n[1] meme langue : comparaison, Rejeter, puis Appliquer');
  say(await page.isDisabled(inField('[data-enhance-run]')), 'champ vide : bouton desactive');
  await page.fill(FIELD, 'standing holding a mug');
  replies.push([200, { ok: true, text: 'standing, holding a warm cup', translated: false, lost: [] }]);
  await run();
  await page.waitForSelector(proposal);
  say(!(await page.isVisible(FIELD)) && (await page.getAttribute(proposal, 'aria-readonly')) === 'true',
      'revision dans le champ : le champ cede sa place, lecture seule');
  say((await page.textContent(inField('[data-enhance-text]'))).includes('warm cup'), 'le texte propose est lu dans le champ');
  const removed = () => page.$$eval(inField('[data-enhance-proposal] del'), e => e.map(x => x.textContent).join(''));
  say((await removed()) === '', 'au repos : aucun retrait montre');
  await page.click(inField('button:has-text("Voir les retraits")'));
  say((await removed()).includes('mug'), `Voir les retraits : « mug » barre a sa place (${await removed()})`);
  say(!(await page.isVisible(inField('[data-enhance-lost]'))), 'aucun mot perdu : pas de ligne');
  await page.click(inField('[data-enhance-reject]'));
  say(!(await page.isVisible(proposal)) && (await page.inputValue(FIELD)) === 'standing holding a mug',
      'Rejeter : proposition fermee, champ intact');
  replies.push([200, { ok: true, text: 'standing, holding a warm cup', translated: false, lost: [] }]);
  await run();
  await page.waitForSelector(proposal);
  await page.click(inField('[data-enhance-apply]'));
  say((await page.inputValue(FIELD)) === 'standing, holding a warm cup', 'Appliquer : la proposition est dans le champ');
  replies.push([200, { ok: true, text: 'standing, holding a warm mug', translated: false, lost: [] }]);
  await run();
  await page.waitForSelector(proposal);
  await page.click(inField('button:has-text("Voir les retraits")'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  say(!(await page.isVisible(proposal)) && (await page.inputValue(FIELD)) === 'standing, holding a warm cup'
      && (await page.isVisible('#sceneInspector')),
      'Echap depuis un bouton de la revision : rejetee, champ intact, l inspecteur reste ouvert');

  console.log('\n[2] la requete : le type et le texte, rien d autre');
  say(JSON.stringify(sent[0]) === JSON.stringify({ kind: 'scene', text: 'standing holding a mug' }),
      `corps envoye ${JSON.stringify(sent[0])}`);

  console.log('\n[3] traduit : aucun surlignage, l original a un clic, mots non repris');
  await page.waitForTimeout(900);            // un pas d'annulation par pause de frappe
  await page.fill(FIELD, 'allongée, sensuelle, lumière douce');
  await page.waitForTimeout(900);
  replies.push([200, { ok: true, text: 'lying down, soft light', translated: true, lost: ['sensual'] }]);
  await run();
  await page.waitForSelector(proposal);
  say((await page.textContent('#sceneInspector .f:has([data-f="prompt_base"])')).includes('Traduit en anglais')
      && (await page.$$(inField('[data-enhance-proposal] [style*="diff-add-word"]'))).length === 0,
      'traduit en anglais, aucun surlignage');
  await page.click(inField('button:has-text("Voir l’original")'));
  say((await page.textContent(inField('[data-enhance-original]'))).includes('allongée'), 'Voir l original : le francais deplie');
  say((await page.textContent(inField('[data-enhance-lost]'))).includes('sensual'), 'mots non repris : sensual');
  const warn = await page.evaluate(sel => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--warn-txt)';
    document.body.append(probe);
    const want = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(document.querySelector(sel)).color === want;
  }, inField('[data-enhance-lost]'));
  say(warn, 'mots non repris en --warn-txt, un avertissement');

  console.log('\n[4] la valeur change ailleurs (Ctrl+Z) : la revision se ferme sans rien ecrire');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  const after = await page.inputValue(FIELD);
  say(!(await page.isVisible(proposal)) && after !== 'lying down, soft light',
      `revision fermee, rien d ecrit (champ : « ${after} »)`);
  say(await page.evaluate(() => document.activeElement?.hasAttribute('data-enhance-run')),
      'le focus revient au declencheur');

  console.log('\n[5] un echec dit sa cause');
  replies.push([400, { ok: false, erreur: 'réponse illisible du modèle local' }]);
  await run();
  await page.waitForSelector(inField('[role="alert"]'));
  say((await page.textContent(inField('[role="alert"]'))).includes('réponse illisible'), 'erreur affichee, role=alert');

  console.log('\n[6] ComfyUI hors ligne : bouton desactive');
  const off = await open(nav, { comfy: false });
  await off.page.fill(FIELD, 'standing');
  say(await off.page.isDisabled(inField('[data-enhance-run]')), 'bouton desactive sans ComfyUI');
  say(off.sent.length === 0, 'aucune requete partie');

  console.log('\n[6b] le panneau IA : la scene entiere');
  // les trois fragments de la scene neuve, chacun dans son onglet
  await page.fill(FIELD, 'standing holding a mug');
  await page.click('[data-tab="light"]');
  await page.fill('#sceneInspector [data-f="prompt_light"]', 'window light');
  await page.click('[data-tab="pose"]');
  await page.fill('#sceneInspector [data-f="prompt_pose"]', 'standing');
  await page.waitForTimeout(900);            // un pas d'annulation par pause de frappe
  await page.click('[data-tab="ai"]');
  await page.waitForSelector('[data-ai-panel]');
  const proposed = { base: 'standing, holding a warm mug', light: 'soft window light from the left', pose: 'standing' };
  sent.length = 0;
  replies.push([200, { ok: true, ...proposed, translated: false, lost: { base: [], light: [], pose: [] } }]);
  await page.click('[data-ai-panel] button:has-text("Plus naturel")');
  await page.click('[data-ai-run]');
  await page.waitForSelector('[data-ai-proposal]');
  say(JSON.stringify(sent[0]) === JSON.stringify({ base: 'standing holding a mug', light: 'window light',
                                                    pose: 'standing', instruction: 'Plus naturel', only: null, vary: false }),
      `requete : trois fragments, consigne du raccourci (${JSON.stringify(sent[0])})`);
  say((await page.textContent('[data-ai-summary]')).includes('2 fragments changent'),
      'resume : 2 fragments changent (la pose est identique)');
  say(!(await page.isVisible('[data-ai-part="pose"]')), 'un fragment inchange n est pas compare');
  replies.push([200, { ok: true, ...proposed, light: 'warm lamp glow', translated: false, lost: { base: [], light: [], pose: [] } }]);
  await page.click('[data-ai-vary]');
  await page.waitForSelector('[data-ai-part="light"]:has-text("warm lamp glow")');
  say(sent[1]?.vary === true, 'Proposer autre chose : vary envoye');
  say((await page.textContent('[data-ai-apply]')).trim() === 'Appliquer 2 fragments', 'deux cases cochees : « Appliquer 2 fragments »');
  await page.click('[data-ai-apply]');
  const valueIn = async (tab, f) => {
    await page.click(`[data-tab="${tab}"]`);
    return page.inputValue(`#sceneInspector [data-f="${f}"]`);
  };
  say((await valueIn('recap', 'prompt_base')) === proposed.base && (await valueIn('light', 'prompt_light')) === 'warm lamp glow',
      'Appliquer : les fragments changes sont dans leurs champs');
  await page.locator('#sceneInspector').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  say((await valueIn('recap', 'prompt_base')) === 'standing holding a mug' && (await valueIn('light', 'prompt_light')) === 'window light',
      'un seul Ctrl+Z rend les deux fragments');
  // une case decochee : ce fragment reste tel quel, les autres partent en un seul pas
  await page.click('[data-tab="ai"]');
  replies.push([200, { ok: true, ...proposed, translated: false, lost: { base: [], light: [], pose: [] } }]);
  await page.click('[data-ai-run]');
  await page.waitForSelector('[data-ai-proposal]');
  await page.uncheck('[data-ai-keep="base"]');
  say((await page.textContent('[data-ai-part="base"]')).includes('écarté, reste tel quel')
      && (await page.textContent('[data-ai-apply]')).trim() === 'Appliquer 1 fragment',
      'Ce qui s y passe decoche : « ecarte », « Appliquer 1 fragment »');
  await page.click('[data-ai-apply]');
  say((await valueIn('recap', 'prompt_base')) === 'standing holding a mug'
      && (await valueIn('light', 'prompt_light')) === proposed.light,
      'Appliquer : seule la lumiere change, le fragment ecarte reste tel quel');
  await page.locator('#sceneInspector').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  say((await valueIn('light', 'prompt_light')) === 'window light', 'un seul Ctrl+Z le rend');
  await page.click('[data-tab="ai"]');
  await page.click('[data-ai-scope="light"]');
  replies.push([200, { ok: true, ...proposed, base: 'standing holding a mug', translated: false, lost: { base: [], light: [], pose: [] } }]);
  await page.click('[data-ai-run]');
  await page.waitForSelector('[data-ai-proposal]');
  say(sent[3]?.only === 'light', 'portee Lumiere : only envoye');
  // une scene reprise du monde : ses fragments sont verrouilles, le panneau aussi
  let locked = null;
  for (const card of await page.$$('[data-scene-card]:not([data-new])')) {
    await card.click();
    await page.click('[data-tab="ai"]');
    if ((await page.textContent('[data-ai-panel]')).includes('repris du monde')) { locked = card; break; }
  }
  say(locked !== null && await page.isDisabled('[data-ai-run]'), 'scene reprise du monde : Proposer desactive');

  console.log('\n[7] le catalogue de monde : le decor d un lieu');
  const world = await open(nav, { comfy: true, path: '/worlds/slow-life/places' });
  await world.page.locator('#worldPlaces [role="tab"]:has-text("Lieux")').click();
  await world.page.click('#worldPlaces [data-entry-row]');
  await world.page.waitForSelector('#entry-prompt');
  const inDecor = sel => `[data-enhance]:has(#entry-prompt) ${sel}`;
  const decor = await world.page.inputValue('#entry-prompt');
  world.replies.push([200, { ok: true, text: 'a sunlit room, plants on the sill', translated: false, lost: [] }]);
  await world.page.click(inDecor('[data-enhance-run]'));
  await world.page.waitForSelector(inDecor('[data-enhance-proposal]'));
  await world.page.click(inDecor('[data-enhance-apply]'));
  say(world.sent[0]?.kind === 'place' && world.sent[0]?.text === decor,
      `type « place », texte du decor (${JSON.stringify(world.sent[0])})`);
  say((await world.page.inputValue('#entry-prompt')) === 'a sunlit room, plants on the sill',
      'Appliquer : dans le champ du lieu');

  console.log('\n[7b] l instruction d edition : traduite, jamais amelioree');
  const prod = await open(nav, { comfy: true, path: '/produce' });
  const editTier = await prod.page.$('#intSel button[data-edit]');
  if (editTier) {
    await editTier.click();
    await prod.page.waitForTimeout(1200);
    if (await prod.page.isVisible('#armBox[open]')) {
      await prod.page.click('#cfOui');
      await prod.page.waitForTimeout(1000);
    }
    await prod.page.click('[data-tab="instruction"]');
    await prod.page.waitForSelector('#editInstr');
    const inEdit = sel => `#stepEdit ${sel}`;
    say((await prod.page.textContent(inEdit('[data-enhance-run]'))).trim() === 'Traduire',
        'le bouton dit « Traduire », pas « Améliorer »');
    await prod.page.fill('#editInstr', 'déboutonne complètement sa chemise');
    prod.replies.push([200, { ok: true, text: 'unbutton the shirt completely', translated: true, lost: [] }]);
    await prod.page.click(inEdit('[data-enhance-run]'));
    await prod.page.waitForSelector(inEdit('[data-enhance-proposal]'));
    say(prod.sent[0]?.kind === 'edit', `type « edit » envoye (${JSON.stringify(prod.sent[0])})`);
    await prod.page.click(inEdit('[data-enhance-apply]'));
    say((await prod.page.inputValue('#editInstr')) === 'unbutton the shirt completely',
        'Appliquer : la traduction dans le champ');
    prod.replies.push([200, { ok: true, text: 'unbutton the shirt completely', translated: false, lost: [] }]);
    await prod.page.click(inEdit('[data-enhance-run]'));
    await prod.page.waitForSelector(inEdit('[data-enhance-same]'));
    say(!(await prod.page.isVisible(inEdit('[data-enhance-proposal]'))),
        'deja en anglais : « rien a traduire », aucune comparaison d un texte avec lui-meme');
  } else {
    console.log("      (aucun cran d'edition pour ce personnage : section sautee)");
  }
  prod.errors.forEach(e => errors.push(e));
  // the page polls /api/state through a route: close it with a request in flight
  await prod.page.unrouteAll({ behavior: 'ignoreErrors' });
  await prod.page.close();

  console.log('\n[7c] le focus n est jamais perdu, une erreur perimee s en va (audit du 27/09)');
  const kb = await open(nav, { comfy: true });
  const focused = () => kb.page.evaluate(() => {
    const a = document.activeElement;
    return a?.hasAttribute('data-enhance-run') ? 'run' : a?.hasAttribute('data-enhance-proposal') ? 'proposal'
      : a?.hasAttribute('data-ai-run') ? 'ai-run' : a?.hasAttribute('data-ai-proposal') ? 'ai-proposal'
      : a?.tagName;
  });
  await kb.page.fill(FIELD, 'elle lit un livre assise');
  kb.replies.push([200, { ok: true, text: 'reading a book', translated: true, lost: ['sitting'] }]);
  await kb.page.focus(inField('[data-enhance-run]'));
  await kb.page.keyboard.press('Enter');
  await kb.page.waitForSelector(inField('[data-enhance-proposal]'));
  await kb.page.waitForTimeout(100);
  say((await focused()) === 'proposal', `la proposition prend le focus a son arrivee (${await focused()})`);
  say((await kb.page.textContent(inField('[data-enhance-lost]'))).startsWith('Mots de la traduction non repris'),
      'apres une traduction : « mots de la traduction non repris »');
  await kb.page.keyboard.press('Enter');
  await kb.page.waitForTimeout(100);
  say((await kb.page.inputValue(FIELD)) === 'reading a book', 'Entree sur la revision : Appliquer, au clavier seul');
  say((await focused()) === 'run', `apres Appliquer, le focus revient au bouton (${await focused()})`);
  kb.replies.push([200, { ok: true, text: 'reading a thick book', translated: false, lost: [] }]);
  await kb.page.keyboard.press('Enter');
  await kb.page.waitForSelector(inField('[data-enhance-proposal]'));
  await kb.page.waitForTimeout(100);
  await kb.page.keyboard.press('Escape');
  await kb.page.waitForTimeout(100);
  say((await kb.page.inputValue(FIELD)) === 'reading a book' && !(await kb.page.isVisible(inField('[data-enhance-proposal]'))),
      'Echap : la proposition est rejetee, le champ intact');
  say((await focused()) === 'run', `apres Echap, le focus revient au bouton (${await focused()})`);

  kb.replies.push([400, { ok: false, erreur: 'réponse illisible du modèle local' }]);
  await kb.page.click(inField('[data-enhance-run]'));
  await kb.page.waitForSelector(inField('[role="alert"]'));
  await kb.page.waitForTimeout(100);
  say((await focused()) === 'run', `apres une erreur, le focus reste sur le bouton (${await focused()})`);
  await kb.page.fill(FIELD, 'reading a novel');
  await kb.page.waitForTimeout(100);
  say(!(await kb.page.isVisible(inField('[role="alert"]'))), 'le texte change : l erreur perimee s en va');

  await kb.page.click('[data-tab="ai"]');
  await kb.page.waitForSelector('[data-ai-panel]');
  kb.replies.push([200, { ok: true, base: 'reading a novel by the window', light: '', pose: '', translated: false,
                          lost: { base: [], light: [], pose: [] } }]);
  await kb.page.focus('[data-ai-run]');
  await kb.page.keyboard.press('Enter');
  await kb.page.waitForSelector('[data-ai-proposal]');
  await kb.page.waitForTimeout(100);
  say((await focused()) === 'ai-proposal', `panneau IA : la proposition prend le focus (${await focused()})`);
  await kb.page.click('[data-ai-reject]');
  await kb.page.waitForTimeout(100);
  say((await focused()) === 'ai-run', `panneau IA : apres Rejeter, le focus revient a Proposer (${await focused()})`);
  kb.errors.filter(e => !/status of 400/.test(e)).forEach(e => errors.push(e));
  kb.saves.forEach(u => saves.push(u));
  // the page polls /api/state through a route: close it with a request in flight
  await kb.page.unrouteAll({ behavior: 'ignoreErrors' });
  await kb.page.close();

  console.log('\n[8] rien n est ecrit');
  const writes = [...saves, ...off.saves, ...world.saves];
  say(writes.length === 0, `aucun enregistrement (${writes.join(', ')})`);
  say((await bank(page)) === before, 'banque sur le disque intacte');

  console.log('\n[9] aucune erreur JS');
  const all = [...errors, ...off.errors, ...world.errors];
  say(all.length === 0, `${all.length} erreur(s)`);
  all.forEach(e => console.log('      ' + e.slice(0, 150)));

  console.log('\n' + '='.repeat(70));
  console.log(ko ? `${ko} ECHEC(S)` : 'tout est vert');
  console.log('='.repeat(70));
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
