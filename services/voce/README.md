# Servizio voce (F0)

Local speech synthesis for Tabletop AI Game Master: **Qwen3-TTS 0.6B Base, 8 bit, MLX** (mlx-audio 0.6.3),
voci clonate da clip di ~8 s, servite in streaming PCM al server Node su `127.0.0.1:4611`.
Contratto: `docs/f0-contratti.md`, sezione «Servizio voce».

## Avvio

```bash
# una volta sola
uv venv --python 3.12 services/voce/.venv
uv pip install --python services/voce/.venv/bin/python -r services/voce/requirements.lock

scripts/voce-avvio.sh     # chiude l'istanza precedente, avvia, aspetta "pronto" (~20 s)
scripts/voce-arresto.sh
```

Il modello deve essere già nella cache HF (`~/.cache/huggingface/hub`): il servizio parte con
`HF_HUB_OFFLINE=1` e non scarica nulla. Log leggibile in `logs/voce.out`, strutturato in `logs/voce.jsonl`.

## API

| Metodo | Percorso | Corpo | Risposta |
|---|---|---|---|
| GET | `/salute` | – | `{pronto, modello, sample_rate, formato, voci}` + `errore_avvio, in_coda, in_corso` |
| POST | `/tts` | `{id, voce, testo}` | `200` PCM s16le mono **chunked**, header `X-Sample-Rate`, `X-Formato: pcm_s16le` |
| POST | `/annulla` | `{id}` | `{annullata: bool}` |
| POST | `/sveglia` | `{durata_s?}` (default 0,8) | `{accodata: bool}`. **Aggiunta al contratto**, vedi sotto |

- Errori di `/tts`: `404 {errore}` se la voce non esiste; `400` se il testo è vuoto (anche dopo la
  normalizzazione: solo emoji o markup) o è più lungo di 2000 caratteri; `503` finché il riscaldamento non è finito.
- Gli header partono subito, l'audio arriva a pezzi di ~0,24 s (3 token). I pezzi HTTP che legge il client
  non sono per forza allineati ai campioni da 2 byte: chi legge deve conservare l'eventuale byte avanzato.
- Un errore del modello a stream iniziato tronca la risposta chunked (il client vede la chiusura anomala).
- Chiudere la connessione ferma la generazione (Starlette ascolta `http.disconnect`, anche mentre la richiesta è in coda).
- `/sveglia`: dopo una pausa (la finestra delle azioni) la prima frase è più lenta. Se il server chiama
  `/sveglia` quando chiude la finestra, il worker genera e butta ~0,8 s di audio mentre l'LLM scrive la
  prima frase. Si accoda solo se il worker è libero e si interrompe appena arriva un `/tts`.

Tutte le richieste passano da **un solo thread worker** (MLX non è thread-safe e lega gli array al thread
che li crea): caricamento, riscaldamento e generazioni, in ordine FIFO.

## Struttura

```
voce/config.py     impostazioni (variabili VOCE_*), percorsi
voce/registro.py   assets/voci/voci.yaml -> Voce (puro)
voce/testo.py      normalizzazione del testo italiano (puro)
voce/pcm.py        float32 -> PCM s16le, WAV (puro)
voce/motore.py     Qwen3-TTS: caricamento, voci precalcolate, generazione in streaming, risveglio
voce/coda.py       coda FIFO + thread worker, annullamento, riga JSONL per richiesta
voce/app.py        API Starlette
voce/priorita.py   classe QoS del thread worker (macOS)
voce/risorse.py    rilascio, alla chiusura, del semaforo che tqdm (usata da mlx-audio) crea
voce/diario.py     log JSONL + stdout
prova.py           prova end-to-end contro il servizio in esecuzione (salva i WAV in logs/voce-prova/)
tests/             pytest: normalizzazione, PCM, registro, coda+API con motore finto, rilascio del lock di tqdm
banco/             misure: latenza, A/B intercalati, inattività, normalizzazione (Whisper), profilo del passo
```

Variabili d'ambiente utili: `VOCE_INTERVALLO` (0.24), `VOCE_CACHE_MLX_MB` (1024), `VOCE_QOS` (interattiva),
`VOCE_PORTA` (4611), `VOCE_REGISTRO`, `VOCE_LOG`.

## Riga di log (`logs/voce.jsonl`, evento `tts`)

