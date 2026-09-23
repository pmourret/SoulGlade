# Mesurer le corps : ce qui est possible

Phase de recherche ouverte le 2026-09-21 sur la dernière dette d'IT-3e :
« le corps n'est mesuré nulle part » (E9). La DoD d'IT-3e demande une
mesure du corps dont les faux positifs et faux négatifs sont comptés sur un
corpus étiqueté (ADR-0025), ou un renoncement écrit.

Cette note part de deux documents qu'elle ne répète pas :
`2026-09-08-etat-de-l-art-detection-defauts.md` (la revue des détecteurs) et
`2026-09-20-nsfw-le-corps-n-est-pas-l-accuse.md` (la sonde sur les
étiquettes). Elle ajoute ce qui a bougé depuis, une sonde de plus, et un
ordre de travail.

## Le corpus, aujourd'hui

- 35 images en espace NSFW, toutes de Léna. 30 jugées, dont 27 avec un
  `flag` et un fichier sur le disque (7 « ok », 20 « ia »).
- **Une seule vient de la scène native** (cran 3, 21/09). Tout le reste vient
  de la voie d'édition : le corpus ne dit encore rien du corps que Flux
  génère nu, seulement de celui que Qwen repeint.
- Axe `anatomie` : **0 « ko » sur 25 jugeables** côté NSFW, 1 sur 92 côté SFW.
- 11 images NSFW « ia » n'ont **aucun défaut nommé** par le vocabulaire
  actuel.

Conséquence inchangée depuis le 20/09 : une mesure de *proportions* n'a rien
à séparer, et une mesure de *qualité* du corps n'a pas de cible tant que
« ia » ne se décompose pas.

## Ce qui existe, en trois familles

### A. Mesures de pixels sur un masque du corps (sans modèle neuf)

Tout est déjà sur la machine : `person_yolov8m-seg` et `face_yolov8m-seg`
(ultralytics, sous `models/ultralytics/segm`), SAM `vit_b`, et l'estimateur
de `qc_realisme`. Coût : quelques centaines de millisecondes par image.

**Sonde du 21/09 : la texture de peau du corps.** Masque personne moins
visage (dilaté), érodé, restreint aux pixels couleur peau (boîte YCrCb). On y
prend la médiane de l'écart-type local 7×7, le même estimateur que
`texture_visage`. Sur 90 des 92 images jugées :

| espace | n ok | méd. ok | n ia | méd. ia | AUC (ok > ia) |
|---|---|---|---|---|---|
| NSFW | 7 | 3,89 | 20 | 4,21 | 0,33 |
| SFW | 34 | 4,02 | 29 | 5,65 | 0,33 |
| tout | 41 | 4,02 | 49 | 4,90 | **0,36** |
| *`texture_visage`, tout* | 41 | 4,78 | 48 | 4,60 | *0,54* |

Deux faits, et une réserve qui pèse plus lourd que les deux :

- **Le signal existe, mais à l'envers de l'hypothèse.** On attendait une peau
  « trop lisse » ; ce sont les images « ia » qui portent *plus* de variance
  locale. Sur l'ensemble (41 contre 49, erreur-type ≈ 0,06), 0,36 sort du
  hasard d'environ deux erreurs-types. Côté NSFW seul (7 contre 20, erreur-type
  ≈ 0,13), rien n'est distinguable.
- `texture_visage` reste au hasard (0,54), comme le 20/09.
- **Réserve : le masque n'a pas été regardé.** La boîte couleur peau attrape
  aussi un vêtement beige, du bois ou un mur chaud. Les valeurs les plus hautes
  (8 à 9,6) sont toutes sur `cafe_terrasse`, une scène à fond texturé. La
  sonde mesure peut-être la scène plus que la peau. Avant d'en tirer quoi que
  ce soit, il faut superposer les masques aux images et les regarder.

### B. Détecteurs dédiés

| Candidat | Ce qu'il voit | État au 21/09 | Pour nous |
|---|---|---|---|
| **NudeNet v3** | 18 classes de boîtes : parties exposées ou couvertes (seins, fesses, sexe, ventre, aisselles, pieds, visage) | MIT, YOLOv8 en ONNX ; `onnxruntime` et `ultralytics` déjà présents | ne juge **pas la qualité**. Voir plus bas : c'est pourtant le seul qui ait une vérité gratuite |
| **HADM** (L et G) | boîtes d'artefacts humains : parties locales et anomalies globales (membre en trop ou manquant) | poids téléchargeables ; Detectron2 + EVA-02, installation pensée pour Linux/CUDA 11.6 ; licence non affichée | cible exacte sur le papier. Mais aucun positif chez nous (anatomie 0/25), jamais entraîné sur Flux, et une installation lourde sous `python_embeded` (torch 2.12, cu130) |
| **ViT-HD / Distortion-5K** | masque des zones déformées | article **retiré d'arXiv** ; jeu de données sur Hugging Face, poids incertains | écarté tant que les poids ne sont pas constatés |
| **BodyMetric** | score de réalisme du corps, avec a priori 3D (SMPL) et texte | publication du code non constatée | écarté |

