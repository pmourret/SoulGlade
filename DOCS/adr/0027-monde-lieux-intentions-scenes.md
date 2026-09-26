# ADR-0027 : Un monde livre des lieux, des intentions et des scènes ; le personnage copie une scène quand il la modifie

## Statut

Accepté (2026-09-26).

- **Supersède ADR-0015.** Le cadre d'une scène liée n'est plus hérité en
  permanence : il l'est tant que le personnage ne l'a pas modifié.
- **Amende ADR-0014 §1.** Les scènes vivent aussi dans le monde. L'alternative
  qu'ADR-0014 avait écartée est reprise, sans l'écriture dans le fichier
  partagé qui l'avait fait écarter.
- **Amende ADR-0019 §1 et §2.** Le catalogue `places` devient un catalogue de
  scènes. Une intention ne porte plus de niveau ni de format.

## Contexte

Le 26/09, le cadrage du créateur d'intentions (IT-10, chantier 2) a buté sur
une question que personne n'avait posée : qu'est-ce qu'une intention ? En
relevant ce qu'elle porte et qui le lit, le code a montré qu'elle mélangeait
plusieurs rôles sans en assumer aucun :

- **son fragment de prompt dépend du filtre cliqué dans Produire, pas de la
  scène.** `selfie_miroir_entree` reçoit « phone camera perspective » depuis
  le filtre Selfie, et ne le reçoit pas depuis « Toutes », alors que les deux
  images sont enregistrées `intention = selfie` (vérifié le 26/09) ;
- **un lieu porte une intention**, dans un champ texte libre qui « sert aussi
  de dossier d'export » ;
- **`selfie` est une manière de cadrer**, pas quelque chose qu'on veut
  montrer ;
- **`intime` est à la fois une intention, un ton du même nom, et un niveau**
  (`min_intensity: 1`) ;
- **`boudoir` était un concept de test** : une intention réservée au niveau 2,
  qui n'existait que pour servir de base à l'édition NSFW ;
- **`defaults.format` n'a aucun lecteur.**

Et un constat plus profond : **les « lieux » d'un monde sont des scènes.**
ADR-0019 a versé les 16 scènes de Léna dans `places`. `salon_lecture` dit
« curled up on a sofa reading a book, seen from the side, warm lamp light,
evening » : une action, un cadrage, une lumière et un décor. Aucun catalogue
ne décrit un décor seul.

Pierre a fixé le modèle en séance, sur deux axes.

**Le produit.** Un monde se propose aux créateurs, c'est ce que l'abonnement
vend (`PROJET.md`, Monétisation). Le jour où il sort, il est impeccable et il
suffit pour commencer : décors, intentions, scènes prêtes, tons, style.

**Le cadre humain.** Quelqu'un vit dans un monde physique, avec ses décors. Il
a des intentions de publication : ce qu'il veut montrer. Une scène en est un
moment concret : « je lis un livre, à la plage ». Les outils agissent ensuite
sur la scène : plan resserré, selfie, humeur. Le niveau traverse tout : « on
peut adorer se montrer en randonnée, et de temps en temps faire des photos
osées en pleine randonnée ».

## Décision

### 1 · Cinq notions, une question chacune

| Notion | Question | Porté par |
|---|---|---|
| **Lieu** | quel décor ? | le monde |
| **Intention** | que veut-on montrer ? | le monde |
| **Scène** | quel moment : une intention dans un lieu, avec son action et sa lumière ? | le monde, repris et modifiable par le personnage |
| **Outils** | comment le montre-t-on : cadrage, selfie, humeur (ton), pose, tenue, lumière ? | les ateliers, qui agissent sur la scène |
| **Niveau** | jusqu'où ? | choisi au lancement ; une scène dit à quels niveaux elle se prête |

Un **ton** reste une humeur du monde, que le personnage ajuste (IT-10).

### 2 · Le lieu est un décor, sans rien d'autre

Un lieu porte un identifiant, un libellé et la description de son décor. Il
ne porte ni intention, ni action, ni lumière, ni cadrage, ni dossier d'export.
Plusieurs scènes, de plusieurs intentions, puisent dans le même lieu.

### 3 · L'intention est ce qu'on veut montrer, à tous les niveaux

Une intention porte une clé, un libellé, une icône, un fragment de cadrage
général (`prompt_add`) et, au plus, un ton qu'elle **propose**. Elle ne porte
**aucun niveau** (`min_intensity` disparaît) et **aucun format**
(`defaults.format` disparaît). Le NSFW n'est pas une intention.