`id, voce, caratteri, caratteri_letti, attesa_coda_ms, primo_audio_ms` (dall'arrivo),
`primo_audio_gen_ms` (dall'inizio della generazione), `totale_ms, generazione_ms, secondi_audio,
rtf` (generazione / secondi di audio), `annullata, motivo` (annulla | disconnessione | arresto),
`pezzi, token, troncata` (raggiunto il tetto di token), `picco_mlx_gb, errore`.
Altri eventi: `avvio`, `pronto` (tempi di caricamento e riscaldamento), `sveglia`, `errore_avvio`.

## Misure (2 novembre 2026, M1 16 GB, a batteria, macchina condivisa: carico medio 3-12)

| Cosa | Valore |
|---|---|
| Avvio fino a `pronto` | 20-22 s (pesi 2,7-3,4 s, 5 voci preparate in 0,08-0,15 s l'una, riscaldamento 3-4 s a voce) |
| Primo audio via HTTP, a macchina calda | 0,36-0,39 s (ieri 0,67 s, con intervallo 0,5) |
| Primo audio dopo 20 s di pausa | 0,47-0,90 s; con `/sveglia` (o risveglio in processo) 0,36-0,43 s |
| RTF per voce, prova e2e (2 giri) | narratore 0,89/0,92 · vincent 0,90/0,90 · tabitha 0,92/0,88 · nadine 0,89 · lucian 0,93 |
| Stop dopo la disconnessione del client | 0,21 s; la richiesta successiva aspetta 0,21 s in coda |
| Memoria | picco MLX 2,5-2,8 GB in streaming (ieri 7,1 GB senza streaming); processo 2,2 GB a riposo, picco 3,5 GB |

**Voce precalcolata.** La libreria, a ogni frase, rileggeva e ricampionava la clip (55 ms) e
ricalcolava l'embedding del parlante (18 ms). I codici della clip li teneva già in cache. Ora audio a
24 kHz ed embedding si calcolano una volta all'avvio. A/B intercalato, 6 giri: primo audio mediano
da 0,79 a 0,64 s. Riusare anche la KV-cache del prefisso non si può: nel prompt ICL il testo nuovo
sta prima dei codici della clip.

**Intervallo di streaming.** Differenze appaiate rispetto a 0,5 (6 giri):

| Intervallo | Primo audio | RTF |
|---|---|---|
| 0,16 | −275 ms | +0,047 |
| 0,24 | −205 ms | −0,003 |
| 0,32 | −141 ms | −0,019 |
| 0,40 | −80 ms | −0,006 |

Scelto **0,24**: quasi tutto il guadagno sul primo audio, senza costo sul RTF.

**Senza effetto misurabile, tenuti perché innocui:**
- QoS user-interactive del worker: non si distingue dal rumore con carico 5-8;
- tetto di 1 GB alla cache MLX: nessuna penalità, RTF 0,867 contro 0,886.

**Normalizzazione.** Banco Whisper, 8 testi «sporchi», 3 campioni ciascuno:
- WER medio da 0,089 (grezzo) a 0,046 (normalizzato);
- indicazioni tra quadre: il grezzo le legge ad alta voce;
- punto finale mancante: nome storpiato in 2 casi su 3;
- `…` e `!!!`: allungano l'audio;
- virgolette e trattini: effetto neutro.

**Dove va il tempo di un passo** (~80 ms per 80 ms di audio): talker ~20%, code predictor (15 passi
sequenziali) ~47%, campionamento ~9%, decoder ~22% (`banco/profilo_passo.py`).

## Problemi aperti

- **Il margine sul tempo reale è sottile.**
  - Con la macchina calda il RTF di una frase è 0,88-0,93.
  - Con la macchina carica (Docker, browser, altri processi) è salito a 1,0-1,2: l'audio rallenta e
    lo schermo resta senza. Al primo banco di stamattina (carico 11) si è arrivati a 1,5.
  - Il server deve accodare la frase successiva appena l'ha pronta, senza aspettare la fine della
    riproduzione. Lo schermo deve tenere un piccolo buffer (0,3-0,5 s) prima di partire.
  - La strada per guadagnare davvero è compilare il ciclo del code predictor (è metà del tempo), ma
    tocca l'interno di mlx-audio. Non è stato fatto.
- **`/sveglia` va aggiunto al contratto** e chiamato dal server alla chiusura della finestra.
- **Voci simili.** Nadine e Tabitha clonate restano vicine di tono (0,66 semitoni, misura di ieri).
  Nessuno ha ancora ascoltato con attenzione i WAV in `logs/voce-prova/`.
- **Numeri.** Le cifre (`3 frecce`) non vengono convertite in parole: nessun errore misurato finora, ma
  neanche provato.
