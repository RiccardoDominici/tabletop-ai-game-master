"""Genera risultati.md ed esempi.md dai file misurati (nessun numero scritto a mano).

Fonti:
- risultati/<modello>[-breve].jsonl e .meta.json      (misura.py: modo B completo, come Haiku)
- risultati/minimi-<modello>[-solo-classificatore].json (minimi.py: modalità A classificatore, B annuncio, C deterministico)
- risultati/claude-scrittore.json                       (claude_scrittore.py: scrittore Claude Code, haiku e sonnet)

Uso (dalla radice del repo):  services/lettore/.venv/bin/python esperimenti/lettore-locale/report.py
"""
from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RISULTATI = HERE / "risultati"
DATI = HERE / "dati"
sys.path.insert(0, str(HERE))
import misura  # noqa: E402


def pct(x: float | None) -> str:
    return "n.d." if x is None else f"{x * 100:.0f}%"


def num(x: float | None, d: int = 0) -> str:
    return "n.d." if x is None else f"{x:.{d}f}"


def carica_set(nome: str) -> list[dict]:
    return [json.loads(r) for r in (DATI / nome).read_text(encoding="utf-8").splitlines() if r.strip()]


def modo_b_righe() -> list[dict]:
    """Riepilogo del modo B (selettore intero) per ogni modello misurato, più Haiku come riferimento."""
    set_completo = carica_set("set.jsonl")
    righe = [misura.riepilogo_haiku(set_completo)]
    for f in sorted(RISULTATI.glob("*.jsonl")):
        variante = "breve" if f.stem.endswith("-breve") else ""
        modello = f"mlx-community/{f.stem.removesuffix('-breve')}"
        dati = [json.loads(x) for x in f.read_text(encoding="utf-8").splitlines() if x.strip()]
        if dati:
            righe.append(misura.riepiloga_modello(dati, set_completo, modello, variante))
    return righe


def tabella_modo_b(righe: list[dict]) -> str:
    testa = (
        "| Modello · prompt | Token del prompt (mediana) | TTFT mediana (ms) | Token/s (decodifica) | RAM picco MLX (GB) | "
        "Turni validi | Annuncio azioni | Accordo esatto con Haiku | Accordo id (Jaccard) | Righe in lingua sbagliata o rotte | Turni |\n"
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n"
    )
    corpo = "".join(
        f"| {r['nome']} | {num(r.get('token_prompt'))} | {num(r['ttft_mediana_ms'])} | {num(r['tps_mediana'], 1)} | "
        f"{num(r['ram_gb'], 2)} | {pct(r['valide'])} | {pct(r['annunci'])} | {pct(r['accordo'])} | {num(r['jaccard'], 2)} | "
        f"{pct(r['righe_difettose'])} | {r['turni']} |\n"
        for r in righe
    )
    return testa + corpo


def minimi_file() -> list[tuple[str, dict]]:
    out = []
    for f in sorted(RISULTATI.glob("minimi-*.json")):
        out.append((f.stem.removeprefix("minimi-"), json.loads(f.read_text(encoding="utf-8"))))
    return out


def tabella_classificatore(file: list[tuple[str, dict]]) -> str:
    testa = (
        "| Modello | Azioni | Haiku ha scelto una battuta | Tetto (id Haiku nei preselezionati) | Accordo esatto con Haiku | "
        "Accordo sul raggiungibile | «nessuna» quando Haiku sceglie | Id fuori catalogo | Invalide dopo un tentativo di recupero | "
        "Risposte valide al primo colpo | Secondi mediani |\n"
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n"
    )
    corpo = ""
    for nome, d in file:
        c = d["riepilogo"]["classificatore"]
        corpo += (
            f"| {nome} | {c['azioni']} | {c['azioni_con_scelta_haiku']} | {pct(c['tetto_raggiungibile'])} | "
            f"{pct(c['accordo_con_haiku'])} | {pct(c['accordo_sul_raggiungibile'])} | {pct(c['nessuna_quando_haiku_sceglie'])} | "
            f"{c['id_fuori_catalogo']} | {c['invalide_dopo_recupero']} | {pct(c['risposte_al_primo_tentativo'])} | {num(c['secondi_mediani'], 2)} |\n"
        )
    return testa + corpo


