# Revisione indipendente (passo 15)

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
   - Cerca contraddizioni di tempi e di fatti tra canone, schede e PG.
2. **PNG.**
   - Le voci sono distinguibili a orecchio, senza nomi?
   - I segnali sono gesti leggibili?
   - Ogni `cede_se` è verificabile da una trascrizione?
   - Qualche PNG regala la soluzione al primo turno? Qualche PNG risolve il climax al posto dei PG?
3. **La scelta finale.** C'è un vero dilemma, o una risposta ovviamente giusta? Quanto costa la terza via?
4. **Segreti.**
   - Leggi ogni riga `id · chi · tipo · quando` del repertorio come la vedrebbe il selettore, senza segreti:
     cosa ne indovineresti?
   - Leggi i prompt delle immagini come li vedrebbe il tavolo sul proiettore.
5. **Italiano per l'ascolto.** Apertura, riassunto, letture d'aspetto, battute campione, segni dell'orologio,
   battute del repertorio. Cerca:
   - frasi innaturali e calchi;
   - pronomi ambigui all'orecchio;
   - accordi di genere verso un PG ignoto;
   - immagini ripetute;
   - una parola che svela la soluzione in bocca al narratore.
6. **Rubrica.** Dai un voto alla campagna, così come è progettata, sui criteri R1–R12 del §9, con una riga di prova
   ciascuno. Poi nomina i tre rischi più grandi per un narratore piccolo che non conosce i segreti.

Sii specifico: file, campo, testo citato, correzione in una frase. Prima i problemi più gravi. Al massimo 900 parole.
