# Campagne a più sessioni

Cosa trovi qui: come una campagna dura più serate. Il modello a strati, come si chiude una sessione, come si apre la successiva e che cosa si fa tra le due.
Leggi prima: [creare una campagna](creare-una-campagna.md) e [il pannello del master](il-pannello-del-master.md).

## A che punto siamo

Questa parte del framework è nata dopo la one-shot, ed è pronta solo in parte. Prima di cominciare, sappi che cosa
c'è oggi (fonte: [docs/strati.md](../strati.md), «Fasi di lavoro», e `strumenti/strati.py`).

| Pezzo | Oggi |
|---|---|
| Il server gioca un pacchetto di sessione (`sessioni/<nn>/`), con «Fine sessione», «Prossima sessione» e il registro | **pronto** (fase D2) |
| `scripts/partita.sh --sessione N` e `scripts/registro.sh` | **pronti** |
| Il validatore controlla un pacchetto (`--sessione N`) e le classi `STATO`, `CONTINUITÀ`, `ARCO` | **pronto** |
| `scripts/tra-sessioni.sh` (le parti automatiche del lavoro tra le sessioni) | **pronto**; la procedura per l'agente è una bozza (fase D3) |
| Il Preparatore scrive un arco, una campagna o una saga | **non ancora**: il validatore, in modo normale, rifiuta ogni livello sopra la one-shot (`LIVELLO.non_supportato`) |
| `scripts/prepara.sh` su un pacchetto di sessione | **non ancora**: lavora solo sulla campagna intera |
| Una prova vera di un arco di tre sessioni | **non ancora** (fase D4) |

In pratica: oggi si prepara e si gioca bene la **one-shot**. Le campagne a più sessioni si possono già giocare
in prova, ma la preparazione completa arriva con le fasi D3 e D4.

## Il modello: gli strati

Un solo framework, con strati che si accendono. Il **numero di sessioni** che scrivi nel brief (`sessioni`)
decide il **livello**, e il livello decide che cosa si prepara prima e che cosa tra una sessione e l'altra.

| Sessioni | Livello | Si prepara prima | Si prepara tra le sessioni |
|---|---|---|---|
| 1 | one-shot | la sessione intera | niente |
| 2–6 | arco | la sessione 1 completa; il fronte d'arco con le sue tappe; 2–3 atti; i finali possibili; i PNG ricorrenti; le altre sessioni in una riga | il registro, lo stato, la sessione dopo completa |
| 7–20 | campagna | in più: regioni, fazioni con orologio, tre conflitti, la fine dichiarata; il primo arco completo | in più: il turno delle fazioni, l'arco successivo |
| 21+ o `aperta` | saga | in più il mondo: una zona piena, le altre abbozzo, le fasi di gioco | in più il dettaglio di una zona quando i PG ci arrivano |

Per vedere la tabella con tutte le misure:

```
python3 strumenti/strati.py --tabella
```

Stampa i quattro livelli con che cosa si prepara prima, tra le sessioni, e le misure attese.

I principi, in breve:

1. **Ciò che è lontano resta un abbozzo.** Diventa dettaglio solo quando si avvicina. Si scrive lo scheletro, poi
   una sessione alla volta.
2. **Dal vivo il narratore vede solo la sessione di stasera**, mai tutta la campagna.
3. **Il registro non lo scrive un modello.** I fatti di gioco si estraggono in modo automatico dall'archivio
   delle sessioni (`sessioni.sqlite`). Il modello forte li interpreta, ma ogni fatto nuovo cita il turno da cui
   viene, e il validatore lo controlla.
4. **Il canone preparato non si tocca; il gioco aggiunge.** I fatti preparati (`f_…`) restano come sono. I fatti di
   gioco (`g_…`) stanno in `stato/stato.yaml` e, se cambiano un fatto preparato, lo dichiarano (`supera`).
5. **Ciò che i PG hanno scoperto smette di essere segreto.** Ogni sessione ha le sue parole segrete.

## Come è fatta la cartella

Una one-shot resta com'è. Con più sessioni si aggiungono queste parti:

```
campagne/<id>/
  brief.yaml  stile.yaml  campagna.yaml   # il livello di campagna; l'arco sta in campagna.yaml → preparazione.arco
  png/                                    # i PNG ricorrenti
  pg.yaml                                 # i personaggi, che durano da una sessione all'altra
  stato/stato.yaml                        # che cosa è successo davvero: cresce dopo ogni sessione
  sessioni/01/                            # il pacchetto della sessione 1
    sessione.yaml                         # titolo, riassunto iniziale, scene in ordine, segni già pieni
    scene/  png/  repertorio/  immagini/  audio/
    registro.yaml  trascrizione.yaml      # li scrive il server a fine sessione
  sessioni/02/
    …
```

