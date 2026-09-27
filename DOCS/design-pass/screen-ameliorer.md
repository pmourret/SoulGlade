# Écran 18 : « Améliorer » et panneau « Amélioration IA » (révision dans le champ)

Périmètre validé par l'utilisateur le 2026-09-27. Maquette validée : `Revue UX 18 - Amelioration IA.dc.html`, option **18b** (B1 panneau IA, B2 champ large en révision, B3 champ étroit en révision après traduction, états communs). L'option 18a est écartée.

**Référence reprise** : `screen-7c-composeur-panneaux.md` §6 (option 6a : consigne, raccourcis, portée, comparaison en bloc). Ce design-pass la complète, il ne la remplace pas.

Fichiers concernés :
- `src/chrome/EnhanceControl.tsx`, `src/chrome/WordDiff.tsx`, `src/lib/diff.ts` ;
- `src/screens/bank/composer/panels/AiPanel.tsx` ;
- **tous les appelants** d'`EnhanceControl` (composeur, Tons, Lumières, Tenues, Assets, catalogues du monde, poses, instruction d'édition de Produire) : la liste exacte sort du mode Plan ;
- les fumigations qui lisent `data-enhance-*` et `data-ai-*`, `test_charte`, `test_cadres_ua`.

## Constats à mesurer d'abord

Lus dans le code, à confirmer en capture Playwright à 1440 et 1024 avant tout correctif, un constat par problème avec sa mesure :

1. **Un bouton plein sous chaque champ** : `btn sm` sur sa ligne (`mt-[6px]`). Mesurer la hauteur ajoutée par champ, et compter les porteurs par écran.
2. **La traduction côte à côte suit la fenêtre, pas le conteneur** : `sm:grid-cols-2` dans `ProposalView`. Mesurer la largeur des deux colonnes dans un inspecteur de 340 px à 1440 (attendu : environ 150 px chacune).
3. **La comparaison en deux lignes** répète tout le texte pour quelques mots changés : mesurer la hauteur du bloc déplié sur un fragment de lumière type, à 340 et à 840.
4. **« Mots non repris »** est en `.tiny` `--dim2` : un avertissement qui se lit comme une note.
5. **Panneau IA** : consigne titrée en `.tiny` et non en `.lab` ; « Proposer » en `btn primary` taille normale ; Appliquer tout ou rien.

## Invariants rappelés

- **Rien n'est enregistré** par une proposition : Appliquer écrit dans le brouillon de l'écran qui possède le champ (`onApply`), l'enregistrement reste le sien.
- **La proposition répond pour un texte** : si la valeur du champ change par ailleurs (autre onglet, panneau IA, annulation), la révision se ferme sans rien écrire.
- **Une traduction ne se compare pas mot à mot** (aucun mot commun) : elle se montre, l'original à côté.
- **Le focus n'est jamais perdu** (audit du 27/09) : il va à la proposition quand elle arrive, revient au déclencheur après Appliquer ou Rejeter.
- **Panneau IA : un seul `onPatch`**, donc un seul Ctrl Z, quel que soit le nombre de fragments gardés.
- Routes `/api/enhance` et `/api/enhance/scene` inchangées.

## S : Structure

### S1. Le déclencheur, dans la ligne du libellé

