# Revisione indipendente (passo 14)

Lancia un subagente con `model: "opus"` e questo testo come prompt, sostituendo `<id>`. Non aggiungere
le tue conclusioni: il revisore deve formarsi un'idea sua.

---

Stai rivedendo una campagna per «Cantastorie», un master IA per D&D dal vivo in italiano. Il narratore
è un modello piccolo e veloce (Claude Haiku), con il ragionamento spento. Il suo testo lo legge ad alta
voce una sintesi vocale, frase per frase. In modalità repertorio il narratore non conosce i segreti e
sceglie battute pre-scritte. Solo lettura: non modificare nessun file. Il rapporto è il tuo messaggio finale.

Leggi per intero:
- la specifica: `docs/manuale-master.md` (§1–§7 e la rubrica del §9), `docs/repertorio.md`, la sezione
  «File della campagna» di `docs/f0-contratti.md`, e `.claude/skills/preparatore/riferimenti/schema.md`;
- la campagna: tutto ciò che sta in `campagne/<id>/`.

Il validatore ha già controllato la struttura (`python3 -I strumenti/valida_campagna.py campagne/<id>
--rigoroso`): rilancialo, e non riportare ciò che segnala. Cerca ciò che una macchina non vede.

1. **Logica della storia.**
   - Percorri almeno quattro strade diverse che un tavolo prenderebbe davvero: chi interroga subito il PNG
     più sospetto; chi va dritto agli oggetti; chi usa la forza; chi si divide; un gruppo senza il PG con
     l'aggancio più forte.
   - Per ognuna di': dove si blocca, dove si risolve troppo presto, dove contraddice il canone.
   - Con più scene: segui il tavolo da una scena all'altra, anche nell'ordine che l'autore non si aspetta.
2. **Logica del mondo.** Fai i conti, uno per uno, e non fidarti di quelli scritti: il validatore rifà
   solo quelli che `preparazione.cronologia` e `preparazione.logistica` dichiarano.
   - Ore e durate: ogni «fa in tempo», «ne entra uno solo», «prima del tocco» regge con le ore della
     cronologia? Cerca anche le affermazioni di tempo che la cronologia non riporta.
   - Distanze e posti: barche, stanze, carri, gruppi di persone. Conta le persone dei gruppi dal canone.
   - Documenti: ogni data scritta in un registro, una lettera, un libro è compatibile con il fatto che
     prova e con chi l'ha scritto (era vivo, era lì, sapeva scrivere)?
   - Il meccanismo del climax: leggilo al contrario. Una catena alzata chiude o apre? Ogni testo che lo
     nomina dice la stessa cosa?
   - Chi si muove: ogni PNG che un desiderio, una soluzione, un taglio o una battuta porta in un'altra
     scena ci può davvero andare, in quel tempo? E lì incontra un PNG con una voce uguale o simile
     (`assets/voci/voci.yaml`, `simile_a`)?
3. **PNG.**
   - Le voci sono distinguibili a orecchio, senza nomi?
   - I segnali sono gesti leggibili?
   - Ogni `cede_se` è verificabile da una trascrizione?
   - Qualche PNG regala la soluzione al primo turno? Qualche PNG risolve il climax al posto dei PG?
4. **La scelta finale.** C'è un vero dilemma, o una risposta ovviamente giusta? E quando i PG hanno
   scoperto tutto, resta difficile, o una prova o una promessa cancella il prezzo? Quanto costa la terza via?
5. **Segreti.**
   - Compila il contesto che riceve il selettore in modo B e leggilo come lo leggerebbe lui, senza sapere
     niente: `npx tsx strumenti/contesto_modo_b.ts campagne/<id> --catalogo`. Cosa ne indovineresti?
     Cerca ciò che le regex di `parole_segrete.yaml` non prendono.
   - Leggi i prompt delle immagini come li vedrebbe il tavolo sul proiettore
     (`python3 strumenti/immagini/genera.py campagne/<id> --dry-run`).
6. **Italiano per l'ascolto.** Apertura, riassunto, letture d'aspetto, battute campione, segni dell'orologio,
   battute del repertorio. Cerca:
   - frasi innaturali e calchi;
   - pronomi ambigui all'orecchio;
   - accordi di genere verso un PG ignoto;
   - immagini ripetute;
   - un nome seguito da una virgola a inizio frase, che suona come un vocativo;
   - una battuta che presuppone un'altra battuta che può non essere uscita;
   - una parola che svela la soluzione in bocca al narratore.
7. **Rubrica.** Dai un voto alla campagna, così come è progettata, sui criteri R1–R12 del §9, con una riga di prova
   ciascuno. Poi nomina i tre rischi più grandi per un narratore piccolo che non conosce i segreti.

Sii specifico: file, campo, testo citato, correzione in una frase. Prima i problemi più gravi. Al massimo 1000 parole.
