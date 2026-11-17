# To do (updated 15 November 2026)

Living list of open items, with who is handling each one. The decisions taken are in the project documents.
Checked on 14 November 2026 against the commits of 2–12 November (the last commit is 12 November), against
`docs/e2e-finale.md` (§6, §7, §9–10), `docs/strati.md`, `docs/pronuncia.md`, `docs/profili.md`, `docs/provider.md`,
`docs/combattimento.md`, `docs/regole.md`, the code, and the image manifests of the campaigns.

## Final goal (Riccardo, 10 November 2026)
**Anyone who pastes the repository link into their own Claude Code can play, without keys.** Nothing may be mandatory: by default everything runs locally or on Claude Code (the subscription of whoever uses it); external keys (Anthropic for a better reader, OpenRouter for the drama-3 voice, Freesound for sounds…) are a bonus for those who want to tinker. What is needed:
- a **guided setup phase run by Claude Code** (a skill in the repo, read by whoever pastes the link): it recognizes the computer (system, chip, RAM, GPU, disk) and chooses by itself the fast reader, the image model and the voice that suit it; it downloads what is needed, proposes the optional keys, writes a local configuration outside git, and closes with an automatic check;
- **every module** behind a configuration choice with reservations: reader (local | Haiku | others), voice (local | drama-3 | fake), images (local | none | API), sounds (free sources | Freesound);
- the online documentation updated once everything works.

