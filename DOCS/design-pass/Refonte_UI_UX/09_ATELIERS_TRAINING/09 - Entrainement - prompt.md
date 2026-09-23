Chantier : refonte de l'écran Entraînement (étape 9 de la revue UX/UI complète). Prérequis : écran 0 (chrome) livré.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md` et `AUTOMATION/entrainement.py` (sémantique des compteurs, noms de fichiers écrits par l'exporteur).
2. Crée `DOCS/design-pass/screen-9-entrainement.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - dis si les compteurs `file`, `exportables`, `ecartes`, `sans_etiquette` se recoupent, et comment la barre de répartition (S3) les représente sans créer de faux total ;
   - liste les noms de fichiers réellement écrits dans le dossier d'export, et dis si la réponse expose l'ancre réinjectée et la famille avant l'export ;
   - liste les sélecteurs de la fumigation (`#training`, `data-count`, `#trainRepetitions`, `#btnTrainExport`) et dis comment chacun est préservé.
4. Implémente strictement la spec :
   - rapport à gauche, panneau d'export fixe à droite ;
   - verdict, entonnoir, critères, diversité en barres, écartées et atypiques repliables ;
   - historique sous le bouton ;
   - états : chargement, erreur, aucune donnée, pas de proposition, exportables = 0, moins de 1100 et de 900 px.

   Aucun changement backend. Aucun nombre inventé. Messages serveur affichés tels quels. Code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` ;
   - les sous-agents `verificateur` et `gardien-invariants` ;
   - un audit `audit-ux-ui` **en vrai** pour chaque état du critère de sortie, dont un export réel et un refus 409 provoqué pendant une production.
6. Un seul commit : `ui(training): readiness report + pinned export panel (design-pass screen-9)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-9-entrainement.md` ---
(coller ici le fichier « 09 - Entrainement - design-pass.md »)
