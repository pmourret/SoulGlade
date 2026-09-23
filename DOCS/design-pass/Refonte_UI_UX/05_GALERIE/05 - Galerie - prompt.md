Chantier : refonte de la Galerie (étape 5 de la revue UX/UI complète). Prérequis : les écrans 0, 2, 3b et la Revue refondue (`screen-5b-revue-refonte.md`) sont livrés.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md` et `DOCS/design-pass/screen-5b-revue-refonte.md` (composants partagés).
2. Crée `DOCS/design-pass/screen-5c-galerie-planche.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - liste les sélecteurs de `test_review.js` qui concernent la Galerie ;
   - vérifie que `useScenes()` permet bien de retrouver l'intention d'une scène ;
   - propose l'algorithme de `justifyRows`.
4. Implémente strictement la spec :
   - barre de filtres (espace, format, grouper par, score, recherche, vue) ;
   - planche justifiée et regroupée ;
   - panneau Cadrage (feed / story, zone souvent recouverte, aucune interface tierce reproduite) ;
   - barre panier, avec téléchargement fichier par fichier ;
   - panier réinitialisé quand on change de personnage ;
   - vue Loupe partagée avec les actions de la Galerie.
   
   Aucun changement backend, code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` ;
   - les tests unitaires de `boardLayout.ts` ;
   - les sous-agents `verificateur` et `gardien-invariants` ;
   - puis un audit `audit-ux-ui` **en vrai** pour chaque état du critère de sortie. Le téléchargement des 3 fichiers et la réinitialisation du panier au changement de personnage doivent être rejoués pour de vrai.
6. Un seul commit : `ui(galerie): publication board + cart (design-pass screen-5c)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-5c-galerie-planche.md` ---
(coller ici le fichier « 05 - Galerie - design-pass.md »)
