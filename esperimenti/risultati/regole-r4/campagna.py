"""Builds the R4 live check's campaign (README.md): a copy of the invented fixture tana as a one-session package with
three scenes (one run each), PCs with more hit points than the fixture's first level.

    python3 -I esperimenti/risultati/regole-r4/campagna.py <fixture dir> <destination dir>
"""
import shutil
import sys
from pathlib import Path

import yaml


def scena(base: dict, **campi) -> dict:
    s = dict(base)
    s.update(campi)
    for k in ("indizi", "gregari") if "png_presenti" in campi else ():
        if k not in campi:
            s.pop(k, None)
    return s


def main() -> int:
    da, a = Path(sys.argv[1]), Path(sys.argv[2])
    if a.exists():
        shutil.rmtree(a)
    shutil.copytree(da, a)
    p = a / "campagna.yaml"
    t = p.read_text().replace("sessione:\n  riassunto_iniziale: Siete entrati nella tana sotto la collina.\n", "")
    p.write_text(t + "# This copy is the R4 live check's campaign (esperimenti/risultati/regole-r4/rifai.sh).\n")
    base = yaml.safe_load((a / "scena.yaml").read_text())
    (a / "scena.yaml").unlink()
    cartella = a / "sessioni/01/scene"
    cartella.mkdir(parents=True)
    scene = {
        "scena_tana": base,
        "scena_cenere": scena(
            base, id="scena_cenere", nome="La fossa di cenere",
            descrizione="Una fossa dove i predoni bruciavano gli scarti, con la cenere alta fino alle caviglie. Un drago di brina, piccolo come un cane, dorme su una lastra di ghiaccio; nella cenere qualcosa si muove.",
            domanda_drammatica="Il gruppo attraverserà la fossa senza farsi avvelenare o gelare?",
            png_presenti=["png_serpe", "png_drago"],
            apertura="La cenere si muove sotto i vostri piedi. Sulla lastra di ghiaccio il drago apre la bocca. Che fate?",
            taglio="Si chiude quando la fossa è attraversata.", mossa_morbida_pronta="Il drago soffia una nuvola bianca.",
            gregari=[], indizi=[]),
        "scena_lanterna": scena(
            base, id="scena_lanterna", nome="La stanza della lanterna",
            descrizione="Una stanza rotonda in fondo al passaggio, con una lanterna spenta appesa al soffitto. Sotto la lanterna galleggia una figura grigia che manda freddo.",
            domanda_drammatica="Il gruppo scaccerà lo spettro della lanterna?",
            png_presenti=["png_spettro"],
            apertura="La figura grigia si volta verso di voi e la lanterna oscilla. Che fate?",
            taglio="Si chiude quando lo spettro è sparito.", mossa_morbida_pronta="La lanterna oscilla e il freddo aumenta.",
            gregari=[], indizi=[]),
    }
    for nome, s in scene.items():
        (cartella / f"{nome}.yaml").write_text(yaml.safe_dump(s, allow_unicode=True, sort_keys=False, width=110))
    (a / "sessioni/01/sessione.yaml").write_text(
        'titolo: "La tana sotto la collina"\n'
        'riassunto_iniziale: "Siete entrati nella tana sotto la collina, dove i predoni tengono il bottino."\n'
        "scene: [scena_tana, scena_cenere, scena_lanterna]\n")
    # More hit points than the fixture's first-level PCs, so a fight lasts a few rounds; Dario stays the frail one.
    pg = a / "pg.yaml"
    d = yaml.safe_load(pg.read_text())
    for x in d["personaggi"]:
        x["scheda"]["pf"] = {"pg_bruna": 18, "pg_dario": 8, "pg_selva": 12}[x["id"]]
    # A younger drake than the fixture's (2 hit dice, so its breath is 2d8, not 4d8): first-level PCs survive one breath.
    dr = a / "png/png_drago.yaml"
    t = dr.read_text()
    assert "  mostro: drago_brina\n" in t
    dr.write_text(t.replace("  mostro: drago_brina\n", "  mostro: drago_brina\n  dadi_vita: \"2**\"\n"))
    pg.write_text("# The R4 live check's PCs: the fixture's, with more hit points (campagna.py).\n" + yaml.safe_dump(d, allow_unicode=True, sort_keys=False, width=110))
    return 0


if __name__ == "__main__":
    sys.exit(main())
