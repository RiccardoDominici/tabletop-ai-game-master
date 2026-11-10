"""Scrittore in background con Claude Code: una battuta di PNG per un'azione data, con haiku e con sonnet.

Misura il TEMPO TOTALE di ogni chiamata `claude -p --model <m>` e salva le risposte per il controllo di qualità
a mano (esempi.md). Stessi 5 prompt per i due modelli. Le chiamate partono dalla cartella di lavoro di scratch,
così il CLAUDE.md del repo non entra nel contesto: si misura lo scrittore, non il repo.

Uso (dalla radice del repo):  python3 esperimenti/lettore-locale/claude_scrittore.py
Uscita: esperimenti/lettore-locale/risultati/claude-scrittore.json
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATI = HERE / "dati"
RISULTATI = HERE / "risultati"
CARTELLA_LAVORO = Path("/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/scrittore")
MODELLI = ["haiku", "sonnet"]
N_PROMPT = 5
TIMEOUT_S = 180


def costruisci_prompt(rec: dict) -> str:
    png = rec["png_scheda"][0]
    az = rec["azioni"][0]
    voce = json.dumps(png.get("voce", {}), ensure_ascii=False)
    carattere = json.dumps(png.get("personalita", {}), ensure_ascii=False)
    return (
        f"Sei il personaggio non giocante {png['nome']} in una partita di D&D dal vivo, in italiano.\n"
        f"Aspetto: {png.get('aspetto', '')}\n"
        f"Voce: {voce}\n"
        f"Carattere: {carattere}\n"
        f"Scena: {rec.get('scena_descrizione', '')}\n"
        f"Un giocatore ({az['nome']}) fa questa azione verso di te: «{az['testo']}».\n\n"
        "Scrivi UNA sola battuta di dialogo di questo personaggio, in italiano, al massimo 20 parole, come la direbbe "
        "a voce al tavolo. Solo la battuta: niente virgolette, niente narrazione, niente spiegazioni."
    )


def chiama(claude: str, modello: str, prompt: str) -> dict:
    t0 = time.perf_counter()
    try:
        esito = subprocess.run(
            [claude, "-p", "--model", modello, "--output-format", "text", prompt],
            cwd=CARTELLA_LAVORO, capture_output=True, text=True, timeout=TIMEOUT_S,
        )
        testo = esito.stdout.strip()
        errore = esito.stderr.strip()[:300] if esito.returncode != 0 else ""
    except subprocess.TimeoutExpired:
        testo, errore = "", f"timeout dopo {TIMEOUT_S} s"
    return {"modello": modello, "secondi": round(time.perf_counter() - t0, 2), "testo": testo, "errore": errore}


def main() -> None:
    claude = shutil.which("claude")
    if not claude:
        sys.exit("claude non trovato nel PATH")
    CARTELLA_LAVORO.mkdir(parents=True, exist_ok=True)
    set_turni = [json.loads(r) for r in (DATI / "set_breve.jsonl").read_text(encoding="utf-8").splitlines() if r.strip()]
    scelti = [r for r in set_turni if r.get("png_scheda") and r.get("azioni")][:N_PROMPT]
    risultati = []
    for rec in scelti:
        prompt = costruisci_prompt(rec)
        for modello in MODELLI:
            r = chiama(claude, modello, prompt)
            r.update({"turno": rec["id"], "png": rec["png_scheda"][0]["nome"], "azione": rec["azioni"][0]["testo"]})
            risultati.append(r)
            print(f"{rec['id']} {modello}: {r['secondi']} s, errore={bool(r['errore'])}", flush=True)
    RISULTATI.mkdir(exist_ok=True)
    (RISULTATI / "claude-scrittore.json").write_text(json.dumps(risultati, ensure_ascii=False, indent=1), encoding="utf-8")
    for m in MODELLI:
        tempi = [r["secondi"] for r in risultati if r["modello"] == m and not r["errore"]]
        if tempi:
            print(f"{m}: mediana {sorted(tempi)[len(tempi) // 2]} s su {len(tempi)} chiamate")


if __name__ == "__main__":
    main()
