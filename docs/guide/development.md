# Sviluppo

Cosa trovi qui: com'è fatto il repository, come si lanciano i test, come si prova su un'altra porta senza toccare la partita vera, e come contribuire.
Leggi prima: [installazione](installation.md), e `CLAUDE.md` alla radice del repository, che fissa le regole per chi ci lavora.

## Struttura del repository

| Cartella | Che cosa contiene |
|---|---|
| `apps/server/` | il server: Node e TypeScript, Fastify e Socket.IO. Turni, narratore Haiku, voce, pannello del master (`src/`), test con vitest (`test/`) |
| `apps/web/` | le pagine web in React e Vite: `/telefono` (giocatori), `/schermo` (proiettore), `/master` (pannello). Prove end-to-end con Playwright in `e2e/` |
| `packages/shared/` | il contratto condiviso: i tipi degli eventi e dei messaggi tra telefono, server e schermo |
| `services/voce/` | il servizio voce locale in Python (Qwen3-TTS su MLX), con il suo ambiente in `services/voce/.venv` |
| `strumenti/` | gli strumenti in Python e TypeScript: il validatore (`valida_campagna.py` e `valida/`), gli strati (`strati.py`), il lavoro tra le sessioni (`tra_sessioni.py`), lo stato degli asset (`stato_preparazione.py`) |
| `strumenti/immagini/` | la pipeline delle immagini (mflux, FLUX.2 klein), con il suo ambiente |
| `strumenti/audio/` | la pipeline dell'audio (musica, temi, ambienti, effetti), con il suo ambiente |
| `scripts/` | i comandi di tutti i giorni: `partita.sh`, `prepara.sh`, `tra-sessioni.sh`, `avvio.sh`, `arresto.sh`, `costi.sh`, `registro.sh`, `voce-avvio.sh`, `voce-arresto.sh`, `trascrizione.mjs` |
| `campagne/` | le campagne: `prova-f0`, `ponte-lanterne`, `nozze-neve` |
| `prompts/` | i prompt del narratore (`narratore.md`) e del selettore (`selettore.md`), letti dal server |
| `assets/voci/` | le clip delle voci e il registro `voci.yaml` |
| `.claude/skills/preparatore/` | la skill del Preparatore per Claude Code |
| `docs/` | progetto, contratti, ricerche, e questa guida (`docs/guide/`) |
| `esperimenti/` | prove e misure: copioni ciechi, giudizi, risultati delle immagini, dell'audio e della voce |
| `research/` | le prime ricerche e prove sui modelli, la voce e la musica |
| `cache/` | audio scaricato e voce già sintetizzata; fuori da git |
| `logs/` | log, archivio delle sessioni, screenshot; fuori da git |

I contratti tra i pezzi (porte, eventi, protocollo del narratore, file della campagna) sono in
[docs/f0-contratti.md](../f0-contratti.md). Chi cambia un contratto aggiorna quel file.

## I test

Nessuno di questi comandi avvia la partita o chiama un modello a pagamento. I test del server aprono server di prova
su porte scelte dal sistema, mai sulla 4610 o sulla 4611.

### Server e pagine web (vitest)

```
npm test
```

Lancia i test di tutti i pacchetti che ne hanno uno: `apps/server` e `apps/web` (con vitest).

```
npm run test -w @cantastorie/server
```

Lancia solo i test del server (con `-w @cantastorie/web`, solo quelli delle pagine).

```
npm run typecheck
npm run check
```

Il primo controlla i tipi TypeScript di tutti i pacchetti; il secondo fa i tipi e poi i test.

### Strumenti in Python (pytest)

Serve un `python3` con pytest e PyYAML; per i test delle immagini anche numpy e Pillow. Il test del validatore usa
anche node.

```
python3 -m pytest -q strumenti/test_*.py
```

Lancia i test del validatore, degli strati, del lavoro tra le sessioni, dello stato degli asset, delle chiavi, dei
limiti del Motore e dei documenti. Il test del validatore è il più lento: meno di un minuto.

```
python3 -m pytest -q strumenti/immagini/
```

Lancia i test della pipeline delle immagini, senza modello e senza rete.

