# Phase R&D — un juge généraliste, et le rendu avant lui

Cadrage ouvert le 2026-09-08 à la clôture de l'étiquetage d'IT-3
(`DOCS/recherche/2026-09-08-corpus-etiquete-resultats.md`). Trois
questions, comme tout cadrage (règle 3, `PROJET.md`).

## Ce qui déclenche cette phase

Le corpus a répondu à la question d'IT-3 par une troisième branche que sa
DoD n'avait pas prévue. Ni « le tri passe dans le runner », ni « on amende
le critère de sortie » : **aucune mesure ne franchit la barre, et le
problème n'est plus celui qu'on croyait**.

- 75 % des mains jugeables de la banque sont ratées. À ce taux, trier ne
  protège plus rien : un filtre qui écarte trois quarts de la production
  est un arrêt de production. Le sujet se déplace de *reconnaître* le
  raté vers *ne plus le produire*.
- Les proportions ne sont pas un défaut réel (1 sur 92). La piste garde
  sa place, en R&D, mais elle n'est plus une urgence de production.
- Les trois mesures de réalisme sont sereines sur une banque que son
  auteur juge non convaincante à 51 contre 41.

## À quoi ça sert, et pour qui

**Pour Pierre d'abord, et pas plus tard.** Il ne peut pas ouvrir IT-4
(une semaine de production réelle) sur un rendu dont la peau et le fond le
gênent à chaque image. Ce n'est donc pas un chantier de confort reporté
après le parcours nominal : c'est ce qui débloque l'itération suivante.

**Pour l'utilisateur cible ensuite.** Le critère de sortie V1 demande des
défauts objectifs « mesurés ET triés automatiquement, sous condition de
fiabilité démontrée ». Il reste vrai et non amendé. Cette phase cherche
l'instrument qui permettrait un jour de le tenir.

Deux fronts, dans cet ordre décidé le 08/09 — **le second est sorti de
la phase le 09/09**, voir l'encadré de sa section :

### Front 1 — le rendu (E5), dans l'ordre fond → peau → mains

Ce que le graphe sort avant tout contrôle. L'ordre est celui de Pierre.

- **Le fond en premier.** Piste posée le 08/09 : partir d'une image de
  référence, et retirer le flou de focus du créateur de scène. L'état de
  l'art la soutient — ce que l'œil appelle « effet studio » n'est pas la
  netteté moyenne (notre production est mesurée 4× *moins* nette que de
  vraies photos) mais son **uniformité**, l'absence de zones franchement
  floues.
- **La peau ensuite** — « trop lisse », alors que `texture_visage` la
  déclare identique à celle de vraies photos. Une mesure aveugle à ce que
  l'œil voit ne guidera pas le travail : il faudra soit un indicateur qui
  sépare, soit accepter de juger à l'œil et le dire.
- **Les mains en dernier**, côté rendu. **Protocole arrêté le
  2026-09-09**, contraint par ce que le corpus a mesuré la veille :
  `mains` (taux de détection DWPose) est chiffré à 25 % de rappel, il ne
  peut donc pas rendre le verdict — et 49 images sur 102 n'ont aucune
  main jugeable, donc une scène où les mains sont petites gaspille la
  moitié du banc. D'où : une scène où les mains sont grandes et
  occupées, ~30 images par variante (c'est ce qu'il faut pour
  distinguer 75 % de 50 % à deux erreurs-types sur un taux), et un
  jugement à l'œil sur une **planche de crops de mains** découpés par
  DWPose — qui localise très bien même quand il ne juge pas
  (`qc_mains.py`). Le résultat est un **taux de mains ratées par
  variante**, pas une préférence entre deux images : sur un défaut qui
  touche trois images sur quatre, savoir laquelle est la moins pire ne
  dit pas si on est passé sous la barre.

### Front 2 — le juge généraliste (E6)

> **SORTI DE CETTE PHASE le 2026-09-09**, à sa clôture, et transformé en
> itération à lui. La raison est la prémisse de la phase, pas un manque de
> temps : elle s'est ouverte sur « à 75 % de mains ratées, trier ne protège
> plus rien — un filtre qui écarte trois quarts de la production est un
> arrêt de production ». Le front 1 a fait tomber cette prémisse. À 36 %,
> et seulement quand l'utilisateur le demande, un filtre redevient tenable ;
> le juge cesse d'être l'urgence qui justifiait de le traiter dans la même
> phase que le rendu.
>
> Ce qui NE change pas : le critère de sortie V1 — « défauts objectifs
> mesurés ET triés automatiquement, sous condition de fiabilité démontrée »
> — reste debout et non amendé. Le juge revient, plus tard, avec sa propre
> DoD. Tout ce qui suit dans cette section reste valable et sert de point de
> départ à cette itération : les trois contraintes, les trois candidats,
> l'ordre d'examen.


Un passage unique par lequel chaque image produite passe pour dire ce qui
ne va pas. Contraintes posées par Pierre, non négociables :

