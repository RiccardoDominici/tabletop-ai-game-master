# Repertorio: battute scritte prima, scelte al momento

Proposta di Riccardo (2 novembre 2026): i dialoghi e i momenti importanti li scrive **prima** un modello forte;
durante il gioco il modello veloce **sceglie** quale battuta far partire; improvvisa solo ciò che non è previsto.

È l'idea dei *beat* di Façade e degli *storylet* (narrativa a qualità): pezzi scritti a mano, ciascuno con
**condizioni** per poter uscire ed **effetti** sullo stato. Qui il «gestore» che li sceglie è Haiku, e Haiku
riempie i vuoti con brevi frasi improvvisate.

## Perché conviene (tre guadagni in uno)

1. **Qualità.** Le battute che contano (bugie, confessioni, indizi, segni della minaccia, momenti chiave) le scrive
   Opus con calma, rispettando il manuale; si possono rileggere e correggere prima della sessione.
2. **Latenza.** Il testo è noto prima: l'audio si **genera prima** con la voce clonata del PNG. In gioco parte subito,
   senza aspettare la sintesi e senza il rischio del margine sottile di Qwen (RTF 0,9–1,0).
3. **Segreti.** Le battute che toccano un segreto sono già scritte: il modello veloce non ha più bisogno di conoscere
   il segreto. Vede solo l'id e una descrizione senza segreti («Ottavia cede sulla segale»). Non può rivelare ciò che
   non sa (E2 portato all'estremo).

Il prezzo: la copertura. Se i giocatori fanno qualcosa di non previsto, si improvvisa (come oggi). In seguito il
Regista in sottofondo scriverà nuove battute per gli argomenti che emergono (lo «studio» di fondo), così la
copertura cresce durante la sessione.

## File: `campagne/<id>/repertorio/*.yaml`

Un file per PNG (`png_<nome>.yaml`) più `narrazione.yaml` (indizi, segni degli orologi, momenti, transizioni).

```yaml
battute:
  - id: ott_segale_domanda          # unico nella campagna, minuscolo ascii
    chi: png_ottavia                  # oppure narratore
    tipo: menzogna                    # menzogna | verita | confessione | reazione | rifiuto | richiesta |
                                      # saluto | indizio | segno_orologio | momento | transizione | finale
    quando: "un PG chiede da dove viene la segale"   # ≤ 15 parole, SENZA segreti: è ciò che vede il selettore
    temi: [segale, mugnaio, pane]     # parole chiave per il prefiltro del Motore
    richiede:                         # condizioni verificate dal Motore, tutte vere (campi facoltativi)
      indizi_rivelati: []             # id di indizi già rivelati
      indizi_non_rivelati: []
      battute_usate: []               # id di battute già uscite
      battute_non_usate: []
      orologio: {id: o_colpevole, min: 0, max: 3}   # segni già mostrati, estremi inclusi
      privata: true                   # risponde solo a un'azione segnata privata dal telefono
      da_pg: [pg_assenzio]            # risponde solo alle azioni di questi PG
      oppure: []                      # alternative: base E almeno una (vedi «Dalla prova cieca di ponte-lanterne»)
    testo:                            # righe nel protocollo del narratore, in ordine
      - "[narratore] Ottavia si sistema il fazzoletto rosso."
      - "[png_ottavia] La segale è di Gualtiero, come ogni anno. Buona."
    varianti:                         # 0–2 altre versioni dello stesso contenuto, per non ripetersi
      - ["[narratore] …", "[png_ottavia] …"]
    effetti:                          # applicati dal Motore quando la battuta esce
      rivela_indizi: []
      menzogna_detta: ott_segale      # registra la menzogna (versione fissa, segnale mostrato)
      fatti_noti: []                  # fatti del canone che ora i PG conoscono
      avanza_orologio: null           # id dell'orologio se è un segno
    max_usi: 1                        # le varianti contano come usi della stessa battuta
```

Regole per chi scrive le battute:
- testo con le regole del manuale §5 e §6 (frasi brevi, voce del PNG, segnale quando mente, niente PG decisi);
- **niente nomi di PG** nelle battute: rivolgersi al gruppo con il voi o al singolo senza nome; il nome e l'invito
  li aggiunge l'improvvisazione;
- ogni PNG parla solo di ciò che sta nel suo `sa`, come oggi;
- copertura minima: ogni indizio ha la sua battuta di rivelazione (una per ogni modo in `come_si_trova`), ogni
  menzogna la sua versione con segnale, ogni `cede_se` la sua confessione, ogni segno di orologio la sua battuta,
  ogni finale la sua chiusura; per ogni PNG reazioni a domanda gentile, accusa, minaccia, offerta, aiuto, saluto e
  un rifiuto educato per gli argomenti fuori dal suo `sa`.

## Protocollo del selettore (Haiku)

Righe come oggi, più una nuova:

```
[usa] <id_battuta>          la battuta pre-scritta esce qui, in quest'ordine (non si riscrive)
[narratore] …               raccordo improvvisato, breve (esito minore, nome del PG, invito)
[png_<nome>] …              solo se nessuna battuta va bene; il Motore lo conta come improvvisazione
[invito] pg_…               come oggi, sempre ultima
```

- Il Motore mette nel contesto di ogni turno l'**elenco delle battute disponibili** (condizioni vere, usi rimasti):
  `id · chi · tipo · quando`. Mai il testo delle battute non ancora uscite. Il tipo è **neutro**: `menzogna`,
  `verita` e `confessione` diventano `risposta` (direbbero al selettore chi mente); il tipo vero resta nei log e nel
  pannello del master.
- `[usa]` con un id non disponibile: scartato e registrato.
- **Più scene**: una battuta con `scena: <id>` entra in catalogo solo in quella scena; senza `scena` vale ovunque.
- **Modi degli indizi**: le battute di rivelazione di un indizio con `modi` ≥ 2 sono strade alternative. Trovato per una
  strada, le altre (solo rivelazione, fatti già noti) escono dal catalogo. All'avvio il Motore avvisa se un indizio ha
  meno battute di rivelazione dei suoi modi.
- **Menzogne già dette**: `effetti.menzogna_detta` è l'id di una `mente_su` del PNG. Dopo che è uscita, il messaggio del
  turno porta «Menzogne già dette» con la versione (già pubblica), così il PNG che improvvisa non si contraddice; la
  verità non entra mai.
- **Cancelli sull'azione** (`richiede.privata`, `richiede.da_pg`): il Motore mette in catalogo una battuta solo se nel
  turno c'è un'azione a cui può rispondere (privata per `privata: true`, dei PG elencati per `da_pg`), e accetta
  `[usa] <id> > <pg>` solo verso quell'azione. Le battute senza cancello rispondono solo alle azioni pubbliche:
  un'azione privata non riceve battute qualsiasi.
- Gli effetti li applica il Motore; non serve più la riga `[orologio]` per i segni scritti nel repertorio.
- Nella trascrizione pubblica entra il testo della battuta uscita (ormai è pubblico).
- **Contesto del selettore**: in modalità repertorio i segreti escono dal contesto di Haiku (verità delle menzogne,
  `segreto`, fatti del canone con `noto_ai_pg: false` non ancora rivelati). Restano il pubblico, il carattere dei PNG,
  e il loro `sa` pubblico.

## Dalla prova cieca di ponte-lanterne (applicate dal Motore)

Erano proposte del validatore e della skill del Preparatore; il server le applica dal 2 novembre sera.

- **`richiede.oppure: [{…}, {…}]`**: la battuta è disponibile se valgono le condizioni di base **e**
  almeno una delle alternative. Ogni alternativa è un blocco con le stesse chiavi di `richiede` (niente
  `oppure` annidati, almeno due blocchi). Per i cancelli sull'azione vale l'alternativa aperta: `{privata: true}`
  oppure `{indizi_rivelati: [i_x]}` vuol dire «un'azione privata, o un'azione pubblica dopo l'indizio».
  Le liste di base e alternativa si sommano; `da_pg` è l'intersezione se entrambe lo dicono. Il caricatore
  rifiuta ogni chiave di `richiede` che non conosce: ignorata, aprirebbe il cancello.
- **`orologi[].parte_dopo: [<id battuta o indizio>]`**: l'orologio comincia a correre quando esce una di
  quelle battute o si rivela uno di quegli indizi. Prima non avanza, non conta per `segno_almeno_ogni` (il
  ritmo conta dalla partenza), i suoi segni non entrano nel catalogo e il narratore lo vede fermo. In
  modalità A le battute non hanno id: lo fa partire il master col +1 del pannello.
- **PNG presenti**: in catalogo entrano solo battute in cui parla chi è in scena: `chi` e ogni `[png_…]`
  delle righe e delle varianti devono essere tra i `png_presenti` della scena in corso (il narratore sempre).
  `scena` accetta anche una lista (`scena: [scena_ponte_imbrunire, scena_terzo_tocco]`). La misura dei
  copioni del validatore segue le stesse regole.

## Versione 2 (dopo l'esperimento A/B n. 1)

Il giudizio cieco (`esperimenti/giudizio-ab-1/conclusioni.md`) ha mostrato che il selettore riempie i turni con
battute *disponibili* invece di rispondere alle azioni. Cambia così:

- **Legame con l'azione**: `[usa] <id> > <pg_id>` dice a quale azione risponde la battuta. Una battuta senza `> pg`
  è ammessa solo se è un segno d'orologio dovuto o una mossa contro lo stallo. Il Motore rifiuta l'uscita se
  un'azione dichiarata resta senza risposta (né battuta né riga improvvisata rivolta a quel PG).
- **Solo ciò che conta esce pre-scritto**: bugie, confessioni, indizi, segni d'orologio, momenti, finali. Le reazioni
  generiche hanno `solo_esempio: true`: non entrano nel catalogo, ma vanno nel contesto come **esempi della voce** del PNG
  per l'improvvisazione.
- **Catalogo pertinente**: il Motore mostra le battute i cui `temi` o PNG compaiono nelle azioni del turno, più il
  segno d'orologio dovuto; le battute `riempitivo: true` (il cane, la borsa…) solo quando scatta lo stallo.
- **Anti-ripetizione**: una battuta e le sue varianti non tornano entro 3 turni.
- **Orologio**: anche in modalità B il Motore scrive «mostralo in questa risposta» quando il segno è dovuto.
- **Elencate per stato, non per temi**: finali, battute della folla e chiusura escono in base allo stato dell'orologio
  (a orologio completo), perché non hanno parole dei giocatori nei `temi`.
- **Alias dei PNG** per la pertinenza: nano → Baldrin; ostessa/oste → Ottavia; forestiero/prigioniero/«quello là
  dentro» → Sebastiano. Il Motore li legge dal campo `alias` della scheda PNG (nessun elenco nel codice).
- **Valutazione onesta**: i `temi` della v2 sono stati tarati sui copioni del primo esperimento; il confronto B2 si
  fa su copioni nuovi scritti alla cieca (`esperimenti/copioni/prova2/`).

## Audio pre-generato

- Uno script genera l'audio di ogni riga di ogni battuta (e variante) con il servizio voce, e lo salva in
  `cache/audio/<hash di voce+testo>.pcm` (fuori da git, si rigenera).
- In gioco la riga pre-generata entra nella stessa coda delle frasi improvvisate, nello stesso ordine, ma è pronta subito.

## Esperimento: A (solo improvvisazione, oggi) contro B (repertorio)

- **Copioni fissi** di azioni dei giocatori, scritti da un agente che vede solo ciò che vedono i giocatori
  (`situazione_comune`, apertura, schede dei PG) e non il repertorio: uno «indagine», uno «pressione», ciascuno
  di circa 8 turni con 3 PG, con 2–3 azioni fuori dal previsto per mettere alla prova l'improvvisazione.
- Stessa scena, stesso Haiku, stessa voce, copioni uguali per A e B.
- **Misure**: latenza (primo audio dalla chiusura della finestra, mediana e peggiore), costo, quota di righe
  pre-scritte e improvvisate.
- **Giudizio cieco**: un agente Opus riceve le trascrizioni etichettate X/Y a caso e le valuta con la rubrica
  R1–R12 del manuale, contando anche fughe di segreti, decisioni prese al posto dei PG, fatti inventati, PG in
  terza persona fuori dall'annuncio della loro azione (N15), battute nella voce sbagliata.
- Campioni audio delle due versioni da ascoltare.