```
strumenti/audio/.venv/bin/python strumenti/audio/test_audio.py
```

Lancia i test della pipeline dell'audio con il suo ambiente, senza rete. Se in quell'ambiente installi pytest, va
bene anche `strumenti/audio/.venv/bin/python -m pytest strumenti/audio/test_audio.py -q`.

### Servizio voce

```
cd services/voce
.venv/bin/python -m pytest -q
```

Lancia i test del servizio voce (normalizzazione del testo, PCM, registro delle voci, coda e API con un motore
finto, senza MLX). La configurazione è in `services/voce/pytest.ini`.

### Il validatore su una campagna di prova

```
python3 -I strumenti/valida_campagna.py strumenti/test_valida_fixtures/mini --rigoroso
```

Valida la campagna più piccola che passa in modo rigoroso: deve dare 0 errori.

### Prove end-to-end (Playwright)

Le prove end-to-end guidano un browser vero contro un server già acceso. **Non usano mai la partita vera**: per
default puntano a un'istanza di prova sulla porta 4710 (`apps/web/e2e/percorsi.ts`).

```
CANTASTORIE_PORTA=4710 scripts/avvio.sh --finto --mock
npm run e2e
CANTASTORIE_PORTA=4710 scripts/arresto.sh
```

La prima riga avvia un server di prova sulla 4710 con il narratore a copione e la voce finta (nessuna spesa); la
seconda lancia le prove; la terza ferma solo quel server.

- Molte prove vogliono un server acceso in un modo preciso (una campagna, un modo, variabili): il comando giusto
  sta in testa a ogni file in `apps/web/e2e/*.spec.ts`.
- Alcune usano il narratore vero, e quindi costano (per esempio `partita.spec.ts`): leggi l'intestazione prima di
  lanciarle.
- Per un'altra porta: `E2E_PORTA=4720` (oppure `E2E_URL`). Gli screenshot vanno in `logs/screenshots/`.

## Prove su un'altra porta

La partita vera usa porte fisse. Le prove ne usano altre, così puoi provare mentre qualcuno gioca.

| Porta | Che cosa | Chi la usa |
|---|---|---|
| 4610 | server della partita vera (pagine, API, Socket.IO), aperto alla rete locale | `scripts/partita.sh`, `scripts/avvio.sh` senza variabili |
| 4611 | servizio voce locale (Qwen), solo su `127.0.0.1` | `scripts/voce-avvio.sh` |
| 4612 | Vite in sviluppo, inoltra al server sulla 4610 | `npm run dev` |
| 4710, 4720, 4730… | istanze di prova | `CANTASTORIE_PORTA=<porta>` |

**Non toccare la 4610 e la 4611 durante le prove.** Gli script rifiutano la 4611 e la 4612 come porte di prova.

### Come funziona `CANTASTORIE_PORTA`

`CANTASTORIE_PORTA` la leggono gli script, non il server. `scripts/avvio.sh` la traduce nella variabile `PORT`, che
il server legge in `apps/server/src/config.ts` (senza `PORT` vale 4610, la costante `PORTA_SERVER` di
`packages/shared/src/eventi.ts`). Con una porta diversa dalla 4610, gli script:

- scrivono log e archivio delle sessioni in `logs/porta-<porta>/`, e compilano le pagine in
  `logs/porta-<porta>/web` (`apps/web/dist`, che serve la partita vera, non si tocca);
- usano la voce finta, oppure drama-3 con `--fish`, **mai Qwen**: il servizio sulla 4611 è della partita vera, e la
  riserva Qwen è spenta;
- partono da una sessione nuova ogni volta. Per riprendere quella salvata, avvia con
  `CANTASTORIE_NUOVA_SESSIONE=0 CANTASTORIE_PORTA=<porta> scripts/avvio.sh` (con `partita.sh` su una porta di prova
  si riparte sempre da capo);
- si fermano solo con lo stesso `CANTASTORIE_PORTA`.

### Esempi

```
CANTASTORIE_PORTA=4710 scripts/avvio.sh --finto --mock
```

