# Voce e costi

In questa pagina: le tre voci del gioco, il registro delle voci `assets/voci/voci.yaml`, e quanto costa giocare, con cifre e date.
Prima leggi: [Una serata di gioco](una-serata.md), almeno la parte su `scripts/partita.sh`.

## Le tre voci

Scegli la voce con l'opzione `--voce` di `scripts/partita.sh`.

| Opzione | Che voce è | Cosa serve | Costo |
|---|---|---|---|
| `--voce fish` (predefinita) | drama-3 di Fish Audio, attraverso OpenRouter. Espressiva: segue le indicazioni di tono del narratore. | la chiave `OPENROUTER_API_KEY` con credito | a consumo (vedi sotto) |
| `--voce qwen` | Qwen3-TTS 0.6B, sul Mac, senza rete. Clona le voci da una clip di circa 8 secondi. | Mac con chip Apple e il passo 5 dell'[installazione](installazione.md) | gratis |
| `--voce finta` | un tono al posto della voce | niente | gratis |

Esempi:

```bash
scripts/partita.sh nozze-neve
scripts/partita.sh nozze-neve --voce qwen
scripts/partita.sh nozze-neve --voce finta
```

- Il primo usa drama-3 (è la scelta predefinita).
- Il secondo avvia la voce locale Qwen e la usa per tutto.
- Il terzo usa la voce finta: utile per provare senza spendere.

Il narratore, invece, è sempre Haiku vero, con qualunque voce.

### drama-3: cosa succede quando non risponde

La voce drama-3 è la voce del gioco dal 9 novembre 2026. Il server manda una frase per richiesta. Se qualcosa va
storto (`docs/ricerca-voce-drama3.md`, §5):

1. una frase è riuscita solo quando arriva il primo pezzo di audio, entro 6 secondi;
2. se no, il server riprova una volta. Non riprova per gli errori in cui riprovare non serve (400, 401, 402, 403,
   404, 413). Il 402 vuol dire credito finito: ricarica OpenRouter;
3. poi passa alla voce locale Qwen, se è accesa e pronta;
4. altrimenti la frase resta scritta sullo schermo e il turno va avanti.

Per avere Qwen come riserva, accendilo prima di far partire la partita:

```bash
scripts/voce-avvio.sh
scripts/partita.sh nozze-neve
```

- Il primo comando avvia la voce locale e aspetta che sia pronta.
- Il secondo fa partire la partita con drama-3. Lo script se ne accorge e scrive «riserva: la voce locale, già pronta».

Le istanze di prova, su una porta diversa dalla 4610, non usano mai Qwen: il servizio voce è della partita vera.

### Qwen: cosa sapere

- Il servizio gira su `127.0.0.1:4611`: lo chiama solo il server, dal Mac stesso.
- All'avvio carica il modello e «riscalda» tutte le voci: sul Mac di riferimento ci metteva 20–22 secondi
  (misura del 2 novembre 2026, `services/voce/README.md`).
- Memoria: 2,2 GB a riposo e un picco di 3,5 GB nella stessa misura. `scripts/partita.sh` avvisa «fino a 7 GB di RAM».
- Genera appena più in fretta di quanto si ascolta. Con il Mac carico di altre app (browser, Docker) può restare
  indietro: chiudi ciò che non serve.
- Legge solo le parole: le indicazioni di tono di drama-3 non le riceve.

## Le indicazioni di tono (solo drama-3)

Il narratore e le battute del repertorio possono dire alla voce *come* parlare. Proiettore, telefoni e trascrizione
mostrano solo le parole (`docs/f0-contratti.md`, «Voce espressiva nelle righe del protocollo»).

- **Una direzione** a inizio riga, tra quadre, breve, in italiano, senza punti: vale per tutta la riga.
  Esempio da `docs/da-fare.md`: `[png_ettore] [offeso, ma a voce bassa] Non venni.`
- **Suoni**, dove cadono: `[sigh]`, `[laugh]`, `[breath]`, `[pause]`.
- **Tag da chiudere** nella stessa frase: `<whisper>`, `<emphasis>`, `<soft>`, `<fast>`, `<slow>`, `<stress>`, `<forceful>`.

Una guardia toglie (e registra nel log) i tag sconosciuti, le chiusure senza apertura e le direzioni oltre 80 caratteri:
un tag lasciato aperto verrebbe letto ad alta voce.

