# Présets kohya_ss, vendorés

## Ce que c'est

`flux1.json` est le préset officiel de kohya_ss pour un LoRA Flux, copié
**verbatim** depuis le dépôt amont :

    bmaltais/kohya_ss — presets/lora/flux1D - adamw8bit fp8.json
    relevé le 2026-09-10

Rien n'y a été modifié, et c'est le point : il fait référence. Ce que
`entrainement.py --exporter` produit n'est pas une recette maison, c'est ce
fichier avec les seules valeurs que le jeu de données détermine réellement,
écrites par-dessus (`kohya_config.json` dans le dossier d'export).

## Pourquoi vendoré plutôt que référencé

L'export doit pouvoir se fabriquer sans réseau, et un préset qui bouge en
amont changerait un entraînement passé sans qu'on le sache. Un LoRA se
compare à un autre par ce qui les sépare : la référence doit être figée avec
la date de son relevé.

## Ce qui reste à remplir sur la machine d'entraînement

Quatre chemins, laissés tels quels avec le texte d'origine, parce qu'ils
dépendent de la machine et de rien d'autre :

- `pretrained_model_name_or_path` — flux1-dev
- `clip_l`
- `t5xxl` — la version fp16
- `ae`

## Ce qui n'existe pas ici, et pourquoi

**Aucun préset SDXL.** Le dépôt amont en propose plusieurs, mais aucun ne
fait autorité comme celui-ci le fait pour Flux, et en choisir un serait un
arbitrage déguisé en donnée. Un export de la famille `sdxl` sort donc avec
`dataset.toml` et `entrainer.sh`, sans `kohya_config.json` — même règle que
pour une famille inconnue : pas de recette plutôt qu'une fausse.

## Le garde-fou

`test_file_entrainement.py` vérifie que les valeurs partagées entre ce préset
et `RECETTES["flux"]` (dimension et alpha du réseau, taux d'apprentissage,
optimiseur, échantillonnage des pas) sont **les mêmes**. Sans lui, le dossier
d'export porterait deux recettes qui n'entraînent pas la même chose :
`entrainer.sh` d'un côté, `kohya_config.json` de l'autre.
