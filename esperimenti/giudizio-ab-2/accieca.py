"""Rende cieche le trascrizioni A/B: stesso formato, nessun segno della modalità, etichette X/Y casuali.
La chiave (quale etichetta è quale modalità) va in chiave.json, fuori dalla cartella data al giudice."""
import json, random, re, sys
from pathlib import Path

RIS = Path(__file__).resolve().parents[1] / "risultati"
OUT = Path(sys.argv[1])
rng = random.Random(20261102 + 2)
chiave = {}
for copione in ["caotico", "cauto"]:
    etichette = ["X", "Y"]
    rng.shuffle(etichette)
    for modo, et in zip(["A", "B2"], etichette):
        righe = (RIS / f"prova2-{copione}-{modo}" / "trascrizione.md").read_text().splitlines()
        out = []
        for r in righe:
            if r.startswith("# Trascrizione"):
                out.append(f"# Trascrizione {copione}-{et}")
                continue
            if r.startswith("Modalità:"):
                pg = r.split("PG:")[-1].strip()
                out.append(f"PG: {pg}")
                continue
            if r.startswith("Righe dopo") or r.startswith("Tutte le righe sono improvvisate"):
                continue
            if r.startswith("- righe pre-scritte") or r.startswith("- primo audio"):
                continue
            if r.strip().startswith("[usa]"):
                continue
            m = re.match(r"^\s*⟨[^⟩]*⟩\s*(.*)$", r)
            if m:
                out.append(m.group(1))
                continue
            out.append(r)
        testo = "\n".join(out)
        # togli righe vuote doppie
        testo = re.sub(r"\n{3,}", "\n\n", testo)
        (OUT / f"{copione}-{et}.md").write_text(testo + "\n")
        chiave[f"{copione}-{et}"] = modo
(OUT.parent / "chiave.json").write_text(json.dumps(chiave, indent=1))
print("fatto:", sorted(p.name for p in OUT.iterdir()))
