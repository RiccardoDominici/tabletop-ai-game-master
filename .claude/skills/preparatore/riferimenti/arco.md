# Il livello «arco»: che cosa si prepara prima della sessione 1 (bozza, fasi D2–D4)

Un arco è una campagna di 2–6 sessioni (`brief.yaml → sessioni`, tabella in `strumenti/strati.py`). Oggi il
validatore lo rifiuta ancora (`LIVELLO.non_supportato`): il controllo si toglie dopo la prova vera della fase D4.
Questo file dice che cosa scrive il Preparatore prima del gioco; tra una sessione e l'altra vale
`tra-le-sessioni.md`.

## L'idea: una spina dorsale, non una trama
Un arco ha bisogno di qualcosa che lo tenga insieme da una sessione all'altra, ma non di un copione: ciò che
succede dopo la prima sessione dipende da ciò che i PG fanno nella prima. Quindi prima del gioco si scrivono:
- la **premessa** e la **domanda drammatica** dell'arco (una sola, da sì o no: la risposta la dà il gioco);
- il **fronte d'arco**: un orologio con le sue **tappe**, che avanza tra le sessioni con regole fisse;
- gli **atti** (2–3) e i **finali possibili**, che dipendono da dove sta l'orologio e non da una scelta precisa;
- i **PNG ricorrenti** (4–6) e i **fili** che torneranno;
- la **sessione 1 completa**, come una one-shot (tutti i passi della skill);
- le **sessioni dopo** in una riga ciascuna.

## Dove sta: campagna.yaml → preparazione.arco
`preparazione` non arriva mai al narratore (il server la toglie in ogni modo): l'arco contiene finali e tappe,
cioè il futuro, quindi sta lì. La sessione 1 è il pacchetto `sessioni/01/` (forma in `tra-le-sessioni.md`).
```yaml
preparazione:
  arco:
    premessa: "Una frase: che cosa succede in questa storia."
    domanda: "Il Borgo Basso sarà ancora del paese alla fine dell'inverno?"   # da sì o no [V]
    fronte: fronte_debiti            # il fronte di campagna (preparazione.fronti, livello: campagna) [V]
    orologio: o_mercante             # l'orologio d'arco, tra gli orologi_extra del fronte [V]
    tappe:                           # 3–6, in ordine: ciò che il fronte ottiene se nessuno lo ferma [V]
      - {id: tp_lettere, segno: 1, cosa: "Il mercante compra i debiti del Borgo.", segno_visibile: "Lettere con il sigillo nero sulle porte.", entro_sessione: 1}
      - {id: tp_sfratti, segno: 2, cosa: "…", segno_visibile: "…", entro_sessione: 2}
      - {id: tp_darsena, segno: 4, cosa: "Il Borgo diventa una darsena.", segno_visibile: "…", entro_sessione: 3}
    ritmo:                           # come avanza tra le sessioni (il «mondo si muove», passo 3) [V]
      per_sessione: 1                # segni a fine sessione, se i PG non lo ostacolano
      accelera: ["un PG firma un foglio del mercante"]     # condizioni osservabili nel registro o nello stato
      rallenta: ["i PG mostrano il registro al consiglio"]
    atti:                            # 2–3, sessioni consecutive dalla prima all'ultima [V]
      - {id: atto_1, sessioni: [1], domanda: "I PG scopriranno chi compra i debiti?"}
      - {id: atto_2, sessioni: [2, 3], domanda: "Il Borgo resisterà al mercante?"}
    finali:                          # 2–4: ogni stato dell'orologio d'arco ha almeno un finale [V]
      - {id: fn_salvo, orologio: {min: 0, max: 2}, quando: "il mercante non arriva alla darsena", esito: "…"}
      - {id: fn_diviso, orologio: {min: 3, max: 3}, quando: "…", esito: "…"}
      - {id: fn_perso, orologio: {min: 4, max: 4}, quando: "la darsena si fa", esito: "…"}
    png_ricorrenti: [png_irma, png_bruno, png_mercante, png_console]   # 4–6, con la scheda in png/ [V]
    fili:                            # promesse, debiti, misteri: ognuno torna da qualche parte [V]
      - {id: filo_tetto, cosa: "Il tetto di Irma", torna_in: [2]}
    sessioni:                        # una riga per ogni sessione dopo la prima [V]
      - {numero: 2, abbozzo: "Il consiglio vota sugli sfratti, e il mercante compra i voti.", tappe: [tp_sfratti], png: [png_console], fili: [filo_tetto]}
      - {numero: 3, abbozzo: "La notte della darsena.", tappe: [tp_darsena], png: [png_mercante]}
```