Senza direzione vale quella predefinita:
- per un PNG, `voce.tts.direzione` nella sua scheda; se manca, il server la compone dalla scheda (carattere, timbro,
  età, velocità);
- per il narratore, `direzione_voce` nella carta di stile (`stile.yaml`); se manca, la prima frase di `registro_narratore`.

## «Ascolta qui»

Ogni telefono può far sentire la voce del gioco anche su di sé, con il pulsante tondo «Ascolta qui» in alto.
La voce dell'esito di un'azione privata va solo ai telefoni di quel personaggio con «Ascolta qui» acceso, mai al
proiettore. Come si usa: [Una serata di gioco](una-serata.md), «Ascolta qui».

## Il registro delle voci: `assets/voci/voci.yaml`

È l'elenco delle voci che il gioco conosce. Lo leggono il server (per drama-3) e il servizio voce (per Qwen).
Le voci di oggi sono cinque: `narratore` (la voce fissa del narratore), `vincent`, `nadine`, `lucian`, `tabitha`.

Ogni voce ha questi campi:

| Campo | A cosa serve |
|---|---|
| `id` | il nome della voce, quello che scrivi nelle schede |
| `file` | la clip di riferimento per Qwen, nella stessa cartella (per esempio `vincent.wav`) |
| `testo_rif` | la trascrizione esatta della clip. Se non corrisponde all'audio, il clone di Qwen peggiora. |
| `descrizione` | a cosa serve la voce, per chi prepara le campagne |
| `simile_a` | le voci che a orecchio si confondono con questa: il validatore vieta due voci simili nella stessa scena |
| `fish` | l'identificativo della voce pubblica di Fish Audio usata da drama-3 |
| `fish_titolo`, `fish_perche` | come si chiama la voce su Fish e perché è stata scelta |

Un PNG sceglie la sua voce nella scheda, con `voce.tts.voce_id`. Per esempio, in `campagne/nozze-neve/png/png_ettore.yaml`:

```yaml
tts: {voce_id: vincent, eta_apparente: "75-85", altezza: bassa, velocita: 0.95, timbro: "grave e ruvido, come una carriola sul selciato"}
```

Se cambi una voce:
- **per drama-3**: cambia il campo `fish`, poi svuota la cartella `cache/audio-fish`, che contiene le battute già dette
  con la voce vecchia (lo scrive la testa di `voci.yaml`);
- **per Qwen**: la clip deve essere di circa 8 secondi, mono, con la trascrizione esatta in `testo_rif`;
- **in ogni caso**: niente cloni di persone reali (attori, doppiatori, youtuber, politici) né di personaggi di film o
  cartoni. È il criterio scritto in testa a `voci.yaml`, e la licenza di drama-3 vieta di clonare una persona reale
  senza il suo consenso (`docs/ricerca-voce-drama3.md`, §4).

Per usare un altro registro, indica il file con `CANTASTORIE_VOCI=<percorso>` (server, `apps/server/src/config.ts`)
e `VOCE_REGISTRO=<percorso>` (servizio voce, `services/voce/README.md`).

## Le battute già pronte

Le battute del repertorio sono scritte prima, quindi la loro voce si può conservare.
- **drama-3**: ogni battuta detta dal vivo finisce in `cache/audio-fish`. La volta dopo è gratis e parte subito.
- **Qwen**: le battute si possono pre-registrare tutte prima della serata, in `cache/audio`. Il comando è nella testa
  di `apps/server/src/strumenti/prerender.ts`:

  ```bash
  npx tsx apps/server/src/strumenti/prerender.ts --solo-conta
  npx tsx apps/server/src/strumenti/prerender.ts
  ```

  - Il primo conta solo le battute da registrare.
  - Il secondo le registra. Serve il servizio voce acceso, che resta occupato per circa 20 minuti.
  - Quale campagna registra: quella della variabile `CANTASTORIE_CAMPAGNA` (predefinita `prova-f0`, in
    `apps/server/src/config.ts`). Una prova con un'altra campagna: da verificare.

## Quanto costa

Le cifre di questa pagina sono solo quelle scritte nel repo, con la loro fonte e la data della misura.
I prezzi possono cambiare: controlla sempre i listini di Anthropic e di OpenRouter.

### Le tariffe scritte nel codice