def tabella_annuncio(file: list[tuple[str, dict]]) -> str:
    testa = (
        "| Modello | Azioni | Nome del PG presente | Entro 12 parole | Con parole nuove rispetto al testo | "
        "Parole nuove (totale) | Lingua corretta |\n"
        "|---|---:|---:|---:|---:|---:|---:|\n"
    )
    corpo = ""
    for nome, d in file:
        if "annuncio" not in d["riepilogo"]:
            continue
        a = d["riepilogo"]["annuncio"]
        corpo += (
            f"| {nome} | {a['azioni']} | {pct(a['nome_presente'])} | {pct(a['entro_12_parole'])} | "
            f"{pct(a['con_parole_nuove'])} | {a['parole_nuove_totali']} | {pct(a['lingua_ok'])} |\n"
        )
    if file and "deterministico" in file[0][1]["riepilogo"]:
        det = file[0][1]["riepilogo"]["deterministico"]
        corpo += (
            f"| C: deterministico («Nome: «testo»», nessun modello) | {det['azioni']} | {pct(det['nome_presente'])} | "
            f"{pct(det['entro_12_parole'])} | {pct(det['con_parole_nuove'])} | {det['parole_nuove_totali']} | {pct(det['lingua_ok'])} |\n"
        )
    return testa + corpo


def tabella_claude() -> str:
    f = RISULTATI / "claude-scrittore.json"
    if not f.exists():
        return "_Nessuna misura Claude Code._\n"
    dati = json.loads(f.read_text(encoding="utf-8"))
    testa = "| Modello | Chiamate | Tempo mediano (s) | Minimo (s) | Massimo (s) | Errori |\n|---|---:|---:|---:|---:|---:|\n"
    corpo = ""
    for m in ("haiku", "sonnet"):
        t = [r["secondi"] for r in dati if r["modello"] == m and not r["errore"]]
        errori = sum(1 for r in dati if r["modello"] == m and r["errore"])
        if t:
            corpo += f"| {m} (claude -p) | {len(t)} | {num(statistics.median(t), 1)} | {num(min(t), 1)} | {num(max(t), 1)} | {errori} |\n"
    return testa + corpo


def sezione_esempi_annuncio(file: list[tuple[str, dict]]) -> str:
    """Dieci annunci del modello locale, accanto al deterministico della stessa azione."""
    d = next((x for n, x in file if "annuncio" in x["riepilogo"]), None)
    if d is None:
        return "_Nessun annuncio misurato._\n"
    det = {(x["turno"], x["nome"], x["testo"]): x for x in d["deterministico"]}
    righe = ["| # | Turno | Azione del giocatore | Annuncio del modello locale | Deterministico |", "|---:|---|---|---|---|"]
    for i, a in enumerate(d["annuncio"][:10], 1):
        k = (a["turno"], a["nome"], a["testo"])
        righe.append(f"| {i} | {a['turno']} | {a['nome']}: «{a['testo']}» | {a['frase']} | {det[k]['frase'] if k in det else ''} |")
    return "\n".join(righe) + "\n"


def sezione_esempi_classificatore(file: list[tuple[str, dict]]) -> str:
    d = next((x for n, x in file if "classificatore" in x["riepilogo"]), None)
    if d is None:
        return "_Nessun classificatore misurato._\n"
    righe = ["| # | Turno | Azione | Candidate | Haiku | Modello locale |", "|---:|---|---|---|---|---|"]
    scelti = [c for c in d["classificatore"] if c["haiku"]][:8]
    for i, c in enumerate(scelti, 1):
        righe.append(f"| {i} | {c['turno']} | {c['nome']}: «{c['testo']}» | {', '.join(c['candidate']) or '(nessuna)'} | {c['haiku']} | {c['scelta']} |")
    return "\n".join(righe) + "\n"


def sezione_esempi_claude() -> str:
    f = RISULTATI / "claude-scrittore.json"
    if not f.exists():
        return "_Nessun esempio Claude Code._\n"
    dati = json.loads(f.read_text(encoding="utf-8"))
    per_turno: dict[str, dict] = {}
    for r in dati:
        per_turno.setdefault(r["turno"], {"png": r["png"], "azione": r["azione"]})[r["modello"]] = r
    righe = ["| # | PNG | Azione del giocatore | haiku (s) | sonnet (s) |", "|---:|---|---|---|---|"]
    for i, (turno, v) in enumerate(per_turno.items(), 1):
        h, s = v.get("haiku", {}), v.get("sonnet", {})
        righe.append(f"| {i} | {v['png']} | «{v['azione']}» | {h.get('testo', '')} ({num(h.get('secondi'), 1)}) | {s.get('testo', '')} ({num(s.get('secondi'), 1)}) |")
    return "\n".join(righe) + "\n"


