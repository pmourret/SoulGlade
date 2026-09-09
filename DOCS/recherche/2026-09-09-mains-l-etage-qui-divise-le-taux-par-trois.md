# Les mains : le premier levier de la phase qui déplace vraiment un taux

Étape 3 et dernière du front 1 d'IT-3b
(`DOCS/cadrage/2026-09-08-phase-rd-juge-generaliste.md`), après le fond
(`2026-09-09-fond-le-prompt-n-est-pas-le-levier.md`) et la peau
(`2026-09-09-peau-le-troc-identite-texture.md`). Les deux premières se
sont fermées sur un renoncement et un demi-gain. Celle-ci non.

**96,4 % de mains ratées sans l'étage, 36,4 % avec.** Sur 29 seeds
appariés, la variante fait mieux sur 22 et **pire sur aucun**.

## Ce qui a été mesuré

Étage `HANDDETAILER` (groupe 14 du graphe Flux) : un
`UltralyticsDetectorProvider` sur `hand_yolov8s` et un Detailer Impact,
copie exacte du groupe 08 `FACEDETAILER` avec le détecteur de mains au
lieu du visage, denoise 0.5. Inconditionnel — il s'applique à toutes les
images sans rien juger, ce qui est précisément ce qui le range dans le
rendu et non dans les correcteurs (cadrage amendé le 09/09).

Scène `cuisine_matin`, 30 seeds rejoués à l'identique, deux mains par
image : 120 mains jugées une par une par Pierre sur planche de crops.

## Le protocole, et pourquoi il n'est pas une mesure

`mains` (taux de détection DWPose) a été chiffré à 25 % de rappel sur le
corpus du 08/09 : il ne peut pas rendre le verdict. Ce banc en donne une
**seconde démonstration indépendante, sur un cas où la vérité est
connue** : il rend **1.000 des deux côtés, delta +0.000, verdict
« stable »**, pendant que l'œil compte 96 % contre 36 %. L'instrument est
aveugle à l'effet le plus grossier que la phase ait produit.

Ce qui reste vrai de DWPose, c'est qu'il **localise** très bien. La
planche s'en sert pour ça et pour rien d'autre : découper les mains, les
numéroter, laisser l'œil juger. Le résultat est un **taux**, pas une
préférence entre deux images.

Le « na » (non jugeable) est structurel, pas du confort : c'est ce qui
rend ce taux comparable aux 75 % du corpus, qui comptait 40 ratées sur
53 *jugeables*. Sans lui une main hors cadre passerait pour réussie.

## Résultats

| | jugeables | ratées | na | taux | ± |
|---|---|---|---|---|---|
| référence | 56 | 54 | 4 | **96,4 %** | 2,5 % |
| `handdetailer` | 55 | 20 | 5 | **36,4 %** | 6,5 % |

Écart −60,1 points, erreur-type 6,9 → **8,7 σ**.

**Apparié par seed** — le test qui compte, puisque les seeds sont rejoués
à l'identique : sur 29 seeds comparables, **22 meilleurs, 0 pire, 7
identiques**. Un effet de hasard donnerait ~50/50. C'est le seul résultat
de la phase R&D qui n'ait besoin d'aucune précaution de lecture.

**Ce que l'étage ne coûte pas.** Les cinq autres genres du banc sont
stables à n=30 : identité +0.000, netteté −1,3 (dans son bruit), texture
de visage +0.000, fond net +0.002, bruit de fond +0.000. Contrairement à
la peau, il n'y a pas de troc ici — rien n'est échangé contre autre chose.

**Ce que l'étage coûte, mesuré et pas estimé** (3 seeds, même scène) :
médiane **68,2 s → 102,6 s par image, soit +34,4 s**. La moitié du temps
de production en plus.

## Ce qui casse encore, et où

Les 20 mains encore ratées ne sont pas un résidu au hasard. Sur 20
raisons écrites, le **pouce est nommé 8 fois** et un **doigt
supplémentaire 7 fois** :

- pouce trop long (4), mauvaise anatomie du pouce (2), doigt
  supplémentaire qui est un pouce (2) ;
- doigt supplémentaire ailleurs (3 + auriculaire, index) ;
- deux cas hors anatomie : « bonne anatomie, mauvais placement » et
  « main fusionnée à la tasse » — l'étage redessine la main, il ne
  décide pas d'où elle est.

Le pouce est le doigt le plus souvent au bord de la boîte du détecteur.
C'est une piste pour la suite (`bbox_crop_factor`), pas une conclusion :
rien ne l'a mesurée.

## Précautions de lecture

**La référence à 96,4 % n'est pas comparable aux 75,5 % du corpus du
08/09.** La scène a été choisie *comme le pire cas* : deux mains qui
saisissent un objet, grandes dans le cadre. Le corpus mélangeait des
scènes où la main est souvent petite ou incidente. On ne mesure donc pas
« la production de Léna » mais le cas le plus dur qu'elle produise —
choix délibéré, et qui joue plutôt en faveur du chiffre : sur une
production ordinaire, l'étage devrait faire au moins aussi bien.

**Un seul personnage, un seul pack, une seule scène.** Le graphe SDXL
d'Abyssiaelle n'a pas ce groupe et n'est pas touché ; un autre
personnage mesurera le sien, comme partout ailleurs dans ce dépôt.

**Le denoise n'est pas mesuré.** 0.5 est une valeur de départ posée à la
main, pas un réglage trouvé. L'axe `handdetailer_denoise` existe pour
poser la question ; ne pas la poser reviendrait à juger un étage sur son
seul réglage livré, la faute d'IT-2.

## Incident, et pourquoi il ne fausse rien

Le poste s'est mis en veille pendant le banc, à 18 images sur 60. Le
processus a **repris tout seul au réveil** et est allé au bout, en
parallèle de la reprise lancée à la main : 60 fichiers pour 30 seeds sur
la variante.

Vérifié plutôt que supposé : les 60 fichiers se groupent en **30 paires
d'octets identiques** (md5) — le pipeline est bit à bit reproductible à
seed égal, donc savoir lequel des deux jumeaux a été jugé n'a aucune
importance. Et les 30 fichiers de chaque planche sont 30 images
distinctes. La mesure porte bien sur 30 seeds appariés.

Trois corrections en sont sorties, toutes committées : la reprise d'un
banc interrompu (`run_bench(bench_id=...)`, avec refus si les seeds
fournies ne sont pas celles du run), la planche qui prend sa liste
d'images **dans la base** et non dans le dossier, et — la veille au
matin, avant tout ça — l'appariement par seed dans `verdict_bench`, sans
lequel une référence à 29 seeds et une variante à 30 auraient été
comparées en croix.

## Ce qui n'est pas tranché ici

**L'adoption.** Le gain est massif et ne coûte rien de mesurable, sauf
34 secondes par image. Temps contre qualité n'a pas de bonne réponse
objective : c'est un arbitrage de production, il revient à Pierre
(`PROJET.md` — la plateforme ne tranche pas à sa place). Le gabarit du
pack reste inchangé dans tous les cas : c'est un réglage de personnage
(invariant 4).
