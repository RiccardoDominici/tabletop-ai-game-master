# Pronunciation of names (project, 11 November 2026)

A synthetic voice reads invented names badly: «Zirrà» as «Tsirra», «Nespola» with the stress on the wrong syllable,
«Aoibheann» letter by letter. The fix is a **pronunciation lexicon** per campaign, written by the model (the Preparer,
Claude Code), applied by the server to every text that goes to the voice and **never** to what is shown, and checked
by ear with a TTS → Whisper round trip.

## The lexicon: `campagne/<id>/pronunce.yaml`

```yaml
lessico:
  - nome: Zirrà                  # as written in the texts
    tipo: png                    # png, pg, luogo, oggetto, fazione, dio, termine, altro
    forme: [Zirra]               # other spellings with the SAME sound
    solo_maiuscolo: false        # true when the name is also an ordinary word («Sasso», «Ash»)
    it:                          # one block per language; the campaign's `lingua` decides which one is used
      grafia: Dzirrà             # what the voice reads instead of the name (plain text, no markup)
      suono: dzirra              # the intended sound, as a listener would write it (target of the ear test)
      candidate: [Dzirrà, Dzìrra]  # optional respellings for the ear test to choose from
      forme: {Zirrani: Dzirràni} # inflected forms with their own respelling
      nota: "voiced z, stress on the last syllable"
    en:
      grafia: DZEER-rah
      motori: {qwen: DZEER-rah}  # a form for one voice engine (fish, qwen), written by the ear test when it is better there
    verificata: {data: 2026-11-11, voci: [drama-3, qwen], punteggio: 0.92, base: 0.55}   # written by the ear test
non_nomi: [Signora]              # capitalised words that are not names (for the validator)
```

Sources, in order of precedence (`apps/server/src/voce/pronuncia.ts`): `pronunce.yaml`; `pronunce-gioco.yaml` (names
added during play, below); the `pronuncia` field of NPC and PC sheets («Bàldrin Pietrafìtta», word by word, capitalised
words only, as before the lexicon). A name prepared in `pronunce.yaml` is never changed by the other two.

### How it is applied

