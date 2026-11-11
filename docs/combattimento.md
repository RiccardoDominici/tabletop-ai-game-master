# Combattimento

Il combattimento è guidato dal set di regole della campagna (docs/regole.md). L'SRD 5.2 è il default: iniziativa
individuale, Azione / Azione bonus / Movimento / Reazione, tiri contro la morte e le 15 condizioni. Un manuale con
altre fasi o altre caratteristiche lo cambia da solo, con la sezione `combattimento:` di `regole.yaml`.

## 1. Ricerca

| Sistema | Iniziativa | Round | A 0 | Fine | Fonte |
|---|---|---|---|---|---|
| **SRD 5.2** | prova di Destrezza; ordine fisso; sorpresa = svantaggio | ognuno il suo turno: movimento + un'azione; azione bonus solo da un privilegio; una reazione per round | PG: privo di sensi e TS contro la morte. CD 10; 3 successi = stabile, 3 fallimenti = morto. 1 = due fallimenti, 20 = 1 PF; danno a 0 = un fallimento. Mostri: morti | i nemici a terra (o la storia) | [OPENED] SRD_CC_v5.2.pdf, IT 5.2.1 |
| **B/X (Moldvay)** | 1d6 per schieramento, ogni round; pari si ritira | fasi: morale, movimento, proiettili, magia, mischia; prima uno schieramento, poi l'altro | morte (regola base) | morale 2d6 ≤ punteggio, dopo il primo caduto e a metà caduti; altrimenti fuga o resa | [OPENED] epicsavingthrow.com (riassunto B/X); [SNIPPET] giantitp/enworld; basicfantasy.org non raggiunto (403) |
| **PbtA (Dungeon World)** | nessuna | segue la finzione; il master fa una mossa sul 6- o quando lo guardano | «Ultimo respiro» (2d6) | quando la storia lo dice | [OPENED] dungeonworldsrd.com/moves (Hack and Slash: 7–9 colpisci e vieni colpito) |
| **Ironsworn** | chi è «in controllo» | mosse: Enter the Fray, Strike, Clash, End the Fight; traccia di progresso | danni e stress, momentum | mossa di progresso | [OPENED, parziale] Ironsworn SRD (CC-BY-4.0) |

Le condizioni dell'SRD 5.2 con i loro effetti sono in apps/server/src/regole/combattimento.ts (`CONDIZIONI_SRD`).

**Che cosa serve a una sezione generica** (dalla ricerca):
- iniziativa individuale fissa, per schieramento a ogni round, o nessuna;
- fasi ordinate;
- economia del turno;
- esiti a livelli: un 7–9 con lo scambio dei colpi;
- a 0 col ramo giusto: morte, fuori gioco, tiri contro la morte;
- condizioni con effetti meccanici;
- morale.

L'Ironsworn «in controllo» si approssima con `nessuna` (vedi §6).

## 2. La sezione `combattimento:` (lo schema è in docs/regole.md §2)

```yaml
combattimento:
  iniziativa: {tipo: individuale | per_schieramento | nessuna, dado: 20, caratteristica: destrezza, ogni_round: false}
  fasi:                         # in ordine; png = che cosa fanno da soli i PNG in quella fase
    - {id: movimento, nome: "Movimento", png: null}
    - {id: proiettili, nome: "Proiettili", png: attacco_distanza}
    - {id: mischia, nome: "Mischia", png: attacco_mischia}
  azioni: [{id: azione, nome: "Azione", quante: "una"}]           # economia del turno, per telefono e narratore
  danni: {modello: pf | ferite | stress, a_zero: {pg: tiri_morte | fuori_gioco | morte, png: morte | fuori_gioco},
          tiri_morte: {cd: 10, successi: 3, fallimenti: 3}}
  condizioni: [{id: prono, nome: "Prono", icona: "⬇", effetti: [svantaggio_attacchi, attacchi_contro_vantaggio], testo: "…"}]
  condizione_a_zero: privo_di_sensi
  fine: {morale: true}          # B/X: 2d6 contro `scheda.morale` del PNG (7 se manca)
```

