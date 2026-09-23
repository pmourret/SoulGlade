# -*- coding: utf-8 -*-
"""comfy_provision.py — sans GPU, sans ComfyUI, sans reseau, execution instantanee.

Ce qui se teste ici : le manifeste est bien forme, ensure_core() produit un
message actionnable (pas un traceback nu) quand ComfyUI est absent, et surtout
le CHEMIN RAPIDE — quand un nœud/modele est deja a la version epinglee, aucun
appel git/pip/reseau n'est tente. C'est la garantie qui permet de brancher ce
module sur CHAQUE lancement (comfy_server.ensure()) sans ralentir le cas normal
ou rien n'a change.

Lancer :  python_embeded\\python.exe AUTOMATION\\tests\\test_comfy_provision.py
"""
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import comfy_provision as cp  # noqa: E402

KO = 0


def verifie(condition, message):
    global KO
    print(f"  {'ok   ' if condition else 'ECHEC'} {message}")
    if not condition:
        KO += 1


def attend_erreur(fn, *a, **kw):
    try:
        fn(*a, **kw)
        return None
    except cp.ProvisionError as e:
        return e


def refuse_appel(*a, **kw):
    raise AssertionError("appel reseau/git/pip inattendu sur le chemin deja-a-jour")


# --------------------------------------------------------- 1. manifeste reel
manifest = cp.load_manifest()
verifie(isinstance(manifest["custom_nodes"], list) and len(manifest["custom_nodes"]) > 0,
        "le manifeste reel du repo declare au moins un custom node")
for entry in manifest["custom_nodes"]:
    if entry["source"] == "git":
        verifie("repo" in entry and "commit" in entry,
                f"{entry['id']} (git) porte repo+commit")
    elif entry["source"] == "registry":
        verifie("publisher" in entry and "version" in entry,
                f"{entry['id']} (registry) porte publisher+version")
    else:
        verifie(False, f"{entry['id']} : source inconnue {entry['source']!r}")
    verifie(entry.get("pip") in ("no-deps", "skip", "default"),
            f"{entry['id']} : champ pip valide ({entry.get('pip')!r})")
    for patch_name in entry.get("patches", []):
        verifie((cp.PATCHES_DIR / patch_name).exists(),
                f"{entry['id']} : patch declare present sur disque ({patch_name})")

# REGLE TOTALE (E10, 09/09/2026) : une entree dit TOUJOURS comment le fichier
# s'obtient -- `url` si la machine sait le telecharger, `provenance` si c'est un
# humain qui va le chercher (page CivitAI, artefact local non distribuable,
# repack introuvable). Sans exception, experimental compris.
#
# C'est ce test qui empeche la dette de se reformer entree par entree : un
# `url: null` seul ne se distingue pas d'un oubli, et c'est exactement comme ca
# que 17 entrees sur 27 ont fini sans rien. Ajouter un modele au manifeste sans
# repondre a la question fait echouer ce fichier.
#
# Une ligne par REGLE et non par entree : la regle qui tombe nomme ses coupables.
modeles = manifest["models"]
sans_nom = [i for i, m in enumerate(modeles) if not m.get("filename")]
verifie(not sans_nom, f"chaque entree modele porte un filename (fautives : {sans_nom})")

muettes = [m.get("filename") for m in modeles
           if not m.get("url") and not m.get("provenance")]
verifie(not muettes,
        f"chaque modele dit comment il s'obtient, url ou provenance ({len(modeles)} "
        f"entrees ; muettes : {muettes})")

pas_https = [m.get("filename") for m in modeles
             if m.get("url") and not str(m["url"]).startswith("https://")]
verifie(not pas_https, f"toute url declaree est en https ({pas_https})")

deux_voies = [m.get("filename") for m in modeles if m.get("url") and m.get("provenance")]
verifie(not deux_voies,
        f"url et provenance ne cohabitent jamais -- une seule voie ({deux_voies})")

verifie(cp.obtention({"url": "https://x/y"}) == "https://x/y",
        "obtention() rend l'url quand il y en a une")
verifie(cp.obtention({"provenance": "page CivitAI"}) == "page CivitAI",
        "obtention() se rabat sur la provenance")
verifie("non renseignee" in cp.obtention({"filename": "vide.safetensors"}),
        "obtention() le dit plutot que de rendre du vide")


# Paquets Python poses dans l'interpreteur de ComfyUI (21/09/2026) : une
# troisieme sorte de dependance, qui n'est ni un nœud ni un fichier sous
# models/. Meme exigence que les deux autres -- elle se declare, sinon elle se
# decouvre en production (ADR-0022).
paquets = manifest.get("python_packages", [])
verifie(all(p.get("import") and p.get("pip") for p in paquets),
        f"chaque paquet Python declare son import et sa ligne pip ({len(paquets)} entree(s))")
verifie(all("==" in p["pip"] for p in paquets),
        "chaque paquet Python est epingle a une version, comme un commit de nœud")
