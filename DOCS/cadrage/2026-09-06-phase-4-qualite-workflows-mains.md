# Phase 4 — Qualité de sortie : workflows et détection des mains

Mis à jour le 2026-09-06 après la recherche P4.1 : Abyssiaelle sortie du
périmètre, DWPose confirmé comme détecteur candidat.

Session du 6 septembre 2026, décision de séquencer trois chantiers de
qualité de production dans cet ordre : (1) qualité des workflows +
mains, (2) contrôle d'identité évolutif, (3) outils de scène. Cette
phase couvre le premier. Trois questions (Règle 3, `PROJET.md`).

## À quoi ça sert

Amener la qualité de sortie du runner au niveau où Pierre peut
réellement produire du contenu pour Léna et Abyssiaelle sans devoir
retoucher chaque image derrière. Deux axes qui se recouvrent : les
graphes de production eux-mêmes (sampler/scheduler, upscale, détail),
et la détection des mains cassées — critère de sortie V1 de
`PROJET.md` jamais livré (*"détection des mains cassées et cohérence
de l'identité mesurées, affichées, arbitrage laissé à l'utilisateur"*).

Les deux sont regroupés parce que la même recherche les alimente : la
détection des mains est une capacité de plateforme (agnostique du
modèle, cadrage J8 §2), et les patrons de détail/haute résolution des
workflows tiers qu'on va inspecter en portent souvent le mécanisme.

## Hors périmètre

- **Contrôle d'identité évolutif** — phase 5, cadrée plus tard.
- **Créateur de lumière, importeur d'assets, gestionnaire de
  vêtements** — phase 6, cadrée plus tard. Aujourd'hui `places` porte
  le cadrage lumière dans le prompt, sélecteur de tenue en texte libre
  fonctionnel — pas bloquant pour cette phase.
- **Recopier des graphes tiers** — expressément interdit par le §7 du
  cadrage J8 (jamais le graphe, seulement l'étage). Le livrable de
  cette phase est notre propre code, informé par ce qu'on aura regardé.
- **Amélioration des écrans du studio** (Studio IA) — reste en pause
  fonctionnelle jusqu'à cadrage propre.
- **Pipeline de production Abyssiaelle (SDXL)** — le brouillon J6 actuel
  (`WORKFLOWS/content/abyssiaelle_master_prod_ui.json`, 13 nœuds, aucun
  refiner, aucun FaceDetailer, aucun upscale câblé — constat d'ouverture
  de `DOCS/recherche/2026-09-06-workflows-detail-visage-mains.md`) doit
  d'abord être amené au niveau du pipeline Léna avant qu'une comparaison
  d'étages de détail ait un sens sur cette famille. Chantier séparé, noté
  en `BACKLOG.md`.

## Critère de sortie

1. Détection des mains cassées mesurée par génération, affichée dans la
   Revue, arbitrage laissé à l'utilisateur — comme l'identité et le QC
   aujourd'hui.
2. Au moins un étage de workflow tiers identifié comme amélioration
   candidate, testé sur le banc de comparaison (J8.5, à sortir de pause
   pour l'occasion), adopté ou rejeté avec la raison chiffrée.
3. Documentation `DOCS/design-pass/` du "avant/après" de ce qui aura été
   changé, vérifié sur Léna. Abyssiaelle sera vérifiée dans un chantier
   séparé, une fois son graphe amené au niveau du pipeline complet Léna
   (voir `BACKLOG.md`).

## Découpage en étapes

### P4.1 — Recherche ciblée sur détail visage et mains ✅ *(livré 2026-09-06)*

La recherche `DOCS/recherche/2026-09-05-comfyui-studio-v362.md` a fait
l'inventaire du pack ComfyUI Studio (150 workflows, 139 custom nodes)
mais reste à un niveau structurel. Cette étape descend dans les graphes
qui traitent spécifiquement le détail visage/mains :

- `Retouch Pro`, `Skin Fix`, `Portrait Master` — trois workflows qui se
  recoupent, chacun avec plusieurs variantes de moteur en groupes
  bypassables. Comprendre le pattern haute/basse fréquence qu'ils
  appliquent.
- `Ultimate SD Upscale` + `SeedVR2` — le pipeline d'upscale en deux
  passes de la distribution.
- `Impact Pack` / `Inspire Pack` — les nodes de détection et de
  détailer utilisés en aval (FaceDetailer, HandDetailer si présents).
- Comparaison avec le graphe actuel de Léna et Abyssiaelle : quels
  étages font-ils différemment sur le détail final.

**Fait** : `DOCS/recherche/2026-09-06-workflows-detail-visage-mains.md`.

**Livrable** : une note dans `DOCS/recherche/` qui pointe 2-3 étages
candidats à emprunter (pas les graphes), et pour chacun ce qu'il
change concrètement dans le pipeline SoulGlade.

**Test** : la note doit permettre à un développeur qui n'a pas fait la
recherche de savoir quoi tester en priorité et pourquoi.

### P4.2 — Sortir le banc de comparaison de pause

Le banc de comparaison (J8.5) est en pause fonctionnelle depuis le
5/09 sans jamais avoir servi. Il devient nécessaire ici : on ne peut
pas valider "l'étage X améliore le rendu" à l'œil, surtout sur des
gains fins de détail. Rappel du cadrage J8.5 : sortie chiffrée par
variante (identité et réalisme agrégés sur les seeds, écart-type,
comparaison à la variante de référence).

**Livrable** : le banc fonctionne end-to-end sur au moins un cas
concret — même personnage, même scène, un axe qui change.

**Test** : lancer le banc sur une variante triviale (deux valeurs de
sampler) et vérifier que le verdict est lisible et interprétable.

### P4.3 — Détection des mains cassées

Nouvelle capacité de plateforme (cadrage J8 §2 : agnostique du modèle,
sur image finie, s'enregistre via la carte de capacités J8.2). Trois
sous-questions à trancher pendant P4.1 pour éviter une deuxième
recherche :

- **Détecteur** — DWPose (`comfyui_controlnet_aux`, déjà provisionné
  dans `AUTOMATION/comfyui_manifest.json`), candidat par défaut identifié
  par la recherche P4.1 (`DOCS/recherche/2026-09-06-workflows-detail-
  visage-mains.md`) : `AUTOMATION/pose_render.py` consomme déjà un format
  `hand_left_keypoints_2d`/`hand_right_keypoints_2d` (nommage OpenPose)
  probablement issu de DWPose — à confirmer en remontant la chaîne
  d'extraction avant de construire dessus. **Ne pas installer MediaPipe**
  (paquet pip `mediapipe`) : incident déjà documenté dans
  `.claude/skills/workflow-comfyui/references/pieges-noeuds-custom.md`
  (casse InsightFace via un conflit `opencv-contrib-python`/
  `opencv-python`). Repli possible : un HandDetailer d'Impact Pack
  (détection + correction automatique, pas un détecteur pur).
- **Métrique** — nombre de doigts détectés par main vs attendu, ou
  score de confiance MediaPipe, ou quelque chose de plus fin (mesure
  de plausibilité géométrique) ?
- **Affichage dans la Revue** — même barre latérale que l'identité et
  le QC. Pas de nouveau paradigme UI.

**Livrable** : capacité `hands` dans la plateforme, invoquée après
chaque génération, résultat stocké en base au même endroit que les
autres scores, affiché dans la Revue.

**Test** : sur un échantillon d'images existantes de Léna et
Abyssiaelle (l'historique de la Revue en fournit), la détection
identifie correctement les mains cassées connues sans faux positifs
grossiers. Aucune retouche automatique — arbitrage utilisateur, comme
`PROJET.md` le demande.

### P4.4 — Adopter (ou rejeter) une amélioration de workflow

Une fois P4.1, P4.2, P4.3 en place : prendre l'étage candidat le plus
prometteur de P4.1, l'implémenter, le passer au banc P4.2 sur Léna,
décision chiffrée d'adopter ou de rejeter. Si adopté : `DOCS/design-pass/`
documentant l'avant/après. Si rejeté : la raison écrite, pour ne pas
re-tester plus tard la même piste sans avoir oublié pourquoi.

**Livrable** : soit un pack technique modifié (nouvel étage, avec test
de non-régression), soit un rejet documenté.

**Test** : si adopté, le banc confirme le gain sur Léna. Si rejeté, la
note explique pourquoi de façon reproductible.

## Séquence et dépendances

- P4.1 en premier (recherche, alimente les trois autres)
- P4.2 et P4.3 en parallèle si envie (indépendants entre eux)
- P4.4 en dernier (dépend des trois autres)

Le chantier entier peut durer plusieurs sessions — c'est un vrai
chantier de qualité, pas une correction. Pas d'urgence à le boucler en
une journée comme J8 : la valeur est dans la profondeur de l'analyse,
pas dans la vitesse.
