Chantier : refonte du chrome du studio (étape 1 de la revue UX/UI complète).

1. Lis `PROJET.md`, `CLAUDE.md`, `.claude/rules/frontend.md` et `AUTOMATION/web/ui/src/styles/DESIGN.md`.
2. Crée `DOCS/design-pass/screen-0-chrome.md` avec le contenu fourni ci-dessous. Il tient lieu de cadrage écrit (règle 3). Si le tableau de bord n'a pas d'entrée pour ce chantier, ajoute-la selon le skill `tableau-de-bord`, puis régénère le HTML.
3. Passe en **mode Plan** et propose le découpage avant d'écrire du code. Liste d'abord tous les sélecteurs de fumigation qui visent le chrome (`data-s`, `.tabs`, `#nTri`, `#studioNav`, `#btnFocus`, `#btnNavPli`, `#dot`, `#stTxt`, `#btnHeader*`, `#panneBar`, `#dirtyBar`) et dis comment chacun sera préservé ou migré.
4. Implémente strictement la spec :
   - `tokens.css` redéfini, `.btn.primary` neutre, `deriveTheme.ts` recalé sur le graphite ;
   - catégories + sous-barre à la place de `SideNav` ;
   - en-tête de 48 px, filet de progression, bandeaux, états.
   
   Aucun `if character ==`, aucune valeur en dur hors `tokens.css`, types d'API jamais écrits à la main. Code en anglais, libellés en français.
5. Pour la dépendance « ADULTE ARMÉ » : vérifie d'abord si `/api/character` expose déjà le NSFW. Si non, fais-en un commit backend **séparé et préalable** : lecture seule, test d'isolation entre deux personnages, `dump_openapi.py` + `toolchain.py` pour regénérer les types.
6. Vérifie :
   - `toolchain.py build` et typecheck ;
   - `run_browser_tests.py` (toutes les fumigations) et les tests Python des modules touchés ;
   - les sous-agents `verificateur` et `gardien-invariants` ;
   - puis un audit `audit-ux-ui` **en vrai**, avec des captures Playwright à 1440 et 1024 : sas, Produire (la barre de lancement doit rester alignée), lot en cours, `--no-comfy`, mode focus, contenu adulte armé.
7. Un seul commit frontend pour l'écran (plus l'éventuel commit backend préalable). Message : `ui(chrome): graphite identity + category/module bars (design-pass screen-0)`.
8. Rends-moi les captures et la liste des findings de l'audit. Ne touche pas au contenu des écrans : chacun aura son étape.

--- CONTENU DE `DOCS/design-pass/screen-0-chrome.md` ---
(coller ici le fichier « 01 - Chrome - design-pass.md »)
