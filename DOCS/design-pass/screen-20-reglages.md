# Écran 20 : Produire, onglet Réglages (titres à l'échelle, explications courtes et à la demande)

Périmètre validé par l'utilisateur le 2026-09-27. Maquette : `Revue UX 20 - Produire Reglages.dc.html`, option **20b**, avec la demande explicite : **moins de texte, des explications simples, claires et précises** (table « Les explications réécrites »). L'option 20a est écartée.

Route : `/produce`, inspecteur, onglet Réglages. Fichiers : `src/screens/produce/SettingsPanel.tsx`, `src/screens/produce/settings.ts` ; fumigations de Produire, `test_charte`, `test_cadres_ua`.

## Constats à mesurer d'abord

À confirmer en capture Playwright à 1440 et 1024 et par `getComputedStyle`, un constat par problème :

1. **Deux titres différents depuis les `<label>` du 27/09** : curseur, liste, nombre en `<label>` 13,5 px 600 ; interrupteur en `<label>` qui englobe un `<b>`, donc 13,5 px 700. Mesurer `font-weight` des deux.
2. **13,5 px** sur tous les titres de réglage, hors de l'échelle.
3. **Badge « mesuré » à 10 px**, sous le plus petit pas (10,5).
4. **Réglage sans effet à `opacity:.42`** : contraste du titre et de l'explication sous 4,5:1 (mesurer).
5. **Marqueur de repli ▸ en `--acc`**, que la charte réserve à la sélection.
6. **Longueur** : hauteur de « Peau et détail » déplié contre la hauteur de l'inspecteur à 900 px.
7. **Le coût d'un interrupteur n'est jamais affiché** : `SettingRow` ne rend `cout` que pour un curseur (« Reprise des mains » : +35 s invisible).
8. **Le badge se coupe sur deux lignes** (« jamais mesuré » dans 340 px).

## Invariants rappelés

- Tout contrôle pilote quelque chose de réel (règle de `settings.ts`). Aucun réglage ajouté ni retiré.
- Les valeurs mesurées ont **une** source : `config.json` via `/api/config`.
- Le `<label for>` reste (acquis a11y du 27/09).
- Un écart se dit **trois fois** : titre et valeur en `--warn-txt`, champ cerclé, valeur mesurée écrite dans le badge.
- `deviationCount` et le compteur de l'onglet ne changent pas.

## S : Structure

### S1. Tête du panneau

1. Ligne actuelle : « N réglages modifiés » (`#gearDiff`) et « Revenir aux valeurs mesurées » (`#btnReset`).
2. **Introduction réduite à une ligne**, 12 px `--dim2` : « Badge **mesuré** : valeur validée par les tests. S'en écarter est un choix. »
3. **Segmenté « Explications : Toutes · Écarts seulement »** (`.seg`, `role="radiogroup"`), retenu en `localStorage` (`studio.reglages-explications`). Défaut : **Toutes**.

### S2. Ligne de réglage

