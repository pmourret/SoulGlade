# L'écran du jeu d'entraînement

Cadrage ouvert le 2026-09-10, pendant IT-3d. Trois questions comme tout
cadrage (règle 3, `PROJET.md`).

## Ce qui le déclenche

Le 10/09, `entrainement.py --exporter` est devenu capable de sortir un dossier
qui tourne tel quel sur une machine kohya : images sous
`dataset/<répétitions>_<déclencheur>`, une légende par image, le manifeste,
`dataset.toml`, `entrainer.sh`.

Tout cela n'existe qu'en ligne de commande. Vérifié le jour même : zéro
occurrence de `entrainement` sous `AUTOMATION/web/`. Le studio ne sait donc
pas dire sur quoi il entraînerait, ce qu'il a écarté, ni pourquoi la
proposition ne passe pas — alors que ces trois réponses existent déjà,
calculées, dans un module que personne ne voit.

## À quoi ça sert, et pour qui

**Pour Pierre, maintenant.** IT-3d se ferme sur un chiffre, et le chemin qui y
mène passe par un jeu d'entraînement qu'il faut inspecter avant de payer des
heures de GPU. Lire « 27 dans la file, 18 écartées, diversité de scène 8,9 »
dans un terminal marche ; le faire à côté de la banque et de la revue, sur
l'écran où l'on juge déjà les images, dit quelque chose que le terminal ne dit
pas — que ce jeu est fait de ces images-là.

**Pour l'utilisateur cible ensuite.** Le même écran servira le jour où un de
ses personnages passe en production. C'est la deuxième semaine de son usage,
pas la première heure.

**Une réserve, tranchée par Pierre le 10/09.** Le cadrage du 09/09 range le
LoRA d'identité hors parcours nominal. Une septième entrée de navbar pour cet
écran est donc un choix assumé, pas une conséquence de la règle 2. C'est écrit
ici pour que la rétro le retrouve, pas pour le rouvrir.

## Hors périmètre

- **Lancer un entraînement depuis la plateforme.** C'est l'étage 3 du cadrage
  du 09/09, versé à l'horizon le 10/09 avec ComfyUI-FluxTrainer pour candidat.
  L'écran prépare et exporte ; il n'entraîne pas.
- **Éditer la file à la main.** Admettre ou écarter une image se décide par le
  portillon d'identité et par le défaut objectif, pas par un clic. La règle 8
  du mécanisme d'identité tient la séparation entre publiable et entraînable ;
  un écran qui la contournerait la viderait de son sens.
- **Régler les seuils `entrainement.*`** depuis l'écran. Ils vivent dans
  `config.json` (invariant 4), l'écran les lit et dit lequel manque.
- **Le suivi d'avancement en direct de l'export.** Le dépôt n'a ni WebSocket,
  ni SSE, ni long-polling, et le refus est documenté sur `/api/mesurer`. Une
  requête, une réponse.

## Le plafond assumé, écrit plutôt que masqué

La légende vient du prompt par substitution exacte : 22 sur 22 chez Léna, coût
nul. Le légendeur de vision n'est qu'un repli, à 300 s de délai maximum par
image. L'export reste donc **une seule requête** plutôt que le contrat en
paquets de `/api/mesurer`.

Deux contreparties, qui font partie du périmètre :

- la proposition **compte et annonce** combien d'images tomberont sur le repli,
  avant qu'on clique ;
- le service porte un commentaire `ponytail:` qui nomme le plafond et la
  sortie : si un corpus demande beaucoup de replis, cette route passe au
  contrat `{faites, restant}` déjà éprouvé.

## Critère de sortie

- `GET /api/training/proposal?character=lena` rend les mêmes chiffres que
  `python AUTOMATION/entrainement.py lena`, à l'unité près.
- Un test d'isolation échoue si la proposition d'un personnage laisse
  apparaître une image d'un autre, ou si la requête passe sans `?character=`.
- L'export lancé depuis l'écran produit un dossier que l'historique liste au
  rechargement, et un batch en cours le refuse par un 409.
- L'audit `audit-ux-ui` est passé **en vrai**, pas à la lecture, et ses
  findings sont corrigés.
