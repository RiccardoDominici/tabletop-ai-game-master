# Il pane dei lumi — scena di prova F0

Una scena sola, 20–30 minuti, 3 o 4 giocatori. Niente combattimento, niente dadi.

## La scena in breve

È la Notte dei Lumi a Fontescura, un paese di montagna. Da due giorni nove persone hanno le mani che bruciano di febbre, e il paese accusa un forestiero, Sebastiano, visto di notte al pozzo. Baldrin, il fabbro e massaro, lo ha chiuso nel ripostiglio dell'osteria. Al terzo rintocco, finita la veglia, il paese verrà a prenderlo e a spezzare il pane dei lumi. La verità è che la febbre viene proprio da quel pane: Ottavia, l'ostessa, ha comprato a metà prezzo una segale guasta da Gualtiero, il mugnaio di Valsecca, e lo sospetta, ma mente per vergogna.

## Chi c'è

| PNG | Voce | Cosa vuole | Su cosa mente | Segnale |
|---|---|---|---|---|
| Ottavia (`png_ottavia`) | `nadine` | vendere il pane e tenersi il forno | da dove viene la segale; cosa ha mangiato il cane | si sistema il fazzoletto rosso e guarda le ceste |
| Baldrin (`png_baldrin`) | `vincent` | consegnare al paese chi ha fatto ammalare sua figlia | quanti l'hanno visto al pozzo | abbassa gli occhi sulle mani e alza la voce |
| Sebastiano (`png_sebastiano`) | `lucian` | uscire vivo senza che si sappia chi è | il suo mestiere e la guerra | nasconde le mani nelle maniche e tossisce |

PG pregenerati (`pg.yaml`): Ginestra (halfling druida, conosce il «fuoco nero»), Corrado (ex balestriere, sa della taglia sul cerusico disertore), Assenzio (tiefling ladro cresciuto da Ottavia, conosce la botola e il segnale di Ottavia), Sorella Teodora (chierica, deve benedire il pane e conosce la regola delle castagne). La scena regge con qualunque terzetto.

## Come funziona

- **Indizi (regola dei tre).** «È il pane, non il pozzo» ha sette indizi in quattro nodi e di cinque tipi: chicchi neri nei sacchi e nella mollica (essenziale, senza tiro), il cane che trema con le croste nella ciotola (anche mossa morbida), Baldrin che beve al pozzo ma non mangia segale, i carbonai sani, Sebastiano, la preghiera di Teodora, l'acqua del pozzo. «Sebastiano è innocente» e «la segale è di Gualtiero» hanno quattro o cinque indizi ciascuna. Nessun indizio è dietro un tiro.
- **Orologio.** «Il paese vuole un colpevole», sei segni udibili in ordine (il canto, un sasso, il primo rintocco, le lanterne, la maniglia, i tre rintocchi). Avanza una risposta sì e una no, e subito se i PG fanno rumore o minacciano Baldrin. Ai segni due e quattro Baldrin va alla finestra: per un momento la grata è senza orecchie.
- **In privato.** Baldrin sente tutto nella sala e alla grata; non sente nel retro, in cantina, sotto il portico. Le confessioni di Ottavia e di Sebastiano avvengono solo lì (o con la botola, che dalla cantina sale nel ripostiglio).
- **La scelta.** Al terzo rintocco il paese vuole qualcuno che risponda della febbre. Dire la verità a tutti salva Sebastiano e il paese, ma sposta la rabbia su Ottavia. Tacere e cambiare il rito (le castagne) salva Ottavia, ma il paese vuole ancora il forestiero, che può solo fuggire nella neve con il nome sporco. Consegnarlo è la strada peggiore. Corrado, se c'è, ha in più la taglia da venti corone. Baldrin, convinto, tiene la folla sulla soglia per una sola risposta: decidono i PG.
- **Chiusura.** Scelta aperta per la sessione dopo: Valsecca e Gualtiero, Sebastiano al passo, i malati da curare.

## File e chi li vede

