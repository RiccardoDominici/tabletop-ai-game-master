"""Prova end-to-end contro il servizio voce IN ESECUZIONE (scripts/voce-avvio.sh).

Uso: services/voce/.venv/bin/python services/voce/prova.py [--url http://127.0.0.1:4611]

Controlla, nell'ordine:
  1. /salute: pronto, formato, voci;
  2. narratore + due PNG: attesa in coda, primo audio, totale, secondi di audio, RTF
     (misure lato client, più quelle del server lette da logs/voce.jsonl);
  3. annullamento per disconnessione: testo lungo, chiusura della connessione dopo ~0,5 s;
     il worker deve fermarsi e la richiesta successiva deve partire subito;
  4. annullamento con POST /annulla;
  5. coda: 3 richieste insieme, completate tutte e in ordine di arrivo;
  6. errori: voce sconosciuta -> 404, testo vuoto -> 400.
L'audio prodotto va in logs/voce-prova/*.wav (da ascoltare); il riepilogo in
logs/voce-prova/risultati.json. Solo stdlib + i moduli puri del servizio.
"""
from __future__ import annotations

import argparse
import http.client
import json
import socket
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))

from voce.config import RADICE_REPO  # noqa: E402
from voce.pcm import secondi, wav_da_s16le  # noqa: E402

DIR_USCITA = RADICE_REPO / "logs" / "voce-prova"
LOG_JSONL = RADICE_REPO / "logs" / "voce.jsonl"

FRASE_NARRATORE = ("La pioggia batte sulle finestre della locanda, e il fuoco nel camino getta ombre lunghe "
                   "sui volti stanchi dei viaggiatori.")
BATTUTE = {
    "vincent": "Bah, non mi guardate così. Ho scavato per tre giorni nelle miniere, portatemi una birra.",
    "tabitha": "Ehi, non vi preoccupate, la borsa l'ho solo presa in prestito. Ve la restituisco, forse.",
}
# con --tutte-le-voci si provano anche gli altri due PNG del registro
BATTUTE_EXTRA = {
    "nadine": "Sedetevi pure, viandanti. Il brodo è caldo, ma non uscite dopo il tramonto.",
    "lucian": "Il destino non chiede permesso a nessuno. La chiave che cercate non è mai stata nella torre.",
}
TESTO_LUNGO = (
    "Nelle terre di Brunvalle il vento del nord porta l'odore della neve. Ostilia, la vecchia guardiana della "
    "torre, abbassò lo sguardo sulla mappa consumata e sospirò. Le legioni del Re Nero avanzavano lungo la "
    "strada di Vallestorta, e nessuno sapeva quanto restasse prima che le porte cedessero."
)
FRASE_BREVE = "Il ponte regge ancora."

risultati: dict = {"data": datetime.now().isoformat(timespec="seconds"), "controlli": {}}
falliti: list[str] = []


def controlla(nome: str, condizione: bool, dettaglio: str = "") -> None:
    esito = "OK " if condizione else "NO "
    print(f"  [{esito}] {nome}" + (f" — {dettaglio}" if dettaglio else ""), flush=True)
    risultati["controlli"][nome] = {"ok": bool(condizione), "dettaglio": dettaglio}
    if not condizione:
        falliti.append(nome)