- **agnostique** — aucun `if character == …`, aucun réglage par
  personnage. Invariant 7 ;
- **rattaché à la plateforme** — c'est une capacité de plateforme, la
  seule couche avec le pack autorisée à porter un graphe (ADR-0017) ;
- **bout en bout** — proportions ET mains dans le même passage, pas deux
  sous-systèmes.

Candidats classés dans
`DOCS/recherche/2026-09-08-etat-de-l-art-detection-defauts.md`. Trois
retenus, dans cet ordre d'examen : **HADM** (poids publiés, cible juste),
**ViT-HD** (meilleur sur le papier, disponibilité à vérifier),
**ArtifactLens** (correspond à notre volume de 102 étiquettes, mais code
non publié — réimplémentation).

## Hors périmètre

- **Corriger automatiquement.** HandRefiner et consorts sont des
  correcteurs ; ils viendront après un détecteur fiable, jamais avant.
  Une régénération automatique déborde (même règle qu'en P4.3 et P4.5).

  **Amendé le 2026-09-09, avant la première ligne de code de l'étape
  mains.** Ce que ce point exclut, c'est une correction *déclenchée par
  une mesure* : détecter un raté, puis relancer ou réparer tout seul.
  C'est là qu'un détecteur non fiable ferait des dégâts, et c'est le
  même raisonnement qu'ADR-0025. Un étage de rendu inconditionnel, qui
  s'applique à toutes les images sans rien juger, n'en fait pas partie
  — `FACEDETAILER` est déjà dans le graphe à ce titre, et personne ne
  l'a jamais appelé un correcteur. **Un `HANDDETAILER` (Impact Pack,
  détecteur `hand_yolov8s`) est donc dans le périmètre du front 1**, au
  même titre et par le même mécanisme : un drapeau de preset, un groupe
  de graphe, un axe de banc.

  La frontière, pour qu'elle serve la prochaine fois : **inconditionnel
  = rendu, conditionné à une mesure = correcteur.** Le second reste
  hors périmètre tant qu'aucun détecteur n'est chiffré.
- **Brancher un tri.** ADR-0025 tient : rien ne devient bloquant sans
  faux positifs ET faux négatifs comptés sur le corpus. Cette phase peut
  produire un détecteur ; elle ne le branche pas.
- **Entraîner un modèle depuis zéro.** 102 étiquettes par image ne le
  permettent pas, et une étiquette par main demanderait une repasse.
  Réutiliser ou adapter, pas entraîner.
- **Le NSFW comme cas particulier.** Le juge le traite comme le reste ou
  ne le traite pas ; aucun sous-système parallèle (invariant 9).
- **La vidéo.** IT-6, et elle attend un rendu stable.

## Critère de sortie

Une phase de R&D ne promet pas un résultat, elle promet un verdict écrit.
Trois conditions :

1. **Le fond, la peau et les mains ont un avant/après jugé par Pierre**,
   mesuré au banc de comparaison (celui d'IT-1, déjà en service) —
   adopté ou rejeté par un chiffre, jamais par une impression. Le
   chiffre n'est pas le même partout, et c'est l'instrument qui décide :
   un score du banc quand un score sépare (identité), un taux compté à
   l'œil quand aucun ne sépare (les mains, cf. ci-dessus ; la peau a
   tranché pareil le 09/09).
2. ~~**Un candidat détecteur est chiffré sur le corpus du 08/09**~~ —
   **retiré le 2026-09-09**, en même temps que le front 2 et pour la même
   raison (voir l'encadré plus haut). Le texte de la condition part avec
   lui, mot pour mot, dans la DoD de l'itération du juge : faux positifs
   et faux négatifs comptés sur les 53 mains jugeables, comparés aux 30 %
   de rappel de `hands` v1, et un candidat qui ne fait pas mieux refermé
   par écrit — comme la piste géométrique et Florence-2.
3. ~~**Le coût par image est mesuré**~~ — **retiré le 2026-09-09**, il
   portait sur le juge. Il part avec lui, avec son souvenir de Florence-2
   (9,5 s par crop, ~19 s par image : un juge trop lent ne rentre pas dans
   la boucle de production, quelle que soit sa justesse).

   À ne pas confondre avec le coût mesuré le 09/09 : les +34,4 s par image
   de l'étage `HANDDETAILER` sont ceux du RENDU, front 1. Ils ne soldent
   pas cette condition-ci.

## Ce que cette phase ne tranchera pas

L'architecture du juge — custom node ComfyUI ou processus Python séparé —
n'est pas décidée ici. Aucun nœud ComfyUI n'existe pour HADM ; ADR-0024
tient ComfyUI pour un processus séparé auquel on ne parle qu'en HTTP, et
ADR-0008 garde cv2 hors du venv de dev. Le choix se fera au premier
candidat retenu, avec son entrée au manifeste dans le même commit
(invariant 12).
