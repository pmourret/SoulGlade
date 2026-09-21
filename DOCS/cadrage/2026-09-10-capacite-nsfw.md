# Ce que la partie NSFW est en capacité de faire

Cadrage ouvert le 2026-09-10, avant tout code, à la demande de Pierre : « il
faut que l'on travaille sur ce qu'est en capacité de faire la partie NSFW ».
Six points arbitrés par lui, plus un septième que l'inventaire a fait sortir.
Ce fichier fixe leur **articulation** — ce qui commande quoi — parce que trois
d'entre eux ne sont pas indépendants.

## L'état, mesuré et non supposé

Quatre paliers déclarés (`CHARACTERS/<cid>/creative.json`, clé `intensity`) :

```
0 sfw        produce   export=oui
1 soft       produce   export=oui
2 suggestif  produce   export=NON   requires=confirm
3 nsfw       edit      export=NON   requires=armed
```

Le palier 3 est une **composition** (ADR-0003) : image SFW déjà validée →
instruction d'édition → le verrou d'identité re-rend le visage depuis la base
gelée. Le graphe appartient au pack par la carte de capacités (ADR-0018) ;
`instagram-influenceur` déclare `edit`, `rpg-personnage` ne la déclare pas.
L'armement est un rituel explicite par personnage, off par défaut.

La mesure est **entièrement partagée** avec le SFW — l'invariant 9 tient dans
les faits, pas seulement sur le papier :

```
27 images NSFW en base, avec nettete / texture_visage / bruit_fond / identite
26 embeddings, 26 scores contre le gabarit
jugements humains : 20 « ia » contre 6 « ok »
étiquettes objectives : 7 mains ko sur les 10 jugées
identité moyenne : 0,757   (SFW : 0,739)
```

## Le nœud : deux chiffres qui se contredisent

**L'identité NSFW est meilleure que la SFW** — 0,757 contre 0,739. C'est
attendu : l'étage NSFW re-rend le visage depuis la base gelée, et le gain avait
été mesuré à +0,028 le 24/08.

**Le jugement humain est bien pire** — 77 % de « ia » contre 56 % en SFW, le
plus mauvais taux du dépôt.

Les deux sont vrais parce qu'ils ne mesurent pas la même chose. Et **aucun des
deux ne mesure le corps**, qui est précisément ce que le NSFW montre : toutes
les mesures du dépôt portent sur le **visage** (identité, texture_visage,
identité après expression) ou sur le **fond** (netteté, bruit). La seule
branche où le corps est le sujet est celle qui n'a aucun instrument pour lui.

C'est ce trou qui organise tout le reste.

## Les six points, et ce qui les relie

### 1. À quoi sert une image NSFW une fois produite

**Arbitrage de Pierre** : produire du contenu pour des plateformes tierces et
pour un usage personnel, selon les envies de l'utilisateur. Et alimenter
l'identité avec, **si les taux sont meilleurs**.

Cette condition n'est pas décidable aujourd'hui, pour la raison ci-dessus :
les taux se contredisent, et celui qui trancherait n'existe pas. **Le point 2
est donc le préalable du point 1**, pas un item à côté.

Deux obstacles concrets, de tailles très différentes :

- **Le gabarit ignore le NSFW.** `base.construire_jeu` filtre
  `i.espace = 'lena'` : 26 embeddings — les plus fidèles du corpus — sont
  exclus. Conséquence pour la suite : un LoRA d'identité entraîné aujourd'hui
  n'apprendrait **jamais le corps**, seulement des images habillées.
- **L'export NSFW est refusé en dur.** `api/services/journal.py`,
  `export_image` : `if ss.space_id(space) == "nsfw": return ""` — « the NSFW
  branch never exports ». Ce n'est pas un réglage, c'est une ligne. « Produire
  pour des plateformes tierces » demande donc une décision d'export : où vont
  ces fichiers, sous quel format, et comment ils restent séparés de l'export
  Meta que `PROJET.md` déclare incompatible avec le NSFW.

### 2. Mesurer le corps

**Arbitrage de Pierre** : une mesure supplémentaire sur le corps doit être
ajoutée — texture de peau, positionnement, mains.

C'est **l'instrument qui rend le point 1 décidable**, et probablement
l'explication des 77 %. Même leçon que le gabarit : régler le thermomètre avant
de prendre la température.

**Avertissement : ce chantier marche sur des cicatrices.** Deux des trois axes
cités ont déjà été essayés et refermés par écrit, sur les mains :

- le **signal géométrique** sur les keypoints DWPose — « l'information n'est
  pas dans les keypoints » (`DOCS/recherche/2026-09-07-signal-geometrique-mains.md`) ;
- le **juge pixel** Florence-2 — NO-GO, et 9,5 s par crop
  (`DOCS/recherche/2026-09-07-juge-pixel-mains-resultats.md`).

Ce n'est pas une raison de renoncer — le sujet change, c'est le **corps entier**
et non les mains seules, et `texture_visage` prouve qu'une statistique locale
sur une bbox donne un signal exploitable. Mais les deux fiches se relisent avant
d'ouvrir quoi que ce soit : rouvrir une piste close sans lire son verdict est la
perte de temps la plus fréquente.

### 3. Ne pas produire de nu involontaire en SFW

**Arbitrage de Pierre** : comportement à vérifier.

