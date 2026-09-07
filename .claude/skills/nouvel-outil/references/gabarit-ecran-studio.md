# Gabarit d'un écran ou module de studio (patron 2)

Sections déplacées verbatim depuis `SKILL.md` le 2026-09-07, dans leur
ordre d'origine. Le corps du skill garde la décision — quel patron,
quelle couche, quel `scope` — cette référence porte la procédure, à lire
une fois qu'on sait qu'on fait un patron 2.

### Repérer avant d'écrire

Chercher l'existant avant d'inventer : un composant partagé dans `chrome/`
qui fait déjà ce qu'il faut (`LightboxContext`, `ConfirmContext`,
`ToastContext`, `HintLayer`, `UndoRedoButtons` de `pose-editor/` — générique
malgré son dossier, sans couplage à la pose), un contrat backend déjà posé
pour un besoin voisin. Un composant partagé cassé ou incomplet se répare
plutôt que de se contourner par une copie locale — trouvé en vérifiant,
pas en supposant (le Lightbox n'avait plus aucun style depuis la migration
React, découvert en cliquant dessus pour de vrai, pas en le lisant).

### Découpage de l'écran (frontend.md, rappelé ici car central au gabarit)

    Screen.tsx     composition et mise en page — il rend, il ne décide pas
    useXxx.ts      l'état et les gestes : chargement, mutations, clavier
    Xxx.tsx        présentation pure — props + callbacks, aucun appel API

Une structure fixe du modèle/node (bornes d'un node ComfyUI, topologie d'un
squelette) va dans son propre fichier, mirroré depuis le Python — ce n'est
PAS un seuil métier en dur (`CLAUDE.md` §4 ne s'applique pas à une
constante du modèle, seulement à une décision de qualité/métier).

### Construction en étapes séparées, jamais un big-bang

1. **Fondation backend** — route(s) + service(s) neufs, jamais de logique
   métier dans le router (`.claude/rules/backend.md`). Si l'écran a un
   rendu/aperçu : distinguer explicitement une fonction NON-DESTRUCTIVE
   (aperçu, jamais d'écriture sur l'original) d'une fonction de PRODUCTION
   (qui écrit réellement) — les deux peuvent partager un cœur factorisé,
   mais le contrat de chacune s'écrit noir sur blanc dans sa docstring.
   Toute exception d'un `run_in_executor` est attrapée **dans la route**
   (`backend.md` — un défaut de Starlette fait raccrocher la réponse sinon).
   Test d'isolation `character_id` écrit ET vérifié contre le studio réel
   (`python_embeded`, jamais seulement le venv de dev qui n'a pas `cv2`) si
   l'étape touche l'identité ou un rendu.
2. **Écran dédié** — le découpage ci-dessus, réutilise le design system
   commun et les composants `chrome/` partagés plutôt que d'en réinventer.
3. **Point d'entrée découvrable** — un écran atteignable seulement par une
   URL tapée à la main n'est pas fini. Une sous-vue de Banque (même patron
   Scènes/Poses/Tons) ou une entrée de patron 1 (`tools.json`) selon le cas.

Chaque étape : suite de fumigations complète rejouée verte + test
d'isolation avant de commiter ; `python AUTOMATION/tools/toolchain.py build`
avant de tester via un dashboard (lancé par `run_browser_tests.py` ou à la
main) — le serveur sert le bundle **construit**, pas les sources (piège
vécu : un écran neuf invisible parce que seul `typecheck` avait tourné,
jamais `build`). Push seulement sur demande explicite, jamais automatique
après un commit.

### Audit UX/UI systématique en fin de chantier

Le skill `audit-ux-ui` se déclenche à la fin de la construction d'un écran
neuf, **pas seulement sur demande** : vérifié EN VRAI (captures d'écran,
mesures DOM, rendu réel contre ComfyUI si le parcours touche l'identité —
voir ce skill), findings corrigés, suite rejouée verte, avant de considérer
l'écran fini. Deux bugs réels de l'éditeur d'expression (cache d'exécution
ComfyUI, aperçu périmé après changement de photo) étaient invisibles à la
lecture du code et n'ont été trouvés qu'ainsi.

### Documentation

`ROADMAP.md` reçoit une entrée par étape, avec le POURQUOI des décisions et
les bugs réels trouvés en testant (pas seulement en relisant) — c'est ce
qui permet de retrouver un piège générique (le cache d'exécution ComfyUI,
par exemple) la fois suivante sans le redécouvrir. Suivre le ton et le
niveau de détail déjà en place dans les entrées de l'éditeur de pose et de
l'éditeur d'expression.

### Checklist (patron 2)

- [ ] Repéré ce qui existe déjà (composants `chrome/`, contrat backend
      voisin) avant d'écrire — réparé plutôt que contourné si cassé
- [ ] Mode Plan pour toute décision multi-fichier, accord obtenu avant le
      code
- [ ] Étapes séparées, un commit thématique par étape
- [ ] Fonctions non-destructives et de production distinguées si l'écran
      touche un rendu
- [ ] Exceptions de `run_in_executor` attrapées dans la route
- [ ] Test d'isolation `character_id`, vérifié contre le studio réel si
      identité/rendu impliqués
- [ ] `toolchain.py build` avant tout test via dashboard
- [ ] Suite complète de fumigations verte avant chaque commit
- [ ] Point d'entrée découvrable ajouté (sous-vue Banque ou `tools.json`)
- [ ] Audit UX/UI (`audit-ux-ui`) passé et ses findings corrigés
- [ ] `ROADMAP.md` documenté, étape par étape
- [ ] Push seulement si demandé explicitement

