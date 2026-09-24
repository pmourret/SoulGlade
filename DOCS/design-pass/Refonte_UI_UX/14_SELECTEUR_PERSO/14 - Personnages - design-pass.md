# Écran 14 : Personnages (registre en liste avec aperçu, wizard à étapes verticales)

Périmètre validé par l'utilisateur le 2026-09-24. Maquette validée : `Revue UX 14 - Personnages.dc.html`, option **14a** (A1 registre, A2 wizard étape Base, A3 wizard étape Identité avec identifiant invalide). L'option 14b est écartée.

**Prérequis** :
- écran 0 (chrome) livré ;
- écran 2 (Fiche) livré, pour la route de base gelée si elle existe ;
- écran 11 (Mondes) livré, pour `slugify.ts` réutilisé.

**Référence de comportement** : `DOCS/design-pass/screen-1-wizard.md` (03/09/2026), déjà implémenté. Ce design-pass change la présentation et ajoute une étape Identité, sans toucher aux écritures.

Fichiers concernés :
- `src/screens/CharactersScreen.tsx` ;
- `src/screens/wizard/` (`WizardScreen.tsx`, `StepBody.tsx`, `BuildSheetPanel.tsx`, `OptionCard.tsx`, `shared.ts`) ;
- les fumigations du registre et du wizard.

## Invariants rappelés

