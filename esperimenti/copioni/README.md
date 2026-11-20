Copioni di azioni dei giocatori (`indagine.yaml`, `pressione.yaml`) scritti alla cieca, da dare identici a due versioni del Narratore per confrontarne le risposte: ogni turno è una lista di 1–3 azioni `{pg, azione}`, al massimo una per PG.
Confine rispettato: letti solo `prova-f0/pg.yaml` (ogni PG agisce solo sulle proprie `conoscenze_private`), `campagna.yaml` → `sessione.riassunto_iniziale` e `scena.yaml` → `nome` e `apertura`; niente altro di campagne/, prompts/, docs/, repertorio/, png/, logs/.

## Forma per la misura del catalogo (`valida_campagna.py --copioni`, strumenti/valida/copioni.py)
- in cima, facoltativo: `scena: <id>` (la scena in cui si gioca il copione; senza, la scena iniziale);
- in cima, obbligatorio per l'harness (`apps/server/src/esperimenti/copione.ts`): `pg: [pg_a, pg_b]`, i PG che giocano;
- `turni:` una lista di turni, e ogni turno una lista di azioni `{pg, azione}`, con `privata: true` per un'azione
  scritta come privata dal telefono (le battute senza `richiede.privata` non le rispondono);
- un cambio di scena dentro il copione è un elemento `{scena: <id>}` in un turno: vale da lì in poi.
- a Game Master command is an element `{master: {tipo: …}}` at the head of a turn (before its actions), sent as the
  panel sends it (`riposo`, `pericolo`, `combattimento_termina`…); with `--cartella <path>` the script runs on a test
  fixture outside `campagne/` (`regole-r1/cantina.yaml` on `apps/server/test/fixtures/campagne/magia`).
- In turn-based combat the harness sends only the actions of the PCs on turn (`StatoTavolo.combattimento.turno_di`,
  `apps/server/src/esperimenti/alimentatore.ts`): the other actions of the same script turn wait for that PC's own
  turn, in script order, so a script turn can take several windows. When no PC on turn has a queued action the next
  script turn is loaded; a PC on turn with nothing left passes. `riepilogo.json` counts both
  (`combattimento_copione`). Before (bug C4 of docs/e2e-finale.md) every action went out and the Engine deferred
  the ones out of turn, which then went stale.
I copioni ciechi di una campagna nuova stanno in `esperimenti/copioni/<id>/` (passo 12 della skill). Chi li scrive
alla cieca non conosce gli id delle scene: i segni di scena li aggiunge l'autore della campagna, con un commento,
senza toccare le azioni.
