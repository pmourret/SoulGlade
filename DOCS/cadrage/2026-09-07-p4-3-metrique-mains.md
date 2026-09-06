# P4.3 — Métrique de détection des mains cassées

Cadrage court avant code (règle 3, `PROJET.md`) pour la sous-question
laissée ouverte par le cadrage phase 4
(`DOCS/cadrage/2026-09-06-phase-4-qualite-workflows-mains.md`, § P4.3) et
par le mini-inventaire de P4.1
(`DOCS/recherche/2026-09-06-workflows-detail-visage-mains.md`) : quelle
métrique construire à partir des keypoints DWPose. Répond aux trois
questions posées, dans l'ordre.

## 1. Ce que DWPose fournit réellement

Vérifié dans le code installé (`comfyui_controlnet_aux`,
`node_wrappers/dwpose.py` + `src/custom_controlnet_aux/dwpose/`), pas
supposé depuis la doc générique du node.

Le node `DWPreprocessor` (déjà câblé dans
`WORKFLOWS/utils/pose_extract_ui.json`, `detect_hand=enable`,
`detect_body=enable`, `detect_face=disable`) a deux sorties : `IMAGE`
(squelette rendu) et `POSE_KEYPOINT` (une liste Python de dicts, un par
image du batch). Pour chaque image, `people[0]` porte
`hand_left_keypoints_2d` / `hand_right_keypoints_2d` /
`pose_keypoints_2d`.

Format exact de chaque champ `*_keypoints_2d` : une liste **plate** de
floats `[x1, y1, c1, x2, y2, c2, ...]`, 21 points par main (63 floats),
en **coordonnées pixel de l'image source** — le widget `resolution` du
node (1024 dans le graphe SoulGlade) ne redimensionne que le squelette
`IMAGE` rendu pour prévisualisation, jamais le repère des points. Une
main entièrement non détectée sérialise en `null` (pas un tableau de
zéros) ; `AUTOMATION/pose_render.py` (déjà dans le repo, consommateur
existant de ce même format) le confirme : `_points()` traite `None`,
liste absente et liste trop courte de façon identique.

**Point qui corrige le mini-inventaire de P4.1** : la note disait *« un
score de confiance par point (comme MediaPipe) »*. C'est inexact à ce
niveau de la chaîne. `wholebody.py` (`format_keypoint_part`) seuille
chaque point en interne à 0.3 et jette le score continu du modèle ;
`__init__.py` (`compress_keypoints`) ré-encode ensuite chaque point
survivant avec une confiance **codée en dur à 1.0**, et `[0.0, 0.0, 0.0]`
pour un point sous le seuil. Le troisième champ de chaque triplet
`[x, y, c]` n'est donc jamais une valeur graduée : c'est un booléen
détecté/non-détecté, avec un seuil de 0.3 déjà appliqué dans le node
vendorisé, non réglable depuis SoulGlade sans le patcher (hors
périmètre : ADR-0022 réserve les patches locaux à des bugs bloquants
réels, pas à ce chantier). Cette correction n'est pas reportée dans le
fichier P4.1 lui-même (hors périmètre du prompt qui a produit cette
note) — signalée ici pour que personne ne reparte de l'hypothèse
inverse.

## 2. Métrique retenue

**Score** : taux de keypoints détectés (`c > 0`) sur les 21 attendus,
calculé séparément pour chaque main, puis **score image = minimum des
mains évaluées**.

**Une main est évaluée seulement si son poignet est détecté** dans
`pose_keypoints_2d` (même appel DWPose, donnée déjà produite). Un
poignet non détecté signifie main hors-cadre ou occluse — cette main est
**exclue** du calcul, jamais comptée comme cassée. Si aucun poignet n'est
détecté (portrait cadré sur le visage, mains hors champ), score = `None`,
verdict `SANS_MAIN`.

**Pas de volet géométrique en v1** (distances inter-articulations,
doigts croisés) — décision prise, pas différée par défaut :

1. La piste « confiance DWPose > seuil » suggérée par le cadrage P4.3 se
   réduit de fait à « point détecté ou non » puisque la confiance n'est
   pas graduée (§1) — le taux de détection EST déjà cette mesure, pas un
   ingrédient à combiner avec autre chose.