- Il nome del pacchetto è fatto di sole cifre, due per l'ordine: `01`, `02`…
- Una campagna con `sessioni/` non usa `scena.yaml` e `scene/` della radice.
- Il server unisce `campagna.yaml` e il `sessione.yaml` del pacchetto con regole fisse (le trovi in
  [docs/strati.md](../strati.md), «Regole di unione»). Per esempio, le battute vengono solo dal pacchetto, e una
  scheda di PNG nel pacchetto sostituisce per intero quella della campagna, per quella sessione.

## Quale sessione si gioca

Lo decide il server, in quest'ordine:

1. quella che chiedi tu con `--sessione N`;
2. la sessione in corso, se ce n'è una da riprendere;
3. il pacchetto dopo l'ultima sessione chiusa con «Fine sessione» (se quel pacchetto è preparato a metà e non si
   carica, resta su quella finita, e il pannello lo dice);
4. l'ultima giocata;
5. la prima.

`scripts/partita.sh` chiede la stessa scelta al server e valida proprio quel pacchetto.

## Giocare una sessione precisa: `--sessione`

```
scripts/partita.sh <campagna> --sessione 2
```

Gioca il pacchetto `sessioni/02/`. Prima lo valida (`valida_campagna.py --sessione 2`), poi avvia il server.

Senza `--sessione` sceglie il server, come sopra. A inizio partita lo script stampa «Campagna a più sessioni: si
gioca la sessione N».

La stessa opzione c'è anche altrove:

```
python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso --sessione 2
```

Valida il pacchetto `sessioni/02/` unito alla campagna, più stato e continuità. Qui `LIVELLO.non_supportato` è solo
un avviso, perché chi valida un pacchetto lo sta già giocando in prova.

```
scripts/registro.sh <campagna> --sessione 2
```

Rifà il registro dell'ultima sessione che ha giocato `sessioni/02/` (vedi sotto).

## Chiudere una sessione: «Fine sessione»

A fine serata, dal pannello del master:

1. Apri il riquadro **Sessione**.
2. Premi **Fine sessione**.
3. Il pulsante chiede conferma («Confermi la fine della sessione?»): premi di nuovo.

Che cosa succede:

- il gioco si ferma e la sessione dell'archivio si chiude;
- il server scrive `registro.yaml` e `trascrizione.yaml` nel pacchetto giocato (`sessioni/<nn>/`). Per una one-shot
  li scrive nei log, in `logs/registri/<campagna>/<id della sessione>/`;
- il pannello mostra il percorso del registro e quanti turni ha.

Attenzione:

- **Il registro contiene le azioni private dei giocatori.** È per il master e per chi prepara, mai per i giocatori.
- **Il registro non si ritocca a mano.** Se manca o è sbagliato, si rifà dall'archivio:

  ```
  scripts/registro.sh <campagna> --sessione 2 --controlla
  ```

  Con `--controlla` non scrive niente: esce con `0` se il registro è quello che dà l'archivio, `1` se è diverso.
  Senza `--controlla` lo riscrive. `scripts/registro.sh --help` mostra tutte le opzioni.
- Dopo «Fine sessione», un nuovo «Inizia sessione» sul proiettore rigioca la stessa sessione da capo.

## Aprire la successiva: «Prossima sessione»

