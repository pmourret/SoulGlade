"""Le LoRA de pack : allume par le palier qui le declare, par rien d'autre.

Le palier NSFW natif se fabrique avec le checkpoint du pack — Flux dev pour
Lena — plus un LoRA (decision du 21/09,
`DOCS/cadrage/2026-09-21-scene-nsfw-native-le-modele.md`). Le cablage qui le
rend possible est exactement celui qui rendrait possible le nu involontaire
en SFW : les deux se decident ensemble, et ce test verrouille la garde.

TROIS ETAGES, et il faut les trois pour qu'une image change :

  1. le graphe porte le role `pack_lora`, bypasse par defaut ;
  2. `config.json / nsfw / lora` nomme un fichier avec une force non nulle ;
  3. la couche politique a laisse cette force passer, ce qu'elle ne fait
     qu'au palier declarant `lora_adulte`.

Un seul etage qui manque, et le noeud reste bypasse. En particulier : une
configuration seule ne peut jamais deshabiller une image, il faut qu'un
palier le demande.

Aucun appel a ComfyUI, aucune donnee de `CHARACTERS/*` supposee presente
(CLAUDE.md, section Donnees) : la fiche creative est une doublure.

Lancer :  python AUTOMATION\\tests\\test_lora_pack.py
"""
import copy
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import bench                                        # noqa: E402
from api.services import creative as svc            # noqa: E402
from runner.comfy import lora_pack_actif            # noqa: E402

ROLES = {"pack_lora": {"id": 512}}
LORA = {"name": "anatomy_fineart_nudity_by_caith.safetensors", "strength": 0.8}
CREATIVE = {"intensity": [
    {"level": 0, "key": "sfw", "label": "SFW", "pipeline": "produce"},
    {"level": 2, "key": "suggestif", "label": "Suggestif", "pipeline": "produce",
     "export": False},
    {"level": 3, "key": "natif", "label": "Natif", "pipeline": "produce",
     "export": False, "lora_adulte": True},
    {"level": 4, "key": "edition", "label": "Edition", "pipeline": "edit",
     "export": False, "base_level": 0},
]}
KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def config(**nsfw):
    return {"export": {"enabled": True}, "nsfw": dict(nsfw)}


def applique(niveau, lora=LORA):
    cfg = config(lora=copy.deepcopy(lora)) if lora else config()
    svc.apply_tier_rules(cfg, niveau, "peu_importe")
    return ((cfg.get("nsfw") or {}).get("lora") or {}).get("strength")


def main():
    vrai = svc.lb.load_creative
    svc.lb.load_creative = lambda c: CREATIVE
    try:
        # ------------------------------------------------- [1] le predicat
        print("[1] trois conditions, et il les faut toutes les trois")
        verifie(lora_pack_actif({}, config(lora=LORA)) is None,
                "sans le role dans le graphe : rien")
        verifie(lora_pack_actif(ROLES, config()) is None,
                "sans LoRA nomme dans config.json : rien")
        verifie(lora_pack_actif(ROLES, config(lora={**LORA, "strength": 0.0})) is None,
                "avec une force nulle : rien, et c'est la garde")
        verifie(lora_pack_actif(ROLES, config(lora=LORA)) == (LORA["name"], 0.8),
                "les trois reunies : le nom et la force")

        # ------------------------------------------------- [2] la garde
        print("\n[2] seule la couche politique laisse passer la force")
        verifie(applique(0) == 0.0,
                f"palier SFW : force remise a zero ({applique(0)})")
        verifie(applique(2) == 0.0,
                f"palier Suggestif, non exportable mais non declarant : zero "
                f"({applique(2)})")
        verifie(applique(3) == 0.8,
                f"palier qui declare `lora_adulte` : la force passe ({applique(3)})")
        verifie(applique(4) == 0.0,
                "palier d'edition : la passe de generation tourne a son "
                "base_level, qui ne declare rien")
        cfg_sans = config()
        svc.apply_tier_rules(cfg_sans, 0, "peu_importe")
        verifie(cfg_sans.get("nsfw") == {},
                f"un personnage sans LoRA adulte n'en recoit pas un vide : {cfg_sans}")

        # ------------------------------------------------- [3] le banc
        print("\n[3] le banc sait faire varier cette force, et elle seule")
        ref = {"nsfw": {"lora": dict(LORA)}, "preset": {"steps": 20}}
        v = bench.build_variant_cfg(ref, "nsfw_lora_strength", 0.0)
        verifie(v["nsfw"]["lora"]["strength"] == 0.0
                and v["nsfw"]["lora"]["name"] == LORA["name"],
                "la force change, le fichier ne bouge pas")
        verifie(ref["nsfw"]["lora"]["strength"] == 0.8,
                "la configuration de reference n'est pas mutee")
        bench.validate_variant_cfg(ref, v, "nsfw_lora_strength")
        verifie(True, "la garantie d'axe unique accepte la variante")
        v2 = bench.build_variant_cfg(ref, "nsfw_lora_strength", 0.0)
        v2["identity"] = {"weight": 0.5}
        leve = False
        try:
            bench.validate_variant_cfg(ref, v2, "nsfw_lora_strength")
        except bench.MultiAxisError:
            leve = True
        verifie(leve, "un second changement en plus -> MultiAxisError")
    finally:
        svc.lb.load_creative = vrai

    print("\n" + "=" * 70)
    print("tout est vert" if KO == 0 else f"{KO} ECHEC(S)")
    print("=" * 70)
    return 1 if KO else 0


if __name__ == "__main__":
    sys.exit(main())
