# Juge pixel des mains : Florence-2 ne sépare pas non plus

Étape 0 de `DOCS/cadrage/2026-09-07-p4-3-juge-pixel-mains.md`, exécutée le
2026-09-07. Verdict demandé par le § 4.5 de ce cadrage : **NO-GO**.

La sonde précédente
(`DOCS/recherche/2026-09-07-signal-geometrique-mains.md`) avait fermé la
piste géométrique en montrant que l'information n'est pas dans les
keypoints DWPose, et désignait un juge qui regarde **les pixels** du crop
— Florence-2, déjà provisionné — comme la suite naturelle. Cette note
teste cette piste et la ferme à son tour : sur 42 crops de main issus de
27 images étiquetées, **aucune règle simple lue sur la sortie de
Florence-2 ne sépare les mains cassées des mains propres**.

L'intégration décrite au § 5 du cadrage (`qc_mains.juge_pixel`, capacité
`handsjudge`, tri automatique `OK -> A_REVOIR`) n'est donc **pas codée** —
c'est exactement la condition d'entrée posée par ADR-0025, et elle n'est
pas remplie.

## Protocole

**Architecture testée**, conforme au § 3 du cadrage : DWPose localise
(extraction déjà en place), un crop est découpé en Python autour des
keypoints de CHAQUE main évaluée, et c'est ce crop — pas l'image entière —
qui est soumis à Florence-2.

- **Graphe** : `WORKFLOWS/platform/hands_judge_ui.json` (créé pour cette
  étape) — `LoadImage` (« CROP MAIN ») -> `Florence2Run` ->
  `SaveText|pysssss` (« JUGEMENT MAIN (texte) »). Validé par
  `wf_check.py --roles` puis `--essai` : ComfyUI accepte le graphe et
  produit bien un texte.
- **Modèle** : `gokaygokay/Florence-2-Flux-Large`, `fp16` — le seul
  Florence-2 présent sur ce poste (`models/LLM/`).
- **Crop** : boîte englobante des points détectés de la main, plus le
  poignet du corps si le point 0 de la main manque, marge =
  `max(0.35 x diagonale, 40 px)` sur les quatre côtés, ramenée aux bords
  de l'image. Marge **vérifiée à l'œil sur 4 crops avant de mesurer quoi
  que ce soit** (§ 4.2 du cadrage) : main centrée, poignet visible, aucun
  doigt rogné — le cadrage n'est pas en cause dans le résultat ci-dessous.
- **Déterminisme** : `do_sample=false`. Un juge doit rendre le même
  verdict sur le même crop ; le défaut du nœud (`true`) rendrait la mesure
  non reproductible.
- **Corpus** : 27 images -> **42 crops de main évaluée**. 4 crops
  **mauvais** (les deux productions du 07/09 aux mains fondues, deux mains
  chacune) et 38 crops de contrôle issus d'images validées en `OK` ou dont
  la main n'était pas le motif de rejet. Le cadrage demandait au minimum
  2 mauvaises et 5 bonnes ; l'échantillon a été **étendu** plutôt que
  réduit, précisément pour chiffrer le taux de faux positifs qu'ADR-0025
  exige.

Point de contexte important : **les 12 crops du corpus initial sont tous
scorés 1.00 par la capacité `hands` v1**, mauvais compris. La v1 est
aveugle à ce défaut, ce qui est le point de départ de tout ce chantier.

## Mode 1 — `more_detailed_caption`

