# Azioni simultanee: come si parlano tra loro e con la narrazione

Richiesta di Riccardo (2 novembre 2026): «se scrivo "vado avanti" e Paolo scrive "anch'io vado avanti", e poi la
mia azione cambia o non va avanti, Paolo deve saperlo e poter annullare». In generale: le azioni dei giocatori nascono
in parallelo, mentre la narrazione continua ad arrivare; il sistema deve capire come si collegano e avvisare chi è
toccato, senza far aspettare tutti e senza riempire i telefoni di avvisi.

## Principi

1. **Si può scrivere sempre**, anche mentre il narratore parla. L'invito dà la priorità a chi è chiamato, ma non
   blocca gli altri. Quello che arriva durante una narrazione va nella finestra successiva.
2. **Il tavolo vede le intenzioni.** Le azioni pubbliche in coda si vedono sui telefoni degli altri, con autore e
   testo: così si coordinano («anch'io»), come al tavolo vero. Le azioni private non si vedono.
3. **Il Motore decide, il modello consiglia.** I collegamenti tra azioni li propone un piccolo classificatore
   (regole + Haiku), ma stati, ordini e avvisi li gestisce il Motore.
4. **Prima scrive, prima arriva.** Nei conflitti esclusivi (la stessa chiave, la stessa porta) vince chi ha inviato
   prima; l'altro lo sa **prima** della risoluzione, finché può ancora cambiare idea.
5. **Pochi avvisi, solo quando servono.** Si avvisa solo se l'azione di qualcuno è davvero toccata: dipendenza rotta,
   conflitto perso, scena cambiata in un modo che la rende dubbia o impossibile.

## L'azione

Campi: `id`, `autore`, `testo`, `privata`, `inviata_alle`, `versione_vista` (ultima narrazione che il giocatore aveva
ricevuto quando ha **cominciato** a scrivere: il telefono la fissa al primo tasto), `dipende_da`, `in_conflitto_con`,
`stato`, `motivo` (frase breve per il giocatore quando lo stato cambia per cause esterne).

Stati:

| Stato | Significato | Modificabile |
|---|---|---|
| `in_coda` | inviata, aspetta la chiusura della finestra | sì |
| `da_confermare` | qualcosa l'ha toccata: il giocatore sceglie Confermo / Cambio / Ritiro | sì |
| `ritirata` | ritirata dall'autore | — |
| `chiusa` | entrata nel gruppo che il narratore sta risolvendo | no |
| `risolta` | il narratore l'ha risolta | — |
| `superata` | non eseguita: la scena o un'altra azione l'hanno resa impossibile (con `motivo`) | si riscrive |
| `sospesa` | era `da_confermare` e il tempo è scaduto (ritmo concitato) o il master ha risolto: esclusa dal turno, il giocatore lo sa | si riscrive |

## I tre casi

**1. Dipendenze** («anch'io», «lo seguo», «lo aiuto», «copro Corrado»)
- All'invio, il classificatore collega l'azione a quelle in coda a cui si riferisce (`dipende_da`).
- Se un'azione da cui altre dipendono viene **ritirata, cambiata, superata o sospesa**, ogni azione dipendente passa a
  `da_confermare` con un avviso al suo autore:
  «Ginestra ha ritirato "vado avanti". La tua "anch'io vado avanti" dipendeva da quella: confermi, cambi o ritiri?»
- Se il cambiamento non tocca il senso della dipendente (il classificatore lo dice), nessun avviso.
- La propagazione segue la catena (A → B → C), una volta sola per catena.

**2. Conflitti esclusivi** (due prendono la stessa cosa, due vanno in direzioni che si escludono)
- Il classificatore segnala `in_conflitto_con` e se è **esclusivo**.
- Vince chi ha inviato prima. Se la finestra è ancora aperta, il secondo riceve subito:
  «Corrado ha già scritto di prendere la chiave: vuoi cambiare azione?» (Tengo / Cambio / Ritiro).
- Se il secondo tiene l'azione, il narratore riceve l'ordine e risolve il primo per primo; al secondo arriva
  l'esito (anche `superata` con il motivo, se non c'era più niente da prendere).
- Conflitti **non esclusivi** (due attaccano lo stesso nemico, due parlano allo stesso PNG): nessun avviso, il
  narratore li risolve insieme.

**3. Azioni rese vecchie dalla narrazione**
- Un'azione è *vecchia* se `versione_vista` è precedente a una narrazione che è arrivata dopo (durante la scrittura
  o mentre aspettava in coda).
- Finita ogni narrazione, il classificatore riesamina le azioni vecchie contro ciò che è appena successo:
  - **ancora valida** → resta `in_coda`, nessun avviso;
  - **dubbia** → `da_confermare`: «Nel frattempo la porta si è chiusa. Confermi "entro nella stanza"?»;
  - **impossibile** → `superata` con il motivo, e invito a riscrivere.

## La finestra

Rivista dopo le richieste del 9 novembre (docs/richieste-2026-11-09.md; dettagli in docs/f0-contratti.md, «Turno»).

