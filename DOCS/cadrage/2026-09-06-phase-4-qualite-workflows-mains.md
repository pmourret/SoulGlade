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

1. Détection des mains cassées mesurée par génération et affichée dans
   la Revue. **Amendé le 2026-09-07 (ADR-0025)** : l'objectif n'est plus
   d'informer, c'est de TRIER — une main cassée est un défaut objectif,
   pas un arbitrage à rendre à l'utilisateur. Le tri automatique ne
   s'active qu'une fois la fiabilité démontrée sur corpus étiqueté ; la
   mesure v1 livrée ne la démontre pas (33 % de faux positifs sur les
   images validées, 0 % de détection sur les deux cas réels du 07/09),
   donc elle reste informative en attendant un juge qui regarde les
   pixels.
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

> **Volet « juge pixel » fermé le 2026-09-07.** Après la fermeture de la
> piste géométrique le matin même
> (`DOCS/recherche/2026-09-07-signal-geometrique-mains.md` : l'information
> n'est pas dans les keypoints DWPose), la suite désignée était un second
> étage qui regarde les pixels du crop — Florence-2, déjà provisionné.
> Cette piste a été cadrée
> (`DOCS/cadrage/2026-09-07-p4-3-juge-pixel-mains.md`) puis **mesurée
> avant toute intégration**, comme ce cadrage l'imposait. Résultat :
> **NO-GO**, chiffré dans
> `DOCS/recherche/2026-09-07-juge-pixel-mains-resultats.md`.
>
> Sur 42 crops de main issus de 27 images étiquetées, aucune règle simple
> ne sépare les mains cassées des mains propres, sur aucun des deux modes
> de tâche testés. La meilleure règle (`more_detailed_caption`, absence de
> tout mot de main dans la caption) rate une des quatre mains cassées et
> produit **53 % de faux positifs** — pire que les 33 % qui ont fait
> écarter la mesure v1 dans ADR-0025. Le mode `caption_to_phrase_grounding`,
> testé sur les 12 crops du corpus initial, ne sépare rien du tout : il
> rend une boîte « Hand » sur 12 crops sur 12, flou de peau compris.
> Raison de fond mesurée : la mention d'une main
> dans la caption suit la **taille du crop** (aire médiane 106 496 px
> quand elle apparaît, 16 616 px quand elle manque), pas la qualité
> anatomique.
>
> Conséquence : l'intégration prévue (`juge_pixel`, capacité `handsjudge`,
> tri `OK -> A_REVOIR`) n'est pas codée, la capacité `hands` reste
> **informative**, et le critère de sortie 1 ci-dessus n'est **pas**
> atteint pour son volet « trier ». Ce que P4.3 livre reste ce que la v1
> mesure honnêtement. Les pistes non fermées (autre poids Florence-2, VLM
> à VQA ouverte, classifieur dédié) sont listées en fin de rapport ;
> aucune n'entre dans la phase 4 telle qu'elle est cadrée, et aucune ne
> s'ouvre sans décision explicite.

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

### P4.5 — Plausibilité des proportions du corps *(ajouté 2026-09-07)*

Ouvert par un retour d'usage, pas prévu au découpage initial : deux
productions Léna au torse allongé et aux bras incohérents sont passées
en OK sans qu'aucune mesure ne les voie — ni l'identité (visage
conforme), ni le réalisme, ni les mains de P4.3 (qui les score 1.0).

Cadré à part : `DOCS/cadrage/2026-09-07-p4-5-proportions.md` (corpus
étiqueté d'abord, puis choix des indicateurs sur ce corpus, puis mesure
et affichage). Contrairement aux mains, le signal semble bien présent
dans le squelette DWPose — une proportion est un rapport de longueurs
entre points, mesuré dans
`DOCS/recherche/2026-09-07-signal-geometrique-mains.md`.

Indépendant de P4.2 et P4.4 : peut s'intercaler ou attendre.

## Séquence et dépendances

- P4.1 en premier (recherche, alimente les trois autres)
- P4.2 et P4.3 en parallèle si envie (indépendants entre eux)
- P4.4 en dernier (dépend des trois autres)
- P4.5 indépendant des autres (ajouté en cours de phase, voir ci-dessus)

Le chantier entier peut durer plusieurs sessions — c'est un vrai
chantier de qualité, pas une correction. Pas d'urgence à le boucler en
une journée comme J8 : la valeur est dans la profondeur de l'analyse,
pas dans la vitesse.