| # | image | main | étiquette | taux DWPose | aire crop | mots de main dans la caption |
|---|---|---|---|---|---|---|
| 1 | `intime_chambre_matin_20260907_01` | droite | **mauvaise** | 1.00 | 45 461 | **aucun** |
| 2 | `intime_chambre_matin_20260907_01` | gauche | **mauvaise** | 1.00 | 28 428 | **aucun** |
| 3 | `intime_chambre_matin_20260907_01_2` | droite | **mauvaise** | 1.00 | 145 734 | hand |
| 4 | `intime_chambre_matin_20260907_01_2` | gauche | **mauvaise** | 1.00 | 76 560 | **aucun** |
| 5 | `lifestyle_salon_lecture_20260824_01` | droite | ok | 1.00 | 106 496 | fingers, hand |
| 6 | `lifestyle_salon_lecture_20260824_01` | gauche | ok | 1.00 | 99 715 | fingers, hand |
| 7 | `selfie_miroir_entree_20260822_02` | droite | ok | 1.00 | 139 776 | **aucun** |
| 8 | `selfie_miroir_entree_20260822_02` | gauche | ok | 1.00 | 149 050 | finger, thumb |
| 9 | `selfie_miroir_entree_20260822_01` | gauche | ok | 1.00 | 654 075 | fingers, hand, palm |
| 10 | `nsfw_intime_lit_reveil_agite_20260826_01_2_20260826_021301` | droite | ok | 1.00 | 116 487 | finger, fingers, hand, thumb |
| 11 | `nsfw_intime_lit_reveil_agite_20260826_01_2_20260826_021301` | gauche | ok | 1.00 | 97 648 | fingers, hand, hands |
| 12 | `mode_chambre_soir_20260826_02_2` | droite | ok | 1.00 | 137 114 | fingers, hand, thumb |
| 13 | `intime_chambre_matin_20260824_01` | droite | ok | 0.10 | 4 418 | **aucun** |
| 14 | `intime_chambre_matin_20260824_01` | gauche | ok | 0.10 | 4 998 | **aucun** |
| 15 | `intime_chambre_matin_20260829_01` | droite | ok | 1.00 | 64 416 | hand |
| 16 | `intime_chambre_matin_20260829_01` | gauche | ok | 1.00 | 110 433 | finger, fingers, hand, thumb |
| 17 | `intime_lit_reveil_agite_20260825_01` | droite | ok | 1.00 | 22 386 | **aucun** |
| 18 | `intime_lit_reveil_agite_20260825_01` | gauche | ok | 1.00 | 47 385 | **aucun** |
| 19 | `intime_lit_reveil_agite_20260826_01` | droite | ok | 0.95 | 46 284 | **aucun** |
| 20 | `intime_lit_reveil_agite_20260826_01` | gauche | ok | 1.00 | 74 045 | finger, fingers, hand, thumb |
| 21 | `lifestyle_cafe_terrasse_20260827_01` | droite | ok | 1.00 | 140 160 | fingers, hand |
| 22 | `lifestyle_cafe_terrasse_20260827_01` | gauche | ok | 1.00 | 178 710 | fingers, hand |
| 23 | `lifestyle_cafe_terrasse_20260904_01` | gauche | ok | 0.38 | 12 006 | **aucun** |
| 24 | `lifestyle_cafe_terrasse_20260904_02` | droite | ok | 1.00 | 99 647 | fingers, hand, thumb |
| 25 | `lifestyle_cafe_terrasse_20260904_02` | gauche | ok | 1.00 | 29 714 | finger, fingers, hand, thumb |
| 26 | `lifestyle_cuisine_matin_20260822_01` | droite | ok | 1.00 | 41 480 | fingers, hand, thumb |
| 27 | `lifestyle_cuisine_matin_20260824_01` | droite | ok | 1.00 | 87 327 | finger, hand, thumb |
| 28 | `lifestyle_cuisine_matin_20260824_01` | gauche | ok | 0.10 | 4 550 | **aucun** |
| 29 | `lifestyle_soir_balcon_20260824_01` | droite | ok | 1.00 | 95 875 | **aucun** |
| 30 | `lifestyle_soir_balcon_20260824_01` | gauche | ok | 0.86 | 21 080 | **aucun** |
| 31 | `mode_chambre_soir_20260825_01` | gauche | ok | 0.14 | 8 214 | **aucun** |
| 32 | `mode_chambre_soir_20260826_02` | gauche | ok | 1.00 | 95 128 | **aucun** |
| 33 | `mode_detail_atelier_20260824_01` | droite | ok | 0.95 | 10 500 | **aucun** |
| 34 | `mode_detail_atelier_20260824_01` | gauche | ok | 1.00 | 16 616 | **aucun** |
| 35 | `mode_mode_tenue_jour_20260822_01` | droite | ok | 1.00 | 44 055 | fingers, hand, thumb |
| 36 | `mode_mode_tenue_jour_20260822_01` | gauche | ok | 1.00 | 29 646 | **aucun** |
| 37 | `selfie_miroir_entree_20260904_01` | droite | ok | 0.05 | 2 160 | **aucun** |
| 38 | `selfie_miroir_entree_20260904_01` | gauche | ok | 1.00 | 258 951 | finger, fingers, hand, thumb |
| 39 | `sport_tapis_20260822_01` | droite | ok | 0.14 | 7 590 | **aucun** |
| 40 | `sport_tapis_20260822_01` | gauche | ok | 0.19 | 8 100 | **aucun** |
| 41 | `sport_tapis_20260904_01` | droite | ok | 0.10 | 5 782 | **aucun** |
| 42 | `sport_tapis_20260904_01` | gauche | ok | 0.24 | 10 300 | **aucun** |

