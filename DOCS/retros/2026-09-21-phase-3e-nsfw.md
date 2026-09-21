# Rétro IT-3e — Le NSFW sait ce qu'il produit, et pour qui

**État : notes de chantier, rétro ouverte.** IT-3e n'est pas close : le corps
n'est toujours mesuré nulle part (E9, dette). Les deux listes de la règle 4
s'écrivent à la fermeture ; ce qui suit est versé au fil des chantiers pour
qu'il ne se perde pas d'ici là.

## Chantier « les deux écrans de la scène adulte » (21/09)

Plan : quatre étapes, quatre commits (`28cf9b3`, `4977764`, `b30c47e`, puis
l'audit). Cadrage d'usage : `DOCS/cadrage/2026-09-21-flux-nsfw.md`.

### Livré sans être prévu

- **« + Depuis le monde » pour tous les lieux**, pas seulement les adultes.
  Le geste n'existait pour aucun lieu : une banque n'était semée depuis son
  monde qu'à la création du personnage. Un lieu ajouté à un monde ensuite
  restait hors de portée de tous ses personnages. Trouvé en cherchant où
  brancher le lieu adulte, arbitré par Pierre dans le plan.
- **La restauration du focus à la fermeture d'une boîte, pour tout le
  studio.** Six appelants de `chrome/Dialog` (le catalogue du monde, la
  déclinaison, les deux modales de pose, l'éditeur photo, le composeur) se
  ferment en se démontant ; `Dialog` ne rendait le focus qu'en passant
  `open` à faux. Échap envoyait le focus sur `<body>`. Corrigé une fois,
  dans `Dialog`.

### Pièges trouvés en vrai, jamais à la lecture

- **Le focus initial tombait sur « Fermer »** : la boîte s'ouvre avant que
  les lieux arrivent, le seul élément focusable est alors le bouton de
  fermeture, et Entrée refermait ce qu'on venait d'ouvrir.
- **Le bouton « + Ajouter un lieu » avait le fond gris clair du
  navigateur** (240,240,240) sous un texte rose : contraste ~1,9:1, mesuré.
  Antérieur au chantier, mais doublé par le second catalogue.
- **Les deux catalogues se chargent en parallèle** : la liste adulte arrive
  un instant après l'ordinaire, un test qui la supposait présente échouait
  une fois sur deux.
- **Un champ non déclaré dans un schéma Pydantic de réponse disparaît** sans
  erreur (`NsfwSourceImage.space`) : le correctif front seul ne changeait
  rien.

### Décisions qui tiennent

- Un personnage non armé ne voit **rien** des lieux adultes : ni section
  grisée, ni phrase qui l'inviterait à armer (ADR-0003, off par défaut). Seul
  le personnage armé sans palier natif reçoit une phrase : c'est un trou de
  configuration.
- Le niveau natif est **dit par le serveur** (`/api/creative`,
  `niveau_natif`), jamais deviné par l'écran.
- Le catalogue adulte vit dans un fichier frère versionné
  (`WORLDS/<id>.adulte.json`) : le dépôt est privé, le dépôt public viendra
  à part.
