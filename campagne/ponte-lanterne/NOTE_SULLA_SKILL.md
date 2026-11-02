# Note sulla skill del Preparatore (prova cieca con «Il ponte delle lanterne»)

Ogni voce: che cosa era poco chiaro, contraddittorio o mancante nella skill
(`.claude/skills/preparatore/`), e che cosa ho scelto. Le scrivo mentre lavoro, nell'ordine in cui
le incontro; in fondo, la classifica dei problemi più gravi.

## Passo 0 e brief

1. **I copioni di prova sono di prova-f0.** Il passo 13 chiede
   `--copioni esperimenti/copioni` e una media del catalogo sotto 4, ma tutti i copioni in
   `esperimenti/copioni/` parlano di Ottavia, del pane e del ripostiglio, con i PG di prova-f0. Per
   un'altra campagna la misura non vuol dire niente (catalogo quasi vuoto per costruzione).
   *Scelta*: lancio comunque il comando richiesto, e in più faccio scrivere da un subagente, alla
   cieca (vede solo ciò che vedono i giocatori), due copioni per questa campagna nella mia area di
   lavoro fuori dal repository, e misuro anche su quelli.

2. **«nadine e tabitha mai nella stessa scena» non è controllato dal validatore** (nessuna regola lo
   cerca in `strumenti/valida/`). Con quattro voci registrate e quattro PNG il vincolo decide la
   storia: le due donne non possono mai incontrarsi. *Scelta*: Rosa (nadine) resta nel Borgo Basso e,
   se viene portata di qua, sale subito in chiesa; Bice (tabitha) non va mai nel Borgo. Lo scrivo nelle
   schede e nelle descrizioni delle scene, perché nessuna macchina lo ricorderà al narratore.

3. **Il passo 1 dice «tre righe» ma elenca quattro cose** (chi vuole cosa; cosa succede se i PG non
   fanno niente; la verità; la scelta che costa), e il modello `brief.yaml` ripete «tre righe» con
   quattro voci. *Scelta*: quattro frasi, una per voce, in un solo campo.

4. **«Uno più dei giocatori» con un brief a intervallo** (3–4 giocatori). *Scelta*: cinque PG, uno più
   del massimo, così ogni sottoinsieme di tre o quattro è possibile.

## Passi 1–5

5. **Il controllo del passo 5 non si può soddisfare in quell'ordine.** Chiede zero errori `SCENA`,
   `INDIZI`, `GRAFO`, `SESSIONE`, `PROSA` dopo le schede scena, ma:
   - `png_presenti` cita PNG le cui schede si scrivono al passo 6 (`SCENA.png_presenti`);
   - `posta.per_chi` deve toccare un PG o un PNG che esiste, e i PG arrivano al passo 7 (`SCENA.posta`);
   - `esiti[].finale` cita battute che si scrivono al passo 10 (`SCENA.esiti`);
   - `sessione` (passo 8) è controllata da `SESSIONE`, e senza sessione il passo 5 fallirebbe.
   *Scelta*: ho scritto `sessione` già al passo 3, dentro `campagna.yaml`; al passo 5 ho accettato
   i soli errori `SCENA` dovuti a file non ancora scritti (16) e `PG`/`STRUTTURA` per `pg.yaml`, e
   l'ho detto nel messaggio di commit. `INDIZI`, `GRAFO`, `SESSIONE`, `PROSA` erano a zero.

