# ROADMAP — Plateforme multi-personnage

Document vivant, pas figé. Méthode : jalons courts, chaque jalon livrable et
testé seul — pas de big-bang (cf. `CLAUDE.md`, §10).

V1 (neuf jalons, terminée le 2026-09-05) et Phase 2 (clôture V1, terminée
le 2026-09-05) sont archivées telles quelles dans
[`DOCS/archives/2026-09-05-roadmap-v1-et-phase-2.md`](DOCS/archives/2026-09-05-roadmap-v1-et-phase-2.md).
Ce document ne porte plus que ce qui reste ouvert.

## Phase 3 — Contrat de pack ✅ *(cadre posé, câblage en attente)*

Objectif : écrire noir sur blanc ce qu'un monde doit contenir pour être
« prêt à vendre », depuis le code réel et les deux mondes existants —
pas depuis le cadrage J8 qui anticipait certaines choses inexactement.
Cadrage complet : `DOCS/cadrage/2026-09-06-contrat-de-pack.md`.

- [x] **C1 — Diagnostic, contrat réel vs anticipé.** Trois écarts
  trouvés : le checkpoint vit dans le PACK, pas le monde ; le LoRA
  n'est pas le seul mécanisme de style ; les assets de monde ne sont
  pas consommés par le runner (câblage explicitement hors périmètre de
  ce cadrage).
- [x] **C2 — Schéma readiness appliqué.** ADR-0023 : trois flags par
  monde (`places`, `tones`, `style`), posés jamais calculés. Appliqué
  aux deux mondes existants — `slow-life` a `places`+`tones` à `true`,
  `terres-sauvages` tout à `false`. `worlds.py` enrichi d'un accesseur
  `readiness()`, diagnostic à jour.
- [ ] **C3 — Câbler les assets monde dans le runner.** En attente :
  prérequis pour qu'un monde puisse un jour valoir `style: true`.
  Attend qu'un monde soit réellement prêt à porter un style — donc
  attend la qualité de sortie (phase 4).
- [ ] **C4 — World/pack builder.** En attente. Outillage pour poser
  `readiness`, valider, scaffolder un monde. Reprendra une fois qu'une
  pratique concrète de création de monde existe.

## Phase 4 — Qualité de sortie *(en cours, ouverte 2026-09-06)*

Objectif : amener la qualité de sortie du runner au niveau où Pierre
peut réellement produire du contenu pour Léna sans devoir retoucher
chaque image derrière. Deux axes qui se recouvrent : les graphes de
production eux-mêmes, et la détection des mains cassées — critère de
sortie V1 de `PROJET.md` jamais livré. Cadrage complet :
`DOCS/cadrage/2026-09-06-phase-4-qualite-workflows-mains.md`.

- [x] **P4.1 — Recherche ciblée détail visage/mains.** Livré
  06/09/2026 (`DOCS/recherche/2026-09-06-workflows-detail-visage-mains.md`).
  Deux étages candidats retenus (`HLFrequencyDetailRestore`, patron
  Skin Fix), un écarté. Trois décisions actées en revue : Abyssiaelle
  sort du périmètre de la phase (son pipeline SDXL est un brouillon J6
  sans refiner/FaceDetailer/upscale, chantier séparé en `BACKLOG.md`),
  DWPose remplace MediaPipe comme détecteur candidat (incident
  MediaPipe/InsightFace déjà documenté), ADR-0024 sur la licence GPL
  des custom nodes.
- [ ] **P4.2 — Sortir le banc de comparaison de pause.** Le banc J8.5
  n'a jamais servi. Nécessaire pour valider chiffré, pas à l'œil,
  l'apport d'un étage candidat de P4.1 sur Léna.
- [x] **P4.3 — Détection des mains cassées.** Livré 07/09/2026.
  Capacité de plateforme `hands` (DWPose, `WORKFLOWS/utils/
  pose_extract_ui.json` réutilisé tel quel) : score = taux de détection
  minimum des deux mains, gating par poignet, seuil configurable par
  personnage. Métrique cadrée par écrit avant code
  (`DOCS/cadrage/2026-09-07-p4-3-metrique-mains.md`) — corrige au
  passage une hypothèse fausse de P4.1 : la confiance DWPose n'est pas
  graduée, déjà seuillée/binarisée dans le node vendorisé.

  **Reste informative, pas encore bloquante** (ADR-0025, voir plus
  bas) : mesurée sur les 48 images déjà validées OK de la banque Léna,
  la mesure v1 aurait rejeté 16 images à tort (33 %) tout en laissant
  passer les deux images réellement cassées qui ont motivé le
  chantier (scoreées 1.0). Le volet « v2 géométrique » envisagé pour
  corriger ça a été fermé le jour même après une sonde sur 15 images
  (`DOCS/recherche/2026-09-07-signal-geometrique-mains.md`) : aucun
  indicateur calculable depuis le squelette DWPose ne sépare les mains
  cassées des mains propres — DWPose pose un squelette anatomiquement
  plausible sur une bouillie de pixels, l'information manquante n'est
  pas dans les keypoints.

  **Le juge pixel a été testé le 07/09 et ne marche pas non plus.**
  Piste cadrée (`DOCS/cadrage/2026-09-07-p4-3-juge-pixel-mains.md`) puis
  mesurée avant toute intégration : DWPose localise la main, un crop est
  découpé en Python, Florence-2 juge le crop
  (`WORKFLOWS/platform/hands_judge_ui.json`). Sur 42 crops issus de 27
  images étiquetées, **aucune règle simple ne sépare** les mains cassées
  des mains propres, sur aucun des deux modes de tâche testés : la
  meilleure rate une des quatre mains cassées et produit 53 % de faux
  positifs (pire que les 33 % de la v1), et le mode grounding rend une
  boîte « Hand » sur 12 crops sur 12, flou de peau compris. La mention
  d'une main dans la caption suit la taille du crop, pas sa qualité
  anatomique. Verdict NO-GO chiffré :
  `DOCS/recherche/2026-09-07-juge-pixel-mains-resultats.md`. L'intégration
  prévue (capacité `handsjudge`, tri `OK -> A_REVOIR`) n'est pas codée.

  **État réel à ce jour : SoulGlade ne sait pas reconnaître une main
  cassée**, et `hands` reste informative. Les pistes non fermées (autre
  poids Florence-2, VLM à VQA ouverte, classifieur dédié entraîné) sont
  listées en fin de rapport — aucune n'entre dans la phase 4 telle
  qu'elle est cadrée, aucune ne s'ouvre sans décision explicite.