- Chaque champ améliorable a une **ligne de tête** : `.lab` du champ à gauche, puis à droite, dans cet ordre, ce que le champ porte déjà (compteur, « modifié », Agrandir), puis **« Améliorer »**.
- « Améliorer » : bouton fantôme, 24 px de haut, texte 12 px, `rounded-[5px]`, fond `--panel3`, texte `--txt`. Libellés inchangés : « Améliorer », « Traduire » pour une instruction d'édition, « Amélioration… » / « Traduction… » pendant l'appel. `data-enhance-run` reste sur ce bouton.
- Désactivé si le champ est vide, pendant l'appel, ou ComfyUI hors ligne. Le motif reste sur l'**enveloppe** (`data-hint-text`, un bouton désactivé n'émet rien).
- Le bloc sous le champ disparaît : **plus aucune hauteur ajoutée au repos**.

### S2. La révision, dans le champ

Quand une proposition arrive et diffère du texte (`data-enhance-proposal` sur le conteneur du champ) :
- **Ligne de tête** : après le `.lab`, « · proposition de l'IA » (12 px `--txt`) ; à droite, « Voir les retraits » (bascule, `aria-pressed`), puis **Appliquer** (`data-enhance-apply`, aplat `--pri`, 24 à 26 px) et **Rejeter** (`data-enhance-reject`). Ils prennent la place d'« Améliorer ».
- **Le champ** garde sa taille et sa place. Son cadre passe à 2 px `--txt`. Il devient **lecture seule** et montre le **texte proposé** (`data-enhance-text`), les mots ajoutés sur `--diff-add-word`.
- **« Voir les retraits »** : le même paragraphe montre aussi les mots retirés, barrés sur `--diff-del-word`, à leur place (suivi de modifications, une seule séquence calculée par `lib/diff.ts`).
- Sous le champ, 12 px `--dim2` : « Lecture seule tant que la proposition est ouverte. Surligné : ajouté par l'IA. » (une fois par écran suffit ; la phrase vit dans l'aide du champ, `aria-describedby`).
- **Traduction** : pas de surlignage. Au-dessus du champ, « Traduit en anglais · Voir l'original » ; « Voir l'original » déplie le texte français en `--dim` au-dessus du champ (`aria-expanded`).
- **Mots non repris** (`data-enhance-lost`) : une ligne sous le champ en `--warn-txt`, « Mots non repris : … », ou « Mots de la traduction non repris : … » après une traduction.
- **Clavier**, focus dans la révision : Entrée ou Ctrl Entrée = Appliquer, Échap = Rejeter.
- **Rien à changer** (`data-enhance-same`) : pas de révision, la phrase actuelle sous la ligne de tête.
- **Erreur** : sous la ligne de tête, `role="alert"`, `--danger-txt`. Elle répond pour un texte et part quand il change (existant).

### S3. Composant