### Captions brutes des 4 crops mauvais

Reproduites intégralement : ce sont elles qui portent la conclusion.

**`intime_chambre_matin_20260907_01` / main droite** — DWPose 1.00

> The image is a close-up of a person's neck and upper body. The skin appears to be a reddish-brown color and has a textured surface. The texture is uneven and uneven, with some areas appearing darker and others lighter. The person's neck is slightly curved and the skin is slightly uneven. The background is blurred, but it seems to be an indoor setting with a white wall visible in the top left corner. The image is taken from a low angle, so the focus is on the neck and the skin. The overall mood of the image is somber and contemplative.

**`intime_chambre_matin_20260907_01` / main gauche** — DWPose 1.00

> The image is a close-up of a brown fabric with a textured surface. The fabric appears to be made of a soft, plush material and has a subtle sheen. The color of the fabric is a warm, earthy brown with a subtle pattern of small, evenly spaced stitches. The stitches are evenly spaced and run diagonally across the fabric, creating a uniform texture. The image is taken from a slightly angled perspective, looking down on the fabric. On the right side of the image, there is a light beige color, which contrasts nicely with the darker brown color. The texture of the fabric is smooth and uniform, with some areas appearing darker and others lighter. Overall, the image conveys a sense of depth and dimensionality.

**`intime_chambre_matin_20260907_01_2` / main droite** — DWPose 1.00

> The image is a close-up of a person's lower body, specifically their buttocks. The person is lying on a bed with white sheets, and their legs are slightly bent at the knees. The focus of the image is on the person's hand, which is resting on their lower back. The hand is positioned in a way that it appears to be touching their buttocks. The skin around the hand is a light brown color, and there is a pink line running across the bottom right corner of the image. The image is taken from a slightly elevated angle, looking down on the person and their buttocks.

**`intime_chambre_matin_20260907_01_2` / main gauche** — DWPose 1.00

> The image is a close-up of a person's foot resting on a white bedsheet. The foot appears to be bare, with no visible skin. The skin is a light brown color, and the toes are slightly curled. The bedsheet is crumpled and wrinkled, and there is a thin pink line running across the bottom of the foot. The image is taken from a low angle, looking up at the foot and the foot. The background is blurred, so the focus is on the foot and the bedsheet. The overall mood of the image is somber and contemplative.

Deux d'entre elles décrivent le crop comme un « cou », un « tissu brun »,
un « pied » — le modèle ne voit littéralement pas de main là où il y en a
une de cassée. La troisième (`..._01_2` / droite) décrit une main, avec
assurance, sans le moindre mot de doute : **c'est exactement l'angle mort
que la note précédente redoutait, déplacé d'un cran** et non supprimé.

### Règles de décision testées

Écrites **après** lecture des captions réelles, jamais devinées avant.
Positif = classé `CASSE` ; le résultat visé est 4 vrais positifs et 0 faux
positif.

