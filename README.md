# Cantastorie

In questa pagina: che cos'è Cantastorie, cosa ti serve e come fai partire la prima partita.
Prima di leggere: niente. Questa è la pagina da cui cominciare.

## Che cos'è

Cantastorie è un framework per giocare a Dungeons & Dragons di persona, attorno a un tavolo, con un narratore IA.
Il narratore è Claude Haiku: racconta la scena, fa parlare i personaggi non giocanti (PNG) e risponde alle azioni dei giocatori.
Il proiettore mostra il luogo, i ritratti di chi è in scena e i tiri dei dadi; una cassa porta la voce e la musica.
Ogni giocatore usa il proprio telefono, con il browser: sceglie il suo personaggio e scrive cosa fa.
Chi fa da master ha un pannello sul Mac per correggere o fermare il narratore in ogni momento.
Non è una campagna sola: è un sistema che genera campagne sempre nuove (storia, immagini, musica), da una serata o da molte sessioni.

Regole, dadi e segreti li tiene il codice, non il modello: il narratore racconta gli esiti, non li decide.

## Cosa serve

- **Un Mac con chip Apple** (M1 o più recente). Serve per le immagini generate in locale e per la voce locale Qwen,
  che usano le librerie MLX. Il progetto è dimensionato per 16 GB di RAM (vedi [architettura](docs/architettura.md)).
  Su un computer senza chip Apple il resto (server, narratore, voce drama-3) non è stato provato: da verificare.
- **Node 22 o più recente** (campo `engines` di `package.json`).
- **Python 3 con PyYAML**: lo usa il validatore delle campagne.
- **uv e ffmpeg**, solo se vuoi generare immagini e audio o usare la voce locale. Vedi la
  [guida all'installazione](docs/guide/installation.md).
- **Le chiavi API**:

| Chiave | A cosa serve | Serve per forza? |
|---|---|---|
| `ANTHROPIC_API_KEY` | il narratore Haiku, l'arbitro dei dadi, il controllo delle immagini | sì, per giocare col narratore vero |
| `OPENROUTER_API_KEY` | la voce del gioco (drama-3 di Fish Audio, via OpenRouter) | no: senza, usi la voce locale Qwen o la voce finta |
| `FREESOUND_API_KEY` | suoni d'ambiente CC0 da Freesound | no (la chiave è gratuita) |

**Quanto costa.** Anthropic e OpenRouter si pagano a consumo. L'unica misura completa nel repo è del 9 novembre 2026:
una sessione di 45 turni costa circa 0,25 $ (circa 0,16 $ di voce drama-3 e 0,08 $ di Haiku), finché drama-3
resta alla tariffa di lancio. Tutte le cifre, con la fonte e la data: [Voce e costi](docs/guide/voice-and-costs.md).

## Avvio rapido

Questi passi fanno partire la campagna di prova `prova-f0` (una scena, 20–30 minuti, 3 o 4 giocatori).

1. Scarica il repository e entra nella cartella.

   ```bash
   git clone <indirizzo-del-repository> cantastorie
   cd cantastorie
   ```

   L'indirizzo pubblico del repository: da verificare (il repo non ha ancora un remoto).

2. Installa le dipendenze di Node (server, pagine web e pacchetto condiviso, tutto in un colpo).

   ```bash
   npm install
   ```

3. Crea il file delle chiavi copiando il modello.

   ```bash
   cp .env.example .env
   ```

   Poi apri `.env` con un editor di testo e incolla le tue chiavi dopo il segno `=`. Per esempio:

   ```bash
   ANTHROPIC_API_KEY=la-tua-chiave-anthropic
   OPENROUTER_API_KEY=la-tua-chiave-openrouter
   ```

   Sono segnaposto: al loro posto va la tua chiave vera. Il file `.env` è fuori da git e non va mai condiviso.
   Il codice cerca ogni chiave in quest'ordine: prima la variabile d'ambiente con lo stesso nome, poi la riga del
   file `.env` alla radice del repo, e per ultimo un file di ripiego facoltativo (vedi `apps/server/src/llm/chiavi.ts`).
   I dettagli sono nella [guida all'installazione](docs/guide/installation.md).

4. Fai partire la partita.

   ```bash
   scripts/partita.sh prova-f0
   ```

   Lo script controlla la campagna, compila le pagine, avvia il server e alla fine stampa tre indirizzi:
   il proiettore, i telefoni e il pannello del master.

5. Sul Mac collegato al proiettore apri `http://localhost:4610/schermo` e clicca «Inizia sessione».
   I giocatori inquadrano il QR sul proiettore con il telefono. Tu apri il link del pannello del master
   che lo script ha stampato.

6. A fine serata ferma tutto.

   ```bash
   scripts/arresto.sh
   ```

Senza chiave OpenRouter, fai partire la partita con la voce finta (un tono al posto della voce):

```bash
scripts/partita.sh prova-f0 --voce finta
```

Le altre campagne di esempio sono `ponte-lanterne` (quattro scene, da due ore a due ore e mezza) e
`nozze-neve` (tre scene, circa due ore). Tutte le opzioni sono in [Una serata di gioco](docs/guide/one-evening.md).

## La guida

Leggila in quest'ordine la prima volta.

1. [Installazione](docs/guide/installation.md): dipendenze, chiavi, cosa si scarica e quanto pesa.
2. [Una serata di gioco](docs/guide/one-evening.md): una partita dall'inizio alla fine.
3. [Collegare i telefoni](docs/guide/phones.md): la rete, il QR, cosa fare se un telefono non entra.
4. [Il pannello del master](docs/guide/master-panel.md): ogni sezione e ogni comando.
5. [Dadi e schede](docs/guide/dice-and-sheets.md): come funzionano le prove e le schede dei personaggi.
6. [Voce e costi](docs/guide/voice-and-costs.md): le tre voci, il registro delle voci, quanto si spende.
7. [Creare una campagna](docs/guide/create-a-campaign.md): dal brief alla campagna pronta da giocare, con PNG nascosti e battute pronte.
8. [Campagne a più sessioni](docs/guide/multi-session-campaigns.md): fine sessione, registro, sessione dopo.
9. [Il tuo manuale di regole](docs/guide/your-rules-manual.md): giocare con le regole di un manuale tuo invece dell'SRD 5.2.
10. [Problemi comuni](docs/guide/common-problems.md): cosa fare quando qualcosa non va.
11. [Sviluppo](docs/guide/development.md): test, istanze di prova, come è fatto il codice.

## Per chi vuole capire come è fatto

- `docs/architettura.md`: i moduli, le interfacce, le prove fatte.
- `docs/manuale-master.md`: le regole di mestiere del master, imposte dal codice.
- `docs/prove.md`: prove e dadi (ricerca, schema delle schede, misure).
- `docs/strati.md`: campagne da una sessione o da molte.
- `docs/da-fare.md`: le cose ancora aperte.

## Cosa non c'è ancora

- Il microfono: oggi si gioca scrivendo sul telefono.
- Il combattimento completo (iniziativa, turni, condizioni): vedi `docs/prove.md`, «Aperto».
- La licenza del codice: il repo non ha ancora un file di licenza (da verificare).

## Crediti

Questo lavoro include materiale dal System Reference Document 5.2 («SRD 5.2») di Wizards of the Coast LLC,
https://www.dndbeyond.com/srd, con licenza Creative Commons Attribution 4.0 International.
I crediti di musica, suoni, voci e immagini sono in `CREDITS.md`.

## Problemi?

Vai a [Problemi comuni](docs/guide/common-problems.md).
