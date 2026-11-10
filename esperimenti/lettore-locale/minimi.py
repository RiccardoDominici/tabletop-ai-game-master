"""Modalità minimali del lettore locale: il modello piccolo non ragiona né scrive prosa.

A) CLASSIFICATORE: per ogni azione sceglie l'id della battuta pre-scritta fra quelle preselezionate per quell'azione,
   oppure «nessuna». Nessun testo. Controllo stretto della risposta; se non è valida, un solo tentativo di recupero.
B) ANNUNCIO: riscrive l'azione del giocatore in terza persona, col nome del PG, in al massimo 12 parole, senza fatti,
   emozioni o esiti che non stanno nel testo originale. Controlli automatici sul risultato.
C) DETERMINISTICO (senza modello): «Nome: «testo»». Solo come confronto.

Usa il set breve (dati/set_breve.jsonl), lo stesso modello per A e B. Scrive risultati/minimi-<modello>.json.

Uso (dalla radice del repo):
  services/lettore/.venv/bin/python esperimenti/lettore-locale/minimi.py --modello mlx-community/Qwen3-4B-Instruct-2507-4bit
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATI = HERE / "dati"
RISULTATI = HERE / "risultati"
sys.path.insert(0, str(HERE))
import valida  # noqa: E402

PAROLE_FUNZIONE = set(
    "della delle dello dagli dalla dall dell degli nell nella nelle negli sul sulla sulle sugli con senza per tra fra "
    "che come anche ancora poi quando dove perché mentre sono sei siamo hanno aveva ogni molto poco tutto tutta questo "
    "questa quello quella suoi sue loro lui lei noi voi gli dei del dal nel nei".split()
)

PROMPT_CLASSIFICATORE = (
    "Sei un selettore. Ricevi l'azione di un giocatore e un elenco di battute candidate, ciascuna con un id. "
    "Rispondi SOLO con l'id della battuta che risponde a quell'azione, copiato esattamente dall'elenco, "
    "oppure con la parola nessuna se nessuna risponde davvero. Nessun'altra parola."
)
PROMPT_ANNUNCIO = (
    "Riscrivi l'azione di un giocatore come una sola frase in terza persona, italiano, al presente, col nome del "
    "personaggio, in al massimo 12 parole. Usa solo ciò che sta nel testo: niente fatti nuovi, niente emozioni, "
    "niente esiti o risultati. Rispondi solo con la frase."
)
ESEMPI_ANNUNCIO = [
    ("Brann", "salgo sulla scala e guardo dentro", "Brann sale sulla scala e guarda dentro."),
    ("Mirta", "chiedo a Ilaria se di notte porta qualcuno a monte", "Mirta chiede a Ilaria se di notte porta qualcuno a monte."),
]


def carica_modello(modello: str):
    from mlx_lm import load

    return load(modello)


def genera(model, tok, messaggi: list[dict], max_tokens: int) -> str:
    from mlx_lm import stream_generate
    from mlx_lm.sample_utils import make_sampler

    testo = tok.apply_chat_template(messaggi, tokenize=False, add_generation_prompt=True, enable_thinking=False)
    ids = tok.encode(testo, add_special_tokens=False)
    pezzi = [r.text for r in stream_generate(model, tok, prompt=ids, max_tokens=max_tokens, sampler=make_sampler(temp=0.0))]
    return "".join(pezzi).strip()


def azioni_pubbliche(rec: dict) -> list[dict]:
    return [a for a in rec["azioni"] if a.get("testo")]


def haiku_per_pg(rec: dict) -> dict[str, str]:
    """Id che Haiku ha scelto per ciascun PG (dal riferimento del turno)."""
    out: dict[str, str] = {}
    for riga in rec["riferimento_haiku"]:
        m = re.match(r"^\[usa\] (\S+) > (\S+)$", riga)
        if m:
            out.setdefault(m.group(2), m.group(1))
    return out


def righe_candidate(rec: dict, pg: str) -> list[str]:
    return rec.get("pre_righe_per_azione", {}).get(pg, [])


def id_di_riga(riga: str) -> str:
    return riga.split(" · ")[0].strip()


# ---------- A) classificatore ----------

def esito_classificatore(risposta: str, ids: set[str]) -> str | None:
    """Risposta valida: un id dell'elenco oppure «nessuna». Altrimenti None."""
    pulita = re.sub(r"[^\w]", " ", risposta.lower()).split()
    if len(pulita) == 1 and pulita[0] == "nessuna":
        return "nessuna"
    if len(pulita) == 1 and pulita[0] in {i.lower() for i in ids}:
        return pulita[0]
    return None


