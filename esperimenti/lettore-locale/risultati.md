# Lettore locale: risultati

Dati in `risultati/`, generati da `report.py`. Nessun numero è scritto a mano.

## 1. Modo B completo: il selettore vero (30 turni)

Set: 30 turni del selettore dai 5 run B di nozze-neve. Il prompt completo è sistema = prompts/selettore.md + contesto compilato della scena (circa 15 000 token), come in avvio.ts. Il prompt breve è un sistema condensato (circa 1 800 token) più il catalogo preselezionato dal Motore e le ultime tre scene, come da proposta del team lead. Prefisso in cache, una volta per scena. Decodifica greedy, max 700 token.

Limiti dichiarati: il catalogo del turno è quello statico della scena (il massimo), perché la preselezione reale dipende dallo stato del Motore; per il prompt breve la preselezione parte dallo stato iniziale della partita, quindi il catalogo medio è di 1,5 battute. Haiku sceglie spesso battute fuori dalla preselezione: per questo l'accordo esatto del prompt breve è basso per costruzione. Le latenze di Haiku vengono dai turni.jsonl dei run (API, con rete). Il prompt completo non è misurato con i tempi: la memoria della macchina (swap) falsa TTFT e token/s, e la prova è stata fermata.

| Modello · prompt | Token del prompt (mediana) | TTFT mediana (ms) | Token/s (decodifica) | RAM picco MLX (GB) | Turni validi | Annuncio azioni | Accordo esatto con Haiku | Accordo id (Jaccard) | Righe in lingua sbagliata o rotte | Turni |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Haiku 5.5 (riferimento, API) | n.d. | 1642 | 212.6 | n.d. | 93% | 100% | 100% | 1.00 | 0% | 30 |
| qwen3-4b-instruct-2507-4bit · breve | 3226 | 9878 | 18.3 | 3.64 | 93% | 86% | 10% | 0.24 | 0% | 30 |


## 2. Modalità minimali (set breve, stessi 30 turni)

**A) Classificatore**: per ogni azione il modello sceglie l'id di una battuta fra quelle preselezionate per quell'azione, oppure «nessuna». Nessun testo. Risposta stretta; se non valida, un tentativo di recupero. Haiku: quando nel riferimento ha scelto una battuta per un PG, si confronta l'id.

| Modello | Azioni | Haiku ha scelto una battuta | Tetto (id Haiku nei preselezionati) | Accordo esatto con Haiku | Accordo sul raggiungibile | «nessuna» quando Haiku sceglie | Id fuori catalogo | Invalide dopo un tentativo di recupero | Risposte valide al primo colpo | Secondi mediani |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| gemma-3-4b-it-qat-4bit-solo-classificatore | 85 | 21 | 57% | 38% | 67% | 38% | 0 | 0 | 100% | 1.28 |
| qwen3-4b-instruct-2507-4bit | 85 | 21 | 57% | 19% | 33% | 52% | 0 | 1 | 98% | 1.16 |
| qwen3-8b-4bit-solo-classificatore | 85 | 21 | 57% | 43% | 75% | 43% | 0 | 0 | 100% | 2.17 |


Tempi del classificatore: le misure di Qwen3-8B sono state fatte mentre mflux generava immagini sulla GPU, quindi i secondi sono falsati (la qualità no). Va rimisurato a GPU libera prima di usare il tempo.

**B) Annuncio** (stesso modello): frase in terza persona col nome, al massimo 12 parole, senza parole che non stanno nel testo. **C) Deterministico**: «Nome: «testo»», nessun modello, come confronto.

| Modello | Azioni | Nome del PG presente | Entro 12 parole | Con parole nuove rispetto al testo | Parole nuove (totale) | Lingua corretta |
|---|---:|---:|---:|---:|---:|---:|
| qwen3-4b-instruct-2507-4bit | 85 | 100% | 46% | 66% | 67 | 100% |


Controlli annuncio: nome presente; parole ≤ 12; parole nuove = parole di contenuto (almeno 4 lettere, fuori dalle funzionali) senza una radice di 4 lettere in comune con il testo originale; lingua con il controllo di difetti_lingua.

## 3. Scrittore in background con Claude Code (on request)

Cinque prompt identici, stessa scheda del PNG e stessa scena, per haiku e sonnet con `claude -p --model <m>`, eseguito dalla cartella di scratch (fuori dal repo). Si misura il tempo totale della chiamata.

| Modello | Chiamate | Tempo mediano (s) | Minimo (s) | Massimo (s) | Errori |
|---|---:|---:|---:|---:|---:|
| haiku (claude -p) | 5 | 7.3 | 6.5 | 8.3 | 0 |
| sonnet (claude -p) | 5 | 3.9 | 3.9 | 4.3 | 0 |


## 4. Raccomandazione

Vedi la sezione «Raccomandazione» in fondo a questo file.
