---
name: nouvel-outil
description: A utiliser pour ajouter un outil ou un ecran au studio - un raccourci du panel (tools.json + rail) qui pointe vers une surface existante, OU un ecran/module neuf construit de zero (gabarit pose/expression : backend en etapes, ecran dedie, point d'entree, audit UX/UI). Decider lequel avant d'ecrire du code.
---

# Ajouter un outil ou un écran au studio

## Deux patrons, pas un seul

Le mot « outil » a recouvert deux choses différentes dans ce studio :

1. **Outil du panel** (`tools.json` + rail) — un raccourci déclaré, affiché
   dans le rail d'outils de Produire, qui pointe vers une **surface qui
   existe déjà** (une sous-vue de la Banque, un écran de la Revue).
   N'implémente rien de nouveau par lui-même.
2. **Écran/module de studio** — un vrai module neuf, backend + écran React,
   construit de zéro. Le gabarit suivi trois fois de suite (éditeur de
   pose, éditeur d'expression, sous-vue Tons de la Banque) — voir le
   patron 2 plus bas, désormais **le gabarit standard** pour tout nouvel
   outil du studio (créateur de lumière, importeur d'assets, etc.).

Décider LEQUEL avant d'écrire une ligne : un outil qui n'existe encore nulle
part suit le patron 2. Une fois construit, il peut ENSUITE gagner une
entrée de patron 1 si Produire doit y accéder en un clic — le patron 1 ne
remplace jamais le patron 2, il s'ajoute par-dessus une fois la surface
prête (voir « Point d'entrée découvrable » plus bas).

## Patron 1 — Outil du panel (tools.json + rail)

### Décider la portée avant d'écrire du code

Deux questions distinctes, à ne pas confondre (ADR-0017 : quatre couches de
responsabilité — voir aussi `DOCS/architecture.md` §5) :

1. **Quelle couche implémente l'outil ?**
   - **Couche plateforme** : agnostique du modèle, s'applique à une image
     déjà produite (ex. éditeur de pose, éditeur d'image). Ne dépend
     d'aucune famille de modèle — vit correctement hors de `identity/`
   - **Couche pack** : liée à la famille de modèle (ex. modification live
     par IA, `edit_workflow`, ADR-0013). Son graphe est injecté par le
     mécanisme d'identité d'un pack précis ; un pack qui n'a pas encore ce
     graphe n'a pas l'outil, jamais un repli sur celui d'un autre pack
   - Seules ces deux couches ont le droit de porter un graphe ComfyUI ;
     monde et personnage n'en portent jamais
2. **Qui voit l'outil dans son panel ?** (`scope` de `tools.json`, orthogonal
   à la couche ci-dessus)
   - **`scope: global`** : utile à tout univers — un outil plateforme l'est
     presque toujours ; un outil pack peut l'être aussi (ex. modification
     live par IA, globale dans `tools.json` mais implémentée par la couche
     pack). Ne pas dupliquer un outil global existant pour un univers en
     particulier — vérifier `DOCS/architecture.md` §5 avant d'en créer un nouveau
   - **`scope: universe`** : n'a de sens que dans ce monde (ex. un éditeur
     de lore pour un univers narratif). Reste déclaré uniquement dans
     le(s) `tools.json` de cet/ces univers

Un outil peut démarrer `scope: universe` et devenir `global` plus tard si un
second univers en a l'usage — mais ce n'est jamais l'inverse (ne pas
construire "global" par précaution si un seul univers l'utilise aujourd'hui).

### Contrat

Une entrée de `tools.json` (`PACKS/<nom>/tools.json`) : `id`, `label`,
`scope` (`global`/`universe`), `surface` — la SEULE chose que le rail sait
interpréter (`chrome/ToolRail.tsx`, table des surfaces connues), jamais un
`if` sur le personnage ou l'univers (`CLAUDE.md` §7). Une surface absente de
cette table rend un bouton inerte qui dit pourquoi — on n'invente jamais une
destination qui n'existe pas.

Si l'outil touche un workflow ComfyUI (création, édition, appel), suivre le
skill `workflow-comfyui` pour le contrat de lecture des workflows et la
validation (`wf_check.py`).

### Enregistrement

Ajouter l'entrée dans le(s) `tools.json` concerné(s) plutôt que de modifier
le Dashboard au cas par cas pour un personnage ou un univers particulier.
C'est cette étape qui rend l'outil visible dans le panel — un outil
implémenté mais non enregistré n'apparaît nulle part, et c'est voulu
(permet de merger le code avant de l'activer).

### Checklist (patron 1)

- [ ] Portée décidée (global vs univers spécifique), pas de duplication
      d'un outil global existant
- [ ] `surface` pointe vers un écran qui existe réellement
- [ ] Enregistré dans le(s) `tools.json` concerné(s)

## Patron 2 — Écran/module de studio (gabarit standard)

### Mode Plan avant tout code multi-fichier

Dès qu'une tâche touche plus d'un fichier ou une décision d'architecture
(articulation du backend, où vit l'état, quel composant partagé réutiliser),
passer en mode Plan et obtenir l'accord avant d'écrire du code.

Le gabarit complet — repérage de l'existant, découpage de l'écran,
construction en étapes, audit UX/UI, documentation, checklist — est dans
`references/gabarit-ecran-studio.md`. Le lire avant d'écrire la première
ligne de l'étape 1.

## Isolation des données (les deux patrons)

Un outil ou un écran qui lit/écrit des données de personnage passe toujours
par `character_id` explicite — jamais une variable globale ou un contexte
implicite qui suppose "le personnage courant". Écrire un test qui aurait
détecté un mélange de données entre deux personnages si l'outil manipule
des données par personnage (`CLAUDE.md`, section Méthode ; `backend.md`).