- [ ] **P4.4 — Adopter ou rejeter une amélioration de workflow.**
  Prendre le candidat le plus prometteur de P4.1, l'implémenter, le
  passer au banc P4.2 sur Léna, décision chiffrée. Abyssiaelle vérifiée
  dans un chantier séparé, une fois son pipeline amené au niveau de
  celui de Léna.
- [ ] **P4.5 — Plausibilité des proportions du corps.** *(ajouté
  07/09/2026)* Ouvert par le même retour d'usage que ci-dessus : les
  deux images au torse anormalement allongé ne sont vues par AUCUNE
  mesure existante (identité conforme, mains à 1.0). Cadrage :
  `DOCS/cadrage/2026-09-07-p4-5-proportions.md`. Contrairement aux
  mains, le signal semble réellement présent dans le squelette DWPose
  — une proportion est un rapport de longueurs entre points, ce qu'un
  squelette porte ; mesuré au passage sur le cas réel (asymétrie des
  bras 0.32 contre 0.14 maximum sur 13 images de contrôle). Première
  étape : constituer un corpus étiqueté à la main, ce qui manquait à
  P4.3 pour calibrer honnêtement.

**Décision de cadrage — 2026-09-07 (ADR-0025)** : `PROJET.md` est
amendé — le principe « la plateforme mesure et informe, elle n'arbitre
pas » ne couvre plus les défauts objectifs (main cassée, anatomie
incohérente ne sont pas des choix créatifs). La plateforme les trie
elle-même dès qu'une mesure démontre sa fiabilité sur corpus étiqueté ;
l'identité reste seule arbitrée par l'utilisateur. Condition non
négociable, pas un principe abstrait : `hands` v1 ne satisfait pas
cette barre (33 % de faux positifs mesurés ci-dessus), donc **rien ne
trie encore dans le runner** — P4.3 et P4.5 héritent tous les deux de
cette barre à franchir avant de devenir bloquants. Voir
`DOCS/adr/0025-tri-automatique-defauts-objectifs.md`.

## V2 — Extensions

- Mise en scène de plusieurs personnages ensemble (verrous d'identité
  multiples actifs simultanément dans une même génération)
- Univers "art pur"
- Vidéo (Wan 2.2) et voix (ACE-Step) intégrées au pipeline généralisé, pour
  l'influenceur comme pour le RPG-personnage — le registre de création les
  a déjà déclarées en V1 (J4), il reste à brancher les workflows
- Vidéo NSFW

## V3 / plus tard

- Univers "monde RPG" complet (lore, carte, PNJ secondaires, histoire,
  dialogue, persistance) — mini-application à part entière, pas un outil
  parmi d'autres
- **Intégration MCP** : exposer les actions de la plateforme (créer une
  scène, lancer une génération, consulter le contenu d'un personnage) comme
  outils MCP pour des assistants généralistes. À garder en tête dès la V1
  dans la conception de l'API interne (routes propres, typées, sans effet
  de bord caché) pour que l'exposition MCP soit un ajout plus tard, pas une
  réécriture
- Passage du dépôt en public (dépend de la séparation données/code posée
  en J1)

## Exigence transverse — pas un jalon, continue sur tous les jalons

Qualité et repérabilité des bugs (backend et frontend) :
- Pas de commit sans test du module touché (déjà posé)
- Logs structurés plutôt que prints épars
- Erreurs remontées explicitement à l'interface plutôt qu'échouées en
  silence
- Health-check étendu au niveau plateforme (pas seulement Léna), une fois
  la base = source de vérité en place (J0)
- Fumigations navigateur (Playwright, installé hors du repo — le repo n'a
  aucune dépendance) : `AUTOMATION/tests/run_browser_tests.py`, un tableau
  de bord neuf par test. Couvre registre, wizard, écran Créer, aperçu de
  prompt, banque de poses, éditeur photo (7 tests). Mis en place pendant la
  passe frontend post-J7bis, avec un bug réel corrigé au passage
  (`pose_tools.extraire` écrasait un squelette au lieu d'en ajouter un)