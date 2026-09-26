# Créer, modifier et retirer une intention depuis l'éditeur de mondes

> **Remplacé le 26/09** par ADR-0027 et `2026-09-26-it11-monde-lieux-intentions-scenes.md`.
> En le discutant, la définition même d'une intention a changé : ce qu'on veut
> montrer, sans lieu, sans niveau ni format. Le constat ci-dessous reste
> juste ; C1 et C2 sont repris par l'ADR ; B1, B4 et le périmètre ne valent plus.

IT-10, chantier 2 (`2026-09-25-it10-ateliers.md`). Reprend le patron de
l'onglet Tons (`2026-09-25-creer-un-ton.md`) : même couche, même trou.

## Le constat

Une intention est un catalogue du **monde** (`WORLDS/<id>.json`, clé
`intentions`, ADR-0019), hérité par ses personnages. Aucun écran ne la crée :
un monde neuf n'en a aucune, et seul un JSON ouvert à la main lui en donne.

Ce qu'une intention porte aujourd'hui, et qui le lit — relevé dans le code le
26/09 :

| Champ | Lecteur | État |
|---|---|---|
| `key` | scènes (`intention`), lieux (`intention`), base (`intention`), dossier d'export `PROD/EXPORT/<perso>/<clé>` | vivant |
| `label`, `icon` | Produire (rail des intentions), composeur | vivant |
| `prompt_add` | `build_jobs` | vivant, **mais voir C2** |
| `min_intensity` | Produire (filtre du rail) | vivant |
| `defaults.tone` | Produire : l'intention **propose** son ton (IT-10, tons) | vivant |
| `defaults.format` | **personne** | champ mort |

Trois défauts trouvés en le relevant, chacun vérifié :

- **Le fragment d'intention dépend du filtre cliqué, pas de la scène.**
  `build_jobs` lit l'intention passée par Produire, pas celle de la scène.
  Vérifié le 26/09 sur `selfie_miroir_entree` (Léna) : lancée depuis le
  filtre Selfie, le prompt porte « phone camera perspective, slightly
  imperfect framing » ; lancée depuis « Toutes », il ne le porte pas. Les
  deux images sont pourtant enregistrées `intention = selfie`.
- **L'intention d'un lieu est un champ texte libre**
  (`PlaceInspector.tsx`), pas un choix parmi celles du monde. Une faute de
  frappe crée une intention que rien ne déclare, et un dossier d'export à
  son nom.
- **Une scène sans intention n'est jamais exportée.** `scene_intention`
  rend `None`, et `PROD/EXPORT/<perso>/None` lève un `TypeError`, avalé par
  `_best_effort` : un WARNING au journal, aucun fichier. Sur une
  installation neuve dont le monde n'a pas encore d'intention, c'est
  l'export prêt-à-poster du parcours nominal qui manque, sans rien dire à
  l'écran.

## Pour qui