- `EnhanceControl` devient deux pièces :
  - `useEnhance({ kind, value, onApply, enhancer, disabled })` : l'appel, l'état (repos, appel, proposition, erreur), la règle « répond pour un texte », le focus ;
  - `EnhanceField` : ligne de tête + champ (`input` ou `textarea`) + révision, pour le cas courant. Les appelants au champ particulier (composeur `PromptField`, instruction d'édition) utilisent `useEnhance` avec `EnhanceTrigger` et `RevisionView`.
- `ProposalView` n'a plus de grille `sm:grid-cols-2` : sa seule forme restante est dans le panneau IA (§ S4), qui gère sa largeur par conteneur.
- `WordDiff` gagne `WordRun` : une séquence unique `same | del | add` (suivi), à côté de `WordLine` (un côté). `lib/diff.ts` rend les deux depuis le même LCS.

### S4. Panneau « Amélioration IA »

1. **Demande**, une rangée : consigne (`#aiInstruction`, `.lab` « Consigne (facultative) » au-dessus), puis le segmenté **Portée** (`.seg`, `data-ai-scope`), puis **Proposer** (`data-ai-run`, `btn sm`, secondaire : le primaire de l'écran reste Enregistrer).
2. **Raccourcis** sous la rangée, en pastilles (`aria-pressed`, coche quand la consigne est la leur). Inchangés.
3. **Proposition** (`data-ai-proposal`) : un **tableau** en trois colonnes `132px 1fr 1fr` : Fragment · − Actuel · + Proposé.
   - Tête : `.lab` des trois colonnes. Au-dessus du tableau, la phrase `data-ai-summary` « 3 fragments changent : … ».
   - Une ligne par fragment changé (`data-ai-part`) : colonne 1, la case **Garder** (`<input type="checkbox">`, cochée par défaut, `data-ai-keep`) puis le `.lab` du fragment ; colonne 2, l'actuel, mots retirés sur `--diff-del-word`, fond `--diff-del-bg` ; colonne 3, le proposé, mots ajoutés sur `--diff-add-word`, fond `--diff-add-bg`.
   - Fragment décoché : la ligne passe à 50 % d'opacité, et la colonne 1 dit « écarté, reste tel quel ». L'état est dit en texte.
   - Traduction : colonnes 2 et 3 sans surlignage, en-tête « + Proposé, traduit ».
   - Mots non repris : sous le proposé de la ligne, en `--warn-txt`.
   - **Conteneur de moins de 720 px** (1024, colonne étroite) : chaque ligne s'empile, Actuel au-dessus de Proposé (container query, jamais un `sm:` de fenêtre).
4. **Pied** 52 px : **« Appliquer N fragments »** (`data-ai-apply`, N = cases cochées, désactivé à 0), « Proposer autre chose » (`data-ai-vary`), « Rejeter » (`data-ai-reject`). Appliquer écrit les fragments gardés en **un seul** `onPatch`.
5. Scène liée au monde : demande désactivée avec la note actuelle. Fragment vide : « Rien à améliorer : ce fragment est vide. » (existant).

## A : a11y

- Révision : le conteneur prend le focus (`tabIndex=-1`) avec `aria-label` « Proposition de l'IA pour {champ} » ; le champ en lecture seule porte `aria-readonly`. Mots ajoutés et retirés : texte masqué « ajouté » / « retiré » (la couleur n'est jamais seule, en plus du barré).
- Panneau IA : le tableau est une vraie `table` ou une grille `role="table"` avec en-têtes de colonne ; la case Garder a un `<label>` qui nomme le fragment.
- Focus : proposition à l'arrivée, déclencheur au retour (Appliquer, Rejeter, Échap).
- Contrastes texte 4,5:1 sur `--diff-*-bg` et `--diff-*-word`, interface 3:1, vérifiés aussi avec Abyssiaelle. Rayons : conteneurs en `rounded-card`, mots surlignés `rounded-[2px]`, boutons `rounded-[5px]`. Aucun 13,5 px.

## Dépendances

Aucune côté serveur.

## Découpage

```
chrome/
  EnhanceControl.tsx   -> useEnhance.ts (état, appel, focus) + EnhanceTrigger.tsx + RevisionView.tsx + EnhanceField.tsx
  WordDiff.tsx         WordLine (un côté) + WordRun (suivi, une séquence)
lib/diff.ts            diffWords rend aussi la séquence unique
screens/bank/composer/panels/AiPanel.tsx   demande en rangée, tableau, cases Garder, pied
+ chaque appelant d'EnhanceControl, migré vers EnhanceField ou useEnhance
```

## Critère de sortie

- `typecheck`, `build`, `run_browser_tests.py --only` sur toutes les fumigations qui touchent un champ améliorable et le panneau IA, `test_charte`, `test_cadres_ua` : au vert. Crochets préservés : `data-enhance`, `data-enhance-run`, `data-enhance-proposal`, `data-enhance-apply`, `data-enhance-reject`, `data-enhance-text`, `data-enhance-lost`, `data-enhance-same`, `data-ai-panel`, `#aiInstruction`, `data-ai-scope`, `data-ai-run`, `data-ai-proposal`, `data-ai-summary`, `data-ai-part`, `data-ai-apply`, `data-ai-vary`, `data-ai-reject`. Nouveau : `data-ai-keep`.
- Tests unitaires de `lib/diff.ts` : séquence unique cohérente avec les deux côtés (même LCS), texte identique, ajout seul, retrait seul.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024, DOM mesuré, avec Léna puis Abyssiaelle :
  - un champ large (composeur) et un champ étroit (inspecteur 340 des Lumières ou des Assets) : repos, appel, révision, « Voir les retraits », Appliquer, Rejeter, Échap ;
  - une traduction (instruction d'édition, puis un texte français dans un inspecteur) : « Voir l'original », mots de la traduction non repris ;
  - rien à changer ; erreur ; `--no-comfy` ;
  - valeur modifiée ailleurs pendant une révision (elle se ferme) ;
  - panneau IA : 3 fragments, un décoché, « Appliquer 2 fragments », un seul Ctrl Z ; « Proposer autre chose » ; portée à un seul fragment ; à 1024 (lignes empilées) ;
  - focus suivi au clavier à chaque étape.
