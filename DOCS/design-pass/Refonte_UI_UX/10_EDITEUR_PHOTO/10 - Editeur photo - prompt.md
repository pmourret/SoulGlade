Chantier : refonte de l'Éditeur photo, modale simplifiée et éditeur avancé (étape 10 de la revue UX/UI complète). Prérequis : écrans 0, 4 et 5 livrés.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md` et `DOCS/design-pass/screen-photo-editor.md` (§7a, §7b), qui reste la référence de comportement.
2. Crée `DOCS/design-pass/screen-10-editeur-photo.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - liste les sélecteurs des fumigations des deux éditeurs et dis comment chacun est préservé ou migré ;
   - explique comment le rideau se dessine sur le même canvas sans toucher aux fonctions de calcul ;
   - mesure le coût d'une vignette de préréglage et dis si tu gardes le rendu réel ou le repli ;
   - dis si la modale confirme déjà avant de passer à l'éditeur avancé avec des modifications ;
   - décris comment le réordonnancement des calques (souris et clavier) réutilise `reorder` sans nouvelle logique.
4. Implémente strictement la spec :
   - trois zones bord à bord et barre d'écran ;
   - préréglages en vignettes avec aperçu au survol ;
   - aperçu à trois modes (Réglages, Rideau, Avant) ;
   - barre de masque flottante ;
   - pile de calques restylée (glisser, `Alt` + ↑ ↓, `Suppr`, menu contextuel) ;
   - sections repliables avec résumé et Réinitialiser ;
   - `AdjustSlider` partagé ;
   - modale restylée ;
   - tous les états.

   Aucun changement backend. Aucune modification de `photoEditorLayersPixels.ts` ni des `*Math.ts`. Code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` ;
   - les sous-agents `verificateur` et `gardien-invariants` ;
   - un audit `audit-ux-ui` **en vrai** pour chaque cas du critère de sortie. « Écraser la source » se teste sur une image de test, jamais sur une image de production.
6. Un seul commit : `ui(photo-editor): develop layout, layered panel hierarchy, shared adjust slider (design-pass screen-10)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-10-editeur-photo.md` ---
(coller ici le fichier « 10 - Editeur photo - design-pass.md »)
