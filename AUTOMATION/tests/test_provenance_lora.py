# -*- coding: utf-8 -*-
"""La provenance : une image produite sous LoRA d'identite le dit, en base.

POURQUOI CE TEST EXISTE. Le mecanisme d'identite (cadrage du 2026-09-09,
regle 6) distingue trois provenances : REFERENCE, OBSERVED, DERIVED. Une image
DERIVED sort d'un modele deja derive — typiquement un LoRA v1 — et ne doit
JAMAIS redevenir en silence une donnee d'origine pour l'entrainement de v2 :
c'est la boucle autophage que la litterature appelle l'effondrement de modele.

Or rien en base ne le disait. Verifie le 09/09 : aucun `params_json` sur les
batches d'Abyssiaelle, 13 images sur 122 sans `batch_id`, et `image.source` ne
sert qu'a la branche NSFW. Les 9 images qui portaient tout le resultat de la
phase de recherche etaient toutes DERIVED, sans que la base puisse le dire.

Ce test verrouille TROIS choses :

  1. `identity.lora_actif` est la SEULE definition de « un LoRA est actif », et
     elle est double : le graphe doit porter le role `character_lora` ET le
     personnage doit nommer un LoRA. Un LoRA nomme sans role n'est PAS applique
     — le graphe ne le charge pas. La condition vivait en dur dans
     `runner/comfy.py` seulement ; la reecrire ailleurs aurait recree le defaut
     du 09/09 (deux endroits pour une meme verite, qui divergent en silence).
  2. `ranger_mesures` l'ecrit dans `image.lora_identite`.
  3. Une RE-MESURE depuis la Revue ne l'efface pas. `enregistrer_image` met a
     jour en COALESCE(?, colonne) exactement pour ca : un appelant qui ignore
     la colonne ne la vide pas.

`qc_realisme` est remplace : ce test ne charge jamais cv2.

Lancer :  python AUTOMATION\\tests\\test_provenance_lora.py
"""
import shutil
import sys
import tempfile
import types
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

faux_qc_realisme = types.ModuleType("qc_realisme")
faux_qc_realisme.mesure = lambda path, bbox=None: {"nettete": 100.0}
sys.modules["qc_realisme"] = faux_qc_realisme

import base as db          # noqa: E402
import identity            # noqa: E402
import mesures as mes      # noqa: E402
from runner import sortie  # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def lora_en_base(nom, cid="lena"):
    with db.ouvrir() as cx:
        r = cx.execute("SELECT lora_identite FROM image WHERE fichier = ? "
                       "AND character_id = ?", (nom, cid)).fetchone()
        return r["lora_identite"] if r else "<absente>"


ROLES = {"character_lora": {"id": 42}}
CFG_LORA = {"identity": {"lora": {"name": "lena_v1.safetensors", "strength": 1.0}}}
CFG_SANS = {"identity": {"weight": 0.85}}

racine = Path(tempfile.mkdtemp(prefix="provenance_"))
mes.FICHIER = racine / "PROD" / "mesures.json"
db.FICHIER = racine / "PROD" / "soulglade.db"

print("=" * 70)
print("Provenance : une image DERIVED le dit en base")
print("=" * 70)

try:
    print("\n[1] identity.lora_actif — la condition est DOUBLE")
    verifie(identity.lora_actif(ROLES, CFG_LORA) == "lena_v1.safetensors",
            "role dans le graphe + LoRA nomme -> le nom du LoRA")
    verifie(identity.lora_actif(None, CFG_LORA) is None,
            "LoRA nomme mais AUCUN role : le graphe ne le charge pas, donc None")
    verifie(identity.lora_actif({}, CFG_LORA) is None,
            "role absent du graphe -> None, jamais le nom")
    verifie(identity.lora_actif(ROLES, CFG_SANS) is None,
            "role present mais aucun LoRA nomme -> None")
    verifie(identity.lora_actif(ROLES, {}) is None,
            "config vide -> None, sans lever")

    print("\n[2] ranger_mesures ecrit la provenance")
    sortie.ranger_mesures("derivee.png", 0.81, {"nettete": 100.0},
                          character_id="lena",
                          lora_identite=identity.lora_actif(ROLES, CFG_LORA))
    verifie(lora_en_base("derivee.png") == "lena_v1.safetensors",
            f"image DERIVED : lora_identite = {lora_en_base('derivee.png')!r}")

    sortie.ranger_mesures("observee.png", 0.79, {"nettete": 100.0},
                          character_id="lena",
                          lora_identite=identity.lora_actif(ROLES, CFG_SANS))
    verifie(lora_en_base("observee.png") is None,
            "image OBSERVED : lora_identite reste NULL")

    print("\n[3] une re-mesure depuis la Revue n'efface pas la provenance")
    (racine / "PROD").mkdir(parents=True, exist_ok=True)
    cible = racine / "derivee.png"
    cible.write_bytes(b"\x89PNG\r\n\x1a\n")      # jamais ouvert : qc_realisme est faux
    mes.mesurer(cible, checker=None, identite=0.77, character_id="lena")
    verifie(lora_en_base("derivee.png") == "lena_v1.safetensors",
            "COALESCE : l'appelant qui ignore la colonne ne la vide pas")

    print("\n[4] la provenance sert a compter les membres derives d'un jeu")
    import numpy as np
    with db.ouvrir() as cx:
        for nom in ("derivee.png", "observee.png"):
            iid = cx.execute("SELECT id FROM image WHERE fichier = ?",
                             (nom,)).fetchone()["id"]
            db.enregistrer_embedding(cx, iid, np.array([1, 0, 0], dtype=np.float32))
        cx.commit()
        bilan = db.construire_jeu(cx, "lena", np.array([1, 0, 0], dtype=np.float32),
                                  0.5, libelle="provenance")
        cx.commit()
    verifie(bilan["membres"] == 2 and bilan["derives"] == 1,
            f"{bilan['membres']} membres dont {bilan['derives']} DERIVED — "
            "l'humain voit sur quoi son gabarit est bati")
finally:
    shutil.rmtree(racine, ignore_errors=True)

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
sys.exit(1 if KO else 0)
