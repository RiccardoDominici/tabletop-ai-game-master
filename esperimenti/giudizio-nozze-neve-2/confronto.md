# Giudizio nozze-neve 2. Fase 2: confronto con il giudizio precedente

Fonti: `fase1-giocatore.md` di questa cartella (giudizio da giocatore sui tre tavolo.md nuovi), `esperimenti/giudizio-nozze-neve/conclusioni.md` (i cinque problemi), e le misure automatiche di `esperimenti/risultati/nozze-neve-*-B` (prima) e `nozze-neve-*-B3` (dopo, incluso il nuovo copione `privato`).

Avvertenze di metodo: una run per copione in ciascun stato, quindi nessuna significatività statistica. Il codice non è lo stesso: le run B sono sul commit a10a172 (worktree isolato), le B3 sui commit e3cdfdc (indagine, caotico) e 5a4c21d (privato), con file modificati in corso. Il «dopo» misura quindi l'insieme delle modifiche di oggi, non una singola correzione.

## Tabella prima/dopo

| misura | indagine | caotico | privato (solo dopo) |
|---|---|---|---|
| battute pre-scritte usate, su 139 | 18 → 18 | 17 → 21 | 11 |
| quota righe pre-scritte | 31,8% → 39,3% | 24,2% → 28,0% | 29,3% |
| [usa] rifiutati | 4 → 0 | 15 → 0 | 0 |
| fughe (misuraFughe) | 1 improvvisata → 0 | 0 → 0 | 0 |
| fuga privata percepita dal tavolo | non misurato | non misurato | 2 risposte pubbliche con il segreto (vedi sotto) |
| finale | nessuno → nessuno (T17 senza chiusura) | nessuno → **fin_tramonto al T16** | nessuno (12 turni, scena del Sasso al T12) |
| o_tramonto a fine partita | non tracciato → 7/8 | non tracciato → 8/8 (al T16) | 7/8 |
| segni d'orologio, per orologio (tramonto / lite / zio) | non tracciato → 2 / 2 / 1 | non tracciato → 2 / 2 / 1 | 1 / 0 / 3 |
| tiri (riusciti) | 0 → 15 (3) | 0 → 20 (6) | 9 (6) |
| azioni private nel tavolo pubblico | 0 | 0 | 0 come testo; 2 risposte private su 6 restano private |
| «annuncia» nel tavolo | 7 → 0 | 19 → 19 | 0 |
| «Parla dall'orecchio buono» nel tavolo | 4 → 2 | 3 → 1 | 1 |
| giudizio da giocatore (media sette criteri) | 2,9 → 3,1 | 2,6 → 2,7 | 3,4 |

Note alla tabella:
- Il denominatore di 139 è confermato: battute usate più battute mai usate fa 139 in ogni run (esempio: 11 + 128).
- I tiri sono contati dagli eventi «prove: azione risolta» del server, nella finestra temporale di ogni sessione. Le run B vecchie non hanno tiri perché il sistema è di oggi.
- La media del giudizio è sulla rubrica a–g della fase 1 (B3 da questa cartella, B dal giudizio precedente).

## Le cinque problematiche

### 1. Il finale non arriva mai: migliorato, non risolto
- Il rifiuto ripetuto di `fin_tramonto` per «battuta senza > pg» è sparito: 0 [usa] rifiutati in tutte e tre le B3.
- Il finale arriva in una partita su tre (caotico, al T16), con la battuta «La scena è finita: il master sceglie come andare avanti».
- Restano due problemi. Nel caotico il gioco continua al T17, cioè dopo la chiusura. Nell'indagine il tavolo arriva al T17 senza chiusura, e nel privato il tavolo si ferma al T14 con il sole sul passo.
- Verdetto: parzialmente risolto. La causa motore («> pg») è caduta; il ritmo di chiusura non è ancora affidabile.

### 2. L'orologio corre al triplo: risolto in gran parte
- Il tramonto non va più prima del Sasso: nel privato il Sasso è al T12 e l'orologio è 7/8 al T14, nel caotico è 8/8 solo al T16, dopo la scena del Sasso.
- I segni non sono più affamati: o_lite e o_zio, che nel giudizio precedente restavano a 0, ora ricevono segni (indagine: lite 2, zio 1; caotico: lite 2, zio 1). Nel privato o_lite resta a 0 e o_zio arriva a 3.
- Resta un dubbio da giocatore: nel privato il corno suona «la sesta volta di oggi» al T13, non come «primo segno», quindi il conteggio dei segni nel testo non torna con l'orologio.
- Verdetto: risolto nella sostanza, da verificare su una campagna con più cambi di scena.

### 3. L'improvvisazione distrugge gli indizi: migliorato
- Il campanaccio della Duchessa tiene la sua invariante nel caotico: muto al T9, «resta fermo» al T10, «fermo e pesante» al T11. Nel giudizio precedente aveva suonato forte quattro volte.
- La lettera sotto la giacca di Tonio resta nella stessa tasca per tutta l'indagine (T2, T7, T13), e Livia non la trova più sotto la giacca di Ettore.
- Nessuna Adelina che si inventa una sorella nelle tre partite.
- Verdetto: migliorato sugli indizi essenziali. Non ho verificato il `vincolo_pubblico` nel codice: lo dico solo perché la coerenza si vede nel tavolo.