| Règle | VP | FN | FP | VN | taux de faux positifs | verdict |
|---|---|---|---|---|---|---|
| R1 — aucun mot de main (`hand`, `finger`, `thumb`, `palm`, `knuckle`) dans la caption | 3 | 1 | 20 | 18 | **53 %** | échoue |
| R2 — aucune occurrence de `hand`/`hands` | 3 | 1 | 21 | 17 | **55 %** | échoue |
| R3 — un mot de doute (`blurry`, `distorted`, `deformed`, `unclear`…) présent | 0 | 4 | 5 | 33 | 13 % | échoue |
| R4 — caption plus courte qu'un seuil (400 / 500 / 600 / 700 car.) | 0-3 | 1-4 | 0-5 | — | — | échoue à tous les seuils |

Aucune ne sépare. La meilleure (R1) rate encore **une des quatre mains
cassées** et condamnerait **plus d'une main propre sur deux** — soit
nettement pire que les 33 % de faux positifs qui ont fait écarter la
mesure `hands` v1 dans ADR-0025.

R3 mérite d'être soulignée : Florence-2 n'emploie **jamais** un mot de
doute sur les 4 crops cassés, et en emploie un sur 5 crops propres. Le
vocabulaire d'incertitude du modèle est décorrélé de la qualité
anatomique — il décrit une bouillie de pixels avec la même assurance
qu'une main nette.

## Mode 2 — `caption_to_phrase_grounding`, `text_input="hand"`

Pilotée sur la sortie `data` (JSON) via `SomethingToString`
(`comfyui_essentials`, déjà provisionné) inséré dans l'API convertie pour
le seul temps de l'essai — le graphe committé reste sur le chemin
`caption`.

| # | image | main | étiquette | boîtes rendues | labels |
|---|---|---|---|---|---|
| 1 | `intime_chambre_matin_20260907_01` | droite | **mauvaise** | 1 | Hand |
| 2 | `intime_chambre_matin_20260907_01` | gauche | **mauvaise** | 1 | Hand |
| 3 | `intime_chambre_matin_20260907_01_2` | droite | **mauvaise** | 3 | Hand |
| 4 | `intime_chambre_matin_20260907_01_2` | gauche | **mauvaise** | 1 | Hand |
| 5 | `lifestyle_salon_lecture_20260824_01` | droite | ok | 4 | Hand |
| 6 | `lifestyle_salon_lecture_20260824_01` | gauche | ok | 1 | Hand |
| 7 | `selfie_miroir_entree_20260822_02` | droite | ok | 3 | Hand |
| 8 | `selfie_miroir_entree_20260822_02` | gauche | ok | 3 | Hand |
| 9 | `selfie_miroir_entree_20260822_01` | gauche | ok | 1 | Hand |
| 10 | `nsfw_intime_lit_reveil_agite_20260826_01_2_202` | droite | ok | 3 | Hand |
| 11 | `nsfw_intime_lit_reveil_agite_20260826_01_2_202` | gauche | ok | 4 | Hand |
| 12 | `mode_chambre_soir_20260826_02_2` | droite | ok | 2 | Hand |

**Zéro séparation, et pour une raison structurelle** : le grounding rend
une boîte pour la phrase qu'on lui donne, toujours. Les crops 1 et 2 sont
du flou de peau et de tissu — le mode captioning lui-même les décrit comme
« cou » et « tissu brun » — et le grounding y place quand même une boîte
`Hand` couvrant tout le crop. Le nombre de boîtes ne sépare pas non plus
(mauvaises : 1 à 3 ; propres : 1 à 4).

Cette piste de repli est donc fermée là aussi, et plus nettement que la
première : elle ne mesure pas la main, elle confirme la question posée.

## Ce que la mention « hand » suit réellement : la taille du crop

Le résultat le plus utile de cette sonde, pour qui serait tenté de
réessayer.

| | n | aire médiane du crop |
|---|---|---|
| crops dont la caption parle de main | 19 | **106 496 px** |
| crops dont la caption n'en parle pas | 23 | **16 616 px** |

Un facteur **6,4** entre les deux médianes. Le mot « hand » dans la
caption suit la **place que la main occupe dans le crop**, pas sa qualité
anatomique — une main petite ou partiellement coupée par le bord du cadre
est simplement absente de la description, quelle que soit sa qualité. La
confirmation la plus nette est dans les 4 crops mauvais : le seul qui
obtienne le mot « hand » est aussi **le plus grand des quatre**
(145 734 px contre 28 428 à 76 560 px).

