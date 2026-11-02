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
