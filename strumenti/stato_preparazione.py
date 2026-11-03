"""Stato degli asset di una campagna: quali immagini e quali suoni ci sono, quali mancano, quanto pesano.

Lo usa scripts/prepara.sh per decidere che cosa lanciare e per il rapporto finale; si può usare anche
da solo. Non genera e non scrive niente: legge le schede con gli stessi pianificatori delle pipeline
(strumenti/immagini/campagna.py per le immagini, strumenti/audio/descrittori.py per l'audio), così ciò
che «manca» qui è esattamente ciò che le pipeline farebbero. Serve solo PyYAML.

    python3 strumenti/stato_preparazione.py campagne/<id>          rapporto leggibile
    python3 strumenti/stato_preparazione.py campagne/<id> --json   per gli script

Audio da rifare (`audio.da_rifare`) quando: manca il manifest; manca un asset essenziale (la musica di un
luogo, uno dei sei umori, il tema di un PNG); o i descrittori che la pipeline ricaverebbe oggi dalle schede
sono diversi da quelli del suo ultimo giro (audio/descrittori.json): è cambiato qualcosa che l'audio usa.
Gli strati d'ambiente e gli effetti che mancano da soli non bastano: la pipeline li cerca a ogni giro, e
uno che le fonti non hanno (per esempio una catena) farebbe rilanciare tutto ogni volta.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI / "immagini"))
sys.path.insert(0, str(QUI / "audio"))

# Secondi per immagine se il manifest non ne ha (esperimenti/immagini/risultati.md, M1 16 GB).
SECONDI_PREDEFINITI = {"luogo": 360, "situazione": 360, "ritratto": 120}


def peso(cartella: Path) -> int:
    return sum(f.stat().st_size for f in cartella.rglob("*") if f.is_file()) if cartella.is_dir() else 0


def stato_immagini(cartella: Path) -> dict:
    """Immagini attese, presenti, mancanti e VECCHIE (file c'è ma le schede sono cambiate), più le orfane.

    «Vecchia» viene dalla firma nel manifest (strumenti/immagini/freschezza.py): sola lettura, qui non si
    migra né si sposta niente (lo fa genera.py quando gira).
    """
    from campagna import richieste
    from freschezza import classifica
    from manifest import Manifest
    from motore import Motore

    tutte = richieste(cartella)
    man = Manifest(cartella / "immagini")
    vere = [r for r in tutte if not r.alias_di]
    st = classifica(vere, tutte, man, Motore().descrizione)
    mancanti = st.mancanti
    vecchie = [r for r, _ in st.vecchie]
    # Stima del tempo: la media dei secondi già spesi per tipo, o i valori misurati delle prove.
    secondi: dict[str, list[float]] = {}
    for v in man.voci.values():
        if v.get("secondi"):
            secondi.setdefault(v.get("tipo"), []).append(float(v["secondi"]))
    stima = sum((sum(secondi[r.tipo]) / len(secondi[r.tipo])) if secondi.get(r.tipo) else SECONDI_PREDEFINITI.get(r.tipo, 300)
                for r in mancanti + vecchie)
    per_tipo: dict[str, dict[str, int]] = {}
    for r in vere:
        t = per_tipo.setdefault(r.tipo, {"attese": 0, "presenti": 0})
        t["attese"] += 1
        t["presenti"] += r not in mancanti
    return {"manifest": man.percorso.exists(), "attese": len(vere), "presenti": len(vere) - len(mancanti),
            "alias": len(tutte) - len(vere), "per_tipo": per_tipo,
            "mancanti": [{"id": r.id, "tipo": r.tipo} for r in mancanti],
            "vecchie": [{"id": r.id, "tipo": r.tipo, "motivo": m} for r, m in st.vecchie],
            "orfane": st.orfane, "stima_s": round(stima),
            "byte": peso(cartella / "immagini")}


def stato_audio(cartella: Path) -> dict:
    import campagna_audio
    import descrittori as D
    import vocabolario as V

    percorso = cartella / "audio" / "manifest.json"
    man = json.loads(percorso.read_text(encoding="utf-8")) if percorso.exists() else {}

    def presenti(sezione: str) -> set[str]:
        return {v["id"] for v in man.get(sezione) or [] if v.get("id") and (cartella / "audio" / str(v.get("file", ""))).exists()}

    d = D.tutto(campagna_audio.leggi(cartella))
    attesi = {
        "brani": [l.id for l in d["luoghi"] if not l.alias_di and l.musica is not None],
        "umori": [f"umore_{u}" for u in V.UMORI],
        "temi": [f"tema_{t.png}" for t in d["temi"]],
        "ambienti": [f"amb_{l.id.removeprefix('luogo_')}_{tag}" for l in d["luoghi"] if not l.alias_di for tag, _ in l.ambiente],
        "effetti": [f"sfx_{tag}" for tag in d["effetti"]],
    }
    sezioni = {s: {"attesi": len(ids), "presenti": len(set(ids) & presenti(s)),
                   "mancanti": [i for i in ids if i not in presenti(s)]} for s, ids in attesi.items()}
    essenziali = [i for s in ("brani", "umori", "temi") for i in sezioni[s]["mancanti"]]
    facoltativi = [i for s in ("ambienti", "effetti") for i in sezioni[s]["mancanti"]]
    # Ciò che conta per l'audio è cambiato? Si confrontano i descrittori di oggi con quelli dell'ultimo giro,
    # che la pipeline scrive in audio/descrittori.json: una modifica che l'audio non legge non rifà niente.
    file_descrittori = cartella / "audio" / "descrittori.json"
    oggi = json.loads(json.dumps(D.come_json(d), ensure_ascii=False))
    cambiati = not file_descrittori.exists() or json.loads(file_descrittori.read_text(encoding="utf-8")) != oggi
    return {"manifest": percorso.exists(), "sezioni": sezioni, "essenziali_mancanti": essenziali,
            "facoltativi_mancanti": facoltativi, "descrittori_cambiati": cambiati,
            "da_rifare": not percorso.exists() or bool(essenziali) or cambiati,
            "byte": peso(cartella / "audio")}


def stato(cartella: Path) -> dict:
    img, aud = stato_immagini(cartella), stato_audio(cartella)
    return {"campagna": cartella.name, "cartella": str(cartella), "immagini": img, "audio": aud,
            "repertorio": (cartella / "repertorio").is_dir(),
            # Pronta da giocare: i due manifest esistono (il proiettore salta da solo un file mancante).
            "pronta": img["manifest"] and aud["manifest"]}


def mb(n: int) -> str:
    return f"{n / 1e6:.1f} MB"


def rapporto(s: dict) -> str:
    img, aud = s["immagini"], s["audio"]
    righe = [f"Campagna {s['campagna']}"]
    tipi = ", ".join(f"{t} {v['presenti']}/{v['attese']}" for t, v in sorted(img["per_tipo"].items()))
    righe.append(f"  immagini: {img['presenti']}/{img['attese']} ({tipi}; più {img['alias']} alias), {mb(img['byte'])}, "
                 f"manifest {'sì' if img['manifest'] else 'NO'}")
    if img["mancanti"]:
        nomi = ", ".join(m["id"] for m in img["mancanti"][:6]) + ("…" if len(img["mancanti"]) > 6 else "")
        righe.append(f"    mancano {len(img['mancanti'])}: {nomi}")
    if img["vecchie"]:
        nomi = "; ".join(f"{m['id']}: {m['motivo']}" for m in img["vecchie"][:6]) + ("…" if len(img["vecchie"]) > 6 else "")
        righe.append(f"    vecchie {len(img['vecchie'])} (il file c'è ma le schede sono cambiate): {nomi}")
    if img["mancanti"] or img["vecchie"]:
        righe.append(f"    da generare: circa {round(img['stima_s'] / 60)} minuti di GPU")
    if img["orfane"]:
        righe.append(f"    orfane {len(img['orfane'])} (non più nelle schede; genera.py le sposta in immagini/cache/orfane/): "
                     + ", ".join(img["orfane"][:6]))
    sez = ", ".join(f"{k} {v['presenti']}/{v['attesi']}" for k, v in aud["sezioni"].items())
    righe.append(f"  audio: {sez}, {mb(aud['byte'])}, manifest {'sì' if aud['manifest'] else 'NO'}")
    if aud["essenziali_mancanti"]:
        righe.append(f"    mancano (essenziali): {', '.join(aud['essenziali_mancanti'])}")
    if aud["facoltativi_mancanti"]:
        quali = "non trovati dalle fonti nell'ultimo giro" if aud["manifest"] else "da cercare"
        righe.append(f"    strati facoltativi {quali}: {', '.join(aud['facoltativi_mancanti'])}")
    if aud["manifest"] and aud["descrittori_cambiati"]:
        righe.append("    le schede sono cambiate in ciò che l'audio usa: va rifatto il giro della pipeline")
    righe.append(f"  pronta da giocare: {'sì' if s['pronta'] else 'no (serve il manifest delle immagini e dell’audio)'}")
    return "\n".join(righe)


def main() -> int:
    logging.basicConfig(level=logging.ERROR)  # i pianificatori avvisano dei nodi senza prompt: qui non serve
    ap = argparse.ArgumentParser(description="Stato degli asset di una campagna (immagini e audio).")
    ap.add_argument("cartella", type=Path)
    ap.add_argument("--json", action="store_true", help="uscita JSON per gli script")
    a = ap.parse_args()
    if not (a.cartella / "stile.yaml").exists():
        print(f"{a.cartella}: non è la cartella di una campagna", file=sys.stderr)
        return 2
    s = stato(a.cartella.resolve())
    print(json.dumps(s, ensure_ascii=False) if a.json else rapporto(s))
    return 0


if __name__ == "__main__":
    sys.exit(main())