## Il mestiere
- **Il finale non è una trama.** Un finale dice in che stato finisce il mondo, non che cosa fanno i PG per
  arrivarci: è legato all'orologio d'arco (`orologio: {min, max}`), e ogni stato possibile dell'orologio, da
  zero a pieno, ha almeno un finale. C'è sempre un finale per chi non ferma il fronte, e uno per chi lo ferma.
  Nessun finale nomina un PG: al tavolo può mancare chiunque.
- **Il fronte avanza da solo, con regole fisse.** Tra una sessione e l'altra l'orologio d'arco prende
  `per_sessione` segni, più o meno secondo `accelera` e `rallenta`, che sono fatti osservabili (Blades in the
  Dark fa avanzare le fazioni nel downtime, non a capriccio del master). Senza ostacoli arriva al destino entro
  l'ultima sessione, mai nella prima: `per_sessione × sessioni ≥ segmenti`, e una tappa non arriva prima di
  quanto il ritmo permette (`entro_sessione`).
- **Ogni tappa si vede.** Come i presagi (C2), ogni tappa ha un segno visibile: i PG devono poter capire che il
  fronte è andato avanti mentre loro erano altrove.
- **La fine è dichiarata.** Un arco ha un numero di sessioni e una domanda; le campagne senza fine tendono a
  sgonfiarsi (dato debole, docs/ricerca-durata.md §3). La domanda dell'arco si chiude nell'ultimo atto.
- **Piantare presto ciò che torna.** I fili che serviranno al finale compaiono nella sessione 1 o in un
  abbozzo, e ognuno ha una sessione in cui torna (`torna_in`). Un PNG ricorrente compare nella sessione 1 o in
  un abbozzo, o non è ricorrente.
- **Prepara solo la sessione 1.** Le altre sono una riga: ciò che i PG fanno nella prima le cambierà. Il
  dettaglio arriva tra le sessioni, dallo stato (`tra-le-sessioni.md`). È la preparazione «a rotolo» di Sly
  Flourish e dell'Alexandrian (docs/ricerca-durata.md §2).
- **Ogni sessione regge con qualunque gruppo.** I PG pregenerati restano uno più del massimo; ogni sessione
  comincia con un riassunto di tre-cinque frasi scritto dai fatti dello stato, non a memoria.
- **Atti con una domanda ciascuno.** 2–3 atti (C8: tre atti per la campagna); ogni atto ha la sua domanda,
  e l'ultimo risponde a quella dell'arco.

## Che cosa controlla il validatore (classe ARCO)
| Codice | Controllo |
|---|---|
| `ARCO.forma` | premessa, domanda da sì o no, fronte di campagna e orologio esistenti, ritmo con le sue liste |
| `ARCO.tappe` | tappe con segni crescenti fino all'ultimo segmento; `entro_sessione` coerente con il ritmo e con le sessioni del brief; il fronte arriva al destino entro l'ultima sessione e non nella prima |
| `ARCO.atti` | 2–3 atti che coprono le sessioni da 1 all'ultima, senza buchi né sovrapposizioni |
| `ARCO.finali` | 2–4 finali; ogni stato dell'orologio d'arco ha un finale; uno a orologio pieno e uno prima; nessun nome di PG |
| `ARCO.png` | ogni PNG ricorrente ha la scheda e compare nella sessione 1 o in un abbozzo |
| `ARCO.fili` | ogni filo torna in una sessione dell'arco (in `torna_in` o in un abbozzo) |
| `ARCO.sessioni` | un abbozzo di una frase per ogni sessione dalla 2 all'ultima |
| `ARCO.misure` | le misure di `strumenti/strati.py` (tappe, atti, PNG ricorrenti): avviso se fuori |
