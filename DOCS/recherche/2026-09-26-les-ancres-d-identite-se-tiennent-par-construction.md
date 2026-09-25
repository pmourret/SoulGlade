# Les ancres d'identité se tiennent par construction, pas par mesure

Phase de recherche ouverte le 25/09/2026 au soir et refermée le 26/09, deux
itérations. Elle répond à l'étape 2 du cadrage
`DOCS/cadrage/2026-09-25-expression-par-transfert-de-mouvement.md` : quel
garde-fou pour une expression, maintenant qu'elle se pose par transfert de
mouvement (`2026-09-25-l-expression-se-transfere-en-mouvement-pas-en-pixels.md`) ?
Candidat adopté à la deuxième itération, validé à l'œil par Pierre.

## Ce qui bloquait

`poser_sous_budget` refuse une expression qui coûte plus de 0,05 d'identité
(ArcFace), mesurée contre le visage neutre. Une expression franche baisse le
score par nature : le garde-fou atténuait ou refusait précisément ce qu'on
demande. Pierre a posé le principe : une expression bouge ce qui est
expressif, jamais les **points d'ancrage** — forme du menton, pommettes,
implantation et épaisseur des sourcils, couleur des yeux. La question :
**comment garantir ces ancres sans refuser une expression franche ?**

## Candidats examinés

| # | Approche | Ce qu'elle rend | Disponibilité / licence | Verdict |
|---|---|---|---|---|
| 1 | Ancres mesurées sur les 106 points d'InsightFace (déjà chargés) | une vraie expression les déplace autant qu'une perte d'identité ; menton et épaisseur des sourcils aveugles | installé | **clos** |
| 2 | Points canoniques de LivePortrait (`kp`, séparés de `exp` par le modèle) | même recouvrement | installé, MIT | **clos** |
| 3 | Modèles 3D morphables sur BFM (3DDFA_V2, Deep3DFace) | forme et expression séparées par construction | code MIT, **BFM payant en usage commercial** | **clos** (licence) |
| 4 | Modèles FLAME (MICA, EMOCA, DECA) | idem | **non commercial, pornographie interdite** | **clos** (licence) |
| 5 | **Ancres par construction** : le champ de mouvement du transfert est contraint sur les zones d'ancrage | ancres garanties, expression intacte | aucun ajout | **adopté** |

Vérifié : code installé de `comfyui-advancedliveportrait` (`get_kp_info`), page
FLAME (licence du modèle), licence LivePortrait (MIT), README 3DDFA_V2 et
page BFM 2017 (licence), consultés le 25/09. Lu annoncé, non vérifié : le
tarif de la licence commerciale BFM (environ 10 000 € par an, cité par un
tiers).

## Ce qu'on a mesuré

**Itération 1 — mesurer les ancres.** Banc : 5 sources sans ton (seeds 1001,
1138, 1275, 1412, 1549), **30 positifs** (aller-retour neutre et les 5 tons
de `slow-life`, posés par transfert de mouvement), **120 négatifs**
(mâchoire, menton, pommettes, implantation et épaisseur des sourcils, couleur
des yeux, à quatre amplitudes). Images : `PROD/LENA/_BENCH/ancres-etalonnage/`.

| Ancre (106 points) | Positifs, max | Négatifs, min (amplitude 1 → 2) | Séparés |
|---|---|---|---|
| Couleur des yeux | 1,1 | 9,9 → 19,8 | **oui** |
| Contour haut | 0,014 | 0,002 → 0,005 | non |
| Largeur aux pommettes | 0,018 | 0,003 → 0,005 | non |
| Implantation des sourcils | 0,011 | 0,004 → 0,010 | non |
| Forme du menton | 0,004 | ≤ 0,0005 même allongé de 40 % | aveugle |
| Épaisseur des sourcils | 0,004 | ≤ 0,003 même épaissis de 120 % | aveugle |

Points canoniques de LivePortrait : positifs jusqu'à 0,014, négatifs 0,001 à
0,007 même au niveau 4 ; la composante `exp` bouge moins (0,001 à 0,003) que
`kp`. Même recouvrement.

**Itération 2 — tenir les ancres.** Le transfert de mouvement déforme
l'original par un champ qu'on contrôle. Contraintes, sur les 106 points de la
source :