### 4. Gli indizi preparati non escono quando chiesti: ancora presente
- Lo scarto più netto è sui [usa] rifiutati (da 4 e 15 a 0). Le battute pre-scritte escono di più solo nel caotico (da 17 a 21).
- Su 139 battute ne escono 11–21 per partita; le «mai usate» restano 118–128. È la parte più grande del problema, e non è cambiata.
- Non ho verificato le tre battute specifiche del giudizio precedente (`nar_sposa_mima`, `nar_stalla_entrata`, `nar_tonio_tasca`): il riepilogo non dice quali battute sono uscite, solo quante. Dico «non verificato», non «risolto».
- Verdetto: ancora presente. Il numero di rifiuti è sceso, ma la quota di pre-scritte che esce resta bassa.

### 5. La prosa al tavolo raddoppia: parzialmente risolto
- Nell'indagine il meta-linguaggio «annuncia» è sparito (da 7 a 0) e il tic di Ettore è sceso (da 4 a 2). Il privato ha zero «annuncia».
- Nel caotico «annuncia» resta a 19, come prima: il problema è ancora lì, e il tavolo lo sente come la voce di un registro.
- Le ripetizioni di gesti («Gaspare si toglie gli occhiali») tornano in più punti.
- Il narratore decide ancora al posto dei PG in qualche passaggio (per esempio il trenino che cerca l'anello sotto la neve, caotico T17).
- Verdetto: parzialmente risolto. Migliore nell'indagine e nel privato, invariato nel caotico.

## Il problema nuovo: le azioni private

Il copione `privato` (6 azioni private, tre PG, 12 turni) era il test che il giudizio precedente chiedeva. Il risultato è misto:

- **Le domande private non compaiono al tavolo come testo pubblico.** Nel `trascrizione.md` sono marcate «(privata)», e il `tavolo.md` le mostra solo come «azione privata». Questo è lo 0 richiesto.
- **Le risposte, invece, no.** Solo 2 risposte su 6 sono marcate `[privato pg_…]` nel registro (T2 di Remo e T4 di Livia). Le altre sono pubbliche, e due di queste portano il segreto al tavolo:
  - T9, `[png_gaspare]`: «Cinque estati di pascolo, venti fiorini già versati. Un contratto è un contratto.» È la risposta alla domanda privata di Remo sul contratto. Il tavolo sente la caparra.
  - T13, `[png_gaspare]`: «Ecco, il garzone dei Morlacchi. Lo vede, signora?» È la risposta alla domanda privata di Vanda su Bastiano alla stalla. Il tavolo sente il garzone che è stato indicato.
- Il misuraFughe conta 0 fughe, perché cerca solo le parole segrete collegate a un id di battuta pubblica. Quindi questo tipo di fuga non è coperto dalla misura automatica: va letto nel tavolo.
- Verdetto: il meccanismo delle azioni private funziona per le domande, ma la risposta del narratore esce ad alta voce. Serve una regola: se un'azione è privata, la risposta che rivela il segreto è privata, oppure il narratore la offre «a quattr'occhi» come chiede il giudizio precedente.

## Verdetto

**Un po' meglio di «così così», ma non ancora buona.** La media della rubrica passa da 2,9 e 2,6 a 3,1 e 2,7, e la partita con azioni private arriva a 3,4. Il finale arriva in una partita su tre, il tramonto non corre più al triplo, e il narratore non rifiuta più i [usa]. Restano il finale fragile, il caotico che ripete «annuncia», la quota di pre-scritte che esce ancora bassa, e le risposte private che escono ad alta voce.

Se si rigioca, la prima cosa da correggere è la risposta privata pubblica, perché è l'unico problema nuovo emerso oggi e rompe la promessa del copione privato.

## Dopo le correzioni del 10 novembre (commit 8bf1125)

- **Finale in una partita su tre: è la lunghezza dei copioni, non un difetto.** Al Sasso il tramonto sale a sei
  entrando, poi corre a un segno ogni due risposte (`orologi_in_scena`): servono quattro risposte dopo
  l'ingresso per arrivare a 8/8. Il caotico entra al T12 e il finale esce al T16. L'indagine entra al T15 e
  finisce al T17, il privato entra al T12 e finisce al T14: due risposte al Sasso, quindi 7/8 e nessun finale.
  Per giudicare il climax, i copioni devono dare almeno quattro turni al Sasso, oppure la scena deve correre
  a un segno per risposta.
- **Le due «fughe» di Gaspare non erano parole segrete mancanti.** Ogni fatto nascosto di nozze-neve ha le sue
  parole (il validatore lo controlla, `SEGRETI.fatto_scoperto`), e le parole del contratto erano già pubbliche
  al T9, perché `nar_scrittoio_cassetto` era uscito al tavolo al T6. Il garzone del T13 è la bugia pubblica di
  Gaspare. Il vero difetto erano le risposte ad azioni private dette ad alta voce. In più la misura delle fughe
  contava come pubbliche le parole di un'azione privata. Ora una guardia agisce sulle righe improvvisate: un
  segreto ancora nascosto va al telefono di chi ha agito in privato, se il turno ha solo la sua azione, oppure
  il PNG dice la sua battuta di rifiuto. Battute e indizi usciti solo in privato restano privati, e la misura
  ignora il materiale privato.
- **«annuncia» veniva dal prompt**, che chiamava così la riga dell'azione. Ora è «la riga dell'azione». Prova
  breve sul caotico (7 turni, `correzioni-motore/annuncia-segreti/caotico-7`): «annuncia» è a 0 (nella B3 era a
  4 negli stessi turni), nessuna riga fermata dalla guardia (nessun falso positivo), 0 fughe, costo $0,016.
