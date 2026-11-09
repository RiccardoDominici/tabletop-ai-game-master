# Problemi comuni

Cosa trovi qui: i guasti più frequenti, ognuno con il sintomo, la causa probabile, che cosa fare e dove guardare nei log.
Leggi prima: [una serata](una-serata.md) per il giro normale, e per i telefoni [la guida ai telefoni](../guida-telefoni.md).

## Dove stanno i log

Tutti i log stanno in `logs/`, fuori da git. Contengono le azioni dei giocatori, anche quelle private: **non
pubblicarli e non allegarli a una segnalazione** senza averli letti.

| File | Che cosa c'è dentro |
|---|---|
| `logs/partita.out` | l'ultimo avvio fatto da `scripts/partita.sh` |
| `logs/server.out` | l'uscita del server, avvio dopo avvio |
| `logs/server.jsonl` | il log del server, una riga JSON per evento |
| `logs/build.out` | la compilazione delle pagine web |
| `logs/voce.out`, `logs/voce.jsonl` | il servizio voce locale (Qwen) |
| `logs/turni.jsonl` | i tempi di ogni turno |
| `logs/costi.jsonl` | il costo di ogni chiamata (narratore e voce) |
| `logs/narrazioni.jsonl` | che cosa ha scritto il narratore, turno per turno, e gli interventi del sorvegliante |
| `logs/master.jsonl` | i comandi dati dal pannello del master |
| `logs/sessioni.sqlite` | l'archivio delle sessioni: da qui il gioco riprende dopo un riavvio |
| `logs/prepara-<id>.log` | ogni giro di `scripts/prepara.sh` per quella campagna |
| `logs/tra-sessioni-<id>.log` | ogni giro di `scripts/tra-sessioni.sh` |
| `logs/porta-<porta>/` | gli stessi file per un'istanza di prova su un'altra porta |

Per cercare un messaggio, usa `grep`. Per esempio:

```
grep "voce fish" logs/server.out | tail -n 20
```

Mostra le ultime venti righe del server che parlano della voce drama-3.

---

## Il Mac è a batteria mentre fai le immagini

**Sintomo.** `scripts/prepara.sh` dice «ATTENZIONE: il Mac è a batteria» e non genera le immagini. Oppure la
generazione si ferma con «Mac a batteria al N%: collega l'alimentatore prima di generare immagini.», o con
«mflux (codice 0) non ha scritto <file>».

**Causa probabile.** Le immagini usano la GPU a pieno carico per 15–40 minuti. Per questo:

- `prepara.sh` non genera a batteria, se non glielo chiedi;
- il generatore si rifiuta di partire a batteria sotto il 20%;
- mflux si ferma da solo quando la carica scende al 20%, ed esce senza scrivere l'immagine
  (`strumenti/immagini/motore.py`).

**Cosa fare.**

1. Collega l'alimentatore.
2. Rilancia `scripts/prepara.sh campagne/<id>`: riparte da dove era.
3. Solo se non puoi fare altrimenti, aggiungi `--anche-a-batteria`. È sconsigliato.
4. Non chiudere il coperchio mentre genera (lo chiede `prepara.sh`, che intanto tiene sveglio il Mac con `caffeinate`).

**Dove guardare.** `logs/prepara-<id>.log`.

## Il Mac è lento o si blocca durante le immagini

**Sintomo.** Il Mac diventa lentissimo, oppure nel log compare «errore transitorio della GPU (Metal «Impacting
Interactivity»)», oppure «solo N GB liberi su disco (minimo 8.0 GB)».

**Causa probabile.**

- La GPU è occupata dalle immagini: il resto del Mac aspetta.
- macOS ferma un calcolo che tiene la GPU troppo a lungo mentre lo schermo ne ha bisogno. Il generatore riprova
  da solo una volta.
- Il disco è quasi pieno: il sistema usa il disco per la memoria in più, e sotto 8 GB liberi il generatore non parte.

**Cosa fare.**

1. **Non generare immagini mentre giochi**: la GPU rallenta il Mac, e con lui la serata. Se vuoi solo l'audio, usa
   `scripts/prepara.sh campagne/<id> --senza-immagini`.
2. Chiudi le app pesanti mentre generi.
3. Se il disco è pieno, libera spazio e rilancia.
4. Per andare più veloce, puoi generare luoghi più piccoli con `--dim-luogo 1280x720` (vedi
   [creare una campagna](creare-una-campagna.md)).

**Dove guardare.** `logs/prepara-<id>.log`.

## Batteria e calore con la voce locale (Qwen)

**Sintomo.** Con `--voce qwen` la voce rallenta, si interrompe, o resta indietro rispetto al testo.

