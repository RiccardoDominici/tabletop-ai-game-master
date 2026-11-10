"""Misura un modello MLX come lettore del modo B (repertorio), contro il riferimento di Haiku.

Uso (dalla radice del repo, con il venv del servizio):
  services/lettore/.venv/bin/python esperimenti/lettore-locale/misura.py --modelli mlx-community/Qwen3-4B-Instruct-2507-4bit
  services/lettore/.venv/bin/python esperimenti/lettore-locale/misura.py --riepilogo          # rigenera risultati.md
  services/lettore/.venv/bin/python esperimenti/lettore-locale/misura.py --esempi A B         # esempi.md per due modelli

Per ogni turno di dati/set.jsonl (costruito da costruisci_set.ts con il prompt vero del server):
- sistema = dati/sistema_<scena>.txt (selettore + contesto compilato), messaggio = il turno;
- il PREFISSO (sistema + inizio del turno utente) è elaborato una volta per scena e tenuto in cache: ogni turno
  elabora solo il suffisso (il messaggio), poi il cache torna al prefisso (trim, o copia se il modello non lo
  permette);
- decodifica greedy (temperatura 0), così i risultati si ripetono.

Scrive risultati/<modello>.jsonl (un record per turno) e, con --riepilogo, risultati.md con una tabella sola.
"""
from __future__ import annotations

import argparse
import copy
import json
import re
import statistics
import subprocess
import sys
import time
from pathlib import Path

import psutil

HERE = Path(__file__).resolve().parent
DATI = HERE / "dati"
RISULTATI = HERE / "risultati"
MAX_TOKEN_USCITA = 700
ATTESA_MFLUX_S = 15
MAX_ATTESA_MFLUX_S = 40 * 60

sys.path.insert(0, str(HERE))
import valida  # noqa: E402


def attendi_nessun_mflux() -> None:
    """La generazione di immagini usa la GPU e falsa i tempi: si aspetta che finisca (vedi il piano)."""
    inizio = time.time()
    while subprocess.run(["pgrep", "-f", "mflux"], capture_output=True).returncode == 0:
        if time.time() - inizio > MAX_ATTESA_MFLUX_S:
            raise SystemExit("mflux ancora attivo dopo 40 minuti: misura annullata")
        print("mflux in esecuzione: attendo, la GPU falserebbe i tempi", flush=True)
        time.sleep(ATTESA_MFLUX_S)


def slug(modello: str) -> str:
    return modello.split("/")[-1].lower()


SET_COMPLETO = DATI / "set.jsonl"
SET_BREVE = DATI / "set_breve.jsonl"


def carica_set(file: Path = SET_COMPLETO) -> list[dict]:
    return [json.loads(riga) for riga in file.read_text(encoding="utf-8").splitlines() if riga.strip()]


def variante_di(file: Path) -> str:
    """Nome della variante dal file del set: «breve» per set_breve.jsonl, altrimenti vuota (completa)."""
    return "breve" if "breve" in file.name else ""


def etichetta_modello(modello: str, variante: str) -> str:
    return f"{slug(modello)}-{variante}" if variante else slug(modello)


def insiemi_di_scena(scena: str, sistema: str) -> tuple[set[str], set[str], set[str]]:
    """Id delle battute, dei PNG e dei PG validi per una scena (dal contesto del server)."""
    png = set(re.findall(r"^- \[(png_\w+)\]", sistema, re.M))
    return png


def ids_pg(record: dict) -> set[str]:
    return set(record["pg"])