| File | Contenuto | Al narratore? |
|---|---|---|
| `stile.yaml` | carta di stile: premessa, tono, regole di prosa, `[STILE]`, musica, linee e veli | sì |
| `campagna.yaml` | canone, orologi, rivelazioni, colli di bottiglia, nodi, sessione | sì, **tranne la chiave `preparazione`** (fronti con destini, cattivo, segreti astratti, archi) |
| `scena.yaml` | scheda della scena, con `apertura` | sì |
| `png/*.yaml` | schede complete dei tre PNG | sì (in F0 il narratore fa parlare anche i PNG) |
| `pg.yaml` | `situazione_comune` + personaggi | sì, ma `conoscenze_private` solo al telefono del giocatore |
| `autovalutazione.md` | rubrica, controlli, rischi | no |

Inizio scena: il server legge `campagna.yaml → sessione.riassunto_iniziale` e poi `scena.yaml → apertura` (6 frasi in tutto, il massimo di N2).

## Letture del manuale adottate (perché il validatore di F1 faccia lo stesso)

1. **Presagi (C2).** «1–3 presagi» di un fronte d'avventura e «3–5» di quello di campagna sono contati sul totale del fronte; ogni pericolo ne ha almeno uno. Qui valgono entrambe le letture.
2. **Orologi (C2).** Ogni pericolo ha il suo orologio. Quelli che il narratore deve vedere stanno in `orologi` (fuori da `preparazione`), con `segni` (uno per segmento), `avanza_quando`, `al_completo`; i pericoli li citano con `orologio: <id>`. Quelli del fronte di campagna stanno in `fronti[].orologi_extra`.
3. **Apertura (C9, §4, N2).** `scena.apertura` al massimo 3 frasi; il riassunto C9 sta in `sessione.riassunto_iniziale`; insieme al massimo 6 frasi.
4. **Musica.** Solo i tag elencati nel §4 del manuale (`esplorazione_tesa`, `taverna_calda`, `rito_sacro`, `inseguimento`, `combattimento_epico`, `lutto`); il vocabolario di `architettura.md` è diverso e va riconciliato.
5. **Scopo (C12).** `scopo: {tipo, rif}` con `tipo` in `rivelare_indizio | far_avanzare_fronte | mettere_alla_prova | sviluppare_rapporto | dare_la_scena | decompressione`.
6. **Fatti.** `sa`, `non_sa`, `mente_su.verita` sono id del `canone`. `crede_a_torto` è una lista di `{testo, contraddice: <id fatto>}`, e quel fatto non sta in `sa` (una credenza falsa non è una menzogna).
7. **Indizi.** Ognuno ha `id, conclusione` (una sola), `tipo` (`png | oggetto | luogo | evento | documento | visione`), `nodo` (i PNG contano come nodi, C5), `essenziale`, `tiro`, `come_si_trova`. Gli indizi dei nodi senza scheda stanno in `nodi[].indizi`.
8. **Uscite.** `segnalata_da` è una lista di indizi; ogni nodo di uscita ne ha almeno tre.
9. **Segnale.** Deve essere un gesto fisico e diverso dal `gesto` abituale, altrimenti non si legge.
10. **Senza dadi.** `cede_se` usa solo condizioni di finzione osservabili nella trascrizione; `tiro: "nessuno"` ovunque.
11. **Scene potenziali (C11).** In F0 c'è una sola scheda completa; gli altri luoghi sono `abbozzo` in `nodi`, con `prossima_sessione: true` per Valsecca.
12. **Riferimenti liberi.** `relazioni` e `chi_altro_sa` citano anche entità senza scheda (`gualtiero_malerba`, `compagnia_del_grifo`, `ilde`, `tecla`): il validatore li deve accettare.
13. **Campi in più** rispetto al manuale, tutti facoltativi: `scena.descrizione`, `immagine.prompt_luogo`, `elementi_interattivi` come `{cosa, dove, azioni}`, `posta.{si_guadagna,si_perde}.{cosa,per_chi}`, `colli_di_bottiglia_nota`, `pg.yaml` (il manuale non ne fissa lo schema).
