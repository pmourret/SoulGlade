Chantier : passe de design de l'atelier Assets (`/bank/assets`, IT-10 chantier 5). Option 17a validée : les classes à gauche, qui sont aussi les cibles de dépôt. Même famille que les Lumières et les Tenues.

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md`, `AUTOMATION/web/ui/src/styles/DESIGN.md` (« La charte du design-pass »), `AUTOMATION/assets.py` (classes, import, invariant 7) et `.claude/skills/audit-ux-ui/references/`.
2. Crée `DOCS/design-pass/screen-assets.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit.
3. **Constats d'abord, avant tout correctif** : construis (`python AUTOMATION/tools/toolchain.py build`), lance `python AUTOMATION/web/app.py --no-comfy --no-browser --port 8290`, importe un seul asset pour Léna, puis mesure en Playwright à 1440 et 1024 les cinq constats de la section « Constats à mesurer d'abord ». Un constat par problème, avec sa mesure ou sa capture. Rends-les-moi et **attends mon accord** avant de corriger.
4. **Mode Plan** ensuite :
   - liste les sélecteurs des fumigations assets, `test_charte` et `test_cadres_ua` qui touchent cet écran, et dis comment chacun est préservé ou migré (en particulier `#assetFilter`, `#assetClass`, `#assetOwner` et `#assetImportBand`) ;
   - décris l'extension de `useFileDrop` à plusieurs cibles (une classe par cible), sans casser la banque de poses qui l'utilise ;
   - confirme qu'aucune classe n'est écrite en dur (invariant 7) : seule la table `champ` → phrase de destination existe côté écran ;
   - dis si `outfitSlots.ts` (chantier Tenues) est déjà livré ; sinon la ligne « Dans une tenue » attend.
5. Implémente strictement la spec :
   - trois colonnes 260 / grille / 340 ; un seul bouton d'import qui suit la classe ouverte (menu sur « Toutes ») ; résumé court ;
   - colonne des classes (compte, destination, « Sans fragment », « Importer pour ») ;
   - cartes avec fragment sur deux lignes, case de dépôt toujours en dernier ;
   - trois cibles de dépôt qui disent l'action en texte ;
   - carte en cours d'import dans la grille à la place du bandeau ;
   - inspecteur avec tête 48, Améliorer et Analyser sur une rangée, table Classe / Dans une tenue / Fichier, pied 52 ;
   - sous 1100 px : classes en pastilles, inspecteur en tiroir.
   
   Aucun changement backend. Jetons seulement, aucune couleur en dur ; `rounded-card` pour une surface, `rounded-[Npx]` pour un contrôle ; aucun 13,5 px ; code en anglais, libellés en français.
6. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py --only <tests assets> <tests poses> test_charte test_cadres_ua` (la banque de poses partage `useFileDrop`) ;
   - les sous-agents `verificateur` et `gardien-invariants` (invariant 7) ;
   - puis un audit `audit-ux-ui` **en vrai** pour chaque état du critère de sortie, avec Léna puis Abyssiaelle, contrastes mesurés.
7. Un seul commit : `ui(ateliers): assets with classes as drop targets (design-pass assets)`.
8. Rends-moi les captures, les mesures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-assets.md` ---
(coller ici le fichier « 17 - Ateliers Assets - design-pass.md »)
