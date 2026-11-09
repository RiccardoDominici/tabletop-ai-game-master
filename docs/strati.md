# Strati: la durata della campagna decide quanto si prepara (progetto, 3 novembre 2026)

Richiesta di Riccardo: nella personalizzazione della campagna si indica la durata stimata in **numero di
sessioni**; da quella dipende quanti «strati» di gioco genera il framework. Una one-shot ha poche cose; una
campagna di anni ha più fasi e un mondo completo. Ricerca: `docs/ricerca-durata.md`.

## Principi
1. **Un solo framework, strati che si accendono.** La one-shot di oggi è lo strato più interno. Le campagne
   lunghe non sono un altro programma: aggiungono strati esterni (arco, campagna, mondo) sopra lo stesso
   pacchetto di sessione che il Motore sa già giocare.
2. **Risoluzione progressiva.** Ciò che è lontano nel tempo o nello spazio è un abbozzo; diventa dettaglio
   quando si avvicina. Anni di gioco non si scrivono in anticipo: si scrive lo scheletro, poi una sessione
   alla volta.
3. **Tra una sessione e l'altra lavora il modello forte**, dal registro di ciò che è successo davvero. Dal
   vivo Haiku vede solo il pacchetto della sessione corrente, mai la bibbia o lo stato interi.
4. **Il registro non lo scrive un modello.** I fatti di gioco (indizi rivelati, battute uscite, orologi,
   scelte, PNG incontrati, azioni) si estraggono in modo deterministico dall'archivio delle sessioni
   (`sessioni.sqlite`). Il modello forte li interpreta, ma ogni fatto nuovo dello stato cita il turno da cui
   viene, e il validatore lo controlla. È la risposta al rischio principale della ricerca (log scritto male →
   sessione dopo sbagliata). I fatti nati fuori scena, quando il mondo si muove tra le sessioni, hanno una
   fonte loro: `fonte: {tra_sessioni: <n>, motivo}`, e il motivo nomina l'orologio o la regola che li produce.
5. **Il canone preparato non si tocca; il gioco aggiunge.** I fatti preparati (`f_…`, in `campagna.yaml`)
   restano come sono. I fatti di gioco (`g_…`, in `stato/stato.yaml`) si aggiungono e, quando cambiano un
   fatto preparato, lo dichiarano (`supera: [f_…]`); un fatto di gioco non si cancella, si supera con uno più
   nuovo (`superato_da`). Un PNG morto resta morto in ogni pacchetto successivo (controllo del validatore).
6. **Ciò che i PG hanno scoperto smette di essere segreto.** Ogni pacchetto porta il suo
   `repertorio/parole_segrete.yaml`, che sostituisce quello della campagna; il validatore controlla che non
   nasconda fatti già noti ai PG. Un PNG ricorrente che ha imparato qualcosa ha nel pacchetto la sua scheda
   aggiornata (`png/png_<nome>.yaml`, scheda intera con lo stesso id), che per quella sessione sostituisce
   quella della campagna; la scheda della campagna resta la versione iniziale.

## Il brief
```yaml
sessioni: 1              # numero stimato di sessioni (obbligatorio); "aperta" per una campagna senza fine
ore_per_sessione: 2.5    # facoltativo, predefinito 2.5
durata: ""               # resta come nota a parole
```
Il livello si ricava dal numero con una tabella sola nel codice (`strumenti/strati.py`), letta dal
validatore e citata dalla skill. Il brief può forzare un livello diverso (`livello:`) solo con il motivo in
`decisioni.altre`.

## Livelli e strati
| Sessioni | Livello | Strati preparati prima | Preparati tra le sessioni |
|---|---|---|---|
| 1 | **one-shot** | sessione (situazione, 1–5 scene, PNG, PG, canone, indizi, repertorio): la skill di oggi | — |
| 2–6 | **arco** | + arco: premessa, fronte d'arco con 3–6 tappe che avanzano tra le sessioni, 2–3 atti, domanda drammatica e finali possibili, PNG ricorrenti, fili aperti; sessione 1 completa, le altre come abbozzo di una riga | sessione N+1 completa |
| 7–20 | **campagna** | + campagna: 2–4 regioni, 3–5 fazioni con obiettivo e orologio, tre conflitti maggiori, fine dichiarata, crescita dei PG a tappe; archi abbozzati, solo il primo completo | stato, turno delle fazioni, arco successivo quando il corrente chiude, sessione N+1 |
| 21+ o aperta | **saga** | + mondo: storia, geografia, culture, credenze, cronologia lunga; una zona piena, le altre abbozzo; fasi (tier di gioco) | come «campagna», più il dettaglio di una zona quando i PG ci arrivano |

