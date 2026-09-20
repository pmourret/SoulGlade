# NSFW : le corps n'est pas l'accusé

Sonde menée le 2026-09-20 à l'ouverture d'IT-3e, avant toute ligne de
code, sur la base `PROD/soulglade.db` telle qu'elle est. Aucune image
produite, aucun modèle chargé : quatre requêtes sur des mesures et des
étiquettes qui existaient déjà.

Question posée par le cadrage du 10/09 : le corps n'a aucun instrument,
et c'est « probablement l'explication des 77 % ». **Les étiquettes que
Pierre a lui-même posées disent le contraire.**

## Ce que la base contient

26 images NSFW jugées, 66 côté SFW. Les deux corpus couvrent la même
période (23/08 au 08/09), donc l'écart de jugement n'est pas un artefact
de calendrier : sur le seul mois d'août, 18 « ia » sur 24 côté NSFW
(75 %) contre 23 sur 48 côté SFW (48 %). **L'écart est réel.**

Les 26 images NSFW sont toutes à l'intensité 3 avec une source : toutes
viennent de la voie d'édition, aucune d'une scène native.

## Aucune mesure existante ne sépare, côté NSFW

AUC de « ok » contre « ia », 6 images contre 20 :

| genre | n ok | méd. ok | n ia | méd. ia | AUC |
|---|---|---|---|---|---|
| `nettete` | 6 | 163,7 | 20 | 142,6 | 0,62 |
| `texture_visage` | 6 | 4,767 | 20 | 4,787 | **0,50** |
| `bruit_fond` | 6 | 2,034 | 20 | 1,430 | 0,66 |
| `identite` | 6 | 0,782 | 20 | 0,768 | 0,72 |
| `identite_centroide` | 6 | 0,939 | 19 | 0,931 | 0,68 |

À six images d'un côté, rien ici n'est exploitable : l'erreur-type d'une
AUC à 6 contre 20 est de l'ordre de 0,14, donc même 0,72 ne se distingue
pas du hasard. Le constat solide est l'autre : **`texture_visage` est à
0,50, exactement le hasard**, et sa médiane NSFW (4,787) est *plus haute*
que la médiane SFW (4,598). Le « fait IA » du NSFW n'est pas un
phénomène de texture de visage.

## Le point dur : l'axe anatomie est déjà étiqueté, et il est vide

Croisement du flag et des deux axes d'étiquettes, côté NSFW :

| flag | mains | anatomie | n |
|---|---|---|---|
| ia | ko | ok | 7 |
| ia | na | ok | 11 |
| ia | ok | ok | 1 |
| ia | — | — | 1 |
| ok | na | ok | 5 |
| ok | na | na | 1 |

**Anatomie : 24 « ok », 1 « na », zéro « ko ».** Le corps, au sens des
proportions, est jugé correct sur la totalité du corpus NSFW jugeable.
C'est le même mur que le corpus du 08/09 avait rencontré côté SFW — 1 cas
sur 92 jugeables — et il est ici plus net encore, à 0 sur 25.

Conséquence directe, et c'est ce qui change l'ordre d'IT-3e : **une
mesure de proportions du corps n'a rien à séparer sur ce corpus.** Un
seuil ne se calibre pas sur zéro positif, exactement la raison qui a
fait passer les proportions en R&D le 08/09 plutôt qu'en renoncement.

## Ce que les étiquettes expliquent, et ce qu'elles laissent

Sur les 20 images NSFW marquées « ia » :

- **7 ont une main cassée**, et les 7 sont « ia ». Côté NSFW la
  correspondance est parfaite ; côté SFW elle ne l'est pas, 6 images à
  main cassée y sont quand même jugées convaincantes. Petit n des deux
  côtés, à ne pas surinterpréter.
- **1 a une main jugée correcte** et reste « ia ».
- **11 n'ont aucun défaut étiqueté** : main non jugeable, anatomie « ok ».

Soit **plus de la moitié des images NSFW rejetées à l'œil ne portent
aucun défaut que le vocabulaire actuel sache nommer.** Ni anatomie, ni
mains, ni texture de visage. C'est ça, le trou — pas le corps.

À noter aussi : `mains` (le taux de détection DWPose, pas un jugement) a
une médiane de 0,690 côté NSFW contre 1,000 côté SFW. DWPose trouve moins
de points de main sur le NSFW. C'est un fait de détection, pas de
qualité — la v1 a 70 % de faux négatifs, mesurés le 08/09.

## Ce que ça ferme, ce que ça laisse ouvert

**Fermé, sauf corpus neuf** : la mesure des proportions du corps comme
explication des 77 %. Zéro positif à séparer.

**Toujours ouvert, et c'est le seul candidat que cette sonde n'écarte
pas** : la **texture de peau du corps**. `texture_visage` ne regarde que
le visage, aucune étiquette ne porte sur la peau du corps, et
l'estimateur existe déjà — la médiane de l'écart-type local 7×7 de
`qc_realisme._ecart_type_local`, appliquée à un autre cadre. Rien ne dit
aujourd'hui qu'elle sépare : rien ne l'a mesurée.

**Le préalable à cette mesure n'est pas du code, c'est du vocabulaire.**
Les 11 images « ia » sans défaut nommé sont le corpus d'apprentissage de
la question elle-même : tant que « ia » ne se décompose pas, une mesure
de plus se validerait contre une cible qu'on ne sait pas définir, et le
précédent du flou de fond dit ce que ça coûte — livré, mesuré le
lendemain, reverté.

## Reproduire

Quatre requêtes sur `PROD/soulglade.db`, jointure `image` × `jugement` ×
`score`, groupées par `espace`, `flag`, `anatomie` et `mains_juge`. AUC
calculée comme la proportion de paires (ok, ia) où l'« ok » score plus
haut, demi-point aux égalités. Aucun script conservé : la base porte
tout, les requêtes tiennent en quatre lignes chacune.
