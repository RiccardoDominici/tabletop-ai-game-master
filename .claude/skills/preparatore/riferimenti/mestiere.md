# Mestiere: come si progetta una campagna che regge dal vivo

Queste pagine raccolgono ciò che il manuale non dice e le prove hanno insegnato: la scena di prova
«Il pane dei lumi» (campagne/prova-f0), una revisione indipendente, due esperimenti A/B con giudice
cieco (esperimenti/giudizio-ab-1 e -2).

## 1. Situazione, non trama (A3, C3)
- Parti da **chi vuole cosa**. Il cattivo ha un piano che va avanti anche se i PG stanno fermi. Scrivi
  la cronologia «se i PG non intervengono»: è ciò che fa avanzare l'orologio.
- **Una verità nascosta, semplice da dire in una frase** («la febbre viene dal pane»), e difficile da
  provare davanti agli altri. Le prove sono oggetti, comportamenti, racconti: mai la parola di un solo PNG.
- **Un PNG sa la verità e non è creduto**: tensione buona. Deve però avere un motivo per non dirla tutta
  (paura, vergogna, un'altra colpa), altrimenti la scena si risolve al primo turno.
- **Il pericolo si sente da fuori**: voci, passi, campane. Un pericolo che si vede solo nei dialoghi non preme.

## 2. PNG ben delineati (§3, §6)
- **Tre registri diversi** tra i PNG di una scena: tu e i nomi di mestiere; tu e un lei freddo; lei a
  tutti. Più tre lessici (forgia, cucina, medicina) e tre lunghezze di frase. Prova: leggi le battute
  campione senza nomi e indovina chi parla.
- **Il «voi» singolare non va usato.** A voce sembra un plurale.
- **Ogni PNG vuole qualcosa in questa scena**, che lo mette contro un altro PNG o un fronte. Il desiderio si
  vede nelle battute: chiede, contratta, pone condizioni (D7). Non regala informazioni.
- **`sotto_pressione` cambia comportamento**, non intensità: «diventa calmo e lentissimo», non «si arrabbia di più».
- **Non dare a un PNG il potere di chiudere il climax** (D8). Al massimo tiene la folla sulla soglia
  «per il tempo di una risposta»: la prova la portano i PG.
- **`mai_dice`** contiene la parola chiave del suo segreto. Quando una regola vale solo fino a un certo
  momento, scrivi il momento: «il nome di X, finché non ha confessato».

## 3. Menzogne, segnali, cede_se (D6)
- La `versione` è breve, concreta, ripetibile, e sempre uguale.
- Il `segnale` è **un gesto fisico** visibile («si sistema il fazzoletto rosso e guarda le ceste»), diverso
  dal gesto abituale. Non deve contraddire l'aspetto: chi ha le braccia infarinate non «si pulisce le mani pulite».
- **`cede_se` è osservabile in una trascrizione.** «Un PG le mette in mano un chicco nero dei suoi sacchi»
  si vede; «quando si fida» no.
  - Più condizioni si uniscono con «Oppure».
  - La privatezza si definisce nella scena («chi sente cosa»). Poi va nella confessione come
    `richiede.privata: true`.
- **Una confessione per ogni condizione**, ognuna con il suo cancello strutturale (vedi repertorio.md §4).
  Il giudizio A/B n. 2 ha trovato confessioni uscite in pubblico: il `quando` da solo non le ferma.
- Una menzogna che cede quando qualcuno chiede «i nomi dei tre testimoni» deve davvero non avere nomi.
  Se il canone gliene dà uno, la condizione non scatta mai.

## 4. Indizi (C4, F3, A9)
- Per ogni conclusione chiave:
  - **almeno sette indizi** è un buon numero per la principale;
  - **almeno uno proattivo**: arriva da solo con la mossa morbida, per esempio il cane che trema;
  - **almeno uno per un PG specifico**: una preghiera, un incantesimo, una conoscenza privata.
- Un indizio si **descrive, non si conclude**: «sa di bruciato e tinge le dita, come la polvere di un
  braciere spento». La parola «carbone» la dicono i giocatori.
- Scrivi `come_si_trova` con i modi distinti (aprire un sacco; spezzare una pagnotta) e mettili in `modi`.
- Due indizi nello stesso oggetto (il marchio sul sacco e i chicchi dentro) rendono la soluzione troppo
  rapida. Va bene se il climax regge lo stesso; altrimenti separali.

## 5. Orologio e ritmo (C2, T4, R10, R11)
- Sei segni per una scena di 20–30 minuti, con `segno_almeno_ogni: 2`.
- Ogni segno è una frase udibile o visibile e **aggiunge pressione**: il canto si interrompe, un sasso,
  un rintocco, le lanterne, la maniglia, i tre rintocchi.
- Un segno può aprire un'occasione: il nano va alla finestra e la grata resta senza orecchie per un momento (M9).
- Il climax converge: il pericolo, la verità e la scelta arrivano nello stesso momento.

## 6. La scelta che costa (R10, A4)
- La verità detta a tutti deve **costare qualcosa a qualcuno a cui i PG tengono**. Il silenzio deve
  costare altro. Esempio: la verità salva il forestiero, ma sposta la rabbia del paese sull'ostessa.
- Prevedi la «terza via», che i giocatori cercheranno sempre, e falle pagare un prezzo.
- **`al_completo` dell'orologio** dice che cosa vuole il pericolo e come reagisce a ogni risposta.

## 7. Scrivere per l'orecchio (§5)
- Testi letti: frasi di 8–14 parole in media, 16 al massimo, una idea per frase.
- Ogni luogo coinvolge un senso oltre la vista.
- Le parole forti vanno in fondo alla frase. Niente cifre, sigle, parentesi o puntini di sospensione.
- Attenzione a ciò che il validatore non sente:
  - un pronome ambiguo («dietro, qualcuno tossisce»);
  - un verbo che si legge in due modi («si alza dal forno» suona come «esce dal forno»);
  - due frasi di fila con lo stesso attacco.
- Le frasi brevissime una dopo l'altra rendono il ritmo piatto: alterna, e unisci i gesti in una frase.

## 8. Lezioni delle prove, in breve
| Errore trovato | Regola |
|---|---|
| Il narratore conclude al posto dei PG («non è veleno, è carbone») | gli indizi descrivono; le regole di prosa vietano la parola-soluzione |
| Battute dei PNG riferite dal narratore | ogni parola di un PNG con scheda nella sua riga |
| Il selettore riempie i turni con battute disponibili (A/B 1) | solo ciò che conta è selezionabile; esempi e riempitivi; temi distintivi |
| Il cane e la borsa ripetuti tre volte | riempitivi solo allo stallo; anti-ripetizione |
| PNG muti davanti a una domanda | esempi di voce per ogni PNG, così l'improvvisazione ha un modello |
| Orologio fermo per cinque turni | segni come battute, `segno_almeno_ogni`, Motore che li impone |
| Confessione in pubblico di un segreto «in privato» (A/B 2) | `richiede.privata`, `da_pg`, indizi: cancelli strutturali |
| Id `seb_cicatrice_…` e `quando` con «botola» | il selettore legge id e quando: nessun segreto lì |
| La cicatrice nel ritratto: sul proiettore dal primo turno | tratti nascosti solo in `aspetto.situazioni` |
| La scena non regge senza un PG preciso | situazione comune senza nomi, ruoli di riserva (se manca la chierica benedice il massaro) |
| Un PNG «sa la soluzione» e la grida al primo turno | baratta: chiede acqua, una promessa, la porta aperta |
| Canone contraddetto tra due testi | un fatto, un id, citato ovunque |
