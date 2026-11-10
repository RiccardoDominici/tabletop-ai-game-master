# Installazione

In questa pagina: cosa installare, dove mettere le chiavi, cosa si scarica la prima volta e quanto pesa.
Prima leggi: il [README](../../README.md), per sapere che cos'è Cantastorie.

I passi da 1 a 4 bastano per giocare con le tre campagne di esempio. I passi da 5 a 7 sono facoltativi:
servono per la voce locale, per generare immagini e per generare l'audio di una campagna nuova.

## Cosa ti serve

| Cosa | Perché | Serve per forza? |
|---|---|---|
| Un Mac con chip Apple | immagini e voce locale usano MLX, che gira solo sui chip Apple | sì per immagini e voce Qwen; per il resto da verificare |
| Node 22 o più recente | server e pagine web (`package.json`, campo `engines`) | sì |
| Python 3 con PyYAML | il validatore delle campagne (`strumenti/valida_campagna.py`) | sì |
| uv | crea gli ambienti Python di voce, immagini e audio | solo per i passi 5, 6 e 7 |
| ffmpeg | controlla e codifica l'audio (`strumenti/audio/setup.sh`) | solo per il passo 7 |

Sul Mac di sviluppo gira Node 25 (lo nomina `apps/server/src/sessione/archivio.ts`, per l'archivio SQLite).
Una prova completa con Node 22, il minimo scritto in `package.json`: da verificare.

## Passo 1. Scarica il repository

```bash
git clone <indirizzo-del-repository> cantastorie
cd cantastorie
```

- La prima riga copia il repository nella cartella `cantastorie`. L'indirizzo pubblico: da verificare.
- La seconda riga entra nella cartella. Tutti i comandi di questa guida partono da qui, la radice del repo.

## Passo 2. Le dipendenze di Node

```bash
npm install
```

Installa in un colpo solo il server (`apps/server`), le pagine web (`apps/web`) e il pacchetto condiviso
(`packages/shared`): sono i «workspaces» di `package.json` alla radice.

La cartella `node_modules/` che ne esce pesava 235 MB sul Mac di sviluppo (misura del 9 novembre 2026).

## Passo 3. Python 3 e PyYAML

Il validatore delle campagne gira con il `python3` del sistema e ha bisogno di PyYAML
(lo scrive in testa `strumenti/valida_campagna.py`). Controlla che ci sia:

```bash
python3 -I -c "import yaml"
```

- Se non stampa niente, va bene.
- Se stampa `ModuleNotFoundError`, devi installare PyYAML nel tuo Python.

Gli script chiamano il validatore con `python3 -I`: in questo modo Python ignora i pacchetti installati solo
per il tuo utente. PyYAML deve quindi stare nel Python che usi, non in un'installazione «per utente».
Il comando giusto per installarlo dipende da come hai installato Python: da verificare sul tuo Mac.

## Passo 4. Le chiavi

1. Copia il modello del file delle chiavi.

   ```bash
   cp .env.example .env
   ```

   Il file `.env` sta alla radice del repo ed è fuori da git (vedi `.gitignore`): non va mai committato.

2. Apri `.env` con un editor di testo. Incolla ogni chiave dopo il suo `=`, sulla sua riga:

   ```bash
   ANTHROPIC_API_KEY=la-tua-chiave-anthropic
   OPENROUTER_API_KEY=la-tua-chiave-openrouter
   FREESOUND_API_KEY=
   ```

   Sono segnaposto: al loro posto va la tua chiave vera. Lascia vuota la riga di ciò che non usi.

3. Dove si prendono le chiavi (gli indirizzi sono scritti in `.env.example`):
   - `ANTHROPIC_API_KEY`: https://console.anthropic.com/settings/keys (a pagamento, a consumo). Obbligatoria per
     giocare con il narratore vero.
   - `OPENROUTER_API_KEY`: https://openrouter.ai/keys (a consumo: ricarica il credito). Serve per la voce drama-3.
   - `FREESOUND_API_KEY`: https://freesound.org/apiv2/apply/ (gratuita). Facoltativa: serve solo a generare
     l'audio di una campagna nuova.

### In che ordine il codice cerca le chiavi

L'ordine è lo stesso in tutto il repo: nel server (`apps/server/src/llm/chiavi.ts`) e negli strumenti Python
(`strumenti/chiavi.py`).

1. La variabile d'ambiente con lo stesso nome (per esempio `ANTHROPIC_API_KEY`).
2. La riga `NOME=` del file `.env` alla radice del repo.
3. Un file di ripiego, se lo indichi tu. Serve a chi tiene le chiavi nel `.env` di un altro progetto:
   - `ANTHROPIC_KEY_FILE=<percorso>` per la chiave Anthropic;
   - `CANTASTORIE_CHIAVE_OPENROUTER=<percorso>` per la chiave OpenRouter.

   Se non lo indichi, il codice prova un percorso del Mac di sviluppo (`apps/server/src/config.ts`): sul tuo Mac
   non esiste, e allora si salta.

Regole di sicurezza del codice:
- dal file si legge solo la riga che comincia con `NOME=`; le altre righe non si leggono;
- se la stessa riga compare due volte, è un errore;
- una riga vuota vale come «chiave non impostata», e si passa al passo dopo;
- il valore non si stampa mai: il log dice solo da dove viene la chiave e quanti caratteri ha.

### Come controlli che la chiave è stata trovata

Dopo il primo avvio (vedi [Una serata di gioco](one-evening.md)) cerca questa riga nel log del server:

```bash
grep 'client Anthropic pronto' logs/server.out
```

La riga dice `origine` (`ambiente`, `env-radice` o `file-precedente`) e la lunghezza della chiave, mai la chiave.

## Fin qui basta per giocare

Con i passi da 1 a 4 puoi giocare le tre campagne di esempio (`prova-f0`, `ponte-lanterne`, `nozze-neve`):
le loro immagini e il loro audio sono già nel repo. Puoi usare la voce drama-3 (con la chiave OpenRouter)
oppure la voce finta. Prosegui con [Una serata di gioco](one-evening.md).

## Passo 5 (facoltativo). La voce locale Qwen

La voce Qwen gira sul Mac, senza rete. Fa da riserva quando drama-3 non risponde, oppure da voce principale
con `--voce qwen`. Vedi [Voce e costi](voice-and-costs.md).

1. Crea l'ambiente Python del servizio voce, con Python 3.12.

   ```bash
   uv venv --python 3.12 services/voce/.venv
   ```

2. Installa le librerie, con le versioni bloccate e misurate.

   ```bash
   uv pip install --python services/voce/.venv/bin/python -r services/voce/requirements.lock
   ```

   Non aggiornare `mlx` e `mlx-audio` per conto tuo: il servizio usa dettagli interni di mlx-audio 0.6.3
   (lo scrive `services/voce/requirements.txt`).

3. Il modello. È `mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit` (`services/voce/voce/config.py`) e pesa 1,99 GB
   (`research/local-tts.md`). Deve essere già nella cache di Hugging Face (`~/.cache/huggingface/hub`):
   il servizio parte con `HF_HUB_OFFLINE=1` e non scarica niente da solo (`services/voce/README.md`).

   Come scaricarlo la prima volta: il repo non lo scrive, **da verificare**. Una strada possibile, non provata,
   usa la libreria `huggingface_hub` che l'ambiente del passo 2 contiene già:

   ```bash
   services/voce/.venv/bin/python -c "from huggingface_hub import snapshot_download; snapshot_download('mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit')"
   ```

4. Prova il servizio.

   ```bash
   scripts/voce-avvio.sh
   scripts/voce-arresto.sh
   ```

   - Il primo comando avvia la voce su `127.0.0.1:4611` e aspetta che sia pronta. Sul Mac di riferimento ci
     metteva 20–22 secondi (misura del 2 novembre 2026). Aspetta al massimo 300 secondi.
   - Il secondo comando la ferma.
   - Il log è in `logs/voce.out`.

Memoria: il processo della voce stava a 2,2 GB a riposo con un picco di 3,5 GB (misura del 2 novembre 2026,
`services/voce/README.md`). `scripts/partita.sh` avvisa «fino a 7 GB di RAM». L'ambiente pesava 474 MB.

## Passo 6 (facoltativo). Le immagini

Ti serve solo per generare le immagini di una campagna nuova (luoghi, ritratti dei PNG, situazioni).

1. Crea l'ambiente Python delle immagini.

   ```bash
   uv venv --python 3.12 strumenti/immagini/.venv
   ```

2. Installa le librerie: `mflux` (il generatore), `pyyaml` e `anthropic`.

   ```bash
   uv pip install --python strumenti/immagini/.venv/bin/python -r strumenti/immagini/requirements.txt
   ```

   `anthropic` serve al controllo visivo: Claude Haiku guarda ogni immagine generata. Usa la tua
   `ANTHROPIC_API_KEY` e quindi costa (poco: vedi [Voce e costi](voice-and-costs.md)).

3. Il modello è `mflux-community/flux2-klein-4b-mflux-q4` e pesa 4,62 GB (`strumenti/immagini/motore.py`).
   Se si scarica da solo alla prima generazione: **da verificare** (il repo non lo scrive). Sul Mac di sviluppo
   sta nella cache di Hugging Face, `~/.cache/huggingface/hub`.

4. Prova senza generare niente: questo comando dice cosa genererebbe, con quale prompt, senza caricare il modello.

   ```bash
   strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0 --dry-run
   ```

Cose da sapere prima di generare:
- servono almeno 8 GB liberi sul disco, altrimenti il generatore non parte (`strumenti/immagini/motore.py`);
- tieni il Mac attaccato all'alimentatore: una campagna intera vuol dire 15–40 minuti di GPU
  (`scripts/prepara.sh`), e a batteria sotto il 20% il generatore si rifiuta di partire;
- l'ambiente pesava 1,2 GB sul Mac di sviluppo.

Di solito non lanci `genera.py` a mano: lo lancia `scripts/prepara.sh`. Vedi
[Creare una campagna](create-a-campaign.md).

## Passo 7 (facoltativo). L'audio

Ti serve solo per generare la musica, i temi dei PNG e i suoni d'ambiente di una campagna nuova.

1. Installa ffmpeg, se non ce l'hai. Lo script usa quello del sistema: lo cerca nel `PATH` o in
   `/opt/homebrew/bin/ffmpeg`.

2. Prepara lo strumento audio.

   ```bash
   strumenti/audio/setup.sh
   ```

   Cosa fa, in ordine:
   - crea l'ambiente Python `strumenti/audio/.venv` con uv e Python 3.12;
   - installa `strumenti/audio/requirements.txt` (numpy, pyyaml, tinysoundfont);
   - scarica una volta il SoundFont GeneralUser GS (32 MB) in `cache/audio/soundfont/` e ne controlla l'impronta sha256;
   - controlla che ci sia ffmpeg.

   Puoi lanciarlo più volte: salta ciò che c'è già.

3. Prova senza generare niente.

   ```bash
   strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/prova-f0 --dry-run
   ```

Durante la generazione si scaricano solo i file che servono:
- il catalogo di Incompetech e i brani scelti, in `cache/audio/incompetech/`;
- i suoni d'ambiente CC0 dell'Internet Archive, in `cache/audio/pool/`;
- i suoni di Freesound, solo se c'è `FREESOUND_API_KEY`.

Le fonti e le licenze sono in `docs/audio.md`. Anche l'audio lo lancia di solito `scripts/prepara.sh`.

## Cosa finisce dove

Pesi misurati sul Mac di sviluppo il 9 novembre 2026, dopo le tre campagne di esempio. Niente di questo è in git.

| Cosa | Dove | Peso |
|---|---|---|
| Dipendenze di Node | `node_modules/` | 235 MB |
| Ambiente della voce | `services/voce/.venv/` | 474 MB |
| Ambiente delle immagini | `strumenti/immagini/.venv/` | 1,2 GB |
| Ambiente dell'audio | `strumenti/audio/.venv/` | 26 MB |
| Modello della voce Qwen | `~/.cache/huggingface/hub/` | 1,99 GB (scritto in `research/local-tts.md`) |
| Modello delle immagini | `~/.cache/huggingface/hub/` | 4,62 GB (scritto in `strumenti/immagini/motore.py`) |
| SoundFont, brani, suoni, battute pre-registrate con Qwen | `cache/audio/` | 289 MB in tutto |
| Battute già dette da drama-3 | `cache/audio-fish/` | 6,4 MB |
| Log, costi, archivio delle partite | `logs/` | cresce a ogni partita |

## Controllo finale

```bash
python3 -I strumenti/valida_campagna.py campagne/prova-f0
```

Controlla la campagna di prova. Se finisce senza errori, l'installazione di base è a posto (gli avvisi non contano).
Per un controllo del modo B il validatore usa anche Node: senza Node, quel controllo diventa un avviso
(lo scrive `strumenti/valida_campagna.py`).

Ora puoi giocare: [Una serata di gioco](one-evening.md).

## Problemi?

Vai a [Problemi comuni](common-problems.md).
