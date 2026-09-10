# -*- coding: utf-8 -*-
"""Une base d'identite illisible par la mesure est refusee A LA CREATION.

POURQUOI CE TEST EXISTE. La base gelee est l'ancre de tout le mecanisme
d'identite : score, embedding, jeu de reference, banc. Sans visage dedans,
`qc_identity.IdentityChecker` leve son RuntimeError au PREMIER LOT — le
personnage est deja cree, ses scenes ecrites, et l'utilisateur decouvre a ce
moment-la que rien ne peut le mesurer. Pour un pack manga, ce n'est meme pas
une degradation : la chaine ne demarre pas du tout.

Regle du mecanisme d'identite (cadrage du 2026-09-09, § Le mecanisme) :
l'enrolement echoue LA OU IL SE PRODUIT. Les deux chemins qui fabriquent une
base gelee — `save_uploaded` (base fournie) et `freeze` (candidat genere) —
passent donc par le meme garde.

Verrouille aussi le detail qui ne se devine pas : le fichier deja ecrit est
SUPPRIME avant de lever. Le laisser derriere ferait pointer un `base_gelee`
sur une image refusee au prochain essai du wizard.

`qc_identity` est remplace : ce test ne charge jamais InsightFace ni cv2.

Lancer :  python AUTOMATION\\tests\\test_enrolement.py
"""
import base64
import io
import shutil
import sys
import tempfile
import types
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

# Faux qc_identity : `embedding()` rend ce que le scenario demande, jamais
# InsightFace. Installe AVANT l'import de base_portrait, qui l'importe tard.
VU = {"embedding": None}
faux_qc = types.ModuleType("qc_identity")
faux_qc.embedding = lambda path, root: VU["embedding"]
sys.modules["qc_identity"] = faux_qc

import base_portrait as bp     # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def png_valide():
    """Un vrai PNG minuscule : Pillow doit l'accepter, seule la MESURE decide."""
    from PIL import Image
    tampon = io.BytesIO()
    Image.new("RGB", (8, 8), (128, 128, 128)).save(tampon, format="PNG")
    return base64.b64encode(tampon.getvalue()).decode()


racine = Path(tempfile.mkdtemp(prefix="enrolement_"))
bp.COMFY_INPUT = racine / "input"
IMAGE = png_valide()

print("=" * 70)
print("Enrolement : pas de visage lisible, pas de personnage")
print("=" * 70)

try:
    print("\n[1] base FOURNIE dont la mesure ne tire aucun visage")
    VU["embedding"] = None
    refus = ""
    try:
        bp.save_uploaded("essai", IMAGE)
    except bp.BaseImageError as e:
        refus = str(e)
    verifie(bool(refus), f"refusee : {refus[:58]}…" if refus else "PAS refusee")
    verifie("visage" in refus.lower(),
            "le message dit ce qui manque, pas « erreur »")
    restes = list((racine / "input").glob("*")) if (racine / "input").exists() else []
    verifie(not restes,
            f"le fichier ecrit ne reste pas derriere ({len(restes)} fichier(s))")

    print("\n[2] la meme image, quand la mesure y voit un visage")
    VU["embedding"] = [0.1] * 512
    nom = bp.save_uploaded("essai", IMAGE)
    verifie(nom == "ESSAI_BASE.png", f"acceptee, base_gelee = {nom}")
    verifie((racine / "input" / nom).is_file(), "et le fichier est bien ecrit")

    print("\n[3] base GENEREE : le candidat gele passe le meme garde")
    sortie = racine / "output"
    sortie.mkdir(parents=True, exist_ok=True)
    (sortie / "cand.png").write_bytes(base64.b64decode(IMAGE))
    bp.COMFY_OUTPUT = sortie
    VU["embedding"] = None
    refus2 = ""
    try:
        bp.freeze("autre", "cand.png")
    except bp.BaseImageError as e:
        refus2 = str(e)
    verifie(bool(refus2), "un candidat sans visage est refuse au gel aussi")
    verifie(not (racine / "input" / "AUTRE_BASE.png").exists(),
            "et la copie faite avant la verification est effacee")

    print("\n[4] mesure indisponible : on refuse, en le disant")
    def casse(path, root):
        raise ModuleNotFoundError("No module named 'insightface'")
    faux_qc.embedding = casse
    refus3 = ""
    try:
        bp.save_uploaded("tiers", IMAGE)
    except bp.BaseImageError as e:
        refus3 = str(e)
    verifie("verifier" in refus3.lower(),
            "le message distingue « pas de visage » de « mesure cassee » : "
            f"{refus3[:52]}…")
finally:
    shutil.rmtree(racine, ignore_errors=True)

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
sys.exit(1 if KO else 0)
