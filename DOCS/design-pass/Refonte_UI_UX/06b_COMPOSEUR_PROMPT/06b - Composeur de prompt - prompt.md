Chantier : refonte des sept panneaux du composeur de scène (étape 6 bis de la revue UX/UI). Prérequis : design-pass `screen-7b-composeur-refonte.md` livré.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md`, `DOCS/design-pass/screen-7b-composeur-refonte.md`, puis `composer/SceneComposer.tsx`, `PromptField.tsx`, `wardrobeCatalog.ts`, `sections.ts`, `sceneFragments.ts` et `state/ScenesStoreContext.tsx` (`composePrompt`, `bandOf`, `draftsToScenes`).
2. Crée `DOCS/design-pass/screen-7c-composeur-panneaux.md` avec le contenu fourni ci-dessous. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - pour chaque panneau, liste les champs `data-f` touchés et comment chaque sélecteur de `test_bank.js` est préservé ou migré (trois miroirs du récapitulatif retirés) ;
   - confirme que toutes les vues colorées passent par `sceneFragments` et que `composePrompt` reste le **seul assembleur** (invariant 3) ;
   - montre où est lue la version enregistrée d'une scène (celle qu'utilise `sceneChanges`) pour alimenter le diff ;
   - propose `lib/diff.ts` (LCS lignes puis mots) ; si tu préfères une dépendance npm, demande-moi avant ;
   - dis où atterrissent les lignes de tenue sans niveau une fois `wardrobe_recap` retiré (spec §3.6) ;
   - liste les jetons à ajouter à `tokens.css` (`--diff-add-*`, `--diff-del-*`, `--info-bg` si absent).
4. Implémente strictement la spec, panneau par panneau (1b, 2a, 3b, 4a, 5a, 6a en état non branché, 7a avec diff côte à côte / unifié). Aucun changement backend, aucun changement de `scenes.json`, code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, tests unitaires de `lib/diff.ts`, `run_browser_tests.py` ;
   - les sous-agents `verificateur` et `gardien-invariants` (invariant 3 et ADR-0015 en particulier) ;
   - un audit `audit-ux-ui` **en vrai** pour chaque état du critère de sortie.
6. Un seul commit : `ui(ateliers): rework the seven composer panels (design-pass screen-7c)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-7c-composeur-panneaux.md` ---
(coller ici le fichier « 06b - Composeur de prompt - design-pass.md »)
