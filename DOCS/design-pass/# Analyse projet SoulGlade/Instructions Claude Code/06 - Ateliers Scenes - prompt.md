Chantier : refonte du composeur de scène, Ateliers → Scènes (étape 6 de la revue UX/UI complète). Prérequis : écrans 0, 2, 3b, 5b, 5c livrés.

1. Relis `PROJET.md` (le créateur de scène est le cœur), `CLAUDE.md`, `.claude/rules/frontend.md` et `DOCS/design-pass/screen-7-banque-editeur-de-scene.md` (logique à préserver).
2. Crée `DOCS/design-pass/screen-7b-composeur-refonte.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - liste les sélecteurs de `test_bank.js` et dis comment chacun est préservé ou migré ;
   - montre où se calcule aujourd'hui le récapitulatif de « Prompt global » et comment l'aperçu vivant le réutilisera **sans second assembleur de prompt** (invariant 3) ;
   - confirme qu'**aucun champ n'est ajouté ni retiré** dans les sept panneaux ;
   - vérifie si Produire accepte déjà une présélection de scène.
4. Implémente strictement la spec :
   - barre d'atelier ;
   - liste resserrée avec les points « modifiée » ;
   - en-tête de scène avec les actions (Supprimer passe par une confirmation) ;
   - rail de sections avec libellés ;
   - formulaire borné à 880 px ;
   - aperçu vivant ;
   - repli sous 1100 px.
   
   Aucun changement backend, code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` ;
   - les sous-agents `verificateur` et `gardien-invariants` (invariant 3 en particulier) ;
   - puis un audit `audit-ux-ui` **en vrai** pour chaque état du critère de sortie.
6. Un seul commit : `ui(ateliers): three-panel scene composer (design-pass screen-7b)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-7b-composeur-refonte.md` ---
(coller ici le fichier « 06 - Ateliers Scenes - design-pass.md »)
