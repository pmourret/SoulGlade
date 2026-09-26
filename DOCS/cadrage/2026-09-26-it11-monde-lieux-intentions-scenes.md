# IT-11 — Un monde se livre en lieux, intentions et scènes

Décision : ADR-0027. Née du cadrage du créateur d'intentions (IT-10,
chantier 2, `2026-09-26-creer-une-intention.md`, remplacé par ce document),
qui a buté sur la définition même d'une intention.

## À quoi ça sert

Un monde est ce qui se vend (`PROJET.md`, Monétisation) : le jour où il sort,
il doit suffire pour commencer. Aujourd'hui il livre des « lieux » qui sont en
fait des scènes, des intentions qui mélangent genre, cadrage, humeur et
niveau, et une branche adulte construite sur une intention de test. Un
créateur ne peut ni le comprendre ni l'étendre sans ouvrir un JSON.

Après IT-11, un monde se lit comme la vie de quelqu'un qui publie : des
**décors**, des **intentions** (ce qu'on veut montrer), des **scènes** (une
intention dans un décor, avec son action et sa lumière), et des **tons**. Le
personnage produit les scènes du monde telles quelles, et en fait sa copie
dès qu'un atelier les modifie pour lui.

**Pour qui.** Le créateur qui ouvre un monde neuf après l'installation, et
celui qui achète un monde et veut produire tout de suite. L'utilisateur zéro
aussi : ses scènes, ses intentions et sa branche NSFW sont réécrites dans ce
modèle.

**Pourquoi maintenant, avant la suite d'IT-10.** Les chantiers restants
d'IT-10 (formats, texte de la pose, vêtements, lumière, amélioration IA)
agissent tous sur la scène et le composeur. Les construire sur l'ancien
modèle, c'est les refaire après. IT-10 reprend une fois IT-11 fermée ; son
chantier Tons est livré et ne bouge pas.

## Les chantiers, dans l'ordre

| # | Chantier | Ce qui change |
|---|---|---|
| 1 | **Le modèle du monde** | `WORLDS/<id>.json` se range en `places` (décors seuls), `intentions` (sans niveau ni format), `scenes` (intention + décor + texte + bande de niveaux), `tones`. La branche adulte devient un catalogue de scènes. `worlds.py` : chargement, validation, écriture de chaque catalogue. `slow-life` et `terres-sauvages` réécrits, décors extraits du texte des scènes actuelles. |
| 2 | **Le personnage reprend et copie** | Une scène de personnage référence une scène du monde, ou en est une copie qui garde sa provenance, ou lui est propre. Remplace `world_ref` et la fusion vivante d'ADR-0015. Matérialisation en amont de `build_jobs` (création, Banque, lancement). Revenir à la scène du monde efface la copie. Isolation d'écriture entre personnages et vers `WORLDS/` testée. |
| 3 | **L'assembleur** | Le fragment d'intention vient de la scène, plus du filtre de Produire. Une scène sans intention s'exporte dans `sans-intention/`. Verrou à l'octet près mis à jour dans le même commit. |
| 4 | **L'éditeur de mondes** | Onglets Lieux (décors), Intentions, Scènes, Tons ; branche adulte en scènes. Créer, modifier, retirer, avec un état vide qui guide. Clés immuables. |
| 5 | **Banque, composeur, Produire** | La Banque dit d'où vient chaque scène : du monde, copie de…, propre au personnage. Le composeur choisit une intention et un décor. Produire filtre par intention sans niveau, la bande de la scène décide ce qui se voit à un niveau. |
| 6 | **Le mot « intention » dans le composeur** | Le texte libre du composeur (« Décrire une intention ») se renomme ou se redéfinit, une fois le modèle en place. |

Chaque chantier a son plan avant son code (règle 3 pour les chantiers 2, 4 et
5, les plus larges). Audit `audit-ux-ui` vérifié en vrai en fin des chantiers
4 et 5.

## Tranché avec Pierre le 26/09

- **Les intentions de `slow-life`** : celles qui ne correspondent pas au
  modèle partent, sans reclassement prudent (données jetables). `boudoir`,
  `selfie` (un cadrage) et `intime` (une humeur ou un niveau) sortent ; leurs
  scènes sont réécrites sous une intention qui tient, ou retirées.
- **Le cadrage « selfie »** sera un outil à part, à venir (horizon du 26/09).
  Pendant IT-11, le selfie reste écrit dans le texte de ses scènes.
- **Masquer une scène du monde pour un personnage** : pas dans IT-11. Le
  choix se fera à la création du personnage : l'utilisateur retient les
  scènes du monde qu'il veut (horizon du 26/09).

## Hors périmètre

- Les chantiers restants d'IT-10 : formats, texte de la pose, importeur,
  vêtements, lumière, amélioration IA.
- L'outil de cadrage (horizon du 26/09).
- Le LoRA attaché à une scène (IT-3f) : il s'appuiera sur la scène du monde
  d'ADR-0027, sans rien demander à IT-11.
- `readiness` (ADR-0023) : il ne compte ni intentions ni scènes ; horizon.

## Critère de sortie

- Depuis l'interface, sans ouvrir de JSON, un monde neuf reçoit un décor, une
  intention, une scène et un ton, et un personnage neuf de ce monde produit
  cette scène.
- Un atelier qui modifie cette scène pour le personnage en fait une copie ;
  une correction de la scène dans le monde atteint un autre personnage qui ne
  l'a pas modifiée, et n'atteint pas la copie.
- `slow-life` et `terres-sauvages` sont réécrits dans le modèle ; Léna et
  Abyssiaelle produisent leurs scènes ; une scène de la branche adulte se
  produit au niveau 2 sous une intention ordinaire.
- `selfie_miroir_entree` lancée depuis « Toutes » porte le fragment de son
  intention.
- Suite de non-régression verte, audits vérifiés en vrai.
