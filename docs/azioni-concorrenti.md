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
| `sospesa` | era `da_confermare` e il tempo è scaduto: esclusa dal turno, il giocatore lo sa | si riscrive |

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

- Si apre dopo l'invito, come in F0, e si chiude quando tutti gli invitati sono pronti oppure 10 s dopo la prima azione.
- **Non si chiude** mentre ci sono azioni `da_confermare` o un invitato sta scrivendo (indicatore negli ultimi 3 s):
  si allunga di poco, al massimo di 8 s in tutto. Allo scadere le `da_confermare` diventano `sospese` (escluse,
  con avviso), così nessuno blocca il tavolo.
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
- Avviso a tutto schermo per `da_confermare`, con tre pulsanti e un conto alla rovescia; vibrazione dove esiste.
- Esiti per chi è stato superato: privati, brevi, con il pulsante «Riscrivi».

## Verifica

- Test deterministici sugli scenari (classificatore finto): dipendenza e ritiro, catena A→B→C, conflitto esclusivo
  con il secondo che cambia, azione vecchia valida/dubbia/impossibile, scadenza → sospesa, azione privata.
- Insieme di casi per il classificatore vero (Haiku), con precisione e richiamo.
- Prova end-to-end con tre telefoni (Playwright) sugli stessi scenari, con screenshot degli avvisi.