6. **Un orologio per tutta la sessione non è previsto.** `mestiere.md` §5 dà la regola per una scena
   di 20–30 minuti (sei segni, `segno_almeno_ogni: 2`). Per due ore e mezza in quattro scene non dice
   niente: con 2 l'orologio si riempirebbe nella prima mezz'ora. Non dice nemmeno che i segni di un
   orologio attivo in più scene devono essere percepibili da ognuna (una frase come «la rampa bassa va
   sott'acqua» non si vede dal Borgo). *Scelta*: `o_piena` da otto segni, `segno_almeno_ogni: 6`,
   più uno a ogni cambio di scena, attivo nel ponte, nel Borgo e al terzo tocco; segni udibili da tutto
   il paese (campana, fiume, tronchi, tegole, grida dal ponte). Un orologio a parte, da sei segni con
   `segno_almeno_ogni: 2`, per la sola scena della Casa del Sale.

7. **Lo stesso luogo in due scene.** Il ponte è la prima scena e il climax. La skill non dice se due
   schede possono avere lo stesso `nodo`, né come condividere gli indizi di un luogo tra due scene (un
   indizio ha un solo `nodo`, ed è definito in una sola scheda). *Scelta*: il climax ha come nodo
   l'evento `e_terzo_tocco`, con un indizio proattivo suo (`i_ponte_fermo`); le battute degli indizi del
   ponte non hanno il campo `scena`, così restano disponibili anche a mezzanotte.

8. **Avviso delle uscite «3 indizi per nodo» su nodi che non vanno scoperti.** Il Borgo Basso, la
   Casa del Sale e la chiesa sono noti a tutti dall'inizio (canone pubblico): nessuno deve scoprirli
   con un indizio. La skill non dice se l'avviso vale anche per i nodi pubblici. *Scelta*: alzo il
   conteggio dove ha senso, e giustifico il resto in `autovalutazione.md`.

## Passi 6–9

9. **Il passo 9 chiede zero errori, ma `esiti[].finale` dipende dal passo 10.** Dopo PNG e PG restano
   solo i quattro `SCENA.esiti` (finali non ancora scritti). La skill dice «non andare avanti con errori
   aperti», ma l'unico modo di chiuderli è scrivere il repertorio. *Scelta*: vado avanti al passo 10 con
   quei quattro errori, dichiarati nel commit. In alternativa la skill potrebbe dire di aggiungere gli
   `esiti` solo al passo 10, o di scrivere i finali subito dopo le schede scena.

10. **Il tetto delle frasi dei PNG si ricava dallo `stile` solo con certi numeri.** `strumenti/valida/testo.py`
    capisce «Frasi di tre-otto parole» o le cifre, ma tra le parole conosce solo due…dieci e dodici:
    «Frasi di otto-quattordici parole» non viene letta e vale il tetto predefinito. La skill non lo dice.
    *Scelta*: ho usato solo numeri della lista (Vischi «sei-dodici»).

11. **Gli `alias` dei PNG non hanno una regola contro le parole generiche**, mentre i `temi` sì. Un
    alias come «vecchio» o «ragazza» farebbe entrare il PNG nella pertinenza di ogni azione sui vecchi
    del Ricovero. *Scelta*: ho tolto gli alias generici (vecchio, ragazza, vecchia).

## Passi 10–11

12. **La regola di prosa della «parola che il narratore non dice mai» svela la soluzione in modo B.**
    Il passo 2 chiede di scrivere in `stile.yaml → regole_prosa` la parola vietata, quella che
    svelerebbe la soluzione («il narratore non dice mai che il leone è stato calato»). Ma `stile.yaml`
    va per intero al narratore, anche al selettore del modo B che non deve conoscere i segreti: la
    regola stessa è il segreto. Lo stesso succede in prova-f0 («non chiama mai veleno il pane»).
    Il validatore non controlla `regole_prosa`. *Scelta*: tengo la regola (la skill la esige) e la
    metto in `da_togliere_dal_contesto`, con la versione neutra per il modo B.

13. **Parole segrete dentro nomi pubblici.** La gilda dei costruttori si chiamava «Pontieri dell'Onda»
    (nell'aggancio di un PG): conteneva la parola segreta. Il validatore non guarda `pg.yaml` fuori
    dalla situazione comune, quindi non lo avrebbe trovato. *Scelta*: rinominata «Pontieri della Valle».
    La skill potrebbe dire di cercare le regex segrete anche nei nomi propri, negli agganci e nelle
    descrizioni delle scene (anche la descrizione del Borgo diceva «stufa spenta»).

14. **Falsi positivi delle regex dentro parole più lunghe.** «tetto» trovava «tettoia», «sa del leone»
    trovava «Rosa del leone». La skill dice «una regex cerca il legame, non la parola comune», ma non
    ricorda i confini di parola (`\b`). *Scelta*: `\b` dove serve.

15. **I controlli del passo 10 non dicono nulla sui `max_usi` degli esempi di voce.** Il validatore
    dà errore se `max_usi` supera 1 + numero di varianti (anche per gli esempi `solo_esempio`, che il
    selettore non sceglie mai), ma né la skill né `riferimenti/repertorio.md` lo dicono; l'esempio di
    prova-f0 usa `max_usi: 3` con due varianti. *Scelta*: `max_usi: 1` sugli esempi senza varianti.

## Passi 12–13

16. **Il simulatore dei copioni non guarda `scena` né `richiede`.** `strumenti/valida/copioni.py` conta
    una battuta nel catalogo se un tema compare nell'azione, anche se la battuta è di un'altra scena o è
    chiusa da un cancello. Per una campagna a più scene il catalogo misurato è più largo di quello vero
    (le battute di Rosa entrano nelle azioni sul ponte). *Scelta*: ho misurato così com'è e ho stretto
    i temi lo stesso; il numero è un tetto prudente.

17. **Parole ambigue nei temi.** «tocco» è il rintocco della campana ma anche «io tocco»: la skill vieta
    le parole generiche, ma non avverte delle parole con due sensi, che il prefiltro per parole intere
    non distingue. *Scelta*: «rintocco» e «campana» per l'orologio, «tocco» solo per il gesto.

18. **Copioni ciechi scritti prima di un cambio di nomi.** Ho fatto scrivere i copioni prima di rinominare
    la gilda dei costruttori: i copioni dicono ancora «pontieri dell'onda». Non cambia la misura, ma la
    skill potrebbe dire di scriverli (o rigenerarli) a campagna ferma, prima del passo 13.

## Passo 14

19. **Il vocativo involontario.** L'apertura diceva «Tullio, il custode, grida che…»: a voce, un nome
    seguito da una virgola a inizio frase è il modo in cui il narratore si rivolge a un PG (A1, «Brann,
    …»). Il tavolo avrebbe sentito il narratore parlare a un personaggio di nome Tullio. La lista del
    passo 14 (pronomi ambigui, voi singolare, calchi, immagini ripetute, accordi di genere) non lo
    prevede. *Scelta*: «Dal casello il custode, Tullio, grida…». Varrebbe una riga nella lista.

20. **Battute che presuppongono un'altra battuta.** Un riempitivo diceva «Il mulo, no.», ma il mulo
    compare solo in un altro riempitivo, che può non essere uscito. La skill non avverte che una
    battuta non deve citare ciò che solo un'altra battuta facoltativa ha introdotto (se serve, va
    legata con `richiede.battute_usate`). *Scelta*: tolto il riferimento.

## Passi 15–16 (ciò che la revisione ha mostrato della skill)

21. **Il vincolo delle voci si rompe da solo, e nessuno lo controlla.** Avevo deciso al brief che Rosa
    (nadine) e Bice (tabitha) non si incontrano mai, e l'avevo scritto nelle piante. Poi ho portato Bice
    nel Borgo in quattro punti senza accorgermene: il suo `desiderio`, una soluzione di `cb_barca`, una
    battuta e il fallback del `taglio` della prima scena. Il vincolo non riguarda solo `png_presenti`: vale
    per tutto ciò che sposta un PNG (desideri, iniziative, evoluzioni, colli di bottiglia, tagli). L'ha
    trovato solo il revisore. *Proposta*: una regola del validatore sulle coppie di voci vicine, e una riga
    al passo 6 che dica di cercare ogni testo che muove un PNG fuori dalle sue scene.

22. **Il modo B perde segreti per costruzione.** Tre vie, nessuna coperta dalla skill:
    - la riga del catalogo è `id · chi · tipo · quando`, e il `tipo` dice `menzogna` o `confessione`: il
      selettore sa chi mente e su che cosa (la regola 1 parla solo di id e `quando`);
    - la regola di prosa obbligatoria del passo 2 contiene la soluzione (nota 12);
    - `da_togliere_dal_contesto` è una dichiarazione: il revisore ha compilato il contesto con il
      compilatore del server e ci ha trovato il `taglio`, la `descrizione` e un `abbozzo` con segreti. Il
      validatore cerca le regex solo in apertura, riassunto, situazione comune, letture, battute campione,
      segni e catalogo, non in piante, tagli, poste, abbozzi, agganci dei PG.
    *Scelta*: ho riscritto quei campi senza segreti. *Proposta*: estendere il controllo delle regex ai campi
    che il compilatore manda davvero, e dire nella skill di scrivere piante e tagli «da modo B».

23. **Manca un controllo sulla logica del mondo prima della revisione.** I primi quattro errori gravi del
    revisore erano conti: due viaggi ci stavano tra tre tocchi; la barca portava otto persone per gruppi di
    venti; una riga del libro era datata prima del fatto che doveva provare; la catena funzionava al
    contrario (tesa voleva dire aperto). I controlli dei passi 1, 3 e 4 non chiedono una cronologia con
    orari e capienze, né la fisica del meccanismo del climax. *Proposta*: al passo 3, «scrivi la cronologia
    della sessione con le ore, le distanze e le capienze, e ricontrolla ogni documento contro le date del
    segreto»; al passo 14, «il gesto del climax si capisce al contrario?».

24. **Il controllo della scelta finale si soddisfa alla lettera.** Il passo 1 chiede due esiti
    accettabili, ognuno con un prezzo. La mia prima versione li aveva, ma il revisore ha visto che con la
    prova in mano la risposta era ovvia (tenere aperto, e una promessa del paese cancellava il prezzo).
    *Scelta*: la terza via è diventata un azzardo con un orologio suo (`o_rampa`) e un finale di
    fallimento, e Vischi offre un patto pubblico al tocco. *Proposta*: aggiungere al controllo «e quando i
    PG hanno scoperto tutto, la scelta è ancora difficile?».

25. **`richiede` è solo «e».** Per dire «tenere aperto se i PG hanno una qualunque delle tre prove» non
    c'è un «oppure»: o si duplicano le battute con `battute_non_usate` incrociati (l'ho fatto per la reazione
    di Vischi), o si sceglie una prova sola come cancello (l'ho fatto per Tullio, sull'onda). La skill non
    lo spiega, e i finali con più cancelli diventano fragili (vedi la correzione del patto rifiutato).

