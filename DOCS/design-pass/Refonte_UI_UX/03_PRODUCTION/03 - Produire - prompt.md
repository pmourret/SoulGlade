Chantier : refonte de Produire (étape 3 de la revue UX/UI complète). Prérequis : écrans 0 et 2 livrés.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md`, `DOCS/design-pass/screen-3-produire.md` (logique à préserver) et `DOCS/design-pass/screen-0-chrome.md` (tokens).
2. Crée `DOCS/design-pass/screen-3b-produire-refonte.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin (skill `tableau-de-bord`).
3. **Mode Plan** d'abord :
   - liste tous les sélecteurs de la fumigation Produire et dis comment chacun est préservé ou migré ;
   - confirme que `runDisabled` reste une seule expression ;
   - confirme que la confirmation de palier reste sur tous les chemins (clic, flèches, raccourci) ;
   - vérifie qui lit `gearOpen` / `toggleGear`.
4. Implémente strictement la spec :
   - panneau gauche (intensité + intention + ton) ;
   - centre (barre d'outils + grille, cartes restylées) ;
   - panneau droit à onglets Scène / Réglages / Prompt (Instruction / Réglages au palier d'édition) ;
   - barre de lancement ancrée ;
   - journal retiré de l'écran ;
   - `.seg` sans aplat d'accent dans `screens.css` ;
   - `Ctrl+Entrée`.
   
   Aucun changement backend, aucune valeur en dur hors `tokens.css`, code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` ;
   - sous-agents `verificateur` et `gardien-invariants` ;
   - puis un audit `audit-ux-ui` **en vrai**, avec des captures à 1440 et 1024 pour chaque état du critère de sortie.
6. Un seul commit : `ui(produire): three-panel develop layout (design-pass screen-3b)`.
7. Rends-moi les captures et les findings. N'utilise pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-3b-produire-refonte.md` ---
(coller ici le fichier « 03 - Produire - design-pass.md »)