- Le registre est le **sas** : sans personnage ouvert, **pas de barre de navigation**. Choisir un personnage fait entrer dans le studio (`selectCharacter(id, { to: PATHS.produce })`, un seul appel).
- Chaque ligne garde un **vrai lien** (`href="?character=…"`) : Ctrl, Maj et clic du milieu gardent leur sens.
- **« + Nouveau personnage » est présent même sur un registre vide.**
- **« pack inconnu »** est une panne affichée, jamais réparée en silence (ADR-0012).
- Le wizard est **le seul écran qui écrit une fiche**. Type, style et monde sont figés. Le **pack n'est jamais demandé** : il est résolu côté serveur. Aucun graphe n'est généré par personnage.
- Changer l'identifiant **invalide la base gelée** (comportement actuel).
- Le polling des portraits reste le même (4 s, 150 tours, arrêt au démontage).
- Upload en base64 dans un JSON, **jamais multipart** (garde d'origine).
- Après création : arrivée sur la **fiche** (`PATHS.character`).
- Aucun `if character ==`.

## S : Structure

### S1. Registre : grille (A1)

```
[ barre minimale 48 px : marque · espace · ComfyUI · icône Application ]
[ liste flex, padding 32px 40px ][ aperçu 360 px, fond --panel ]
```

La barre minimale n'a ni navigation ni identité : c'est le sas. Garder `#registre` et `data-vue="sas"` sur le conteneur.

### S2. Registre : en-tête et liste

- En-tête :
  - titre « Personnages » 24 px 650 + phrase « Ouvrir un personnage charge le studio sur sa production. » ;
  - à droite, un **champ de recherche** 240 px, qui filtre côté client sur nom, identifiant, type et monde ;
  - puis `--pri` « + Nouveau personnage » (`data-new`, `data-char-card` conservés, lien vers `PATHS.wizard`).
- **Liste** en tableau (`#charGrid` conservé sur le conteneur des lignes), colonnes :
  - portrait 36×44 ;
  - Nom (+ identifiant en mono `--dim2` dessous, + étiquette « ouvert » si `row.id === claimed`) ;
  - Type ;
  - Style (**seulement si** `/api/characters` le renvoie, sinon la colonne disparaît) ;
  - Monde (`row.world.label`) ;
  - étiquettes à droite.
- **Ligne** 60 px, `<a>` avec `href` et `data-char-card` (+ `data-current` si ouvert). Survol ou focus : fond `--panel3` + `inset 2px 0 0 var(--acc)`, et **mise à jour de l'aperçu**.
- **Portrait** : voir Dépendances. Repli : initiale 15 px 700 dans la teinte d'accent du personnage si `/api/characters` la fournit, sinon `--acc`.
- **Étiquettes** (`data-char-tag` conservé) : « NSFW » famille `--warn-*` avec un carré, « pack inconnu » famille `--danger-*` avec un losange. Mot et forme.
- Pied : « ↑ ↓ pour parcourir, Entrée pour ouvrir. Ctrl + clic ouvre dans un nouvel onglet. » en 12 px `--dim2`.
- Clavier : ↑ ↓ déplacent le focus d'une ligne à l'autre (roving, `useRovingChoice` si adapté), Entrée ouvre.

### S3. Registre : aperçu (droite)

- Portrait 4:5 (ou initiale en grand sur `--panel3`).
- Nom 20 px 650 + identifiant mono.
- Grille étiquette / valeur : Type, Style (si fourni), Monde, Pack (`label · famille`, si `/api/characters` le fournit, sinon ligne absente), Adulte (« activé » en `--warn-txt` / « désactivé » en `--dim2`, depuis `row.nsfw`).
- « Type, style et monde sont figés à la création. » en 12 px `--dim2`.
- En bas : `--pri` pleine largeur « Ouvrir le studio » + touche Entrée.
- Pack inconnu : l'aperçu remplace le bouton par le bandeau `--danger-*` « Pack inconnu : ce personnage ne peut pas s'ouvrir tant que son pack n'est pas résolu. » Vérifier en mode Plan ce que fait aujourd'hui le clic sur une telle carte, et **ne pas changer ce comportement** : seulement l'annoncer.
- Aucune ligne survolée : l'aperçu montre le personnage ouvert s'il existe, sinon la première ligne.

### S4. Registre : états

- **Chargement** : squelette de 4 lignes et de l'aperçu, `aria-hidden`.
- **Registre illisible** : carte d'erreur centrée (losange, « Registre indisponible », phrase actuelle, « Réessayer »). `report('registre', …)` est conservé.
- **Registre vide** : dans la liste, « Aucun personnage. Le dossier CHARACTERS/ est vide sur cette machine. » + `--pri` « + Nouveau personnage » en grand. L'aperçu disparaît.
- **Recherche sans résultat** : « Aucun personnage ne correspond à « … ». » + lien « Effacer ».
- **Moins de 1100 px** : l'aperçu disparaît, et la ligne affiche le bouton « Ouvrir » au survol.

### S5. Wizard : grille (A2)

```
[ barre d'écran 48 px : retour « Personnages » · « Nouveau personnage » · espace · ComfyUI ]
[ étapes 260 px ][ contenu de l'étape flex, padding 28px 36px ][ fiche en construction 340 px ]
[ barre du bas 60 px : ce qui manque · espace · Retour · Suivant / Créer {nom} ]
```

Le modèle `.wrap` + `.launch` fixe disparaît : la barre du bas fait partie de la grille (pas un élément fixe qui recouvre le contenu). `#wizard` conservé.

### S6. Wizard : étapes (gauche)

- **Cinq étapes** : **Identité** (nouvelle), Type, Style, Monde, Base d'identité.
- `<ol id="wizSteps" aria-label="Étapes de création">` conservé. Chaque `li` garde `data-step` (`todo` / `on` / `done`) et `aria-current="step"`.
- Ligne d'étape : pastille 22 px et libellé 13,5 px, avec la **réponse** dessous en 12 px `--dim2` une fois faite (« Léna · lena », « instagram-influenceur », « Réaliste (seul style du type) », « Littoral », nom du fichier de base).
  - `todo` : pastille contour `--line2`, numéro `--dim2`, libellé `--dim2` ;
  - `on` : pastille pleine `--txt`, numéro `#141414`, fond `--panel3` + `inset 2px 0 0 var(--acc)`, 600 ;
  - `done` : pastille `--ok` sombre avec ✓, libellé `--txt`.
- **Les étapes faites deviennent cliquables** pour y revenir (bouton dans le `li`). Les étapes à venir ne le sont pas : le verrouillage reste dans la barre du bas. Revenir sur Type réinitialise Style et Monde, comme aujourd'hui (`pickType`).

### S7. Wizard : contenu des étapes (centre)

Chaque étape a un titre 22 px 650 et une phrase 13,5 px `--dim`.

- **Identité** (A3) (nouvelle, champs actuels déplacés) :
  - Nom affiché (`#wizName`) ;
  - Identifiant (`#wizCid`), avec l'aide « dossiers, URL, base de données » et la validation **écrite** à droite du champ (`#wizCidHint` conservé) : point `--ok` + « valide », ou losange + « minuscules, chiffres, - et _ » ;
  - quand l'identifiant saisi est invalide ou vide et que le nom existe : « Proposé : `{slug}` · Utiliser » (`slugify.ts` de l'écran 11). L'identifiant suit le nom tant qu'il n'a pas été modifié à la main ;
  - **Condition de l'étape** : nom non vide et identifiant valide. C'est la seule nouvelle règle de verrouillage. Elle remplace le message actuel de l'étape Base (« Renseigne d'abord un identifiant valide… »), qui disparaît ;
  - si une base gelée existe et que l'identifiant change : confirmation « Changer l'identifiant invalide la base d'identité déjà choisie. » avec Continuer / Annuler.
