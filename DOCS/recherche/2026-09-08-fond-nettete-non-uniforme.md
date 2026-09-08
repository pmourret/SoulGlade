# Le fond : le flou est décidé par la scène, pas par le pipeline

Front 1 d'IT-3b (`DOCS/cadrage/2026-09-08-phase-rd-juge-generaliste.md`),
premier pas : *le fond*. Mesuré le 2026-09-08 sur le corpus étiqueté du
même jour, **sans produire une seule image** — les 92 étiquettes `flag`
(41 « convaincante comme photo » / 51 « ça se voit que c'est généré »)
étaient déjà en base et n'avaient jamais été croisées avec les mesures.

Trois résultats, dont un qui corrige les deux autres.

## 1. Les trois mesures existantes, chiffrées contre le regard

Le doc du corpus comparait la production à un corpus de vraies photos.
Personne n'avait comparé, **à l'intérieur de la production**, les images
jugées convaincantes à celles jugées générées. C'était gratuit : les
valeurs sont dans `PROD/mesures.json`.

AUC de Mann-Whitney, `ok` contre `ia`. 0.50 = l'indicateur ne sait rien.

| mesure | AUC | lecture |
|---|---|---|
| `texture_visage` | 0.544 | rien |
| `bruit_fond` | 0.536 | rien |
| `identite` | 0.437 | rien |
| `nettete` | 0.399 | rien, et **à l'envers** — les images jugées générées sont un peu plus nettes |

Les trois mesures de réalisme sont aveugles au jugement de leur auteur.
Ce n'était qu'une impression tirée d'une comparaison de médianes ; c'est
maintenant un chiffre par mesure. **Ce résultat-là tient sans réserve.**

## 2. L'hypothèse « uniformité » du cadrage : le sens est inversé

Le cadrage posait, d'après l'état de l'art : « ce que l'œil appelle effet
studio n'est pas la netteté moyenne mais son **uniformité** ». Testé par
la dispersion de la netteté sur des tuiles de 64 px (image ramenée à
1024), en quatre formulations de la même quantité.

Le sens est l'inverse de celui prédit : dans la production, les images
jugées convaincantes sont celles dont la netteté est la **plus**
uniforme. Retenue sous le nom `fond_net` — part du cadre qui n'est pas
franchement plus molle que le reste, seuil relatif au p90 de l'image
elle-même — écrite dans le sens haut = mieux, comme les trois autres
genres.

AUC brute `ok` > `ia` : **0.637** (n=41/49). Meilleure que les trois
existantes. Et c'est là que ça se gâte.

## 3. Le contrôle qui ramène ce chiffre à presque rien

Deux contre-épreuves, dans l'ordre où elles ont été faites.

**Le cadrage (serré / large) n'explique pas le signal.** `fond_net` ne
distingue le régime de cadrage qu'à AUC 0.557, et la séparation `ok`/`ia`
survit à la stratification (0.667 sur les plans larges, 0.610 sur les
portraits). Piste écartée.

**La scène, elle, explique presque tout.** Décomposition de la variance
de `fond_net` sur les 13 scènes ayant au moins 3 images (76 images) :

| | variance |
|---|---|
| inter-scène (entre moyennes de scènes) | 0.0511 |
| intra-scène (moyenne des variances) | 0.0213 |
| **part expliquée par la scène** | **71 %** |

Et les écarts entre scènes sont énormes, avec des plages internes
serrées : `exploration_camp_soir` 0.271, `portrait_etude` 0.311,
`lifestyle_cafe_terrasse` 0.430 — contre `sport_course` 0.908
(0.89-0.93), `voyage_ruelle_ville` 0.969 (0.96-0.97),
`intime_lit_reveil_agite` 0.977 (0.95-1.00).

Donc : **AUC stratifiée par scène = 0.579** (89 paires `ok`/`ia` issues
de 12 scènes comparables), contre 0.637 en brut. La moitié du signal
apparent était la composition du corpus en scènes, pas le flou.

Contre-épreuve secondaire, cohérente : les 6 vraies photos du corpus de
référence ont une médiane `fond_net` de 0.451 — du côté des images
jugées générées (0.453), pas des convaincantes (0.651). Une vraie photo a
de la profondeur de champ et ça ne la trahit pas.

### Verdict sur `fond_net`

**Ce n'est pas un indicateur de réalisme, et ça ne le deviendra pas.**
À scène fixée elle ne sait presque rien (0.58), et les vraies photos
tombent du mauvais côté. ADR-0025 tient sans amendement : elle est
informative, elle ne trie pas, et il n'y a même pas lieu d'y revenir.

**C'est un bon instrument de mesure du flou**, et c'est à ce titre
qu'elle est gardée : d'une image à l'autre d'une même scène elle bouge
très peu (0.89-0.93, 0.96-0.97, 0.95-1.00). C'est donc exactement
l'instrument qu'il faut pour l'avant/après du front 1 — mesurer un
changement de flou, pas juger une image.

## 4. Ce que ça décide pour la suite du front 1

**Le flou est décidé par la scène, pas par le pipeline ni par la seed.**
71 % de la variance vient de la scène ; il ne reste au mieux 29 % à
partager entre le tirage et tous les réglages du graphe. Un banc sur
`refiner`, `steps`, `sampler` ou `upscale_2k` ne peut donc pas régler le
fond, quel que soit son verdict.

L'intuition de Pierre le 08/09 — « retirer le flou de focus du créateur
de scène » — désigne le bon endroit, mais **pas le bon mécanisme**. Le
vocabulaire explicite de flou ne pèse que 2 champs de texte sur 259 dans
`WORLDS/` (`slow-life.json` : « blurred street behind », « out of focus
»), et `compose.py` n'en portait aucune règle. Ce qui produit le flou,
c'est la **profondeur mise en scène** : une terrasse de café, un camp au
soir, un atelier avec un fond lointain appellent un défocus que le modèle
rend de lui-même, sans qu'on le lui demande.

### Et ce n'est pas un défaut

Tranché par Pierre le 08/09, en relisant ce qui précède : **un fond flou
est un choix créatif, pas un raté mécanique.** Un créateur peut le
vouloir, un autre non. Il tombe donc du côté que `PROJET.md` réserve à
l'utilisateur — la plateforme ne l'arbitre pas, et l'amendement du 07/09
(la plateforme trie les défauts objectifs elle-même) ne le couvre pas :
une main à six doigts n'a pas d'alternative défendable, un fond flou si.

Conséquence immédiate : la première rédaction de cette note concluait
qu'il fallait retirer le flou — règle dans le prompt système de
`compose.py`, réécriture des deux scènes concernées. **Les deux ont été
annulées le jour même** : elles supprimaient la capacité au lieu de la
rendre choisissable. Le flou devient une propriété de scène, activable
dans l'éditeur — voir `DOCS/cadrage/2026-09-08-flou-de-fond-choix-de-scene.md`.

## Ce que ça change dans le code

Une clé de plus dans `qc_realisme.mesure()`, qui se propage seule vers
`PROD/mesures.json`, la base (`runner.sortie.ranger_mesures`) et le banc
(`reel` → `bench_enregistrer_score`) : toute comparaison de variantes
score désormais `fond_net` sans que `bench.py` change d'une ligne.
Vérifié sur le vrai chemin, pas seulement à la lecture. La marge du banc
pour ce genre tombe sur `_defaut` (0.05) ; `bench.measured` reste `false`
pour les deux personnages, comme avant.

Autotest dans `qc_realisme.py` (`python qc_realisme.py` sans argument,
avec le python de ComfyUI) : il vérifie surtout le **sens** de la mesure,
le seul défaut qui ferait lire silencieusement une dégradation comme un
gain au banc.

## Ce qui n'est pas fait

L'avant/après du fond. Cette note mesure l'existant et désigne le levier
(la scène) ; elle ne juge aucun changement. Il attend le réglage de
scène, puisque c'est lui qu'il s'agira de comparer — flou demandé contre
flou refusé, mêmes seeds.

Le banc, tel qu'il est, ne sait pas faire varier une propriété de scène —
ses axes sont des champs de `cfg` et de `job`. L'avant/après demandera
soit un axe de plus au banc, soit une comparaison à seeds identiques hors
banc. Non tranché ici ; c'est une question du cadrage du réglage.
