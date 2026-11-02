# F0 — contratti tra i pezzi

Fase 0: una scena completa. Il giocatore scrive l'azione sul telefono, Haiku narra in streaming,
la voce locale (Qwen3-TTS) parla, lo schermo/proiettore suona l'audio e mostra chi parla.
Obiettivo: misurare la latenza vera e sentire la qualità. Questo file fissa le interfacce, così
i pezzi si possono costruire in parallelo. Chi cambia un contratto aggiorna questo file.

## Struttura del repository

```
apps/server        @cantastorie/server   Node + TypeScript (Fastify + Socket.IO v4)
apps/web           @cantastorie/web      React + Vite: pagine /telefono e /schermo
packages/shared    @cantastorie/shared   tipi degli eventi Socket.IO e dei messaggi
services/voce      servizio Python MLX (Qwen3-TTS), venv proprio in services/voce/.venv
assets/voci        clip di riferimento delle voci + voci.yaml (registro)
campagne/prova-f0  contenuto della scena di prova (YAML, schema del manuale)
prompts            testi dei prompt dei modelli (markdown, caricati dal server)
scripts            avvio/arresto di tutto
logs               log JSONL (fuori da git)
```

## Porte (tutte locali)

| Servizio | Porta | Bind |
|---|---|---|
| server (API + Socket.IO + pagine web compilate) | 4610 | 0.0.0.0 (i telefoni arrivano dalla LAN) |
| servizio voce | 4611 | 127.0.0.1 (solo il server lo chiama) |
| Vite dev (solo sviluppo, proxy verso 4610) | 4612 | 0.0.0.0 |

## Servizio voce (HTTP, 127.0.0.1:4611)

- `GET /salute` → `{"pronto": bool, "modello": str, "sample_rate": int, "formato": "pcm_s16le", "voci": [str]}`.
  `pronto` è vero solo dopo il caricamento del modello e il riscaldamento.
- `POST /tts`, corpo JSON `{"id": str, "voce": str, "testo": str}`.
  - Risposta `200`, `Content-Type: application/octet-stream`, intestazioni `X-Sample-Rate` e
    `X-Formato: pcm_s16le`. Corpo: PCM mono 16 bit little-endian **in streaming** (chunked), un pezzo
    appena il modello lo produce.
  - `404` con JSON `{"errore": ...}` se la voce non esiste; `400` se il testo è vuoto.
  - Le richieste si mettono in coda e si generano **una alla volta** (MLX su un solo thread), in ordine di arrivo.
  - Se il client chiude la connessione, la generazione si ferma subito (serve per interrompere la narrazione).
- `POST /annulla`, corpo `{"id": str}` → ferma la generazione o la toglie dalla coda. Risponde `{"annullata": bool}`.
- `POST /sveglia` (aggiunto dopo le misure): non blocca; se il worker è libero fa ~0,8 s di generazione a vuoto,
  interrotta al primo pezzo appena arriva una richiesta vera. Dopo una pausa di 20 s il primo audio sale da ~0,37 s
  a 0,5–0,9 s; con la sveglia torna a ~0,39 s. **Il server la chiama nel momento in cui chiude la finestra delle
  azioni**: la prima frase dell'LLM arriva dopo ~0,9 s, la sveglia ci sta dentro.
- Log JSONL `logs/voce.jsonl`: id, voce, caratteri, attesa in coda, primo audio, totale, secondi di audio, RTF, annullata.

Voci di F0 (registro `assets/voci/voci.yaml`, id → clip + testo della clip):
`narratore` (voce fissa del narratore), `vincent`, `nadine`, `lucian`, `tabitha` (voci per i PNG).

## Protocollo di uscita del narratore (Haiku, testo in streaming)

Il narratore scrive **solo righe etichettate**, una per segmento. Il server le legge mentre arrivano,
le divide in frasi e manda ogni frase alla voce giusta.