**Causa probabile.** La voce locale gira sul Mac, e il suo margine sul tempo reale è sottile: con la macchina carica
(altre app, browser, Docker) la sintesi diventa più lenta del parlato (`services/voce/README.md`, «Problemi aperti»).
Che cosa succeda a batteria o con il Mac caldo **non è scritto nel repository: da verificare**.

**Cosa fare.**

1. Gioca con l'alimentatore collegato.
2. Chiudi le altre app pesanti, e non generare immagini nello stesso momento.
3. Se la voce locale non regge, usa la voce predefinita, drama-3, che non usa la GPU del Mac:
   `scripts/partita.sh <campagna>` (vedi [voce e costi](voce-e-costi.md)).

**Dove guardare.** `logs/voce.jsonl`: ogni frase ha `rtf` (tempo di generazione diviso per la durata dell'audio).
Sopra 1 la voce è più lenta del parlato.

---

## I telefoni non si collegano

**Sintomo.** Il telefono non apre la pagina, o la pagina resta in attesa del collegamento.

**Causa probabile.** Quasi sempre è la rete, non il server:

- il telefono non è sulla stessa rete Wi-Fi del Mac;
- è la rete per gli ospiti, che impedisce ai dispositivi di vedersi tra loro;
- c'è una VPN attiva sul Mac o sul telefono;
- il firewall del Mac blocca le connessioni in entrata;
- l'indirizzo nel QR è sbagliato (il Mac ha più reti attive).

**Cosa fare.**

1. Usa l'indirizzo che `scripts/partita.sh` stampa alla fine, alla voce **TELEFONI**. Ha la forma
   `http://<indirizzo del Mac>:4610/telefono`. Lo stesso indirizzo è nel QR sul proiettore.
2. Metti Mac e telefoni sulla stessa rete Wi-Fi, quella principale.
3. Spegni le VPN, sul Mac e sui telefoni, per la serata.
4. Se l'indirizzo nel QR non è quello giusto, puoi fissarlo tu prima di avviare:

   ```
   CANTASTORIE_IP=<indirizzo del Mac> scripts/partita.sh <campagna>
   ```

   Avvia la partita con quell'indirizzo nel QR e nella riga TELEFONI.
5. Segui i controlli passo passo della [guida ai telefoni](../guida-telefoni.md): firewall, rete ospiti, VPN e la
   prova dal Mac.

**Dove guardare.** `logs/partita.out` (gli indirizzi stampati) e `logs/server.out`, dove il server scrive a ogni
avvio la riga «Cantastorie: in ascolto» con l'indirizzo dei telefoni.

## Il gioco sembra fermo

**Sintomo.** Nessuno parla, la finestra delle azioni non si chiude, i telefoni non cambiano.

**Causa probabile.** Una di queste, dalla più comune:

1. **Si aspetta qualcuno.** Al ritmo calmo non c'è nessuna scadenza: il turno parte solo quando tutti i PG invitati
   hanno inviato la loro azione. Il proiettore, i telefoni e il pannello dicono chi manca: «Aspettiamo: …».
   Un telefono scollegato non si aspetta.
2. **Nessun telefono è collegato.** Il gioco aspetta il tavolo.
3. **Il master ha messo la pausa.** La pausa la mette e la toglie solo il master. Se l'ha chiesta mentre il
   narratore parlava, il pulsante dice «Pausa chiesta», e la pausa parte quando la narrazione finisce. Anche
   «Ferma la narrazione» lascia il tavolo in pausa.
4. **La scena è finita.** Quando il Motore chiude la scena con il finale, il tavolo non va in pausa: la finestra si
   riapre e il master riceve un avviso per scegliere come andare avanti.
5. **Il narratore o la voce si sono bloccati.** Se per 60 secondi non arriva nessun segno di vita, il
   **sorvegliante** registra la causa, ferma narratore e voce e riapre la finestra per tutti.
6. **Il proiettore non ha ancora premuto «Inizia sessione».** La sessione parte, o riprende, solo da lì.

**Cosa fare.**

1. Leggi la riga «Aspettiamo: …». Chi non vuole fare niente scrive «Aspetto» e invia.
2. Se qualcuno non risponde, il master preme **Risolvi ora** nel pannello: il turno parte con le azioni che ci sono.
3. Se il pannello mostra **Riprendi**, il tavolo è in pausa: premilo. In pausa i telefoni possono scrivere, e le
   azioni entrano alla ripresa. «Risolvi ora» in pausa non funziona: il pannello chiede di riprendere prima.
4. Se la scena è finita, scegli dal pannello come andare avanti (vedi [il pannello del master](il-pannello-del-master.md)).
5. Se il proiettore mostra ancora la schermata iniziale, clicca **Inizia sessione**.

**Dove guardare.**

- `logs/server.out`: righe che cominciano con «finestra:» (per esempio «finestra: sospesa dal master», «finestra:
  ripresa dal master», «finestra: nessun invitato collegato, si aspetta il tavolo»);
- `logs/server.out`: «sorvegliante: nessun segno di vita, si interviene»;
- `logs/narrazioni.jsonl`: le righe di tipo `sorvegliante`, con la causa;
- `logs/master.jsonl`: i comandi del master (pausa, ripresa, Risolvi ora).

---

## La voce non suona

Prima di tutto: **che cosa non suona?** Il proiettore, un telefono, o solo alcune frasi?

### Il proiettore è muto

**Sintomo.** Sul proiettore compare il testo, ma non si sente niente: né voce né musica.

**Causa probabile.**

- Non hai cliccato **Inizia sessione**: il browser non suona niente senza un gesto.
- Un bus audio è a zero o muto. Il proiettore ha un pannello dei volumi (tasto **A**): volume e muto per voce,
  musica, ambienti, temi ed effetti. Il browser li ricorda: un muto messo una volta resta.
- La cassa non è collegata al Mac, o il volume del Mac è a zero.

**Cosa fare.** Clicca «Inizia sessione»; premi **A** sul proiettore e controlla volumi e muti; controlla cassa e
volume del Mac.

### drama-3 non parla: chiave o credito

**Sintomo.** Il testo compare sul proiettore e resta lì per il tempo della lettura, ma la voce non arriva. Il turno
va avanti lo stesso.

**Causa probabile.** La voce predefinita è drama-3 via OpenRouter. Se la richiesta fallisce, il server riprova una
volta; poi passa alla riserva Qwen, se c'è; altrimenti la frase resta testo. Le cause più comuni:

- **manca la chiave** `OPENROUTER_API_KEY`. Il server la cerca nell'ambiente, poi nel file `.env` alla radice, poi
  nel file di ripiego (`CANTASTORIE_CHIAVE_OPENROUTER`);
- **il credito è finito**: OpenRouter risponde 402. Un 401 o un 403 di solito vuol dire chiave sbagliata.
  Questi errori non si ritentano;
- **la rete non va**, o OpenRouter non manda audio entro 6 secondi (`CANTASTORIE_FISH_PRIMO_MS`).

**Cosa fare.**

1. Controlla che la chiave ci sia (vedi [installazione](installazione.md)). Non incollarla mai in chat, nei log o
   nei commit.
2. Controlla e ricarica il credito su OpenRouter (vedi [voce e costi](voce-e-costi.md)).
3. Per avere una **riserva** durante la serata, accendi la voce locale prima della partita:

   ```
   scripts/voce-avvio.sh
   scripts/partita.sh <campagna>
   ```

   La prima riga avvia la voce Qwen sul Mac e aspetta che sia pronta; la seconda avvia la partita con drama-3,
   che usa Qwen solo per le frasi che non riesce a dire. `partita.sh` lo conferma: «riserva: la voce locale, già
   pronta». La riserva vale solo per la partita vera, sulla porta 4610: le istanze di prova non usano mai Qwen.
4. Se drama-3 non va per tutta la serata, gioca con la voce locale: `scripts/partita.sh <campagna> --voce qwen`.

**Dove guardare.** In `logs/server.out`:

- «voce fish: richiesta fallita», con lo `stato` (402, 401, …) e se è passato alla riserva;
- «OPENROUTER_API_KEY non trovata», se la chiave manca del tutto;
- «voce: frase senza voce, resta il testo».

Per sapere quale voce sta usando la partita, guarda la riga in alto che stampa `partita.sh`: «voce: drama-3
(OpenRouter)», «Qwen locale» o «finta».

### La voce locale (Qwen) non parte

**Sintomo.** `partita.sh --voce qwen` dice «La voce locale non è partita (vedi logs/voce.out)», oppure
`voce-avvio.sh` dice «manca il venv del servizio voce» o «non pronto dopo 300 s».

**Causa probabile.**

- l'ambiente Python del servizio voce non c'è (`services/voce/.venv`);
- il modello non è già sul disco: il servizio parte senza rete (`HF_HUB_OFFLINE=1`) e non scarica nulla
  (`services/voce/README.md`);
- il Mac è troppo carico: la prima volta il caricamento può volerci qualche minuto.

**Cosa fare.** Segui i comandi che `voce-avvio.sh` stampa per creare l'ambiente, e il passo 5 di
[installazione](installazione.md) (la voce locale Qwen, con il modello da mettere nella cache). Intanto puoi giocare
con drama-3: `scripts/partita.sh <campagna>`.

**Dove guardare.** `logs/voce.out` (leggibile) e `logs/voce.jsonl` (eventi `avvio`, `pronto`, `errore_avvio`).

### Un telefono non sente la voce

**Sintomo.** Il proiettore parla, il telefono no. Oppure il risultato di un'azione privata compare sul telefono solo
come testo.

**Causa probabile.** Il telefono non suona finché non lo tocchi: lo chiede il browser. In più, la voce di un esito
**privato** va solo ai telefoni di quel PG con **Ascolta qui** acceso, mai al proiettore. Se nessuno lo ha acceso,
quella frase non si sintetizza: resta solo il testo sul telefono.

**Cosa fare.**

1. Nell'intestazione del telefono tocca il tondo con l'altoparlante, **Ascolta qui**. Spento ha l'altoparlante
   barrato; acceso è color candela.
2. Se ricarichi la pagina, il telefono si ricorda di «Ascolta qui», ma ricomincia a suonare solo al primo tocco
   sullo schermo.
3. Per i segreti, meglio le cuffie: chi ascolta dal telefono fa sentire la frase ai vicini.

**Dove guardare.** `logs/server.out`: «voce: frase privata senza ascolto, solo testo al telefono».

---

## La partita non parte

| Che cosa dice `partita.sh` | Causa probabile | Cosa fare | Dove guardare |
|---|---|---|---|
| «La campagna ha errori: la partita non parte.» | il validatore ha trovato errori | correggili (vedi [creare una campagna](creare-una-campagna.md), «Come leggere i messaggi») | le righe `ERRORE` sopra il messaggio |
| «La campagna … non ha un repertorio …: usa --modo A.» | la campagna non ha `repertorio/`, e il modo B lo vuole | `scripts/partita.sh <campagna> --modo A` | — |
| «Non so quale sessione giocare (vedi sopra).» | campagna a più sessioni: il server non trova un pacchetto giocabile | leggi il motivo stampato sopra; vedi [campagne a più sessioni](campagne-a-piu-sessioni.md) | l'uscita di `partita.sh` |
| «Il server non è partito. Ultime righe: …» | il server si è fermato all'avvio | leggi le ultime righe | `logs/partita.out`, `logs/server.out` |
| «web: compilazione fallita» | le pagine web non si compilano | leggi l'errore | `logs/build.out` |

## Il narratore non risponde

**Sintomo.** Dopo un turno il narratore non dice niente, e resta solo una riga di riserva sullo schermo.

**Causa probabile.** Manca la chiave `ANTHROPIC_API_KEY`, il credito è finito, o la rete non va. Un errore nel flusso
della narrazione fa ripartire subito il gioco; un'attesa senza segni di vita lo fa ripartire dopo 60 secondi.

**Cosa fare.** Controlla la chiave (vedi [installazione](installazione.md)) e il credito (vedi
[voce e costi](voce-e-costi.md)). Le azioni del turno che il narratore non ha raccontato tornano ai giocatori.

**Dove guardare.** `logs/server.out`: un messaggio con «ANTHROPIC_API_KEY non trovata» se la chiave manca;
`logs/narrazioni.jsonl` per le righe del sorvegliante.

## `prepara.sh` si ferma

| Messaggio | Causa probabile | Cosa fare |
|---|---|---|
| «La campagna ha errori: niente immagini né audio.» | il validatore rigoroso ha trovato errori | correggili e rilancia |
| «manca l'ambiente delle immagini (strumenti/immagini/.venv …)» | l'ambiente Python delle immagini non c'è | crealo (vedi [creare una campagna](creare-una-campagna.md), «Le immagini») |
| «manca l'ambiente dell'audio: lancia una volta strumenti/audio/setup.sh.» | l'ambiente dell'audio non c'è | lancia `strumenti/audio/setup.sh` |
| «manca ffmpeg» (da `setup.sh`) | ffmpeg non è installato | installalo (vedi [installazione](installazione.md)) |
| «immagini: la generazione si è fermata …» | batteria, disco, GPU (vedi sopra) | rilancia: riparte da dove era |
| «Non ancora pronta da giocare. Manca: …» | mancano immagini o audio obbligatori | leggi l'elenco; le immagini «da controllare a mano» le guardi tu |

Codice d'uscita di `prepara.sh`: `0` pronta; `1` errori nella campagna; `2` argomenti sbagliati; `3` un passo è fallito
o saltato. Il log completo è in `logs/prepara-<id>.log`.
