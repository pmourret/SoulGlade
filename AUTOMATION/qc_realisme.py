"""Mesures de realisme : est-ce que l'image passe pour une photographie ?

Question INDEPENDANTE de l'identite. `qc_identity` repond a « est-ce bien Lena »,
ce module repond a « est-ce credible comme photo ». Le verdict de tri ne depend
que de l'identite ; ces mesures sont enregistrees et affichees, elles ne deplacent
aucun fichier tant qu'elles ne sont pas calibrees.

TROIS MESURES

- nettete        variance du laplacien sur l'image entiere. Bas = mou.
- texture_visage mediane de l'ecart-type local (7x7) dans le crop de visage.
                 C'est LA mesure importante : PuLID lisse la peau, c'est documente
                 dans CLAUDE.md, et ce lissage est ce qui fait « rendu IA ». La
                 mediane plutot que la moyenne pour que les aretes (yeux, narines,
                 limite des cheveux) ne gonflent pas le resultat.
- fond_net       part du cadre qui n'est PAS franchement plus molle que le reste.
                 Haut = nettete uniforme d'un bord a l'autre ; bas = des zones
                 visiblement floues (fond defocalise, flou de bouge).
                 CE N'EST PAS UNE MESURE DE REALISME, malgre sa place dans ce
                 module : contre le corpus etiquete du 08/09 elle separe « ca se
                 voit que c'est genere » a AUC 0.64, mais 71 % de sa variance est
                 expliquee par la SCENE, et a scene fixee la separation tombe a
                 0.58 — presque le hasard. Elle mesure le flou, pas la credibilite.
                 Ce qu'elle mesure, elle le mesure bien : d'une image a l'autre
                 d'une meme scene elle bouge tres peu (0.96-0.97, 0.89-0.93). C'est
                 donc l'instrument de l'avant/apres du fond (IT-3b, front 1), pas
                 un juge. Voir DOCS/recherche/2026-09-08-fond-nettete-non-uniforme.md.
- bruit_fond     ecart-type robuste (MAD) du residu haute frequence hors visage.
                 Une photo a un plancher de bruit capteur ; une generation trop
                 propre n'en a pas. Repere deja utilise a la main lors du reglage
                 NSFW (« bruit de fond 3.71 contre 3.62 cote SFW »).

NORMALISATION — c'est ce qui rend les valeurs comparables entre images :
- l'image est ramenee a 1024 px sur son grand cote avant toute mesure, sinon un
  2K et un 1080 ne sont pas sur la meme echelle ;
- le crop de visage est ramene a 256 px de haut, sinon un selfie (grand visage)
  et un plan large (petit visage) ne sont pas comparables non plus.

Les valeurs sont des nombres bruts, sans seuil : la bande cible se deduit des
images que l'utilisateur marque « convaincante » dans la revue. Pas de corpus de
vraies photos dans ce projet, donc pas d'autre etalonnage honnete.
"""
import numpy as np

TAILLE_IMAGE = 1024        # grand cote, pour la nettete et le bruit de fond
TAILLE_VISAGE = 256        # hauteur du crop de visage, pour la texture de peau
TAILLE_TUILE = 64          # cote d'une tuile de `fond_net`, sur l'image normalisee
MOLLESSE = 0.20            # une tuile sous 20 % du p90 du cadre est « molle »


def _cv2():
    import cv2
    return cv2


def _normalise(img, cible=TAILLE_IMAGE):
    cv2 = _cv2()
    h, w = img.shape[:2]
    grand = max(h, w)
    if grand == cible:
        return img
    k = cible / grand
    interp = cv2.INTER_AREA if k < 1 else cv2.INTER_LINEAR
    return cv2.resize(img, (max(1, int(w * k)), max(1, int(h * k))), interpolation=interp)


def _gris(img):
    cv2 = _cv2()
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)


def _ecart_type_local(gris, k=7):
    """Ecart-type local en chaque pixel, par la formule E[x²] - E[x]²."""
    cv2 = _cv2()
    moy = cv2.blur(gris, (k, k))
    moy_carre = cv2.blur(gris * gris, (k, k))
    return np.sqrt(np.maximum(moy_carre - moy * moy, 0.0))


def _mad(x):
    """Ecart-type robuste : les aretes et les artefacts ne le tirent pas."""
    med = np.median(x)
    return float(np.median(np.abs(x - med)) * 1.4826)


def nettete(img):
    # CV_32F et pas CV_64F : _gris rend du float32, et OpenCV n'accepte pas la
    # combinaison source float32 / destination float64.
    cv2 = _cv2()
    return float(cv2.Laplacian(_gris(_normalise(img)), cv2.CV_32F).var())


def texture_visage(img, bbox):
    """bbox = (x1, y1, x2, y2) en pixels de l'image d'origine."""
    cv2 = _cv2()
    if bbox is None:
        return None
    h, w = img.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in bbox]
    # on resserre de 18 % : on veut la peau (joues, front), pas le contour du
    # visage ni la limite des cheveux, qui sont des aretes franches
    mx, my = int((x2 - x1) * 0.18), int((y2 - y1) * 0.18)
    x1, y1 = max(0, x1 + mx), max(0, y1 + my)
    x2, y2 = min(w, x2 - mx), min(h, y2 - my)
    if x2 - x1 < 16 or y2 - y1 < 16:
        return None
    crop = img[y1:y2, x1:x2]
    k = TAILLE_VISAGE / crop.shape[0]
    crop = cv2.resize(crop, (max(16, int(crop.shape[1] * k)), TAILLE_VISAGE),
                      interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_LINEAR)
    return float(np.median(_ecart_type_local(_gris(crop))))