Le créateur qui monte son premier monde après une installation neuve
(critère de sortie d'IT-10 : « un monde neuf reçoit ses tons et ses
intentions sans qu'on ouvre un JSON »). Et l'utilisateur zéro, dont les
selfies lancés depuis « Toutes » perdent leur fragment.

## Décisions prises par le code et le patron des tons

**B1. Une intention vit dans le monde, et seulement là.** Le personnage n'a
rien à y ajuster : un ton porte une plage d'expression qui dépend du
visage, une intention ne porte rien de tel. Pas d'atelier Intentions par
personnage. La couche personnage (`creative.json`, `_merge_by_key`) reste
dans le modèle de données, vide pour Léna comme pour Abyssiaelle, sans écran.

**B2. La clé est unique et immuable**, pour la même raison qu'un ton (A2) :
elle est écrite dans les scènes, les lieux, la base et le nom d'un dossier
d'export. Modifier une intention, c'est changer son libellé, son icône, son
fragment, son niveau ou son ton proposé, jamais sa clé.

**B3. Retirer une intention ne casse aucune scène.** La scène garde sa clé,
reste produisible depuis « Toutes », et son dossier d'export ne change pas.
Le composeur garde déjà offerte une clé que le catalogue ne déclare plus
(`GeneralPanel.tsx`). La confirmation le dit, comme celle du ton.

**B4. Le lieu choisit son intention dans la liste du monde**, avec « aucune »
en tête. Une clé orpheline que le lieu porte déjà reste affichée et
sélectionnée (même règle que le composeur).

**B5. Une scène sans intention s'exporte** dans
`PROD/EXPORT/<perso>/sans-intention/`. Ce n'est pas un choix créatif que la
plateforme tranche, c'est un nom de dossier : sans lui, l'image n'a pas
d'export du tout.

## Tranché avec Pierre le 26/09

**C1. `defaults.format` : le retirer, ou lui donner un lecteur ?**
Personne ne le lit. Un format se règle par scène (`scene.format`), et le
chantier 3 (formats, 16:9, une seule liste) décidera si une intention peut
proposer un format, et à quel moment (création de scène dans le composeur,
lancement dans Produire). **Retenu : le retirer des mondes et ne pas
l'exposer.** Montrer dans l'éditeur un champ qui ne fait rien serait l'outil
qui ment sur ce qu'il fait (règle 2 amendée). Le chantier 3 le recrée s'il
en décide ainsi.

**C2. D'où vient le fragment d'intention : de la scène ou du filtre ?**
**Retenu : de la scène** (`scene_intention(scene)`), quel que soit le
filtre cliqué. Le filtre de Produire redevient un filtre. Conséquence
assumée : l'assembleur change (invariant 3). Une scène lancée depuis
« Toutes » gagne le fragment de son intention. Le verrou à l'octet près
(`test_build_jobs.py`, section 1) rejoue une banque d'avant la refonte en
présumant qu'aucun fragment d'intention n'entre sans intention demandée : il
se met à jour dans le même commit pour rejouer l'ancien algorithme **plus**
le fragment de l'intention de chaque scène, et reste à l'octet près.

## Périmètre

- Référentiel › Mondes, onglet **Intentions** à côté des Lieux et des Tons :
  créer (clé déduite du libellé, `slugify` des tons), modifier (libellé,
  icône, fragment, niveau minimal, ton proposé parmi ceux du monde ou
  aucun), retirer (B3). État vide qui dit quoi faire.
- `GET/POST /api/worlds/{id}/intentions`, validation au patron de
  `validate_tones` : clé `[a-z0-9_]+` unique, libellé et fragment en
  chaînes, `min_intensity` entier ≥ 0, `defaults.tone` vide ou ton du monde.
  `create_world` naît avec `"intentions": []`.
- `WorldSummary.intentions_count`.
- Lieu : sélecteur au lieu du champ libre (B4).
- Export sans intention (B5).
- C1 (retrait de `defaults.format`) et C2 (fragment venu de la scène).

## Hors périmètre

- Le format proposé par une intention : chantier 3.
- Les libellés des niveaux d'intensité dans l'éditeur de mondes : les
  paliers appartiennent au personnage (`creative.json`, dérivé du pack),
  pas au monde. Le monde écrit un niveau numérique, avec une aide qui le
  dit.
- Le repli codé en dur sur `lifestyle` dans `compose.py` (quand le modèle
  propose une intention inconnue) : il vise l'amélioration des prompts par
  IA, chantier 8, qui réécrit ce chemin.
- `readiness` ne compte pas les intentions et n'est lu que par la ligne de
  commande (`worlds.py`) : horizon, pas ce chantier.

## Ce qu'il faut construire

Backend : `worlds.save_intentions`, route et schémas (patron tons),
`intentions_count`, B5 dans `runner/sortie.py`, C2 dans
`runner/prompt.py`. Frontend : `useWorldIntentions`, `IntentionInspector`,
l'onglet dans `CatalogueColumn`, le sélecteur du lieu. Les composants des
tons se reprennent tels quels là où ils conviennent, sans abstraction
commune tant que deux usages suffisent.

Tests : `test_world_intentions.py` (validation, écriture, isolation entre
deux mondes), `test_build_jobs.py` (C2, verrou mis à jour),
`test_worlds.js` (créer, modifier, retirer depuis l'onglet, état vide,
sélecteur du lieu), un test d'export sans intention.

## Critère de sortie

Depuis un monde neuf, sans ouvrir de JSON : créer une intention, l'assigner
à un lieu par la liste, en faire une scène, la produire et la retrouver
exportée dans son dossier. Puis la retirer et constater que la scène se
produit encore depuis « Toutes ». `selfie_miroir_entree` lancée depuis
« Toutes » porte le fragment de Selfie. Audit
`audit-ux-ui` vérifié en vrai en fin de chantier.
