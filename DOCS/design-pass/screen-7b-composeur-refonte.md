# Écran 6 : Ateliers, Scènes (composeur à trois panneaux)

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 06 - Ateliers Scenes.dc.html`, option **6a**. Option 6b écartée.

**Prérequis** : écrans 0, 2, 3b, 5b, 5c livrés. Tokens graphite en place, `.seg` sans aplat d'accent.

Ce design-pass **remplace la mise en page** de `screen-7-banque-editeur-de-scene.md` sans toucher à sa logique. Restent vrais :
- brouillons (`ScenesStoreContext`, `SceneDraft`, `uid`) et enregistrement de `scenes.json` ;
- onglet Personnage / Monde ;
- héritage du lieu (ADR-0015) ;
- ouverture directe `?scene=` ;
- garde du monde (`WorldBanner`, estampille du document) ;
- raccourcis de `useSceneWorkbench` ;
- les **sept sections et leurs champs réels** : Général, Lumière, Vêtements, Pose, Prompt global, Amélioration IA, JSON final ;
- `FRAGMENT_COLORS` (décor `--acc`, lumière `--frag-light`, pose `--frag-pose`).

Fichiers concernés : `src/screens/bank/` (`BankScreen.tsx`, `SceneList.tsx`, `WorldBanner.tsx`, `useSceneWorkbench.tsx`, `composer/SceneComposer.tsx`, `composer/PromptField.tsx`, `composer/InfoHint.tsx`) et la fumigation `test_bank.js`.

## Invariants rappelés

- **Aucun champ nouveau.** La maquette ne fait que réorganiser les champs existants de chaque panneau. En particulier, `LightPanel` garde exactement :
  - `prompt_light` (« Prompt de lumière de la scène ») ;
  - les variantes (« une par ligne, jamais une tenue ») ;
  - le catalogue de templates inerte.
- Une référence de scène sert à la composition, jamais à l'identité (architecture §5).
- Aucune valeur en dur hors `tokens.css`. Aucun `if character ==`.

## S : Structure

### S1. Grille de l'écran

Pleine hauteur de `<main>`, sans défilement de page.

```
[ barre d'atelier 44 px : Scènes · Poses · Tons | Monde + compteur | Réglages de l'atelier ]
[ liste 260 px ][ composeur flex ][ aperçu 340 px ]
```

Le bandeau des modifications non enregistrées reste celui du chrome (`DirtyBar`) : « N modifications non enregistrées · scenes.json · Annuler · Enregistrer · Ctrl S ». Le bouton d'enregistrement à icône seule, en haut à droite, disparaît au profit de ce bandeau. Son id est conservé sur le bouton du bandeau si la fumigation le vise.

### S2. Barre d'atelier

- Segmenté **Scènes · Poses · Tons** (sous-vues existantes, routes `/bank/scenes|poses|tones`), fond `--bg`, actif `--panel3`.
- `WorldBanner` réduit à une ligne en 12,5 px `--dim2` : « Monde **{label}** · {n} scènes ». Garder `#worldBanner` et `data-world`.
- Si l'estampille du document diverge (`data-world-drift`), le message passe dans un bandeau famille `--warn-*` sous la barre, texte inchangé.
- À droite : « Réglages de l'atelier » en secondaire (inchangé).

### S3. Liste (`SceneList.tsx`)

- Largeur 260 px, fond `--panel`.
- En tête : recherche (icône loupe), puis deux boutons « Nouvelle scène » (`--pri`) et « Depuis le monde » (secondaire).
- Groupes par intention (`groupByIntention` inchangé, `<details>` natif). En-tête de groupe en capitales 10,5 px `--dim2` avec compteur.
- Ligne : vignette 28×35, nom 12,5 px, méta 11 px « {format} · N produites ».
  - Active : fond `--panel3` + `inset 2px 0 0 var(--acc)`, 600.
  - **Modifiée non enregistrée** : point 6 px `--warn` à droite.
- Contrat `data-scene-card`, `data-uid`, `data-on` et navigation clavier conservés.

### S4. Composeur (centre)

