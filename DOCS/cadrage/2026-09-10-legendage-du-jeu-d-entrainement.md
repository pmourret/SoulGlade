# Légender le jeu d'entraînement

Cadrage ouvert le 2026-09-10, après l'export du premier jeu d'entraînement de
Léna. Le cadrage du 09/09 mettait le légendage **hors périmètre** ; Pierre le
rouvre, et ce fichier est la règle 3 appliquée.

## Ce qui le déclenche

La chaîne va maintenant du portrait de base au dossier prêt pour kohya. Il
reste un geste manuel entre les deux : écrire une légende par image. Sur 24
images, à la main, c'est une heure de travail que personne ne referait à
l'identique deux mois plus tard — donc un jeu d'entraînement non reproductible,
et deux LoRA non comparables au banc.

## Ce que le dépôt savait déjà, et qui change la méthode

La pratique du métier est constante : pour un LoRA d'identité, **on légende le
décor, la pose et l'expression, jamais les cheveux ni les yeux** — les traits
qui définissent le personnage doivent être appris implicitement, portés par le
mot déclencheur, et non redécrits en mots. Une légende qui décrit le visage
apprend au modèle à dépendre de la description plutôt que du jeton.

Or ce découpage existe déjà ici, et il est même verrouillé :

- `CHARACTERS/<cid>/scenes.json` porte un champ **`anchor`** nommé — pour Léna,
  « a 22-year-old French woman, long dark brown hair…, green eyes, dense
  freckles… » ;
- l'assembleur compose `préfixe + ancre + fragments de scène`
  (`runner/prompt.py`) ;
- `assert_no_face` (invariant 6) **garantit** qu'aucun fragment de scène ne
  décrit le visage — `FORBIDDEN_FACE` nomme exactement le vocabulaire que le
  métier dit de ne pas légender.

Mesuré le 10/09 sur les 24 images exportées :

```
22 portent leur prompt de génération en base
l'ancre y est présente À L'IDENTIQUE : 22/22
après substitution, vocabulaire FORBIDDEN_FACE restant : 0
```

**La légende de base est donc `prompt.replace(anchor, trigger_word)`** : une
substitution exacte, pas une heuristique, et le jeton occupe précisément le
créneau que l'identité occupait.

## À quoi ça sert, et pour qui

**Pour Pierre maintenant** : c'est le dernier obstacle entre le jeu exporté et
un LoRA entraîné, donc entre la chaîne et le chiffre qui dira si le LoRA
desserre le curseur identité/texture.

**Pour l'utilisateur cible plus tard, et pas tout de suite.** Le légendage est
sur le chemin de l'entraînement, qui n'est pas dans le parcours nominal — un
nouvel utilisateur publie sa première image sans jamais entraîner quoi que ce
soit. C'est la règle 2, dite une fois : ce chantier s'ouvre hors parcours
nominal, Pierre l'assume.

**Jamais un traitement Léna.** La méthode ne suppose rien d'autre qu'un
`anchor` dans `scenes.json` et un prompt en base — deux choses que tout
personnage a.

## Les trois sources, et pourquoi trois

Pierre demande en plus une reformulation par LLM et un apport de vision. Ce ne
sont pas des redondances :

1. **Le prompt** dit ce qui a été **demandé**. Il est exact, gratuit, et
   disponible pour 22 images sur 24.
2. **La vision** dit ce qui a été **produit**. Une image peut s'écarter de sa
   consigne — c'est même la raison d'être du tri. L'écart entre les deux est
   exactement ce que la vision apporte, et c'est la seule source pour les 2
   images sans prompt.
3. **La reformulation** rend une légende de longueur et de forme constantes.
   La constance de forme est ce que la pratique demande le plus fermement :
   même patron, même déclencheur partout, jamais à moitié.

Un seul appel par image les fusionne — deux passes successives dériveraient
l'une de l'autre.

## Zéro dépendance nouvelle, et ce n'est pas un hasard

Le nœud cœur `TextGenerate`, déjà utilisé par `compose.py` et alimenté par
`qwen3vl_4b_fp8_scaled` (au manifeste, ADR-0022), expose une entrée **`image`
optionnelle** : c'est un modèle vision-langage. Il fait les deux.

Ollama tourne sur ce poste avec `qwen3-vl:8b` et ferait le travail. Il n'est
**référencé nulle part dans le dépôt** : l'employer ajouterait une dépendance
externe non déclarée, contre la promesse d'E10 (« chaîne d'outils portable,
tout reste dans le dépôt ») et contre l'invariant 12, pour une capacité déjà
présente. Écarté, et écrit comme tel.

Florence-2 est installé et déclaré. Il ferait le même travail, avec un défaut
connu pile sur la zone sensible : il hallucine ou rate la couleur des yeux et
les accessoires. Un second chemin de vision pour la même tâche ne se justifie
pas.

## Le garde-fou

