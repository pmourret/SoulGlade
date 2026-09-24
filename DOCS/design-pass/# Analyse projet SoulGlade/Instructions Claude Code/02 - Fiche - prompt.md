Chantier : refonte de la Fiche personnage (étape 2 de la revue UX/UI complète). Prérequis : l'écran 0 (chrome) est livré.

1. Relis `CLAUDE.md` et `.claude/rules/frontend.md`, puis `DOCS/design-pass/screen-0-chrome.md` pour les tokens.
2. Crée `DOCS/design-pass/screen-2-fiche.md` avec le contenu fourni ci-dessous. C'est le cadrage écrit. Mets à jour le tableau de bord si besoin (skill `tableau-de-bord`).
3. **Mode Plan** d'abord. Liste les sélecteurs de fumigation de la fiche (`#fiche`, `#ficheAutres`, `#ficheRetry`, `#registre[data-vue=fiche]`) et vérifie les clés réelles de `state.counts` avant d'écrire la section Production.
4. **Commit backend séparé et préalable** : la route du portrait de base gelée, décrite dans la section « Dépendance ». Elle est liée au personnage courant, ne prend jamais un nom de fichier en paramètre, et vient avec un test d'isolation entre deux personnages, chemin d'erreur compris. Régénère ensuite les types OpenAPI. Lance les sous-agents `verificateur` et `gardien-invariants` sur ce commit. Si un invariant ou l'isolation du 29/08 s'y oppose, **arrête-toi et dis-le-moi** : la fiche se livre alors avec l'initiale.
5. Commit frontend : découpage `screens/character-sheet/` comme spécifié. La fiche reste en lecture seule. « Changer de personnage » ouvre le menu d'identité, « Régler » mène à Application : aucune seconde porte.
6. Vérifie :
   - `toolchain.py build`, typecheck, `run_browser_tests.py` ;
   - les tests Python si la route est livrée ;
   - un audit `audit-ux-ui` **en vrai**, avec des captures à 1440 et 1024 pour chaque état listé dans le critère de sortie.
7. Messages de commit :
   - backend : `api(character): character-bound frozen base thumbnail` ;
   - frontend : `ui(fiche): passport layout + property panel (design-pass screen-2)`.
8. Rends-moi les captures et les findings.

--- CONTENU DE `DOCS/design-pass/screen-2-fiche.md` ---
(coller ici le fichier « 02 - Fiche - design-pass.md »)
