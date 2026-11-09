# Ricerca: la voce del gioco con fish-audio/drama-3 (OpenRouter)

9 novembre 2026. Decisione di Riccardo (docs/richieste-2026-11-09.md, punto 6): la voce del gioco è
drama-3 via OpenRouter, con direzioni espressive. Qwen locale resta come riserva. Qui ci sono le
fonti, le misure fatte sul servizio vero e le scelte che ne seguono.

Legenda: **[APERTA]** = pagina aperta e letta; **[SNIPPET]** = solo l'estratto di un motore di ricerca
(da verificare); **[MISURA]** = provato da noi con chiamate vere (script in esperimenti/voce-drama3/).
docs.fish.audio non era raggiungibile dal nostro strumento di lettura (ENOTFOUND): tutto ciò che viene
da lì è [SNIPPET].

## 1. L'API: streaming, PCM, limiti

- `POST https://openrouter.ai/api/v1/audio/speech`, obbligatori `model` e `input`; facoltativi `voice`,
  `response_format` (`mp3` | `pcm`, predefinito `pcm`), `speed` («per i modelli che lo supportano»),
  `instructions`, `provider`. La risposta 200 è un flusso di byte audio. Errori: 400, 401, 402 (crediti),
  403, 404, 413, 429, 500, 502 (errore del provider), 503, 524, 529, formato `{error:{code,message}}`.
  [APERTA] https://openrouter.ai/docs/api/api-reference/tts/create-speech
- drama-3 costa **2 $ per milione di byte UTF-8** dell'input. Ha un solo provider, Fish Audio, e le
  generazioni fallite non si pagano. [APERTA] https://openrouter.ai/fish-audio/drama-3
- Il PCM di OpenRouter è descritto come 24 kHz. [SNIPPET] https://openrouter.ai/blog/tutorials/text-to-speech/
  **Per drama-3 non è vero**: [MISURA] `content-type: audio/pcm;rate=44100;channels=1`,
  `transfer-encoding: chunked`, PCM s16le mono senza intestazione, a pezzi di lunghezza anche dispari.
  Il server legge la frequenza dall'intestazione (`sampleRateDa`) e la passa allo schermo frase per frase.
- Lo streaming è vero. [MISURA] Per 4,2 s di audio il primo byte arriva a 0,59 s e l'ultimo a 0,90 s:
  la sintesi va da 4 a 6 volte più veloce del tempo reale. Sulle 15 voci candidate il primo byte è
  andato da 0,45 a 1,8 s, a freddo e a raffiche. A connessione calda (la «sveglia», una GET gratuita a
  `/api/v1/key`, che il server manda quando chiude la finestra delle azioni) è sceso a 0,27 s.
- Limiti di lunghezza: nessun limite esplicito, a parte il 413. [APERTA] Il testo lungo si spezza da
  solo in pezzi. [APERTA] https://huggingface.co/fishaudio/drama-3 Noi mandiamo comunque **una frase
  per richiesta**: il primo audio arriva prima, e un'interruzione costa una frase sola.
- Fish ha anche un'API sua, con `latency` normal/balanced, `chunk_length` 100–300 e WebSocket.
  [SNIPPET] https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech OpenRouter non le
  espone, e a noi non servono: la latenza misurata basta.

## 2. Le direzioni espressive

- Esempio ufficiale: `"[sighs] Fine. If we miss it, it's on you. [laughs] Well, maybe that's fair."`,
  con i tag «dove deve cadere l'evento». [APERTA] https://huggingface.co/fishaudio/drama-3
- Le quadre non hanno un elenco chiuso: vale una descrizione breve qualsiasi (`[whispering]`,
  `[angry]`, `[nervous, almost a whisper]`). Ci sono anche tag accoppiati da chiudere sempre:
  `<whisper> <emphasis> <soft> <fast> <slow> <stress> <forceful>`. Consiglio: al massimo circa tre tag
  per frase. [SNIPPET] https://www.eesel.ai/blog/fish-audio-drama-3-review,
  https://morphic.com/resources/how-to/fish-audio-drama-3-guide
