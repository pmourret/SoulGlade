Chantier : refonte de Référentiel > Mondes (étape 11 de la revue UX/UI complète). Prérequis : écran 0 livré (catégorie Référentiel, DirtyBar).

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md`, ADR-0015 et ADR-0016.
2. Crée `DOCS/design-pass/screen-11-mondes.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - décris comment `/worlds` et `/worlds/:worldId/places` montent le même écran, et si `?place=` est simple à porter ;
   - liste les sélecteurs des fumigations des mondes et des lieux, et dis comment chacun est préservé ou migré ;
   - dis si une route existante donne le nombre de personnages par monde. Si ce n'est pas le cas, n'en crée aucune ;
   - confirme que `useCatalogueEditor.save` et `remove` ne changent pas, et décris l'ajout de `dirty` / `reset` pour le DirtyBar.
4. Implémente strictement la spec :
   - écran unifié à trois colonnes ;
   - onglets Ordinaire et Adulte ;
   - inspecteur avec ligne de portée et identifiant figé ;
   - retrait déplacé dans l'inspecteur ;
   - modale « Nouveau monde » ;
   - `slugify.ts` et ses tests ;
   - DirtyBar ;
   - tous les états.

   Aucun changement backend. Code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, tests unitaires, `run_browser_tests.py` ;
   - les sous-agents `verificateur` et `gardien-invariants` ;
   - un audit `audit-ux-ui` **en vrai** pour chaque cas du critère de sortie, sur un monde de test (jamais sur « Slow life » ou un monde utilisé par un personnage réel pour le retrait).
6. Un seul commit : `ui(worlds): unified registry, catalogue and place inspector (design-pass screen-11)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-11-mondes.md` ---
(coller ici le fichier « 11 - Mondes - design-pass.md »)
