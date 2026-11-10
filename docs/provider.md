# Provider dei modelli

## In breve

- Di base tutto gira in locale. Zero centesimi, nessuna chiave.
- Un'API (Anthropic, OpenRouter) è un'opzione. Si sceglie componente per componente.
- Servono due ambienti Python (`services/lettore/.venv`, `services/voce/.venv`) e il modello locale.
  `scripts/configura.sh` dice cosa manca.

## I file

- `config/predefinita.yaml`: tracciato, vale per tutti. È la base.
- `config/locale.yaml`: non tracciato. Lo scrive `scripts/configura.sh`, solo con ciò che cambia qui.
- Le variabili d'ambiente vincono su tutto. Il nome è `CANTASTORIE_<COMPONENTE>`, per esempio
  `CANTASTORIE_LETTORE=anthropic`.
- I nomi vecchi funzionano ancora, con lo stesso significato:
  - `CANTASTORIE_LLM`: `finto` (lettore finto, arbitri a regole) oppure `haiku` (lettore Anthropic).
  - `CANTASTORIE_ARBITRO`: `regole` oppure `haiku`.
  - `CANTASTORIE_VOCE` o `CANTASTORIE_TTS`: `fish` (openrouter), `qwen` (locale), `finta` o `mock` (finto).
- Un provider forzato da variabile non ha altre riserve. Restano solo la riserva a regole o `finto`.

## Componenti

| Componente | Chi è | Provider di base | Riserva |
|---|---|---|---|
| `lettore` | legge il turno e sceglie le battute | locale (modo minimo) | finto |
| `arbitro_azioni` | azioni simultanee: dipendenze e conflitti | regole (un 4B ci metteva 15–30 s) | — |
| `arbitro_prove` | prove e tiri (SRD 5.2) | regole (classificatore del Motore); a mano `locale, modo: minimo` | regole |
| `riassunto` | «La volta scorsa…» | locale | regole (riassunto dai segni) |
| `regole` | «Chiedi una regola» dal telefono | locale | regole (ricerca nelle regole) |
| `voce` | voce del narratore e dei PG | locale (Qwen3-TTS) | finto |
| `immagini` | solo nella preparazione (`strumenti/immagini`) | locale (flux2-klein-4b con mflux) | nessuno |

## Provider

- `locale`: il server compatibile OpenAI su questo computer. Per il lettore e gli arbitri usa
  `backend.locale`. Per la voce e le immagini usa il loro servizio.
- `anthropic`: API Anthropic. Chiave `ANTHROPIC_API_KEY`. Modello di base `claude-haiku-5-5`.
- `openrouter`: API OpenRouter. Chiave `OPENROUTER_API_KEY`. Fa anche la voce (drama-3).
- `openai`: un altro server compatibile OpenAI. Servono `url`, `modello` e, se serve, `chiave`
  (il nome della variabile).
- `regole`: nessun modello. È la riserva deterministica del componente. Lettore e voce non ce l'hanno.
- `finto`: per le prove. Narratore a copione, voce a tono.
- `nessuno`: il componente è spento. Per le immagini si usa lo sfondo d'atmosfera.

Se il provider scelto non è disponibile all'avvio (chiave mancante, URL mancante), il server prova la
riserva successiva. Il controllo non apre connessioni: il server locale si verifica all'avvio.

Il lettore ha un modo. `auto` vuol dire minimo in locale e completo con un'API.

## Il server locale

- Su questo Mac: mlx-lm (`mlx_lm.server`) su `127.0.0.1:4613`.
- Modello: `mlx-community/Qwen3-4B-Instruct-2507-4bit`, circa 3,6 GB di RAM.
- Avvio: `scripts/lettore-avvio.sh [modello]`. Se risponde già, non fa niente. Se non genera più, lo
  riavvia. Log in `logs/lettore.out`. Le porte 4610, 4611 e 4612 non le usa.
- Coda: una richiesta alla volta per URL. Il lettore ha priorità alta e passa avanti. Gli altri
  componenti, se aspettano più di 8 s, rinunciano e usano la riserva a regole.
- Perché: la GPU è condivisa con la voce. Richieste parallele facevano uccidere il comando Metal
  da macOS e il server restava appeso.
- Altri sistemi: llama.cpp (`llama-server --port 4613`) o Ollama. Basta cambiare
  `backend.locale.url` e mettere `avvio: no`. `scripts/configura.sh --url-locale <url>` lo fa da solo.

## Lettore minimo

- Per ogni azione sceglie una battuta fra i candidati (le indicate dal Motore e al più 6 del catalogo
  che condividono parole con l'azione), oppure «nessuna».
- Può scrivere un annuncio in terza persona, col nome del PG, al massimo 20 parole. Le azioni private
  non si annunciano mai.
- «Nessuna» vuol dire una battuta d'attesa del repertorio. Non nasce mai prosa nuova.
- Perché: un modello piccolo non scrive prosa buona. La prosa viene dal repertorio. Il protocollo
  (`[narratore]`, `[usa]`, `[invito]`) resta quello di sempre.

## Uscita strutturata

- Il provider dice se la sa fare: `capacita.strutturato`.
- Anthropic e OpenRouter la fanno: lo schema va nella richiesta.
- I modelli locali no (`strutturato: false`). Allora: l'istruzione «rispondi solo JSON» va nel messaggio,
  il JSON si estrae e si valida in modo severo contro lo schema. Se non va, si ritenta una volta dicendo
  l'errore. Se fallisce ancora, si usa il ripiego deterministico, se c'è. Altrimenti l'errore va a chi chiama.

## All'avvio

- Il server stampa una riga per componente, nel log, con il prefisso `PROVIDER:`.
  Ogni riga dice: componente, provider, modo, modello e perché.
- `scripts/configura.sh` senza argomenti mostra le scelte e cosa c'è su questo computer: chiavi
  trovate (mai i valori), RAM, ambienti Python. Non scrive niente.
- Per cambiare: `--api`, `--tutto-locale`, oppure un componente alla volta (`--lettore`, `--arbitri`,
  `--voce`, `--immagini`, `--riassunto`, `--regole`).

## Misure

Prova `prova-f0`, porta 4730, tutto locale (`esperimenti/provider-locale/partita/riepilogo.json`, commit `ab8ee2d`):

- 3 turni giocati fino in fondo: 32 frasi, 143 secondi di voce Qwen, 4 buchi nel proiettore.
- Zero chiamate API. Costo: 0 USD.
- Un turno costa circa 30 s di modello (33,6, 31,7, 36,0 s) su un Mac da 16 GB con la memoria piena.
- 22 risposte strutturate non valide, contate dal riepilogo.