- **La clé est immuable.** Elle est écrite dans les scènes, la base et le nom
  du dossier d'export (`PROD/EXPORT/<perso>/<intention>`) ; une scène sans
  intention s'exporte dans `sans-intention/`.
- **Son fragment vient de l'intention de la scène**, jamais du filtre de
  Produire. C'est un changement de l'assembleur (invariant 3), que le verrou
  à l'octet près suit dans le même commit.

### 4 · La scène est le moment composé : intention × lieu × détails

Une scène du monde porte son intention, son lieu, et le texte de ce qui s'y
passe (action, lumière, détails), avec la bande de niveaux à laquelle elle se
prête. Elle ne porte jamais de tenue (ADR-0014 §2 tient : la tenue se mesure
sur un visage). Le prompt de scène se matérialise à partir du lieu et de la
scène **en amont de `build_jobs`**, comme ADR-0015 §4 l'avait posé pour les
lieux : l'assembleur lit une scène déjà composée.

### 5 · Le personnage reprend les scènes du monde, et copie celle qu'il modifie

Un personnage produit les scènes de son monde **telles quelles**, par
référence : une correction du monde les atteint, ce que vend l'abonnement.
Dès qu'un atelier modifie une scène **pour ce personnage**, elle devient sa
**copie** : elle garde la trace de la scène dont elle vient, et elle ne suit
plus le monde. Rien d'un personnage n'écrit jamais dans `WORLDS/` (ADR-0014,
isolation d'écriture inchangée).

Le personnage peut aussi avoir ses propres scènes (écrites à la main, ou
proposées par le composeur), qui ne viennent d'aucune scène du monde.

### 6 · Le NSFW est un niveau, et sa séparation reste une séparation de livraison

La décision du 21/09 tient : la branche NSFW d'un monde vit dans une clé à
part, pour qu'un pack puisse la vendre ou la livrer séparément. Ce qu'elle
contient change : ce sont des **scènes**, qui utilisent les mêmes lieux et les
mêmes intentions que les autres. Il n'y a ni décor adulte ni intention
adulte ; il y a des scènes qui ne se prêtent qu'aux niveaux hauts.

## Alternatives envisagées

- **Garder l'héritage vivant d'ADR-0015** (le personnage ne recouvre que ce
  qu'il change, le cadre suit toujours le monde) — écarté : le personnage ne
  peut pas s'écarter du cadre d'une scène, et c'est précisément là que les
  outils des ateliers doivent agir.
- **Copier toutes les scènes à la naissance du personnage** (l'amorce
  d'avant ADR-0015) — écarté : un personnage déjà né ne recevrait plus
  aucune correction de son monde, ce que l'abonnement vend.
- **Scènes du monde référencées, éditées dans le fichier du monde** (écarté
  par ADR-0014) — toujours écarté : modifier pour un personnage écrirait
  pour tous. La copie à la modification est ce qui rend la référence
  possible.
- **Une intention qui porte un niveau** (`min_intensity`, `boudoir`) — écarté :
  le NSFW traverse les intentions, il n'en est pas une.
- **Un lieu qui porte une intention** (l'état actuel) — écarté : la même
  entrée avec miroir sert un selfie comme une photo de mode.

## Conséquences

- `WORLDS/<id>.json` se range en `places` (décors), `intentions`, `scenes`,
  `tones`. Les « lieux » actuels deviennent des scènes, chacune rattachée à
  un décor extrait de son texte. La branche adulte devient un catalogue de
  scènes.
- Les intentions de `slow-life` se relisent avec ce modèle : `selfie` passe
  aux outils (le cadrage), `intime` à l'humeur ou au niveau, `boudoir` est
  retiré. La liste finale se tranche avec Pierre dans le cadrage.
- Les scènes des personnages passent de `world_ref` (lieu, héritage vivant)
  à une référence de scène du monde, ou à une copie qui en garde la trace.
  Données jetables (CLAUDE.md, 21/09) : on régénère plutôt que de migrer
  prudemment.
- L'assembleur change sur un point (le fragment d'intention vient de la
  scène), et `test_build_jobs.py` le suit.
- Le composeur, l'éditeur de mondes, la Banque et Produire changent de
  vocabulaire ; le sens du mot « intention » dans le composeur (texte libre)
  se tranche une fois ce modèle en place.
- Le séquencement vit dans une itération dédiée, cadrée dans `DOCS/cadrage/`.