def classifica(model, tok, rec: dict, azione: dict) -> dict:
    pg = azione["id_pg"]
    candidate = righe_candidate(rec, pg)
    ids = {id_di_riga(r) for r in candidate}
    elenco = "\n".join(f"- {r}" for r in candidate) or "(nessuna battuta candidata)"
    utente = f"Azione di {azione['nome']}: «{azione['testo']}»\nBattute candidate:\n{elenco}\nRisposta:"
    messaggi = [{"role": "system", "content": PROMPT_CLASSIFICATORE}, {"role": "user", "content": utente}]
    t0 = time.perf_counter()
    grezza = genera(model, tok, messaggi, 12)
    secondi = time.perf_counter() - t0
    scelta = esito_classificatore(grezza, ids)
    tentativi = 1
    if scelta is None:
        tentativi = 2
        messaggi += [{"role": "assistant", "content": grezza},
                     {"role": "user", "content": "Non valida. Rispondi solo con un id dell'elenco oppure con la parola nessuna."}]
        grezza2 = genera(model, tok, messaggi, 12)
        scelta = esito_classificatore(grezza2, ids)
        grezza = f"{grezza} | {grezza2}"
    return {
        "pg": pg,
        "grezza": grezza,
        "scelta": scelta if scelta is not None else "INVALIDA",
        "tentativi": tentativi,
        "candidate": sorted(ids),
        "secondi": round(secondi, 2),
    }


# ---------- B) annuncio ----------

def costruisci_annuncio(model, tok, azione: dict) -> str:
    messaggi = [{"role": "system", "content": PROMPT_ANNUNCIO}]
    for nome, testo, out in ESEMPI_ANNUNCIO:
        messaggi += [{"role": "user", "content": f"Nome: {nome}. Azione: «{testo}»"}, {"role": "assistant", "content": out}]
    messaggi.append({"role": "user", "content": f"Nome: {azione['nome']}. Azione: «{azione['testo']}»"})
    return genera(model, tok, messaggi, 60).split("\n")[0].strip()


def parole_contenuto(testo: str, nome: str) -> list[str]:
    nome_l = nome.lower()
    return [p for p in re.findall(r"[a-zà-ÿ]+", testo.lower()) if len(p) >= 4 and p not in PAROLE_FUNZIONE and p != nome_l]


def controlla_annuncio(frase: str, azione: dict) -> dict:
    """Controlli automatici: nome presente, lunghezza, parole nuove rispetto al testo, lingua."""
    nome = azione["nome"]
    parole_frase = re.findall(r"\S+", frase)
    originale = azione["testo"]
    radici_orig = {p[:4] for p in re.findall(r"[a-zà-ÿ]+", originale.lower()) if len(p) >= 3}
    contenuto = parole_contenuto(frase, nome)
    nuove = [p for p in contenuto if p[:4] not in radici_orig]
    return {
        "frase": frase,
        "nome_presente": bool(re.search(rf"\b{re.escape(nome)}\b", frase, re.IGNORECASE)),
        "parole": len(parole_frase),
        "lunghezza_ok": len(parole_frase) <= 12 and bool(frase),
        "parole_nuove": nuove,
        "lingua": valida.difetti_lingua(frase),
    }


# ---------- orchestrazione ----------

