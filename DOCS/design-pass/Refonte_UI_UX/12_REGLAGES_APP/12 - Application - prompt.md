Chantier : refonte de l'Application et du Journal (étape 12, dernière étape de la revue UX/UI complète). Prérequis : écran 0 livré. Le curseur partagé de l'écran 10 (`AdjustSlider`) est réutilisé s'il est déjà livré.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md`, `chrome/useProcessControls.tsx` et ADR-0010.
2. Crée `DOCS/design-pass/screen-12-application.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - liste tous les `id` et attributs lus par les fumigations de ces écrans, et dis comment chacun est préservé ;
   - décris les sous-routes `/app/:section` et la compatibilité de `/app/journal` ;
   - liste les champs réellement renvoyés par la sonde ComfyUI (`ComfyGauges`) : les jauges n'affichent que ceux-là ;
   - dis si `AppearanceSection` peut utiliser `AdjustSlider` sans changer son comportement.
4. Implémente strictement la spec :
   - navigation par portée (Machine, Personnage, Journaux) ;
   - modèle de section avec actions et bloc d'arrêt séparé ;
   - motifs d'indisponibilité écrits ;
   - modale ARMER avec bouton désactivé tant que le mot est faux ;
   - journal en tableau avec verdicts en mots et compteurs ;
   - console serveur ;
   - tous les états.

   Aucun changement backend. Textes de confirmation conservés mot pour mot. Code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, tests unitaires, `run_browser_tests.py` ;
   - les sous-agents `verificateur` et `gardien-invariants` (une seule porte adulte, aucun interrupteur global) ;
   - un audit `audit-ux-ui` **en vrai** pour chaque cas du critère de sortie. Les arrêts ne se testent qu'en fin d'audit.
6. Un seul commit : `ui(app): scoped preferences, adult arming dialog, production journal table (design-pass screen-12)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-12-application.md` ---
(coller ici le fichier « 12 - Application - design-pass.md »)
