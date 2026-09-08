# État de l'art : détecter un défaut dans une image générée

Revue demandée le 2026-09-08 à l'ouverture de la phase R&D, pour répondre
à une question précise : **existe-t-il un juge généraliste, agnostique du
personnage et du pack, par lequel faire passer chaque image produite ?**

Ce que le corpus du même jour a établi et qui cadre la recherche : notre
mesure `hands` v1 a **30 % de rappel** sur 40 mains cassées étiquetées, et
les deux distributions (ok / cassé) sont superposées. La question n'est
donc pas « quel seuil » mais « quel autre instrument ».

Revue faite sur le web le 08/09. Ce qui suit distingue ce que j'ai
**vérifié** (page consultée) de ce que j'ai seulement **lu annoncé**.

## A — Détecter les défauts humains (mains, anatomie)

| # | Approche | Ce qu'elle rend | Disponibilité | Chiffres annoncés | Verdict pour nous |
|---|---|---|---|---|---|
| 1 | **`hands` v1** — keypoints DWPose (le nôtre) | score 0..1 par image | en production, informatif | **rappel 30 %, FP 15 %** (corpus du 08/09) | **clos** — l'information n'est pas dans le squelette |
| 2 | **ComfyUI-IsNiceParts / NiceHand** | booléen « main correcte » | nœud ComfyUI installable | aucun chiffre publié | **écarter** — même approche squelette que le n° 1, même plafond attendu |
| 3 | **HADM** — ViTDet + EVA-02, dataset HAD (37 554 images) | boîtes : 6 parties du corps (*local*) + 12 anomalies globales (membre en trop/manquant) | **poids et dataset publiés** (GitHub) | AP50 **43,3** local / **23,9** global | **candidat n° 1** — le seul téléchargeable qui vise exactement notre cible |
| 4 | **ViT-HD** — encodeur Qwen2-VL + tête MLP, dataset Distortion-5K (4 700 images) | **masque de segmentation** des zones déformées | annoncés « bientôt » sur GitHub, CC BY 4.0 — **non vérifié disponible** | F1 **0,899**, IoU **0,831** | **meilleur sur le papier**, à re-vérifier avant de miser dessus |
| 5 | **ArtifactLens** (fév. 2026) — VLM pré-entraîné + scaffolding (démonstrations contrefactuelles, optimisation d'instruction) | classification d'artefact par catégorie | **code non publié** ; les auteurs invitent à réimplémenter depuis l'article | SOTA sur 5 benchmarks d'artefacts humains | **le plus prometteur pour notre volume** — « quelques centaines d'exemples » suffisent, on en a 102 |
| 6 | **PAL4VST** (ICCV 2023) — segmentation d'artefacts perceptuels | masque d'artefacts, 10 tâches de synthèse | code publié | 10 168 images annotées au pixel | repli généraliste — pas spécifique à l'humain |
| 7 | **HandRefiner / HandCraft / 3D-mesh-guided** | **corrigent** la main par inpainting | code publié | — | hors sujet ici (correcteurs), mais à garder pour plus tard ; HandCraft classe malformé/non avec un simple YOLOv8 |

Ce que la ligne 5 change : ArtifactLens dit qu'un VLM pré-entraîné sait
déjà voir les artefacts, et qu'il faut **quelques centaines d'exemples**,
pas des dizaines de milliers. Notre échec Florence-2 du 07/09 est
cohérent avec ça — on avait posé la question au modèle sans scaffolding,
sans exemples, et sur un fine-tune de captioning. Le NO-GO portait sur
*cette façon de demander*, pas sur l'idée.

## B — Le « look IA » : fond et peau

Rien d'équivalent à un modèle prêt à l'emploi ici. Ce que la revue donne,
ce sont des **causes nommées** et des indicateurs calculables :

| Cause décrite | Ce qu'on peut en mesurer | Coût |
|---|---|---|
| Absence de bruit de capteur, d'aberration, d'artefacts de compression | présence/absence de bruit dépendant de la luminance | numpy |
| **« Spectral tail uplift »** — les modèles de diffusion laissent une signature dans la queue haute fréquence du spectre de puissance, absente des vraies photos | ratio d'énergie dans la queue du spectre | **numpy, aucun modèle** |
| « Tout est également net, également éclairé » — pas de gradient de profondeur | **variance** de la netteté dans l'image, rapport sujet/fond | numpy |
| Bokeh mou par défaut, fond neutre, éclairage sans accident | — (question de rendu, pas de mesure) | — |

C'est le point le plus utile de la revue pour nous, parce qu'il explique
une contradiction de nos propres chiffres : notre production est mesurée
**4× moins nette** que le corpus de référence (125,77 contre 519,65) et
l'œil dit pourtant « trop net ». Les deux sont vrais. Ce que l'œil
appelle « trop net » n'est pas la netteté moyenne, c'est son
**uniformité** — l'absence de zones franchement floues. Nos trois
indicateurs mesurent des moyennes ; aucun ne mesure une dispersion.

L'idée de Pierre du 08/09 — partir d'une image de référence et retirer le
flou de focus du créateur de scène — attaque exactement cette cause, du
côté du rendu plutôt que de la mesure.

## Ce que je n'ai pas vérifié

- La disponibilité réelle des poids ViT-HD (annoncés, pas constatés).
- Les licences précises de HADM et PAL4VST — à lire avant tout commit,
  ADR-0024 et le modèle de licence du projet en dépendent.
- L'existence d'un nœud ComfyUI pour HADM : **aucun trouvé**. Le brancher
  demandera soit un custom node (skill `comfyui-custom-nodes`), soit un
  appel Python hors ComfyUI — question d'architecture à trancher au
  cadrage, pas ici.
- Le coût d'inférence par image d'aucun des candidats : aucun article ne
  le publie. À mesurer nous-mêmes avant d'en mettre un dans la boucle de
  production (souvenir de Florence-2 : 9,5 s par crop, ~19 s par image).

## Sources

- [ArtifactLens: Hundreds of Labels Are Enough for Artifact Detection with VLMs (2602.09475)](https://arxiv.org/abs/2602.09475) · [page projet](https://jmhb0.github.io/ArtifactLens/) · [dépôt (code non publié)](https://github.com/jmhb0/ArtifactLens)
- [Evaluating and Predicting Distorted Human Body Parts for Generated Images — ViT-HD / Distortion-5K (2503.00811)](https://arxiv.org/html/2503.00811v1)
- [Detecting Human Artifacts from Text-to-Image Models — HAD / HADM (2411.13842)](https://arxiv.org/html/2411.13842v1) · [dépôt](https://github.com/wangkaihong/HADM)
- [Perceptual Artifacts Localization for Image Synthesis Tasks — PAL4VST (2310.05590)](https://arxiv.org/abs/2310.05590) · [dépôt](https://github.com/owenzlz/PAL4VST)
- [HandRefiner (2311.17957)](https://arxiv.org/html/2311.17957v2) · [HandCraft (2411.04332)](https://arxiv.org/html/2411.04332v1) · [3D Hand Mesh-Guided Refinement (2506.12680)](https://arxiv.org/abs/2506.12680)
- [BodyMetric: Evaluating the Realism of Human Bodies in Text-to-Image Generation (2412.04086)](https://arxiv.org/html/2412.04086)
- [NiceHand — ComfyUI-IsNiceParts](https://comfyai.run/documentation/NiceHand)
- [Why AI Images Look Fake: The Tells That Give Them Away (2026)](https://imagera.ai/blog/why-ai-images-get-flagged-2026) · [How to Make AI Images Look Real: 6 Camera Tells to Fix (2026)](https://imagera.ai/blog/make-ai-images-look-real-2026)