def bruit_fond(img, bbox):
    """Plancher de bruit hors visage, sur le residu haute frequence."""
    cv2 = _cv2()
    petit = _normalise(img)
    gris = _gris(petit)
    residu = gris - cv2.GaussianBlur(gris, (0, 0), 1.2)
    masque = np.ones(gris.shape, dtype=bool)
    if bbox is not None:
        kh = petit.shape[0] / img.shape[0]
        kw = petit.shape[1] / img.shape[1]
        x1, y1, x2, y2 = bbox
        # on evide large autour du visage : la peau lissee ne doit pas compter
        mx, my = (x2 - x1) * 0.35, (y2 - y1) * 0.35
        a = max(0, int((x1 - mx) * kw)); b = min(petit.shape[1], int((x2 + mx) * kw))
        c = max(0, int((y1 - my) * kh)); d = min(petit.shape[0], int((y2 + my) * kh))
        if b > a and d > c:
            masque[c:d, a:b] = False
    if masque.sum() < 1000:                 # visage occupant tout le cadre
        masque = np.ones(gris.shape, dtype=bool)
    return _mad(residu[masque])


def fond_net(img):
    """Part des tuiles dont la nettete n'est PAS effondree face au reste du cadre.

    Le seuil est RELATIF au p90 de l'image elle-meme, jamais une valeur absolue :
    le corpus a montre que la nettete absolue ne separe rien (les images jugees
    « ca se voit » sont meme un peu PLUS nettes en mediane). Ce qui separe, c'est
    la presence de zones franchement molles a cote de zones nettes.

    Sens : HAUT = mieux, comme les trois autres genres — `bench.verdict_bench`
    lit tous les genres avec la meme regle « delta positif = amelioree ».

    `MOLLESSE` et `TAILLE_TUILE` definissent la mesure (au meme titre que le 7x7
    de `_ecart_type_local`) ; ce ne sont pas des seuils de tri, qui eux vivent
    dans `config.json` (invariant 4).
    """
    cv2 = _cv2()
    lap = cv2.Laplacian(_gris(_normalise(img)), cv2.CV_32F)
    h, w = lap.shape
    ny, nx = h // TAILLE_TUILE, w // TAILLE_TUILE
    if ny < 2 or nx < 2:                    # image trop petite pour un decoupage
        return None
    tuiles = lap[:ny * TAILLE_TUILE, :nx * TAILLE_TUILE]
    tuiles = tuiles.reshape(ny, TAILLE_TUILE, nx, TAILLE_TUILE).var(axis=(1, 3))
    p90 = float(np.percentile(tuiles, 90))
    if p90 <= 0:                            # image uniformement plate
        return 0.0
    return float((tuiles >= MOLLESSE * p90).mean())


def mesure(path, bbox=None):
    """Les trois mesures pour une image. bbox facultatif (sinon pas de texture)."""
    cv2 = _cv2()
    img = cv2.imread(str(path))
    if img is None:
        return None
    return {
        "nettete": round(nettete(img), 2),
        "texture_visage": (lambda v: round(v, 3) if v is not None else None)(
            texture_visage(img, bbox)),
        "bruit_fond": round(bruit_fond(img, bbox), 3),
        "fond_net": (lambda v: round(v, 3) if v is not None else None)(fond_net(img)),
    }


def _autotest():
    """Verif minimale de `fond_net` sur des images synthetiques — la seule des
    quatre mesures dont le sens (haut = mieux) porte un verdict de banc, donc
    la seule qui casserait silencieusement une comparaison si elle s'inversait.
    Lancer : python qc_realisme.py  (sans argument), avec le python de ComfyUI."""
    rng = np.random.default_rng(0)
    bruit = rng.integers(0, 255, (1024, 1024, 3), dtype=np.uint8)

    net_partout = fond_net(bruit)
    assert net_partout > 0.95, f"bruit uniforme : attendu ~1.0, obtenu {net_partout}"

    moitie = bruit.copy()
    moitie[512:, :] = 128                       # moitie basse parfaitement plate
    demi = fond_net(moitie)
    assert 0.45 < demi < 0.55, f"moitie molle : attendu ~0.5, obtenu {demi}"

    assert fond_net(np.full((1024, 1024, 3), 128, np.uint8)) == 0.0, "image plate"
    # `_normalise` ramene toujours le grand cote a 1024 : seule une image
    # extremement allongee retombe sous deux tuiles de haut.
    assert fond_net(np.zeros((30, 4000, 3), np.uint8)) is None, "bandeau trop plat"
    assert demi < net_partout, "sens inverse : le banc lirait une degradation comme un gain"
    print(f"autotest ok — uniforme {net_partout:.3f} > moitie molle {demi:.3f}")


if __name__ == "__main__":
    import sys
    from pathlib import Path
    if len(sys.argv) < 2:
        _autotest()
    else:
        for f in sorted(Path(sys.argv[1]).glob("*.png")):
            print(f"{f.name[:48]:50} {mesure(f)}")
