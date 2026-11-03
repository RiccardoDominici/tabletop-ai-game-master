# Strati: la durata della campagna decide quanto si prepara (progetto, 3 novembre 2026)

Richiesta di Riccardo: nella personalizzazione della campagna si indica la durata stimata in **numero di
sessioni**; da quella dipende quanti «strati» di gioco genera il framework. Una one-shot ha poche cose; una
campagna di anni ha più fasi e un mondo completo. Ricerca: `docs/ricerca-durata.md`.

## Principi
1. **Un solo framework, strati che si accendono.** La one-shot di oggi è lo strato più interno. Le campagne
   lunghe non sono un altro programma: aggiungono strati esterni (arco, campagna, mondo) sopra lo stesso
   pacchetto di sessione che il Motore sa già giocare.
2. **Risoluzione progressiva.** Ciò che è lontano nel tempo o nello spazio è un abbozzo; diventa dettaglio
   quando si avvicina. Anni di gioco non si scrivono in anticipo: si scrive lo scheletro, poi una sessione
   alla volta.
3. **Tra una sessione e l'altra lavora il modello forte**, dal registro di ciò che è successo davvero. Dal
   vivo Haiku vede solo il pacchetto della sessione corrente, mai la bibbia o lo stato interi.
4. **Il registro non lo scrive un modello.** I fatti di gioco (indizi rivelati, battute uscite, orologi,
   scelte, PNG incontrati, azioni) si estraggono in modo deterministico dall'archivio delle sessioni
   (`sessioni.sqlite`). Il modello forte li interpreta, ma ogni fatto nuovo dello stato cita il turno da cui
   viene, e il validatore lo controlla. È la risposta al rischio principale della ricerca (log scritto male →
   sessione dopo sbagliata). I fatti nati fuori scena, quando il mondo si muove tra le sessioni, hanno una
   fonte loro: `fonte: {tra_sessioni: <n>, motivo}`, e il motivo nomina l'orologio o la regola che li produce.
5. **Il canone preparato non si tocca; il gioco aggiunge.** I fatti preparati (`f_…`, in `campagna.yaml`)
   restano come sono. I fatti di gioco (`g_…`, in `stato/stato.yaml`) si aggiungono e, quando cambiano un
   fatto preparato, lo dichiarano (`supera: [f_…]`); un fatto di gioco non si cancella, si supera con uno più
   nuovo (`superato_da`). Un PNG morto resta morto in ogni pacchetto successivo (controllo del validatore).
6. **Ciò che i PG hanno scoperto smette di essere segreto.** Ogni pacchetto porta il suo
   `repertorio/parole_segrete.yaml`, che sostituisce quello della campagna; il validatore controlla che non
   nasconda fatti già noti ai PG. Un PNG ricorrente che ha imparato qualcosa ha nel pacchetto la sua scheda
   aggiornata (`png/png_<nome>.yaml`, scheda intera con lo stesso id), che per quella sessione sostituisce
   quella della campagna; la scheda della campagna resta la versione iniziale.

## Il brief
```yaml
sessioni: 1              # numero stimato di sessioni (obbligatorio); "aperta" per una campagna senza fine
ore_per_sessione: 2.5    # facoltativo, predefinito 2.5
durata: ""               # resta come nota a parole
```
Il livello si ricava dal numero con una tabella sola nel codice (`strumenti/strati.py`), letta dal
validatore e citata dalla skill. Il brief può forzare un livello diverso (`livello:`) solo con il motivo in
`decisioni.altre`.

## Livelli e strati
| Sessioni | Livello | Strati preparati prima | Preparati tra le sessioni |
|---|---|---|---|
| 1 | **one-shot** | sessione (situazione, 1–5 scene, PNG, PG, canone, indizi, repertorio): la skill di oggi | — |
| 2–6 | **arco** | + arco: premessa, fronte d'arco con 3–6 tappe che avanzano tra le sessioni, 2–3 atti, domanda drammatica e finali possibili, PNG ricorrenti, fili aperti; sessione 1 completa, le altre come abbozzo di una riga | sessione N+1 completa |
| 7–20 | **campagna** | + campagna: 2–4 regioni, 3–5 fazioni con obiettivo e orologio, tre conflitti maggiori, fine dichiarata, crescita dei PG a tappe; archi abbozzati, solo il primo completo | stato, turno delle fazioni, arco successivo quando il corrente chiude, sessione N+1 |
| 21+ o aperta | **saga** | + mondo: storia, geografia, culture, credenze, cronologia lunga; una zona piena, le altre abbozzo; fasi (tier di gioco) | come «campagna», più il dettaglio di una zona quando i PG ci arrivano |