- Si apre dopo l'invito. Inviare vuol dire «ho finito» (non c'è «Pronto»): si chiude quando tutti gli invitati hanno
  un'azione viva e nessuna è `da_confermare`, dopo 2,5 s di assestamento per un «anch'io» o una correzione (ogni invio,
  ritiro o conferma lo fa ripartire, e chi sta scrivendo lo allunga, al massimo di 8 s). Un telefono scollegato non si
  aspetta.
- **Ritmo calmo** (normale): nessuna scadenza. Una scelta `da_confermare` aspetta chi la deve fare; il master ha
  «Risolvi ora», e allora le `da_confermare` diventano `sospese`.
- **Ritmo concitato** (lo chiede la narrazione con `[ritmo] concitato`, oppure la scena o il master): la finestra si
  chiude da sola 25 s dopo l'apertura. **Non si chiude** mentre ci sono azioni `da_confermare` o un invitato sta
  scrivendo (indicatore negli ultimi 3 s): si allunga di poco, al massimo di 8 s. Allo scadere le `da_confermare`
  diventano `sospese` (escluse, con avviso), così nessuno blocca il tavolo.
- Un'azione in coda non fa mai partire un conto alla rovescia.
- Il narratore riceve le azioni chiuse **in ordine di invio**, con i collegamenti: chi dipende da chi, chi ha vinto
  quale conflitto.

## Il classificatore («arbitro»)

- **Regole prima** (istantanee): nomi di altri PG, «anch'io», «lo/la seguo», «insieme a», «aiuto…», «copro…» con una
  sola azione candidata → dipendenza certa, senza modello.
- **Poi Haiku**, chiamata breve con uscita strutturata (JSON con schema), asincrona: non blocca l'invio. Riceve le
  azioni pubbliche in coda, l'azione nuova o cambiata, l'ultima narrazione e il riassunto pubblico della scena.
  Restituisce: `dipende_da`, `conflitti [{con, esclusivo, chi_vince}]`, e per le azioni vecchie
  `valida | dubbia | impossibile` con un motivo di una frase, scritto per il giocatore.
- **Le azioni private** entrano nel classificatore solo per il loro autore e per i conflitti esclusivi, e gli avvisi
  agli altri non ne rivelano il contenuto: «qualcun altro ci è arrivato prima».
- Misura: un insieme di 30–40 casi scritti a mano (dipendenze, conflitti, azioni vecchie, falsi allarmi) con
  la risposta giusta, per misurare precisione e richiamo prima di metterlo in gioco.

## Telefono

- Sezione «Al tavolo»: le azioni pubbliche in coda degli altri, con stato.
- La propria azione: stato, `motivo` quando cambia per cause esterne.
- Avviso a tutto schermo per `da_confermare`, con tre pulsanti (e un conto alla rovescia solo al ritmo concitato);
  vibrazione dove esiste.
- Solo «Invia» e «Ritira»: chi ha inviato vede «Azione inviata» e, sotto, «Aspettiamo: …».
- Esiti per chi è stato superato: privati, brevi, con il pulsante «Riscrivi».

## Scelte dopo la ricerca (`docs/ricerca-azioni.md`)

- **Le intenzioni restano visibili**, a differenza dei giochi WEGO dove gli ordini sono ciechi: al tavolo vero ci si
  parla, e «anch'io» presuppone di sapere cosa ha scritto l'altro. Le azioni private restano nascoste.
- **Un'azione per giocatore per finestra**: un nuovo invio la sostituisce (modifica), non se ne accumulano.
- **Ricontrollo al momento della risoluzione**: il narratore risolve in ordine di invio; un'azione che a quel punto
  non è più possibile «si spegne» (`superata`, con il motivo), non si annullano entrambe.
- **Pareggi veri** (invii entro 1 s): l'ordine ruota tra i giocatori, così nessun posto vince sempre.
- **Chi non scrive, aspetta**: il narratore non inventa mai l'azione di un PG.
- **Chiusura atomica**: chiusura della finestra e passaggio a `chiusa` in un solo passo sotto lucchetto (ci sono bug
  noti quando gli ultimi due inviano nello stesso istante).
- **Mai perdere il testo scritto**: un'azione `superata` o `sospesa` torna nella casella, pronta da modificare.
- **Parole degli avvisi**: niente «Conflitto!»; si dice cosa è successo e cosa si può fare. «In attesa» e «da decidere»
  restano distinti: solo il secondo chiede una scelta.

## Verifica

- Test deterministici sugli scenari (classificatore finto): dipendenza e ritiro, catena A→B→C, conflitto esclusivo
  con il secondo che cambia, azione vecchia valida/dubbia/impossibile, scadenza concitata → sospesa, azione privata;
  turno senza scadenza (calmo), assestamento, invitato scollegato, «Risolvi ora».
- Insieme di casi per il classificatore vero (Haiku), con precisione e richiamo.
- Prova end-to-end con tre telefoni (Playwright) sugli stessi scenari, con screenshot degli avvisi.