- Un suono all'inizio della riga, a volte, fa sentire solo il suono e poi silenzio.
  [SNIPPET] https://recipes.vllm.ai/fishaudio/drama-3 Per questo i suoni vanno a metà frase.
- La sintassi con le tonde, `(sigh)`, è del vecchio S1, deprecato. [SNIPPET]
  https://docs.fish.audio/developer-guide/core-features/emotions
- [MISURA] Prove trascritte con Whisper (`openai/whisper-1`). Dopo la voce sono rimaste solo le parole
  nei casi seguenti: direzioni in italiano (`[arrabbiato, quasi gridando]`), direzioni in inglese,
  direzioni lunghe fino a 90 caratteri, `<whisper>…</whisper>`, `[sigh]`, `[laugh]`, `<emphasis>`.
  Una volta nemmeno un `<whisper>` non chiuso è stato letto. Riccardo però l'ha sentito leggere in
  un'altra prova, e la guardia resta. **Le direzioni si scrivono in italiano**: il narratore pensa in
  italiano, e scriverle in inglese non dà vantaggi misurabili.

Scelte (apps/server/src/voce/espressione.ts):
- La direzione sta a inizio riga e vale fino alla prossima, dentro la stessa riga. Ogni frase va alla
  voce con una richiesta a sé, quindi il server **riporta la direzione** sulle frasi seguenti della riga.
- Guardia severa, perché un tag non chiuso si legge ad alta voce. Si tolgono e si registrano nel log
  i tag sconosciuti, le chiusure senza apertura e le direzioni oltre 80 caratteri. Un tag ancora aperto
  a fine frase si chiude lì e si riapre nella frase dopo, sempre nella stessa riga: drama-3 riceve
  sempre un testo bilanciato. Toglierlo a posteriori non si può, perché la frase è già partita. Una
  riga che finisce con un tag aperto viene registrata come errore di protocollo.
- Proiettore, telefoni, trascrizione e cronologia per Haiku ricevono solo le parole. Anche Qwen, che
  leggerebbe le direzioni e i tag ad alta voce, riceve solo le parole.
- Una riga senza direzione prende quella predefinita di chi parla. Per un PNG la direzione è
  `voce.tts.direzione`, se c'è; altrimenti si compone dalla scheda: primo tratto di
  `personalita.superficie`, `timbro`, `eta_apparente` e `velocita`, per esempio «burbero e rumoroso;
  timbro grave e ruvido…; sui 75-85 anni». Per il narratore è `direzione_voce` della carta di stile,
  se c'è, altrimenti la prima frase di `registro_narratore`. Costa circa 80 byte per frase, cioè
  0,00016 $.

## 3. Italiano e pronuncia dei nomi

- Il modello è dichiarato per 83 lingue, ma l'elenco non è pubblicato. [APERTA]
  https://huggingface.co/fishaudio/drama-3 [MISURA] L'italiano funziona: Whisper ha trascritto parola
  per parola tutte le battute di prova delle cinque voci scelte.
- Non si trovano tag di fonemi, dizionari di pronuncia o note sugli accenti grafici. Per i numeri
  conviene scriverli in lettere: la normalizzazione del testo può sbagliarli. [SNIPPET]
- Campo `pronuncia` delle schede («Èttore Morlàcchi»): **resta com'è**. La grafia accentata va solo
  alla voce, come con Qwen (voce/pronuncia.ts). [MISURA] «Bàldrin Pietrafìtta ed Èttore Morlàcchi»
  esce pulito, senza sillabe strane. Whisper non distingue gli accenti tonici: se l'accento cade
  giusto lo dice solo l'orecchio. Le direzioni passano anche loro dalla pronuncia; un nome dentro una
  direzione non dà fastidio.

## 4. Le voci pubbliche