def misura(modello: str, set_turni: list[dict], solo: str = "") -> dict:
    model, tok = carica_modello(modello)
    classi, annunci, deterministici = [], [], []
    for rec in set_turni:
        h = haiku_per_pg(rec)
        for az in azioni_pubbliche(rec):
            pg = az["id_pg"]
            c = classifica(model, tok, rec, {**az, "id_pg": pg})
            c.update({"turno": rec["id"], "nome": az["nome"], "testo": az["testo"], "haiku": h.get(pg)})
            classi.append(c)
            if solo == "classificatore":
                continue
            frase = costruisci_annuncio(model, tok, az)
            a = controlla_annuncio(frase, az)
            a.update({"turno": rec["id"], "nome": az["nome"], "testo": az["testo"]})
            annunci.append(a)
            det = f"{az['nome']}: «{az['testo']}»"
            deterministici.append(controlla_annuncio(det, az) | {"turno": rec["id"], "nome": az["nome"], "testo": az["testo"]})
        print(f"  {rec['id']} fatto", flush=True)
    riepilogo = {"modello": modello, "classificatore": riepiloga_classificatore(classi)}
    if not solo:
        riepilogo["annuncio"] = riepiloga_annuncio(annunci)
        riepilogo["deterministico"] = riepiloga_annuncio(deterministici)
    out = {"riepilogo": riepilogo, "classificatore": classi, "annuncio": annunci, "deterministico": deterministici}
    RISULTATI.mkdir(exist_ok=True)
    nome = modello.split('/')[-1].lower() + ("-solo-classificatore" if solo else "")
    (RISULTATI / f"minimi-{nome}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    return riepilogo


def riepiloga_classificatore(classi: list[dict]) -> dict:
    con_haiku = [c for c in classi if c["haiku"]]
    raggiungibili = [c for c in con_haiku if c["haiku"] in c["candidate"]]
    corrette = [c for c in raggiungibili if c["scelta"] == c["haiku"]]
    nessuna_con_haiku = [c for c in con_haiku if c["scelta"] == "nessuna"]
    fuori_catalogo = [c for c in classi if c["scelta"] not in ("nessuna", "INVALIDA") and c["scelta"] not in c["candidate"]]
    return {
        "azioni": len(classi),
        "azioni_con_scelta_haiku": len(con_haiku),
        "tetto_raggiungibile": len(raggiungibili) / len(con_haiku) if con_haiku else None,
        "accordo_con_haiku": len(corrette) / len(con_haiku) if con_haiku else None,
        "accordo_sul_raggiungibile": len(corrette) / len(raggiungibili) if raggiungibili else None,
        "nessuna_quando_haiku_sceglie": len(nessuna_con_haiku) / len(con_haiku) if con_haiku else None,
        "id_fuori_catalogo": len(fuori_catalogo),
        "invalide_dopo_recupero": sum(1 for c in classi if c["scelta"] == "INVALIDA"),
        "risposte_al_primo_tentativo": sum(1 for c in classi if c["tentativi"] == 1) / len(classi),
        "secondi_mediani": statistics.median(c["secondi"] for c in classi),
    }


def riepiloga_annuncio(annunci: list[dict]) -> dict:
    n = len(annunci)
    return {
        "azioni": n,
        "nome_presente": sum(a["nome_presente"] for a in annunci) / n,
        "entro_12_parole": sum(a["lunghezza_ok"] for a in annunci) / n,
        "con_parole_nuove": sum(1 for a in annunci if a["parole_nuove"]) / n,
        "parole_nuove_totali": sum(len(a["parole_nuove"]) for a in annunci),
        "lingua_ok": sum(1 for a in annunci if not a["lingua"]) / n,
    }


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--modello", required=True)
    p.add_argument("--limite", type=int, default=0)
    p.add_argument("--solo", default="", choices=["", "classificatore"], help="esegue solo una modalità")
    args = p.parse_args()
    set_turni = [json.loads(r) for r in (DATI / "set_breve.jsonl").read_text(encoding="utf-8").splitlines() if r.strip()]
    if args.limite:
        set_turni = set_turni[: args.limite]
    riep = misura(args.modello, set_turni, args.solo)
    print(json.dumps(riep, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
