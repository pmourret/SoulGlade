Chantier : refonte du registre des personnages et du wizard de création (écran 14, dernier écran de la revue UX/UI complète). Prérequis : écrans 0, 2 et 11 livrés.

1. Relis `CLAUDE.md` (§3, §8.8, §8.11), `.claude/rules/frontend.md`, ADR-0012 et `DOCS/design-pass/screen-1-wizard.md`.
2. Crée `DOCS/design-pass/screen-14-personnages.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - dis si la route de base gelée de l'écran 2 existe et si elle peut servir la base de **n'importe quel** personnage nommé par `?character=` sans fuite vers un autre (code et test d'isolation). Si c'est douteux, reste sur l'initiale et dis-le-moi ;
   - liste ce que `/api/characters` renvoie réellement (style, pack, teinte d'accent) : n'affiche que cela ;
   - dis ce que fait aujourd'hui un clic sur un personnage au pack inconnu ;
   - dis où vont les portraits candidats non retenus, pour écrire une confirmation de sortie exacte ;
   - liste les sélecteurs des fumigations du registre et du wizard, et comment la fumigation du wizard passe à 5 étapes.
4. Implémente strictement la spec :
   - registre en liste avec aperçu, recherche et clavier ;
   - wizard à étapes verticales avec la nouvelle étape Identité et `slugify` réutilisé ;
   - étapes faites cliquables ;
   - Base avec segmenté, grille de candidats et zone de dépôt ;
   - fiche en construction avec la base en grand ;
   - barre du bas qui dit ce qui manque ;
   - tous les états.

   **Aucune nouvelle route.** Écritures et polling inchangés. Code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, tests unitaires, `run_browser_tests.py` ;
   - les sous-agents `verificateur` et `gardien-invariants` (sas sans navigation, pack jamais demandé, un seul écran qui écrit une fiche) ;
   - un audit `audit-ux-ui` **en vrai** pour chaque cas du critère de sortie. Les créations se font avec un identifiant de test, à supprimer ensuite.
6. Un seul commit : `ui(characters): list registry with preview, vertical-step wizard with identity step (design-pass screen-14)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-14-personnages.md` ---
(coller ici le fichier « 14 - Personnages - design-pass.md »)