La sortie du modèle passe par `runner.assert_no_face`. Si le LLM y glisse un
terme de visage, **on retombe sur la base exacte** plutôt que d'empoisonner le
jeu d'entraînement. `compose.py` applique déjà ce filtre à ses propositions de
scènes ; c'est le même vocabulaire et la même raison.

`skin` reste dans les légendes (arbitrage de Pierre du 10/09) : c'est du
vocabulaire *signalé* et non interdit, et la texture globale est un rendu, pas
une identité.

## Hors périmètre

- **La convention de dossier kohya** (`<répétitions>_<déclencheur>`) et le
  nombre de répétitions : réglage d'entraînement, pas de légendage.
- **Tout écran.** L'UI de ce module est nommée par Pierre comme un chantier à
  part ; c'est là que vivra l'interrupteur du déclencheur.
- **Le choix du LoRA lui-même**, son entraînement et son banc : étage 1 du
  cadrage du 09/09.
- **Un légendage par crop ou par région.** La granularité est l'image.

## Critère de sortie

`python AUTOMATION/entrainement.py <personnage> --exporter` produit un `.txt`
par image, et :

- aucune légende ne contient de terme `FORBIDDEN_FACE` ;
- toutes commencent par le même mot déclencheur ;
- le manifeste dit, pour chacune, **de quelle source** elle vient — `prompt`,
  `vision`, `métadonnées` (repli après refus du garde-fou) ou `déclencheur
  seul` (dernier filet, jamais de légende vide) ;
- `--sans-vision` reste utilisable ComfyUI éteint, et rend la substitution
  exacte pour tout ce qui a un prompt.

Et un critère que seul l'œil tranche : **Pierre relit un échantillon.** Une
légende qui décrit mal la scène est un défaut qu'aucune de ces règles n'attrape.

## Note d'implémentation, le même jour

**La reformulation par LLM ne se fait pas, et c'est une mesure qui le dit.**
Ce cadrage la donnait pour acquise : le nœud `TextGenerate` alimenté par
`qwen3vl_4b_fp8_scaled` accepte une image, donc « un seul appel fait les deux ».
Le premier essai le confirmait — une question courte, une réponse propre en
5,6 s. Puis, sur la consigne réelle, cinq formulations successives ont donné :

- un **refus explicite** — « no valid caption can be generated under these
  constraints » — quand la consigne énumère les interdits ;
- un **commentaire de la consigne** au lieu de la réponse (« Note: The user's
  request… ») ;
- un **écho** de l'instruction, recopiée mot pour mot ;
- une **sortie vide en 1 s** dès que la consigne mentionne la personne ou ses
  vêtements ;
- des **listes markdown** là où on demandait une ligne de descripteurs.

Ce n'est pas un modèle de conversation : c'est un encodeur de texte servi par
un nœud qui n'est pas fait pour suivre des instructions. `compose.py` s'en sert
avec succès pour une tout autre tâche — générer du texte libre, avec un budget
de tokens large et aucune contrainte de forme stricte.

**Florence-2 prend sa place, et le raisonnement du cadrage s'inverse.** Il était
écarté ici au motif qu'il hallucine les détails fins du visage. C'est vrai — et
c'est sans importance, parce qu'on ne lui demande jamais l'identité et que le
garde-fou refuse toute légende qui la mentionne. Surtout, il **ne suit aucune
instruction** : il décrit, point. Donc aucun des modes d'échec ci-dessus.
Mesuré : 2 à 6 s, aucun refus, aucun commentaire.

Le garde-fou a servi dès le premier jour, et sur l'image la plus sensible : sur
le portrait de base, Florence-2 décrit les taches de rousseur **et invente des
yeux bleus** là où Léna les a verts. Refusé. L'ancre réinjectée ne passe donc
plus par aucun modèle — sa légende est le déclencheur et un cadrage neutre.

### Ce que l'export produit réellement

```
22  prompt              substitution exacte
 1  vision              Florence-2
 1  déclencheur seul    vision refusée (freckles), aucune métadonnée
 1  ancre               légende neutre, écrite sans modèle
```

Quatre secondes pour l'ensemble : seules deux images ont eu besoin d'un modèle.

### Une décision de repli qui ne se devinait pas

Une légende **vide** est pire qu'une légende grossière. Un `.txt` manquant au
milieu d'un jeu qui en a partout, c'est l'inconstance de forme que la pratique
reproche le plus. Le dernier repli est donc le déclencheur seul — « tout dans
cette image est le personnage » — et la source le signale pour qu'on le voie.

### La question qui reste ouverte

Ollama tourne sur ce poste avec `qwen3-vl:8b`, un vrai modèle de conversation
qui suivrait très probablement la consigne. Il reste écarté pour la raison de
dépendance écrite plus haut — mais le motif « on a déjà ce qu'il faut » ne
tient plus tout à fait : on a de quoi *décrire*, pas de quoi *reformuler*. Si
la forme des légendes devient un problème mesuré, c'est ce compromis-là qu'il
faudra rouvrir, et il appartient à Pierre.