- **Type / Style / Monde** : `OptionCard` restylé en cartes de liste (titre 14 px 600, sous-titre `--dim2`, `role="radio"` dans un `radiogroup`, roving actuel). Carte choisie : contour 2 px `--txt` + ✓. `FROZEN_HINT` passe **une seule fois** sous le titre de l'étape, et non plus sur chaque carte. Style unique : note actuelle restylée. Aucun type ou aucun monde : notes actuelles.
- **Base d'identité** (A2) :
  - phrase actuelle, avec « Personnage fictif, jamais la photo d'une personne réelle. » en 600 ;
  - **segmenté** « Générer des portraits · Fournir une image » (remplace les deux colonnes) ;
  - **Générer** : bouton « Générer 4 portraits » (`#wizGen`), qui devient « Relancer 4 portraits » après une première série. État à côté (`#wizGenMsg`) : indicateur + « N sur 4 prêts · environ 1 à 2 min par portrait ». Grille de 4 cartes 4:5 de 200 px max (`#wizCands`, `role="radiogroup"`) : en cours (contour pointillé + indicateur), prêt (image), échec (losange + « Échec » + `detail` **écrit** sous la carte, et non plus en `title`), gelé (contour 2 px `--acc` + pastille ✓, légende « gelé comme base »). Sous la grille : « Cliquer un portrait le gèle comme base. Un autre clic remplace ce choix tant que le personnage n'est pas créé. » ;
  - **Fournir** : zone de dépôt 4:5 à bordure pointillée qui ouvre aussi le sélecteur (`#wizFile` conservé), formats et limite de 20 Mo écrits dessous, message `#wizFileMsg` ;
  - `#wizBasePreview` conservé (il peut devenir vide visuellement, la base étant montrée dans la fiche).

### S8. Wizard : fiche en construction (droite)

- `BuildSheetPanel` restylé, `aria-label` conservé, jamais un arrêt de tabulation.
- Titre en capitales, puis la **base en grand** (4:5, contour 2 px `--acc` si gelée, pointillés sinon), puis la grille étiquette / valeur : Nom, Identifiant (mono), Type, Style, Monde, Base (nom du fichier en mono tronqué). `data-field` conservés.
- Pied : « Type, style et monde : figés. Un autre choix, c'est un autre personnage. »

### S9. Wizard : barre du bas

- À gauche, **ce qui manque** pour l'étape courante (« Il manque : un identifiant valide », « Il manque : choisir un type ») en 12,5 px `--dim`. Quand tout est prêt à la dernière étape : point `--ok` + « Tout est prêt ».
- À droite : « Retour » secondaire (`#wizBack`, désactivé à la première étape), puis `--pri` « Suivant » / « Créer {nom} » (`#wizNext`, mêmes conditions qu'aujourd'hui, plus la condition Identité). Pendant la création : « Création… ».
- Erreur de création : toast actuel, message serveur tel quel.

