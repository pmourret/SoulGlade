# Rétro IT-10 : les ateliers font ce qu'ils annoncent

Écrite le 27/09/2026, à la clôture de l'itération ouverte le 25/09
(`9cf0fc2`). Cadrage d'entrée : `DOCS/cadrage/2026-09-25-it10-ateliers.md`.
Cadrages de chantier : `2026-09-26-it10-c3-…` à `-c7bis-…`, et
`2026-09-27-it10-c8-amelioration-ia.md`.

Huit chantiers prévus. Sept livrés ici, avec un chantier 7 bis ajouté en
route. Le chantier 2 (les intentions) est parti en IT-11, qui l'a livré avec
les lieux et les scènes du monde (ADR-0027). Un audit UX vérifié en vrai est
tracé dans les commits de quatre chantiers : les tons (`da1c406`), la pose
(`d655959`), le studio de lumière (`1fa5d8a`) et l'amélioration IA
(`4a6f967`). Pour les formats, l'importeur, les tenues et le créateur de
lumière, aucun commit ne le nomme : le critère de sortie « chacun avec son
audit » n'est pas prouvé pour ces quatre-là.

## 1. Qu'a-t-on livré qui n'était pas prévu ?

- **La règle 6 de `PROJET.md`** (`72c568e`) est née du chantier 1. Les
  selfies dégradés par un ton ont d'abord reçu un diagnostic faux. La vraie
  cause a été lue à l'essai à trois images (`c8a9644`), puis l'expression
  s'est transférée en mouvement plutôt qu'en pixels (`7fd5bbf`). « Un
  diagnostic se prouve, une solution se garantit » a servi dans tous les
  chantiers suivants.
- **Le studio de lumière (chantier 7 bis)**. Le créateur de lumière du
  chantier 7 portait un fragment de prompt. Le studio y ajoute un vocabulaire
  de plateforme, la couleur libre, les effets de l'utilisateur et l'essai de
  rendu, généralisé depuis celui des tons (`706971f`). Son cadrage a été
  préparé sur une branche, puis fusionné (`3759142`).
- **Un second moteur de modèle de langage** (chantier 8, étape 3 bis).
  Le cadrage d'entrée laissait ouverte la question « quel modèle, local ou
  distant ». Le banc l'a tranchée en faveur de Gemma 4 E4B heretic, servi par
  llama-server. Il est déclaré au manifeste, installé par une commande
  explicite, et ComfyUI reste le repli. La recherche a d'abord montré que
  ComfyUI savait faire tourner Gemma 4, puis la mesure a montré qu'il le
  faisait 5 à 10 fois plus lentement.
- **Des correctifs trouvés en passant** : la banque d'un personnage neuf
  ne s'enregistrait pas depuis l'interface (`2885d58`), l'ancre d'identité
  est maintenant demandée à la création (`3b0353b`), et le bouton
  d'extraction de pose garde sa promesse de confidentialité hors ligne
  (`4a57819`).

## 2. Qu'est-ce qui était prévu et qui n'a pas été livré ?

- **Les intentions** (chantier 2) : sorties en IT-11 le 26/09, livrées là-bas.
- **La traduction de la consigne de la Retouche IA** (chantier 8, étape 4) :
  le panneau de l'éditeur photo avancé reste volontairement inerte jusqu'à
  F5.2. C'est aussi le seul « bientôt » encore affiché, dans un écran de
  post-production que le cadrage d'IT-10 plaçait hors de son périmètre.
- **Le bouton « Améliorer » reste lié à ComfyUI en ligne**, alors que
  llama-server pourrait répondre seul. C'est écrit dans le cadrage du
  chantier 8 : dans le studio, ComfyUI tourne toujours.
- **Les usages du modèle avec image** (légendeur, analyse d'assets,
  composeur) restent sur `qwen3vl_4b`. Les passer à Gemma demande son
  projecteur de vision et un banc à eux.

## 3. Ce que le chantier 8 apprend

- **Mesurer avant de choisir un moteur, pas après.** Les bancs ont évité
  d'écrire du code dans la mauvaise direction. Gemma
  officiel dans ComfyUI ne faisait pas mieux que Qwen. llama-server tenait
  la cohabitation sur une vraie image (38,5 s contre 38,2 s au repos), et
  sa veille native a remplacé un minuteur qu'on allait écrire.
- **Ce qu'une consigne n'obtient pas du modèle se garantit dans le code** :
  les possessifs neutralisés avant l'appel, le contrôle des mots perdus avec
  une relance, la traduction seule pour une instruction d'édition. Trois
  défauts que ni une règle ni un exemple dans la consigne n'avaient corrigés.
- **Un exemple dans une consigne finit recopié tel quel.** Sous une consigne
  libre, le modèle a rendu l'exemple comme réécriture. On l'a retiré.
- **Une fumigation peut échouer par intermittence, pour une cause
  mesurable.** L'échec de `test_enhance.js` (3 sur 6) venait d'une page
  fermée pendant qu'une requête interceptée était en vol. `unrouteAll`
  avant la fermeture l'a corrigé : 8 sur 8. L'échec est lisible dès qu'on
  relance en UTF-8 : le lanceur plantait en l'affichant sous cp1252.
- **Un port se choisit en cherchant ceux du dépôt.** llama-server a d'abord
  pris 8199, le port de l'application des fumigations. Le problème s'est vu
  à l'étape 4, avant tout conflit réel.

## 4. Ce qui reprend

Les ateliers ne promettent plus de capacité sans serveur. Trois entrées
d'horizon viennent de cette itération :
- la mise en prose du prompt assemblé pour Flux (invariant 3, ancre,
  déterminisme) ;
- le réclairage par graphe ;
- les flèches du clavier dans les sélecteurs segmentés du studio.

La suite est à choisir dans la file du tableau de bord.
