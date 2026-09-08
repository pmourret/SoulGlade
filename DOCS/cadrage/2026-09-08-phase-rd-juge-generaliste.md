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

Deux fronts, dans cet ordre décidé le 08/09 :

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
- **Les mains en dernier**, côté rendu.

### Front 2 — le juge généraliste (E6)

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

1. **Le fond et la peau ont un avant/après jugé par Pierre**, mesuré au
   banc de comparaison (celui d'IT-1, déjà en service) — adopté ou rejeté
   par un chiffre, jamais par une impression.
2. **Un candidat détecteur est chiffré sur le corpus du 08/09** — faux
   positifs et faux négatifs comptés sur les 53 mains jugeables, comparés
   aux 30 % de rappel de `hands` v1. Un candidat qui ne fait pas mieux
   est refermé par écrit, comme la piste géométrique et Florence-2.
3. **Le coût par image est mesuré**, pas estimé. Souvenir de Florence-2 :
   9,5 s par crop, ~19 s par image — un juge trop lent ne rentre pas dans
   la boucle de production, quelle que soit sa justesse.

## Ce que cette phase ne tranchera pas

L'architecture du juge — custom node ComfyUI ou processus Python séparé —
n'est pas décidée ici. Aucun nœud ComfyUI n'existe pour HADM ; ADR-0024
tient ComfyUI pour un processus séparé auquel on ne parle qu'en HTTP, et
ADR-0008 garde cv2 hors du venv de dev. Le choix se fera au premier
candidat retenu, avec son entrée au manifeste dans le même commit
(invariant 12).
