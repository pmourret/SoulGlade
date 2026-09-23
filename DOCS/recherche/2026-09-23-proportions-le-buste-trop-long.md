# Proportions : le buste trop long pour ses épaules

Sonde du 2026-09-23, sur le premier corpus du cran natif. Elle rouvre une
piste fermée le 08/09 : les proportions du corps étaient passées en R&D
« faute d'un seul positif à calibrer » (1 cas sur 92 côté SFW, 0 sur 25 côté
NSFW). **Pierre vient d'en étiqueter six.**

## Le corpus

30 images du cran natif produites le 23/09 (deux scènes, batchs
`20260923_090710` et `20260923_093636`), étiquetées par Pierre dans la
Galerie sur les trois axes.

| axe | valeurs |
|---|---|
| `anatomie` | **6 ko**, 10 ok, 13 na (hors champ) |
| `flag` (réalisme) | 19 ok, 11 ia |

C'est le premier corpus où l'axe anatomie sépare quelque chose.

## Ce que les six « ko » ont en commun, à l'œil

Le défaut est dans le **haut du corps**, jamais dans une jambe ou un membre
en trop : buste et cage thoracique trop étroits pour la tête, épaules qui
rétrécissent, jonction bras-épaule qui se dissout dans les cheveux, poitrine
asymétrique ou mal placée. Une image porte en plus deux mains fusionnées.

Ce n'est donc pas « la proportion générale du corps » que l'œil rejette,
c'est **l'épaule et le buste**.

## Aucune mesure existante ne les sépare

AUC sur `anatomie` (10 ok contre 6 ko, erreur-type ≈ 0,16) :

| mesure | AUC |
|---|---|
| texture du corps (boîte NudeNet) | 0,46 |
| exposition | 0,73 |
| identité | 0,66 |
| netteté | 0,63 |
| texture du visage | 0,62 |

Rien ne sort du bruit. La mesure qui verrait ce défaut n'existait pas.

## Les rapports DWPose, et le seul qui dise quelque chose

Points-clés pris par `qc_mains.extraire` — le graphe des mains, une seule
extraction, aucune dépendance nouvelle. Disposition OpenPose-18 : nez, cou,
épaules, hanches. Trois rapports sans échelle, puisqu'une image est un
recadrage de zoom inconnu.

| rapport | définition | anatomie ok | ko | AUC | n |
|---|---|---|---|---|---|
| `epaules_tete` | largeur d'épaules / (cou→nez) | 1,57 | 1,36 | 0,75 | 10 vs 6 |
| `hanches_epaules` | largeur de hanches / largeur d'épaules | 0,62 | 0,60 | 0,65 | 5 vs 4 |
| **`buste`** | **longueur cou→hanches / largeur d'épaules** | **1,13** | **1,66** | **0,15** | 5 vs 4 |

`buste` est celui qui parle : à 0,15, il sépare *à l'envers* de l'ordre
testé, c'est-à-dire que **les images rejetées ont un buste plus long pour
leurs épaules**. Les deux autres rapports disent la même chose d'une autre
manière — des épaules étroites pour la tête.

**L'étalon confirme, et c'est ce qui donne du poids à 4 images.** Les mêmes
rapports sur le corpus de réalisme (de vraies photographies) :

| image | `epaules_tete` | `buste` |
|---|---|---|
| `e123a_eavdue_135z` | 2,48 | 1,25 |
| `KI_b4a7ad85…` (référence de corps) | 1,51 | 1,46 |
| `OFM_00029_` | 1,45 | 1,37 |
| `OFM_00030_` | 2,04 | 1,18 |

Les vraies photographies tiennent dans **1,18 – 1,46**. Les images jugées
correctes sont à 1,13 de médiane, dans cette bande ou en dessous ; les
rejetées à 1,66, **au-dessus de tout l'étalon**. Le sens est le même des deux
côtés, ce qui est plus rare qu'une AUC.

## Ce que cette sonde ne dit pas

- **Quatre positifs.** Ce n'est pas un seuil, c'est une direction. Un seuil
  se calibrerait sur un corpus qui n'existe pas encore.
- **Le rapport dépend de la pose.** Un trois-quarts raccourcit la largeur
  d'épaules vue, donc allonge `buste` sans qu'aucune anatomie soit fausse.
  C'est le premier faux positif à chercher.
- **Il dépend du cadre.** Les hanches ne sont visibles que sur 9 images sur
  30 : la mesure se tait sur les deux tiers de la production, exactement
  comme la texture du corps, et pour la même raison (cadrage du 23/09).
- **`asym_epaules` est mort-né** : DWPose place le cou au milieu des deux
  épaules, donc les deux distances sont égales par construction. Le rapport
  valait 0,00 sur les 30 images. Retiré, pas interprété.

## Le format est le levier du cadre, pas le prompt (23/09)

Vingt images de plus, mêmes scènes, même cran, même prompt : seul le format
change. C'est le levier que le matin avait laissé non testé, après avoir
constaté qu'une mention « full body » dans le prompt ne décide pas du cadrage.

| format | n | hanches dans le champ | buste médian |
|---|---|---|---|
| 4:5 | 30 | 10 (33 %) | 1,15 |
| **2:3** | 10 | **7 (70 %)** | 1,63 |
| 9:16 | 10 | 6 (60 %) | 1,53 |

**Le format double le taux de hanches visibles là où le prompt ne l'avait pas
bougé.** Une mesure du corps a donc son format, comme une mesure d'identité a
sa distance : c'est une condition de production, pas un réglage d'instrument.
2:3 est retenu pour les séries à mesurer ; 9:16 ne fait pas mieux et cadre
plus serré en largeur.

### La mesure a un domaine de validité, et il se lit dans les mêmes points

Deux images de la nouvelle série sortent à `buste` = 4,94 et 6,33, contre une
bande de 0,82 à 1,83 partout ailleurs. Regardées : ce sont des **profils**.
De côté, la largeur d'épaules se projette presque à rien (`epaules_tete` 0,53
et 0,41 quand l'étalon vit entre 1,03 et 2,48), et le rapport explose sans
qu'aucune anatomie soit fausse.

C'est exactement le faux positif que cette fiche annonçait, et il est
détectable avec les points déjà en main : sous un `epaules_tete` d'environ
0,9, la pose est trop de profil pour que le buste veuille dire quelque chose.
La mesure doit donc avoir **trois états**, comme la garde de l'espace : non
jugeable, correct, suspect. Sur ces 50 images, la garde écarterait 6 vues.

Elle ne change rien aux chiffres ci-dessus — aucune image étiquetée avec
hanches visibles n'était de profil, l'AUC reste 0,85 avec ou sans elle. Elle
est justifiée par les deux aberrantes, pas par le corpus étiqueté.

## Suite

Le corpus, encore. Vingt images natives de plus, cadrées large pour que les
hanches soient dans le champ, et `buste` aura une vingtaine de positifs au
lieu de quatre. C'est à ce moment-là qu'un seuil se calibre, et pas avant —
la leçon du flou de fond (livré, mesuré le lendemain, reverté) vaut ici
aussi.

## Reproduire

Script jetable du 23/09 sous `python_embeded`. `qc_mains.extraire(path,
comfy_url)` rend les `people[]` de DWPose ; on garde la personne la plus
complète, puis les points 0 (nez), 1 (cou), 2 et 5 (épaules), 8 et 11
(hanches), chacun retenu au-dessus d'une confiance de 0,1. AUC : paires
(ok, ko), demi-point aux égalités.
