# IT-10, chantier 7 bis : le studio de lumière

**Date** : 2026-09-26 · **Décision** : Pierre, 26/09 (un vocabulaire pour
**les deux publics**, le nom parlant et le terme du métier ; une variante
**remplace** la lumière de base ; la phrase anglaise générée **se montre** ;
les schémas de départ viennent de **la plateforme** ; les **effets et
reflets** — néon, sol mouillé — font partie du sous-studio ; une **couleur
libre** en plus de la palette, et des **effets personnalisés** dès le début ;
l'**essai de rendu** entre dans le chantier, en dernière étape)

Suite du chantier 7 (`2026-09-26-it10-c7-lumieres.md`), qui a livré le
catalogue et le champ `light`. Ce qui change ici : la façon dont on **crée**
une lumière. Le stockage et la résolution restent, à une exception près (la
variante, §« Ce qui est tranché »).

## Pour qui

Pour l'utilisateur qui pense sa scène en studio — d'où vient la lumière,
de quel côté, dure ou douce, quelle couleur, quels effets — et à qui
l'atelier demande aujourd'hui d'écrire une phrase de prompt en anglais.

Deux publics, un même écran : celui qui ne connaît pas l'éclairage lit
« lumière de fenêtre douce », celui qui le connaît lit « Rembrandt » ou
« split » à côté.

## Ce qui est constaté

- **Une lumière est une phrase libre en anglais.** Rien ne guide son
  écriture ; deux lumières du catalogue disent la même chose avec d'autres
  mots, et le vocabulaire est celui d'un rédacteur de prompt, pas d'un
  photographe.
- **Une variante s'ajoute, elle ne remplace pas.** `build_jobs` met son
  texte en fin de prompt ; la lumière de base reste. « Même scène, lumière
  du soir » donne une scène éclairée deux fois.
- **Les scènes des mondes portent leur lumière dans leur texte** (audit du
  chantier 7). Une lumière posée sur leur copie s'ajoute à celle du texte,
  sans que rien ne le signale.
- **Aucun effet** : ni néon, ni reflet, ni lumière colorée — ce qui fait
  pourtant l'essentiel d'un style (cyberpunk, club, rétro).

## Ce qui est tranché

- **Toujours un fragment de prompt.** Ni graphe, ni modèle neuf (le
  rééclairage par graphe reste à l'horizon).
- **Une lumière se décrit par une fiche de studio**, cinq réglages et des
  effets, en français :
  - **source** : fenêtre, soleil, lampe, flash de studio, néon, ciel
    couvert ;
  - **direction** : face, trois-quarts, côté, contre-jour, dessus — choisie
    sur un petit schéma vu du dessus, le sujet au centre ;
  - **qualité** : douce ou dure ;
  - **température** : chaude, neutre, froide ;
  - **ambiance** : lumineuse (high-key), équilibrée, contrastée (low-key) ;
  - **effets**, plusieurs à la fois, certains avec une couleur prise dans
    une palette courte (magenta, cyan, bleu, rouge, ambre, vert) **ou écrite
    librement** (« deep violet ») : reflets néon, reflets sur sol mouillé,
    gélatine colorée, liseré de contre-jour, rayons dans la brume, lens
    flare, bokeh de lumières, ombre projetée (store, fenêtre).
- **La phrase anglaise se fabrique à partir de la fiche, et se montre**,
  sous la fiche, en entier. On peut la réécrire à la main ; la fiche le dit
  alors (« texte écrit à la main ») et ne l'écrase plus.
- **Le vocabulaire vit dans la plateforme** : `PLATFORM/lighting.json` porte
  chaque réglage, chaque effet, leur libellé français, leur terme du métier
  et leur fragment anglais, ainsi que les **schémas de départ** (Rembrandt,
  papillon, split, contre-jour, high-key, low-key, heure dorée, heure bleue,
  lumière de fenêtre, lampe dans le champ, néon cyberpunk…). Un schéma
  préremplit la fiche, qu'on ajuste ensuite. Aucune règle par personnage ni
  par monde (invariant 7) : un monde qui veut ses ambiances les met dans son
  catalogue, comme aujourd'hui.
- **Ce que livre la plateforme, ce qu'enregistre l'utilisateur.** La
  plateforme livre un jeu par défaut — réglages, effets, palette, schémas —
  le même pour tous, que l'utilisateur ne modifie pas. L'utilisateur
  enregistre ses **préréglages** : ce sont les lumières du catalogue du
  chantier 7, chacune avec sa fiche entière, pour ce personnage ou pour
  tout son monde. Un schéma ajusté puis enregistré devient un préréglage à
  lui.
- **Des effets personnalisés, dès le début.** Un effet que la plateforme ne
  livre pas se crée dans l'atelier : un libellé français, un fragment
  anglais, et s'il prend une couleur, l'endroit où elle se place
  (`{color}`). Ils vivent dans un second catalogue à couches,
  `light_effects`, monde et personnage, sur la mécanique de
  `layered_catalog` : la fiche les propose à côté de ceux de la plateforme.
  Un effet qu'une lumière porte ne se supprime pas.
- **Une lumière stocke sa fiche, pas seulement son texte.** Son texte est
  recomposé au lancement depuis la fiche : corriger le fragment d'un effet
  dans la plateforme corrige toutes les lumières qui le portent. Une
  lumière écrite à la main garde son `text`, qui prime.
- **Une variante remplace la lumière de base** — à une condition qui garde
  l'assembleur stable : la scène porte un champ `light`. Elle prend alors
  sa place, après le décor. Une scène sans `light` (toutes celles d'avant le
  chantier 7) garde la règle d'aujourd'hui, variante en fin de prompt : aucun
  prompt existant ne change d'un octet (invariant 3, test à l'appui).
- **Le panneau signale une lumière déjà écrite dans le texte de la scène**,
  par les mots du vocabulaire de la plateforme (« sunlight », « lamp »,
  « neon »…) : « ce texte décrit déjà une lumière ». Un avertissement, pas un
  refus.

## Ce qui entre

1. **Plateforme** : `PLATFORM/lighting.json` (réglages, effets, palette,
   schémas) ; `lights.compose(setup)`, pure, et la résolution qui l'emploie.
   Route `GET /api/lighting` (le vocabulaire, pour l'écran).
   Effets personnalisés : catalogue `light_effects` sur `layered_catalog`,
   routes `/api/light-effects` (GET, create, save, delete).
2. **Variante** : `build_jobs` remplace la lumière par la variante quand la
   scène porte `light`. Test à l'octet près : une banque sans `light` est
   inchangée ; une scène avec `light` et une variante donne la lumière de
   la variante à la place de la sienne.
3. **Atelier** : l'inspecteur d'une lumière devient la fiche — schémas de
   départ, les cinq réglages, le schéma de direction, les effets avec leur
   couleur (palette ou libre), la phrase générée en dessous, « écrire à la
   main ». La création d'un effet personnalisé se fait depuis la fiche. Le même
   aperçu se calcule côté écran avec le vocabulaire servi par la route ; un
   test vérifie qu'il rend la même phrase que le serveur.
4. **Onglet Lumière** : l'avertissement de lumière déjà écrite ; les
   variantes se disent « une autre lumière » quand la scène en porte une.
5. **Essai de rendu** (dernière étape), sur le patron de l'essai des Tons
   (`web/api/services/batch.py` : `trial_jobs`, `start_tone_trial`,
   `trial_state`, `trial_image` ; routes `/api/tones/essai` dans
   `routers/expression.py` ; écran `ToneTrialPanel.tsx` et `useToneTrial`) :
   - même scène, même graine, **deux images** : la scène sans la lumière, puis
     avec la lumière de la fiche **telle qu'elle est à l'écran**, même non
     enregistrée — c'est ce qui permet de tâtonner ;
   - la phrase essayée passe par la résolution normale (la lumière prend la
     place de celle de la scène, comme une variante), jamais par un second
     assembleur ; rien n'est écrit dans `scenes.json` ni dans le catalogue ;
   - un seul essai à la fois par personnage et un seul GPU : la garde
     `ss.STATE["running"]` de `/api/run`, 409 si un batch tourne ;
   - ComfyUI hors ligne : le bouton est inactif et le dit.
   Généraliser l'essai des Tons plutôt que le recopier : un essai porte un
   type (ton ou lumière) et ses images ; `test_expression_editor.js` et les
   tests de l'essai de ton doivent rester verts sans retouche.
6. **Tests** : composition (chaque réglage, effets, couleur de la palette
   et libre, effet personnalisé), l'octet près, variante qui remplace, texte
   à la main qui prime, effet porté qui ne se supprime pas, isolation ; test
   navigateur de la fiche ; audit `audit-ux-ui` vérifié en vrai.

## Hors périmètre

- **Une phrase par famille de modèle** (Flux lit des phrases, SDXL des
  mots-clés) : une seule phrase naturelle pour commencer ; le pack pourra
  la reformuler si la mesure le demande.
- **Plusieurs sources indépendantes** (clé, remplissage, contre) avec
  chacune ses réglages : la fiche décrit une lumière principale et ses
  effets. Un schéma nommé (Rembrandt, papillon) porte déjà l'essentiel
  d'un montage à plusieurs sources.
- **Réécrire les scènes des mondes** : l'entrée d'horizon du 26/09 reste
  ouverte ; l'avertissement suffit ici.

## Critère de sortie

On crée une lumière « néon cyberpunk » depuis un schéma, on change sa
direction sur le schéma et la couleur d'un effet, et la phrase anglaise suit
sous les yeux, identique à celle du lancement. Une variante « heure bleue »
posée sur une scène qui porte une lumière donne une image éclairée à l'heure
bleue, pas deux fois. Aucune scène existante ne change d'un octet. Le
panneau prévient quand le texte de la scène décrit déjà une lumière.
Un essai de rendu montre, sur la même graine, la scène sans puis avec la
lumière de la fiche avant tout enregistrement. L'audit `audit-ux-ui` est
vérifié en vrai, à 1440 et 1024.

## Reprise sur le poste (session Claude Code du 26/09)

Le chantier se construit sur le poste de Pierre, où vivent ComfyUI,
`python_embeded` et les données de Léna — l'essai de rendu ne se vérifie
qu'avec eux.

**Point de départ.** Branche `claude/vigilant-carson-hdttd8`, fusionnée
dans `main` le 26/09 : partir de `main`. Elle porte, dans l'ordre : la correction des erreurs de test
d'un personnage neuf (ancre d'identité au wizard), puis le chantier 7 —
`layered_catalog.py` (mécanique de catalogue à couches, extraite des
tenues), `lights.py`, routes `/api/lights`, résolution dans
`runner/prompt.py::build_jobs`, atelier `/bank/lights`, onglet Lumière relié
au champ `scene.light`.

**D'abord, établir la base sur le poste** — trois suites n'ont pas pu
tourner dans le conteneur où le chantier 7 a été écrit (données de Léna,
`insightface`) :

    python_embeded/python.exe AUTOMATION/tests/test_build_jobs.py
    python_embeded/python.exe AUTOMATION/tests/test_valider_banque.py
    python_embeded/python.exe AUTOMATION/tests/test_base_portrait.py
    python_embeded/python.exe AUTOMATION/tests/test_lights.py
    python_embeded/python.exe AUTOMATION/tests/test_tenues.py
    python AUTOMATION/tools/toolchain.py build
    python_embeded/python.exe AUTOMATION/tests/run_browser_tests.py --only test_lights,test_bank,test_outfits,test_cadres_ua

Un rouge ici se traite avant la première ligne du 7 bis.

**Ordre de construction**, un commit par étape, chacune avec ses tests :
1. `PLATFORM/lighting.json` + `lights.compose(setup)` + `GET /api/lighting` ;
   une lumière stocke `setup` (et `text` seulement si écrite à la main).
2. La variante qui remplace la lumière de base dans `build_jobs` — le seul
   changement de l'assembleur : le test à l'octet près d'abord, qui échoue,
   puis le code (règle 6).
3. Effets personnalisés : catalogue `light_effects` sur
   `layered_catalog.Catalog`, routes `/api/light-effects`.
4. L'atelier : la fiche de studio dans `screens/bank/lights/`
   (`LightInspector.tsx` devient la fiche ; un sous-composant par bloc si
   le fichier dépasse la lecture), la phrase calculée à l'écran avec le
   vocabulaire servi, et le test qui la compare à celle du serveur.
5. L'onglet Lumière : avertissement de lumière déjà écrite, variantes
   dites « une autre lumière ».
6. L'essai de rendu.
7. Audit `audit-ux-ui` vérifié en vrai, `gardien-invariants`, tableau de
   bord (chantier « Studio de lumière » à `fait`).

**Ce qu'il faut savoir en arrivant.**
- La résolution d'une lumière vit dans `lights.resolve_scene` /
  `resolve_bank`, appelée par `build_jobs` juste après les tenues. Elle fond
  aujourd'hui `light` dans `prompt` ; l'étape 2 doit la garder à part assez
  longtemps pour qu'une variante la remplace.
- Une variante `@clé` est déjà résolue en texte par `resolve_scene`.
- Côté écran, le champ Lumière du brouillon s'appelle toujours `promptLight`
  mais se lit et s'écrit dans `scene.light` (`ScenesStoreContext.tsx`).
  `lightText.ts` dit comment une ligne s'affiche ; il ne résout rien.
- Les libellés de l'onglet disent aujourd'hui qu'une variante « s'ajoute à
  la fin du prompt, après la lumière de base » : à réécrire à l'étape 2.
- Les scènes des mondes gardent leur lumière dans leur texte (entrée
  d'horizon du 26/09) : c'est ce que l'avertissement de l'étape 5 signale.
- `layered_catalog.Catalog` porte des messages au féminin (« tenue »,
  « lumière ») : « effet » est masculin — prévoir l'accord (un paramètre
  de genre, ou des messages passés au constructeur) plutôt qu'un « effet
  inconnue ».
