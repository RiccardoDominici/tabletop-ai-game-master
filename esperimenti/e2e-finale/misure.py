"""Measures of one harness run of the final e2e test (docs/e2e-finale.md).

    python3 -I misure.py <results dir: esperimenti/risultati/e2e-finale/<label>> <server logs dir of that run> [--json out.json]

Reads only what the run wrote: riepilogo.json, turni.jsonl, trascrizione.md of the harness, and the server's
server.jsonl, narrazioni.jsonl and sceneggiatore/ of that port. Prints a compact report; --json also writes
the numbers. It never prints keys or tokens (the logs do not contain them: the master token is omitted).
"""
from __future__ import annotations

import collections
import json
import re
import statistics
import sys
from pathlib import Path


def jsonl(p: Path) -> list[dict]:
    if not p.exists():
        return []
    out = []
    for riga in p.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            out.append(json.loads(riga))
        except json.JSONDecodeError:
            pass
    return out


def med(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return round(statistics.median(xs)) if xs else None


def peggiore(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return max(xs) if xs else None


def turni_trascrizione(testo: str) -> dict[int, dict]:
    """Per turn of trascrizione.md: actions (pg, private?) and the narrator's protocol lines."""
    turni: dict[int, dict] = {}
    for blocco in re.split(r"^## Turno ", testo, flags=re.M)[1:]:
        m = re.match(r"(\d+)", blocco)
        if not m:
            continue
        n = int(m.group(1))
        azioni = re.findall(r"^- (pg_\w+)( \(privata\))?: «(.*)»$", blocco, flags=re.M)
        codice = re.search(r"```text\n(.*?)```", blocco, flags=re.S)
        righe = codice.group(1).splitlines() if codice else []
        turni[n] = {"azioni": [(pg, bool(p), a) for pg, p, a in azioni], "righe": righe}
    return turni


def main() -> None:
    ris = Path(sys.argv[1])
    logd = Path(sys.argv[2])
    out_json = sys.argv[sys.argv.index("--json") + 1] if "--json" in sys.argv else None
    r = json.loads((ris / "riepilogo.json").read_text(encoding="utf-8"))
    turni = jsonl(ris / "turni.jsonl")
    server = jsonl(logd / "server.jsonl")
    narr = jsonl(logd / "narrazioni.jsonl")
    scen = jsonl(logd / "sceneggiatore" / "sceneggiatore.jsonl")
    trasc = turni_trascrizione((ris / "trascrizione.md").read_text(encoding="utf-8"))
    M: dict = {"etichetta": ris.name}

    # --- flow of the game
    M["turni"] = {"giocati": r.get("turni"), "copione": r.get("turni_copione"), "fine_prima": r.get("fine_prima_del_copione"),
                  "finale": r.get("finale"), "cambi_scena": [c.get("a") for c in r.get("cambi_di_scena") or []],
                  "orologi_max": (r.get("orologi") or {}).get("massimo")}

    # --- secrets
    f = r.get("fughe") or {}
    M["fughe"] = {"improvvisate": f.get("improvvisate"), "prescritte": f.get("prescritte"), "elenco": f.get("elenco", [])[:8],
                  "righe_segrete_fermate": sum(int(t.get("righe_segrete_fermate") or 0) for t in turni),
                  "selettore_con_parola_segreta": [x.get("parole") for x in server if x.get("msg") == "repertorio: parola segreta nel messaggio del selettore"]}

    # --- private actions and what the table heard of them
    nomi_pg = {}
    for x in server:
        if x.get("msg") == "telefono: PG scelto" and x.get("id_pg") and x.get("nome"):
            nomi_pg[x["id_pg"]] = x["nome"]
    sospette = []
    private_tot = 0
    privato_righe = 0
    for n, t in sorted(trasc.items()):
        private = [pg for pg, p, _ in t["azioni"] if p]
        pubbliche = {pg for pg, p, _ in t["azioni"] if not p}
        private_tot += len(private)
        privato_righe += sum(1 for l in t["righe"] if l.startswith("[privato"))
        for pg in private:
            if pg in pubbliche:
                continue  # the same PC also acted in public: its name at the table is expected
            breve = pg.removeprefix("pg_").replace("_", " ").lower()
            for l in t["righe"]:
                if l.startswith(("[privato", "[invito", "[usa", "[orologio", "[ritmo", "[fine")):
                    continue
                if re.search(rf"\b{re.escape(breve)}\b", l.lower()):
                    sospette.append({"turno": n, "pg": pg, "riga": l[:160]})
    M["private"] = {"azioni_private": private_tot, "righe_privato": privato_righe,
                    "esiti_privati_log": sum(1 for x in server if x.get("msg") == "narratore: esito privato"),
                    "righe_al_tavolo_sospette": len(sospette), "sospette": sospette[:10]}

    # --- dice and rules
    risolte = [x for x in server if str(x.get("msg", "")).startswith("prove: azione risolta")]
    con_tiri = [x for x in risolte if x.get("tiri")]
    regole = collections.Counter()
    for x in con_tiri:
        for t in x["tiri"]:
            regole[re.sub(r"[+-]?\d+", "N", str(t.get("regola") or t.get("etichetta")))[:90]] += 1
    tipi = collections.Counter(str(x.get("tipo")) for x in risolte)
    dadi = collections.Counter(str(x.get("dado")) for x in server if x.get("msg") == "dadi: tiro")
    M["prove"] = {"azioni_risolte": len(risolte), "con_tiro": len(con_tiri), "tipi": dict(tipi), "dadi": dict(dadi),
                  "regole_tipo": dict(regole.most_common(12)),
                  "set": next((x.get("id") for x in server if x.get("msg") == "regole: set della campagna"), None),
                  "arbitro": next((x.get("arbitro") for x in server if str(x.get("msg", "")).startswith("PROVE E DADI")), None)}

    # --- combat
    comb = collections.Counter(str(x.get("msg")) for x in server if str(x.get("msg", "")).startswith(("combattimento", "azioni: rinviate")))
    fatti = []
    for x in server:
        s = json.dumps(x, ensure_ascii=False)
        if re.search(r"morale|a terra|svenut|tiri? contro la morte|salvezza contro la morte|muore|morto|fugg", s, flags=re.I) and "regole: set" not in s:
            fatti.append(f"{x.get('msg')}: {s[:220]}")
    M["combattimento"] = {"eventi": dict(comb), "fatti_morale_terra": len(fatti), "esempi": fatti[:8]}

    # --- the reader, the scriptwriter and «nessuna»
    lettore = [x for x in server if x.get("msg") == "lettore minimo: scelte del turno"]
    scelte = [s for x in lettore for s in (x.get("scelte") or [])]
    nessuna = sum(1 for s in scelte if s.endswith(":nessuna") or s.endswith(":null"))
    classif = [x.get("ms") for x in server if x.get("msg") == "lettore minimo: azione classificata all’invio"]
    sc_narr = [x for x in narr if x.get("tipo") == "sceneggiatore"]
    per_tipo = collections.Counter((x.get("tipo_richiesta"), x.get("esito")) for x in sc_narr)
    consegnate = sum(1 for x in sc_narr if x.get("consegnata"))
    scartate = collections.Counter()
    for x in sc_narr:
        for s in x.get("scartate") or []:
            scartate[str(s.get("motivo") if isinstance(s, dict) else s)[:80]] += 1
    dette = sum(1 for x in server if x.get("msg") == "sceneggiatore: battuta detta a finestra aperta")
    M["lettore"] = {"scelte": len(scelte), "nessuna": nessuna, "ms_classifica_med": med(classif), "ms_classifica_peggiore": peggiore(classif)}
    M["sceneggiatore"] = {"richieste": dict((f"{a}:{b}", v) for (a, b), v in per_tipo.items()), "consegnate": consegnate,
                          "dette_a_finestra_aperta": dette, "accettate": sum(len(x.get("accettate") or []) for x in sc_narr),
                          "scartate": dict(scartate.most_common(8)),
                          "ms_claude_med": med([x.get("ms_claude") for x in sc_narr]),
                          "ms_totale_med_subito": med([x.get("ms_totale") for x in sc_narr if x.get("tipo_richiesta") == "subito"]),
                          "processo": dict(collections.Counter(str(x.get("esito")) for x in scen))}

    # --- timings
    lat = r.get("latenze") or {}
    ts = [t.get("ts") for t in turni if t.get("ts")]
    from datetime import datetime
    dt = [(datetime.fromisoformat(b.replace("Z", "+00:00")) - datetime.fromisoformat(a.replace("Z", "+00:00"))).total_seconds() for a, b in zip(ts, ts[1:])]
    M["tempi"] = {k: lat.get(k) for k in ("finestra_ms", "llm_prima_frase", "voce_primo_audio", "schermo_inizio_audio", "llm_fine", "audio_fine")}
    M["tempi"]["s_tra_turni_med"] = med(dt)
    M["tempi"]["s_tra_turni_peggiore"] = peggiore(dt)

    # --- voice and the virtual projector
    pv = r.get("proiettore_virtuale") or []
    M["voce"] = {"motore": r.get("voce"), "buchi": r.get("buchi"),
                 "proiettore_secondi": round(sum(float(x.get("secondi") or 0) for x in pv)),
                 "errori_voce": dict(collections.Counter(str(x.get("msg")) for x in server if x.get("level", 30) >= 40 and "voce" in str(x.get("msg")))) }

    # --- logs
    avvisi = collections.Counter((x.get("level"), str(x.get("msg"))[:100]) for x in server if x.get("level", 30) >= 40)
    M["log"] = {"errori": sum(v for (l, _), v in avvisi.items() if l >= 50), "avvisi": sum(v for (l, _), v in avvisi.items() if l == 40),
                "per_messaggio": [f"{l} ×{v} {m}" for (l, m), v in avvisi.most_common(15)],
                "provider": [str(x.get("msg"))[10:90] for x in server if str(x.get("msg", "")).startswith("PROVIDER:")]}
    # --- the evening's closing (--ore, --chiudi) and the second pass's new combat facts
    serata = r.get("serata") or {}
    chiusura = serata.get("chiusura") or {}
    M["serata"] = {"ore": serata.get("ore"), "consiglio_ai_turni": serata.get("consiglio_ai_turni"),
                   "chiusura": {k: (v if not isinstance(v, (list, str)) or len(str(v)) < 400 else str(v)[:400] + "…") for k, v in chiusura.items()} if isinstance(chiusura, dict) else chiusura}
    tutti_fatti = [f for x in server if x.get("msg") == "prove: tiri del turno" for f in (x.get("fatti") or [])]
    M["combattimento"]["fatti_morale"] = [f[:160] for f in tutti_fatti if "orale" in f][:6]
    M["combattimento"]["fatti_a_terra"] = [f[:160] for f in tutti_fatti if "A TERRA" in f or "a terra" in f][:8]
    M["combattimento"]["fuori_gioco_log"] = dict(collections.Counter(str(x.get("msg")) for x in server
                                                 if re.search(r"fuori (gioco|scena|combattimento)|esce dalla scena|non è più in scena", str(x.get("msg")))))
    M["costo_usd"] = r.get("costo_totale_usd")
    M["righe"] = {"prescritte": r.get("righe_prescritte"), "improvvisate": r.get("righe_improvvisate"), "usa_rifiutati": r.get("usa_rifiutati"),
                  "azioni_pubbliche": r.get("azioni_pubbliche"), "azioni_senza_risposta": r.get("azioni_senza_risposta"), "riparazioni": r.get("riparazioni")}

    testo = json.dumps(M, ensure_ascii=False, indent=1)
    print(testo)
    if out_json:
        Path(out_json).write_text(testo, encoding="utf-8")


if __name__ == "__main__":
    main()