- mâchoire et menton : translation d'un bloc seulement (la mâchoire descend
  quand la bouche s'ouvre, sa forme ne change pas) ;
- pommettes : aucun mouvement horizontal (elles montent, jamais ne
  s'élargissent) ;
- chaque sourcil : translation d'un bloc (la hauteur est expressive,
  l'implantation et l'épaisseur ne le sont pas) ;
- chaque iris : translation d'un bloc, et jamais recollé depuis la sortie du
  nœud (sa couleur est celle de la source).

15 paires (5 seeds × `joueur`, `intime`, `doux`), libre contre contraint,
écart moyen à la source dans chaque zone (sur 255) : mâchoire 3,04 → 1,13,
pommettes 2,95 → 2,61, bouche 10,09 → 10,09 (l'expression est intacte).
Coût : quelques millisecondes sur le flux, aucun modèle.

## Le verdict

**Adopté : les ancres par construction.** Le chiffre ne vient pas d'un juge
statistique mais du champ lui-même — ce qu'il interdit ne peut pas arriver.
L'œil de Pierre valide sur la planche
(`ancres-etalonnage/construction/planche_libre_ancres.png`) : l'expression
survit entière, la forme du visage tient.

**L'instrument 2D ment, et c'est le résultat le plus utile de la phase.** À
flux horizontal **nul** aux pommettes, la mesure 2D y voit toujours un
élargissement (0,010) : le détecteur de points déplace ses estimations avec
l'**apparence** d'une expression — l'ombre d'un sourire suffit. Il ne peut
servir ni à juger une ancre, ni à valider la contrainte. C'est aussi ce qui
brouillait l'itération 1.

**Conséquence pour le garde-fou.** Plus rien n'a à être refusé au nom de
l'identité : le budget de `poser_sous_budget` disparaît. Le score d'identité
après expression reste mesuré et enregistré, comme information. La force
d'une expression est bornée par la plage du ton, que l'utilisateur règle
avec l'aperçu.

## Pistes écartées

- **Ancres mesurées sur les 106 points** : l'instrument suit l'apparence,
  pas la géométrie ; en l'état, un garde-fou qui refuserait des sourires.
- **Points canoniques de LivePortrait** : même recouvrement ; en l'état, idem.
- **3DMM sur BFM** : licence commerciale payante ; en l'état, incompatible
  avec des packs vendus.
- **3DMM sur FLAME** : non commercial, pornographie interdite ; en l'état,
  incompatible avec le produit.

## Ce que je n'ai pas vérifié

- **Une grande rotation de tête** : la translation d'un bloc de la mâchoire ne
  suffit plus si la tête tourne ; les tons de `slow-life` n'en posent pas.
- **Un visage que le détecteur ne lit pas** (pack non photoréaliste) : sans
  points, pas de contrainte ; le cas rejoint l'entrée d'horizon « mesure
  d'identité pour un personnage non photoréaliste ».
- **Hors de ce chantier, et plus large que lui** : le fichier de licence de
  LivePortrait rappelle que **les modèles d'InsightFace sont réservés à la
  recherche non commerciale**. La plateforme s'en sert pour le contrôle
  d'identité et pour PuLID, et aucun ADR ne le traite. À instruire avant
  tout pack vendu.

## Suites

Intégration, dans IT-10 : la contrainte entre dans
`expression.transferer_mouvement` (points de la source en entrée) ; le refus
au budget sort de `poser_sous_budget`, et avec lui le réglage
`expression_budget` et son curseur dans Produire, qui n'auraient plus de sens.
Test unitaire sur champ synthétique : un mouvement qui élargirait la mâchoire,
écarterait les pommettes ou épaissirait un sourcil est rendu rigide ; la
bouche garde le sien.

## Sources

- Licence LivePortrait : https://raw.githubusercontent.com/KwaiVGI/LivePortrait/main/LICENSE (25/09)
- Licence FLAME : https://flame.is.tue.mpg.de/modellicense.html (25/09)
- 3DDFA_V2 : https://github.com/cleardusk/3DDFA_V2 ; BFM 2017 : https://faces.dmi.unibas.ch/bfm/bfm2017.html (25/09)
- `comfyui-advancedliveportrait/LivePortrait/live_portrait_wrapper.py`, `get_kp_info` (installé)