Avvia un server di prova con il narratore a copione (`--finto`: nessuna chiamata ad Anthropic) e la voce finta
(`--mock`).

```
CANTASTORIE_PORTA=4710 CANTASTORIE_CAMPAGNA=ponte-lanterne CANTASTORIE_MODO=repertorio scripts/avvio.sh --finto --mock
```

Lo stesso, con una campagna e il modo B (repertorio) scelti da te.

```
CANTASTORIE_PORTA=4710 scripts/partita.sh ponte-lanterne --voce finta
```

Una partita di prova completa, con il controllo della campagna. Attenzione: `partita.sh` usa sempre il narratore
Haiku vero, quindi costa (vedi [voce e costi](voice-and-costs.md)).

```
CANTASTORIE_PORTA=4710 scripts/arresto.sh
```

Ferma solo il server di prova sulla 4710. Senza la variabile, `scripts/arresto.sh` ferma la partita vera.

```
CANTASTORIE_PORTA=4710 scripts/costi.sh
CANTASTORIE_PORTA=4710 scripts/registro.sh ponte-lanterne
```

Costi e registro dell'istanza di prova: leggono `logs/porta-4710/`.

### Altre variabili utili

Tutte le variabili del server sono in `apps/server/src/config.ts`. Quelle che servono più spesso per provare:

| Variabile | Che cosa fa |
|---|---|
| `CANTASTORIE_LLM=finto` | narratore a copione, nessuna chiamata ad Anthropic (lo stesso di `--finto`) |
| `CANTASTORIE_COPIONE_FINTO=<file>` | il copione del narratore finto |
| `CANTASTORIE_TTS=mock` | voce finta (lo stesso di `--mock`) |
| `CANTASTORIE_CAMPAGNA=<id>` | quale campagna in `campagne/` |
| `CANTASTORIE_CARTELLA_CAMPAGNA=<cartella>` | una campagna fuori da `campagne/`, per esempio una copia |
| `CANTASTORIE_MODO=improvvisa` / `repertorio` | modo A o modo B |
| `CANTASTORIE_SESSIONE=<n>` | quale pacchetto di una campagna a più sessioni |
| `CANTASTORIE_SEME_DADI=<esadecimale>` | rifà la stessa sequenza di dadi |
| `CANTASTORIE_MASTER_TOKEN=<token>` | un token fisso per il pannello del master |
| `CANTASTORIE_SESSIONI=<file>` oppure `off` | dove salvare l'archivio delle sessioni, o non salvarlo |

**Attenzione a `npm run dev`.** Avvia il server in modo sviluppo senza porta di prova, quindi sulla 4610, e Vite
sulla 4612. Non usarlo mentre qualcuno gioca.

## Contribuire

Le regole complete stanno in `CLAUDE.md`, alla radice del repository. In breve:

1. **Lavora su un ramo**, non su `main`:

   ```
   git switch -c <nome-del-ramo>
   ```

   Crea un ramo nuovo e ci passa sopra.

2. **Un passo alla volta, e verificato.** Prima di passare al successivo, lancia i test che toccano ciò che hai
   cambiato. Se tocchi una campagna, passala dal validatore.
3. **Commit piccoli e frequenti, che spiegano il perché**, non solo il cosa. La storia del repository è in italiano:
   scrivi i messaggi in italiano.
4. **Documenti e codice vanno insieme.** Se cambi un comportamento, aggiorna il documento che lo descrive (in
   `docs/` o nella skill). `strumenti/test_documenti.py` controlla le frasi che sono già andate fuori passo una volta.
5. **Niente segreti nel repository.** Prima di ogni commit e di ogni push:
   - controlla con `git status` e `git diff --cached` che cosa stai per mandare;
   - `.env`, `logs/` e `cache/` sono già fuori da git (`.gitignore`): non forzarli dentro;
   - le chiavi si leggono dall'ambiente, dal `.env` alla radice o da un file di ripiego, e non si stampano mai:
     non incollarne il valore in codice, documenti, commit o log;
   - i log contengono le azioni private dei giocatori: non copiarne pezzi nei documenti.

## Problemi?

Vedi [problemi comuni](common-problems.md).
