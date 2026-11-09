# Regole per chi lavora su Cantastorie

Queste regole valgono per chiunque (persone o agenti) modifichi il repo. Leggile prima della prima modifica.

## Che cosa è il progetto, in una riga

Cantastorie è un **framework**: genera campagne di D&D infinite da giocare di persona con un narratore IA.
Non è una campagna. Una campagna è un *output* del framework (`campagne/<id>/`), generata dal Preparatore
a partire da un brief. Ogni modifica si valuta così: funziona per una campagna qualunque, o solo per quella
che la ispira? Se serve un caso speciale per una sola campagna, va cercata la regola generale.

## Documentazione: va aggiornata con il codice

- Ogni modifica aggiorna nello stesso commit la documentazione che tocca: `README.md`, le pagine di
  `docs/guida/` (la guida d'uso, in italiano, passo passo) e i `docs/*.md` di progetto che descrivono il
  comportamento cambiato (`docs/prove.md`, `docs/strati.md`, `docs/audio.md`, `docs/architettura.md`, …).
- Una funzione o un'opzione nuova non è finita finché non compare nella guida, con il comando vero.
  Non si scrivono comandi o flag senza averli controllati nel codice o negli script.
- Una modifica che rende falsa una pagina della guida è un bug, anche se il codice funziona.

## Segreti: controllo prima di ogni push

Chiavi e token non entrano mai nel repo. Prima di ogni `git push` (e prima di rendere il repo pubblico)
esegui questo controllo dalla radice e fermati se trova qualcosa:

```bash
# 1. File che non devono essere tracciati (il solo .env.example è ammesso)
git ls-files | grep -E '(^|/)\.env(\.[^e][^/]*)?$|^logs/|^cache/|(^|/)\.venv/|__pycache__|node_modules/' && echo "TROVATO: file vietati"

# 2. Pattern di chiavi e token nel contenuto dei file tracciati
git grep -nE 'sk-ant-|sk-or-v1|hf_[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{10,}|gho_[A-Za-z0-9]{10,}|[A-Z_]*_API_KEY=[^[:space:]]+' -- ':!.env.example' && echo "TROVATO: pattern di chiave"

# 3. Token del master copiati dai log (compaiono come ?token=… nel log del server)
for t in $(grep -ohE 'token=[A-Za-z0-9_-]{12,}' logs/*.out logs/*.jsonl logs/*/*.out 2>/dev/null | cut -d= -f2 | sort -u); do git grep -nF "$t" && echo "TROVATO: token del master"; done
```

Il controllo 3 vale solo se esistono log; i valori dei token non si stampano mai nel terminale o nei messaggi
di commit. Se un segreto è già finito in un commit, non basta cancellarlo: va revocato e il commit riscritto
prima di pubblicare.

I valori di chiave si leggono da: variabile d'ambiente, poi `.env` alla radice (fuori da git), poi il file
di ripiego configurato (`apps/server/src/llm/chiavi.ts`, `strumenti/chiavi.py`). I log mostrano solo origine
e lunghezza. Non aggiungere mai un `console.log` o un `print` di un valore di chiave o di token.

## Porte: 4610 e 4611 sono della partita vera

- `4610` è il server della partita vera; `4611` è il servizio voce Qwen locale.
- Le prove, i test e le istanze di sviluppo usano `CANTASTORIE_PORTA` con un'altra porta (es. `4710`),
  e log in `logs/porta-<porta>/`. Non avviare, fermare o riavviare nulla su 4610 o 4611 per una prova.
- I test automatici non devono mai aprire 4610 o 4611. Un test che ha bisogno di un server usa una porta
  libera scelta dal test o `CANTASTORIE_PORTA`.
- `scripts/arresto.sh` e `scripts/avvio.sh` fermano e avviano solo la porta che si chiede: non usarli su
  una partita in corso senza che Riccardo l'abbia chiesto.

## Commit: spiegare il perché

- Il messaggio dice perché il cambiamento serve, non solo che cosa cambia. La prima riga è il *cosa* in
  breve; il corpo spiega il *perché* (il problema, la scelta, cosa si è scartato e perché).
- Un commit = un'unità verificata. Prima di committare, i test pertinenti passano (`npm test`,
  `python3 -m pytest -q <file>`).
- Messaggi in italiano, come il resto della storia del repo.

## Principio del framework

- Il codice genera campagne: non contiene contenuti di una campagna specifica. I nomi, i luoghi e i
  personaggi di `campagne/<id>/` restano nei file della campagna, non nel codice, nei test generici o nei
  prompt di sistema.
- Le fixture dei test sono inventate e generiche; le campagne reali servono come esempi, non come fonte di
  test che dipendono da loro. Quando una regola cambia, la prova sta in una fixture minima, non nella
  campagna.
- Le skill e i prompt del Preparatore descrivono regole generali (formato, validazione, sessioni), non la
  trama di una storia.

## Altre regole

- Niente file monolitici: moduli piccoli con responsabilità chiare.
- Logging adeguato: decisioni importanti e errori sì, dati personali o segreti no.
- Prima di una modifica non banale, leggi `docs/architettura.md` e i `docs/*.md` del sottosistema.
