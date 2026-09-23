Chantier : refonte de la banque de poses, Ateliers → Poses (étape 7 de la revue UX/UI complète). Prérequis : les écrans 0 et 7b (composeur) sont livrés.

1. Relis `CLAUDE.md` et `.claude/rules/frontend.md`, puis `AUTOMATION/pose_tools.py` (suppression de la photo source) et `api/security.py` (corps JSON obligatoire).
2. Crée `DOCS/design-pass/screen-7c-banque-poses.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - liste les sélecteurs de `test_bank.js` pour les poses et dis comment chacun est préservé ou migré ;
   - confirme que le dépôt appelle **la même** fonction `extract()` que le bouton ;
   - vérifie si `/api/pose/bank` renvoie une date ;
   - vérifie qui lit `density` et `PoseCard`.
4. Implémente strictement la spec :
   - barre d'atelier complétée ;
   - tableau triable ;
   - dépôt direct avec superposition et bandeau d'extraction ;
   - aperçu avec libellé éditable et liens vers les scènes ;
   - confirmation de retrait qui nomme les scènes ;
   - cas de la pose ancienne dit en clair ;
   - repli sous 1100 px.
   
   Aucun changement backend. Code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` ;
   - les sous-agents `verificateur` et `gardien-invariants` ;
   - puis un audit `audit-ux-ui` **en vrai** pour chaque état du critère de sortie. Une extraction réelle doit aller jusqu'au bout, puis il faut contrôler qu'aucune photo n'est restée dans `ComfyUI/input`.
6. Un seul commit : `ui(ateliers): pose bank as sortable table + direct drop (design-pass screen-7c)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-7c-banque-poses.md` ---
(coller ici le fichier « 07 - Ateliers Poses - design-pass.md »)