- Ricerca senza chiave: `GET https://api.fish.audio/model?language=it&title=…&tag=…&sort_by=task_count&page_size=…`.
  Per ogni voce restituisce `_id` (il reference_id), `title`, `description`, `tags`, `languages`,
  `task_count`, `like_count`, `samples[].text`, `author`. [SNIPPET]
  https://docs.fish.audio/api-reference/endpoint/model/list-models [MISURA] Campi controllati sulle
  risposte vere.
- Sulle voci della community non ho trovato termini di licenza chiari. La licenza dei pesi di drama-3
  vieta di clonare una persona reale senza il suo consenso. [SNIPPET]
  https://www.digitalapplied.com/blog/fish-audio-drama-3-open-weight-ai-voice Molte voci italiane
  pubbliche hanno il nome di persone reali, come youtuber, politici, doppiatori e fatti di cronaca
  (per esempio «MARIO ROGGERO», che era stata provata). **Le scartiamo tutte**, insieme ai cloni di
  personaggi di film e cartoni.
- Le scelte e il perché di ciascuna sono in assets/voci/voci.yaml (`fish`, `fish_titolo`,
  `fish_perche`). In breve: narratore «Narratore Calmo», vincent «Voce bassa», nadine «Nonna barbara»,
  lucian «ITAL», tabitha «Voce Vivace Italiana». Le misure di altezza e timbro le separano. Il giudizio
  finale tocca all'orecchio di Riccardo.

## 5. Guasti e riserva

- La richiesta si considera riuscita solo quando arriva il primo pezzo di audio, entro 6 s
  (`CANTASTORIE_FISH_PRIMO_MS`). Se fallisce, il log lo registra e si fa un ritentativo, ma non per
  400/401/402/403/404/413, dove ritentare non serve. Poi si passa a Qwen, se è permesso e pronto. Se
  non c'è nemmeno Qwen, la frase si annuncia con un silenzio lungo quanto la lettura: il sottotitolo
  resta sullo schermo e il turno va avanti (voce/riserva.ts, voce/pipeline.ts).
- Le istanze di prova (porta diversa da 4610) non usano mai Qwen: il servizio su 4611 è della partita
  vera.
- Le battute del repertorio dette dal vivo da drama-3 si conservano in cache/audio-fish, separata
  dalla cache di Qwen perché le voci sono diverse. La seconda volta sono gratis e istantanee.

## 6. Prova vera (9 novembre 2026, istanza 4730)

`esperimenti/voce-drama3/gioca.ts`: nozze-neve in modo B, Haiku vero, drama-3 vero. Apertura e tre turni del
copione `indagine`. I risultati sono in esperimenti/voce-drama3/partita/.
- 49 frasi, tutte dette da drama-3: nessun ritentativo, nessuna riserva, nessuna correzione della guardia,
  nessun buco sul proiettore. Il telefono con «Ascolta qui» ha ricevuto le stesse 49 frasi del proiettore.
- Primo byte per frase: minimo 214 ms, mediana 288, p90 757, massimo 889. La generazione va 5–6 volte più
  veloce del parlato, e quindi dopo la prima frase la voce non aspetta più.
- Costo: voce 0,0124 $ (6.225 byte, 158 s di audio) e LLM 0,0053 $. In media la voce costa circa 0,0035 $
  a turno: la direzione predefinita del narratore, lunga 67 caratteri, ne fa più di metà. Una sessione di
  45 turni costa circa 0,16 $ di voce e 0,08 $ di LLM, cioè circa 0,25 $ in tutto, finché resta la tariffa di
  lancio. Le 22 righe del repertorio dette in questa prova sono già in cache/audio-fish: alla prossima
  partita non si pagano.
- Il selettore ha scritto da solo una direzione (`[png_ettore] [brontolando] Eh? …`), riportata sulle tre
  frasi della riga. Whisper sull'mp3 di 60 s: nessuna parola delle direzioni nella trascrizione.
