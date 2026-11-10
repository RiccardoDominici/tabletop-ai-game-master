# Sceneggiatore: cinque esempi dalla prova del 10 novembre

Le prove sono state fatte sulla 4740, con il lettore tutto locale (Qwen3-4B su mlx), voce finta, sceneggiatore = Claude
Code `claude -p --model haiku`, campagna nozze-neve. Due run:
- `indagine`, 8 turni, 30 s di chiacchiera per turno;
- `caotico`, 6 turni, 35 s.

Le misure stanno in `esperimenti/risultati/sceneggiatore/*/sceneggiatore.txt`.

| | indagine | caotico |
|---|---|---|
| azioni pubbliche | 24 | 18 |
| «nessuna» del lettore (richieste «subito») | 3 | 8 |
| scritte da Claude Code | 3 | 8 (1 scartata dal controllo) |
| dette a finestra aperta | 0 (tutte e tre dopo un cambio di scena) | **6 su 8** |
| tempo dalla richiesta alla battuta, mediana (min–max) | 16 s (12–31) | 15,5 s (8–41) |
| battute «prossime» entrate nel repertorio | 42 | 32 |
| battute dello sceneggiatore poi scelte dal lettore | 3 | 2 |

Le tre «nessuna» dell'indagine sono arrivate a scena già cambiata: allora la battuta non si dice e resta nel
repertorio. Due di queste il lettore le ha scelte più avanti, al ritorno nella scena. Nel caotico l'unica
arrivata tardi (41 s) ha superato i 35 s di chiacchiera del copione. A un tavolo vero, dove si parla per minuti, sarebbe
arrivata in tempo.

## 1. Gaspare e il «palo» (caotico T2, detta dopo 9 s): buona
> **Vanda**: «ahah remo non rubare alla festa, ti metto a fare il palo»
>
> [png_gaspare] Con rispetto parlando, il palo non è un gioco.
> [png_gaspare] Facciamo due conti: un anello sparito non fa ridere.

La voce è quella della scheda («con rispetto parlando», il tic «Facciamo due conti»), risponde allo scherzo e
riporta la scena all'anello. Non dice niente di segreto.

## 2. Ettore e la marcia dei muli (caotico T3, 19 s): buona
> **Nando**: «suoniamo la marcia dei muli, Gigia balla anche lei»
>
> [narratore] Ettore batte il bastone per terra, due colpi, a tempo.
> [png_ettore] Eh? La marcia dei muli, questa. Gigia balla, eh.

Si sente il vecchio mezzo sordo («Eh?») e il bastone della scheda. Il narratore descrive un PNG, non i PG.

## 3. Adelina e l'anello di casa (indagine T3, 16 s, arrivata a scena cambiata): buona, non detta
> **Ida**: «adelina, l'anello di casa lo tiene sempre qualcuno? la nonna l'ha mai lasciato in giro?»
>
> [narratore] Adelina tocca la scatolina vuota con due dita, senza guardarla.
> [png_adelina] In giro mai. L'anello di casa sta dove lo metto io, sempre.

È coerente con la versione di Adelina e ha un gesto preciso (la scatolina vuota). La battuta è arrivata dopo il
cambio di scena e non si è detta; è rimasta nel repertorio.

## 4. Il pugno di Gunda (caotico T5, 11 s): da correggere
> **Remo**: «gunda il pugno chiuso fammelo vedere, sono curioso ahah»
>
> [narratore] Gunda apre il pugno con calma, davanti a tutta la tavolata.
> [narratore] Il palmo è vuoto, pulito, con una riga di crosta di formaggio.

Qui lo sceneggiatore **decide per un PG**: Remo chiede a Gunda, e la battuta fa aprire il pugno a Gunda e inventa
cosa c'è dentro. Doveva passare la mano a Gunda («Gunda, Remo aspetta il tuo pugno»). La stessa cosa succede in
piccolo nell'esempio della colomba («La nana si mette in mezzo, mani aperte»), che racconta l'azione del PG invece
dell'effetto. Dopo questa prova il prompt dello sceneggiatore ha la regola esplicita (sceneggiatore/prompt.ts); va rimisurata.