class Client:
    def __init__(self, url: str):
        u = urlparse(url)
        self.host, self.porta = u.hostname, u.port or 80

    def conn(self) -> http.client.HTTPConnection:
        return http.client.HTTPConnection(self.host, self.porta, timeout=120)

    def json(self, metodo: str, percorso: str, corpo: dict | None = None) -> tuple[int, dict]:
        c = self.conn()
        c.request(metodo, percorso, body=json.dumps(corpo) if corpo is not None else None,
                  headers={"Content-Type": "application/json"})
        r = c.getresponse()
        dati = r.read()
        c.close()
        return r.status, json.loads(dati or b"{}")

    def tts(self, id_: str, voce: str, testo: str, interrompi_dopo_s: float | None = None,
            al_primo_audio=None) -> dict:
        """POST /tts letto in streaming. Restituisce misure lato client e il PCM."""
        c = self.conn()
        t0 = time.perf_counter()
        c.request("POST", "/tts", body=json.dumps({"id": id_, "voce": voce, "testo": testo}),
                  headers={"Content-Type": "application/json"})
        r = c.getresponse()
        esito = {"id": id_, "voce": voce, "stato": r.status, "header_s": time.perf_counter() - t0,
                 "sample_rate": int(r.getheader("X-Sample-Rate") or 0), "formato": r.getheader("X-Formato")}
        if r.status != 200:
            esito["errore"] = json.loads(r.read() or b"{}")
            c.close()
            return esito
        pcm = bytearray()
        primo = None
        interrotto = False
        while True:
            pezzo = r.read1(65536)
            if not pezzo:
                break
            if primo is None:
                primo = time.perf_counter() - t0
                if al_primo_audio:
                    al_primo_audio()
            pcm += pezzo
            if interrompi_dopo_s is not None and time.perf_counter() - t0 >= interrompi_dopo_s:
                interrotto = True
                break
        totale = time.perf_counter() - t0
        if interrotto:
            # chiusura brusca: shutdown forza il FIN anche se la risposta tiene un riferimento
            # al socket; il server vede http.disconnect
            esito["disconnesso_alle"] = time.time()
            c.sock.shutdown(socket.SHUT_RDWR)
            r.close()
        c.close()
        audio_s = secondi(len(pcm), esito["sample_rate"]) if esito["sample_rate"] else 0.0
        esito.update({"primo_audio_s": primo, "totale_s": totale, "audio_s": audio_s,
                      "rtf_client": totale / audio_s if audio_s else None, "byte_pari": len(pcm) % 2 == 0,
                      "pcm": bytes(pcm)})
        return esito


def righe_log(dall_offset: int) -> list[dict]:
    with LOG_JSONL.open("rb") as f:
        f.seek(dall_offset)
        return [json.loads(x) for x in f.read().decode("utf-8").splitlines() if x.strip()]


def riga_server(offset: int, id_: str, attesa_s: float = 5.0) -> dict | None:
    """La riga 'tts' scritta dal worker per questo id (arriva a generazione finita)."""
    fine = time.time() + attesa_s
    while time.time() < fine:
        for r in righe_log(offset):
            if r.get("evento") == "tts" and r.get("id") == id_:
                return r
        time.sleep(0.05)
    return None


def salva_wav(nome: str, esito: dict) -> str:
    DIR_USCITA.mkdir(parents=True, exist_ok=True)
    p = DIR_USCITA / f"{nome}.wav"
    p.write_bytes(wav_da_s16le(esito["pcm"], esito["sample_rate"]))
    return str(p)