**Ce point et le point 6 sont la même décision, vue des deux côtés.**
Aujourd'hui l'accident est quasi impossible *parce que* rien n'est natif : le
checkpoint n'est jamais sollicité pour ça, et la garde-robe couvre le corps
palier par palier. Ouvrir la voie native ouvre mécaniquement la voie
accidentelle. On ne les décide jamais l'une sans l'autre.

### 4. Réparer les mains dans la voie d'édition

**Arbitrage de Pierre** : même mécanisme de réparation à reprendre.

Le graphe d'édition déclare `source, ref, ref_face, facedetailer, refiner,
grain, sharpen…` — **aucun rôle `handdetailer`**, alors que la production en a
un depuis le 09/09 (groupe 14). Et 7 des 10 mains jugées côté NSFW sont
cassées.

C'est le seul des six qui n'attend rien : un défaut, pas une fonctionnalité, et
indépendant de toutes les autres décisions.

### 5. Un seul personnage armé

**Arbitrage de Pierre** : cran NSFW désactivé pour Abyssiaelle pour le moment.
L'exploration se concentre sur Léna, en restant agnostique des modèles et des
nœuds — la théorie vient de Léna, l'appliquer aux autres suivra.

Ce n'est pas un chantier, c'est une **contrainte permanente**, et elle a une
conséquence à écrire : avec un seul personnage armé, tout ce qu'on mesure est
n = 1 personnage. **L'agnosticisme reste une discipline de conception, pas une
propriété vérifiée**, jusqu'à ce qu'un second personnage la mette à l'épreuve.

Concrètement : aucune mesure, aucun seuil, aucun vocabulaire issu de ce
chantier ne doit pouvoir s'écrire avec « lena » dedans. Les seuils vont dans
`config.json` par personnage (invariant 4), les capacités dans la carte du pack
(ADR-0018), et le code ne connaît ni l'un ni l'autre.

### 6. Le plafond de capacité

**Arbitrage de Pierre** : garder la possibilité de repartir d'une même scène,
mais construire une scène NSFW doit être également possible.

ADR-0003 est **amendé le même jour**. Ce qu'il avait écarté — « génération NSFW
native dans chaque outil » — il l'écarte toujours, et pour le même motif. Ce
qui est demandé est autre chose, et n'avait pas été considéré : un palier de
plus sur le pipeline `produce` **existant**, même `execute_jobs`, mêmes rôles,
même verrou, seuls la garde-robe et le `prompt_add` changent. L'invariant 9
tient.

**La vraie question n'est donc pas le pipeline, c'est le modèle.** Le
checkpoint Flux de Léna n'est pas fait pour ça ; le pack déclare déjà
`Qwen-Rapid-AIO-NSFW` pour la voie d'édition. Le palier natif demande-t-il ce
modèle, un LoRA, ou un troisième ? Non tranché, et c'est ce qu'il faudra
mesurer avant d'écrire une ligne de graphe.

### 7. Le point que la liste n'avait pas

L'export NSFW, décrit au point 1. Petit, concret, et bloquant pour « plateformes
tierces ».

## L'ordre

1. **Point 2 — la mesure du corps.** Sans elle le point 1 est indécidable et le
   point 6 se piloterait à l'aveugle. C'est aussi le seul à pouvoir commencer
   sans aucune décision d'architecture. Commence par relire les deux fiches
   de 2026-09-07.
2. **Point 4 — le `handdetailer` dans le graphe d'édition**, en parallèle.
   Indépendant, borné, et c'est une réparation.
3. **Points 6 + 3 ensemble**, ADR-0003 amendé d'abord (fait), puis la question
   du modèle **avant** celle du pipeline.
4. **Point 1** — devient décidable après le 2 ; l'export en est la part la plus
   petite.
5. **Point 5** — contrainte permanente sur tous les autres.

## Hors périmètre

- **Tout écran.** Le NSFW a déjà son armement sur l'écran Application ; ce
  chantier ne touche pas l'interface.
  **Rouvert le 2026-09-21** : le flux d'usage a son propre cadrage,
  `2026-09-21-flux-nsfw.md`. Cette exclusion ne vaut plus que pour ce
  fichier-ci.
- **La publication assistée par API**, reportée après V1 par `PROJET.md` pour
  des raisons qui n'ont pas bougé — maintenance des jetons tiers,
  incompatibilité Meta, responsabilité.
- **Le NSFW d'Abyssiaelle**, et toute généralisation à un second pack : point 5.
- **La retouche manuelle** (éditeur photo), qui est l'autre outil global de la
  composition et ne change pas.

## Critère de sortie

Ce cadrage se ferme quand les quatre questions ont une réponse **écrite**, pas
forcément un code :

- le corps a **une** mesure, avec ses faux positifs et faux négatifs comptés sur
  un corpus étiqueté (ADR-0025), ou un renoncement écrit comme les deux
  précédents ;
- la voie d'édition répare les mains, ou on sait pourquoi elle ne le peut pas ;
- le modèle de la voie native est nommé et mesuré, avec le revers du point 3
  tranché dans le même document ;
- la destination d'une image NSFW est décidée — export, identité, ou ni l'un ni
  l'autre — et le filtre `espace = 'lena'` de `construire_jeu` est aligné sur
  cette décision, dans un sens ou dans l'autre.
