# IT-11, chantier 5 : la Banque, le composeur et Produire parlent le nouveau modèle

Cadrage d'IT-11 : `2026-09-26-it11-monde-lieux-intentions-scenes.md`.
Décision : ADR-0027.

## Pourquoi

Le monde est rangé en lieux, intentions, scènes et tons, et il s'édite depuis
l'écran (chantiers 1 à 4). Côté personnage, trois écrans parlent encore
l'ancien modèle :

- la Banque ne dit pas, dans sa liste, d'où vient chaque scène ;
- le composeur n'offre aucun lieu : le décor est du texte libre, et une scène
  reprise stocke un prompt déjà composé, qu'une copie recopie en dur ;
- Produire filtre déjà par intention sans niveau, et la bande de la scène y
  décide déjà de ce qui se voit. Deux défauts demeurent pourtant :
  - « Depuis le monde » écrase le minimum de la scène du monde par 0 ;
  - une intention vide au niveau courant renvoie vers la Banque comme si elle
    n'avait aucune scène.

**Pour qui.** L'utilisateur qui produit les scènes de son monde et en ajuste
une pour son personnage, et l'utilisateur zéro, dont les scènes passent dans
ce modèle.

## Tranché avec Pierre le 26/09 : le lieu reste lié

Une scène de personnage garde la **clé** de son lieu et son **propre texte**.
Le prompt « scène, décor » se compose au lancement, en amont de `build_jobs`
(ADR-0027 §4), et plus sur disque. Une copie suit donc les corrections du
lieu, comme elle suit déjà celles de son intention et de son ton : ce qui
cesse de suivre le monde, c'est le texte de la scène. Le composeur peut ainsi
afficher et changer le lieu choisi.

## Ce qui change

**Backend.**

- `worlds.merge_scene` rend le lieu et le texte propre de la scène.
- `runner.prompt.load_scene_bank` compose chaque scène qui porte un lieu,
  quelle que soit son origine.
- Une scène sans lieu ne change pas d'un octet, et le verrou de l'assembleur
  le prouve (invariant 3).
- Un lieu disparu est une erreur qui nomme la scène, jamais un lancement
  silencieux sans décor.
- La Banque refuse un lieu inconnu du monde. Le texte peut être vide quand un
  lieu est choisi.

**Banque.** Chaque ligne de la liste dit « monde », « copie » ou « propre ».
Le bandeau de provenance dit aussi « propre à ce personnage ».

**Composeur.** L'étape « Décor, cadrage » devient :

- **Lieu**, un sélecteur tiré des lieux du monde ;
- **Ce qui s'y passe**, le texte de la scène.

L'aperçu composé suit la règle du monde. Une scène reprise les montre grisés,
comme son intention.

**« Depuis le monde ».** Le minimum de la scène du monde est repris, puis le
niveau natif pour une scène adulte qui n'en porte pas. Son lieu est repris
aussi.

**Produire.** Une intention qui a des scènes, mais aucune au niveau courant,
le dit sans renvoyer à la Banque. « À peupler » reste pour une intention sans
aucune scène.

## Hors périmètre

- Le texte libre « Décrire une intention » et l'origine `compose` : c'est le
  chantier 6.
- Faire suivre au personnage une correction du minimum d'une scène du monde
  après un enregistrement de sa Banque : la Banque réécrit ce minimum. C'est
  noté ici, et ce n'est pas traité.

## Critère de fin

- Une copie qui a gardé son lieu reçoit au lancement la correction de ce lieu,
  mais pas celle du texte de la scène du monde.
- Une scène propre choisit un lieu dans le composeur et se compose au
  lancement.
- La liste de la Banque dit la provenance de chaque scène.
- Le verrou à l'octet près est vert sans toucher sa fixture.
- L'audit `audit-ux-ui` est vérifié en vrai sur la Banque, le composeur et le
  rail des intentions de Produire.
