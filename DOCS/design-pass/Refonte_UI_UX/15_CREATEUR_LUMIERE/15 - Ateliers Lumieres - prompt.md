Chantier : passe de design de l'atelier Lumières (`/bank/lights`, IT-10 chantier 7 bis). Option 15a validée : la fiche au centre, l'essai en inspecteur.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md`, `AUTOMATION/web/ui/src/styles/DESIGN.md` (section « La charte du design-pass ») et `.claude/skills/audit-ux-ui/references/`.
2. Crée `DOCS/design-pass/screen-lumieres.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit.
3. **Constats d'abord, avant tout correctif** : construis (`python AUTOMATION/tools/toolchain.py build`), lance `python AUTOMATION/web/app.py --no-comfy --no-browser --port 8290`, crée une lumière pour Léna (une propre, une du monde, une ajustée), puis mesure en Playwright à 1440 et 1024 les six constats de la section « Constats à mesurer d'abord ». Un constat par problème, chacun avec sa mesure ou sa capture. Rends-les-moi et **attends mon accord** avant de corriger.
4. **Mode Plan** ensuite :
   - liste les sélecteurs des fumigations lumières, `test_charte` et `test_cadres_ua` qui touchent cet écran, et dis comment chacun est préservé ou migré (en particulier `#btnLightNew` et `#lightsEmpty` dans l'état vide, et `#lightFooter`) ;
   - décris la variante `layout: 'column'` de `RenderTrialPanel` et confirme que la barre des Tons ne bouge pas au pixel près ;
   - propose la table de `colorName.ts` (plages de teinte OKLCH, seuils de clarté et d'intensité) et montre qu'elle retombe sur les 6 teintes de `PLATFORM/lighting.json`.
5. Implémente strictement la spec :
   - trois colonnes 260 / fiche / 340 ; liste qui ne bouge plus ; première lumière ouverte d'office ;
   - fiche : barre 48 avec Enregistrer et Retirer, bandeau de phrase fixe, corps en grille, schéma de direction à 252 ;
   - essai en colonne, bandeau « La fiche a changé depuis cet essai » ;
   - état vide sans encadré, un seul appel de création ;
   - sous 1100 px : liste à 240, essai en tiroir ;
   - **sélecteur de couleur d'effet libre** : case « Autre… » après les 6 teintes, popover avec `HueWheel` réutilisé, Clarté, Intensité, nom anglais proposé et modifiable. Le prompt ne reçoit **que des mots**, jamais une valeur de couleur. Aucun changement de schéma.
   
   Jetons seulement, aucune couleur en dur (sauf le liseré de poignée déjà nommé dans `HueWheel`) ; `rounded-card` pour une surface, `rounded-[Npx]` pour un contrôle ; aucun 13,5 px ; code en anglais, libellés en français ; aucun changement backend.
6. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py --only <tests lumières> test_charte test_cadres_ua` ;
   - le test unitaire de `colorName.ts` ;
   - les sous-agents `verificateur` et `gardien-invariants` ;
   - puis un audit `audit-ux-ui` **en vrai** pour chaque état du critère de sortie, avec Léna puis Abyssiaelle (autre thème), contrastes mesurés.
7. Un seul commit : `ui(ateliers): lights sheet in the centre, trial as inspector, free effect colour (design-pass lumieres)`.
8. Rends-moi les captures, les mesures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-lumieres.md` ---
(coller ici le fichier « 15 - Ateliers Lumieres - design-pass.md »)
