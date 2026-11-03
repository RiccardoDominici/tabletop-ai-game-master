# Che cosa il Motore non fa (ancora)

Il Motore (il server) applica solo ciò che è scritto in forma che sa leggere. Tutto il resto lo deve fare la
campagna, con battute e cancelli, o non succede. Nella prova di «Le nozze di neve» tre dei cinque problemi
gravi della revisione venivano da qui. Ogni voce di questa pagina è verificata sul codice del server da
`strumenti/motore_limiti.ts` (test `strumenti/test_motore_limiti.py`): se il Motore comincia a farlo, il test
diventa rosso e la pagina va aggiornata. Le voci da implementare nel Motore sono in `docs/da-fare.md`.

<!-- limite: azioni_private -->
## Le azioni private hanno risposta solo dalle battute con il cancello
Una battuta senza `richiede.privata: true` risponde solo alle azioni pubbliche. A un'azione privata (scritta
dal telefono come privata) rispondono solo le battute con `privata: true`, e per il resto improvvisa il
narratore.
- **Che cosa fare**: per ogni cosa che un PG farà probabilmente in privato (parlare a un PNG da solo, frugare
  di nascosto, leggere una lettera) scrivi una battuta con `privata: true`; un'informazione importante che può
  arrivare sia in pubblico sia in privato ha due battute, o una con `oppure` (repertorio.md §4).

<!-- limite: avanza_quando -->
## `avanza_quando` non lo applica nessuno
Il Motore carica `avanza_quando` e non lo usa. Un orologio avanza solo per `segno_almeno_ogni` (il Motore
impone il segno quando è dovuto) e quando il narratore o il selettore sceglie una battuta di segno.
- **Che cosa fare**: ciò che deve far avanzare l'orologio va scritto come battuta: un segno con i `temi` delle
  azioni che lo fanno correre, o un momento con `effetti.avanza_orologio`. `avanza_quando` resta una nota per
  chi legge.

<!-- limite: cambio_scena -->
## Al cambio di scena gli orologi non saltano
Cambiare scena cambia solo quali orologi sono attivi: i segni restano quelli che erano, e nessun orologio
avanza da solo.
- **Che cosa fare**: se una scena deve cominciare con l'orologio più avanti («al terzo tocco»), mettilo come
  primo segno della scena (una battuta di segno con `scena:`), o, tra una sessione e l'altra, in
  `pieni_all_inizio` del pacchetto.

<!-- limite: finali -->
## I finali escono da soli solo a orologio pieno
Il Motore non sa quando «la domanda drammatica ha risposta». Una battuta entra nel catalogo per stato solo se
il suo `richiede.orologio` chiede l'orologio pieno e l'orologio è pieno; altrimenti entra, come tutte, solo se
un'azione ne tocca i `temi` o nomina chi parla.
- **Che cosa fare**: i finali che chiudono la scena prima dell'orologio pieno hanno temi distintivi e i cancelli
  dell'esito (`battute_usate`, `indizi_rivelati`); quelli del climax hanno `richiede.orologio` a orologio pieno.

<!-- limite: senza_azione -->
## Una battuta esce solo legata a un'azione
Il selettore usa una battuta legandola all'azione di un PG (`[usa] id > pg`). Senza `> pg` il Motore accetta solo
il segno d'orologio dovuto e i riempitivi allo stallo. Un finale o una chiusura che entra nel catalogo «per stato»,
a orologio pieno, esce solo se il selettore la lega a un'azione pubblica di quel turno: se il tavolo è fermo, o
le azioni del turno sono tutte private, non esce (nel playtest di nozze-neve il finale non è mai uscito).
- **Che cosa fare**: finché il Motore non lo cambia (docs/da-fare.md), prevedi che il climax arrivi mentre i PG
  agiscono: l'ultimo segno dell'orologio con temi delle azioni del climax, e almeno un finale che risponde
  all'azione decisiva (i suoi `temi`, il suo cancello) oltre a quello «per stato». Il validatore avvisa quando i
  finali di una scena possono arrivare solo per stato (`COPERTURA.finale_senza_azione`).

<!-- limite: oggetti -->
## Gli oggetti non hanno uno stato
Il Motore non tiene chi ha che cosa: un oggetto preso, perso o rotto esiste solo nella trascrizione.
- **Che cosa fare**: se un oggetto cambia mano e conta dopo, il cambio passa da una battuta che rivela un indizio
  (`effetti.rivela_indizi`), e le battute che lo presuppongono lo chiedono (`richiede.indizi_rivelati`). Tra una
  sessione e l'altra lo tiene lo stato (`effetti.oggetti`, tra-le-sessioni.md).
