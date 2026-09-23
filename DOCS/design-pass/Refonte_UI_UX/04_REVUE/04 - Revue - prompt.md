Chantier : refonte de la Revue et de la Galerie (étape 4 de la revue UX/UI complète). Prérequis : écrans 0, 2 et 3b livrés.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md`, `DOCS/design-pass/screen-5-revue-galerie.md` (logique à préserver) et `DOCS/design-pass/screen-0-chrome.md` (tokens).
2. Crée `DOCS/design-pass/screen-5b-revue-refonte.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - liste tous les sélecteurs de `test_review.js` et dis comment chacun est préservé ou migré ;
   - confirme que la pile de gardes de `useReviewKeys` reste entière ;
   - vérifie que `deleteForever` passe bien par une confirmation ;
   - propose le nom du nouveau token pour la bande cible du réalisme.
4. Implémente strictement la spec :
   - trois panneaux : filtres, centre (loupe, grille, comparer), inspecteur ;
   - vignettes sans pastille de score ni rangée de glyphes ;
   - barre groupée sans « Comparer (N) » ;
   - menu contextuel de vignette ;
   - barre d'actions de la loupe avec les touches affichées ;
   - inspecteur à réglettes de bande ;
   - état vide qui signale l'autre espace ;
   - variante Galerie.
   
   Aucun changement backend, aucun seuil en dur (tout vient de `qc`), code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` ;
   - sous-agents `verificateur` et `gardien-invariants` ;
   - puis un audit `audit-ux-ui` **en vrai** : captures à 1440 et 1024 pour chaque état du critère de sortie, et la séquence clavier rejouée.
6. Un seul commit : `ui(revue): library three-panel layout (design-pass screen-5b)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-5b-revue-refonte.md` ---
(coller ici le fichier « 04 - Revue - design-pass.md »)