- **Effetti** (elenco chiuso, li applica il Motore ai tiri): `svantaggio_attacchi`, `vantaggio_attacchi`,
  `svantaggio_prove`, `svantaggio_salvezze`, `attacchi_contro_vantaggio`, `attacchi_contro_svantaggio`,
  `critico_contro`, `fallisce_salvezze_forza_destrezza`, `perde_turno`, `non_si_muove`.
- **Valori predefiniti senza la sezione**:
  - SRD: tutto quello dell'SRD 5.2, cioè le 15 condizioni più «In guardia» (Schivata).
  - 2d6: `iniziativa: nessuna`.
  - Gli altri tipi: individuale, con d20 o d10 e la Destrezza se il set ce l'ha, e a 0 «fuori gioco».

## 3. Flusso (Motore: prove/combattimento.ts, prove/motore.ts)

1. **Si entra in combattimento** quando un tiro d'attacco tocca un personaggio con la scheda: un PG attacca un PNG, o un
   PNG reagisce. Oppure col pannello del master, «Inizia combattimento».
   - **Partecipanti**: i PG al tavolo con la scheda, i PNG coinvolti e i PNG in scena con la scheda e ostili a un PG.
   - L'iniziativa è quella del set. L'azione che ha aperto lo scontro conta come «di sorpresa».
2. **Passi**: un round è fasi × ordine (individuale), oppure fasi × schieramenti (per schieramento).
   - **Passo di PG**: la finestra si apre **solo per lui**, o per tutto il suo schieramento. Il Motore ignora l'invito
     del narratore. Gli altri possono scrivere, ma la loro azione resta in coda (`TavoloAzioni.rinvia`) e si risolve al
     loro turno. Nessun timer: il ritmo concitato vale solo se la scena lo chiede.
   - **Passo di PNG**: lo risolve il Motore, senza chiamate in più. Attacca un PG in piedi, nella fase giusta. Il
     bersaglio, deterministico, è il PG che lo ha colpito; se no quello che ha agito per ultimo; se no il primo in
     piedi.
   - I passi di PNG di fila si risolvono insieme. Il narratore li racconta nella stessa risposta, dopo l'azione del PG.
3. **A 0**:
   - la condizione del set (Privo di sensi);
   - SRD: i tiri contro la morte all'inizio del suo turno, poi stabile, morto, o in piedi con un 20;
   - altrimenti fuori gioco o morto.
   - Il master può ridare PF: chi torna sopra 0 si rialza.
4. **Condizioni**: le mette il Motore (a 0) o il master; scadono a inizio round, se hanno una durata. I loro effetti
   entrano nei tiri: vantaggio o svantaggio col motivo sulla carta, critico, TS falliti, turno perso.
5. **Fine**: nemici a terra o fuggiti, PG tutti a terra, morale fallito (B/X), oppure «Termina combattimento».
6. **Narratore**: ogni attacco di un PNG arriva come frase esplicita prima dei dettagli («Ruggero lo sgherro colpisce Corrado Lanzi: 6 danni», «… manca …»), e il prompt chiede di raccontarlo in una frase sua, mai per accenni. La sezione «Esiti dei tiri» porta «Combattimento, round N, fase X. Ordine … Tocca ora a: …». Il
   narratore chiude invitando solo chi è di turno e non inventa attacchi o danni.
