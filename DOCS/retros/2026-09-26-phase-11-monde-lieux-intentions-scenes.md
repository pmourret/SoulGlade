# Rétro IT-11 : un monde se livre en lieux, intentions et scènes

Écrite le 26/09/2026, à la clôture de l'itération ouverte le même jour.
Décision : ADR-0027. Cadrage d'entrée :
`DOCS/cadrage/2026-09-26-it11-monde-lieux-intentions-scenes.md`. Cadrages de
chantier : `2026-09-26-it11-c2-…`, `-c4-…`, `-c5-…`, `-c6-…`.

Six chantiers, tous livrés, du modèle du monde (`7d4677a`) au composeur de
scènes (`21e590d`). Chacun a été validé par ses tests, le vérificateur et le
gardien des invariants avant son commit. Les chantiers 4, 5 et 6 ont chacun
reçu un audit UX vérifié en vrai (captures à 1440 et 1024).

## 1. Qu'a-t-on livré qui n'était pas prévu ?

- **Le lieu reste lié à la scène du personnage** (chantier 5, tranché avec
  Pierre). Le cadrage d'entrée ne disait pas ce qu'une copie fait de son
  décor. La composition « texte, décor » a quitté le disque pour le
  lancement (`worlds.compose_scene_bank`, en amont de `build_jobs`) : une
  copie suit les corrections de son lieu, comme celles de son intention et
  de son ton. Le verrou à l'octet près est resté vert sans toucher sa
  fixture, parce qu'une scène sans lieu ne change pas.
- **Le composeur est remonté, et pas seulement renommé** (chantier 6). Le
  cadrage prévoyait de renommer ou de redéfinir le texte libre. L'écran
  n'était plus monté nulle part depuis le passage au compositeur à onglets,
  ce que seule la lecture du code a montré. Il revient comme « Proposer des
  scènes… », avec un brief, une intention et un lieu. Une proposition
  ajoutée est marquée `compose`, une origine que rien n'écrivait jusque-là.
- **Produire distingue « aucune à ce niveau » de « à peupler »**, et
  « Depuis le monde » garde le niveau minimum de la scène du monde au lieu de
  l'écraser par 0. Les deux défauts ont été trouvés en explorant le chantier
  5 ; le cadrage tenait déjà ce que Produire devait dire.
- **Le gardien des invariants lit le diff fichier par fichier** (`c7a519b`),
  sous le contexte qui le saturait. Il est passé de 86k tokens à 43-87k
  selon la taille du diff.
- **Une retombée attrapée par le vérificateur** : `test_valider_banque`
  vidait le prompt d'une scène que la banque de Léna porte maintenant avec
  son lieu, ce que la règle du chantier 5 accepte. Le code était juste et le
  test périmé ; il vérifie maintenant les deux cas (`087376e`). Leçon : un
  test qui lit la banque réelle change de sens quand la forme du disque
  change, même quand son module n'a pas bougé.

## 2. Qu'est-ce qui était prévu et qui n'a pas été livré ?

- **« Une scène de la branche adulte se produit au niveau 2 »**, dans le
  critère de sortie : ce n'est pas ce qui a été vérifié. Chez Léna, le cran
  qui porte le LoRA adulte est le niveau 3. Les deux scènes de la branche y
  sont proposées sous des intentions ordinaires (lifestyle et selfcare,
  constaté dans Produire), et à aucun autre niveau. Le chiffre du critère
  datait d'avant le découpage des crans de Léna. Aucune image n'a été rendue
  pour le vérifier : la preuve reste au plan (`/api/plan`, `build_jobs`).
- **Léna et Abyssiaelle « produisent leurs scènes »** : c'est vérifié au plan
  et par les tests d'assemblage (verrou d'Abyssiaelle compris), pas par un
  rendu GPU pendant l'itération. Le premier lancement réel après IT-11 est
  celui qui le confirme.
- **Le minimum d'une scène reprise ne suit plus le monde une fois la Banque
  enregistrée** : le composeur réécrit toujours `intensity`. C'est noté dans
  le cadrage du chantier 5 et versé à l'horizon.

## 3. Ce qui reprend

IT-10 (« Les ateliers font ce qu'ils annoncent ») repart sur le nouveau
modèle. Ses chantiers restants (formats, texte de la pose, vêtements,
lumière, amélioration IA) agissent tous sur la scène, qui a maintenant son
lieu, son intention et sa provenance. L'outil de cadrage et le choix des
scènes du monde à la création du personnage attendaient la fin d'IT-11 :
ils restent à l'horizon, désormais débloqués.