`creaPronunciatore(campagna)` returns one function that every voiced text passes through: opening and «Last time…»,
narration and NPC lines (live, from the repertoire, from the scriptwriter), announcements that repeat what a player typed,
waiting lines, the soft move, the closing and the recap, the audio prepared in advance (`prerender.ts`, the
scriptwriter's lines). The `testo` of a phrase (projector, phones, transcript, subtitles) keeps the written name; only
`testo_voce` changes (`voce/pipeline.ts` logs it at debug level, «voce: testo per la sintesi»).

- Whole words only (Unicode boundaries: «Brunone» does not contain «Bruno»), multi-word names too («Torre Mozza»,
  across a line break); the longest entry wins and a respelling already placed is never rewritten.
- Lowercase spellings are matched (players type «eliandro»), unless `solo_maiuscolo: true`; the unaccented form is
  added automatically («Zirra»); Italian elision works («dell'Eliandro»); English keeps the possessive («Zirrà's»).
- Inflected forms with a different sound go in the language block's `forme`.

### Per voice engine

The engines do not read a respelling the same way: drama-3 takes the English stress convention («ee-VAWN»), Qwen
spells a capitalised syllable out like an acronym («ee-VAWN» heard as «E-Valve UN»). So the respelling depends on the
engine in use (`grafiaPer` in `voce/pronuncia.ts`): the entry's `motori` form for that engine if there is one; for
Qwen otherwise `stileQwen(grafia)`, which lowercases the capitalised syllables of a hyphenated respelling
(«ee-VAWN» → «Ee-vawn», «KAD-oo-gan» → «Kad-oo-gan»; «NEEV» and Italian respellings stay as they are); for drama-3 and
the fake voice the `grafia`. The server's pronouncer (`voce/lessico-vivo.ts`) asks the voice selector which engine is
playing at each phrase; the audio prepared for drama-3 (`prerender.ts --motore fish`, the scriptwriter's lines) always
uses the drama-3 forms, `prerender.ts` for Qwen the Qwen ones, so the cache keys match what is said. Not covered: when
drama-3 fails on one phrase and the reserve Qwen says it (voce/riserva.ts), that phrase keeps the drama-3 form.

## The validator: class `PRONUNCIA` (`strumenti/valida/regole_pronuncia.py`)

- `lessico_mancante` (strict): no `pronunce.yaml`. An old campaign gets one with the ear test's `--aggiungi`.
- `schema`: not a list, entry without `nome` or without the campaign language's `grafia`, repeated name, markup
  (`[ ] < > { }`) in a respelling, language `forme` that is not a map.
- `nome_senza_voce` (strict): a word that looks like a proper noun without an entry. Proper nouns are the words of
  NPC and PC names and every capitalised word in mid-sentence that never appears in lowercase in the texts (ids,
  acronyms, image prompts, `quando`, rule statistics and `preparazione` excluded; «Motore», «Narratore» and the like are
  never names). The `pronuncia` field of a sheet and `non_nomi` cover a word too.
- `parola_comune`: the name also appears as an ordinary lowercase word, and the entry has no `solo_maiuscolo: true`.
- `non_verificata`: entries the ear test has not tried yet (a warning, also in strict mode).

The merged view of a session package copies `pronunce.yaml` and `pronunce-gioco.yaml` (`strumenti/unisci_pacchetto.ts`).

## The ear test: `strumenti/pronuncia/prova.ts`

```
npx tsx strumenti/pronuncia/prova.ts campagne/<id> [--voci fish,qwen] [--url-qwen URL] [--nuovi] [--aggiungi]
     [--gioco] [--solo Nome1,Nome2] [--senza-modello] [--modello haiku] [--ripetizioni 1] [--non-scrivere] [--dry-run]
```

For each name:

1. **Respellings to try**: the written name (what the voice does without the lexicon), the current `grafia`, the
   `candidate`, and, when there are fewer than two, three proposals from Claude Code (`claude -p`, no tools, one call for
   all the names, `strumenti/pronuncia/proposte.ts`), together with the intended `suono` for a new name. A word the model
   says is not a proper noun in this story (a title like «Signora», an ordinary capitalised word) moves from the new
   entries to `non_nomi`. An answer that cannot be read is saved in `logs/pronuncia-proposte-<id>.txt`.
2. **Voice**: each respelling inside the carrier sentence of the language (`lingue/<l>/testi-varie.yaml →
   pronuncia.frase_prova`: «Stasera parliamo di {nome}, poi andiamo a dormire.») is synthesised with the game's own
   engines, the narrator's voice: drama-3 via OpenRouter and/or the local Qwen service (`strumenti/pronuncia/audio.ts`).
3. **Ear**: Whisper (`openai/whisper-1` via OpenRouter) transcribes it; the words in place of `{nome}` are compared with
   the intended sound (`suono`, else the Preparer's `grafia`) on a rough phonetic key per language
   (`strumenti/pronuncia/punteggio.ts`: «dz»=«z», «ch»=«k», «ee»=«i», English silent e, double letters single; average
   of the similarity of the whole key and of its consonants). Whisper writing back the exact written name counts as
   understood; merely resembling it does not (the naive «Nee-am» resembles «Niamh»).
4. **Choice: the model interprets, the score only vetoes** (`strumenti/pronuncia/scelta.ts`). The score is rough
   (a phonetic key on a Whisper transcription: once «ZEER-eye» scored 0.93 against the intended «ZEER-ay» 0.81), so
   it does not choose between respellings that are heard right. The intended respelling (the Preparer's `grafia`,
   else the proposer's first candidate, which it gives best first, else the name as written) is kept when it is within
   0.05 of the best or scores at least 0.8 (the wrong readings measured so far score 0.3–0.75). Only when it comes back
   clearly wrong, below 0.8 and more than 0.05 under the best, does the score choose: among those within 0.05 of the
   best, one that only adds accent marks to the name (Whisper does not hear the stress), then the name as written, then
   the order given. Scores are averaged over `--ripetizioni` listenings (the same text does not always come out the
   same: drama-3 once said «Libia» for «Livia») and over the voices, each candidate scored as each engine would really
   say it (Qwen hears `stileQwen` of it; every candidate is also tried in Qwen's style). Then the same rule per engine:
   the form an engine gets from the choice stays unless it comes back clearly wrong there, and then that engine's best
   becomes its own form in `motori`; engines not tried keep theirs.
   The tool writes `grafia`, `suono`, `motori` and `verificata` into the lexicon (comments kept), the table to
   `logs/pronuncia-<id>.md` and one line per listening to `logs/pronuncia.jsonl` (`TAGM_LOG` moves both).

`--aggiungi` first imports the sheets' `pronuncia` fields and the names the validator reports as `nome_senza_voce`: this
is how an existing campaign gets its lexicon. Exit: `0` done, `1` error, `2` bad arguments, `3` no voice available.
Cost: about a quarter of a cent per name and voice for each repetition (drama-3 is $2 per million bytes, Whisper
$0.006 per minute); torre-mozza, 19 names, two voices, two repetitions: $0.08. Qwen requests time out after 60 s: with
two runs on one Qwen service some listenings are lost (the mean uses the ones that arrived).

`scripts/prepara.sh` runs it as step **1b** on the entries not yet verified (`--nuovi`), with drama-3, and with Qwen only
when `TAGM_PRONUNCIA_QWEN` gives the address of a voice service (never the one of a game in progress);
`--senza-pronuncia` skips it.

What the ear test can and cannot hear (first runs, 11 November): on Italian names drama-3 and Qwen mostly read
right already (score 1.00 without the lexicon); the misses are the stress (not visible in a transcription) and the odd
slip («Libia» for «Livia», «tombi» for «Tondi» in one listening out of two). On names that are hard for English the
respellings help clearly (en-nomi fixture, drama-3 / Qwen, two listenings each): «Cadwgan» 0.68 / 0.63 →
«KAD-oo-gan» 1.00 / 0.97, «Dubhghall» 0.87 / 0.76 → «DOOG-al» 1.00 / 1.00, «Niamh» on Qwen 0.75 → «NEEV» 1.00. Qwen
spells out syllables in capitals as if they were acronyms. Per engine, three listenings each: «ee-VAWN» drama-3 0.90,
Qwen 0.42 («Eval WN»); its Qwen style «Ee-vawn» Qwen 0.90 («Yvonne»), so the lexicon keeps «ee-VAWN» and Qwen gets
«Ee-vawn». «KAD-oo-gan» Qwen 0.91 against «Kad-oo-gan» 0.82: Qwen reads «KAD» as a word, but «Kad-oo-gan» is not
clearly wrong (0.82), so no own form (the default style costs a little there and saves a lot on «ee-VAWN»). Phonetic keys are rough: two
respellings a few hundredths apart are equal, and the ear test can move the stress, which it cannot hear.
Whisper also «corrects» towards ordinary words («Faggioli» → «fagioli»), which caps some scores.

Not available yet: a local Whisper (mlx-whisper needs torch and the whisper-large-v3-turbo weights, about 3 GB; the
transcriber is an interface in `audio.ts`, ready for a second implementation). Without an OpenRouter key the ear test
is skipped and the lexicon stays as the Preparer wrote it.

## During play: names that were not prepared

Players invent names in their actions («I ask Zorvak about…»), and the scriptwriter writes new ones in its lines. No
extra model call (`apps/server/src/voce/lessico-vivo.ts`):

1. Every background request to the scriptwriter (`prossime`, never a `subito` a player is waiting for) carries
   `nomi_senza_pronuncia`: capitalised words in mid-sentence of the last lines heard at the table that the lexicon does
   not know (at most 8, each asked at most twice).
2. The scriptwriter answers, next to `battute`, with `pronunce: [{nome, grafia, nota}]` for the ones that are proper
   nouns and for any new name in its own lines (prompts/<l>/sceneggiatore.md).
3. The Engine accepts a proposal only if the name was asked or appears in the accepted lines, is not already in the
   lexicon, and name and respelling are short plain text; it appends it to `campagne/<id>/pronunce-gioco.yaml` with
   `origine: {fonte, turno}` and `verificata: false`, and recompiles the pronouncer: from the next phrase the voice
   uses it (and so does the audio of the scriptwriter's lines prepared in the background).
4. Between sessions the Preparer reviews those entries and moves the good ones into `pronunce.yaml`
   (`.claude/skills/preparatore/riferimenti/tra-le-sessioni.md`); `prepara.sh` tests them by ear.

With the scriptwriter off (`TAGM_SCENEGGIATORE=no`, the tests) nothing is asked and nothing is added.

## Tests

- `apps/server/test/pronuncia-lessico.test.ts`: whole words, inflected and unaccented forms, multi-word names,
  `solo_maiuscolo`, the campaign language and the English possessive, the sheets' `pronuncia`, nothing on screen
  (`testoPerVoce`), the in-game proposals (checks, file, reload).
- `apps/server/test/pronuncia-e2e.test.ts`: a whole English game on the fixture `en-nomi` (Aoibheann, Niamh Dubhghall,
  Cwmtaith…): the voice engine receives only respellings, projector and transcript only the written names, and a name a
  player types («Brychan») goes to the scriptwriter, comes back with its respelling and is said that way afterwards.
- `apps/server/test/pronuncia-punteggio.test.ts`: phonetic keys, the name out of the carrier sentence, the score.
- `strumenti/test_valida_campagna.py -k pronuncia`: the `PRONUNCIA` class.