7. **Fatti dovuti** (prove/fatti-dovuti.ts): nella e2e finale del 10 novembre (narratore Haiku, set Basic Fantasy) il
   narratore saltava fatti del Motore anche con «raccontalo»: un PG a 0 col suo tiro contro la morte, i danni inflitti.
   Responsabilità minima: il Motore non chiede un'altra chiamata, controlla.
   - Fatti del turno, uno per creatura, il più grave: `morto`, `rialzato` (20 naturale), `stabile`, `morente` (tiro
     contro la morte senza esito finale), `a_terra` (un colpo la porta a 0), `colpito` (un colpo con danni). Solo dalle
     carte pubbliche: l'esito di un'azione privata non si dice al tavolo.
   - Dopo la narrazione (e la sua riparazione), un fatto è detto se una riga al tavolo nomina la creatura (nome, nome
     breve, soprannome) e ha una parola che comincia con una delle radici del tipo (lingue/<codice>/motore.yaml,
     `fatti_dovuti`). Le righe private non contano.
   - Colpi a vicenda nello stesso turno: «Corrado colpisce Ruggero» nomina tutti e due ma racconta un colpo solo. Allora
     ogni colpo vuole una frase sua che nomini anche chi ha colpito.
   - Un fatto non detto: il Motore aggiunge una riga breve del narratore dal pacchetto della lingua (testi-prove.yaml,
     `prove.dovuti.<tipo>`: «Corrado cade a terra.», «Ruggero incassa il colpo.»), prima della domanda d'invito se la sua
     voce non è ancora partita. Vale per il narratore e per il selettore. Nel registro dei turni: `fatti_aggiunti`
     («tipo:id»); nel log del server: «prove: fatti dello scontro non detti dalla narrazione, li dice il Motore».
   - Limiti: una negazione («il colpo non lo raggiunge») conta come detta; un pronome senza nome («il nano barcolla») no,
     e il Motore aggiunge la sua riga anche se il fatto si capiva.

## 4. Schermi
- **Proiettore**: la barra dell'iniziativa in alto (al posto della fila dei ritratti durante lo scontro). Mostra round e
  fase, i combattenti in ordine con chi è di turno in evidenza, la barra dei PF (dei PNG solo la barra), le icone delle
  condizioni, «a terra / morto / fuggito» e i tiri contro la morte (schermo/BarraIniziativa.tsx).
- **Telefono**: «È il tuo turno» con PF, condizioni e azioni disponibili; altrimenti «tocca a …»
  (telefono/TurnoCombattimento.tsx).
- **Pannello del master**: «Inizia / Termina combattimento», PF di tutte le schede correggibili, condizioni da mettere e
  togliere (master/SezioneCombattimento.tsx). Comandi `combattimento_inizia`, `combattimento_termina`, `pf` e
  `condizione`.

## 5. Verifica
- **test/combattimento.test.ts**:
  - SRD: iniziativa, turno del PNG, 0 PF, tiri contro la morte (1 e 20), condizione che fa perdere il turno e
    scade, vantaggio da «prono»;
  - B/X: schieramenti, fasi, morale;
  - PbtA: niente turni;
  - lo schema e i suoi errori.
- **test/combattimento-integrazione.test.ts**, col server intero: la finestra si apre solo per chi è di turno,
  l'azione fuori turno resta in coda, il PNG agisce da solo, il master termina.
- **test/fatti-dovuti.test.ts**: fatti dalle carte e dai tiri contro la morte, il controllo nome + parola in italiano e
  in inglese, i colpi a vicenda, e col server intero il colpo saltato che il Motore dice prima dell'invito.
- **E2E** sulla 4720 con Haiku vero: apps/web/e2e/combattimento.spec.ts.

## 6. Aperto
- **Iniziativa «in controllo» (Ironsworn)** e mosse di combattimento con traccia di progresso: oggi si gioca come
  `nessuna`.
- **Movimento e distanze**: non sono tenuti; il bersaglio del PNG non è «il più vicino». Mancano anche gli attacchi di
  opportunità.
- **Turno del PG**: un'azione sola. Azione bonus, attacchi multipli e incantesimi sono solo descrittivi.
- **Condizioni dall'arbitro**: per esempio «lo butto a terra» diventa prono, «mi metto in guardia» diventa Schivata.
  Oggi le mettono solo il Motore (a 0) e il master.
- **Danno massiccio e stabilizzare con Medicina** (SRD).