## In progress
- **Checks and rolls (15 November 2026)**: manual player rolls (default), automatic as an option, checks asked from the
  panel, the Game Master's background rolls, surprise, the C4 harness fix and the first live verification
  (d14f89c…d2f7ba4); then the six remaining steps, closed the same day (evidence in docs/prove-verifica.md):
  1. ~~World dice without sheets~~ **Done** (4207e54): the world hands its own saved dice to the roll hook, the Game
     Master path uses them when there are no Engine dice; a resume replays them, the log, panel and voice line stay.
  2. ~~Manual rolls cover all the player's own rolls~~ **Done** (1556ad5): damage after a hit, initiative, death saves,
     the contest's other PC, asked round after round from dry runs on a copy of the Engine (prove/dadi-tavolo.ts); the
     2d6 difficulty stays out of the phone's bonus; a switch to the Engine holds for the turn.
  3. ~~World questions and NPCs' own checks out of combat~~ **Done** (9155e4c): `domande` of the scene sheet (odds or
     an NPC's check with its sheet) through the Game Master's path; validator `DOMANDE`, skill, guide, torre-mozza.
  4. ~~DC choice~~ **Done, partly** (4fce41b): the rules arbiter follows the set's ladder from signals in the action and
     the scene (17/20 → 20/20, 7/10 → 9/10 on ten new actions); Haiku 15.3 → 18.0 of 20 over three runs, 10 → 9 of 10.
  5. ~~C5 attacks on creatures without a sheet~~ **Done** (c9298ad): minions (`gregari`) with a stat line by type;
     an attack at nobody with stats tells the narrator not to invent one; validator `SCHEDA.gregari`.
  6. ~~Live checks~~ **Done** (df6ffb3): dictation into the roll card end to end with the real Whisper
     (apps/web/e2e/tiro-dettato.spec.ts); a Basic Fantasy fight on torre-mozza with every die manual, morale failed and
     the goblin fled (docs/prove-verifica.md §6b).
  Still open:
  - Haiku still answers «impossibile» for lifting a cart, with a `motivo` that contradicts the verdict (the verdict
    field comes before the reason): a reason-first field or a deterministic check (docs/prove-verifica.md §5). A
    reason-first field was measured on 16 November: the cart solved, the twenty down from 18.0 to 15.7: dropped;
  - initiative by sides is unit-tested only (no example campaign's set uses it);
  - ~~the told-facts guard added a duplicate «Zirrà fugge.» after a narration that told the flight («sparisce oltre il
    crollo»)~~ **Done** (16 November): a row with no subject continues the row before (docs/combattimento.md §3.7);
  - ~~a fight opened from the panel rolls the PCs' first initiative with the Engine's dice~~ **Done** (16 November, item
    11c): with manual rolls it starts at the next closed window, after its actions, and every PC rolls initiative there
    (docs/prove.md §8); side rolls stay the Engine's;
  - to check: with automatic rolls the panel's fight still starts at the click, and the next window's `dopoAzioni`
    (prove/combattimento.ts) advances past step 0 before running any step, so an NPC first in the order seems to lose
    its first step (read from the code, not reproduced; the manual path starts inside `dopoAzioni` and runs it);
  - «the goblin» meant for a named NPC (Zirrà) without her name still finds no target (no roll);
  - no example campaign uses minions yet; world questions and minions not yet seen in a live run.
- **Final end-to-end pass on today's code**: done in profile B (docs/e2e-finale-3.md, 958556a: not ready), and its fix
  pass (§7 there, 16 November), which became the **coherence layer** (docs/coerenza.md: ledger, «Cosa è vero adesso»,
  one checker with named rules, audience split for private actions, presence tags, targeted repair, the panel's
  «Coerenza» box). Measured on 2a7697c (`esperimenti/risultati/e2e-finale-3b/coerenza-*`): private content 0, order
  said, DC hidden, first-audio 1.85 s against 2.43 s, but its criterion is **not met** (two definite and about fifteen
  probable high-severity sentences heard) and the stall run stayed idle. Round 2 on f29235d (`coerenza2-*`, with
  `R-inesistente`, the stall fixes): still not met (19 high-severity sentences against 17; the stall now climbs with
  material), docs/coerenza.md «Measured, round 2». No round 3: R-inesistente and the absorbed-blow rule went to
  observation (a556dc4), and checkers are now scored offline on a frozen replay set (esperimenti/coerenza/, labelled
  once, plus a held-out set): the rules catch 76 of 117 violations (25 of 37 held-out), the yes/no judge (a small fast
  model, one question per flagged sentence, the rules in its shadow) 106 (33), with 7 (2) clean sentences touched; the
  judge is wired for profile B (067d18f, TAGM_DOMANDA), one smoke run without crash at ~1 s a question; silent exits
  (79d3068), a neutral line for invented names in mode B (bc0010e) and `[nuovo png]` in mode A (d1f0e40) are built.
  Round 3 (6912f11, the judge on; only combat-manual valid, the API credit ran out): 10 → 6 → 3 high-severity sentences
  heard, first audio 2.09 s on that script. Fixed offline after it, no model call (docs/coerenza.md, «After round 3»):
  the first sentence never waits for the judge (the Engine's line of the flagged mention said at once, bf39510); an
  action whose answer was dropped gets the Engine's line, with no repair call (3db96ee); attacks and flights with no
  name inherit the cards' actor (b3db103); after a late answer the rules carry the subject (3551e4d); on the replay
  sets the director's path scores 107/117, 33/37, 27/31 with 8, 3, 3 clean touched.
  Profile A (Riccardo, 16 November: the small model only relays): lines carry their facts (`attori`, `menzionati`,
  `richiede.stati`) and the Engine filters them against the ledger before the reader (8524e7c); the reader measured
  tiny (Qwen3 0.6B as good as the 4B and as the Engine's first indicated line, e841553); round 4 in profile A on the
  four blind scripts, judged by opus (rounds 1–3 were haiku): H heard 4 / 3 / 1 / 0, of which 1 in the lines' own
  prose (a scriptwriter's miss line for a hit) and 7 in the announcement quoting the players' false claims; 0 private
  contents, 0 fallen or absent characters acting in the prose (docs/coerenza.md, «Measured, round 4»). Open there:
  outcome lines must carry the outcome as a fact; late `subito` lines; the announcement quoting false claims; the
  idle stall; R-inesistente on the announcement of the very blow that kills. Fixed (d713e78…46d17ec): the announcement
  attributes the player's words and leaves out claims and other people's clauses; R-inesistente spares whoever fell in
  that turn; `richiede.esito` on outcome lines, checked against the card; a `subito` line bound to its turn; stall lines
  kept for the stall moves (`stallo: 1 | 2 | 3`). Round 5 in profile A (opus judge): H heard 1 / 1 / 0 / 0, all in the
  lines' prose, 0 from the announcement; both stall moves said a prepared line; no `subito` line said for a later
  action (docs/coerenza.md, «Measured, round 5»). One fix after it, not measured live (26529fe: the due facts no longer
  count the announcement). Open from round 5: the scriptwriter never writes `richiede.esito` (21 lines refused in the
  fights instead), and a line can tell an outcome with no outcome word («Ahi! … prendi questa»); the stall counter (a
  turn naming an NPC present is never a stall, so ST's first move came at T14); a fallen party leaves the table with
  nothing happening; declared attacks the rules arbiter gives no roll («lo colpisco ancora»); the announcement keeps an
  «Io sono…» claim and drops a question's «?». All six fixed (a761302…a126c90); round 6 (opus judge): H heard 0 / 1 /
  0 / 0, the scriptwriter tags 97–98% of the fight lines that need it, ST had 9 stall moves with material, the defeat
  path fired once (docs/coerenza.md, «Measured, round 6»); two fixes after it (ce48fe3, not measured live). Open from
  round 6: a line can take a player's claim about a PC's state as true («Tre per terra», CA T15: a PC's state is not a
  fact a line carries); the outcome-word refusal is mostly noise on narration («il buio cade»); «go» to a place the
  campaign does not have commits by the words, so FB never stalls; attacks with no first-person verb («Pugnale
  ancora») still get no roll; an NPC answers words addressed to an NPC who does not exist; the announcement keeps a
  world clause after the PC's own words and cuts some quotes mid-phrase. All six fixed (9ee3ff6, 21d227c, b656a38,
  20c7f44, a506565, cb3a178); round 7 (opus judge, closes the coherence work for now): H heard 0 / 0 / 0 / 0 (CM 1
  unsure), tags 96–97%, 10 stall moves all right, the defeat path twice (docs/coerenza.md, «Measured, round 7»). Open
  from round 7: ~~the live lexicon (`pronunce-gioco.yaml`, written by test runs into the campaign's folder) made
  «Oreste» a known name, so the invented-name line never fired: count only verified lexicon entries, and keep test
  runs out of the campaign folder~~ **Done** (86ad009); «Pugnale ancora» with a target named needs the go-on words in the named-target path
  too; ~~the S3 leads sentence lists the last
  clock sign as a road~~ **Done** (A38); ~~a scriptwriter line can confirm a place that does not exist~~ **Done** (A39); ~~a commitment toward something that does not exist still resets the stall~~ **Done** (A37); repeated catchphrases.
  Still open: a round 4 in profile B measured live (needs Riccardo: API credit for profile B; provider not chosen); a full measuring round of the judge (round 3 had one valid game of four; needs Riccardo: API credit for profile B); the private replies stay on the rules
  (their raw text is now logged, for a replay set of their own); R-fuori's whole-sentence state check (the judge
  replaces it in profile B, not in profile A); the cart «impossibile» (11a);
  `R-eco` and the projector mark; ~~the stall's S3 sentence said twice word for word~~ **Done** (A10); profile A (the reader plus the
  Mac's swap were too much on 16 November) and the dictated action not run. The «Coerenza» box was seen in headless
  Chromium on a live test instance (16 November, 0 console errors), not on a real tablet (needs Riccardo: a real tablet).
- **Duration in sessions and game layers** (Riccardo's request, 3 November 2026): the brief states the estimated duration in *number of sessions*, and that determines how many layers the framework generates. A one-shot has few things (situation, a few scenes and NPCs: this is what the skill does today); a campaign of years has more phases or arcs and a complete world, and the material for the next session is prepared between sessions, starting from what actually happened.
  Done, by step: research (c0ebcc1), design (96b59e7, 6e2df77), `strumenti/strati.py` (09b3ef4), validator of sessions and STATO/CONTINUITÀ (e02e26c, 8fcfe18), skill (a10a172), session packages and the server side (2d3f2d4, 5bc833b, 7201894).
  Still open: no campaign above one-shot has been played across several sessions yet (no commit records it), so this is not yet verified on a real run (needs Riccardo: a multi-session campaign played).
- **Blind test of the Preparer skill**: a new agent writes `campagne/ponte-lanterne` following only the skill.
  The blind judgement of the first campaign written from the skill (nozze-neve, 65f572a) is done. No commit records ponte-lanterne being written blind from the skill alone.
- **Images**:
  - ~~**location nodes without an image**~~ **Done**: the validator now says it (`strumenti/valida/regole_immagini.py:163-176`, from d252dd1), and `n_sasso` was fixed in d252dd1. The validator rule is in place; the text of skill v2 was not checked here;
  - **the style sheet must not impose the weather on everything**: the style sheets no longer name rain (`campagne/*/stile.yaml`), ~~but the flagged images below still show it inside. Better the weather in the prompt of the outdoor locations than in the style. Open until those images pass;~~ **Done** (1a9fa04 "stop the rain falling inside rooms, regenerate five images"; 924646d; ponte-lanterne manifest entries all «ok»).
  - **Sebastiano's hands** (prova-f0) and **the tavern's trellis**: the prompt is not enough, it must be changed in the sheet («hands hidden inside wide sleeves», tighter framing). Open: no change to the sheet found; **Parked by Riccardo** (15 November 2026: image quality is not a priority, «che venga bene o venga male non è un problema»);
  - **the visual check does not see everything**: in the 3 November trial it missed the soot smudges on Bice's face and the shawl still on Adelina «senza scialle» (without shawl); the cases to look at remain in `stato_preparazione` («da controllare a mano» (check by hand)); **Parked by Riccardo** (15 November 2026: image quality is not a priority, «che venga bene o venga male non è un problema»);
  - **Images flagged by the visual check** (`campagne/*/immagini/manifest.json`, `qualita.esito` «difettosa» (defective) or «da_controllare» (to check); read on 14 November):
    - `prova-f0`, difettosa: ~~`ritratto_png_baldrin`, `situazione_png_baldrin_in_scena_forno_vecchio`~~ **Done** (manifest «ok»); `situazione_png_sebastiano_senza_cappuccio` **Parked by Riccardo** (15 November 2026: image quality is not a priority, «che venga bene o venga male non è un problema»);
    - `ponte-lanterne`, difettosa: ~~`situazione_png_vischi_in_scena_casa_del_sale`, `situazione_png_vischi_in_scena_terzo_tocco`~~ **Done** (924646d, 563aec4);
    - `ponte-lanterne`, da controllare: ~~`luogo_scena_casa_del_sale`, `ritratto_png_rosa`, `situazione_png_vischi_studio_cassa`~~ (this one was re-seeded in 924646d and is now marked «da controllare» again) **Done** (924646d, 563aec4: manifest «ok»);
    - `nozze-neve`, da controllare: `luogo_scena_sasso`, `situazione_png_ettore_lettera_in_mano`; **Parked by Riccardo** (15 November 2026: image quality is not a priority, «che venga bene o venga male non è un problema»);
    - `torre-mozza`, da controllare: `situazione_png_ugo_col_cervo`. **Parked by Riccardo** (15 November 2026: image quality is not a priority, «che venga bene o venga male non è un problema»).
    The manifest is the source: an image stays open until its entry says «ok».
- **Server**:
  - ~~Engine, proposals from the trial run: `richiede.oppure`, `orologi[].parte_dopo`, lines only from the NPCs present in the scene~~ **Done**: `richiede.oppure` and the present NPCs (663e950), `parte_dopo` (a27034e, the clock runs only after the right line or clue);
  - in mode A (improvised) the clues have no ids: the situations come out only on command from the Game Master; and with campaigns over several sessions this is more urgent, because the end-of-session log in mode A has no clues, lines, lies or known facts (null sections, docs/strati.md): the next session is prepared only from clocks, scenes, actions and transcript. A way of tracking clues in A too is needed (for example a line `[indizio] <id>` from the narrator, checked by the Engine like `[orologio]`). Open: I found no commit for it.
- ~~**Hidden characters in the scene** (request 2 of 9 November): a field `nascosto: true` on the NPC sheet is needed, for those present who are not shown on the projector nor on the phone until they are revealed (like the `dopo` situations).~~
  **Done**: `nascosto: true` on the sheet, the «rivela» (reveal) command from the panel, validator and schema (d59f7e2).
- ~~**Presence decided by hand by the Game Master** (command `presenza`): it does not survive a server restart (it is lost with the in-memory state); to be saved in the session log if needed. It is also reset at scene change.~~
  **Done**: decisions go into the session snapshot and come back on resume; the scene change resets them (a4e360d).

## Later
- **Gaps in the Basic Fantasy set from the final e2e** (docs/e2e-finale.md §2 and §7, «dadi» (dice)):
  ~~closed 11 November 2026 (HIDDEN/NASCOSTA marker in every language, death and natural d20 checks from the set, table-based modifiers, individual `ogni_round`, percentages and "x on 6", automatic weapons, the two validator checks)~~
  **Done**: markers (3238277), death-save naturals and d20 criticals (2d78978), table modifiers (bc15b8d), individual `ogni_round` (b75a693), percentages, x-in-6 and always-hit weapons (554972f), validator checks (19f863d). Still open: simultaneous initiative ties, natural d20s for attacks AND saving throws only (today `critici: attacchi | tutti`), ~~surprise with 1d6~~ **Done** (e04058e), range, charge and attack from behind as modifiers of the set.
- **Setup on non-Apple computers** (docs/profili.md, profile `altro` (other)). The guided setup run by Claude Code (`.claude/skills/setup`) says that local reader, local voice and local images are not yet supported outside Apple silicon (docs/profili.md:24). Without an Anthropic key the narrator is the scripted one (a trial, not a real game). Done meanwhile: the computer is detected as JSON (1d3fd81) and the profile is chosen per computer (004a135). To do: a local reader on Linux/Windows (llama.cpp or Ollama with the same protocol), a local voice (see below) and image generation (today only mflux, Apple). Until then, the setup tells the user to choose the Anthropic key or text-only play.
  **TODO (decided by the lead, setup):** a local LLM through Ollama or llama.cpp, on the same OpenAI-compatible API
  as the Mac reader (port 4613, `backend.locale.url`), and a light voice (Piper or Kokoro). Claude Code installs them
  only with the user's explicit permission, and the setup skill (`.claude/skills/setup/SKILL.md`) is where that step lives.
- **Local voice outside the Mac.** Qwen3-TTS runs with MLX only on Apple Silicon. On Linux or Windows a light alternative is needed, with the same API as the voice service (docs/f0-contratti.md, «Servizio voce» (Voice service): POST /tts, PCM s16le streaming). To evaluate: Piper (onnx, Italian voices, CPU) and Kokoro (82M, CPU or GPU). Italian quality: to be verified. Not started: no Piper or Kokoro code in the repo.
- ~~**Known limits of local mode.** The check arbiter at closing has 4 s: locally it cannot make it, so there is no roll. The arbiters yield the server to the reader: while queued they wait at most 8 s, then fall back on the rules.~~
  **Done**: the local default for the check arbiter is the rule classifier (fd0e2bf), and in local mode nothing waits at close (cf62850); the 8 s limit is in docs/provider.md.
- **Preparer skill: drama-3's expressive voice** (9 November 2026; to be handed to whoever updates the skill; nobody has replied). The game's voice is drama-3 (docs/ricerca-voce-drama3.md). Repertoire lines can have a short direction at the start of the line (`[png_ettore] [offeso, ma a voce bassa] Non venni.`, in the example: "[offended, but in a low voice] I didn't come."), sounds (`[sigh]`, `[laugh]`, `[breath]`, `[pause]`) and closed tags within the same line (`<whisper>…</whisper>`, `<emphasis>`, `<soft>`, `<fast>`, `<slow>`, `<stress>`, `<forceful>`); the validator checks them (class `VOCE`: known and closed tags, directions under eight words and without periods, at most three marks per line), and the prose counts only the words. The NPC sheets can fix the default direction in `voce.tts.direzione`; the style sheet, that of the narrator in `direzione_voce`; without them the server composes it from `personalita.superficie`, `voce.tts.timbro`, `eta_apparente` and `velocita`. The validator class and the prompts are in (eca71a0, c056acc). To add to the skill (SKILL.md, the step for NPC sheets and the repertoire): when to use a direction (real tone changes: lies with their giveaway sign, confessions, threats), not in every line, and never to say what the PCs feel. Open: that guidance is not in SKILL.md yet, as far as I could check. The `pronuncia` of names stays as it is.
- **Engine: the limits the campaign has to work around today** (from the nozze-neve trial; the page `.claude/skills/preparatore/riferimenti/motore.md` describes them and is checked against the code by `strumenti/motore_limiti.ts`: when one of them falls, the test turns red and the page is updated). To implement:
  - **private actions**: today only lines with `privata: true` answer; a private action without suitable lines should have at least one discreet answer on the phone, not silence or an answer out loud. Open: no fallback found in `scena/` or `narrazione/`;
  - ~~**`avanza_quando`**~~: done 15 November: the gates of `avanza_quando` (`mondo/porte.ts`, docs/mondo.md §2) owe marks to the clock for facts (lines, clues, scene changes, lingering, actions' themes, failed checks, a fight); the free-text entries stay notes. The example campaigns use them (15 November): nozze-neve and ponte-lanterne's «+1 a ogni cambio di scena» and accusations, prova-f0's noise and threats, torre-mozza's leaving the sheepfold and a hidden roll (`tiro`) on the village's suspicion;
  - ~~**clock jumps at scene change**~~: done 9 November (`orologi_in_scena` of the scene sheet: `pieni_almeno` and scene pace, 1099bca); the "+1 at every scene change" is now a gate (`{quando: cambio_scena}`);
  - **endings per state**: a way to tell the Engine that "the dramatic question has an answer" (outcomes of the scene with their gates), instead of entrusting the endings before the full clock to the themes. Open: 2117940 gives one ending per scene, not the outcomes with gates;
  - **object state**: who has what, at least for the objects with an id in the scene (`elementi_interattivi`). Open;
  - ~~**lines "per state" without `> pg`**~~ for the endings: done 3 November (at full clock, the ending and the closing are stated by the Engine, c98b34b); the validator no longer warns (`COPERTURA.finale_senza_azione` is removed, 82b1d32).
- **World that moves: still open** (docs/mondo.md, 15 November; live runs in esperimenti/risultati/mondo-live-B/):
  lines with their own `effetti.atteggiamento`; a dedicated theme-less line for torre-mozza's mark-3 consequence (today
  `ber_salgo_io`, a filler the reader may use first, so the consequence falls back to `detto`); a live run with Haiku
  (only the local reader was tried: no key on this machine; needs Riccardo: an API key for Haiku); the 38 turns/hour default rests on one human evening in
  the logs; «Decided (17 November): kept as the starting value; the Engine replaces it with the rate this table plays.» A log line when a social check is not applied because it would make an NPC hostile. Open.
- **World: Game Master command to set an NPC's attitude by hand** (docs/mondo.md §4). The Engine and the panel's «Mondo» box
  show attitudes changed in play, but the Game Master cannot change one from the panel yet. Postponed on 15 November while
  prove-tiri edits the /master panel. Open.
- **Line selector that does not find the lines** (trial run of nozze-neve, conclusions §4; 115 lines out of 139 never came out). ~~In the code since 9 November (commit 2597566, with unit tests): preselection by the action's `temi` (with the right voice, at most two per action, a section «Battute indicate» (Indicated lines) in the message) and "> pg" deduced or corrected when only one action can be the right one.~~ **Done** (2597566). To do:
  - the before/after measurement with the harness on the same scripts (`esegui.ts nozze-neve/<copione> B --campagna nozze-neve --uscita correzioni-motore/<cartella>`, port 4740), postponed for the token budget: compare the pre-written quota, the lines used, `usa_rifiutati_per_motivo`, `battute_indicate_usate`, `pg_dedotti`;
  - decide whether the Engine must have a clue that was indicated and ignored say it by itself: replaying the catalogues, the filter by themes also indicates wrong lines (the Custode's rules for «prima della benedizione» (before the blessing)), so today it does not. «Decided (17 November): the Engine does not force an ignored clue; the stall's S2 brings a proactive clue instead (docs/mondo.md).»
  - the repair with a second call for the [usa] rejected for other reasons (off-catalogue, pace).
- **Skill and validator** (done 2 November evening, from the 26 notes in `NOTE_SULLA_SKILL.md`): the real context of mode B compiled with the server, chronology and logistics (`MONDO`), similar voices (`simile_a`), steps reordered with `--solo`, several scenes, scripts with `scena` and `richiede`, images (`prompt_ritratto`, `nodi[].immagine`, `situazioni[].dopo`). Still to test: a second blind trial with the new skill.
- **Secret keeper** (Custode dei segreti) (`esperimenti/giudizio-ab-2/conclusioni.md`): a yes/no check for the lines that reveal a secret, to be taken up when the quality of the narration is resumed. Not started: no code for it in the repo.
- **F1 filters** (agency, referred lines, length, canon, closing with an invitation): when the narration is resumed, with the definitive APIs.
- **Voice**: paused until the final phase, with a structured API that allows adjusting the intonation. The pre-render code for the lines is ready (`apps/server/src/strumenti/prerender.ts`). Done meanwhile: the per-campaign pronunciation lexicon (92b68f9, 00a19a0), and 34 of 34 names heard right by ear in the third pass (88af2dc).
- **Music** (F5): local generation test (ACE-Step or Stable Audio 3 with Hugging Face login) or a CC0/CC-BY library; align the tag vocabulary between manual §4 and the architecture. Partly done: the audio pipeline uses a CC-BY library (c2a6d05, `docs/audio.md`); the tag vocabulary alignment and the local generation test are open (needs Riccardo: Hugging Face login for local music).
- **Real phones in the room**: **Done** (HTTPS and speech-to-text): the game serves https on the same port 4610 with a local mkcert certificate (`scripts/certificato.sh`, one install per phone, `docs/guide/phones.md`); the phones' speech is transcribed by a local whisper.cpp server, with names spelled right (`docs/ascolto.md`).
  Still open: verification on real Android and iPhone devices (the microphone after the certificate is installed, and whether tapping through the warning is enough: not documented by Chrome or Safari) (needs Riccardo: a real phone); a Linux and Windows test of whisper.cpp.
- **Rule set: conditions and subsystems** (docs/regole.md §6): today they are only text in regole.yaml (`condizioni`, `sottosistemi`). The Engine does not apply them: no «prono» (prone), «spaventato» (frightened), sanity or magic state, with their effects on the rolls. Waiting for a real set that uses them (docs/regole.md §6). Open: no code for them in `apps/server/src`.

### Open from the final end-to-end test (docs/e2e-finale.md §6, §7, §10)
- ~~**Bugs closed and confirmed in play**~~ **Done**, with the commit that closes each one: A1 privacy (16fe790, 377a36e, eff935c); A2 private outcome without the name (eff935c); A4 hidden markers (3238277); B1 release lines on unrelated actions (57c8ce7); C1 dead or down NPCs keep acting (8abae9c); C2 narrator omits combat facts (cdb076f); C3 morale invisible, fled NPC stays (8abae9c); D1 absurd keyword cards (358c91c); D3 premature scene ending (57c8ce7); D6 whispered question rolled as «Ascolta» (989d8fb); E1 images stopped at 3/14 (f98401e: the 14 images of torre-mozza are on disk); E2 `estrai.py` merged sections (1a7839b); L2 fake-voice warnings (9d06809); N1 legacy variable names (c1db46a); N2 «Narratore manca …» (d73808b); N3 idioms taken as a fall (cf39acd); N4 deflection from a non-addressed NPC (9d06809); N5 sceneggiatore lines refused for their form (9d06809); N6 local reader dies without a restart (28a7bd6); N7 cut closing summary (9d06809). The third pass confirmed N2, N3, N4, N5, N6, N7, D2 (Engine part, 6eff704, 3406550), D6, A1, A2, L2 in play (88af2dc).
- **B2** leak detector blind to release lines: partly. The releases no longer happen (57c8ce7), but the second-pass judge still found `nar_piccone` counted as clean. Open.
- **B3** verbal tics (Zirrà «ride corto», «Non so, non m'importa. Parliamo di prezzo.» as a stock deflection). Open: the tic rule exists only for the sceneggiatore.
- ~~**C4** in combat, script actions sent out of turn are deferred and re-judged stale. Open: the harness should send, in combat, only the action of the PC on turn (`esperimenti/`).~~ **Done** (d14f89c: "Harness: in combat send only the actions of the PC on turn").
- ~~**C5** attacks on creatures without a sheet become a check against 17, and the narrator invents goblins.~~ **Done** (minions, `gregari`, docs/prove.md §2); left: «the goblin» meant as a named NPC without her name is still no roll.
- **D2** validator check that a line giving what a check gates must not come out after a failed check. The Engine part is done (6eff704, 3406550); ~~the validator check~~ **Done** in 19f863d («a check another oppure path bypasses»); not yet confirmed by a run.
- ~~**D4** announcements: partly. 192bcff makes them never empty and cuts them at a sensible boundary, but the quotes of the player's words still come out broken («Livia Sarti: «Blocco un goblin ferito contro il muro: «Dov'è il ragazzo».»).~~ **Done** (4320e25): the inner quote marks are dropped from the citation, so the wrapper has one pair.
- ~~**D5** cards say «contro CD 14» for an attack against the Armour Class, and repeat the label.~~ **Done** (87ce932): an attack against a defence is typed CA (AC in English, from the language package), and the label is not repeated when the attack has no ability.
- ~~**E3** the session clock stays at 1/8 in every run (`o_mezzanotte`), so midnight never threatens and no game reaches the final choice in 16 turns. Open.~~ **Done** (2fbe575: the clock paces itself over the evening; not checked against `o_mezzanotte` in a run).
- **L1** 12 ERROR lines per run «parola segreta nel messaggio del selettore» when a player types their own private knowledge. 3334bce takes out the players' words and the narrator's echo of them, but the third pass did not confirm it in play. Open until a run shows no ERROR.
- ~~**L3** `PROVIDER:` start-up lines say «configurato» also when an environment variable forced the provider.~~ **Done** (2cc619a): the line names the variable (its name only, never its value) or the config file.
- **L5** the harness's `tavolo.md` does not contain the dice cards the projector showed. Open: the judge uses `esperimenti/e2e-finale/tavolo_con_carte.py` as a workaround.
- **L6** validator and skill points: the validator does not check `parole_chiave` ids; `SCELTA.premio` stop-words miss «dalla/dal»; `regole_vincoli.py` «non <verbo>» false positives; the skill points to `lingue/<lingua>/preparatore/skill.md` while the references say `riferimenti.md`; the «stalla» ambience comes from a recording of geese. Open (the first is probably covered by 19f863d; not re-checked).
- ~~**L7** Haiku once wrote a line id as a label («[zir_ragazzo_mio]»), and the narrator read it aloud.~~ **Done** (ba9e74a): a bracket whose content is a repertoire line id is removed before the voice, with a warn log; the direction and sound tags stay.
- **A3** content-free lines that still show who acted in private: accepted in the second pass, not a bug to fix.
