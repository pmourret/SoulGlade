# Orchestration : cache d'exécution et données de passage

Sections déplacées verbatim depuis `SKILL.md` le 2026-09-07. Les deux
parlent du **code qui appelle un workflow**, pas du fichier de graphe :
le cache d'exécution de ComfyUI, et le sort d'une donnée sensible qui
transite par un graphe.

## Appels API répétés : le cache d'exécution de ComfyUI

ComfyUI met en cache l'exécution d'un nœud par ses inputs résolus — soumettre
**deux fois le même graphe** (même image d'entrée, mêmes valeurs de widget)
ne le fait pas tourner deux fois : il renvoie une référence au fichier de
sortie de la première exécution. Piège pour tout code qui soumet un graphe
plus d'une fois avec potentiellement les mêmes entrées (un aperçu interactif
rejoué à l'identique, un bouton « régénérer » sans rien changer) **et**
supprime le fichier de sortie après l'avoir lu une fois : le deuxième appel
identique reçoit le nom d'un fichier déjà supprimé, `FileNotFoundError`.

Incident réel (2026-09-03, `expression.py`/`apercu`) : cliquer deux fois
« Rendre l'aperçu » sans changer un seul paramètre échouait à coup sûr
(4/4 reproduit) ; varier ne serait-ce qu'une valeur d'un appel à l'autre
faisait repasser au vert (4/4). Corrigé en donnant à l'image d'entrée
temporaire un nom **unique par appel** (`uuid`) plutôt qu'un nom dérivé de
la source : LoadImage redevient « neuf » aux yeux du cache, ce qui force
tout le graphe en aval à se ré-exécuter au lieu de renvoyer une référence
périmée.

À vérifier dès qu'un appel programmatique peut être rejoué avec des entrées
identiques : soit le nom d'entrée est rendu unique par appel (le correctif
ci-dessus), soit le fichier de sortie n'est jamais supprimé après lecture
(acceptable si l'appelant est un aperçu jetable, à condition d'assumer
l'accumulation de scratch).

## Données sensibles qui transitent par un workflow

Si un workflow reçoit en entrée une vraie photo d'un tiers (ex. extraction
de pose depuis une photo de référence) : la photo ne doit jamais persister
au-delà du traitement. Elle transite par le dossier d'input de ComfyUI le
temps du job, et repart dans un bloc `finally` — succès ou échec. Ce n'est
pas une option, c'est la même règle que le principe fondateur de la
plateforme (personnages fictifs, jamais de personne réelle) appliquée aux
données de passage.