Le soglie sono una prima scelta (la ricerca non dà numeri); si correggono dopo le prove.

## File
Una campagna one-shot resta com'è oggi (compatibilità piena). Con più sessioni:
```
campagne/<id>/
  brief.yaml  stile.yaml  campagna.yaml      # campagna.yaml: canone, fronti di campagna, archi, regole del mondo
  mondo/      regioni.yaml fazioni.yaml storia.yaml          # solo dai livelli «campagna» e «saga»
  png/        schede dei PNG ricorrenti (le comparse di una sola sessione stanno nella sessione)
  pg.yaml     personaggi, con crescita
  stato/      stato.yaml                                     # registro canonico del gioco: cresce dopo ogni sessione
  sessioni/<nn>/                                             # il pacchetto: ciò che il Motore gioca
    sessione.yaml (titolo, riassunto_iniziale, scene in ordine, pieni_all_inizio, e la parte di sessione
                   di campagna.yaml: orologi, canone, rivelazioni, nodi, colli_di_bottiglia; preparazione)
    scene/*.yaml  png/ (PNG solo di questa sessione, o scheda aggiornata di un ricorrente)
    repertorio/ (battute e parole_segrete.yaml della sessione)  immagini/ audio/ (solo il nuovo)
    registro.yaml  trascrizione.yaml                         # scritti a fine sessione dall'archivio, deterministici
```
`<nn>` è un nome di sole cifre (due, per l'ordine: `01`, `02`…) con dentro `sessione.yaml`; le altre cartelle
in `sessioni/` non contano. Una campagna con `sessioni/` non usa `scena.yaml` e `scene/` della radice.
Le risorse che durano (ritratti dei PNG ricorrenti, luoghi che tornano, temi musicali) stanno a livello di
campagna e si riusano; ogni sessione genera solo le immagini e i suoni nuovi.
L'arco preparato prima (premessa, tappe, atti, finali, PNG ricorrenti, fili) sta in `campagna.yaml →
preparazione.arco`: contiene il futuro, e `preparazione` non arriva mai al narratore (riferimenti/arco.md).

### Regole di unione (il contratto del compilatore: apps/server/src/campagna/pacchetti.ts e caricatore.ts)
Il Motore gioca il livello di campagna PIÙ un pacchetto. Le regole, in un posto solo (il validatore le usa
attraverso `strumenti/unisci_pacchetto.ts`, che scrive la vista unita come una one-shot col codice del server:
non esiste una seconda copia):
- **campagna.yaml + sessione.yaml**: le chiavi di `sessione.yaml` si uniscono a quelle di `campagna.yaml`; le
  liste si accodano (prima la campagna) e un id ripetuto tra le due è un **errore** che nomina i due file; per
  le altre chiavi vale la sessione, con un avviso. `sessione` di campagna.yaml non vale (il riassunto sta nel
  pacchetto). Non arrivano al narratore: `riassunto_iniziale`, `scene`, `titolo`, `pieni_all_inizio`,
  `preparazione` (della campagna e della sessione: per esempio `preparazione.fili`).
- **pieni_all_inizio** `{id_orologio: n}`: i segni già pieni di un orologio della campagna all'inizio di questa
  sessione (scritti tra le sessioni dal registro e dal mondo che si muove). Un id che non c'è è un errore; un
  orologio non citato riparte dal valore di campagna.yaml.
- **Scene**: solo `scene/*.yaml` del pacchetto, nell'ordine di `sessione.yaml → scene`; la prima legge prima
  `riassunto_iniziale`. Un id elencato senza file è un errore; un file non elencato va in fondo con un avviso.
- **PNG**: png/ della campagna più png/ del pacchetto, in ordine di id; una scheda del pacchetto con l'id di un
  ricorrente lo **sostituisce intera** per quella sessione (non è il caso «id ripetuto = errore», che vale per
  le liste).
- **Repertorio**: le battute vengono **solo** dal pacchetto (quelle della sessione prima che valgono ancora le
  ricopia la preparazione). `parole_segrete.yaml` del pacchetto **sostituisce** quello della campagna (ciò che i
  PG hanno scoperto smette di essere segreto); senza file nel pacchetto vale quello della campagna.
- **Immagini e audio**: i manifest di campagna e pacchetto insieme; a parità di id vince il pacchetto (un
  ritratto invecchiato); un nome di file già usato da un'altra voce dell'altra cartella si scarta.
- **PG**: `pg.yaml` della campagna, in ogni sessione; i telefoni ritrovano il PG della sessione prima (il master
  lo cambia o lo dimentica dal pannello, «Telefoni ricordati»).

### Quale sessione si gioca
La tiene l'archivio (`sessioni.sqlite`, colonna `pacchetto` di ogni sessione giocata; apps/server/src/sessione/
scelta-pacchetto.ts). All'avvio, in ordine: `--sessione N` (`CANTASTORIE_SESSIONE`); la sessione in corso
(ripresa); il pacchetto dopo l'ultima sessione chiusa con «Fine sessione» (se è preparato a metà e non si carica,
si resta su quella finita, con l'avviso nel pannello); l'ultima giocata; la prima. `scripts/partita.sh` chiede la
stessa scelta al server e valida proprio quel pacchetto.

### Fine sessione e Prossima sessione (pannello del master)
- **Fine sessione**: il gioco si ferma, la sessione dell'archivio si chiude (`motivo_chiusura: fine sessione`) e il
  server scrive `registro.yaml` e `trascrizione.yaml` nel pacchetto giocato (una one-shot nei log:
  `logs/registri/<campagna>/<id>/`). `scripts/registro.sh <campagna> [--sessione nn] [--controlla]` rifà o
  controlla gli stessi file dall'archivio.
- **Prossima sessione**: acceso solo se `sessioni/<nn+1>/` c'è e si carica come all'avvio (campagna, repertorio,
  parole segrete); se la sessione è ancora in corso fa prima Fine sessione. Il server si ricostruisce sullo stesso
  indirizzo col pacchetto dopo e lo stesso token del master: pannello, proiettore e telefoni si ricollegano come
  dopo un riavvio, e la sessione nuova comincia dal suo `riassunto_iniziale`.

### Riassunto e chiusura della serata (richieste del 9 novembre, §9)
- **Chiudi la sessione** (pannello): chiusura guidata. Le azioni in coda tornano ai giocatori; il narratore chiude
  la serata (da tre a cinque righe: il momento in corso, un'immagine finale, un aggancio; niente misteri nuovi; in
  modalità B improvvisata, oppure una battuta `tipo: chiusura` del repertorio se c'è, detta dal Motore); poi il
  proiettore mostra «Cosa è successo stasera» (riassunto, fili aperti, PF dei PG) e il server scrive il registro
  e, accanto, `riassunto.yaml` (una voce per serata: `etichetta`, `quando`, `testo`, `fili`). La sessione
  dell'archivio resta APERTA: una one-shot riprende la sera dopo (Riprendi, o riavvio del server); in una campagna
  a pacchetti la chiude «Prossima sessione». **Fine sessione** resta, subito e senza narrazione, per le emergenze.
- **Il riassunto** (`apps/server/src/sessione/riassunto.ts`): lo scrive Haiku (lo stesso client del narratore, un
  altro prompt) dalla sola trascrizione pubblica; mai azioni private, righe `[privato]` o fatti `noto_ai_pg: false`.
  Poi una guardia deterministica: una parola di `parole_segrete.yaml` ancora segreta e mai detta al tavolo fa
  scartare il testo, e si legge la riserva (luoghi attraversati e ultimi segni degli orologi, detti a voce).
- **La volta scorsa…** (`apps/server/src/scena/serata.ts`), letta prima dell'apertura o della ripresa e mostrata dal
  proiettore fino alla prima finestra chiusa: il pacchetto dopo senza `riassunto_iniziale` usa l'ultimo
  `riassunto.yaml` del pacchetto prima (o lo fa scrivere dalla sua `trascrizione.yaml`); una serata chiusa riprende
  dal suo riassunto; una sessione lasciata aperta e ripresa dopo tre ore lo fa scrivere dalla trascrizione ripresa.
  Il modello lavora in sottofondo dall'avvio; se all'«Inizia» non ha finito, si legge la riserva.
- **Durata**: `ore_per_sessione` del brief (predefinito 2,5; il master la cambia dal pannello). A venti minuti dalla
  fine il pannello lo segnala e il messaggio del turno porta un consiglio («avvicinati a una pausa naturale»), mai
  durante un climax (scena con `climax: true`, o un orologio attivo a un segno dalla fine).
- **Diario** (telefono): i riassunti delle serate chiuse (pacchetti prima compresi) e «finora stasera» (luoghi,
  segni del tempo), pubblici; gli esiti privati restano solo sul telefono del loro PG.

### Il registro (registro.yaml, formato 1; apps/server/src/sessione/registro.ts)
Estratto dagli eventi dell'archivio senza modelli; stesso archivio → stessi byte. Contiene le azioni private: è
per il master e il Preparatore, mai per i giocatori. Sezioni, ognuna col suo turno: `archivio` (id, modo, inizio,
ultimo evento, stato e motivo di chiusura, turni), `giocatori`, `scene` (dal turno, al turno), `luoghi`,
`situazioni`, `orologi` (pieni all'inizio e alla fine, ogni segno col turno e la causa: narrazione o master, segni
tolti, partenza), `indizi`, `battute`, `menzogne`, `fatti_noti` (con la battuta che li porta), `png_incontrati`
(chi ha parlato, primo e ultimo turno), `pg` (azioni pubbliche e private separate, testo esatto ed esito),
`momenti` (i turni in cui il Motore ha registrato un cambiamento, con le righe dette e le azioni), `note_del_master`,
`avvisi`. `trascrizione.yaml` accanto: le voci pubbliche turno per turno, testo esatto. In modalità A il Motore non
tiene indizi, battute, menzogne e fatti: quelle sezioni sono `null` e un avviso lo dice.

## Il ciclo tra le sessioni
1. **Fine sessione** (pannello del master): il server scrive `sessioni/<nn>/registro.yaml` dall'archivio.
2. **Stato**: il modello forte aggiorna `stato/stato.yaml` dal registro e dalla trascrizione; ogni fatto cita
   `sessione` e `turno`; i fili aperti e le promesse dei PG restano finché non si chiudono.
3. **Il mondo si muove**: gli orologi dei fronti e delle fazioni avanzano con regole fisse (quanti segni per
   sessione, cosa li fa correre o rallentare); il modello forte scrive cosa è cambiato fuori scena.
4. **Sessione N+1**: gli stessi passi della skill di oggi, a partire da stato e arco: situazione della sessione,
   scene, PNG, repertorio, il riassunto da leggere all'apertura (dai fatti del registro, non a memoria).
5. **Validatore**: le classi di oggi sul pacchetto, più STATO (ogni fatto ha una fonte) e CONTINUITÀ (niente
   contraddice lo stato: morti, oggetti, promesse, chi sa cosa).
6. **Risorse**: `prepara.sh` sul pacchetto, solo per ciò che manca.

## Fasi di lavoro
- **D1** livello nel brief: `sessioni`, `strumenti/strati.py`, controllo nel validatore, sezione «Strati» della
  skill. Una one-shot non cambia.
- **D2** server (fatto il 3 novembre): pacchetti `sessioni/<nn>/` (una campagna senza `sessioni/` è una
  one-shot), PG che durano, «Fine sessione» che scrive il registro, «Prossima sessione», `scripts/registro.sh`,
  `strumenti/unisci_pacchetto.ts`, `partita.sh --sessione`. Prove: apps/server/test/pacchetti, cicli, registro,
  registro-cli; e2e apps/web/e2e/pacchetti.spec.ts (fixture a due sessioni `apps/server/test/fixtures/campagne/arco`).
- **D3** skill «tra le sessioni» e classi STATO e CONTINUITÀ del validatore.
- **D4** prova vera: un arco di tre sessioni generato da un brief nuovo, giocato in automatico sessione per
  sessione (i copioni ciechi vedono solo la trascrizione pubblica e il riassunto, come i giocatori), ciclo tra
  le sessioni, giudice cieco su continuità e qualità.
- **D5** livelli «campagna» e «saga»: bibbia del mondo, fazioni, archi a blocchi; prova con un mondo generato.