- **Titre** : `<label for>` 13 px 600, **tous types**. Pour un interrupteur, le `<label>` englobe la case et le texte, **sans `<b>`**.
- **Ligne de tête** (curseur) : titre `flex:1; min-width:0` (c'est lui qui passe à la ligne), valeur 13 px 600 `tabular-nums`, badge.
- **Badge** : 10,5 px, 600, capitales, `.06em`, `flex:none`, `white-space:nowrap`. Textes inchangés : « mesuré », « mesuré 0.30 », « jamais mesuré ». Un **interrupteur écarté** gagne un badge « mesuré : actif » / « mesuré : coupé » (même famille `--warn-*`), qu'il n'avait pas.
- **Piste** : inchangée ; le repère `--ok` n'est dessiné que s'il existe une valeur mesurée (existant).
- **Bornes** : 11 px `--dim2` (existant).
- **Explication** (`data-rgq`) : `quoi` en 12,5 px `--dim`, puis `cout` (`data-cout`) en 12,5 px `--dim2` sur sa ligne, **pour tous les types** (interrupteurs compris).
- **Sans effet** (interrupteur maître coupé) : plus d'opacité. Titre et explication gardent leur contraste ; le curseur est `disabled` ; une ligne 12 px `--warn-txt` dit « Sans effet : {maître} est coupée. »
- **Indisponible** (`noqc` au niveau NSFW) : case `disabled`, la raison vient de `cout` ; le `title` au survol et le paragraphe en double disparaissent.

### S3. « Écarts seulement »

- Un réglage **à sa valeur mesurée** ne montre que sa ligne de tête (et sa piste) : `quoi` et `cout` passent en `sr-only`, **toujours dans le DOM** et liés au champ par `aria-describedby`.
- Un réglage **modifié** garde son explication et son coût visibles.
- Le réglage qui a le **focus** montre son explication (`:focus-within`).
- Un réglage sans valeur de référence (champs du lot, « jamais mesuré ») se comporte comme un réglage à sa valeur.

### S4. Sections

- Titre `.lab` (existant), « N modifiés » en 11 px `--warn-txt` (existant).
- Marqueur de repli ▸ / ▾ en `--dim`.

### S5. Les textes (`settings.ts`)

Règle d'écriture, à tenir pour tout réglage ajouté plus tard : **`quoi` = ce que ça fait, une phrase courte ; `cout` = ce que ça coûte, quelques mots, chiffré quand une mesure existe.** Pas de justification, pas d'historique ; les mesures restent.

| Section | Réglage | `quoi` | `cout` |
|---|---|---|---|
| Ce qu'on produit | Images par scène | Nombre de photos par scène cochée, chacune avec sa graine. | |
| | Format imposé | Impose un cadrage à tout le lot. Vide : chaque scène garde le sien. | |
| | Plafond du lot | Arrête le lot après ce nombre d'images. | |
| | Graine fixe | Rejoue la même image. Vide : aléatoire. | Seul moyen de comparer deux réglages. |
| | Ignorer les variantes | Ne garde que la version principale de chaque scène. | |
| Fidélité et calcul | Liberté du modèle | Force avec laquelle le modèle suit le texte. | Au-delà de 3 : peau lissée, rendu artificiel. |
| | Temps de calcul | Nombre de passes sur l'image. | Au-delà de 20 : plus lent, sans gain visible. |
| Peau et détail | Repasse de texture | Seconde passe qui redonne le grain de peau. Principal remède au rendu IA. | |
| | Ampleur de la repasse | Jusqu'où la repasse modifie l'image. | Trop haut : elle réinvente, le personnage change. |
| | Reprise du visage | Refait le visage en grand puis le recolle. Sauve yeux et bouche en plan large. | |
| | Reprise des mains | Refait chaque main en grand. Mains ratées : 96 % sans, 36 % avec (mesuré le 09/09). | +35 s par image. |
| | Ampleur de la reprise des mains | Jusqu'où la main peut être redessinée. | Jamais mesuré : 0.5 est un point de départ. |
| | Passage en 2K | Agrandit puis ramène en 2K. | +31 % de netteté, +4 s. |
| | Accentuation | Netteté finale. | Trop haut : cheveux hérissés, contours qui croustillent. |
| Vie et matière | Expression du visage | Fait varier la mine selon le ton. Sans elle, même visage sur toutes les photos. | |
| | Grain de téléphone | Bruit d'un vrai capteur, surtout dans les ombres : effet photo prise sur le vif. | |
| | Mise à la taille de publication | Redimensionne à la taille du réseau visé. Coupé : taille de génération. | |
| | Ancien grain du graphe | Laissé à 0 volontairement. | Bruit faux (couleur, uniforme). Remplacé par le grain de téléphone. |
| Contrôle | Sans contrôle d'identité | Ne mesure ni ne trie : tout va dans « à revoir ». Pour les essais de rendu. | Indisponible en NSFW : le verdict décide quoi éditer. |
| Édition NSFW | Générer l'image avant de l'éditer | Produit d'abord une image Soft, puis l'édite. Seulement si aucune image validée n'existe. | +55 s par image. |
| | Passes d'édition | Modèle rapide, prévu pour 4 à 8 passes. | Plus : plus lent, pas meilleur. |
| | Adhérence à l'instruction | Imposée à 1.0 par le modèle rapide. | Plus haut : l'image se dégrade. |
| | Surface de travail | Taille de travail de l'édition. | Au-delà de 1,15 MP : zone éditée molle (mesuré). |
| | Re-rendu du visage | Force de reconstruction du visage après l'édition. | Plus haut qu'en SFW, volontairement. |

Libellés (`label`), bornes (`bas`, `haut`) et placeholders (`vide`) : **inchangés**. Les commentaires de `settings.ts` gardent les mesures détaillées que les textes affichés ont quittées.

## A : a11y

- `aria-describedby` de chaque champ pointe sur `quoi` et `cout`, visibles ou non.
- Segmenté : `role="radiogroup"`, flèches.
- Contrastes : plus aucune opacité sur du texte ; texte 4,5:1, interface 3:1, vérifiés aussi avec Abyssiaelle.
- Aucun 13,5 px, aucun 10 px.

## Dépendances

Aucune côté serveur.

## Critère de sortie

- `typecheck`, `build`, `run_browser_tests.py --only` sur les fumigations de Produire (celles qui lisent « mesuré », « jamais mesuré », `#m_*`, `#v_*`, `data-cout`, `data-rgq`), `test_charte`, `test_cadres_ua` : au vert. Crochets conservés : `#gearPanel`, `#gearDiff`, `#btnReset`, `#gearBody`, `data-rgs`, `data-niveau`, `data-rg`, `data-id`, `data-rgq`, `data-cout`, `data-sec`, `data-mes`, `data-off`, `data-noref`, `#v_*`, `#m_*`, les `id` des champs. Si une fumigation lit l'ancien texte d'une explication, la mettre à jour dans le même commit et le dire.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024, DOM mesuré :
  - titres : même `font-size` (13) et même `font-weight` (600) pour les quatre types ;
  - un curseur écarté, un interrupteur écarté (badge), un réglage sans effet (contraste mesuré), un réglage jamais mesuré (badge sur une ligne) ;
  - « Écarts seulement » : hauteur de « Peau et détail » avant et après ; focus clavier qui fait apparaître l'explication ; lecteur d'écran qui lit l'explication masquée ;
  - le choix retenu au rechargement ;
  - niveau qui édite (section Édition NSFW) et `noqc` indisponible.
