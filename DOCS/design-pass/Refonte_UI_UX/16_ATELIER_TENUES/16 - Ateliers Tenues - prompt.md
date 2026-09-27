Chantier : passe de design de l'atelier Tenues (`/bank/outfits`, IT-10 chantier 6). Option 16e validée : silhouette à 16 emplacements, rangée en 7 zones, inspecteur de zone. Même squelette que les Lumières (`screen-lumieres.md`, 15a).

1. Relis `CLAUDE.md`, `.claude/rules/frontend.md`, `.claude/rules/backend.md`, `AUTOMATION/web/ui/src/styles/DESIGN.md` (« La charte du design-pass »), `AUTOMATION/tenues.py` (docstring : invariant 3) et `.claude/skills/audit-ux-ui/references/`.
2. Crée `DOCS/design-pass/screen-tenues.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit.
3. **Constats d'abord, avant tout correctif** : construis (`python AUTOMATION/tools/toolchain.py build`), lance `python AUTOMATION/web/app.py --no-comfy --no-browser --port 8290`, crée des tenues pour Léna (une propre, une du monde, une ajustée) et quelques vêtements dans Assets, puis mesure en Playwright à 1440 et 1024 les six constats de la section « Constats à mesurer d'abord ». Un constat par problème, avec sa mesure ou sa capture. Rends-les-moi et **attends mon accord** avant de corriger.
4. **Mode Plan** ensuite :
   - liste les sélecteurs des fumigations tenues, `test_charte` et `test_cadres_ua` qui touchent cet écran, et dis comment chacun est préservé ou migré (`#outfitPieces` et `#outfitGarments` changent de forme) ;
   - trouve dans la fiche du personnage le champ qui dit la morphologie (sexe, genre ou autre) ; s'il n'y en a pas, dis-le : la silhouette part alors sur « Neutre » ;
   - décris le changement backend (§ D) et prouve qu'une tenue sans `slot` se résout à l'octet près comme avant ;
   - montre `proposeSlot` sur les exemples de la table.
5. Implémente strictement la spec :
   - table `outfitSlots.ts` (16 emplacements, ordre du prompt, une/plusieurs, mots de proposition) ;
   - trois colonnes 260 / fiche / 340, première tenue ouverte d'office, état vide sans encadré ;
   - fiche : barre 48, bandeau « Ce que la scène reçoit » fixe (fragment actif surligné sans padding), silhouette et 7 cartes de zone ;
   - inspecteur de zone : lignes d'emplacement, ligne ouverte avec porté, proposés, autres, écrire + Améliorer ; remplacement annulable ;
   - tenue d'avant les emplacements : bandeau de rangement, « Ranger d'après les fragments », rendu inchangé tant qu'elle n'est pas rangée ;
   - silhouette Féminine / Masculine / Neutre, purement visuelle, retenue par personnage en `localStorage` ;
   - sous 1100 px : liste à 240, inspecteur de zone en tiroir.
   
   Backend : **seulement** `slot` dans `OutfitPiece` et `EMPLACEMENTS` dans `tenues.py`, `texte` et `resoudre` inchangés. Jetons seulement, aucune couleur en dur ; `rounded-card` pour une surface, `rounded-[Npx]` pour un contrôle ; aucun 13,5 px ; code en anglais, libellés en français.
6. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py --only <tests tenues> test_charte test_cadres_ua` ;
   - `tests/test_tenues.py` (dont l'égalité de `EMPLACEMENTS` avec la table de l'écran) et les tests unitaires de `outfitSlots.ts` ;
   - les sous-agents `verificateur` et `gardien-invariants` (invariant 3 des tenues) ;
   - puis un audit `audit-ux-ui` **en vrai** pour chaque état du critère de sortie, avec Léna puis Abyssiaelle, contrastes mesurés.
7. Deux commits : `api(tenues): keep a piece's slot (design-pass tenues)` puis `ui(ateliers): outfits on a silhouette, slots by body zone (design-pass tenues)`.
8. Rends-moi les captures, les mesures et les findings. Pas de tiret cadratin dans tes explications.

--- CONTENU DE `DOCS/design-pass/screen-tenues.md` ---
(coller ici le fichier « 16 - Ateliers Tenues - design-pass.md »)