### S10. Wizard : états

- **Options illisibles** : carte d'erreur centrée, note actuelle, « Réessayer » (`#wizRetry` conservé).
- **Chargement des options** : squelette des cartes (`StepBodySkeleton`).
- **Quitter avec des choix faits** : confirmation « Abandonner la création de {nom} ? La base déjà générée reste sur le disque. » Vérifier que la phrase est vraie avant de l'écrire (où vont les candidats non retenus ?) et l'ajuster en mode Plan.
- **Moins de 1100 px** : les étapes passent en bandeau horizontal compact en haut, et la fiche passe sous le contenu.

## A : a11y

- Registre : lignes = liens focalisables, roving ↑ ↓, aperçu en `aside aria-live="polite"` limité au nom (pas toute la fiche).
- Wizard : `ol` des étapes avec `aria-current`, étapes faites = boutons. Validation d'identifiant liée par `aria-describedby`. Candidats `role="radio"` avec `aria-checked`, échec annoncé par son texte.
- Contraste ≥ 4,5:1, pastilles d'étape comprises (numéro `--dim2` sur `--panel` pour les étapes à venir).

## Dépendances

- **Portraits du registre** : la route de base gelée de l'écran 2 (`GET /api/character/base`) est liée au personnage courant par `?character=`. Pour afficher le portrait de chaque ligne, l'appeler avec `?character={row.id}` explicite, **sans changer la route**. C'est permis si la route ne sert que la base du personnage nommé dans la requête : le vérifier dans son code et son test d'isolation. Si la route n'existe pas ou refuse, initiale seulement. **Aucune nouvelle route.**
- **Style, pack, teinte d'accent** dans `/api/characters` : afficher seulement ce qui existe.
- Wizard : aucune dépendance.

## Découpage

```
screens/characters/
  CharactersScreen.tsx      composition liste + aperçu + états
  CharacterRow.tsx          S2 (lien, présentation)
  CharacterPreview.tsx      S3
  characterFilter.ts        recherche côté client, pure
screens/wizard/
  WizardScreen.tsx          grille, état, verrouillage (+ étape identity)
  WizardSteps.tsx           S6
  StepBody.tsx              S7 (+ branche identity)
  IdentityStep.tsx          S7 Identité
  BaseStep.tsx              S7 Base (segmenté, grille, zone de dépôt)
  BuildSheetPanel.tsx       S8, restylé
  WizardFooter.tsx          S9 (missingFor(step) pur et testable)
  shared.ts                 STEPS = ['identity','type','style','world','base']
```

## Critère de sortie

- `typecheck`, `build`, les fumigations du registre et du wizard. Tous les sélecteurs listés sont préservés : `#registre`, `data-vue`, `#charGrid`, `data-char-card`, `data-new`, `data-current`, `data-char-tag`, `#wizard`, `#wizSteps`, `data-step`, `#wizName`, `#wizCid`, `#wizCidHint`, `#wizFile`, `#wizFileMsg`, `#wizGen`, `#wizGenMsg`, `#wizCands`, `data-cand`, `data-file`, `data-chosen`, `#wizBasePreview`, `#wizBack`, `#wizNext`, `#wizRetry`, `data-field`.
- La fumigation du wizard est **mise à jour** pour la nouvelle étape Identité (5 étapes), dans le même commit.
- Tests unitaires : `characterFilter.ts`, `missingFor`.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024 :
  - registre avec un personnage ouvert, un NSFW, un pack inconnu ;
  - recherche avec et sans résultat ;
  - clavier ↑ ↓ Entrée ;
  - Ctrl + clic ;
  - registre vide (dossier de test) ;
  - wizard complet avec génération de 4 portraits (dont au moins un échec si possible), gel, puis changement d'identifiant (confirmation) ;
  - wizard avec image fournie ;
  - retour sur une étape faite ;
  - création jusqu'à la fiche ;
  - options illisibles (serveur arrêté).