### C. Un modèle vision-langage comme juge

Le VLM local est déjà branché (`llm_local.py`, Qwen3-VL-4B, sans rien de
plus à installer). L'état de l'art depuis le 08/09 :

- ArtifactLens : quelques centaines d'étiquettes suffisent si l'on bâtit un
  échafaudage autour du modèle. **Code toujours non publié.**
- SalArt-VQA (juin 2026, 20 VLM évalués) : rappel de détection jusqu'à 99 %,
  mais **53 % seulement** d'images où le modèle sait dire *quel* artefact et
  *où*. Les modèles sensibles inventent, les prudents ratent.

Pour un juge par image, c'est notre NO-GO Florence-2 du 07/09 sous une autre
forme. Pour **proposer du vocabulaire** à Pierre sur les 11 images sans
défaut nommé, c'est en revanche exactement le bon outil : le VLM propose,
l'œil tranche, et une erreur ne coûte rien.

## Ce que NudeNet change à la question

Toutes les autres pistes butent sur le même mur : pas de positifs étiquetés.
NudeNet est le seul instrument dont la vérité **existe déjà en base** :
chaque image porte son `espace` et son `intensite`, donc ce qu'elle *devrait*
montrer. Ça donne une mesure du corps dont les faux positifs et faux négatifs
se comptent sur les 124 images **sans une étiquette de plus** :

- une image SFW, ou d'un cran inférieur au cran natif, où NudeNet trouve une
  partie exposée. **C'est une fuite**, et elle est grave : cette image part
  vers l'arbre d'export qu'on synchronise avec une plateforme ;
- une image du cran natif où NudeNet ne trouve rien. **Le cran n'a pas
  rendu** : c'est la question « le LoRA à 0.4 suffit-il ? » posée à chaque
  image, et plus seulement au banc.

Ce n'est pas la question de la qualité (« ça se voit que c'est généré »).
C'est la question « pour qui », celle du titre même d'IT-3e : *le NSFW sait ce
qu'il produit, et pour qui*. Et c'est un défaut objectif au sens de l'ADR-0025,
pas un goût.

Ce qu'il faut vérifier avant d'y croire : son taux de rappel sur les 27 images
des crans natif et d'édition (censées montrer quelque chose ; les 5 du cran
suggestif rangées en NSFW sont justement le cas où l'on ne sait pas), et ses faux positifs
sur les 79 SFW (dont `intime_salle_bain_apres_douche`, le cas limite).

## Sonde NudeNet du 21/09

`nudenet` 3.4.2 installé dans `python_embeded` avec l'accord de Pierre. Aucune
version existante n'a bougé (`onnxruntime` 1.27, `opencv` 4.13, `numpy` 2.4).
Modèle `320n` livré avec le paquet, sur CPU. Les classes d'exposition sont les
seins, le sexe, les fesses et l'anus « exposed ». 108 images retrouvées sur le
disque sur 124 lignes. **0,04 s par image** : la mesure est gratuite.

Première lecture, contre l'attente déduite du cran :

| seuil | cran nu, rien trouvé | SFW, exposition trouvée |
|---|---|---|
| 0,3 | 9/26 | 2/79 |
| **0,4** | 10/26 | **1/79** |
| 0,6 | 13/26 | 1/79 |

**Les onze désaccords au seuil 0,3 ont tous été regardés, et NudeNet a raison
sur les onze** :

