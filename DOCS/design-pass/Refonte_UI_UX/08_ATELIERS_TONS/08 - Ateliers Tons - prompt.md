Chantier : refonte des Tons et de l'éditeur d'expression (étape 8 de la revue UX/UI complète). Prérequis : écrans 0, 6 et 7 livrés.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md`, `.claude/rules/backend.md` (section `run_in_executor`) et `DOCS/design-pass/screen-expression-editor.md`, qui reste la référence de comportement.
2. Crée `DOCS/design-pass/screen-8-tons-expression.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - dis ce qui, dans `screen-expression-editor.md` (S, B1 à B6, A1), est déjà implémenté et ce qui reste ;
   - liste les sélecteurs des fumigations tons et expression, et dis comment chacun est préservé ou migré ;
   - confirme que « Copier depuis… » passe par `applyParamsAction` ;
   - décris comment les routes `/bank/tones` et `/bank/tones/edit/:tone` montent le même écran.
4. Implémente strictement la spec :
   - écran unifié à trois colonnes (liste des tons, essai, paramètres) ;
   - réglette de plage partagée (`RangeRule`) ;
   - erreurs et rendu périmé par photo ;
   - confirmation au changement de ton si des modifications sont en attente ;
   - raccourcis `[` `]` `R` ;
   - états (ton neutre, aucun ton, Galerie vide, hors ligne, moins de 1100 px).
   
   Aucun changement backend, `PARAM_BOUNDS` reste la seule source des bornes, code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` sous `python_embeded` ;
   - les sous-agents `verificateur` et `gardien-invariants` ;
   - puis un audit `audit-ux-ui` **en vrai** pour chaque état du critère de sortie, dont un rendu réel sur une photo sans visage.
6. Un seul commit : `ui(ateliers): tones list + expression editor side by side (design-pass screen-8)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-8-tons-expression.md` ---
(coller ici le fichier « 08 - Ateliers Tons - design-pass.md »)
