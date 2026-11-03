# Autovalutazione di «Le nozze di neve»

## Validatore

`python3 -I strumenti/valida_campagna.py campagne/nozze-neve --rigoroso`: **0 errori, 2 avvisi** (139 battute,
3 scene, 4 PNG). Con i copioni ciechi (`--copioni esperimenti/copioni/nozze-neve`): catalogo per azione 1,0 di
media, massimo 5, su 81 azioni; 1,4 in più quando l'azione nomina chi parla.

### Avvisi giustificati

- `REPERTORIO.righe` ×2, `fin_sasso_b`: nel finale della terza via parlano Ettore e Adelina dentro una battuta
  del narratore. È voluto: un finale esce per stato, a orologio completo, e spezzarlo in tre battute le
  farebbe uscire in turni diversi; le parole dei due vecchi restano nelle loro righe, con la loro voce (D1).

## Rubrica R1–R12 (come progettata)

| Criterio | Voto | Prova |
|---|---|---|
| R1 Agency | 3 | Nessuna battuta nomina un PG; i tagli non muovono i PG («la casa si svuota»); la fisarmonica del bardo non compare in sensi né segni (c'è il violino del paese). |
| R2 Conseguenze | 2 | Ogni strada ha un effetto: la lite porta fuori le panche e Bastiano scagionato le fa rientrare; lo zio si prende l'anello se lo si lascia solo; la forza sulla giacca accelera la lite. Le conseguenze sono scritte, ma molte dipendono dal master. |
| R3 Canone | 3 | Cronologia con le ore (sessant'anni fa e oggi) e dieci verifiche rifatte dal validatore; chi mette l'anello e di chi è il prato riletti dopo la revisione. |
| R4 Confini | 3 | 22 parole segrete per i 28 fatti nascosti; id e `quando` riletti come li legge il selettore; ogni confessione ha un cancello, Gaspare cede solo davanti alla sorella. |
| R5 Voci | 2 | Tre registri (tu e il lei gelido; tu e i mestieri; lei a tutti) e tre lessici (casera, mulattiera, conti); ma vincent e lucian sono due voci maschili basse nella stessa scena. |
| R6 Prosa | 3 | Frasi del narratore entro sedici parole, apertura con il riassunto in sei frasi; le lettere lette in discorso indiretto. |
| R7 Concretezza | 3 | Sensi non visivi in ogni scena (siero, violino, freddo; fieno, campanacci, scala; resina, scarponi). |
| R8 Restituzione | 2 | Le battute partono dall'esito; restano possibili turni vuoti tra il racconto al Sasso e il tramonto se il master non porta l'orologio a otto. |
| R9 Spotlight | 3 | Sei PG, ognuno con un aggancio a un PNG o a una comparsa e una conoscenza privata che apre una strada. |
| R10 Ritmo | 2 | Intensità 3, 2, 5; il tramonto corre in tutte le scene. Ma il Motore non applica i salti dell'orologio ai cambi di scena: senza il master il climax può arrivare presto rispetto al sole. |
| R11 Mondo proattivo | 2 | Segni udibili da tutti i luoghi (corno, ombre, ferri dei muli); lo zio cerca prima dei PG. Lo zio però si muove solo quando i PG sono in casa. |
| R12 Indizi | 3 | Tre-otto indizi per conclusione, in due o tre nodi; indizi proattivi al Sasso; gemelli privati delle ricerche. |

## I tre rischi principali per un narratore piccolo e veloce

1. **L'orologio del tramonto e il climax.** I salti «+1 a ogni cambio di scena» e «a otto dopo il racconto»
   li deve fare il master dal pannello. Senza, i finali arrivano tardi, o il paese aspetta il sole.
2. **Lo stato dell'anello vive nella trascrizione, non nel Motore.** Chi ha l'anello (i PG, Adelina, lo zio)
   lo capisce il selettore dal testo: le battute del Sasso si aprono per scena e per indizi, non perché
   l'anello è in una mano precisa. Una battuta sbagliata può dare l'anello a chi non ce l'ha.
3. **Le comparse importanti parlano per bocca del narratore.** La sposa muta, lo sposo, il Custode, Tilde: il
   narratore le improvvisa in discorso indiretto, con poche battute scritte. È lì che può inventare fatti.

## Revisione indipendente (passo 14): cosa ho corretto e cosa no

Il revisore (Opus, cieco sulle mie conclusioni) ha trovato cinque problemi gravi. Corretti:

1. **Orologi che non reggono la sessione.** La lite si riempiva in dodici turni e chiudeva per sempre le
   confidenze di Ettore. Ora un segno ogni tre risposte, niente cancello sulle confessioni di Ettore, e una
   battuta (`nar_panche_dentro`) che fa rientrare le panche se si scagiona Bastiano. Il tramonto ora ha un
   segno ogni sei risposte; il segno della processione non dice più «si mette in cammino» (usciva con il
   paese già al Sasso); i racconti del Sasso si aprono dal quarto segno. *Non corretto*: i salti dell'orologio
   ai cambi di scena, che il Motore non applica; stanno nel README per il master.
2. **L'anello riportato ad Adelina prima del Sasso faceva uscire il finale sbagliato.** Nuova battuta
   `ade_anello_reso`; i racconti del Sasso partono da «Adelina alza l'anello», chiunque lo avesse.
3. **I finali mettevano l'anello dopo il tramonto.** Ora l'anello va al dito della sposa dentro il racconto,
   prima del sole; i finali dicono il tramonto e il prezzo.
4. **Le azioni private non trovavano niente.** Otto gemelli privati (giacca, stalla, quaderno, cassapanca,
   anello, campanella, scrittoio, borsa del garzone), che si escludono con i gemelli pubblici.
5. **La terza via vinceva su tutto: i suoi prezzi erano un premio.** La voce del Sasso passava a Zelia, che la
   voleva. Ora la regola pubblica dice che la casa che ha raccontato il falso perde la voce, e la sua storia la
   racconta l'altra casa: con la verità, i Bonfanti non racconteranno più la loro storia, e Zelia mai. Corrette
   anche le due contraddizioni (chi mette l'anello; di chi è il prato: Adelina ritira la dote, il prato resta
   in mano a Gaspare che lo amministra).

Corretti anche: Gaspare non confessa più contro il suo interesse in privato (cede solo davanti alla sorella);
la febbre comincia la sera prima (il medico a cinque ore non poteva «mandare a dire» all'alba); «un
mulattiere di Pontebruno», non «un mulattiere» in un paese di mulattieri Morlacchi; la campanella con il ferro
dei Morlacchi spostata dal camino (Adelina l'avrebbe vista per sessant'anni) al cassetto di Gaspare; il corno lo
suona il nipote del Custode (che è alla casera col Libro); il Custode non ha mai voluto leggere quella pagina;
la dote annunciata prima della caparra; Tilde al camino, dove la sentono solo i vicini, e «il giovane
Morlacchi» invece di «il ragazzo»; la mimica della sposa dice paglia e stalla, non il campanaccio che non può
sapere; Zelia cede alla promessa solo della cugina o di chi ha letto le lettere; il segnale di Gaspare non
compare più nelle sue battute sincere; id delle menzogne senza il suffisso `_versione` (diceva al selettore
quali righe mentono); le lettere lette in discorso indiretto; il vocativo «Ettore, vecchio mulo testardo»;
«le appunta il velo»; il narratore non dice più «come sui finimenti dei Morlacchi»; l'immagine di Zelia nella
stalla tolta (usciva dopo una confessione privata) e quella di Ettore con la tasca vuota invece della lettera
che ha appena dato via.

Non corretti, con il motivo:
- **Due voci maschili basse insieme** (vincent e lucian): il registro ha quattro voci, due femminili simili; non
  c'è altra combinazione con tre PNG in scena. Le distinguono timbro (ruvido contro liscio), lunghezza delle
  frasi e lessico.
- **`[png_zelia]` è un'etichetta valida nel contesto della casera**: lo decide il server, non la campagna. Le
  battute di Zelia hanno tutte `scena`, e nessun testo la porta alla casera.
- **Lo zio cerca solo quando i PG sono in casa**: è voluto (li segue); se non vanno mai a casa, l'anello resta
  nel campanaccio e arriva al Sasso con la Duchessa.
- **Il Sasso nel pomeriggio non ha scheda**: tre luoghi, come chiede il brief; c'è l'abbozzo.