Il pulsante sta accanto a «Fine sessione», nel riquadro **Sessione**. Si accende solo se il pacchetto dopo
(`sessioni/<nn+1>/`) esiste e si carica. Il testo dice quale sessione apre, per esempio «Prossima: sessione 02 · Il guado».
Se è spento, passa il mouse sopra: dice perché (il pacchetto non c'è, o non si carica e perché).

1. Premi **Prossima** e conferma («Confermi? Questa sessione si chiude»).
2. Se la sessione è ancora in corso, il server fa prima «Fine sessione», con il registro.
3. Il server si ricostruisce sullo stesso indirizzo, con il pacchetto dopo e lo stesso token del master.
4. Pannello, proiettore e telefoni si ricollegano da soli, come dopo un riavvio.
5. La sessione nuova comincia dal suo `riassunto_iniziale`.

I telefoni ritrovano il PG della sessione prima. Se un giocatore deve cambiare personaggio, il master lo cambia o
lo dimentica dal pannello, in **Telefoni ricordati**; il cambio vale dal prossimo collegamento di quel telefono.

Di solito, però, tra una sessione e l'altra passano giorni: si chiude con «Fine sessione», si fa il lavoro qui
sotto, e la volta dopo si lancia di nuovo `scripts/partita.sh <campagna>`, che sceglie da solo la sessione dopo.

## Tra una sessione e l'altra: `scripts/tra-sessioni.sh`

Il lavoro tra le sessioni ha due parti:

- le parti **automatiche**, che fa `scripts/tra-sessioni.sh` (con `strumenti/tra_sessioni.py`);
- le parti **da scrivere**, che fa un agente con la skill del Preparatore (procedura in
  `.claude/skills/preparatore/riferimenti/tra-le-sessioni.md`, oggi una bozza).

Lo script ha tre tempi, e si ferma ogni volta dove tocca all'agente. Non avvia il server, non tocca le porte della
partita e non sovrascrive mai ciò che ha scritto l'agente. Il log è in `logs/tra-sessioni-<id>.log`.

### Tempo 1: che cosa è successo

```
scripts/tra-sessioni.sh campagne/<id> 1
```

Dopo la sessione 1:

1. controlla che ci sia `sessioni/01/registro.yaml`. Se manca, lo rifà dall'archivio con `scripts/registro.sh`; se
   c'è, controlla che sia uguale a ciò che dà l'archivio. Se è diverso si ferma: va rigenerato, non ritoccato;
2. stampa che cosa dice il registro: scene e turni, indizi rivelati, fatti resi noti ai PG, menzogne dette, momenti,
   orologi, PNG incontrati, azioni dei PG;
3. stampa la **mossa del mondo** che le regole fisse dell'arco danno da sole: l'orologio d'arco più
   `ritmo.per_sessione`, e le condizioni `accelera` e `rallenta` da giudicare sul registro.

Poi tocca all'agente: aggiorna `stato/stato.yaml` fino a `dopo_sessione: 1`. Ogni fatto ha la sua **fonte**:

```yaml
fatti:
  - id: g_irma_promette
    testo: "Irma ha giurato a Tobia che pagherà il tetto senza il mercante."
    fonte: {sessione: 1, turno: 6, citazione: "Ti giuro che pagherò il tetto"}   # parole esatte del turno
    noto_ai_pg: true
```

La fonte può essere anche un evento del turno (una battuta, un indizio, un segno d'orologio), oppure, per ciò che
cambia fuori scena, `{tra_sessioni: 1, motivo: "…"}`, dove il motivo nomina l'orologio, il pericolo o il fronte che
lo produce. Se una cosa non è nel registro, non è successa. La forma completa è in
`.claude/skills/preparatore/riferimenti/schema.md`, «Tra le sessioni».

### Tempo 2: lo scheletro della sessione dopo

```
scripts/tra-sessioni.sh campagne/<id> 1 --pacchetto
```

1. Controlla lo stato (validatore, classe `STATO`): con errori si ferma.
2. Scrive lo scheletro di `sessioni/02/`, senza sovrascrivere niente:
   - `sessione.yaml` con i segni già pieni degli orologi (`pieni_all_inizio`) e i fili aperti da decidere;
   - le schede intere dei PNG ricorrenti cambiati in gioco, con ciò che sanno e il loro atteggiamento presi dallo stato;
   - le parole segrete ancora in uso, senza quelle dei fatti che i PG ormai sanno.

Poi tocca all'agente: il riassunto da leggere all'apertura (tre-cinque frasi, dai fatti dello stato), le scene, il
repertorio, le parole segrete dei segreti nuovi; per ogni filo, `come: ripreso` o `rimandato`.

### Tempo 3: la verifica

```
scripts/tra-sessioni.sh campagne/<id> 1 --verifica
```

1. Controlla che il pacchetto sia scritto: riassunto, scene con la loro scheda, repertorio, fili decisi.
2. Lancia il validatore rigoroso sulla sessione 2.
3. Per immagini e audio della sessione 2, oggi stampa che `prepara.sh` non lavora ancora su un pacchetto.

Codice d'uscita dello script: `0` fatto (o fermo dove tocca all'agente); `1` c'è da correggere; `2` argomenti sbagliati.

### Che cosa controlla il validatore tra le sessioni

| Classe | Che cosa controlla |
|---|---|
| `STATO` | i registri esistono e sono intatti; ogni fatto ha una fonte che si trova nel registro, alla lettera; gli orologi a fine sessione tornano con il registro |
| `CONTINUITÀ` | la sessione dopo non contraddice lo stato: un PNG morto non torna, chi ha saputo qualcosa lo sa ancora, gli orologi ripartono dai segni giusti, promesse e fili sono ripresi o rimandati, un PG non scende di livello |
| `ARCO` | l'arco preparato prima: tappe, ritmo, atti, finali, PNG ricorrenti, fili |

## In lavorazione

Le richieste del 9 novembre ([docs/richieste-2026-11-09.md](../richieste-2026-11-09.md), §9) chiedono una chiusura
guidata della serata («Chiudi la sessione»), un «La volta scorsa…» all'apertura, un avviso quando la serata sta per
finire e un Diario sul telefono. Il progetto è in [docs/strati.md](../strati.md), «Riassunto e chiusura della
serata»: lì «Fine sessione» resta, subito e senza narrazione, per le emergenze. Il lavoro è in corso e il pulsante
non è ancora nel pannello del master: **da verificare** quando entra, perché cambierà il modo di chiudere una serata
descritto in questa pagina.

## Problemi?

Vedi [problemi comuni](problemi-comuni.md).