2. Une règle géométrique inventée sans corpus de mains cassées labellisé
   reproduirait exactement ce que `AUTOMATION/qc_realisme.py` refuse
   explicitement de faire (son docstring : pas d'étalonnage honnête en
   dehors d'un jugement réel calibré) — un seuil géométrique deviné
   serait un seuil en dur déguisé.
3. Le gating par poignet couvre déjà le cas limite le plus fréquent
   (image sans main visible) avec une donnée qui existe déjà — le
   problème que la piste géométrique visait en partie est déjà résolu
   sans elle.

Une v2 géométrique reste ouverte, à instruire après un premier retour
d'usage réel en Revue (P4.4), pas avant.

## 3. Verdict et seuil

Score continu 0..1 (ou `None`), même patron que `identite_centroide` :

- `OK` — `score >= threshold_ok`
- `SUSPECT` — `threshold_watch <= score < threshold_ok`
- `CASSE` — `score < threshold_watch`
- `SANS_MAIN` — aucune main évaluable (`score is None`), jamais compté
  dans `CASSE`

Constantes alignées sur l'idiome existant de
`qc_identity.IdentityChecker.verdict()`
(`SANS_VISAGE`/`OK`/`A_REVOIR`/`REJET`).

Seuil **configurable par personnage**, jamais en dur (invariant 4,
`CLAUDE.md`) : `config.json["qc"]["mains"] = {"threshold_ok": ...,
"threshold_watch": ...}`, nesting par genre sous le bloc `qc` existant —
précédent direct dans le repo : `bench.margin` (une clé par genre sous
un bloc partagé). Valeurs de départ posées comme non mesurées
(`"measured": false`, même discipline que le reste du repo — Abyssiaelle
`identity`/`bench`), pas un chiffre inventé présenté comme calibré.
Verdict affiché, arbitrage laissé à l'utilisateur (`PROJET.md` : « la
plateforme mesure et informe, elle n'arbitre pas »).

## Limite vérifiée empiriquement (pas théorique)

Trouvé en testant `qc_mains.py` contre de vraies images de la banque
Léna via ComfyUI (`AUTOMATION/tests/test_qc_mains.py [2]`), pas anticipé
en écrivant la métrique ci-dessus :

- Une main **coupée net au niveau du poignet** (bras visible, main hors
  cadre) produit un score bas — le poignet est détecté (le bras est
  visible), mais quasiment aucun des 21 points de la main ne l'est
  (`sport_course_20260823_01.png` : 2/21, verdict `CASSE`). Le gating par
  poignet distingue bien « aucun bras dans le champ » (portrait resserré,
  `SANS_MAIN` correct) de « une main devrait être visible », mais ne
  distingue **pas** un cadrage qui coupe pile au poignet d'une main
  réellement mal rendue au même score bas.
- À l'inverse, DWPose peut ajuster un squelette à 21 points **pleine
  confiance** sur une main qu'un œil humain juge irrégulière en
  regardant l'image — le détecteur valide une topologie plausible, pas
  l'anatomie pixel par pixel. Un candidat visuellement suspect testé
  pendant ce chantier a scoré 1.0 des deux mains.

Conséquence assumée, pas corrigée par un second seuil inventé (aucun
corpus pour le calibrer honnêtement, même raison qu'au §2) : le verdict
`CASSE` signifie « quelque chose ici mérite un coup d'œil dans la
Revue », pas « main anatomiquement fausse, certifiée ». Cohérent avec
`PROJET.md` (mesure et informe, n'arbitre pas) — mais l'affichage
(étape 5 du chantier) ne doit pas sur-vendre ce que la mesure garantit
réellement.

## Ce que ce cadrage ne tranche pas

L'endroit exact et le patron visuel de l'affichage dans la Revue, le
graphe/mécanisme d'extraction ComfyUI à utiliser en pratique, et la
valeur numérique des seuils par personnage — traités par les étapes
suivantes du chantier (module de mesure, capacité de plateforme,
câblage, UI), pas ici.
