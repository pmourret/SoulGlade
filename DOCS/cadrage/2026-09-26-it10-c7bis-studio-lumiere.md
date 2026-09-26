# IT-10, chantier 7 bis : le studio de lumière

**Date** : 2026-09-26 · **Décision** : Pierre, 26/09 (un vocabulaire pour
**les deux publics**, le nom parlant et le terme du métier ; une variante
**remplace** la lumière de base ; la phrase anglaise générée **se montre** ;
les schémas de départ viennent de **la plateforme** ; les **effets et
reflets** — néon, sol mouillé — font partie du sous-studio ; une **couleur
libre** en plus de la palette, et des **effets personnalisés** dès le début)

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
5. **Tests** : composition (chaque réglage, effets, couleur de la palette
   et libre, effet personnalisé), l'octet près, variante qui remplace, texte
   à la main qui prime, effet porté qui ne se supprime pas, isolation ; test
   navigateur de la fiche ; audit `audit-ux-ui` vérifié en vrai.

## Hors périmètre

- **L'essai de rendu d'une lumière** (le patron des Tons) : il faut
  ComfyUI et un rendu par essai. Proposé à Pierre le 26/09 comme dernière
  étape du chantier ; non tranché à l'écriture de ce cadrage.
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
L'audit `audit-ux-ui` est vérifié en vrai, à 1440 et 1024.