Le soglie sono una prima scelta (la ricerca non dà numeri); si correggono dopo le prove.

## File
Una campagna one-shot resta com'è oggi (compatibilità piena). Con più sessioni:
```
campagne/<id>/
  brief.yaml  stile.yaml  campagna.yaml      # campagna.yaml: canone, fronti di campagna, archi, regole del mondo
  mondo/      regioni.yaml fazioni.yaml storia.yaml          # solo dai livelli «campagna» e «saga»
  png/        schede dei PNG ricorrenti (le comparse di una sola sessione stanno nella sessione)
  pg.yaml     personaggi, con crescita
  stato/      stato.yaml                                     # registro canonico del gioco: cresce dopo ogni sessione
  sessioni/<nn>/                                             # il pacchetto: ciò che il Motore gioca
    sessione.yaml (riassunto_iniziale, scene in ordine, orologi della sessione)
    scene/*.yaml  png/ (PNG solo di questa sessione)  repertorio/  immagini/ audio/ (solo il nuovo)
    registro.yaml                                            # estratto a fine sessione, deterministico
```
Le risorse che durano (ritratti dei PNG ricorrenti, luoghi che tornano, temi musicali) stanno a livello di
campagna e si riusano; ogni sessione genera solo le immagini e i suoni nuovi.
L'arco preparato prima (premessa, tappe, atti, finali, PNG ricorrenti, fili) sta in `campagna.yaml →
preparazione.arco`: contiene il futuro, e `preparazione` non arriva mai al narratore (riferimenti/arco.md).

## Il ciclo tra le sessioni
1. **Fine sessione** (pannello del master): il server scrive `sessioni/<nn>/registro.yaml` dall'archivio.
2. **Stato**: il modello forte aggiorna `stato/stato.yaml` dal registro e dalla trascrizione; ogni fatto cita
   `sessione` e `turno`; i fili aperti e le promesse dei PG restano finché non si chiudono.
3. **Il mondo si muove**: gli orologi dei fronti e delle fazioni avanzano con regole fisse (quanti segni per
   sessione, cosa li fa correre o rallentare); il modello forte scrive cosa è cambiato fuori scena.
4. **Sessione N+1**: gli stessi passi della skill di oggi, a partire da stato e arco: situazione della sessione,
   scene, PNG, repertorio, il riassunto da leggere all'apertura (dai fatti del registro, non a memoria).
5. **Validatore**: le classi di oggi sul pacchetto, più STATO (ogni fatto ha una fonte) e CONTINUITÀ (niente
   contraddice lo stato: morti, oggetti, promesse, chi sa cosa).
6. **Risorse**: `prepara.sh` sul pacchetto, solo per ciò che manca.

## Fasi di lavoro
- **D1** livello nel brief: `sessioni`, `strumenti/strati.py`, controllo nel validatore, sezione «Strati» della
  skill. Una one-shot non cambia.
- **D2** server: pacchetti `sessioni/<nn>/` (una campagna senza `sessioni/` è una one-shot), PG che durano,
  «Fine sessione» che scrive il registro.
- **D3** skill «tra le sessioni» e classi STATO e CONTINUITÀ del validatore.
- **D4** prova vera: un arco di tre sessioni generato da un brief nuovo, giocato in automatico sessione per
  sessione (i copioni ciechi vedono solo la trascrizione pubblica e il riassunto, come i giocatori), ciclo tra
  le sessioni, giudice cieco su continuità e qualità.
- **D5** livelli «campagna» e «saga»: bibbia del mondo, fazioni, archi a blocchi; prova con un mondo generato.
