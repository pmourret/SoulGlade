# Le flou de fond devient un réglage de scène

Cadrage ouvert le 2026-09-08, à la clôture du premier pas du front 1
d'IT-3b (`DOCS/recherche/2026-09-08-fond-nettete-non-uniforme.md`).
Trois questions, comme tout cadrage (règle 3, `PROJET.md`).

## Ce qui le déclenche

La mesure a montré que **71 % de la variance du flou est décidée par la
scène** — pas par le pipeline, pas par la seed. Le premier réflexe a été
de traiter ce flou comme un défaut et de le retirer : une règle dans le
prompt système de `compose.py`, deux scènes réécrites.

Pierre a tranché contre, le jour même : **un fond flou est un choix
créatif.** Un créateur le veut, un autre non. Les deux modifications ont
été annulées — elles supprimaient la capacité au lieu de la rendre
choisissable, et c'est exactement ce que `PROJET.md` interdit à la
plateforme (« outil d'aide, pas une plateforme décisionnelle »).
L'amendement du 07/09, qui autorise la plateforme à trier les défauts
objectifs elle-même, ne s'applique pas : une main à six doigts n'a pas
d'alternative défendable, un fond flou si.

## À quoi ça sert, et pour qui

**Pour l'utilisateur cible, directement.** Il connaît déjà l'IA
générative ; « fond net ou fond flou » est un vocabulaire qu'il a déjà,
et c'est aujourd'hui la seule dimension de sa production qui se décide
sans lui — le modèle défocalise de son propre chef dès qu'une scène
suggère de la profondeur, et rien dans l'interface ne le dit ni ne
l'empêche.

**Pour Pierre ensuite**, et c'est ce qui le rend urgent plutôt que
confortable : sans ce réglage, l'avant/après du fond promis par la DoD
d'IT-3b n'a rien à comparer. Le levier est la scène ; tant qu'il n'est
pas exposé, il n'est pas actionnable.

**Parcours nominal (règle 2) : oui.** Un nouvel utilisateur qui produit
sa première image satisfaisante passe par l'éditeur de scène, et le flou
est l'écart le plus visible entre ce qu'il demande et ce qu'il obtient.
Ce n'est pas un chantier d'horizon.

## Périmètre

Une propriété de scène, à trois valeurs plutôt que deux — un booléen
forcerait la plateforme à choisir un défaut pour les 17 scènes
existantes, et à réécrire l'intention de leur auteur :

- **`auto`** — le modèle décide, comportement actuel. Valeur de toutes
  les scènes existantes : aucune migration ne réinterprète une intention
  passée.
- **`net`** — fond net demandé explicitement.
- **`flou`** — fond flou demandé explicitement. C'est là que se rangent
  les deux scènes de `slow-life.json` qui portaient déjà « blurred street
  behind » et « out of focus » dans leur texte, si leur auteur le décide.

Elle traverse : le schéma de scène, l'assembleur de prompt (un fragment
étiqueté de plus dans `controles`, `AUTOMATION/runner/prompt.py` — donc
la mise à jour de la fixture verrouillée à l'octet près, invariant 3),
le schéma d'API et les types générés depuis OpenAPI, et l'éditeur de
scène (`SceneComposer.tsx`).

Le créateur de scène (`compose.py`) cesse d'écrire du vocabulaire de flou
dans le texte du prompt — non pas parce que le flou serait mauvais, mais
parce que l'axe a désormais son champ : le laisser aussi dans le texte
libre, c'est deux sources qui peuvent se contredire sans que rien ne le
signale (le défaut déjà mesuré le 26/08 sur les fragments de prompt). En
échange, il **remplit le champ**.

## Hors périmètre

- **Un curseur d'intensité de flou.** Trois valeurs, pas une valeur
  continue : rien ne dit encore qu'un réglage fin serait tenu par le
  rendu, et `fond_net` mesurera si les deux extrêmes se distinguent avant
  qu'on parle de nuances.
- **Généraliser à d'autres axes photographiques** (grain, vignettage,
  focale). Même raisonnement, sûrement, mais un besoin mesuré à la fois.
- **Trier ou avertir sur le flou.** `fond_net` reste informative
  (ADR-0025) ; elle n'a rien à dire sur une image dont l'auteur a demandé
  du flou.
- **Un axe de banc pour les propriétés de scène.** Nécessaire pour
  l'avant/après, mais c'est un chantier du banc, à cadrer à part.
- **Les scènes existantes.** Elles passent en `auto` et personne ne les
  réécrit à leur place.

## Critère de sortie

1. Une scène porte le réglage, il survit à un aller-retour éditeur →
   fichier → production, et les 17 scènes existantes valent `auto` sans
   qu'aucun de leurs prompts n'ait changé d'un octet.
2. Le fragment n'entre dans le prompt que sur `net` ou `flou` — la
   fixture à l'octet près le prouve dans les trois états.
3. Sur une même scène et les mêmes seeds, `net` et `flou` se séparent sur
   `fond_net`. Si les deux donnent la même chose, le réglage est un
   mensonge d'interface et il est retiré plutôt que livré.
4. L'écran passe l'audit `audit-ux-ui`, vérifié en vrai.

## Ce que ce cadrage ne tranche pas

Le **texte** injecté pour chaque valeur. « deep depth of field, sharp
background » et « shallow depth of field, blurred background » sont des
premiers jets ; c'est le critère 3 qui dira s'ils font le travail, et
c'est un réglage, pas une décision d'architecture.

Et la **couche porteuse** : ce fragment est-il une affaire de plateforme
(vocabulaire photographique, vrai pour tout pack) ou de pack (une famille
de modèle peut demander une autre formulation) ? À trancher au moment de
l'écrire, ADR-0017 en main.

## Ce qui a été tranché à l'écriture (08/09)

- **Couche porteuse : la plateforme.** Le fragment vit dans
  `AUTOMATION/runner/prompt.py` (`BACKGROUND_FOCUS_PROMPT`), l'unique
  assembleur de prompt. « Profondeur de champ » est du vocabulaire
  photographique, vrai pour toute famille de modèle ; aucune n'a demandé
  une autre formulation. Si une le demande, c'est au pack de la porter.
- **Nom du champ : `background_focus`**, valeurs `auto` / `sharp` /
  `blurred` — code en anglais (CLAUDE.md), libellés d'interface en
  français (auto / net / flou).
- **Où dans l'écran : l'onglet Lumière**, pas Général. C'est une
  décision de prise de vue, voisine de la lumière — et l'onglet Général
  fixe la hauteur du panneau, une ligne de plus l'y faisait déborder de
  son conteneur (fumigation `test_bank` [5], mesuré : 843 + 49 px pour
  860 px de conteneur).
- **Clé d'overlay** (`worlds.SCENE_OVERLAY_KEYS`) : une scène liée à un
  lieu garde son fond à travers la fusion live d'ADR-0015 — c'est un
  réglage du personnage, jamais le cadre du lieu.

Reste ouvert : le **critère de sortie 3**. Il demande des images, pas du
code — `net` et `flou` doivent se séparer sur `fond_net` à seeds égales,
sinon le réglage est retiré plutôt que livré.