def fmt(x, cifre=3):
    return "-" if x is None else f"{x:.{cifre}f}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:4611")
    ap.add_argument("--tutte-le-voci", action="store_true", help="prova anche nadine e lucian")
    args = ap.parse_args()
    cl = Client(args.url)
    prefisso = f"prova-{int(time.time())}"
    offset = LOG_JSONL.stat().st_size if LOG_JSONL.exists() else 0

    print("1. /salute", flush=True)
    stato, salute = cl.json("GET", "/salute")
    risultati["salute"] = salute
    controlla("salute 200 e pronto", stato == 200 and salute.get("pronto") is True, json.dumps(salute))
    controlla("formato pcm_s16le", salute.get("formato") == "pcm_s16le")
    if not salute.get("pronto"):
        print("servizio non pronto: avvialo con scripts/voce-avvio.sh")
        return 1

    print("2. narratore + PNG", flush=True)
    misure = []
    battute = {**BATTUTE, **(BATTUTE_EXTRA if args.tutte_le_voci else {})}
    for voce, testo in [("narratore", FRASE_NARRATORE), *battute.items()]:
        id_ = f"{prefisso}-{voce}"
        e = cl.tts(id_, voce, testo)
        srv = riga_server(offset, id_) or {}
        file_wav = salva_wav(voce, e) if e["stato"] == 200 else None
        m = {"voce": voce, "caratteri": len(testo), "stato": e["stato"],
             "attesa_coda_ms": srv.get("attesa_coda_ms"),
             "primo_audio_client_s": e.get("primo_audio_s"), "primo_audio_server_ms": srv.get("primo_audio_ms"),
             "totale_client_s": e.get("totale_s"), "secondi_audio": e.get("audio_s"),
             "rtf_server": srv.get("rtf"), "rtf_client": e.get("rtf_client"), "wav": file_wav,
             "troncata": srv.get("troncata")}
        misure.append(m)
        controlla(f"{voce}: 200, audio non vuoto, PCM intero",
                  e["stato"] == 200 and e.get("audio_s", 0) > 0.5 and e.get("byte_pari", False),
                  f"{fmt(e.get('audio_s'), 2)} s di audio, header X-Sample-Rate {e.get('sample_rate')}")
    risultati["voci"] = misure
    print(f"     {'voce':10s} {'coda ms':>8s} {'primo s':>8s} {'totale s':>9s} {'audio s':>8s} {'RTF':>6s}")
    for m in misure:
        print(f"     {m['voce']:10s} {fmt(m['attesa_coda_ms'], 1):>8s} {fmt(m['primo_audio_client_s']):>8s} "
              f"{fmt(m['totale_client_s']):>9s} {fmt(m['secondi_audio'], 2):>8s} {fmt(m['rtf_server']):>6s}")

    print("3. annullamento per disconnessione dopo ~0,5 s", flush=True)
    id_lungo = f"{prefisso}-disconnesso"
    e = cl.tts(id_lungo, "narratore", TESTO_LUNGO, interrompi_dopo_s=0.5)
    id_dopo = f"{prefisso}-dopo-disconnessione"
    e2 = cl.tts(id_dopo, "narratore", FRASE_BREVE)
    srv1 = riga_server(offset, id_lungo) or {}
    srv2 = riga_server(offset, id_dopo) or {}
    ts_fine = datetime.fromisoformat(srv1["ts"]).timestamp() if srv1.get("ts") else None
    ritardo_stop = (ts_fine - e["disconnesso_alle"]) if ts_fine and e.get("disconnesso_alle") else None
    risultati["disconnessione"] = {"audio_ricevuto_s": e.get("audio_s"), "server": srv1,
                                   "stop_dopo_disconnessione_s": ritardo_stop, "successiva": srv2,
                                   "successiva_primo_audio_client_s": e2.get("primo_audio_s")}
    salva_wav("disconnesso", e)
    controlla("il server segna annullata per disconnessione",
              srv1.get("annullata") is True and srv1.get("motivo") == "disconnessione",
              f"audio generato {srv1.get('secondi_audio')} s su un testo da ~20 s")
    controlla("il worker si ferma entro 1 s dalla disconnessione",
              ritardo_stop is not None and ritardo_stop < 1.0, f"{fmt(ritardo_stop)} s")
    controlla("la richiesta successiva parte subito (coda < 1 s)",
              srv2.get("attesa_coda_ms") is not None and srv2["attesa_coda_ms"] < 1000,
              f"attesa in coda {srv2.get('attesa_coda_ms')} ms, primo audio {fmt(e2.get('primo_audio_s'))} s")

    print("4. annullamento con POST /annulla", flush=True)
    id_ann = f"{prefisso}-annulla"
    risposta_annulla = {}

    def annulla_subito():
        t = threading.Thread(target=lambda: risposta_annulla.update(cl.json("POST", "/annulla", {"id": id_ann})[1]))
        t.start()

    e3 = cl.tts(id_ann, "narratore", TESTO_LUNGO, al_primo_audio=annulla_subito)
    srv3 = riga_server(offset, id_ann) or {}
    _, ignoto = cl.json("POST", "/annulla", {"id": "non-esiste"})
    risultati["annulla"] = {"risposta": risposta_annulla, "audio_ricevuto_s": e3.get("audio_s"), "server": srv3,
                            "id_ignoto": ignoto}
    controlla("/annulla risponde annullata=true e la risposta finisce presto",
              risposta_annulla.get("annullata") is True and srv3.get("annullata") is True
              and (e3.get("audio_s") or 99) < 5,
              f"audio ricevuto {fmt(e3.get('audio_s'), 2)} s, totale {fmt(e3.get('totale_s'))} s")
    controlla("/annulla su id sconosciuto -> annullata=false", ignoto.get("annullata") is False)

    print("5. coda: 3 richieste insieme", flush=True)
    esiti: dict[int, dict] = {}
    fine_ordine: list[int] = []
    lock = threading.Lock()
    voci_coda = ["narratore", "vincent", "tabitha"]
    testi_coda = ["Le torce si spengono una dopo l'altra.", "Chi ha toccato la mia ascia?", "Io non ho visto niente."]

    def lancia(i):
        e = cl.tts(f"{prefisso}-coda-{i}", voci_coda[i], testi_coda[i])
        with lock:
            esiti[i] = e
            fine_ordine.append(i)

    fili = []
    for i in range(3):
        t = threading.Thread(target=lancia, args=(i,))
        t.start()
        fili.append(t)
        time.sleep(0.03)  # arrivo in ordine noto
    for t in fili:
        t.join()
    srv_coda = [riga_server(offset, f"{prefisso}-coda-{i}") or {} for i in range(3)]
    for i in range(3):
        if esiti[i]["stato"] == 200:
            salva_wav(f"coda-{i}-{voci_coda[i]}", esiti[i])
    risultati["coda"] = {"ordine_fine_client": fine_ordine,
                         "attese_coda_ms": [s.get("attesa_coda_ms") for s in srv_coda],
                         "primo_audio_ms": [s.get("primo_audio_ms") for s in srv_coda]}
    controlla("tutte e 3 completate con audio",
              all(esiti[i]["stato"] == 200 and esiti[i].get("audio_s", 0) > 0.3 for i in range(3)))
    attese = [s.get("attesa_coda_ms") or 0 for s in srv_coda]
    controlla("finite in ordine di arrivo e attese in coda crescenti",
              fine_ordine == [0, 1, 2] and attese[0] <= attese[1] <= attese[2],
              f"ordine {fine_ordine}, attese in coda {attese} ms")

    print("6. errori", flush=True)
    e = cl.tts(f"{prefisso}-ignota", "drago", "Ciao.")
    controlla("voce sconosciuta -> 404 con errore", e["stato"] == 404 and "errore" in e.get("errore", {}),
              json.dumps(e.get("errore"), ensure_ascii=False))
    e = cl.tts(f"{prefisso}-vuoto", "narratore", "   ")
    controlla("testo vuoto -> 400", e["stato"] == 400)
    e = cl.tts(f"{prefisso}-simboli", "narratore", "🎲 **")
    controlla("solo simboli -> 400", e["stato"] == 400)

    DIR_USCITA.mkdir(parents=True, exist_ok=True)
    (DIR_USCITA / "risultati.json").write_text(json.dumps(risultati, ensure_ascii=False, indent=1, default=str))
    print(f"\naudio in {DIR_USCITA}/, riepilogo in {DIR_USCITA / 'risultati.json'}")
    print("TUTTO OK" if not falliti else f"FALLITI: {', '.join(falliti)}")
    return 0 if not falliti else 1


if __name__ == "__main__":
    sys.exit(main())