## 5. La battuta scartata (caotico T3, 8 s): il controllo funziona
> **Remo**: «vanda scommetto un formaggio che il vento non c'entra niente, ahah»
>
> chi: pg_remo … → **scartata**: «chi sconosciuto pg_remo»

Claude Code ha messo un PG come chi parla. Il caricatore del repertorio rifiuta l'etichetta, e nessuna delle tre
battute di quella risposta è entrata. Il tavolo ha sentito solo la battuta d'attesa. Nessuna battuta, in tutte e
due le run, è stata scartata per parole segrete.

## Dopo le correzioni (commit 2945ef1): sonnet per le «subito», guardia sui PG, azioni private

Stesso copione caotico (6 turni, 35 s), più 3 turni del copione privato:

| | caotico, prima (haiku) | caotico, dopo (sonnet per le «subito») | privato, 3 turni |
|---|---|---|---|
| «nessuna» del lettore | 8 | 11 | 1 privata |
| dette a finestra aperta | 6 (75%) | **11 (100%)** | 1, al telefono |
| dalla richiesta alla battuta, mediana (min–max) | 15,5 s (8–41) | **12 s (6–19)** | 8 s |
| `claude -p` per una «subito» | — | 5,9 s (5,3–6,3) | |
| scartate | 1 (PG come chi parla) | 1 (PNG non in scena) | 0 |

- **Il pugno di Gunda, rifatto.** «Nella sala la musica copre ogni parola: nessuno alza la testa. / Il pugno di
  Gunda è grosso come una forma piccola, e non si apre.» Gunda non fa più niente come soggetto. Però «non si apre»
  decide ancora per lei attraverso il suo pugno, e la guardia lascia passare il genitivo. Resta da affinare nel
  prompt.
- **Privata, al telefono di Remo** (8 s): «Gaspare si toglie la matita da dietro l'orecchio, senza fretta. /
  Con rispetto parlando, questi sono conti di casa. Non si fanno sottovoce, a una festa.» Al tavolo non arriva:
  non c'è né in `tavolo.md` né nella trascrizione pubblica.
- **Ripetizioni**: in 11 battute, «sulla tavolata dei Morlacchi qualcuno batte i boccali» torna quattro volte, ed
  Ettore apre quasi sempre con «Eh?» e il bastone. Lo sceneggiatore vede la trascrizione ma non varia. Da fare: un
  controllo sulle immagini già usate, o le sue ultime battute nel prompt come cose da non ripetere.

## Dopo ripetizioni, corpo dei PG e audio (commit 164b449)

Copione caotico, 5 turni con 30 s di chiacchiera (`caotico-5-ripetizioni`): 4 «nessuna», **4 su 4** dette a finestra
aperta, mediana 10,5 s (7–18 s), nessuna battuta scartata.
- **Attacchi**: nessuno ripetuto. Prima «Sulla tavolata dei Morlacchi» tornava quattro volte in undici battute.
- **Ettore**: nessuna riga apre con «Eh?» e nessuna ha il tic. Il bastone c'è, ma detto in un altro modo («Il bastone
  di nocciolo batte due colpi»).
- **PG**: nessuna riga descrive un PG; rispondono la sala, Gaspare, Ettore e la cantina.
- **Resta**: «Dietro il tavolo alto, i tre gradini…» torna in due risposte dello stesso turno. La seconda richiesta
  era partita prima che arrivasse la prima risposta, quindi i «già usati» non la contenevano. Da fare: aggiungere ai
  «già usati» le battute dello sceneggiatore ancora in volo.
- **Audio**: con la voce finta della prova la coda drama-3 non parte. È provata a parte (una sintesi per battuta
  nuova, nessuna se è già in cache).