Autrement dit, R1 ne mesure pas la main : elle mesure le cadrage. C'est ce
qui explique son taux de faux positifs de 53 % — la moitié du corpus de
contrôle est faite de mains petites ou coupées par le bord, pour des
raisons purement photographiques.

## Coût mesuré

42 soumissions, modèle déjà chargé (`keep_model_loaded=true`) :
**2.0 s à 14.1 s par crop, 9.5 s en moyenne**. Soit, à
l'échelle d'une image de production à deux mains évaluées, **~19 s
ajoutées par image** en plus de l'extraction DWPose déjà faite. Le premier
appel après démarrage de ComfyUI paie en plus le chargement du modèle.

Ce coût n'est pas la raison du NO-GO — il aurait été acceptable pour un
juge fiable. Il est noté parce qu'il rendrait le rapport bénéfice/coût
franchement mauvais pour un juge à 53 % de faux positifs.

## Verdict : NO-GO

Aucune règle simple ne sépare proprement, sur aucun des deux modes testés.
Conformément au § 4.5 du cadrage :

- l'intégration du § 5 n'est **pas** codée (`qc_mains.juge_pixel`,
  `_verdict_pixel`, capacité `handsjudge`, tri `OK -> A_REVOIR` dans
  `runner/sortie.py`) ;
- **aucun troisième mode de tâche Florence-2 n'est essayé** sans une
  décision explicite — même discipline que la fermeture de la piste
  géométrique ;
- la capacité `hands` reste **informative**, exactement comme ADR-0025 la
  laisse. Le comportement du runner ne change pas.

## Ce que cette note ne ferme PAS

À distinguer de la piste géométrique, qui était fermée pour une raison de
fond (l'information n'existe pas dans les keypoints). Ici l'information
**est** dans les pixels — c'est l'outil qui ne sait pas la lire. Trois
portes restent ouvertes, aucune instruite ici, aucune à ouvrir sans
décision explicite :

1. **Un autre Florence-2.** Le poids testé est `Florence-2-Flux-Large`, un
   fine-tune de captioning pour prompts Flux, pas un Florence-2 générique.
   Un `microsoft/Florence-2-large-ft` pourrait se comporter autrement.
   Argument contraire, à peser : le mode grounding, beaucoup moins
   dépendant du style de fine-tune, a échoué encore plus nettement —
   l'hypothèse « mauvais fine-tune » n'explique pas tout.
2. **Un VLM avec une vraie VQA ouverte.** Ce qu'on veut poser est « cette
   main a-t-elle un nombre et une disposition de doigts plausibles ? ».
   `Florence2Run` **n'a pas de mode VQA sur image naturelle** (`docvqa`
   est de la VQA de document). Un modèle qui accepte cette question
   (Qwen2-VL, InternVL, JoyCaption…) est un autre chantier : nouveau
   custom node, nouveau poids, nouvelle entrée de manifeste — à cadrer,
   pas à improviser.
3. **Un classifieur dédié.** Un petit modèle entraîné sur des crops de
   mains étiquetés. Le plus fiable, et de loin le plus lourd : il suppose
   un corpus étiqueté qui n'existe pas.

Rien de tout cela n'entre dans la phase 4 telle qu'elle est cadrée
aujourd'hui. Le constat honnête à la sortie de cette étape est que
**SoulGlade ne sait pas encore reconnaître une main cassée**, et qu'il
vaut mieux l'écrire que brancher un tri à 53 % de faux positifs.

## Reproduire

Le graphe `WORKFLOWS/platform/hands_judge_ui.json` est conservé : c'est
l'appareil de mesure de cette note, et le point de départ de toute reprise
de la piste. Les scripts d'exécution étaient jetables (répertoire de
scratch, non committés, § 4 du cadrage) ; la méthode est intégralement
décrite ci-dessus — extraction DWPose existante, `bbox_main` telle que
spécifiée au § 4.2 du cadrage, soumission du crop au graphe avec un nom
d'entrée unique par appel (cache d'exécution ComfyUI).
