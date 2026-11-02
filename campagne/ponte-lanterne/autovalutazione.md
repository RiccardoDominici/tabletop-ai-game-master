# Autovalutazione — Il ponte delle lanterne

Voti R1–R12 del manuale §9 sulla campagna *così come è progettata*, dopo la revisione indipendente.
Nessuna sessione vera è stata giocata: sono giudizi sul testo, non su una trascrizione.

## Rubrica

| Criterio | Voto | Prova |
|---|---|---|
| R1 Agency | 3 | Nessuna battuta decide azioni o emozioni di un PG; al climax Tullio chiede «Ditemi voi. Chiudo, o aspetto?» e il patto di Vischi «vi guarda, uno per uno, e aspetta». |
| R2 Conseguenze | 3 | Sei esiti con il loro finale (`esiti` del terzo tocco); anche la terza via può fallire (`o_rampa`, `fin_barca_tardi`); la forza su Tullio funziona ma costa il casello. |
| R3 Canone | 2 | Un fatto per id, citato ovunque per id; dopo la revisione i tempi tornano (un solo viaggio prima del tocco, il secondo un'ora dopo, che è l'ora che il ponte regge). Resta il rischio di orari improvvisati. |
| R4 Confini | 2 | Ogni confessione ha un cancello (`privata`, `da_pg`, `indizi_rivelati`, `battute_usate`); ma il tipo `menzogna` nel catalogo dice al selettore chi mente e su cosa. |
| R5 Voci | 3 | Quattro registri e lessici: Tullio tu di ponte, frasi di tre-otto parole; Vischi lei liscio, frasi lunghe; Bice tu a raffica; Rosa tu e «creatura». |
| R6 Prosa | 3 | Lunghezze controllate dal validatore e lettura ad alta voce (passo 14): tolto il vocativo involontario «Tullio, il custode,» dall'apertura. |
| R7 Concretezza | 3 | Tre sensi per scena, due non visivi; lessico di fiume e di pietra; nessun cliché del §5. |
| R8 Restituzione | 2 | Le battute si fermano al punto di reazione; l'invito finale lo aggiunge il raccordo, non è scritto nelle battute del narratore. |
| R9 Spotlight | 3 | Ogni PG ha una conoscenza privata che apre una strada: Quirino l'onda, Dalia il segnale di Rosa, Nives la porta del retro, Arrigo la confessione di Tullio, Ghita lo studio e la corda. |
| R10 Ritmo | 3 | Intensità 3, 4, 3, 5; climax nell'ultimo terzo; ogni taglio ha l'uscita per chi esita (Nerio, Rosa, il console, Tullio). |
| R11 Mondo proattivo | 3 | Tre orologi con segni udibili da tutto il paese; Vischi propone il Ricovero per primo e il patto al tocco; due indizi arrivano da soli. |
| R12 Flusso di indizi | 2 | Nove indizi per il leone, sei per Vischi, cinque per il Ricovero; ma l'onda, essenziale, esce solo se i temi colgono l'azione («muschio», «pilone», «leone»…). |

## Esito del validatore

```
python3 -I strumenti/valida_campagna.py campagne/ponte-lanterne
campagne/ponte-lanterne: 0 errori (nessuno), 4 avvisi — modo normale, 4 scene, 4 PNG, 135 battute
python3 -I strumenti/valida_campagna.py campagne/ponte-lanterne --rigoroso --avvisi
campagne/ponte-lanterne: 0 errori (nessuno), 4 avvisi — modo rigoroso, 4 scene, 4 PNG, 135 battute
```

Catalogo per azione: con `--copioni esperimenti/copioni` media 0,6 e massimo 4 su 88 azioni, ma quei
copioni sono di prova-f0 e qui non misurano niente. Su due copioni scritti alla cieca per questa
campagna (subagente che vedeva solo ciò che vedono i giocatori, fuori dal repository) media 2,7 e
massimo 8 su 58 azioni. Il simulatore ignora `scena` e `richiede`, quindi il catalogo vero è più stretto.

I quattro avvisi rimasti, giustificati:
- `SCENA.uscite` verso il Borgo Basso (2 indizi dal ponte) e verso la Casa del Sale (1 dal Borgo): sono
  luoghi noti a tutti dal primo turno (canone pubblico `f_borgo_passato`, `f_consiglio_sale`), non vanno
  scoperti con un indizio. Il Borgo è segnalato anche dalla situazione stessa.
- `SCENA.uscite` verso la chiesa e il Passo Vecchio dal terzo tocco: la chiesa è dove si sale dopo, il
  Passo Vecchio è la prossima sessione; il climax ammette meno uscite.

## Che cosa ha trovato la revisione indipendente, e che cosa ho fatto

