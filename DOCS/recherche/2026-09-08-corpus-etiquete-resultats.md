# Le corpus étiqueté renverse les deux hypothèses de P4.5

Étape P4.5.1 du cadrage `2026-09-07-p4-5-proportions.md`, exécutée le
2026-09-08. C'est le premier corpus étiqueté à la main du projet, et la
première fois qu'une mesure de défaut est chiffrée contre un regard
plutôt que contre le tri.

Deux résultats, opposés :

- **les proportions du corps ne sont pas un défaut réel** — 1 cas sur 92
  images jugeables. Rien à calibrer ;
- **les mains le sont massivement** — 40 cas sur 53 jugeables, soit 75 %,
  dans une banque très majoritairement classée `OK`.

## Protocole

Étiquetage par Pierre dans la Revue, en plein cadre, sur les deux
personnages et les quatre dossiers de tri (SFW et NSFW). Deux axes
indépendants, trois valeurs chacun : `ok`, `ko`, `na` (non jugeable —
portrait serré, corps ou main hors champ). Les étiquettes vivent dans
`PROD/mesures.json` (champs `anatomie` et `mains_juge`).

Étiquetage fait **avant** tout score de proportions, et sans que l'axe
mains dispose d'un score sur la plupart des images : le regard n'a été
guidé par aucune mesure.

**Limite à garder en tête, valable dans les deux sens :** le corpus est
ce qui a *survécu* au tri. Pour les proportions, des images cassées ont
pu être supprimées depuis longtemps — les deux productions du 07/09 qui
ont ouvert P4.5 ne sont d'ailleurs plus sur le disque et ne sont pas
dans le corpus. Le 1/92 mesure donc le résidu, pas le taux de
génération. Pour les mains, la limite joue à l'inverse : les 40 cas ont
survécu au tri, c'est un plancher.

## Résultats de l'étiquetage

| Axe | étiquetées | ok | ko | na | jugeables |
|---|---|---|---|---|---|
| Proportions (`anatomie`) | 102 | 91 | **1** | 10 | 92 |
| Mains (`mains_juge`) | 102 | 13 | **40** | 49 | 53 |

Répartition par personnage — proportions : Léna 86/1/6, Abyssiaelle
5/0/4. Mains : Léna 12/39/42, Abyssiaelle 1/1/7.

Croisement : **39 images portent `proportions ok` et `mains ko`**. Le
corps est cohérent, les mains sont ratées. Une seule image est `ko` en
proportions, et elle est `na` en mains.

Le volume de `na` sur les mains (49 sur 102) confirme au passage la
conclusion de la sonde Florence-2 : sur la moitié de la banque, la main
est trop petite ou trop coupée par le cadre pour être jugée.

## `hands` v1 chiffrée contre le corpus

Score DWPose mesuré après coup sur les 53 images jugeables
(`qc_mains.mesure`, graphe `WORKFLOWS/utils/pose_extract_ui.json`,
ComfyUI local ; scripts jetables, méthode ci-dessus).

| étiquette | n | min | médiane | max | à 1.00 |
|---|---|---|---|---|---|
| ok | 13 | 0.10 | 1.00 | 1.00 | 11/13 |
| ko | 40 | 0.05 | 1.00 | 1.00 | **28/40** |

Les deux distributions sont **superposées**. Matrice de confusion, la
règle étant « score < seuil ⇒ CASSÉ » :

| seuil | VP | FN | FP | VN | taux FP | rappel |
|---|---|---|---|---|---|---|
| 0.20 | 7 | 33 | 1 | 12 | 8 % | 18 % |
| 0.50 | 10 | 30 | 1 | 12 | 8 % | 25 % |
| 0.70 | 10 | 30 | 2 | 11 | 15 % | 25 % |
| 0.90 | 11 | 29 | 2 | 11 | 15 % | 28 % |
| 1.00 | 12 | 28 | 2 | 11 | 15 % | **30 %** |

**Le vrai chiffre de `hands` v1 est 70 % de faux négatifs**, pas 33 % de
faux positifs. Même en condamnant tout ce qui n'est pas parfait, elle
rate plus des deux tiers des mains cassées.

### Ce que ça corrige dans ADR-0025

L'ADR écarte `hands` du tri automatique sur « 33 % de faux positifs sur
les 48 images validées ». Ce chiffre comparait la mesure au **tri de
Pierre** — et le corpus montre que ce tri laissait passer 75 % de mains
ratées. Une bonne part de ces « faux positifs » étaient des vrais
positifs.

**La décision de l'ADR ne change pas** — `hands` reste informative et ne
trie pas. Sa raison, si : ce n'est pas une mesure qui jette du bon
travail, c'est une mesure qui ne voit presque rien. La conséquence
pratique diffère, elle : un seuil plus permissif n'est pas la piste, et
le problème n'est pas non plus « trop de rejets ».

## Ce que ça ouvre

1. **Les mains sont le défaut n° 1 de la production**, mesuré et non
   supposé — et aucun des trois outils essayés ne les voit. Le corpus
   qui manquait à la porte n° 3 de
   `2026-09-07-juge-pixel-mains-resultats.md` (un classifieur entraîné
   sur des crops) existe désormais : 40 positifs, 13 négatifs, étiquetés
   par image. Une étiquette par main demanderait une repasse.
2. **Les proportions quittent la voie « mesurer et seuiller »** (décidé
   le 08/09) : un seuil ne se calibre pas sur un positif. La piste passe
   en R&D — chercher un signal, pas régler une valeur. Pas de
   renoncement écrit, le critère de sortie V1 n'est pas amendé.

## Ce que le corpus dit en passant sur le réalisme

Les jugements de réalisme accumulés sur la même banque : **41
« convaincante comme photo » contre 51 « ça se voit que c'est
généré »**. La majorité de la production ne passe pas pour une
photographie aux yeux de son auteur.

Les trois mesures de réalisme, elles, ne voient rien :

| | corpus de référence (n=6) | production (n≈110) |
|---|---|---|
| `texture_visage` | médiane 4.66 | médiane **4.60** |
| `nettete` | médiane 519.65 | médiane **125.77** |
| `bruit_fond` | médiane 1.33 | médiane 1.55 |

La texture de peau est indistinguable de celle de vraies photos selon la
mesure, alors que le constat d'usage est « trop lisse ». Et la
production est mesurée **quatre fois moins nette** que la référence :
ce que l'œil appelle « trop net, effet studio » n'est donc pas de la
netteté au sens du Laplacien — piste à instruire du côté de l'absence de
défauts optiques (bruit de capteur, aberration, accident d'éclairage,
fond trop propre) plutôt que du côté des trois indicateurs actuels.

Même schéma que les mains : l'instrument est d'accord avec lui-même et
en désaccord avec l'œil. Versé au tableau de bord en E5 (le rendu) et
E6 (la mesure qui ne le voit pas).