26. **Orologi che partono da una scelta.** `o_rampa` deve correre solo se il ponte resta aperto dopo il
    tocco. Non c'è un campo per l'attivazione: ho messo la condizione in `avanza_quando` (testo) e ho chiuso
    i segni con `battute_usate`. Il Motore, con `segno_almeno_ogni`, potrebbe chiederli lo stesso.

## Tempi, a grandi linee (dai commit)

| Passo | Tempo |
|---|---|
| 0, lettura (manuale, riferimenti, esempi, codice del validatore dove serviva) | 15 minuti |
| 1–5, situazione, stile, canone, orologi, indizi, schede scena | 10 minuti di scrittura, dopo il progetto fatto durante la lettura |
| 6–9, PNG, PG, sessione, primo giro | 5 minuti |
| 10–11, repertorio (124 battute) e parole segrete | 15 minuti, con i copioni ciechi in parallelo |
| 12–14, immagini, rigoroso, lettura ad alta voce | 5 minuti |
| 15, revisione (15 minuti del subagente) e correzioni | 40 minuti |
| 16, README, autovalutazione, note | 10 minuti |

## I cinque problemi più gravi della skill

1. **Segretezza del modo B non garantita** (nota 22, con 12 e 13): il tipo nel catalogo, la regola di
   prosa obbligatoria e i campi che il compilatore manda davvero ma il validatore non guarda.
2. **Nessun controllo di coerenza fisica e temporale** (nota 23): i difetti più gravi trovati dal
   revisore erano conti di ore, posti e date, e la direzione della catena.
3. **Vincolo delle voci non controllato e non propagato** (note 2 e 21): l'autore lo rompe senza
   accorgersene in campi che la skill non collega alla presenza in scena.
4. **Ordine dei passi in conflitto con i controlli** (note 5 e 9): i passi 5 e 9 chiedono zero errori che
   dipendono dai passi 6, 7, 8 e 10.
5. **Niente per le sessioni a più scene** (note 6, 7, 16, 25, 26): orologi di sessione, segni percepibili
   ovunque, stesso luogo in due scene, orologi condizionati, alternative nei cancelli; e la misura dei
   copioni è tarata su prova-f0 (nota 1) e ignora `scena` e `richiede`.