Corretto:
- **Tempi impossibili**: con tre tocchi e un viaggio lungo «lo spazio tra due tocchi» ci stavano due
  viaggi prima di mezzanotte. Ora un viaggio dura più di metà della sera; il secondo tornerebbe un'ora
  dopo il tocco (`f_secondo_viaggio`), che è l'ora che il ponte regge.
- **Capienza**: la barca portava otto persone per gruppi di quindici e venti. Ora è una chiatta per una
  ventina.
- **Bice nel Borgo**, insieme a Rosa, in quattro punti (desiderio, collo di bottiglia, battuta, taglio):
  contro il vincolo delle voci. Ora fa da faro dal parapetto.
- **Il libro dei passi** era datato alla piena grande, quando il leone era ancora al suo posto. Ora la
  riga è della piena di trentacinque anni fa (prima vent'anni: ma Tullio tiene il casello da trenta, e
  la riga è del padre; l'ha trovato la cronologia del validatore).
- **La catena al contrario**: «catena su» voleva dire aperto. Ora a terra è aperto, tesa è chiuso, e le
  battute dicono «chiudere» e «tenere aperto». Anche il prompt dell'immagine mostrava il ponte chiuso.
- **Il climax senza prova**: «tienila su» bastava. Ora tenere aperto richiede l'onda trovata; senza,
  Tullio dice «Fammi vedere una pietra, e ti credo».
- **La forza** contraddiceva la scheda di Tullio: ora funziona, a un prezzo.
- **La Casa del Sale** saltava a mezzanotte: ora si torna al ponte all'ora in cui si è.
- **Segreti nel contesto del modo B** (verificati dal revisore con il compilatore del server): il taglio
  del terzo tocco, la porta sul retro nella pianta della Casa del Sale, «un tavolo per le firme»
  nell'abbozzo del Passo Vecchio. Riscritti senza segreti.
- **Senza Dalia** la lanterna troppo svelta non diceva niente a nessuno: aggiunto un indizio dalla gente
  in fila (`i_fila_ernesto`).
- **Lo scrivano senza scheda**: ora la pianta dice che cosa sa, e c'è una battuta per quando lo minacciano.
- Minori: croci di gesso «fresche» ma della settimana prima; «Mezzanotte» prima del tocco; la barca che
  si chiamava Lanterna come i segnali; due segni che sembravano messaggi in codice; «brontola» ripetuto;
  rifiuti clonati; «Scommettiamo» in quattro battute; Vischi che «alza la voce»; il segnale di Tullio
  («guarda la catena») che era un gesto abituale; la condizione di Arrigo non verificabile; «Voi tenete
  la testa», «la vostra pioggia», «Il padre calava il leone».
- **La scelta era ovvia** con la prova in mano. Ora la terza via è un azzardo con un suo orologio e un
  finale di fallimento, e Vischi offre al tocco un patto pubblico: nessuno firma, ma il leone resta una
  bugia. Tre risposte, tre prezzi.

Non corretto, con il motivo:
- **Il tipo `menzogna` nel catalogo** dice al selettore chi mente e su cosa. È il formato del repertorio
  (`id · chi · tipo · quando`), non un dato della campagna: va deciso nel server o nella skill.
- **La scoperta precoce dell'onda** (il detto di Tullio e la pertica bastano): la lascio. Trovare l'onda
  presto non decide più il climax: restano il viaggio sicuro, il patto e l'azzardo.
- La confessione di Rosa a Dalia dice «come quando eri bambina»: è al femminile, ma è chiusa da
  `da_pg: [pg_dalia]`, che è lei.

## I tre rischi più grandi per un narratore piccolo e veloce

1. **L'onda persa per un'improvvisazione.** Se un giocatore descrive l'azione con parole che i temi non
   colgono, il selettore non vede `nar_pilone_*` e Haiku può improvvisare «solo muschio». Riparo: temi
   larghi sul pilone, Tullio che senza prova chiede «una pietra», Bice che confessa dove lo scrivano ha
   grattato, il ponte che non trema al tocco.
2. **Il climax ha molte battute chiuse da cancelli.** Sei finali, il patto, l'orologio della rampa: il
   selettore deve scegliere per `quando` tra battute elencate per stato. Quando il patto è stato offerto e
   la catena si chiude senza smascherare Vischi, sono disponibili sia `fin_patto` sia i finali della notte:
   decide il `quando` («senza patti»).
3. **Il tempo della sessione dipende dal Motore.** Il più uno a ogni cambio di scena, il salto a sei
   all'inizio del terzo tocco e l'orologio della rampa che parte solo a ponte aperto sono scritti in
   `avanza_quando`, a parole. Se il Motore non li applica, il tocco arriva troppo presto o troppo tardi, e
   i segni della rampa restano fermi. Oggi il server F0 gioca solo `scena.yaml`: il resto non è provato.