```
[narratore] Testo narrato, al presente, rivolto al gruppo.
[<id_png>] Battuta detta dal PNG, senza virgolette e senza «disse».
[invito] <id_pg>,<id_pg>
```

- `[narratore]`: voce del narratore.
- `[<id_png>]`: l'id è quello del file `campagne/<campagna>/png/<id_png>.yaml`; il server usa il suo `voce.tts.voce_id`.
  Un'etichetta sconosciuta viene letta con la voce del narratore e finisce nel log come errore.
- `[invito]`: **ultima riga, obbligatoria**. Elenco degli id dei personaggi giocanti invitati ad agire
  (oppure `tutti`). Non viene letta ad alta voce: apre la finestra delle azioni per quei giocatori.
  Se manca, il server invita tutti e registra l'errore.
- `[orologio] <id_orologio>`: facoltativa, subito prima di `[invito]`, solo nella risposta in cui il narratore ha
  mostrato il **prossimo segno** di quell'orologio. Non viene letta. È la versione leggera di `tick_clock`: il Motore
  controlla che l'orologio esista, sia attivo e non sia completo, poi avanza l'indice; altrimenti rifiuta e registra.
  Il Motore tiene lo stato degli orologi e mette nel contesto di ogni turno «orologio X: segni mostrati N di M,
  prossimo segno: …», così il narratore non deve ricostruirlo dalla trascrizione.
- Righe senza etichetta: si accodano al segmento precedente (tolleranza), con errore nel log.
- Nomi da pronunciare: prima della sintesi il server sostituisce i nomi dei PNG con la grafia del loro campo
  `pronuncia` (es. «Bàldrin»), solo nel testo mandato alla voce, non in quello mostrato.

## File della campagna (F0)

`campagne/<id>/`: `stile.yaml`, `campagna.yaml` (fronti e orologi con segni visibili in ordine, grafo degli indizi,
agenda del cattivo, segreti, registro del canone `canone: [{id, testo, noto_ai_pg}]`), `scena.yaml`,
`png/png_<nome>.yaml`, `pg.yaml` (`situazione_comune` + `personaggi: [...]`).
- I campi dei PNG `sa`, `non_sa`, `mente_su.verita` contengono id di fatti del canone; il compilatore li risolve nel testo.
- Ordine del contesto per il narratore in F0: stile, campagna, scena, png (in ordine), pg. In F1 diventa «solo ciò che serve» (E2).
- Id: PNG `png_<nome>` (anche l'etichetta del protocollo), PG `pg_<nome>`. Il server accetta l'etichetta anche senza
  `png_` e senza badare a maiuscole, con un avviso nel log.
- `conoscenze_private` di ogni PG vanno **solo** al telefono di quel giocatore, mai al tavolo o allo schermo.

## Turno (F0)

1. All'avvio della scena il server fa leggere `campagna.yaml → sessione.riassunto_iniziale` (se c'è) e poi
   `scena.yaml → apertura`, con la voce `narratore`, e apre la finestra per tutti.
2. Finestra aperta: ogni giocatore invitato scrive un'azione, la può modificare o ritirare, e può premere «pronto».
3. La finestra si chiude quando tutti gli invitati sono pronti, oppure 10 s dopo la prima azione inviata.
4. Il server compila il contesto (stile + scena + PNG + PG + trascrizione pubblica + azioni), chiama Haiku in streaming,
   legge le righe, manda le frasi alla voce, inoltra l'audio allo schermo.
5. Quando arriva `[invito]`, a narrazione finita, si apre la finestra successiva.

## Misure di latenza (per ogni turno, in `logs/turni.jsonl`)

Tutti i tempi in ms dal momento in cui la finestra si chiude (`t0`), più la durata della finestra stessa:
`finestra_ms`, `llm_primo_token`, `llm_prima_frase`, `voce_richiesta`, `voce_primo_audio`, `schermo_inizio_audio`
(lo schermo avvisa il server quando il primo pezzo comincia davvero a suonare), `llm_fine`, `audio_fine`,
token in ingresso/uscita/cache e costo in dollari.
