# Écran 12 : Application et Journal (préférences par portée)

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 12 - Application.dc.html`, option **12a** (A1 section ComfyUI, A2 activation du contenu adulte, A3 journal de production). L'option 12b est écartée.

**Prérequis** : écran 0 (chrome) livré. L'icône Application de l'en-tête mène à `/app`.

Fichiers concernés :
- `src/screens/ApplicationScreen.tsx`, `AdultContentSection.tsx`, `AppearanceSection.tsx`, `ComfyGauges.tsx`, `JournalScreen.tsx` ;
- `src/app/App.tsx` et `routes.ts` (sous-routes) ;
- les fumigations de l'application, du contenu adulte, de l'apparence et du journal.

## Invariants rappelés

- **Une seule porte** pour activer ou désactiver le contenu adulte : cette section. Aucun interrupteur global : c'est le réglage du **personnage ouvert**, qui est nommé.
- L'activation exige de **recopier le mot ARMER**. La désactivation confirme et **ne supprime rien**.
- Un pack sans graphe d'édition le dit **avant** l'interrupteur (`tool.reason`), et l'activation reste permise.
- **Toute action lourde confirme** avec le texte actuel, mot pour mot : décharger (ComfyUI reste en ligne), redémarrer le serveur, arrêter (serveur ou ComfyUI, arrêt non propre sous Windows).
- `useProcessControls` reste la source unique d'arrêter et redémarrer (partagée avec l'en-tête et le bandeau de panne).
- Sondes à 2 s **sur cet écran seulement** (`SCREEN_PROBE_MS`), comportement actuel.
- Le journal de production reste le journal du **personnage ouvert**, rechargé à chaque fin de batch. Les messages serveur s'affichent tels quels.

## S : Structure

### S1. Routes

- `/app` : section par défaut **ComfyUI**.
- `/app/:section` avec `section` ∈ `server`, `comfy`, `adult`, `appearance`, `journal`, `log`.
- `/app/journal` reste l'adresse du journal de production (compatibilité des liens existants).
- La navigation de gauche fait des `navigate` (replace). Le bouton Précédent du navigateur ne rejoue pas chaque clic de section.

### S2. Grille

```
[ navigation 260 px, fond --panel ][ section, padding 28px 40px, max-width 880px ]
```

Le modèle `.wrap` disparaît. Le journal de production (S7) ignore le `max-width` et prend toute la largeur.

### S3. Navigation (gauche)

- Titre « Application » 17 px 650.
- **Trois groupes**, titres en capitales 10,5 px :
  - **Machine** : Serveur web local · ComfyUI ;
  - **Personnage · {nom}** : Contenu adulte · Apparence. Le nom vient de `sheet.name`. Pas de personnage ouvert : groupe désactivé, avec « Aucun personnage ouvert » ;
  - **Journaux** : Productions · Serveur.
- Chaque entrée : libellé 13 px et, à droite, un **état** en 11,5 px avec sa forme :
  - Serveur : point `--ok` « actif » ;
  - ComfyUI : point `--ok` « en ligne » / losange `--danger` « hors ligne » ;
  - Contenu adulte : « activé » en `--warn-txt` / « désactivé » en `--dim2` ;
  - Productions : nombre de lignes ; Serveur : nombre de lignes de la session.
- Entrée active : `--panel3` + `inset 2px 0 0 var(--acc)` + 600.
- `<nav aria-label="Sections de l'application">` avec `aria-current="page"`.
- Pied : « Les réglages d'une génération sont sur Produire, dans le panneau des réglages. » en 12 px `--dim2`, avec un lien vers Produire.

### S4. Modèle de section (commun)

1. **En-tête** : titre 22 px 650 + **pastille d'état** (même famille que S3), puis une phrase de portée 13 px `--dim` qui dit **qui** est concerné (« Vaut pour toute la machine et tous les personnages. » ou « Pour {nom} seulement. »).
2. **Propriétés et mesures** (selon la section).
3. **Actions courantes** : un bloc de lignes (bordure `--line2`, filets de 1 px). Chaque ligne a un titre 13,5 px 600, une phrase 12,5 px `--dim` qui dit la conséquence, et à droite un bouton secondaire dont le libellé finit par « … » (il ouvre une confirmation).
   - Action indisponible : bouton désactivé et motif **écrit** sous la phrase, en `--dim2` (plus seulement un `title`).
4. **Arrêt** (Serveur, ComfyUI) : titre en capitales « Arrêt », puis un bloc à part (fond `#1f1716`, bordure `--danger-line`) avec le bouton contour `--danger-txt` « Arrêter… ». **Jamais un bouton rouge plein.**