def misura_modello(modello: str, set_turni: list[dict], scarica: bool, variante: str = "") -> Path:
    from huggingface_hub import snapshot_download
    from mlx_lm import load, stream_generate
    from mlx_lm.models.cache import can_trim_prompt_cache, make_prompt_cache, trim_prompt_cache
    from mlx_lm.sample_utils import make_sampler
    import mlx.core as mx

    attendi_nessun_mflux()
    if scarica:
        snapshot_download(modello)
    print(f"[{modello}] caricamento", flush=True)
    t_load = time.perf_counter()
    model, tok = load(modello)
    caricamento_s = time.perf_counter() - t_load
    mx.reset_peak_memory()
    processo = psutil.Process()
    sampler = make_sampler(temp=0.0)

    etichetta = etichetta_modello(modello, variante)
    uscita = RISULTATI / f"{etichetta}.jsonl"
    RISULTATI.mkdir(parents=True, exist_ok=True)
    righe_out: list[dict] = []
    prefissi: dict[str, dict] = {}
    scena_corrente = None
    cache = None
    lunghezza_prefisso = 0
    trim_ok = True

    for rec in set_turni:
        sistema = (DATI / rec.get("sistema", f"sistema_{rec['scena']}.txt")).read_text(encoding="utf-8")
        messaggi = [{"role": "system", "content": sistema}, {"role": "user", "content": rec["messaggio"]}]
        try:
            testo_pieno = tok.apply_chat_template(messaggi, tokenize=False, add_generation_prompt=True, enable_thinking=False)
        except TypeError:
            testo_pieno = tok.apply_chat_template(messaggi, tokenize=False, add_generation_prompt=True)
        idx = testo_pieno.index(rec["messaggio"])
        testo_prefisso = testo_pieno[:idx]
        ids_pieni = tok.encode(testo_pieno, add_special_tokens=False)
        ids_prefisso = tok.encode(testo_prefisso, add_special_tokens=False)
        if ids_pieni[: len(ids_prefisso)] != ids_prefisso:
            raise SystemExit("il prefisso non coincide con l'inizio del prompt: tokenizzazione non separabile")
        suffisso = ids_pieni[len(ids_prefisso):]

        if rec["scena"] != scena_corrente:
            scena_corrente = rec["scena"]
            cache = make_prompt_cache(model)
            t_pref = time.perf_counter()
            elabora(model, cache, ids_prefisso)
            mx.eval([c.state for c in cache if hasattr(c, "state")])
            prefissi[scena_corrente] = {"tokens": len(ids_prefisso), "secondi": time.perf_counter() - t_pref}
            lunghezza_prefisso = len(ids_prefisso)
            trim_ok = can_trim_prompt_cache(cache)
            pristino = None if trim_ok else copy.deepcopy(cache)
            print(f"  prefisso {scena_corrente}: {lunghezza_prefisso} token in {prefissi[scena_corrente]['secondi']:.1f} s (trim={trim_ok})", flush=True)
        if not trim_ok:
            cache = copy.deepcopy(pristino)

        t0 = time.perf_counter()
        t_primo = None
        pezzi: list[str] = []
        ultima = None
        for risposta in stream_generate(model, tok, prompt=suffisso, max_tokens=MAX_TOKEN_USCITA, sampler=sampler, prompt_cache=cache):
            if t_primo is None:
                t_primo = time.perf_counter()
            pezzi.append(risposta.text)
            ultima = risposta
        t_fine = time.perf_counter()
        testo = "".join(pezzi)
        if trim_ok:
            # Il cache torna al prefisso: si toglie il suffisso e ciò che è stato generato.
            extra = cache[0].offset - lunghezza_prefisso
            if extra > 0:
                trim_prompt_cache(cache, extra)

        catalogo = set(rec["catalogo_ids"])
        pg = ids_pg(rec)
        png = insiemi_di_scena(rec["scena"], sistema)
        esito = valida.valida(testo, catalogo, pg, png)
        ann, tot, mancanti = valida.annunci(rec["azioni"], esito.righe)
        difetti = [(r.testo, valida.difetti_lingua(r.testo)) for r in valida.righe_di_testo(esito.righe)]
        righe_out.append(
            {
                "id": rec["id"],
                "scena": rec["scena"],
                "token_prompt": len(ids_pieni),
                "token_suffisso": len(suffisso),
                "ttft_ms": round((t_primo - t0) * 1000, 1) if t_primo else None,
                "token_uscita": ultima.generation_tokens if ultima else 0,
                "tps_decodifica": round(ultima.generation_tps, 2) if ultima else None,
                "tps_prefill_suffisso": round(ultima.prompt_tps, 2) if ultima else None,
                "secondi_totali": round(t_fine - t0, 2),
                "ram_mlx_picco_gb": round(mx.get_peak_memory() / 1e9, 2),
                "ram_rss_gb": round(processo.memory_info().rss / 1e9, 2),
                "testo": testo,
                "valida": esito.valida,
                "motivi": esito.motivi,
                "usa": [list(x) for x in esito.usa],
                "annunci": [ann, tot],
                "annunci_mancanti": mancanti,
                "righe_testo": len(difetti),
                "righe_difettose": sum(1 for _, d in difetti if d),
                "difetti_lingua": [d for _, d in difetti if d],
            }
        )
        print(f"  {rec['id']} {rec['scena']}: ttft {righe_out[-1]['ttft_ms']} ms, {righe_out[-1]['tps_decodifica']} tok/s, valida={esito.valida}", flush=True)

    uscita.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in righe_out) + "\n", encoding="utf-8")
    meta = {"modello": modello, "caricamento_s": round(caricamento_s, 2), "prefissi": prefissi, "ram_mlx_picco_gb": round(mx.get_peak_memory() / 1e9, 2)}
    meta["variante"] = variante or "completa"
    (RISULTATI / f"{etichetta}.meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"[{modello}] scritto {uscita}", flush=True)
    return uscita


def elabora(model, cache, ids: list[int]) -> None:
    """Passa i token del prefisso al modello, a blocchi, riempiendo la cache."""
    import mlx.core as mx

    passo = 2048
    for inizio in range(0, len(ids), passo):
        blocco = mx.array([ids[inizio:inizio + passo]])
        logits = model(blocco, cache=cache)
        mx.eval(logits)


def riepilogo_haiku(set_turni: list[dict]) -> dict:
    """Riferimento Haiku: validità, annunci, lingua calcolati con lo stesso validatore; latenze dai run."""
    valide = 0
    annunci = [0, 0]
    righe = 0
    difettose = 0
    for rec in set_turni:
        sistema = (DATI / f"sistema_{rec['scena']}.txt").read_text(encoding="utf-8")
        esito = valida.valida("\n".join(rec["riferimento_haiku"]), set(rec["catalogo_ids"]), ids_pg(rec), insiemi_di_scena(rec["scena"], sistema))
        valide += esito.valida
        a, t, _ = valida.annunci(rec["azioni"], esito.righe)
        annunci[0] += a
        annunci[1] += t
        for r in valida.righe_di_testo(esito.righe):
            righe += 1
            difettose += bool(valida.difetti_lingua(r.testo))
    primi, fini, tok_u = [], [], []
    for cartella in sorted({r["cartella"] for r in set_turni}):
        for riga in (HERE.parent / "risultati" / cartella / "turni.jsonl").read_text(encoding="utf-8").splitlines():
            d = json.loads(riga)
            if d.get("llm_primo_token") is not None:
                primi.append(d["llm_primo_token"])
            if d.get("llm_fine") is not None and d.get("llm_primo_token") is not None and d.get("token_uscita"):
                fini.append(d["llm_fine"] - d["llm_primo_token"])
                tok_u.append(d["token_uscita"])
    tps = [t / (s / 1000) for t, s in zip(tok_u, fini) if s > 0]
    return {
        "nome": "Haiku 5.5 (riferimento, API)",
        "ttft_mediana_ms": statistics.median(primi) if primi else None,
        "tps_mediana": statistics.median(tps) if tps else None,
        "ram_gb": None,
        "valide": valide / len(set_turni),
        "annunci": annunci[0] / annunci[1],
        "accordo": 1.0,
        "jaccard": 1.0,
        "righe_difettose": difettose / righe if righe else 0,
        "turni": len(set_turni),
        "nota": "latenza sui turni dei 5 run (turni.jsonl, tutti i turni del server); accordo di riferimento per definizione",
    }


def riepiloga_modello(righe: list[dict], set_turni: list[dict], modello: str, variante: str = "") -> dict:
    mappa = {r["id"]: r for r in set_turni}
    ttft = [r["ttft_ms"] for r in righe if r["ttft_ms"] is not None]
    tps = [r["tps_decodifica"] for r in righe if r["tps_decodifica"]]
    ann = [0, 0]
    esatti = 0
    jacc = []
    for r in righe:
        ann[0] += r["annunci"][0]
        ann[1] += r["annunci"][1]
        ref = mappa[r["id"]]
        riferimento = set()
        for riga in ref["riferimento_haiku"]:
            m = re.match(r"^\[usa\] (\S+)(?: > (\S+))?$", riga)
            if m:
                riferimento.add((m.group(1), m.group(2)))
        locale = {(u[0], u[1]) for u in r["usa"]}
        e, j = valida.accordo(riferimento, locale)
        esatti += e
        jacc.append(j)
    righe_tot = sum(r["righe_testo"] for r in righe)
    difettose = sum(r["righe_difettose"] for r in righe)
    meta_file = RISULTATI / f"{etichetta_modello(modello, variante)}.meta.json"
    prefissi = json.loads(meta_file.read_text(encoding="utf-8")) if meta_file.exists() else {}
    token = [r["token_prompt"] for r in righe if "token_prompt" in r]
    return {
        "nome": f"{slug(modello)} · {variante or 'completo'}",
        "token_prompt": statistics.median(token) if token else None,
        "ttft_mediana_ms": statistics.median(ttft) if ttft else None,
        "tps_mediana": statistics.median(tps) if tps else None,
        "ram_gb": max(r["ram_mlx_picco_gb"] for r in righe) if righe else None,
        "valide": sum(r["valida"] for r in righe) / len(righe),
        "annunci": ann[0] / ann[1] if ann[1] else 0,
        "accordo": esatti / len(righe),
        "jaccard": statistics.mean(jacc) if jacc else 0,
        "righe_difettose": difettose / righe_tot if righe_tot else 0,
        "turni": len(righe),
        "prefisso": prefissi.get("prefissi", {}),
        "caricamento_s": prefissi.get("caricamento_s"),
    }


def tabella(righe_modelli: list[dict]) -> str:
    def p(x: float | None) -> str:
        return "n.d." if x is None else f"{x * 100:.0f}%"

    def n(x: float | None, d: int = 0) -> str:
        return "n.d." if x is None else f"{x:.{d}f}"

    intestazione = (
        "| Modello · prompt | Token del prompt (mediana) | TTFT mediana (ms) | Token/s (decodifica) | RAM picco MLX (GB) | Turni validi | Annuncio azioni | "
        "Accordo esatto con Haiku | Accordo id (Jaccard) | Righe in lingua sbagliata o rotte | Turni |\n"
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n"
    )
    corpo = ""
    for r in righe_modelli:
        corpo += (
            f"| {r['nome']} | {n(r.get('token_prompt'))} | {n(r['ttft_mediana_ms'])} | {n(r['tps_mediana'], 1)} | {n(r['ram_gb'], 2)} | "
            f"{p(r['valide'])} | {p(r['annunci'])} | {p(r['accordo'])} | {n(r['jaccard'], 2)} | "
            f"{p(r['righe_difettose'])} | {r['turni']} |\n"
        )
    return intestazione + corpo


def scrivi_riepilogo(modelli: list[str]) -> None:
    set_turni = carica_set()
    righe_modelli = [riepiloga_haiku_row(set_turni)]
    for m in modelli:
        for variante in ("", "breve"):
            f = RISULTATI / f"{etichetta_modello(m, variante)}.jsonl"
            if not f.exists():
                continue
            righe = [json.loads(x) for x in f.read_text(encoding="utf-8").splitlines() if x.strip()]
            righe_modelli.append(riepiloga_modello(righe, set_turni, m, variante))
    testo = [
        "# Lettore locale: risultati (modo B, nozze-neve)",
        "",
        f"Set: {len(set_turni)} turni del selettore dai 5 run B di nozze-neve (esperimenti/risultati/nozze-neve-*-B*). "
        "Prompt: sistema = prompts/selettore.md + contesto compilato con la rete di sicurezza + blocco audio, come in "
        "apps/server/src/avvio.ts; messaggio = compilaMessaggioTurno (apps/server/src/narrazione/messaggio.ts). "
        "Prefisso (sistema) in cache, una volta per scena. Decodifica greedy, max 700 token.",
        "",
        "Limiti: il catalogo di ogni turno è quello STATICO della scena (il massimo possibile, come "
        "`strumenti/contesto_modo_b.ts --catalogo`), non quello filtrato dal Motore; la preselezione «Battute indicate» "
        "non si ricostruisce. Il validatore controlla gli [usa] contro il catalogo statico. Le latenze di Haiku vengono "
        "dai turni.jsonl dei run, quindi includono rete e coda API.",
        "",
        "## Tabella",
        "",
        tabella(righe_modelli),
        "Metodo: TTFT = dall'invio del suffisso (il messaggio del turno) al primo token, con il prefisso già in cache. "
        "Accordo esatto = stessi [usa] (id e PG) del riferimento di Haiku nel turno. Jaccard = somiglianza degli insiemi "
        "di id. Annuncio = azione con almeno una riga [narratore] che nomina il PG. Lingua = riga di testo con scrittura "
        "estranea, inglese (almeno due parole inglesi e più di quelle italiane), ripetizioni o markup residuo.",
        "",
    ]
    (HERE / "risultati.md").write_text("\n".join(testo), encoding="utf-8")
    print(f"scritto {HERE / 'risultati.md'}")


def riepiloga_haiku_row(set_turni: list[dict]) -> dict:
    return riepilogo_haiku(set_turni)


def scrivi_esempi(a: str, b: str) -> None:
    """Cinque turni a confronto: riferimento Haiku contro i due modelli migliori, scelti a distanza uguale."""
    set_turni = carica_set()
    mappa = {r["id"]: r for r in set_turni}
    righe_a = {r["id"]: r for r in map(json.loads, (RISULTATI / f"{slug(a)}.jsonl").read_text(encoding="utf-8").splitlines())}
    righe_b = {r["id"]: r for r in map(json.loads, (RISULTATI / f"{slug(b)}.jsonl").read_text(encoding="utf-8").splitlines())}
    comuni = [r["id"] for r in set_turni if r["id"] in righe_a and r["id"] in righe_b]
    passo = max(1, len(comuni) // 5)
    scelti = [comuni[i * passo] for i in range(5)]
    blocchi = [f"# Esempi a confronto: Haiku contro {a} e {b}", "", "Cinque turni scelti a distanza uguale nel set (stesso ordine dei run). Testo come lo legge il selettore: le righe [usa] mostrano la battuta scelta.", ""]
    for n, id_ in enumerate(scelti, 1):
        r = mappa[id_]
        azioni = "\n".join(f"- {x['nome']} ({x['id_pg']}): «{x['testo']}»" for x in r["azioni"])
        blocchi += [
            f"## Esempio {n}: {id_} ({r['cartella']}, turno {r['turno']}, {r['scena']})",
            "",
            "**Azioni dei giocatori**",
            "",
            azioni,
            "",
            "**Haiku (riferimento)**",
            "",
            "```text\n" + "\n".join(r["riferimento_haiku"]) + "\n```",
            "",
            f"**{a}**",
            "",
            "```text\n" + righe_a[id_]["testo"].strip() + "\n```",
            "",
            f"**{b}**",
            "",
            "```text\n" + righe_b[id_]["testo"].strip() + "\n```",
            "",
        ]
    (HERE / "esempi.md").write_text("\n".join(blocchi), encoding="utf-8")
    print(f"scritto {HERE / 'esempi.md'}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--modelli", nargs="*", default=[], help="repo MLX da misurare, uno alla volta")
    p.add_argument("--scarica", action="store_true", help="scarica il modello se manca (snapshot_download)")
    p.add_argument("--limite", type=int, default=0, help="misura solo i primi N turni (prova rapida)")
    p.add_argument("--breve", action="store_true", help="usa il set con il prompt breve (set_breve.jsonl)")
    p.add_argument("--riepilogo", action="store_true", help="rigenera risultati.md dai jsonl già misurati")
    p.add_argument("--esempi", nargs=2, metavar=("A", "B"), help="scrive esempi.md per due modelli già misurati")
    args = p.parse_args()

    file_set = SET_BREVE if args.breve else SET_COMPLETO
    set_turni = carica_set(file_set)
    if args.limite:
        set_turni = set_turni[: args.limite]
    for m in args.modelli:
        misura_modello(m, set_turni, args.scarica, variante_di(file_set))
    if args.modelli or args.riepilogo:
        base = sorted({f.stem.removesuffix("-breve") for f in RISULTATI.glob("*.jsonl")})
        scrivi_riepilogo(args.modelli or [f"mlx-community/{b}" for b in base])
    if args.esempi:
        scrivi_esempi(*args.esempi)


if __name__ == "__main__":
    main()