- **Les 9 « ratés » ne sont pas nus.** Ce sont des images du cran d'édition
  (l'ancien 4, et deux sans intensité) en lingerie, en caraco ou de dos. Le
  cran d'édition ne garantit pas la nudité : il garantit une édition. L'erreur
  était dans l'attente, pas dans la mesure.
- **L'image SFW à 0,84 est nue, et elle a le droit de l'être.**
  `KI_b4a7ad85…` est une image du **corpus de réalisme**
  (`INPUTS/REALISME/`, `role = reference`, dette E6) : un étalon de texture
  choisi à la main, qui n'appartient à aucun personnage, n'entre jamais dans
  la Revue et ne s'exporte pas. Sa colonne `espace` vaut `sfw` par défaut et
  ne veut rien dire pour une ligne de ce rôle. C'est **la règle d'attente qui
  est fausse**, pas la donnée : `role = reference` doit en sortir. (Deux
  copies du même fichier traînent par ailleurs sous `PROD/LENA/_NSFW/`, dont
  une « - Copie » : c'est un rangement à la main, sans conséquence.)
- **La seule vraie fausse alerte** est `cafe_terrasse_20260904_01` à 0,38 (un
  gilet beige). Elle disparaît au seuil 0,4.

Au seuil 0,4, sur les onze cas regardés : **zéro faux négatif, zéro fausse
alerte — et aucune fuite dans la production**. Le corpus de réalisme mis à
part, aucune image SFW ne montre quoi que ce soit : 77 sur 79 à zéro, la
78ᵉ sous le seuil, la 79ᵉ hors sujet par son rôle.

Ce qui n'est pas vérifié : les 97 accords n'ont pas été regardés. 17 images
détectées nues entre 0,55 et 0,85, et 77 SFW à zéro, c'est plausible, pas
constaté. La scène native n'a qu'une image (détectée) : on ne sait pas encore
à quel taux le cran natif rend.

Ce que ça établit :

1. **Le cran ne dit pas ce que l'image montre ; NudeNet, si.** Toute règle
   « ce cran doit montrer X » se déclarerait fausse sur 9 images sur 26. La
   mesure a de la valeur justement parce que l'attente se trompe.
2. **La garde de l'espace a une vérité sans étiquette** : une exposition
   au-dessus de 0,4 dans une image qui partirait vers l'arbre d'export SFW,
   c'est un défaut objectif, pas un goût (ADR-0025). Sur la production
   d'aujourd'hui elle ne trouverait rien, et c'est le bon résultat : une garde
   se juge sur ses fausses alertes tant qu'aucun incident n'est arrivé.
   Décidé le 23/09 : elle **signale en Revue**, elle ne bloque pas.
3. **Les classes « covered » n'ont pas été sondées.** Elles distingueraient
   peut-être la lingerie de l'habillé, donc le cran suggestif du cran 0.

## Ordre de travail proposé

1. ~~NudeNet en sonde~~ fait, voir ci-dessus. Les deux décisions préalables sont
   prises le 23/09 : la garde **signale en Revue** et ne bloque rien, et
   `nudenet` est **déclaré au manifeste** (section `python_packages`, une
   troisième sorte de dépendance à côté des nœuds et des modèles — elle servira
   à l'installeur unifié). Prochaine étape : cadrer la garde, dans la même
   chaîne que les autres mesures (invariant 9), jamais comme sous-système. Sa
   règle d'attente exclut `role = reference`.
2. **Vocabulaire des « ia » sans défaut**, avec le VLM local qui propose et
   Pierre qui tranche. Ce sont 11 images côté NSFW, plus les natives à venir.
   C'est le préalable à toute mesure de *qualité* du corps.
3. **Texture de peau du corps** : regarder d'abord les masques. Si le signal
   inversé survit à un masque propre (peau seulement, sans fond ni tissu), le
   remesurer sur les images natives quand il y en aura une vingtaine.
4. **HADM** : remis à plus tard. On ne le rouvre que si le vocabulaire fait
   apparaître des défauts de structure (membres, doigts du pied, jonctions),
   ce que l'axe anatomie dit absent aujourd'hui.

## Reproduire

Sonde de texture : script jetable du 21/09, sous `python_embeded` (celui qui
a `ultralytics` et `cv2`). Jointure `image` × `jugement` sur
`PROD/soulglade.db`, fichiers retrouvés par nom sous `PROD/`, `_normalise`,
`_gris` et `_ecart_type_local` de `qc_realisme`. Le masque est le suivant :
personne (conf. 0,35) moins visage dilaté 25 px, érodé 9 px, puis
Cr ∈ ]135, 180[ et Cb ∈ ]85, 135[. Si le masque garde moins de 2 000 pixels,
l'image est ignorée. AUC : paires (ok, ia), demi-point aux égalités.

Sonde NudeNet : `NudeDetector()` par défaut (320n), score retenu = maximum des
classes « exposed » par image. L'attente est « nu » pour l'espace NSFW au cran 3
ou 4 ou avec une source d'édition, « habillé » pour l'espace SFW, et
« inconnue » sinon. Les désaccords ont été regardés sur une planche.

## Sources

- [NudeNet (PyPI) — classes, licence MIT, modèles 320n/640m](https://pypi.org/project/nudenet/)
- [HADM — dépôt](https://github.com/wangkaihong/HADM) · [article 2411.13842](https://arxiv.org/abs/2411.13842)
- [ViT-HD / Distortion-5K — dépôt](https://github.com/TheRoadQaQ/Predicting-Distortion) · [article 2503.00811](https://arxiv.org/html/2503.00811v1)
- [BodyMetric (2412.04086)](https://arxiv.org/abs/2412.04086)
- [ArtifactLens — dépôt (code non publié)](https://github.com/jmhb0/ArtifactLens) · [article 2602.09475](https://arxiv.org/pdf/2602.09475)
- [SalArt-VQA (2606.12671)](https://arxiv.org/abs/2606.12671)
