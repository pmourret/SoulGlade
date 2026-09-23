Chantier : refonte de l'Éditeur de pose, écran dédié et ses deux modales (écran 13 de la revue UX/UI complète). Prérequis : écran 0 livré.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md` et le design-pass de pose existant (`DOCS/design-pass/screen-6*`, §A2, §B2, §B3), qui reste la référence de comportement.
2. Crée `DOCS/design-pass/screen-13-editeur-pose.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin.
3. **Mode Plan** d'abord :
   - montre où `PoseCanvas` sépare le rendu écran du PNG exporté. Si les couleurs d'affichage et celles de l'export sont liées, **arrête-toi et dis-le-moi** ;
   - liste les sélecteurs de la fumigation et dis comment chacun est préservé ou migré ;
   - dis si `/api/pose/presets` fournit une vignette par gabarit ;
   - décris le découpage de `PoseInspector` en `JointOutline` et `SelectionPanel` sans changer la logique de sélection, d'épinglage ni de décalage.
4. Implémente strictement la spec :
   - barre d'écran avec bouton scindé et segmenté Édition · Rendu ;
   - liste des points en arbre ;
   - vue du corps et barre flottante ;
   - mains en gros plan à droite ;
   - panneau Sélection et Outils ;
   - aide des raccourcis ;
   - thème d'affichage du squelette ;
   - modales restylées ;
   - tous les états.

   Aucun changement backend. Aucune modification de logique dans `PoseCanvas`, `poseFrame`, `usePoseEditor`, `useSelection`. Code en anglais, libellés en français.
5. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` ;
   - le contrôle du PNG identique octet pour octet sur une pose de test ;
   - les sous-agents `verificateur` et `gardien-invariants` ;
   - un audit `audit-ux-ui` **en vrai** pour chaque cas du critère de sortie.
6. Un seul commit : `ui(pose-editor): workstation layout, joint outline, floating canvas toolbar (design-pass screen-13)`.
7. Rends-moi les captures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-13-editeur-pose.md` ---
(coller ici le fichier « 13 - Editeur de pose - design-pass.md »)
