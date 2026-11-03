Copioni di azioni dei giocatori (`indagine.yaml`, `pressione.yaml`) scritti alla cieca, da dare identici a due versioni del Narratore per confrontarne le risposte: ogni turno è una lista di 1–3 azioni `{pg, azione}`, al massimo una per PG.
Confine rispettato: letti solo `prova-f0/pg.yaml` (ogni PG agisce solo sulle proprie `conoscenze_private`), `campagna.yaml` → `sessione.riassunto_iniziale` e `scena.yaml` → `nome` e `apertura`; niente altro di campagne/, prompts/, docs/, repertorio/, png/, logs/.

## Forma per la misura del catalogo (`valida_campagna.py --copioni`, strumenti/valida/copioni.py)
- in cima, facoltativo: `scena: <id>` (la scena in cui si gioca il copione; senza, la scena iniziale);
- `turni:` una lista di turni, e ogni turno una lista di azioni `{pg, azione}`, con `privata: true` per un'azione
  scritta come privata dal telefono (le battute senza `richiede.privata` non le rispondono);
- un cambio di scena dentro il copione è un elemento `{scena: <id>}` in un turno: vale da lì in poi.
I copioni ciechi di una campagna nuova stanno in `esperimenti/copioni/<id>/` (passo 12 della skill). Chi li scrive
alla cieca non conosce gli id delle scene: i segni di scena li aggiunge l'autore della campagna, con un commento,
senza toccare le azioni.