### S5. Sections Machine

**Serveur web local** (`#btnAppRestart`, `#btnAppStop` conservés) :
- phrase de portée « Celui que tu utilises en ce moment. » ;
- Actions : Redémarrer… (conséquence : « La page se recharge d'elle-même, quelques secondes. ») ;
- Arrêt : Arrêter… (conséquence : l'onglet ne répondra plus, reprendre en ligne de commande. Texte exact : celui de la confirmation actuelle de `useProcessControls`).

**ComfyUI** (A1) (`#comfyEtat`, `#btnComfyUnload`, `#btnComfyRestart`, `#btnComfyStop` conservés) :
- **Jauges** : `ComfyGauges` restylé en grille de 3 cases égales séparées d'un filet. Chaque case : libellé 12 px `--dim`, valeur 20 px 650 `tabular-nums`, barre de 4 px, sous-ligne 11,5 px `--dim2`. **Mêmes champs** que la sonde renvoie aujourd'hui, aucun nouveau. Les libellés de la maquette sont indicatifs. Sous la grille : « Relevé toutes les 2 s sur cet écran. ».
- Hors ligne : jauges à « · » et « ComfyUI ne répond pas » à la place des sous-lignes.
- Actions : Décharger la mémoire… (conséquence : « ComfyUI **reste en ligne**… »), Redémarrer… (« Reprend en compte un custom node mis à jour. Coupe net un job en cours. »).
- Arrêt : Arrêter ComfyUI… (« Windows ne permet pas un arrêt propre… »).

### S6. Sections Personnage

**Contenu adulte** (A2) (`#nsfwBox`, `#nsfwQui`, `#nsfwManque`, `#btnNsfwOn`, `#btnNsfwOff`, `#armBoxNsfw`, `#armWord2`, `#btnArm2`, `#armClose` conservés) :
- En-tête : « Contenu adulte » + pastille « activé » (`--warn-*`) ou « désactivé » (neutre). Phrase de portée « Pour **{nom}** seulement. » + la phrase d'explication actuelle.
- Si `!tool.has_graph` : bandeau d'information neutre (carré `--warn`) **avant** les actions, avec `tool.reason` tel quel + la phrase actuelle.
- Propriétés : État, et si activé « N images dans `{sortie}` · jamais exportées ».
- Action :
  - désactivé : `--pri` « Activer… », qui ouvre la modale ;
  - activé : bouton contour `--warn` « Désactiver… », qui ouvre la confirmation actuelle.
- **Modale d'activation** : `Dialog` 500 px. Titre « Activer le contenu adulte pour {nom} » (sans tiret cadratin), phrase actuelle, liste actuelle des 4 conséquences, champ « Pour activer, recopie le mot **ARMER** » (mono, 220 px, `letter-spacing:1px`). Bordure `--warn` tant que le mot n'est pas exact, `--ok` quand il l'est. Pied : « Annuler » en lien, `--pri` « Activer », **désactivé tant que le champ ne vaut pas exactement `ARMER`**. `Entrée` n'active que dans ce cas. Le refus serveur reste affiché tel quel (toast actuel).
- Chargement et erreur : états actuels restylés (« État indisponible, le serveur n'a pas répondu. » + Réessayer).

**Apparence** (`#appearanceQui` conservé) :
- `AppearanceSection` restylé, **comportement inchangé** : ses trois réglages (teinte du fond, teinte de l'accent, intensité du fond) utilisent le curseur partagé de l'écran 10 (`AdjustSlider`) si c'est compatible, sinon leur contrôle actuel restylé. Les pistes de teinte montrent le dégradé de la roue chromatique.
- À droite, un **aperçu** miniature (en-tête + contenu) teinté en direct, `aria-hidden`.
- Phrase de portée « Teintes de l'interface pour {nom} seulement. ».

### S7. Journaux

**Productions** (A3) (`#journal`, `#jFilter`, `#jInfo`, `#jt`, `data-f` conservés) :
- En-tête : « Journal de production » + « {nom} · N lignes ».
- **Filtre segmenté** à droite : Tout · OK · À revoir · Rejet, chacun avec son **compteur** calculé côté client. Actif en `--panel3` + 600 (pas `--acc` plein).
- **Tableau** pleine largeur, colonnes : Date · Scène (+ variante en `--dim2`, tronquée à 28 caractères comme aujourd'hui) · Format · Graine (mono, alignée à droite) · Score (600, aligné à droite) · Verdict · Durée (alignée à droite).
  - En-tête collant, capitales 10,5 px ; lignes de 34 px, filet `#232323`.
  - **Verdict en mots et en forme** : point `--ok` « OK », carré `--warn` « À revoir », losange `--danger` « Rejet ». Le code brut (`A_REVOIR`) n'est plus affiché. Table de correspondance côté front, valeur inconnue affichée telle quel.
- États : chargement (squelette de 8 lignes), erreur (message tel quel + Réessayer), aucune ligne (« Aucune production pour {nom} »).

**Serveur** :
- Console `pre` (`#appliLog` conservé) en pleine hauteur, fond `#0e0e0e`, mono 12 px, interligne 1,6. Horodatage en `--dim2` si les lignes en portent. Vide : « Aucune action enregistrée dans cette session. ».

### S8. États globaux

- **Prise de contrôle** (`Takeover`) : comportement actuel, restylé en plein écran neutre avec le message et un indicateur d'attente.
- **Moins de 1100 px** : la navigation passe à 200 px. Moins de 900 px : elle devient un sélecteur déroulant en tête.

## A : a11y

- `<nav>` avec `aria-current`. Un `<h1>` par section.
- Pastilles d'état : mot + forme + couleur.
- Motifs d'indisponibilité écrits dans le texte, liés par `aria-describedby`.
- Modale d'activation : focus initial sur `#armWord2` (actuel), le bouton désactivé porte `aria-describedby` vers la consigne.
- Tableau du journal : `<table>` sémantique, `<th scope="col">`.

## Dépendances

Aucune. Routes inchangées : `/api/app/*`, `/api/nsfw/state`, `/api/nsfw/arm`, `/api/journal`, sondes ComfyUI, apparence.

## Découpage

```
screens/application/
  ApplicationScreen.tsx     composition nav + section, routes /app/:section
  AppNav.tsx                S3 (présentation)
  SectionShell.tsx          S4 : en-tête, blocs d'actions, bloc d'arrêt
  ServerSection.tsx         S5
  ComfySection.tsx          S5 (ComfyGauges restylé)
  AdultContentSection.tsx   S6, déplacé et restylé, logique inchangée
  AppearanceSection.tsx     S6, déplacé et restylé, logique inchangée
  ProductionJournal.tsx     S7 (ex JournalScreen), verdictLabels.ts pur et testable
  ServerLog.tsx             S7
```

Mettre à jour les imports de `App.tsx`. Les anciens chemins de fichiers disparaissent dans le même commit.

## Critère de sortie

- `typecheck`, `build` et les fumigations de l'application, du contenu adulte, de l'apparence et du journal passent au vert. Tous les `id` listés sont préservés.
- Test unitaire de `verdictLabels.ts`.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024 :
  - ComfyUI en ligne puis hors ligne (`--no-comfy`) ;
  - Décharger désactivé pendant une production (motif lisible) ;
  - activation adulte avec un mot faux (bouton désactivé) puis juste ;
  - pack sans graphe d'édition (bandeau avant l'action) ;
  - désactivation confirmée ;
  - apparence modifiée (aperçu en direct) ;
  - journal filtré sur « À revoir » (compteurs) ;
  - journal vide ;
  - redémarrage du serveur (prise de contrôle puis rechargement) ;
  - arrivée par `/app/journal`.
- **Ne jamais tester « Arrêter » sur la session d'audit en cours** sans pouvoir relancer. Utiliser l'annulation de la confirmation pour la capture, puis un vrai arrêt en fin d'audit.
