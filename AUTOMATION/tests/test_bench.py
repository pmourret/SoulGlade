# -*- coding: utf-8 -*-
"""Banc de comparaison de variantes — deuxieme capacite de plateforme (J8.5,
ADR-0021). Grandit etape par etape (§5 du chantier) :

  [1] base.py : les trois tables bench_run/bench_variant/bench_score,
      aller-retour + isolation (jamais dans image/score/batch)
  [2] liste blanche d'axes + garantie « un seul axe change »
  [3] verdict : agregation, marge/min_seeds configurables, jamais un seuil
      en dur — sur des scores SYNTHETIQUES (pas une generation reelle dont
      l'issue n'est pas pilotable en test)
  [4] LE test que l'enonce exige : run_bench() reel, meme code, sur Lena
      (flux) PUIS Abyssiaelle (sdxl) — ComfyUI + python_embeded requis,
      degrade proprement sinon (meme discipline que test_platform_
      capabilities.py, J8.4)

Personnage/run jetables (prefixe "probe-"), nettoyes a la fin — jamais dans
un personnage reel. [1]-[3] ne touchent jamais ComfyUI.

Lancer :  python_embeded\\python.exe AUTOMATION\\tests\\test_bench.py
"""
import importlib.util
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION))

import base   # noqa: E402
import bench  # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


RUN_ID = "probe-bench-test"
CID = "probe_bench_j85"