# Le test tourne sous n'importe quel interpreteur ; c'est la fonction qui doit
# aller interroger celui de ComfyUI, pas celui-ci.
verifie(cp._package_manquant({"import": "zzz_paquet_qui_n_existe_pas"}),
        "_package_manquant() voit l'absence")
verifie(not cp._package_manquant({"import": "json"}),
        "_package_manquant() voit la presence")
faux_manifeste = {"python_packages": []}
verifie(cp.ensure_python_packages(faux_manifeste, log=refuse_appel) == [],
        "aucun paquet declare -> aucun appel pip")


# ------------------------------------------------- 2. ensure_core() : absent
with tempfile.TemporaryDirectory() as tmp:
    root_vide = Path(tmp)
    err = attend_erreur(cp.ensure_core, manifest, root_vide, log=lambda *_: None)
    verifie(err is not None, "ensure_core() leve quand main.py est absent")
    verifie(err is not None and "git clone" in str(err),
            "le message d'erreur donne une instruction actionnable")


# ------------------------------------------------ 3. ensure_core() : present
with tempfile.TemporaryDirectory() as tmp:
    root_ok = Path(tmp)
    (root_ok / "main.py").write_text("# stub\n", encoding="utf-8")
    (root_ok / "comfyui_version.py").write_text('__version__ = "0.10.0"\n', encoding="utf-8")
    logs = []
    ok = cp.ensure_core(manifest, root_ok, log=logs.append)
    verifie(ok is True, "ensure_core() rend True quand main.py existe")
    verifie(any("ATTENTION" in l for l in logs),
            "une version de coeur plus ancienne que min_version avertit sans lever")


# --------------------------------------- 4. nœud git deja au commit epingle
git_entry = next(e for e in manifest["custom_nodes"] if e["source"] == "git")
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    node_dir = root / "custom_nodes" / git_entry["id"]
    node_dir.mkdir(parents=True)
    (node_dir / ".git").mkdir()  # marqueur suffisant pour _current_commit()

    vrai_git = cp._git
    cp._git = lambda args, cwd=None, log=cp._say: (
        git_entry["commit"] if args == ["rev-parse", "HEAD"] else refuse_appel())
    try:
        changed = cp._ensure_git_node(git_entry, root, log=lambda *_: None)
    finally:
        cp._git = vrai_git
    verifie(changed is False,
            "un nœud git deja au commit epingle ne declenche ni clone ni checkout")


# ------------------------------------ 5. nœud registry deja a la version epinglee
reg_entry = next(e for e in manifest["custom_nodes"] if e["source"] == "registry")
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    node_dir = root / "custom_nodes" / reg_entry["id"]
    node_dir.mkdir(parents=True)
    (node_dir / ".sg_registry_version").write_text(reg_entry["version"], encoding="utf-8")

    import urllib.request
    vrai_urlopen = urllib.request.urlopen
    urllib.request.urlopen = lambda *a, **kw: refuse_appel()
    try:
        changed = cp._ensure_registry_node(reg_entry, root, log=lambda *_: None)
    finally:
        urllib.request.urlopen = vrai_urlopen
    verifie(changed is False,
            "un nœud registry deja a la version epinglee ne declenche aucun appel reseau")


# ------------------------------------------------------- 6. pip policy "skip"
with tempfile.TemporaryDirectory() as tmp:
    node_dir = Path(tmp)
    (node_dir / "requirements.txt").write_text("mediapipe\n", encoding="utf-8")
    vrai_run = cp._run
    cp._run = lambda *a, **kw: refuse_appel()
    try:
        cp._install_requirements({"id": "x", "pip": "skip"}, node_dir, log=lambda *_: None)
        verifie(True, "pip policy 'skip' ne lance jamais pip meme si requirements.txt existe")
    except AssertionError as e:
        verifie(False, str(e))
    finally:
        cp._run = vrai_run


# --------------------------------------------- 7. modele deja present -> skip
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    target_dir = root / "models" / "checkpoints"
    target_dir.mkdir(parents=True)
    (target_dir / "existe_deja.safetensors").write_bytes(b"stub")
    fake_manifest = {
        "comfyui_core": {},
        "custom_nodes": [],
        "models": [
            {"filename": "existe_deja.safetensors", "dest": "checkpoints",
             "url": "https://example.invalid/x.safetensors"},
            {"filename": "manque_sans_url.safetensors", "dest": "checkpoints", "url": None},
        ],
    }
    vrai_download = cp._download
    cp._download = lambda *a, **kw: refuse_appel()
    try:
        downloaded = cp.ensure_models(fake_manifest, root, log=lambda *_: None)
        verifie(downloaded == [], "aucun telechargement quand le fichier existe deja")
    except AssertionError as e:
        verifie(False, str(e))
    finally:
        cp._download = vrai_download


print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
print("=" * 70)
sys.exit(1 if KO else 0)