| Servizio | Tariffa | Fonte | Data |
|---|---|---|---|
| Claude Haiku 5.5 (`claude-haiku-5-5`), narratore e arbitri | 0,10 $ per milione di token in ingresso, 0,50 $ per milione in uscita, con prompt fino a 100.000 token. Oltre: 0,50 $ e 2,50 $. La lettura dalla cache costa 0,1 volte l'ingresso; la scrittura in cache 1,25 volte (5 minuti) o 2 volte (1 ora). | `apps/server/src/llm/costi.ts` | non indicata |
| drama-3 via OpenRouter | 2 $ per milione di byte del testo mandato alla voce. È la «tariffa di lancio» e può salire. Le generazioni fallite non si pagano. | `apps/server/src/voce/fish.ts`, `docs/ricerca-voce-drama3.md` §1 | 9 novembre 2026 |
| Qwen locale | gratis: gira sul Mac | | |
| Voce finta | gratis | | |
| Freesound | la chiave è gratuita | `.env.example` | |

### Le misure

| Cosa si è misurato | Quanto | Data | Fonte |
|---|---|---|---|
| Prova vera: `nozze-neve` in modo B, apertura e tre turni, 49 frasi dette da drama-3 | voce 0,0124 $ (6.225 byte, 158 s di audio); Haiku 0,0053 $ | 9 novembre 2026 | `docs/ricerca-voce-drama3.md` §6 |
| Voce drama-3, in media per turno | circa 0,0035 $ | 9 novembre 2026 | `docs/ricerca-voce-drama3.md` §6 |
| Una sessione di 45 turni (stima dalla prova) | circa 0,16 $ di voce e 0,08 $ di Haiku: circa 0,25 $ in tutto, finché resta la tariffa di lancio | 9 novembre 2026 | `docs/ricerca-voce-drama3.md` §6 |
| La direzione di tono predefinita | circa 80 byte a frase, cioè 0,00016 $ | 9 novembre 2026 | `docs/ricerca-voce-drama3.md` §2 |
| L'arbitro dei dadi (Haiku), 16 chiamate di prova | 0,0029 $ | 9 novembre 2026 | `docs/prove.md` §6 |
| Le prime prove di Haiku come narratore | 85 chiamate per 0,018 $ | 1 novembre 2026 | `docs/architettura.md`, «Prove fatte» |

In quella prova la direzione predefinita del narratore, lunga 67 caratteri, faceva più di metà del costo della voce.

### Cosa non è misurato nel repo

- La preparazione di una campagna con la skill `preparatore` di Claude Code: il costo dipende dal tuo abbonamento o
  dal tuo account. Da verificare.
- Il controllo visivo delle immagini con Haiku: il codice calcola il costo di ogni chiamata
  (`strumenti/immagini/visione.py`), ma una cifra per una campagna intera non è scritta. Da verificare.
- La generazione delle immagini e dell'audio è locale: non costa in API, ma occupa il Mac (15–40 minuti di GPU per
  le immagini di una campagna, `scripts/prepara.sh`).

### Quanto hai speso tu: `scripts/costi.sh`

Il server scrive i costi in `logs/costi.jsonl`: righe per Haiku (turni, riparazioni, arbitro, preriscaldamento) e
righe per la voce (`tipo: voce`). Lo script le somma per sessione di gioco, usando l'archivio delle partite.
È in sola lettura: puoi usarlo anche mentre si gioca.

```bash
scripts/costi.sh
```

Mostra le ultime 10 sessioni della partita vera, con Haiku e voce separati.

```bash
scripts/costi.sh --tutte
scripts/costi.sh --json
scripts/costi.sh --log <cartella>
```

- `--tutte` mostra tutte le sessioni.
- `--json` scrive il risultato in JSON, per altri script.
- `--log <cartella>` legge `costi.jsonl` e `sessioni.sqlite` da un'altra cartella.

Per un'istanza di prova su un'altra porta, metti la porta davanti: `CANTASTORIE_PORTA=4730 scripts/costi.sh`.

Le righe che non cadono in nessuna sessione (per esempio prima di «Inizia sessione») finiscono in «fuori sessione»,
raccolte per giorno (`apps/server/src/strumenti/costi.ts`).

## Problemi?

Vai a [Problemi comuni](problemi-comuni.md).