try:
    print("=" * 70)
    print("banc de comparaison de variantes (J8.5)")
    print("=" * 70)

    # --------------------------------------------- [1] base.py : aller-retour
    print("\n[1] bench_run/bench_variant/bench_score : aller-retour + isolation")
    with base.ouvrir() as cx:
        avant_image = cx.execute("SELECT COUNT(*) FROM image").fetchone()[0]
        avant_score = cx.execute("SELECT COUNT(*) FROM score").fetchone()[0]
        avant_batch = cx.execute("SELECT COUNT(*) FROM batch").fetchone()[0]

        base.bench_creer_run(cx, RUN_ID, CID, "steps", "probe_scene", [1, 2, 3])
        base.bench_creer_run(cx, RUN_ID, CID, "steps", "probe_scene", [9, 9, 9])
        vid_ref = base.bench_enregistrer_variante(cx, RUN_ID, "reference", "batch-a",
                                                   {}, est_reference=True)
        vid_b = base.bench_enregistrer_variante(cx, RUN_ID, "steps=30", "batch-b",
                                                {"axis": "steps", "value": 30})
        for seed in (1, 2, 3):
            base.bench_enregistrer_score(cx, vid_ref, seed, "identite", 0.70 + seed * 0.01)
            base.bench_enregistrer_score(cx, vid_b, seed, "identite", 0.75 + seed * 0.01)
        cx.commit()

        run = cx.execute("SELECT seeds_json FROM bench_run WHERE id = ?",
                         (RUN_ID,)).fetchone()
        verifie(run is not None and run["seeds_json"] == "[1, 2, 3]",
                "bench_creer_run est idempotent : la 2e creation (seeds [9,9,9]) "
                f"n'a pas ecrase la 1ere ({run['seeds_json'] if run else None})")

        rows = base.bench_scores(cx, RUN_ID)
        verifie(len(rows) == 6, f"6 scores relus (2 variantes x 3 seeds) : {len(rows)}")
        labels = {r["label"] for r in rows}
        verifie(labels == {"reference", "steps=30"}, f"les deux variantes presentes : {labels}")
        ref_rows = [r for r in rows if r["label"] == "reference"]
        verifie(all(r["est_reference"] == 1 for r in ref_rows),
                "est_reference correctement porte")

        apres_image = cx.execute("SELECT COUNT(*) FROM image").fetchone()[0]
        apres_score = cx.execute("SELECT COUNT(*) FROM score").fetchone()[0]
        apres_batch = cx.execute("SELECT COUNT(*) FROM batch").fetchone()[0]
        verifie((avant_image, avant_score, avant_batch)
               == (apres_image, apres_score, apres_batch),
                "AUCUNE ligne dans image/score/batch — le banc vit dans ses "
                "propres tables, jamais une reutilisation taguee")

        # idempotence de l'ecriture de variante : re-enregistrer la meme
        # (bench_run_id, label) met a jour, ne duplique pas
        vid_ref_2 = base.bench_enregistrer_variante(cx, RUN_ID, "reference", "batch-a-bis",
                                                     {}, est_reference=True)
        cx.commit()
        verifie(vid_ref_2 == vid_ref, "reecrire la meme variante met a jour, ne duplique pas")
        n_variantes = cx.execute(
            "SELECT COUNT(*) FROM bench_variant WHERE bench_run_id = ?",
            (RUN_ID,)).fetchone()[0]
        verifie(n_variantes == 2, f"toujours 2 variantes, pas 3 ({n_variantes})")

    # ------------------------------------- [2] liste blanche + un seul axe
    print("\n[2] liste blanche d'axes, garantie « un seul axe change »")
    ref_cfg = {"identity": {"weight": 0.7}, "preset": {"steps": 20, "guidance": 2.2}}

    variant_cfg = bench.build_variant_cfg(ref_cfg, "steps", 30)
    verifie(variant_cfg["preset"]["steps"] == 30 and variant_cfg["identity"]["weight"] == 0.7,
            "build_variant_cfg change SEULEMENT l'axe demande")
    verifie(ref_cfg["preset"]["steps"] == 20,
            "reference_cfg n'est jamais mute (deepcopy)")
    try:
        bench.validate_variant_cfg(ref_cfg, variant_cfg, "steps", is_reference=False)
        verifie(True, "un seul axe change -> accepte")
    except bench.MultiAxisError as e:
        verifie(False, f"aurait du etre accepte : {e}")

    variant_cfg_2axes = bench.build_variant_cfg(ref_cfg, "steps", 30)
    variant_cfg_2axes["identity"]["weight"] = 0.9   # second axe touche a la main
    attend_leve = False
    try:
        bench.validate_variant_cfg(ref_cfg, variant_cfg_2axes, "steps", is_reference=False)
    except bench.MultiAxisError:
        attend_leve = True
    verifie(attend_leve, "deux axes touches -> MultiAxisError, jamais silencieux")

    attend_leve = False
    try:
        bench.build_variant_cfg(ref_cfg, "base_gelee", "autre.png")
    except bench.UnknownAxisError:
        attend_leve = True
    verifie(attend_leve, "axe hors liste blanche (base_gelee) -> UnknownAxisError")

    overrides = bench.build_variant_job_overrides("sampler", "dpmpp_2m")
    verifie(overrides == {"sampler_name": "dpmpp_2m"},
            f"axe de job (sampler) -> job['overrides'], pas cfg : {overrides}")
    verifie(bench.build_variant_job_overrides("steps", 30) == {},
            "axe de cfg (steps) -> aucune surcharge de job")

    # ----------------------------------------------------------- [3] verdict
    print("\n[3] verdict : agrege, compare a la reference, jamais un seuil en dur")
    with base.ouvrir() as cx:
        base.bench_creer_run(cx, RUN_ID + "-verdict", CID, "steps", "probe_scene", [1, 2, 3, 4, 5])
        vid_ref = base.bench_enregistrer_variante(cx, RUN_ID + "-verdict", "reference",
                                                   "b-ref", {}, est_reference=True)
        vid_up = base.bench_enregistrer_variante(cx, RUN_ID + "-verdict", "steps=30",
                                                  "b-up", {"axis": "steps", "value": 30})
        vid_down = base.bench_enregistrer_variante(cx, RUN_ID + "-verdict", "steps=10",
                                                    "b-down", {"axis": "steps", "value": 10})
        # reference : identite ~0.70, nettete ~50 ; steps=30 : identite MEILLEURE
        # ET nettete MEILLEURE ; steps=10 : les deux PIRES.
        for seed, ident, net in zip((1, 2, 3, 4, 5),
                                    (0.70, 0.71, 0.69, 0.70, 0.71),
                                    (50, 51, 49, 50, 51)):
            base.bench_enregistrer_score(cx, vid_ref, seed, "identite", ident)
            base.bench_enregistrer_score(cx, vid_ref, seed, "nettete", net)
        for seed, ident, net in zip((1, 2, 3, 4, 5),
                                    (0.76, 0.77, 0.75, 0.76, 0.77),
                                    (60, 61, 59, 60, 61)):
            base.bench_enregistrer_score(cx, vid_up, seed, "identite", ident)
            base.bench_enregistrer_score(cx, vid_up, seed, "nettete", net)
        for seed, ident, net in zip((1, 2, 3),  # <-- seulement 3 seeds : sous min_seeds
                                    (0.55, 0.54, 0.56), (30, 29, 31)):
            base.bench_enregistrer_score(cx, vid_down, seed, "identite", ident)
            base.bench_enregistrer_score(cx, vid_down, seed, "nettete", net)
        cx.commit()

    import json
    config_path = OFM / "CHARACTERS" / CID / "config.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(json.dumps({
        "comfy_url": "http://127.0.0.1:8188", "base_gelee": "x.png",
        "preset": {}, "formats": {}, "export_sizes": {},
        "qc": {"threshold_ok": 0.5, "threshold_watch": 0.3},
        "export": {"enabled": False},
        "bench": {"min_seeds": 5, "min_sigma": 2,
                  "margin": {"identite": 0.02, "nettete": 3}},
    }), encoding="utf-8")

    verdict = bench.verdict_bench(CID, RUN_ID + "-verdict")
    v_up = verdict["global"]["steps=30"]
    v_down = verdict["global"]["steps=10"]
    verifie(v_up == "meilleure sur tous les axes suivis",
            f"steps=30 (identite+nettete meilleures, marge depassee) -> {v_up!r}")
    verifie(v_down == "insuffisant",
            f"steps=10 n'a que 3 seeds (< min_seeds=5) -> {v_down!r}, jamais un verdict tranche")

    # marge configurable : une marge enorme rend la meme donnee "stable"
    config_path.write_text(json.dumps({
        "comfy_url": "http://127.0.0.1:8188", "base_gelee": "x.png",
        "preset": {}, "formats": {}, "export_sizes": {},
        "qc": {"threshold_ok": 0.5, "threshold_watch": 0.3},
        "export": {"enabled": False},
        "bench": {"min_seeds": 5, "min_sigma": 2,
                  "margin": {"identite": 10.0, "nettete": 100.0}},
    }), encoding="utf-8")
    verdict2 = bench.verdict_bench(CID, RUN_ID + "-verdict")
    verifie(verdict2["global"]["steps=30"] == "stable",
            f"meme donnee, marge configuree tres large -> stable "
            f"({verdict2['global']['steps=30']!r}) — la marge vient de cfg, pas d'une constante")

    # ------------------------------- [2bis] les axes CONTINUS, ouverts le 09/09
    print("\n[2bis] un reglage continu est un axe comme un autre")
    base_cfg = {"identity": {"weight": 0.85, "start_at": 0.1, "end_at": 1.0},
                "preset": {"refiner_denoise": 0.4, "sharpen": 0.3,
                           "grain_strength": 0.0}}
    for axe, valeur, section, cle in (
            ("identity_end_at", 0.8, "identity", "end_at"),
            ("identity_start_at", 0.3, "identity", "start_at"),
            ("refiner_denoise", 0.25, "preset", "refiner_denoise"),
            ("sharpen", 0.6, "preset", "sharpen"),
            ("grain_strength", 0.2, "preset", "grain_strength")):
        v = bench.build_variant_cfg(base_cfg, axe, valeur)
        verifie(v[section][cle] == valeur,
                f"{axe} atterrit dans cfg[{section!r}][{cle!r}] = {v[section][cle]}")
    # la reference n'est jamais touchee : le banc compare deux copies
    verifie(base_cfg["identity"]["end_at"] == 1.0
            and base_cfg["preset"]["refiner_denoise"] == 0.4,
            "la cfg de reference n'est pas modifiee en place")
    # et un axe hors liste blanche reste refuse — la liste s'ouvre, elle ne
    # devient pas une surcharge libre de cfg
    leve = False
    try:
        bench.build_variant_cfg(base_cfg, "base_gelee", "autre.png")
    except bench.UnknownAxisError:
        leve = True
    verifie(leve, "un champ hors liste blanche reste refuse (jamais une surcharge libre)")

    # ------------------------------------- [3bis] un ecart plus petit que le bruit
    # Le test qui aurait attrape le 09/09 : jusqu'a cette date, le verdict ne
    # comparait le delta qu'a la marge. Avec la marge par defaut (0.05) et une
    # mesure qui bouge de plusieurs unites d'une image a l'autre, toute
    # variante recevait « amelioree » ou « degradee » sur du bruit — c'est
    # arrive deux fois sur abyssiaelle-facedetailer du 07/09.
    print("\n[3bis] un ecart noye dans le bruit ne devient jamais un verdict")
    with base.ouvrir() as cx:
        base.bench_creer_run(cx, RUN_ID + "-bruit", CID, "steps", "probe_scene",
                             [1, 2, 3, 4, 5])
        r = base.bench_enregistrer_variante(cx, RUN_ID + "-bruit", "reference",
                                            "b-ref2", {}, est_reference=True)
        c = base.bench_enregistrer_variante(cx, RUN_ID + "-bruit", "steps=30",
                                            "b-c2", {"axis": "steps", "value": 30})
        # +4 de moyenne, soit plus que la marge (3) — mais chaque echantillon
        # s'etale de 30 a 75, donc l'ecart ne veut rien dire
        for seed, ref_net, cand_net in zip((1, 2, 3, 4, 5),
                                           (30, 60, 45, 75, 40),
                                           (34, 64, 49, 79, 44)):
            base.bench_enregistrer_score(cx, r, seed, "nettete", ref_net)
            base.bench_enregistrer_score(cx, c, seed, "nettete", cand_net)
        cx.commit()

    config_path.write_text(json.dumps({
        "comfy_url": "http://127.0.0.1:8188", "base_gelee": "x.png",
        "preset": {}, "formats": {}, "export_sizes": {},
        "qc": {"threshold_ok": 0.5, "threshold_watch": 0.3},
        "export": {"enabled": False},
        "bench": {"min_seeds": 5, "min_sigma": 2,
                  "margin": {"identite": 0.02, "nettete": 3}},
    }), encoding="utf-8")
    v3 = bench.verdict_bench(CID, RUN_ID + "-bruit")
    genre = v3["variantes"]["steps=30"]["genres"]["nettete"]
    verifie(abs(genre["delta"]) > 3,
            f"l'ecart depasse bien la marge de 3 ({genre['delta']:+.1f}) — "
            f"sans le filtre, ce serait un verdict tranche")
    verifie(genre["verdict"] == "stable",
            f"mais il est noye dans le bruit du run -> {genre['verdict']!r}")
    verifie(v3["global"]["steps=30"] == "stable",
            f"et le verdict global ne se contamine pas ({v3['global']['steps=30']!r})")

    # min_sigma vient de cfg, jamais d'une constante : a 0, l'ancien
    # comportement revient a l'identique
    config_path.write_text(json.dumps({
        "comfy_url": "http://127.0.0.1:8188", "base_gelee": "x.png",
        "preset": {}, "formats": {}, "export_sizes": {},
        "qc": {"threshold_ok": 0.5, "threshold_watch": 0.3},
        "export": {"enabled": False},
        "bench": {"min_seeds": 5, "min_sigma": 0,
                  "margin": {"identite": 0.02, "nettete": 3}},
    }), encoding="utf-8")
    v4 = bench.verdict_bench(CID, RUN_ID + "-bruit")
    verifie(v4["variantes"]["steps=30"]["genres"]["nettete"]["verdict"] != "stable",
            "min_sigma=0 redonne l'ancien comportement — le filtre est un reglage")

    # section incomplete : refus explicite, jamais un repli en dur
    config_path.write_text(json.dumps({
        "comfy_url": "http://127.0.0.1:8188", "base_gelee": "x.png",
        "preset": {}, "formats": {}, "export_sizes": {},
        "qc": {"threshold_ok": 0.5, "threshold_watch": 0.3},
        "export": {"enabled": False},
        "bench": {"min_seeds": 5, "margin": {"identite": 0.02}},
    }), encoding="utf-8")
    leve = False
    try:
        bench.verdict_bench(CID, RUN_ID + "-bruit")
    except bench.BenchConfigMissingError:
        leve = True
    verifie(leve, "cfg['bench'] sans min_sigma : refus explicite (invariant 4)")

    # ------------------------------ [3ter] un genre absent de certaines images
    # Dette E5 ouverte en IT-1 : « mains » n'est ecrit que quand DWPose trouve
    # un poignet, donc ce genre arrive a n=3 quand les autres sont a n=5. Deux
    # facons de mentir a partir de la, toutes deux verifiees ici : tirer le
    # verdict global a « insuffisant » alors que trois genres tranchent, et
    # comparer la moyenne de la variante a celle de la reference sur des seeds
    # qui ne sont pas les memes.
    print()
    print("[3ter] un genre sous-echantillonne : "
          "ni verdict global perdu, ni moyennes croisees")
    with base.ouvrir() as cx:
        base.bench_creer_run(cx, RUN_ID + "-mains", CID, "steps", "probe_scene",
                             [1, 2, 3, 4, 5])
        m_ref = base.bench_enregistrer_variante(cx, RUN_ID + "-mains", "reference",
                                                "b-ref3", {}, est_reference=True)
        m_up = base.bench_enregistrer_variante(cx, RUN_ID + "-mains", "steps=30",
                                               "b-up3", {"axis": "steps", "value": 30})
        m_flat = base.bench_enregistrer_variante(cx, RUN_ID + "-mains", "steps=10",
                                                 "b-flat3", {"axis": "steps", "value": 10})
        for seed, ref_i, up_i in zip((1, 2, 3, 4, 5),
                                     (0.70, 0.71, 0.69, 0.70, 0.71),
                                     (0.76, 0.77, 0.75, 0.76, 0.77)):
            base.bench_enregistrer_score(cx, m_ref, seed, "identite", ref_i)
            base.bench_enregistrer_score(cx, m_up, seed, "identite", up_i)
            base.bench_enregistrer_score(cx, m_flat, seed, "identite", ref_i)
        # mains : 3 seeds sur 5 des deux cotes pour steps=30 (main visible),
        # et pour steps=10 des seeds DECALES — seul le 3 est commun.
        for seed in (1, 2, 3):
            base.bench_enregistrer_score(cx, m_ref, seed, "mains", 1.0)
            base.bench_enregistrer_score(cx, m_up, seed, "mains", 1.0)
        for seed, val in ((3, 1.0), (4, 0.0), (5, 0.0)):
            base.bench_enregistrer_score(cx, m_flat, seed, "mains", val)
        cx.commit()

    reglage = {"min_seeds": 5, "min_sigma": 2,
               "margin": {"identite": 0.02, "mains": 0.05}}
    config_path.write_text(json.dumps({
        "comfy_url": "http://127.0.0.1:8188", "base_gelee": "x.png",
        "preset": {}, "formats": {}, "export_sizes": {},
        "qc": {"threshold_ok": 0.5, "threshold_watch": 0.3},
        "export": {"enabled": False}, "bench": reglage,
    }), encoding="utf-8")
    v5 = bench.verdict_bench(CID, RUN_ID + "-mains")
    g_up = v5["global"]["steps=30"]
    verifie(g_up.startswith("meilleure sur tous les axes suivis"),
            f"identite tranche a n=5, mains est a n=3 -> le global tranche quand meme ({g_up!r})")
    verifie("mains" in g_up,
            f"le genre ecarte est nomme dans le global, jamais tu ({g_up!r})")
    verifie(v5["variantes"]["steps=30"]["genres"]["mains"]["verdict"] == "insuffisant",
            "le genre lui-meme reste 'insuffisant' — c'est LUI qui est illisible")

    # appariement : steps=10 n'a qu'un seed en commun avec la reference sur
    # `mains`. Sans appariement on comparerait 0.333 (seeds 3,4,5) a 1.0
    # (seeds 1,2,3) et on rendrait « degradee » sur deux images que la
    # reference n'a jamais produites.
    reglage["min_seeds"] = 1
    config_path.write_text(json.dumps({
        "comfy_url": "http://127.0.0.1:8188", "base_gelee": "x.png",
        "preset": {}, "formats": {}, "export_sizes": {},
        "qc": {"threshold_ok": 0.5, "threshold_watch": 0.3},
        "export": {"enabled": False}, "bench": reglage,
    }), encoding="utf-8")
    v6 = bench.verdict_bench(CID, RUN_ID + "-mains")
    mains_flat = v6["variantes"]["steps=10"]["genres"]["mains"]
    verifie(mains_flat["n"] == 1,
            f"mains n'est compare que sur les seeds communs (n={mains_flat['n']}, attendu 1)")
    verifie(abs(mains_flat["delta"]) < 1e-9 and mains_flat["verdict"] == "stable",
            f"delta sur le seul seed commun ({mains_flat['delta']:.3f}), "
            "jamais 0.333 contre 1.0 sur des seeds differents")

    config_path.unlink()
    (OFM / "CHARACTERS" / CID).rmdir()
    with base.ouvrir() as cx:
        cx.execute("DELETE FROM bench_run WHERE id = ?", (RUN_ID + "-verdict",))
        cx.commit()

    attend_leve = False
    (OFM / "CHARACTERS" / CID).mkdir(parents=True, exist_ok=True)
    (OFM / "CHARACTERS" / CID / "config.json").write_text(json.dumps({
        "comfy_url": "x", "base_gelee": "x.png", "preset": {}, "formats": {},
        "export_sizes": {}, "qc": {"threshold_ok": 0.5, "threshold_watch": 0.3},
        "export": {"enabled": False}}), encoding="utf-8")  # pas de cfg["bench"]
    try:
        bench.verdict_bench(CID, "peu-importe")
    except bench.BenchConfigMissingError:
        attend_leve = True
    verifie(attend_leve,
            "cfg['bench'] absente -> BenchConfigMissingError, jamais un repli en dur")
    (OFM / "CHARACTERS" / CID / "config.json").unlink()
    (OFM / "CHARACTERS" / CID).rmdir()

    # ------------------------------------------- [4] run_bench() reel, deux packs
    print("\n[4] run_bench() reel, MEME CODE, Lena (flux) PUIS Abyssiaelle (sdxl)")
    try:
        urllib.request.urlopen("http://127.0.0.1:8188/system_stats", timeout=3)
        comfy_up = True
    except Exception:
        comfy_up = False

    cv2_ok = importlib.util.find_spec("cv2") is not None

    if not comfy_up:
        print("  note  ComfyUI injoignable sur http://127.0.0.1:8188 — [4] non verifie ici,")
        print("        pas simule comme si ca l'etait. Relancer ce test ComfyUI demarre pour")
        print("        la preuve complete.")
    elif not cv2_ok:
        print("  note  ComfyUI joignable mais cv2/insightface absents de cet interpreteur")
        print("        (attendu sous .venv — ADR-0008, requirements.txt) — [4] non verifie")
        print("        ici. Relancer avec python_embeded\\python.exe pour la preuve complete.")
    else:
        import bench as _bench_source
        source = Path(_bench_source.__file__).read_text(encoding="utf-8")
        verifie("import universe" not in source and "import identity" not in source,
                "aucun import de universe/identity dans bench.py (preuve structurelle)")

        import runner as lb
        bench_ids = {}
        for cid, scene in (("lena", "cafe_terrasse"), ("abyssiaelle", "portrait_etude")):
            steps_actuels = lb.load_config(cid)["preset"]["steps"]
            bench_id = bench.run_bench(cid, scene, seeds=[1001, 1002], axis="steps",
                                       values=[steps_actuels + 5])
            bench_ids[cid] = bench_id
            verdict = bench.verdict_bench(cid, bench_id)
            label = f"steps={steps_actuels + 5}"
            v = verdict["global"][label]
            verifie(v == "insuffisant",
                    f"{cid} : 2 seeds < min_seeds=5 -> verdict 'insuffisant' ({v!r}) — "
                    f"le gate marche aussi sur de vraies donnees, pas juste en synthese")
            bench_root = OFM / "PROD" / cid.upper() / "_BENCH" / bench_id
            verifie(bench_root.is_dir() and any(bench_root.rglob("*.png")),
                    f"{cid} : images reelles produites sous PROD/{cid.upper()}/_BENCH/")
            verifie(not any((OFM / "PROD" / cid.upper()).glob(f"OK/*{bench_id}*"))
                   and not any((OFM / "PROD" / cid.upper()).glob(f"A_REVOIR/*{bench_id}*")),
                    f"{cid} : rien de ce banc n'apparait dans PROD/{cid.upper()}/OK ou A_REVOIR")

        # nettoyage des deux vrais personnages
        import shutil as _sh
        with base.ouvrir() as cx:
            for bid in bench_ids.values():
                cx.execute("DELETE FROM bench_run WHERE id = ?", (bid,))
            cx.commit()
        for cid, bid in bench_ids.items():
            _sh.rmtree(OFM / "PROD" / cid.upper() / "_BENCH" / bid, ignore_errors=True)

    print("\n" + "=" * 70)
    print("tout est vert" if not KO else f"{KO} ECHEC(S)")
    print("=" * 70)
finally:
    import shutil
    with base.ouvrir() as cx:
        for suffixe in ("", "-verdict", "-bruit", "-mains"):
            cx.execute("DELETE FROM bench_run WHERE id = ?", (RUN_ID + suffixe,))
        cx.commit()
    shutil.rmtree(OFM / "CHARACTERS" / CID, ignore_errors=True)

sys.exit(1 if KO else 0)