def sezione_esempi_selettore(n: int = 5) -> str:
    """Cinque turni del selettore: riferimento Haiku contro il modello locale in modo B (set completo)."""
    set_completo = {r["id"]: r for r in carica_set("set.jsonl")}
    f = RISULTATI / "qwen3-4b-instruct-2507-4bit-breve.jsonl"
    if not f.exists():
        return "_Nessun turno del selettore misurato._\n"
    locale = [json.loads(x) for x in f.read_text(encoding="utf-8").splitlines() if x.strip()]
    passo = max(1, len(locale) // n)
    blocchi = []
    for i in range(n):
        l = locale[i * passo]
        r = set_completo[l["id"]]
        azioni = "\n".join(f"- {a['nome']} ({a['id_pg']}): «{a['testo']}»" for a in r["azioni"])
        blocchi.append(
            f"### Turno {r['id']} ({r['cartella']}, {r['scena']})\n\n**Azioni**\n\n{azioni}\n\n"
            f"**Haiku (riferimento)**\n\n```text\n" + "\n".join(r["riferimento_haiku"]) + "\n```\n\n"
            f"**Qwen3-4B, prompt breve**\n\n```text\n{l['testo'].strip()}\n```\n"
        )
    return "\n".join(blocchi)


def main() -> None:
    righe_b = modo_b_righe()
    file_minimi = minimi_file()
    testo = [
        "# Lettore locale: risultati",
        "",
        "Dati in `risultati/`, generati da `report.py`. Nessun numero è scritto a mano.",
        "",
        "## 1. Modo B completo: il selettore vero (30 turni)",
        "",
        "Set: 30 turni del selettore dai 5 run B di nozze-neve. Il prompt completo è sistema = prompts/selettore.md + "
        "contesto compilato della scena (circa 15 000 token), come in avvio.ts. Il prompt breve è un sistema condensato "
        "(circa 1 800 token) più il catalogo preselezionato dal Motore e le ultime tre scene, come da proposta del team lead. "
        "Prefisso in cache, una volta per scena. Decodifica greedy, max 700 token.",
        "",
        "Limiti dichiarati: il catalogo del turno è quello statico della scena (il massimo), perché la preselezione "
        "reale dipende dallo stato del Motore; per il prompt breve la preselezione parte dallo stato iniziale della partita, "
        "quindi il catalogo medio è di 1,5 battute. Haiku sceglie spesso battute fuori dalla preselezione: per questo "
        "l'accordo esatto del prompt breve è basso per costruzione. Le latenze di Haiku vengono dai turni.jsonl dei run "
        "(API, con rete). Il prompt completo non è misurato con i tempi: la memoria della macchina (swap) falsa TTFT e "
        "token/s, e la prova è stata fermata.",
        "",
        tabella_modo_b(righe_b),
        "",
        "## 2. Modalità minimali (set breve, stessi 30 turni)",
        "",
        "**A) Classificatore**: per ogni azione il modello sceglie l'id di una battuta fra quelle preselezionate per quell'azione, "
        "oppure «nessuna». Nessun testo. Risposta stretta; se non valida, un tentativo di recupero. "
        "Haiku: quando nel riferimento ha scelto una battuta per un PG, si confronta l'id.",
        "",
        tabella_classificatore(file_minimi),
        "",
        "Tempi del classificatore: le misure di Qwen3-8B sono state fatte mentre mflux generava immagini sulla GPU, "
        "quindi i secondi sono falsati (la qualità no). Va rimisurato a GPU libera prima di usare il tempo.",
        "",
        "**B) Annuncio** (stesso modello): frase in terza persona col nome, al massimo 12 parole, senza parole che non stanno nel testo. "
        "**C) Deterministico**: «Nome: «testo»», nessun modello, come confronto.",
        "",
        tabella_annuncio(file_minimi),
        "",
        "Controlli annuncio: nome presente; parole ≤ 12; parole nuove = parole di contenuto (almeno 4 lettere, fuori dalle "
        "funzionali) senza una radice di 4 lettere in comune con il testo originale; lingua con il controllo di difetti_lingua.",
        "",
        "## 3. Scrittore in background con Claude Code (on request)",
        "",
        "Cinque prompt identici, stessa scheda del PNG e stessa scena, per haiku e sonnet con `claude -p --model <m>`, "
        "eseguito dalla cartella di scratch (fuori dal repo). Si misura il tempo totale della chiamata.",
        "",
        tabella_claude(),
        "",
        "## 4. Raccomandazione",
        "",
        "Vedi la sezione «Raccomandazione» in fondo a questo file.",
        "",
    ]
    (HERE / "risultati.md").write_text("\n".join(testo), encoding="utf-8")

    esempi = [
        "# Esempi a confronto",
        "",
        "Tutto generato da report.py dai file in risultati/. Le colonne sono affiancate per il controllo a mano.",
        "",
        "## 1. Selettore completo: Haiku contro Qwen3-4B, prompt breve (5 turni)",
        "",
        sezione_esempi_selettore(5),
        "## 2. Annuncio: modello locale contro deterministico (10 azioni, Qwen3-4B)",
        "",
        sezione_esempi_annuncio(file_minimi),
        "## 3. Classificatore: scelta del modello contro Haiku (Qwen3-4B)",
        "",
        sezione_esempi_classificatore(file_minimi),
        "## 4. Scrittore Claude Code: haiku contro sonnet, stessi prompt",
        "",
        sezione_esempi_claude(),
    ]
    (HERE / "esempi.md").write_text("\n".join(esempi), encoding="utf-8")
    print("scritti risultati.md ed esempi.md")


if __name__ == "__main__":
    main()