1. **En-tête de scène**, 72 px, filet bas :
   - vignette 40×50 ;
   - nom 17 px 650, suivi de la pastille « modifiée » (point `--warn` + texte) si brouillon modifié ;
   - méta 12 px `--dim2` « {intention} · {format} · {count} images · {n} produites · niveau minimum {n} » ;
   - segmenté **Personnage · Monde** ;
   - « Dupliquer » (secondaire), « Supprimer… » (texte `--danger-txt`, confirmation) ;
   - ‹ › : scène précédente et suivante, `aria-label` existants, plus `Alt ↑` / `Alt ↓`.
   
   Les trois boutons pleine largeur actuels (Suivant, Dupliquer, Supprimer) disparaissent du bas du formulaire.
2. **Rail de sections**, 176 px, filet droit :
   - les sept entrées **avec libellé** (icône 16 px du registre + texte 13 px) ;
   - active : `--panel3` + barre d'accent ; section contenant une modification : point `--warn` ;
   - `aria-label="Sections de la scène"` conservé, `role="tablist"` vertical, flèches ↑ ↓.
3. **Formulaire** : titre de section 15 px 650, puis une ligne `--dim2` qui nomme le champ du modèle (ex. « champ prompt_light · repère vert dans l'aperçu »).
   - Champs sur **une ou deux colonnes selon leur nature**, jamais sur toute la largeur de l'écran : `max-width` de 880 px pour le contenu.
   - Champ modifié par rapport à la version enregistrée : bordure `--warn`.
   - `PromptField` et `InfoHint` inchangés en comportement, restylés aux tokens.
   - Le catalogue inerte « Travailler depuis un template de lumière » est une zone en pointillés `--line2`, texte `--dim2`, avec la mention « catalogue pas encore peuplé ».

### S5. Aperçu vivant (droite, `ScenePreviewPanel.tsx`)

- Titre « Aperçu du prompt » + « N car. ».
- Liste des fragments assemblés. Chaque ligne a une barre verticale de 3 px à la couleur de `FRAGMENT_COLORS` (décor, lumière, pose ; les autres fragments en `--dim2`), la source en capitales 10,5 px et le texte 12 px.
- **Source des données** : réutiliser le récapitulatif que la section « Prompt global » calcule déjà. **Aucun assemblage de prompt nouveau côté client** (invariant 3 : un seul assembleur de prompt). Si ce récapitulatif n'est disponible que dans sa section, l'extraire dans un hook partagé par la section et le panneau.
- Grille étiquette / valeur : tons affins, pose, score moyen (`bank.stats`).
- Pied : « Produire cette scène », en secondaire, qui mène à `PATHS.produce` avec la scène présélectionnée (même mécanisme `?scene=`, à ajouter côté Produire **uniquement s'il existe déjà**, sinon garder un lien simple vers Produire). Le bouton est **désactivé si la scène a des modifications non enregistrées**, avec la ligne `--warn-txt` « Enregistre d'abord : Produire lit scenes.json ».

### S6. Largeur inférieure à 1100 px

- La liste se replie en tiroir, ouvert par un bouton « Scènes » dans la barre d'atelier.
- Le rail de sections passe en icônes seules (libellé retiré visuellement, pas avec `display:none`, et gardé en infobulle).
- L'aperçu passe sous le formulaire.

## A : a11y

- Rail de sections : `tablist` vertical, `aria-selected`, le formulaire est le `tabpanel`.
- Tous les boutons icône portent un `aria-label`. Les points « modifié » sont accompagnés d'un texte visuellement masqué (« modifiée »).
- Supprimer : confirmation `role="alertdialog"` (via `useConfirm`), focus sur Annuler.
- Contraste ≥ 4,5:1 pour tout texte, ≥ 3:1 pour les barres de fragment.

## Dépendances

Aucune. Le récapitulatif du prompt existe déjà dans la section « Prompt global ».

## Découpage

```
screens/bank/
  BankScreen.tsx         composition 3 colonnes + barre d'atelier
  SceneList.tsx          restylé
  composer/
    SceneHeader.tsx      en-tête de scène (actions, ‹ ›, Personnage/Monde)
    SectionRail.tsx      rail de sections à libellé
    SceneComposer.tsx    panneaux inchangés en logique, restylés
    ScenePreviewPanel.tsx
    useSceneRecap.ts     récapitulatif extrait, partagé (uniquement si nécessaire)
```

## Hors périmètre

Sous-vues Poses et Tons (étapes suivantes), catalogue de monde (`WorldCatalogueDialog`), `Composer.tsx`. Aucun changement serveur ni de workflow.

## Critère de sortie

- `typecheck`, `build` et `test_bank.js` verts. Sélecteurs préservés ou migrés dans le même commit : `#sceneCards`, `[data-scene-card]`, `[data-uid]`, `#worldBanner`, `[data-world-drift]`, les `data-field` de `PromptField`, l'aria-label « Sections de la scène », « Scène précédente » / « Scène suivante », « Copier le JSON final ».
- Audit `audit-ux-ui` **en vrai**, avec captures à 1440 et 1024 :
  - chaque section ouverte une fois ;
  - scène modifiée non enregistrée (points, bandeau, bouton Produire désactivé) ;
  - enregistrement ;
  - duplication ;
  - suppression avec confirmation ;
  - `?scene=` depuis Produire ;
  - onglet Monde ;
  - document à estampille étrangère ;
  - recherche avec groupes auto-dépliés.

## Écarts assumés, et ce que l'audit a corrigé (livré le 2026-09-24)

Trois écarts sur la lettre de la spec, tous mesurés à l'exécution :

1. **§S6, le bouton du tiroir.** Le cadrage l'appelle « Scènes ». À 1024, ce
   mot se retrouve à 12 px de l'entrée de sous-vue « Scènes » de la même
   barre : deux fois le même mot, l'un qui ouvre un tiroir, l'autre qui
   navigue. Le bouton dit « Liste des scènes ».
2. **§S1, le bouton d'enregistrement.** Il disparaît de la vue **Scènes**
   seulement. Poses et Tons le gardent jusqu'à leurs propres étapes : son
   infobulle est le seul endroit qui dise ce qu'un enregistrement veut dire
   là-bas. Le résultat d'un enregistrement lancé depuis le bandeau se dit au
   toast, et le bandeau reste tant que le refus tient.
3. **§S4.3, la bordure d'un champ modifié.** Elle marque un champ qui
   **diffère de la version enregistrée**. Une scène que la banque n'a jamais
   vue n'a pas de version à comparer : mesuré à l'audit, la marquer peignait
   huit bordures et cinq points d'un coup pour dire ce que le bandeau, le
   point de sa ligne et la pastille de son en-tête disaient déjà. Elle ne
   porte donc aucune marque de champ, seulement celles de scène.

Deux correctifs sont nés de l'audit, tous deux vérifiés en vrai :

- la confirmation de suppression ouvre sur **« annuler »** (`role="alertdialog"`,
  focus `#cfNon`) — Entrée en arrivant ne peut pas être la suppression ;
- la méta d'une ligne de liste passe de `--dim2` à `--dim` : sur le fond
  `--panel3` de la ligne courante, `--dim2` tombe à 4,27:1, l'exception que
  `tokens.css` nomme (mesuré 5,9:1 après).

Un bug antérieur au chantier, rendu visible par lui : **l'enregistrement
fermait la scène ouverte** (`save` recharge le document, chaque brouillon
renaît avec un `uid` neuf, et la sélection tenait par l'`uid`). La sélection
se retient désormais par l'identifiant de la scène, que l'aller-retour
traverse.

## Amendement du 2026-09-24 : le plafond de 880 px change de porteur

§S4.3 plafonnait **le contenu du panneau** à 880 px. Écrit contre un écran de
1440, où la colonne du composeur fait 664 px, le plafond ne mordait jamais.
Signalé sur un écran de 2560 : il laissait un tiers de la colonne vide à
droite de chaque panneau et empilait en hauteur ce qui tenait côte à côte.

Ce qui reste plafonné est la **mesure de lecture d'un champ de texte**
(`PromptField`, 880 px), pas le panneau. Le panneau prend la colonne et pose
ses blocs l'un à côté de l'autre dès qu'il a la place, chaque panneau
décidant de sa propre bascule.

La bascule se mesure en **`@container`**, jamais en media query : la largeur
disponible dépend de la colonne, et la colonne dépend de l'aperçu ouvert ou
non, pas de la fenêtre.
