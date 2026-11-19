# Coherence: one ledger, one block, one checker (design, 16 November 2026)

What this page is: the design of the coherence layer Riccardo asked for after the third e2e pass («sistema i bug,
studia un sistema che fixi in particolare la coerenza; usa qualcosa per segnarti queste cose e far sì che diventi
visibile quando necessario»). It replaces the habit of one guard per bug. Status: **built on 16 November** (steps 1–7
of «Order of work», `85a8340`…`2a7697c`), **measured** on the three blind scripts («Measured, round 1»: the success criterion
is not met yet), then fixed further (`5870930`…`97121cb`), measured in rounds 2 and 3 (the yes/no judge on), and after
round 3 fixed offline with no model call (`bf39510`…`3551e4d`, «After round 3»: not measured live, the API credit is
exhausted). Not built: `R-eco` and the projector mark (marked below).

Read first: [docs/e2e-finale-3.md](e2e-finale-3.md) §4 and §7 (the bugs and the fix pass), [docs/combattimento.md](combattimento.md)
§3 (out of play, required facts, the outcome guard), [docs/prove.md](prove.md) (private actions), [docs/mondo.md](mondo.md).

## The problem in one paragraph

Three e2e passes found the same family: the narration (Haiku, streaming sentence by sentence to the voice) says
things the Engine knows to be false. A dead goblin answers a whisper; a miss is told as a hit, or a hit lands on the
wrong target; a whisper of three turns ago is retold aloud; an NPC who left keeps talking; the same line comes back
word for word. Each fix so far was a guard with its own word lists, its own idea of who is present and its own log
line: eleven of them by now (exists: `narrazione/guardia-esiti.ts`, `guardia-fuori.ts`, `privato.ts`,
`guardia-segreti.ts`, `guardia-rifiuti.ts`, `numeri-regole.ts`, `finzione.ts`, `prove/fatti-dovuti.ts`, the absent-NPC
and repetition checks in `turni/narrazione.ts`). They work, but nobody can see the state they judge against, the
narrator gets that state in five different sections, and a leak that no guard knows produces no trace at all.

## What others do (short)

- Structured state beats a recap: on FIREBALL, generating a D&D turn from the game state is better than from the
  dialogue alone (Zhu et al., ACL 2023, arXiv 2305.01528); CALYPSO distils that state for a human DM, who is the gate
  (Zhu et al., AIIDE 2023, arXiv 2308.07540). We have no human gate: the Engine must be it.
- State inferred from the dialogue is partial (Callison-Burch et al., EMNLP 2022, arXiv 2210.07109): HP, deaths and
  presence never come from the narration; the Engine keeps them, the model at most *proposes* a change that the Engine
  validates (the neuro-symbolic split several 2025–26 story papers use; reported by our search, not all verified).
- Verify-and-revise loops (Chain-of-Verification, arXiv 2309.11495; FActScore, arXiv 2305.14251) cost several extra
  calls: fine offline, too slow inside a spoken turn. Streaming guardrails check one sentence at a time in a buffer
  and release it only after the check: that is our pipeline already (the narrator works one sentence ahead).
- Secrets: telling a model to keep a secret does not stop it leaking (several 2025–26 studies, unverified figures);
  the reliable fix is to filter by audience BEFORE the call, so a generation never sees what its audience may not know.

## Design

### 1. The ledger (`apps/server/src/coerenza/registro.ts`)
One read model, rebuilt before every model call and every check (a pure, cheap function of the sources: a fall in
combat and the narration of the same turn see the same ledger) from the Engine's own sources, which stay the single
source of truth
(exists: `prove/stato.ts` HP, dead and fled; `prove/combattimento.ts` order, conditions, death saves; the director's
presence, `presenzeManuali`, `mondo/` attitudes, moved NPCs, consequences; `repertorio/stato.ts` clues and facts found;
`privati`, `azioniPrivate`). Rows:
- **entities** (PCs, NPCs, minions): names and aliases; state `in_piedi | ferito | grave | a_terra | morente | morto |
  fuggito | nascosto`; HP band, never numbers; presence `in_scena | uscito(turno, verso) | altrove`; later what it holds;
- **facts**: id or text, and who knows it: `pubblico` or `pg_x` (private outcomes, whispers, private checks). A private
  action that changes the world (takes an object, learns a fact, hurts someone) leaves its consequence in the ledger
  with its knowers: the wounded NPC is wounded for everybody (the body shows it), who did it and how stays known only
  to that PC, so later public narration stays consistent without revealing the content;
- **this turn's outcomes**: per card, attacker → target, hit or miss, damage band; per check, success or failure and
  what it denies (`negati`, `fallite`);
- **who holds what** (A22, `scena/oggetti.ts`): the scenes' objects with an id (`elementi_interattivi[].id: ogg_…`,
  holder at the start `chi`), moved by a line's `effetti.oggetti` (mode B: `pg` = the PC the line answers, a character
  id, or `scena` = back in its place) or by the narrator's `[oggetto] ogg_x <chi>` (mode A, checked: an object of this
  scene or held by someone here, to a PC, an NPC in the scene or `scena`). «Cosa è vero adesso» says «Chi ha che cosa:
  la chiave di ferro: ce l'ha Livia.»; a change is a journal event (`oggetto`); the snapshot keeps it and the session
  log lists where the objects ended (`oggetti`).
Every change is an event in a journal (`registro: evento`, turn, entity, from → to, cause) saved in the snapshot, so a
resume and the panel show the same history. The model never writes the ledger. One exception, the one the e2e passes
need: presence. The narrator may propose `[esce png_x]` / `[entra png_x]` (protocol tags, like `[orologio]`); the
Engine accepts them only for an NPC present (or absent) and logs them; the Game Master can undo from the panel.

### 2. Visible when needed
- **Narrator and selector**: one section «Cosa è vero adesso» built from the ledger, only the relevant rows: who is in
  the scene and how they are, who left or fell and since when, this turn's outcomes. It replaces the scattered
  sections (exists: «PNG fuori gioco», the outcome lines of «Esiti dei tiri», «Fatti scoperti»), so the size does not
  grow. Budget: at most about 12 rows.
- **Audience split for private actions**: the public call gets a private action only as «Livia fa qualcosa in privato
  verso Zirrà» with no content and no private outcome; a second call, in parallel, writes the private reply with the
  content and the rows that PC knows, and goes only to that phone (never to the voice queue, so it does not delay the
  table). This removes the feed path of bug 1 instead of guarding it. Cost: one Haiku call per private action.
- **Game Master panel**: a «Coerenza» box: the ledger's rows (state, presence, who knows what) and the turn's
  violations (rule, sentence, what was done). **Projector**: a mark on a downed or dead NPC's portrait (built after
  round 7: the fallen one stays in the row where it fell, grey, with «a terra» or «morto» under the name, on the
  projector and on the phones' «Qui con voi»; `PersonaggioScena.fuori`; a fled one is gone).

### 3. One checker (`apps/server/src/coerenza/verifica.ts`)
Every sentence, narrator or NPC, public or private, goes through one pipeline before the voice, against the ledger
of that moment, in every profile and mode: the improvised narration, the selector's prewritten lines (mode B) and the
local minimal reader's (prewritten lines can contradict the state too). The existing guards become rules behind one interface (`(frase, registro) → Violazione | null`), each
with an id and its word lists in the language pack:
`R-fuori` dead, down or fled who acts or speaks; `R-inesistente` a creature nobody in the scene answers to, attacked or
acting (built after round 1, below); `R-assente` an NPC not in the scene who speaks or acts; `R-esito` an
outcome against its card (polarity, target, a fall without a fact); `R-privato` a private fact in a public sentence
(the audience split makes it a backstop); `R-segreto`; `R-rifiuto`; `R-numeri`; `R-ripetuta` a recent line word for
word (after round 7, A30, `coerenza/ripetute.ts`: any sentence heard in this visit of the scene, the same words or the
same gesture with a tail, i.e. one opens with all the words of the other, five or more; and an NPC's sheet tic heard in
its last two lines, a tic that quotes its words being those words. It judges the rows of the lines that come out too,
prepared, scriptwriter's or the Engine's: round 7 in profile A repeated «Ugo batte la pala per terra due volte.»
through two different lines. A line's repeated sentence is left out of its row and the rest is said; a line is never
emptied, if nothing would be left it is said whole, since its effects come with its words. Dry run on the sixteen
profile-A games of rounds 4–7, 190 lines: it drops exactly the two round-7 repeats, nothing else, and empties no line.
A tic said by a narrator row about the NPC is not caught: tics are matched on the NPC's own rows, as the
scriptwriter's validator does); `R-eco` the player's words restated beyond the announcement (built after round 7, coerenza/eco.ts: a sentence
that shares at least three content words with one clause of this turn's public actions, and those are at least 60% of
its own, is dropped; round 7, FB T4: «Nano, la ruota è rotta da mesi.» after «Il mulino sul fiume ha la ruota rotta da
mesi»; the attributed announcement is exempt); and the end-of-turn `R-dovuto` (a card's fact not told).
On a violation: (a) when the sentence is not yet needed by the voice (the buffer has slack) and a fast model is
available, one targeted repair: a short call with the exact error and the ledger rows, with a hard deadline (to
measure; about 1.5 s); (b) otherwise (profile A with the local reader goes straight here), or if the repair fails the
same rule again, the Engine's own sentence (exists: the guards' lines) or a drop. Every
violation is one log line and one record in `narrazioni.jsonl` (`tipo: violazione`, rule, sentence, action), counted
by `misure.py` per rule; the independent detector of what the table heard (`private_al_tavolo.py`) stays as a cross
check, so a leak can no longer hide behind a 0.

### Order of work (each step its own commit, tests on invented fixtures, docs in the same commit)
1. **Done** (`85a8340`): the ledger as a read model, its journal and the snapshot, no behaviour change
   (coerenza/registro.ts, coerenza/diario.ts; the director's `fontiRegistro`/`registroOra`, called on every state
   change, as the narration starts and after the cards; `StatoMaster.coerenza` for the panel; tests:
   test/coerenza-registro.test.ts).
2. **Done** (`94c1adb`): the checker (coerenza/verifica.ts, `VerificaTurno`): the sentence guards as rules R-numeri,
   R-esito, R-fuori, R-assente, R-finzione, R-privato, R-segreto, R-rifiuto, R-ripetuta in one pipeline in
   turni/narrazione.ts, the repertoire's narrator rows through R-esito/R-fuori (`verificaBattuta`), the told facts as
   R-dovuto; the guards' tests unchanged; each violation logged («coerenza: violazione» plus the old line), written to
   narrazioni.jsonl (`tipo: violazione`), counted by misure.py (`coerenza`) and listed in
   `StatoMaster.coerenza.violazioni`; tests: test/coerenza-verifica.test.ts.
3. **Done** (`4c46563`): the «Cosa è vero adesso» block (coerenza/blocco.ts; lines in
   `lingue/<code>/testi-coerenza.yaml`): in the scene and how, gone from it and when, the PCs, this turn's public
   outcomes and refusals, at most 12 rows; it replaced «PNG fuori gioco»; «Esiti dei tiri» keeps the details to narrate
   and «Fatti scoperti» the facts' text (a row each would break the budget); the narrator and selector prompts say
   never to contradict it; tests: test/coerenza-blocco.test.ts, test/fuori-gioco.test.ts.
4. **Done**: the audience split. The public message has a private action as «fa qualcosa in privato verso Bertoldo»
   (`messaggio.azione_privata_altrove`), no private outcome of this turn or of earlier ones, no line indicated for it;
   each PC who acted in private gets `messaggioPrivato` (its private outcomes so far, its private actions with their
   checks, the repertoire with its own indicated lines, the instruction `messaggio.risposta_privata`) and a call of its
   own (`narraPrivato`, `soloPg`: every sentence and line to that phone, its invitation, clocks and cues ignored, a line
   for another PC refused), started with the public answer and awaited before the next window; it has its own latency
   meter, so the table's first-audio is the public answer's. Not with the local minimal reader (one call per turn):
   there R-privato stays the defence. The fake narrator of the tests receives the request, so a script can tell the
   two calls apart (test/aiuti/partita.ts routes a one-call script's `[privato pg_x]` lines to the private reply).
   Tests: test/coerenza-pubblico.test.ts, test/privato.test.ts, test/prove-integrazione.test.ts,
   test/prove-manuali-integrazione.test.ts.
5. **Done**: presence tags. `[esce] png_x verso <dove>` and `[entra] png_x` (parser, both prompts it/en,
   docs/f0-contratti.md); the director accepts a known NPC who is in the scene (to leave) or not (to arrive) and not out
   of play, logs «presence: change accepted/refused», keeps them for the visit (`presenzeNarrate`, in the snapshot,
   cleared at a scene change); who left leaves the physical presence (so R-assente drops its lines and the catalogue
   its lines), the ledger has it as `uscito` with turn and place, «Cosa è vero adesso» says it; the Game Master's
   presence decision wins. Tests: test/coerenza-presenze.test.ts.
6. **Done** (the panel box): apps/web/src/master/SezioneCoerenza.tsx, «Coerenza» in the left column after «Mondo»: the
   characters' state and presence, the violations stopped (rule, action, sentence and its replacement, sentences
   hidden with «senza spoiler»), the private facts with their knowers, the journal; strings in
   apps/web/src/lingua/{it,en}/master.ts; docs/guide/master-panel.md, «Coherence». Tested by rendering
   (SezioneCoerenza.test.ts), and seen in headless Chromium on the live stall canary (port 4949, 0 console errors). **Not done**: the projector mark on a downed NPC (the
   fallen already leave the projector's present list).
7. **Built**: the targeted repair. A fact-rule replacement (R-esito, R-fuori) carries `riparabile`; when the answer has
   already queued a sentence (the voice has slack) and the narrator is not the local reader, turni/narrazione.ts waits
   for `ripara` (the director's `riparaFrase`: the narrator's model, its cached system prompt, the message
   `coerenza.riparazione.*` with the sentence, the error and «Cosa è vero adesso», a deadline `TAGM_RIPARAZIONE_MS`,
   default 1500); the rewrite is said only if `confermaRiparata` passes (fact rules, no rule numbers), recorded as one
   more violation record of the same rule with `azione: riparata`; otherwise the Engine's line. The events of an answer
   are now handled on one queue, so a sentence that waits holds the ones after it. Off under vitest unless
   `TAGM_RIPARAZIONE=si`; guide: docs/guide/local-and-api.md. Tests: test/coerenza-verifica.test.ts (a rewrite that
   passes is said, one that breaks the rule again is not). Measured on the three scripts: see «Measured, round 1».
   Building it found a crash of step 2's out-of-play guard (a language-pack section compiled twice, `70be54c`) that the
   rerun on `7109235` had hit in every fight.

## Success criterion (written before measuring)
On the three blind scripts of docs/e2e-finale-3.md (combat with manual and automatic rolls, off the rails, stall),
profile B:
- **0 high-severity violations heard at the table** (private content, a fallen or absent character acting, an outcome
  against its card) by the independent cross-checks: `esperimenti/e2e-finale/private_al_tavolo.py`, `misure.py`, and
  a haiku judge reading only the table record with the Engine's per-turn view;
- **every violation the checker caught is logged with its rule** (and counted per rule in `misure.py`);
- **the median first-audio latency is not worse than +0.5 s** against the baseline of `7109235`
  (`esperimenti/risultati/e2e-finale-3b/dopo-*`).
Then, if `memory_pressure` shows at least 30% free, one profile-A run of `stallo`.

## Measured, round 1 (16 November, the three blind scripts on `2a7697c`)

Runs: `esperimenti/risultati/e2e-finale-3b/coerenza-*` (combat with manual and automatic rolls, off the rails, stall;
profile B, ports 4944–4947). Baseline: `prima-*` on `958556a`. Judged by a blind haiku reader of the per-turn views
(table record next to the Engine's log), quotes checked by hand.

| Criterion | Result | Met |
|---|---|---|
| 0 high-severity violations heard at the table | definite: CM 1 (T12 «Lo sguardo di Zirrà scivola sulla spada di Livia…», Zirrà fled), CA 0, FB 1 (T13 card «Berta: A mani nude 15, riuscita», narration «Il pugno le scivola… lo assorbe»), ST 0; probable: CM 9, CA 4, FB 2, ST 0, almost all a goblin the Engine does not have («il goblin con la lancia» of the scripts) attacked or acting after the fight | **no** |
| private content at the table (`private_al_tavolo.py`) | 3, 4, 5, 8 candidates, all common-word noise: 0 contents | yes |
| every caught violation logged with its rule | CM: R-fuori 16 (6 replaced, 8 dropped, 2 rewritten), R-esito 2 (1 rewritten), R-assente 2, R-privato 6; CA: R-fuori 10 (3 rewritten), R-esito 2, R-privato 3; FB: R-privato 3, R-rifiuto 1, R-dovuto 1; ST: R-privato 6 | yes |
| median first-audio within +0.5 s of the baseline | 1854 ms (61 turns) against 2434 ms (78 turns) | yes |

Over-fires found by the same reading: the stall's «nothing new» counts turns with real decisions after a fight (CM
T10–T15, CA T13–T17); R-privato moved public lines to a phone (FB T15 Berta's words while she attacks in public; ST T10
another PC's public question); the private replies logged a missing invitation as an error (fixed, `2c40c29`).

Fixed after the measure (`5870930`, tests on invented fixtures, not yet measured on the scripts):
- R-fuori: a part of a character joined by «di» to the name («lo sguardo di Zirrà scivola…») is that character
  (`guardia_fuori.parti`, `di_parte`);
- R-esito: a blow that hurt, told as missed or absorbed by its target alone («… la pietra lo assorbe»), becomes «Berta
  colpisce Fulco.»; and such a sentence no longer tells the hit for R-dovuto (`assorb`, `scivola sull`, `e corto`…);
- the stall: no «nothing new» count in a visit of the scene where a blow was struck or a fight was on;
- R-privato: in a fight an NPC not whispered to speaks in its own public step; a line that tells another PC's public
  action of this turn stays at the table.
Then, from a second reading (`72cc62e`, `8e1f34e`, `97121cb`, tests on invented fixtures):
- the stall: an action toward an NPC present, after answers with nothing new, neither counts nor resets the escalation
  (it reset to S1 before, so the stall run never reached S3: about 11 of 14 answers were idle there, not «fixed»);
- R-esito: the absorbed/missed rule skips a target who struck too in the turn (its own miss is not the hit it took);
- the private replies get an outcome guard of their own: sharing the public one, a reply that named the dead NPC used
  up the state line, and the table's sentence was dropped with nothing said;
- R-privato with the split on: in a turn of private actions alone the public answer's narrator lines are the visible
  trace (the public call never saw the whisper), so only a line that shares the whisper's content moves (canary on
  `97121cb`, T2: a step of Berta and the dogs going quiet went to a phone and the table heard nothing).
Then `R-inesistente` (coerenza/inesistenti.ts, tests: test/coerenza-inesistenti.test.ts, test/coerenza-verifica.test.ts),
the scripts' «goblin con la lancia» after the fight. The nouns come from the data only: the aliases of the campaign's
NPCs that are not their name or short name (torre-mozza: goblin, goblina, capobanda, guerriera, hobgoblin,
guardaspalle, pastora, vedova, carbonaio), the words of the minion types (`gregari`) and the ledger's minions; the rule
set has no bestiary in a form the Engine reads. A noun is absent when nobody it names is in the scene and in play
(standing, wounded, or hidden: a hidden one is never revealed). The director judges it only when a turn's action names
it and there is a fight (on, earlier in this visit, or a blow this turn) or one it named fell or left here, so talk of
creatures elsewhere is never judged. Then the narrator's block gets «Nessuno in scena è «goblin»…», a narrator
sentence that has the creature be the subject of a clause, be hit, be wounded in a body part or be the goal of a move
(and a subject pronoun right after) becomes the Engine's line of who is really there («Zirrà non è più qui. Oltre a
voi, in piedi qui si vede soltanto Grosso.»), later ones are dropped, and if the narration invented nothing the
Engine says the line before the invitation (`aggiunta`). The grammar words around the nouns are in
`lingue/<code>/motore.yaml`, section `inesistenti`; the line is not handed to the model's repair. Limit: a noun whose
plural changes the word, or a creature the narration names with a word the data do not have, is not seen.
From the canaries on `97121cb` (combat with manual rolls, stall; profile B, ports 4948–4949,
`esperimenti/risultati/e2e-finale-3b/canary-*`): the stall now climbs S1 → S2 → S3 → hard S1 → S2 (the reset fix
holds); S1 in mode B had an improvised «Nel cortile non si muove nessuno.», so the Engine now says a filler line of the
scene when the selector brought none (docs/mondo.md §5); R-privato moved a whisper-only turn's visible trace (fixed
in `b5df16a`). Profile A (`stallo` with the local reader) was not run: with memory 54% free the reader was started, but once loaded the Mac had 23% free and 6.0 GB of swap (the rule is to stop above about 5 GB, the Mac rebooted twice on 14 November), so it was stopped at once.

## Measured, round 2 (16 November, the three blind scripts on `f29235d`)

Runs: `esperimenti/risultati/e2e-finale-3b/coerenza2-*`, same scripts, profile and ports as round 1; the same blind
haiku reader (`scratchpad` brief, per-turn views), quotes checked by hand.

| Criterion | Round 1 → round 2 | Met |
|---|---|---|
| 0 high-severity violations heard | definite + probable: CM 10 → 6, CA 4 → 9, FB 3 → 1 (plus 6 unsure: the players' invented NPCs voiced by Berta and Ugo), ST 0 → 3 (Ugo left without `[esce]` and spoke) | **no** |
| private content at the table | 0 → 0 (candidates 4, 5, 2, 1: noise) | yes |
| every caught violation logged with its rule | CM: R-inesistente 13 (6 replaced, 5 dropped, 2 added), R-fuori 7, R-esito 2, R-privato 2, R-dovuto 1; CA: R-assente 11, R-inesistente 8, R-fuori 8, R-esito 6, R-privato 2, R-dovuto 1; FB: R-rifiuto 2, R-assente 2, R-ripetuta 2, R-numeri 1; ST: R-privato 1 | yes |
| median first-audio within +0.5 s of the baseline | 1854 ms → 2070 ms (64 turns) against 2434 ms | yes |

What round 2 shows:
- `R-inesistente` fires (21 sentences in the two combat games) but lets most invented goblins through: it skipped a
  sentence with a state word anywhere in it («Il goblin la ferisce alla spalla: un colpo secco, e lei sente il
  sangue…»), it does not see the object of a verb that is not a blow («spinge il goblin contro il muro»), and the
  model's repair of an R-fuori sentence is checked by R-esito and R-fuori only, so it brought the goblin back (CA T17
  «il goblin con la lancia è caduto e non si muove più», T20). Its line of who is really there was said in almost every
  turn after the fight.
- Over-fires of the round-1 fixes: the absorbed-blow rule took «Lo scudo di Zirrà non regge del tutto» (negated) for an
  absorbed blow, and «il sasso che Zirrà aveva puntato rimbalza…» for a miss on Zirrà, dropping Nespola's only line
  (CA T6); `R-inesistente` dropped «Che fai?» (the relative «che» read as a subject pronoun, CM T16).
- R-fuori let a dead NPC act when the sentence has a state phrase used as an action («non si muove verso la scala»).
- The stall climbs S1 → S2 → S3 → hard S1 → S2 → S3 with the Engine's material at every level; still 13 «nothing
  new» counts in 14 turns, and the same S3 sentence twice.
- Presence (bug 9) is not tracked when the narration has an NPC leave without `[esce]`.
Fixed after round 2 (tests on invented fixtures, **not measured on the scripts**; both rules are now in observation,
see «Verdict after two rounds»): R-inesistente judges the state per
clause, and a state skips only where a body the noun could mean lies in the scene («Il goblin la ferisce alla spalla:
…, e lei sente il sangue» is caught); the object of any verb («spinge il goblin», «che il goblin si volti»); no carry
on relative pronouns (`inesistenti.relativi`: «Che fai?» stays); in a fight or after one in this visit every absent
noun is judged, named by the actions or not (so the model's repair, checked by the same guard, can no longer bring the
goblin back in a turn whose actions did not name it); a noun that names someone fled or fallen is left to R-fuori when
it is only the subject (its line and its carried subject); the line of who is really there at most once in three
turns. The absorbed-blow rule takes only a non-negated word and a target in a prepositional phrase («sulla spalla di
Fulco»). Still open: R-fuori's whole-sentence state check («non si muove verso la scala» read as a state), presence
without `[esce]` (bug 9), the NPCs the players invent (bug 9), the stall's repeated S3 sentence.

## Verdict after two rounds, and rules in observation

Two rounds did not meet the criterion, and the counts swing on close code (combat-manual 10 → 6, combat-auto 4 → 9):
single runs cannot tell a fix from noise, so no third round of word-rule tuning. What the numbers support, in both
rounds: the ledger and the «Cosa è vero adesso» block in every call; the audience split (0 private contents at the
table in both rounds, against two games of four in the third pass); the stall's climb with the Engine's material
(round 2); the first-audio latency within the bound; the out-of-play guard's crash fix (`70be54c`, the 7109235 runs).
What they do not support: `R-inesistente` and the absorbed-blow branch of R-esito. Both are now **in observation**
(`apps/server/src/coerenza/osservazione.ts`): they record what they would do (`azione: osservata` in
narrazioni.jsonl with the line they would say, log «coherence: rule in observation, text left alone»; the Engine's
added line of who is really there is recorded, not said) and the sentence goes on to the other rules unchanged; the
panel lists only what was stopped. The «Cosa è vero adesso» row for an absent noun stays (input to the model, not a
change of the table's text). They come back only if they win on a frozen replay set of sentences from the run
folders, labelled once and scored offline, against the alternative of a small model's yes/no question on flagged
sentences (next steps). Decision after the scores (the lead, 16 November): **R-inesistente is a rule again**, as part
of the rules where the rules decide (profile A, a late or failed question of the judge, the judge off), since on both
sets it adds catches without touching more clean sentences; with the judge on it runs only in its shadow, and its
added line of who is really there is not said (the judge's «si» says it instead). The absorbed-blow branch stays in
observation until there is data.

## Frozen replay set

Single runs cannot judge a checker (the same code gave 10 and 6, 4 and 9 high-severity sentences). The replay set
freezes what the model wrote, so any checker variant is scored on the same sentences in seconds.
- **Set** (`esperimenti/coerenza/insieme.json`, built by `apps/server/src/strumenti/coerenza-insieme.ts` from the run
  folders in git: `coerenza-*`, `coerenza2-*`, `canary-*`; the earlier runs have no ledger events): the raw public
  answer of every turn (the turn record's `testo` in narrazioni.jsonl, before any checker), split into sentences, with
  the turn's ledger rows rebuilt from the `registro: evento` lines (state from the events, presence from the scene's
  `png_presenti` and the visit's presence events), who fell by this turn's cards, the turn's attack cards (parsed from
  `prove: tiri del turno`), the actions and whether a fight is on. A sentence is **flagged** when it names a
  character out of play or absent, uses a creature noun nobody in play in the scene answers to, names the target of a
  blow that hurt next to a miss or absorb word, or is the line of an NPC out of play or absent. 53 calls, 136 flagged
  sentences. Each call also has the visit's attack cards and flights so far (`storia`, added after round 3 for the
  unnamed actors; re-extracting gives the same calls and sentences). Limits: the private replies' raw text is not in
  the logs; the block the narrator got was not logged (from now on it is: «coherence: block of the call»), so the rows
  are the ledger's, rebuilt.
- **Labels** (`esperimenti/coerenza/etichette.json`): every flagged sentence, labelled once by hand, plus the unflagged
  ones that are violations (a carried subject, «Quello cade contro il muro»; an attack by nobody in play) or that a
  variant touched: 117 violations, 46 clean; the set's other sentences are clean. Violation: someone out of play since
  before the turn, absent, or nobody in play acts, speaks, perceives, is hit or is said present; a told outcome against
  the card; a PC told down who is standing. Clean: a state or a body, an absence, this turn's own fall or flight, a PC
  acting on a body, a place named after a creature, talk of creatures elsewhere.
- **Scorer** (`apps/server/src/strumenti/coerenza-punteggio.ts`, `npx tsx … [variant]`): builds the guards as the
  director does for each call and runs the sentences in order; a touched clean sentence is a wrong touch, an untouched
  violation a miss; the lists go to `esperimenti/coerenza/punteggi/<variant>.json`.

### Scores (16 November, 117 violations, 46 labelled clean)

| Variant | Caught | Missed | Clean touched |
|---|---|---|---|
| `attive`: what changes the text today (R-fuori, R-esito without the absorbed-blow branch, R-assente) | 53 | 64 | 6 |
| `regole`: attive + R-inesistente (`cb4ded5`) + the absorbed-blow branch (`8cb8426`) | 76 | 41 | 4 |
| `filtro`: every flagged sentence touched (the filter's ceiling) | 95 | 22 | 41 |
| `domanda` (v1): every flagged sentence asked to Haiku 5.5, one yes/no | 90 | 27 | 24 |
| `domanda2` (v2): v1 with the Engine's structure around it | **106** | **11** | **7** |

The candidate (`apps/server/src/coerenza/domanda.ts`, runner `apps/server/src/strumenti/coerenza-domanda.ts`; the
question in `lingue/<code>/testi-coerenza.yaml`, `coerenza.domanda`): the mention filter of the set picks the
sentences; a small fast model gets ONE question per sentence with the ledger rows («nella frase da controllare, Zirrà
(non è più in vita…) agisce, parla, percepisce o viene detto presente adesso?»; for a creature noun, whether a
«goblin» acts or is hit; for a hurting card, whether the blow is told as missed), structured output `{risposta: si|no}`,
and the sentence right after a «si» is asked too (a carried subject). v1 asked about everything flagged and touched 24
clean sentences, mostly the fall of someone who went down by this very turn's cards, and missed the NPCs' own lines
(the model never saw the speaker). v2 keeps the Engine's own structure: who fell by this turn's cards is not asked
about (as R-fuori's `oraFuori`), an NPC's own line goes to the deterministic R-assente, and R-esito's card rules (pair,
fall, a PC told down) stay deterministic; the model replaces R-fuori, R-inesistente and the absorbed-blow branch. By
source, rules → v2: round 1 34 → 42 of 50 caught (2 → 3 wrong), round 2 34 → 52 of 54 (2 → 4), canaries 8 → 12 of 13
(0 → 0). v2's structure was set after reading v1's errors on this same set (structure, not words), so it was checked
on a held-out set and against the model's variance:
- **Variance**: the same v2 questions asked three times (`--campione 2`, `--campione 3`, answers in
  `risposte-claude-haiku-5-5-c2.json`, `-c3.json`): 106 caught, 11 missed, 7 clean touched in all three samples.
- **Held-out** (`insieme-prima.json`, `etichette-prima.json`: the third pass's own runs on `958556a`, falls rebuilt
  from «combattimento: esce dallo scontro», 41 flagged sentences labelled before any scoring; three unflagged ones a
  shared R-esito rule touched were labelled after, marked so): of 37 violations, `attive` 19 caught (2 clean touched),
  `regole` 25 (4), v1 29 (8), **v2 33 (2)**.
- **The rules apart**: R-inesistente alone adds 22 catches on the frozen set (75 against 53) and 6 on the held-out one;
  the absorbed-blow branch adds 1 and 0: the sets have four sentences about a hurting card, one a violation, so they
  cannot judge that rule.
- One filter for every user: the mention filter and v2's «what is worth a question» live in
  `apps/server/src/coerenza/menzioni.ts`, which the extractor and the runner import; the extractor splits sentences
  with the pipeline's own splitter (`narrazione/frasi.ts`, `dividiTesto`): the same 379 sentences, and the offline
  re-run gives the same 106/11/7 with no new model call.
What v2 still misses: carried subjects with no pronoun («Non si rialza.», «Il colpo della spada lunga gli entra sotto
la spalla.»), attacks by nobody in play with no noun («la lancia che arriva»), «I goblin sono fuggiti» when one died.
What it touches wrongly: a PC acting on a body («Livia … colpisce» the dead Zirrà; a foot on her ankle), «Zirrà è già
sparita», Zirrà's last words in the turn she falls (R-assente), two lines with no character.
**Latency** (210 answers kept in `esperimenti/coerenza/risposte-claude-haiku-5-5.json`, so re-scoring is offline): a
call takes 1053 ms median, 1304 ms p90, 1706 ms at most, under the 1.5 s the targeted repair already waits for a
sentence that is not the first (the voice is still saying the one before). The first sentence of the answer is
flagged in 25 of the 53 flagged calls, about one turn in seven of the runs; if those turns wait for the answer, the
pooled median first-audio would be 2.30 s (round 1 runs, now 1.85 s), 2.19 s (round 2, now 2.07 s) and 1.59 s
(canaries, unchanged), all within +0.5 s of the 2.43 s baseline. Cost: one short call per flagged sentence (about 300
input tokens). Profile A has no fast model: there the rules stay (`regole` or `attive`).

## The candidate in play (built 16 November, behind a flag; not yet measured live)

The yes/no judge (`apps/server/src/coerenza/giudice.ts`) is v2 of the scores above, in the public answer:
- the director builds it at each turn's close (`giudiceDelTurno`) when `TAGM_DOMANDA` is on (default, outside the
  tests) and the narrator's model is Anthropic's (profile B); never with the local reader (profile A: the rules);
- VerificaTurno keeps every rule except the ones the judge replaces: R-esito's card rules (pair, fall, a PC told
  down), R-assente, R-privato, R-segreto and the others decide first; R-fuori, and R-inesistente and the absorbed
  blow (in observation), run in the judge's **shadow** on every sentence, so their carried subject stays right;
- each public narrator sentence the rules left alone goes to `giudica`: the mention filter (`coerenza/menzioni.ts`,
  `daChiedere`) or the sentence right after a «si» picks what to ask; one question to the narrator's model with a
  deadline (`TAGM_DOMANDA_MS`, 1500 ms); «si» → the Engine's line once a turn (the fallen one's state, who is really
  there, «Berta colpisce Fulco.»), then the sentence is dropped; never the model's repair; «no» → said as it is; a
  late answer or an error → the shadow rules' verdict (R-fuori; a rule in observation stays so);
- each decision is a violation record with `dettaglio.fonte` (`domanda` or `regole`) and its milliseconds; each
  answer a log line «coherence: question answered»;
- the private replies stay on the rules (they are not in the frozen set); their raw text is now written to
  narrazioni.jsonl (`tipo: risposta_privata`), for a replay set of the private calls.
Tests: test/coerenza-giudice.test.ts (si, no, a carried subject, a deadline, a sentence the rules changed; with the
whole server a fake model's «si» gives the Engine line and its «no» keeps a sentence R-fuori would have changed).
Smoke run (not a measuring round: one combat game with manual rolls on `067d18f`, profile B, port 4948,
`esperimenti/risultati/e2e-finale-3b/fumo-torre-mozza-combattimento-B-manuale`): no crash (one voice timeout of the
TTS service); 36 questions with the narrator streaming alongside, 22 «si», none late; 988 ms median, 1220 ms p90,
1440 ms at most; median first audio 1637 ms (15 turns). The 22 «si» are the invented goblin acting or hit after the
fight, and once Ugo, at his kiln, watching at the tower; 19 sentences dropped and 2 replaced by the Engine's line.

## Measured, round 3 (16 November, the yes/no judge on, `6912f11`)

Runs: `esperimenti/risultati/e2e-finale-3b/coerenza3-*`, same scripts, profile and ports. **Only the combat game with
manual rolls is valid**: the Anthropic API credit ran out during the second game, so in the automatic-rolls combat,
the off-the-rails and the stall games the narrator's calls failed («Your credit balance is too low»: 42 failed
narrator calls, 48 failed arbiter calls, every judge question failed and the rules decided). Those three are kept as
evidence of the failure, not as a measure.
- **High-severity sentences heard** (combat, manual rolls; the same blind haiku reader, quotes checked): round 1 → 2
  → 3: **10 → 6 → 3**, plus 3 borderline. The three: T10 «Livia para la lancia con lo scudo: il legno geme, ma
  regge.» (an attack by nobody in play, no noun to flag), T14 «… il pugnale … sparisce nel buio della scala: il rumore
  dei passi si allontana» (an invented fleeing figure, no noun), T15 «Il colpo lo coglie di fianco e lo stende sulle
  pietre» (a carried pronoun after the one late answer: the rules decided and missed it). Borderline: T7 a miss told on
  Zirrà while the card's target was Grosso; T1 and T18 a private action's visible trace. Private content at the table:
  0. Not met: the target is 0.
- **Held-out #2** (`insieme-r3.json`, `etichette-r3.json`: the round's raw public answers, 42 flagged sentences
  labelled before reading the judge's decisions; 31 violations, 21 clean): `attive` 9 caught, 3 clean touched;
  `regole` (with R-inesistente) 16, 3; **the live system (rules + judge in play, combat-manual, 30 violations) 24 caught,
  3 clean touched** (a detail after a «si» dropped, «Il colpo arriva senza mancare.»; two lines of a private action
  moved by R-privato, by design). The offline v2 could not be asked again on this set (no API credit).
- **Latency**: 42 questions, 25 «si», 1 late (the 1.5 s deadline); 1017 ms median, 1192 ms p90, 1369 ms at most.
  First audio of this game: 2087 ms median (15 turns), against 1146 (baseline), 1730 (round 1), 1088 (round 2) and
  1637 (the smoke run) for the same script: the judge's wait on a flagged first sentence shows; with one valid game the
  pooled criterion (+0.5 s on 2434 ms) cannot be checked, and this game alone is +0.94 s on its own baseline.
- **A side effect**: the judge drops the invented sentences and nothing takes their place, so some actions get no
  answer («repertorio: azioni senza risposta» 5 times after the repair call, against 2 in round 2): the table hears
  less, and the stall count rises.
- What the sets cannot see: attacks and creatures with no noun («la lancia che arriva», «la figura che scappa»),
  carried pronouns after a late answer.

## After round 3: fixes made offline (16 November, no API credit)

The Anthropic credit ran out in round 3, so these fixes were chosen and scored without a single model call: the
frozen set and the two held-out sets with the judge's kept answers (`coerenza-domanda.ts --offline`: a question with
no kept answer counts as unanswered, so the rules decide as after a live deadline, and the misses are printed; for
held-out #2, `--insieme r3 --dal-log <run>/log-server/server.jsonl` takes the answers the live judge gave in the valid
round-3 game, by sentence). The offline v2 reproduces the published scores with 0 calls: 106/11/7 on the frozen set,
33/4/2 on held-out #1, and on held-out #2 the live judge's 24 of 31 caught, 3 clean touched.

| Variant (caught / missed / clean touched) | Frozen (117) | Held-out #1 (37) | Held-out #2 (31) |
|---|---|---|---|
| `regole` (the rules alone, before) | 76 / 41 / 4 | 25 / 12 / 4 | 16 / 15 / 3 |
| `regole-attori` (the rules alone, now: + unnamed actors) | 79 / 38 / 4 | 25 / 12 / 4 | 18 / 13 / 3 |
| `domanda2` (the judge in play in round 3) | 106 / 11 / 7 | 33 / 4 / 2 | 24 / 7 / 3 |
| `domanda2p` (rejected: the first sentence to the rules alone) | 98 / 19 / 5 | 27 / 10 / 3 | 22 / 9 / 3 |
| `domanda2a-attori` (the director now: opener, unnamed actors, late carry) | **107 / 10 / 8** | **33 / 4 / 3** | **27 / 4 / 3** |

The four fixes, each its own commit with tests on invented fixtures: the first sentence never waits for the judge
(`bf39510`), an action whose answer was dropped gets the Engine's line (`3db96ee`), unnamed actors inherit theirs from
the cards (`b3db103`), and after a late answer the rules carry the subject (`3551e4d`). What they should change at the
table, still to be measured live when there is credit: round 3's three heard sentences are caught on the replay (T10
and T14 by the unnamed actors, T15 by the late carry); its first audio, replayed without the waits, about 1.7 s
instead of 2.09 s; its 6 unanswered actions get a line each. The scores are on sets the fixes were designed after (the
frozen set and held-out #2 hold the motivating sentences; held-out #1 has none of them), so they show the fixes work on
their cases and touch nothing new, not how they generalise.

### First audio: the first sentence never waits for the judge
Round 3's first audio was 2087 ms median (15 turns) on the combat-manual script. From its logs (the turn's measures
and the «coherence: question answered» lines, origin at the window close, or at the last die in after a dice wait):
in 6 turns (T11, T12, T14, T15, T16, T18) one or two questions on the answer's first sentence held it 0.89–2.53 s.
The three options of the brief, replayed on those logs:
- the previous turn's audio as cover: none; it ended 20–45 s before every window closed (the window opens after the
  voice), so a question there hides nothing;
- the rules decide the first sentence alone, the judge from the second (`domanda2p`): first audio 2087 → about 1708
  ms (a replay estimate: the waits taken out, the voice's own latency kept), but the price on the sets is high:
  106 → 98 caught on the frozen set, 33 → 27 on held-out #1, 24 → 22 on held-out #2, because the first sentence is
  often the one about the invented goblin; in 20 of 23 first sentences asked (frozen set) the answer was «si»;
- an Engine-safe opener while the judge runs: the card outcome does not exist where it is needed (T12, T15 and T16
  had no card), but the Engine's line for the flagged mention does, and it is true whatever the answer: «Zirrà giace
  a terra, senza vita.», who is really there, the card's blow. It is the line a «si» says anyway.
Built (`coerenza/giudice.ts`, `PrimaFrase`; `turni/narrazione.ts`): when nothing of the turn is in the voice yet (no
sentence of this call or of the repair call, no Engine line before the narration: the turn's `llm_prima_frase` and
`voce_richiesta` marks), a flagged first sentence makes the Engine say that line at once (log «coherence: first
sentence flagged, the Engine line said while the question runs»); then «si» drops the sentence (record `sostituita`,
`dettaglio.apertura`), «no» lets it follow the line, a late answer leaves it to the shadow rules. The opener has its
own transcript row, and one set of Engine lines said is shared by the rules before the judge, the judge and the
opener across the answer and its repair (`lineeDette`): each line once a turn (a rule's «Zirrà giace a terra, senza
vita.» and the judge's same line were both said in T10's shape before). With no line (an absent NPC, or the line
already said this turn) the rules decide the sentence now and the question goes on aside, only as the next sentence's
carried subject; a «si» there is recorded as `osservata` with `dettaglio.tardiva` (log «coherence: first sentence
said, its question answered «si» afterwards»). The opener is said even when the table heard it in the last turns: the
alternative, keeping it back for three turns and letting the rules decide (`--apertura-una-ogni-tre`), refuses 13 of
22 openers on the frozen set and costs 107 → 103, 33 → 29 and 27 → 26 caught; so after a fight where the players keep
striking a body, the turns may open with the same state line (round 3 already heard it in T10, T11, T12 and T16
through the judge's «si»). Scored as `domanda2a`: 105/117 (one first sentence about an absent NPC goes to the rules),
33/37 and 24/31 caught (25 with the late carry below), with 7, 3 and 3 clean touched; the cost is
one more true line where the answer was «no»: 3 of 22 openers on the frozen set, 0 of 8 and 2 of 7 on the held-out
sets (round 3: T11 and T18 would have heard «Zirrà giace a terra, senza vita.» before a correct sentence). The
replay estimate for round 3's game is the same as the rules-only option, about 1.7 s; it will not return to 1.15 s
(`prima-*`, 958556a): turns without a dice wait spend about 0.7 s on the arbiter at the close, and their first token
comes at about 1.3 s in rounds 2 and 3 alike. Tests: test/coerenza-prima-frase.test.ts (narraTurno with a held
answer: the line is in the voice before it), test/coerenza-giudice.test.ts.

### No action left unanswered
In round 3, 6 public actions in 5 turns ended with nothing said about them («repertorio: azioni senza risposta» after
the repair: T10 ×2, T12, T15, T16 ×2): each time the narration's answer had the players attack «the goblin», dead or
invented, the judge dropped it, and the mode-B repair call told the same goblin again and was dropped again (0 clean
answers in those 5 repairs; the one action the repair «answered», T14, was the heard violation #14:6). None of the six
had a card: the target was already down (`gia_a_terra`) or the action had no roll. Built (`coerenza/risposta.ts`,
lines `coerenza.risposta.*` in it and en; the director's `diciConferme`): the director keeps the public sentences of
the turn the checker dropped or replaced; a public action whose PC such a sentence named gets **no repair call** (the
repair stays for actions the narrator simply ignored), and if it is still unanswered the Engine says before the
invitation one short line from the action's own card or, with no card, from the ledger's state of its target: «Livia
colpisce Grosso.» / «… manca …», «Livia ci riesce.» / «Livia ci prova, ma non ci riesce.», «Livia ci prova, ma Zirrà
non si muove più.», «… non è più qui.», «… ma così non si può.», else «Livia ci prova.»; never the narrator-facing fact
line. A line the table heard word for word in the last three turns falls back to «Livia ci prova.». Logged («coherence:
an action's answer was dropped, the Engine acknowledges it»), written to narrazioni.jsonl (`tipo: conferma_motore`)
and counted apart (a private reply's dropped sentences carry their PC and do not count): `azioni_senza_risposta` is still the count before the acknowledgement (comparable with rounds 1–3),
`conferme_motore` the ones the Engine answered (turn record, run summary, misure.py). On round 3's six: Livia, Nespola
and Eliandro attacking Zirrà already dead would each hear «… ci prova, ma Zirrà non si muove più.», Eliandro's foot
and question (no roll) «Eliandro ci prova.». Tests: test/coerenza-risposta.test.ts (every case, it and en),
test/coerenza-giudice.test.ts (with the whole server: the answer dropped by a «si», no repair call, the line said).

### Unnamed actors: an attack or a flight inherits its actor from the cards
Two of round 3's three heard sentences had no name to check: T10 «Livia para la lancia con lo scudo: il legno geme,
ma regge.» (nobody of the fight in play) and T14 «… il rumore dei passi si allontana verso la porta di ferro» (Grosso
had fled at T9). Built (`coerenza/attori.ts`, words in `lingue/<code>/motore.yaml`, section `attori_impliciti`): the
director keeps the visit's attack cards (PCs' and NPCs') and flights (`storiaVisita`, reset at a scene change; not in
the snapshot, so after a resume the rule judges nothing until the next fight). A sentence that names no NPC and tells
a flight by someone the clause does not name («chi fugge», a trace of a person with a relative, «la figura che
scappa», or as the subject, «il rumore dei passi si allontana»; not a zero subject, «Poi scappa…», which carries the
sentence before, nor a thing, «le lanterne si allontanano») inherits the visit's last flight; one that tells an attack on a PC with no attacker (a defence
phrase and a blow coming: «para la lancia», «alza lo scudo … il colpo della lancia rimbalza») inherits the attacker of
this turn's card on that PC, or, with no such card and nobody of the fight still in play here, the last foe in the
visit's cards. An inherited actor out of play since before the turn gets R-fuori's line («Grosso non è più qui.»,
once a turn; motive `attore_implicito`, never handed to the model's repair, whose rewrite only the card rules would
check); never while a foe of the fight stands in the scene, never a flight of this very turn, never a prewritten
repertoire row (its author wrote it for its scene: a dry run over the 784 narrator rows of the four example campaigns,
with a fight-over ledger, touched only prova-f0's clock sign «si sentono passi che scappano»). It is a card rule:
it runs with R-esito's before the yes/no judge, and in the rules path. Choice, from the logs: no NPC card ever
attacked Livia in these runs (the NPCs were surprised or fell first), so «the card's attacker» falls back to the
fight's last foe; with no card at all for a PC the attack would contradict the cards anyway.
Scores (the sets re-extracted with the visit's history, `storia`; every other field and sentence index unchanged,
checked by diff): the rules alone (`regole` → `regole-attori`) 76 → 79 caught on the frozen set, 25 → 25 on held-out
#1 (it has no such sentence: there it is only the clean-touch test), 16 → 18 on held-out #2; what the director does
(`domanda2a` → `domanda2a-attori`) 105 → 107, 33 → 33, 24 → 26; clean sentences touched unchanged everywhere (4, 4, 3;
7, 3, 3). One question had no kept answer (the sentence after a newly caught one, asked as its carried subject): the
rules decided it. A dry run over all 2092 raw sentences of every run folder (`coerenza-insieme.ts --tutte`: 326 calls)
touches exactly 5 sentences, the five labelled violations. Still missed: «chi fugge verso la cantina» when nobody
fled (an invented figure: no card has an actor for it). Tests: test/coerenza-attori.test.ts (each case, it and en;
with the whole server, the parried spear after the fight).

### The carried subject after a late answer
Round 3's third heard sentence, T15 «Il colpo lo coglie di fianco e lo stende sulle pietre», came right after a «si»
(«Livia abbassa la spada lunga sul goblin…»): the judge asks such a sentence as a carried subject, and that question
was the one of 42 that missed its deadline. The shadow rules then decided, and they carry only a subject pronoun:
an object pronoun after a new thing-subject is invisible to them. Built (`coerenza/portato.ts`, words in
`lingue/<code>/motore.yaml`, section `portato`; `GiudiceDomande.dopoIlTermine`): on a late answer to a question asked
only as a carried subject, a sentence that names nobody and refers back to a third person (no subject of its own,
«Non si rialza.»; a subject pronoun, «… e lui si affloscia»; an object pronoun right after a subject noun with its
article, «il colpo lo coglie», «la voce gli trema»; never a question or the first or second person) gets what the «si»
would have given it: dropped (log «coherence: late answer on a carried subject, the rules carry it too: dropped»). A
violation decided on a deadline now keeps the carry going, as a «si» does; a sentence left alone ends it, as before.
Measured first on the kept answers: of the questions asked only as a carried subject, «si» came 15 of 59 times on the
frozen set (13 labelled violations), 5 of 11 and 6 of 15 on the held-out sets, so dropping every carried sentence on a
late answer would have dropped mostly clean ones; hence the reference test. Scores with the kept answers (the
director's path, `domanda2a-attori`): 107/10/8 on the frozen set (one more clean sentence touched: «Non le ha fatto
niente.», the unlabelled sentence after a newly caught invented attack, whose question has no kept answer), 33/4/3 on
held-out #1, **27/31** on held-out #2 (T15 caught). Worst case, every carried question late (`--tardive-portate`, against
`--senza-portato`): 101 → 104 caught and 8 → 12 clean touched on the frozen set, 30 → 31 and 3 → 4, 22 → 24 and 2 → 2:
the zero-subject branch cannot tell a PC's «Indietreggia, ma resta in piedi.» from the fallen one's «Non si rialza.»,
which is why it applies only where the judge's answer was late (1 question in 42 in round 3). Tests:
test/coerenza-portato.test.ts (it and en), test/coerenza-giudice.test.ts (T15's shape with a deadline).

## Profile A: the lines carry their facts, the Engine filters (Riccardo's decision, 16 November)

«Il modello piccolo deve soltanto trascrivere quello che dice il modello grande. Non deve fare nessuna scelta né
rimoderazione: dovrebbe poter essere anche minuscolo.» So in profile A no model judges coherence: the yes/no judge stays
for profile B, where the same model writes the prose live. Coherence in profile A comes from the big model's lines and
the Engine (CLAUDE.md, «The small model relays, it never decides»):
- every prewritten or scriptwriter line says what it assumes: who speaks, who acts (`attori`), who is only named
  (`menzionati`), the states it takes as true (`richiede.stati`) (docs/repertorio.md, «Facts a line carries»); the
  sceneggiatore gets «Cosa è vero adesso» in its request and writes the tags (docs/sceneggiatore.md);
- the Engine checks those facts against this ledger before a line enters the catalogue (`repertorio/fatti-battuta.ts`),
  so the reader picks only among lines true now; the rules on the lines that come out (R-esito, R-fuori, `verificaBattuta`)
  stay as the last check.
Tests: test/fatti-battuta.test.ts, test/sceneggiatore.test.ts; validator: strumenti/test_valida_campagna.py.

**«Can be tiny», measured** (16 November, `esperimenti/lettore-locale/minimi.py --solo classificatore`, table in
`esperimenti/lettore-locale/risultati.md`, nothing else heavy running): the 30 turns of the set (85 actions, 21 where
Haiku used a prewritten line, 12 of them among the Engine's candidates), the live reader's prompt and JSON answer
(`--prompt vivo`, prompts/it/lettore-minimo.md) and its fallback after a second invalid answer (the Engine's first
indicated line), and as the floor no model at all (`--modello nessuno`: the first indicated line):

| Reader | Agrees with Haiku (of 21) | On the reachable (of 12) | Median / p90 / max per action |
|---|---|---|---|
| no model (first indicated line) | 52% | 92% | 0 s |
| Qwen3 0.6B 4-bit (~0.35 GB) | 48% | 83% | 0.46 / 0.51 / 0.54 s |
| Qwen3 4B Instruct 2507 4-bit | 43% | 75% | 2.24 / 2.73 / 3.00 s |

On this set the choice is the Engine's: the 0.6B does as well as the 4B at a fifth of the time, and neither beats
taking the first line the Engine indicated (on the 8 actions with two or more candidates, 4 of the 5 reachable
first-indicated lines were Haiku's; the 4B picked 2, the 0.6B 3, mostly through the fallback). The 0.6B often
answers badly formed JSON (28 of 85 fell back, 25 with candidates), harmless because the fallback is the Engine's;
with the experiment's own plain-id prompt it answers almost nothing valid (82 of 85). Small sample (21 reference
choices): it shows the reader can be tiny, not which tiny model is best. The four blind scripts in profile A with the
0.6B reader: «Measured, round 4 (profile A)» below.

## Measured, round 4 (profile A, 16 November, `e841553`)

Runs: `esperimenti/risultati/e2e-finale-3b/coerenzaA-*`, the four blind scripts one at a time (ports 4950–4953): the
minimal local reader on Qwen3 0.6B 4-bit, the rules arbiters, the sceneggiatore in the background (`claude -p`: sonnet
for `subito`, haiku for `prossime`), mock voice; memory 54–69% free; no API call. **Judge: an opus subagent**
(Riccardo: «più affidabile»), on the per-turn views with the rubric and H definitions of rounds 1–3 (the brief adapted:
no live narrator, the lines are prewritten or the scriptwriter's), its quotes checked against the views by script.
Rounds 1–3 were judged by a haiku subagent spot-checked by hand, so **the judge changed**. A first haiku reading of
these same runs counted 0 H for the narration and missed both outcome lines below; the combat games were also read by
hand against their cards.

| | CM | CA | FB | ST |
|---|---|---|---|---|
| H heard, opus (all lines said aloud) | 4 | 3 | 1 | 0 |
| of which in the lines' own prose | 0 (1 unsure) | 1 | 0 | 0 |
| of which in the Engine's announcement of a player's false claim | 4 | 2 | 1 | 0 |
| for context, profile B (Haiku narrator), rounds 1 → 2 → 3 (haiku judge, definite + probable) | 10 → 6 → 3 | 4 → 9 → — | 3 → 1 → — | 0 → 3 → — |
| turns played | 27 | 16 | 13 | 14 |
| median first audio (ms; profile B round 3: 2087 on CM) | 674 | 670 | 670 | 678 |
| reader: lines picked / «nessuna»; median classification (ms) | 29 / 21; 852 | 18 / 11; 1218 | 16 / 11; 1058 | 15 / 13; 651 |
| reader: answers that were not valid JSON (the Engine's fallback took over) | 12 | 12 | 14 | 10 |
| scriptwriter: `subito` asked / said at the table; median call (s) | 15 / 9; 9.5 | 12 / 5; 9.2 | 11 / 10; 9.3 | 13 / 13; 9.4 |
| scriptwriter: lines accepted / refused (reason) | 156 / 3 (speaker not in the scene 2, type 1) | 99 / 3 (type 2, secret 1) | 82 / 1 (speaker) | 79 / 0 |

Private content heard: 0 in all four. A fallen or absent character acting or speaking in the lines' own prose: 0 in
all four (CM T17 «il goblin davanti esita» was replaced by «Zirrà giace a terra, senza vita.»).
The H, by source:
- **the lines' prose**: CA before T11, «Il goblin si gira di scatto, e la lancia taglia l'aria dove nessuno c'è più.»,
  a scriptwriter line with a spear nobody in the Engine has, and a miss told while Zirrà's blow that turn hit and
  downed Eliandro; the Engine's «Eliandro cade a terra.» followed. Unsure (my reading: H): CM T9, the reader took a
  `subito` line written for T6's miss («La spada corta batte sullo scudo rosso…») for Eliandro's dagger that hit,
  then «Zirrà incassa il colpo.»;
- **the announcement**: the deterministic «Nome: «…»» quotes the player, false claims included, in the narrator's
  voice: «Livia Sarti: «Il goblin mi tira la lancia».» (CM T11, CA T12), «Nespola Tondi: «Il goblin mi prende alla
  spalla, sento sangue».» (CM T12, CA T13, no card), «finisco quello con la lancia» (CM T18), «Ultimo goblin: lo blocco
  contro la porta» (CM T19), «Oreste dice che sulla collina c'è una grotta» (FB T8). In profile B the narrator writes
  its own announcement, so these have no counterpart in rounds 1–3: the comparison holds for the prose row only.
Scriptwriter and the tags: every request carried «Cosa è vero adesso»; the Engine added `attori` to 2 accepted lines
that named an NPC in a narrator row without a tag (CM, Zirrà; ST, Ugo), and the new actor check refused none (the 3
refusals in CM and FB are the older speaker check). Whether the scriptwriter wrote the tags itself is not in these
records (the turn record kept only id, chi, tipo, quando, temi, testo): it does now.
What the 0.6B broke: 10–14 answers a game were not valid JSON, and the Engine's fallback (the first indicated line)
answered instead; no pick outside the candidates. The refused picks (4) were the Engine's gates, one of them doubtful
(FB T5: the theme «pagare» against «pagava»). The two outcome lines came from the lines, not from the reader's
choice among true lines.
Also found (opus): R-inesistente over-fired at CM T13 on the announcement «Spingo il goblin contro il muro…»: the
blow that killed Zirrà was hers, and the table heard «Zirrà giace a terra…» before «Livia colpisce Zirrà.»; R-numeri
only swapped «zero» for «nessun» inside a quoted false claim (CA T15).
Still open:
- a line that tells an outcome (a hit, a miss) must carry it as a fact checked against the card of the action it
  answers; and a `subito` line written for one action should answer only that action (16 `sc_` lines were said in a
  later turn, 5 of them `subito`);
- the announcement quotes the player's claims: false states and creatures nobody has reach the table in the
  narrator's voice (7 of the 8 H);
- the stall: FB 8 of 13 and ST 9 of 14 in-turn answers brought nothing new, and the one S1 (ST T14) found no filler
  line; most answers arrive late, before the next turn;
- CM T17 heard the dead goblin's state twice (R-fuori's line, then the who-is-there line that contains it).

## After round 4: fixes for profile A (16 November)

### The announcement attributes the player's words (7 of the 8 H of round 4)
The minimal reader's announcement («Nome: «…»», llm/annuncio.ts) was read in the narrator's voice and sounded like
narration: «Livia Sarti: «Il goblin mi tira la lancia».», «Nespola Tondi: «Ho nessun punto ferita, sono a terra».».
Now (deterministic, words in `lingue/<code>/motore.yaml`, section `annuncio`): the template attributes («Livia Sarti
dice: «…»»; in English «… says: "…"», no more «Ginestra opens the door.», which told the act as done before any roll:
the first-person turn is now off in the pack, `terza_persona: ''`); a clause that states the world
or the PC's state (`affermazione`: «ho», «sono», «vedo», «sento»…) or has someone else as subject (`terza_parte`: an
article or a third-person pronoun first, unless the PC's own verb is in it, `atto_interno`: «La fisarmonica la tiro
fuori io») is left out, and after such a clause the announcement starts again only at the PC's own act
(`atto_del_pg`: «…, la paro con lo scudo»); a lone call («Ehi goblin!») gives way to the next sentence; a PC out of
play is «Eliandro non agisce.» (no more «Eliandro: «Non agisce, è a terra, privo di sensi».»), and its action is not
classified. The round-4 cases become «Livia Sarti dice: «La paro con lo scudo. Resisto».», «Nespola Tondi dice: «Non
mi reggo più, striscio dietro la pietra».», «Nespola Tondi dice: «Indietreggio ma resto in piedi».». The coherence
rules no longer judge a sentence inside an announcement (`FraseDaVerificare.attribuita`; no judge either): it is the
player's words, and round 4's R-inesistente over-fire at CM T13 was the rule replacing the announcement of the very
blow that killed Zirrà. Tests: test/annuncio-d4.test.ts, test/coerenza-prima-frase.test.ts.

**The frame by what the words are (the lead's decision, 18 November).** «Dice» made an act sound like speech: the
dictated «Chiedo a Berta chi ha portato via Tonio» came out as «Livia Sarti dice: «Chiedo a Berta…».». Now the frame
follows the words (`llm/annuncio.ts`, `parlato`; pack fields `neutra`, `parlato`, `domanda`): the PC's own act in the
first person, or anything that is not speech, is framed neutrally, «Livia Sarti: «Chiedo a Berta chi ha portato via
Tonio stanotte».», «Livia Sarti: «Vado al pozzo».»; «dice» stays for speech: quoted words (unless the sentence opens
with the PC's act), a vocative or a call («Berta, dimmi…», «Che fai, Livia?», «Ehi goblin! Chi vi paga?»), a second
person or a thanks (`parlato`), a question that is not the PC's act («Sei Oreste?», «Chi vi paga?»; an interrogative
at its head counts even when it ends like a verb, «Quando hai visto Tonio?»). The neutral frame of before round 4 read
as narration because claims and other people's acts were in it; those are still left out, so only the PC's own act
is ever framed neutrally.

**The act stays, the world clause goes (final round, the second judge of attempt 3).** Five announcements kept a claim
and dropped the PC's act: «Non mi reggo più, striscio dietro la pietra» for an unhurt PC (CM T15, CA T14), «Sulla
strada della grotta incontro una viandante con un carretto» (FB T9, the question to her dropped), «Guardo dentro la
porta: tre o quattro goblin» (PR T12, the shot dropped), «Ne arriva un altro: lo colpisco…» (PR T13). Now (words in the
pack, `annuncio`):
- the PC's own state is a claim (`affermazione`: «non mi reggo», «sanguino», «sto male»…);
- so is an encounter or a find anywhere in the clause («incontro», «trovo», «scopro», «noto»; «vado incontro a» is a
  movement);
- someone else's arrival opens a clause of a third party (`terza_parte`: «ne arriva», «entra», «spunta»…);
- after a looking clause's colon (`percezione`: «guardo», «osservo», «ascolto»…) comes what the PC says it perceives,
  never announced, and when the next sentence is the PC's own act that act is announced instead («Tiro il dardo al
  più vicino»);
- a call of up to three capitalised words before more sentences («Madre Carla?») gives way to the next sentence, like
  «Ehi goblin!».

The five become «Striscio dietro la pietra», «Dove vai con quel carico?» (with «dice»), «Tiro il dardo al più vicino»
and «Lo colpisco di nuovo, poi gli passo alle spalle». The English pack has the same fields. Test:
test/annuncio-d4.test.ts.

### Outcome lines carry their outcome; a `subito` line is bound to its action
Round 4's two outcome errors were both lines that tell a blow: a scriptwriter's miss («… la lancia taglia l'aria dove
nessuno c'è più») heard while Zirrà's card hit, and a miss written for T6 picked at T9 for a dagger that hit. Now a line
that tells an outcome carries `richiede.esito: {tipo: colpito | mancato | a_terra | fugge, chi?, bersaglio?}`, written
by the big model (Preparer skill, scriptwriter prompt and check, validator `REPERTORIO.fatti`), and the Engine offers
it only when one of this turn's public attack cards says exactly that (`repertorio/fatti-battuta.ts`, `motivoEsito`: in
the catalogue against any PC's card, at `[usa]` against the answered PC's own); a flight must be one of that turn's
flights (see the follow-ups below). And a
`subito` line carries the turn of its action (`fino_al_turno`): said while that window is open, or never. torre-mozza's
prewritten lines tell no outcome (in that campaign the outcomes are the Engine's fact lines), so the tag matters for
the scriptwriter's. Tests: test/fatti-battuta.test.ts, test/sceneggiatore.test.ts, strumenti/test_valida_campagna.py.

Follow-ups (same fix): the outcome of a `subito` line is checked against the cards of its own turn (`carteDi`), also
when it is said in the next window after the ledger moved on, and at its delivery against the card of the PC it
answers; a flight line only in the turn of the flight (the visit's flights), not any turn after; and in a fight (or in
a visit with blows) the scriptwriter's line that tells a blow, a miss or a fall without `richiede.esito` is refused
(words of `guardia_esiti` in the language pack: round 4's CA T11 line was untagged).

### Prepared stall lines (the stall in profile A)
Round 4's stall game: answers with nothing new at T5, T7–T9 and T11–T14, one stall move only (T14, S1), and that S1
found no filler. The logs say why: the local reader had used every filler of the scene as a waiting line by T6
(`nar_cani_scappano`, `nar_attesa_ovile`, `ber_attesa`, `ber_salgo_io`, `ugo_attesa`, each `max_usi: 1`), and the
counter climbed slowly because a turn whose actions name an NPC present is a decision (not counted, not reset). Now
the campaign keeps lines for the stall (`stallo: 1 | 2 | 3`, written by the big model: the Preparer per scene, the
scriptwriter in the background when the table keeps stalling), never shown to the reader, said by the Engine at the
stall move of their level (docs/mondo.md §5, «Prepared stall lines»); torre-mozza has ten (three scenes, every level).
The counter policy is unchanged: with the same script the stall still comes late, so this round measures whether the
moves that do fire carry material; whether NPC-directed turns that get no answer should count is a separate decision.
Tests: test/mondo-stallo.test.ts, test/fatti-battuta.test.ts, test/sceneggiatore.test.ts, strumenti/test_valida_campagna.py.

### R-inesistente spares the one who fell in this very turn
A noun whose character went out of play by this turn's own cards (downed, killed, fled) is not an absent creature in
that turn: the narration of the blow is the turn's story (`creatureAssenti(…, oraFuori)`, the same exemption R-fuori
has with `fuoriDaPrima`). Round 4's over-fire at CM T13 told Zirrà's death before the blow that caused it; that one hit
the announcement (now exempt, above), but a narrator sentence telling the same blow would have been replaced the same
way. The cost: an invented creature hit in the same turn the real one fell is not caught that turn. Test:
test/coerenza-inesistenti.test.ts.

## Measured, round 5 (profile A, 16 November, `46d17ec`)

Runs: `esperimenti/risultati/e2e-finale-3b/coerenzaA5-*`, the same four blind scripts and setup as round 4 (0.6B
reader, rules arbiters, the sceneggiatore in the background, mock voice, ports 4950–4953, memory 42–57% free, no API
call), after the fixes of «After round 4». The test port's log also held round 4's lines: the copied logs were trimmed
to round 5 and the measures rebuilt from them. **Judge: opus**, the round-4 rubric and H definitions, the brief adapted
(the attributed announcement, the stall lines, the outcome tags) and asked to list every false claim inside an
announcement and say whether the table hears it as the player's words or as the narrator's
(`coerenzaA5-evidenza-opus.md`; its quotes checked against the views by script).

| | CM | CA | FB | ST |
|---|---|---|---|---|
| H heard, opus, round 4 → 5 | 4 → 1 | 3 → 1 | 1 → 0 | 0 → 0 |
| of which in the lines' prose | 0 (1 unsure) → 1 (1 unsure) | 1 → 1 | 0 → 0 | 0 → 0 |
| of which in the announcement | 4 → 0 | 2 → 0 | 1 → 0 | 0 → 0 |
| false claims inside an attributed announcement (not H) | 6 | 5 | 5 | 2 |
| turns played | 24 | 18 | 13 | 14 |
| median first audio (ms), round 4 → 5 | 674 → 670 | 670 → 666 | 670 → 682 | 678 → 676 |
| reader: lines picked / «nessuna»; median classification (ms) | 20 / 13; 1397 | 22 / 17; 1058 | 16 / 11; 862 | 15 / 13; 963 |
| reader: answers that were not valid JSON | 20 | 14 | 8 | 12 |
| scriptwriter: `subito` asked / said at the table; median call (s) | 14 / 7; 9.9 | 18 / 5; 10.1 | 12 / 11; 9.8 | 14 / 13; 9.6 |
| scriptwriter: lines accepted / refused | 134 / 12 (untagged outcome 11, label 1) | 81 / 33 (speaker away or out of play 23, untagged outcome 10) | 83 / 0 | 91 / 0 |
| scriptwriter lines with `richiede.esito` | 0 | 0 | 0 | 0 |
| `subito` lines said for a later turn's action, round 4 → 5 | 2 → 0 | 3 → 0 | 0 → 0 | 0 → 0 |
| stall moves: what the Engine said | — | — | T9 S1: the prepared line | T14 S1: the prepared line |
| answers with nothing new (the Engine's count) | 1 | 1 | 5 | 8 |

Private content heard: 0 in all four. A fallen or absent character acting or speaking: 0. Every PC that went down got
its death save, and a PC out of play is announced «Livia Sarti non agisce.». The over-fire table: all 16 coherence
events right. No NPC fell in CM this round, so its T13 case did not come back; in CA Zirrà died at T13 and nothing
of that turn was replaced (R-inesistente fired at T14 and T18 only, rightly).
The H, by source:
- **CM T10**, a scriptwriter `prossime` line the reader took through its fallback (the answer was not valid JSON):
  «Zirrà: Ahi! Scudo bianco, prendi questa, cieco!» while the only card was Zirrà missing Nespola: a hurt and a blow no
  card has. It tells an outcome without an outcome word, so neither the tag nor the refusal sees it. Unsure: CM T18;
- **CA T9**: Grosso's 6-damage hit on Livia was never told, and the line heard was «Zirrà: Spada? Ridi tu, poi piangi.
  Un passo e Grosso si sveglia.». The due-facts check had read the announcement «Livia Sarti dice: «Carico quello al
  centro…»» as the hit (the stem «centr»): fixed after the round («After round 5» below);
- **the announcement: 0 H**, every false claim attributed («Nespola Tondi dice: «Non mi reggo più, striscio dietro la
  pietra».», «Livia Sarti dice: «Ultimo goblin: lo blocco contro la porta».»). The clauses left out as designed: «Vedo
  tre goblin…», «Il goblin mi tira la lancia», «Ho zero punti ferita, sono a terra», «Il goblin mi prende alla spalla».
  Still passing: a claim that opens with «Io» («Io sono lento, resto dietro la pietra»: «Io» counts as the PC's own
  act), a world clause after the PC's verb («Sulla strada della grotta incontro una viandante»), targets nobody has;
  a question loses its «?» («Sei Oreste»), and two quotes were cut mid-phrase by the twelve words.
The stall: both stall moves of the round said a prepared stall line (FB T9 and ST T14, «Dal crinale arriva un colpo di
corno, lontano…»); round 4's one S1 had none. The scriptwriter's top-up never fired: the scene still had prepared
material. As expected, the counter did not change: ST reached its first stall move only at T14 (after three answers with
nothing new at T9, T10's «Io non mi fido di Ugo» named an NPC present, a decision, and Ugo's answer reset the count),
and the judge counts 7 of 14 ST answers that brought nothing new.
Not exercised live: no line carried `richiede.esito`, so the card check of the outcome tags never ran in a game (its
effect this round came from the refusals), and the scriptwriter's stall top-up never fired; both are covered by unit
tests only. Answered by a line in the turn or its window (the reader's `[usa] > pg` or a `subito` said in time), round
4 → 5: CM 16/19 → 15/18, CA 14/16 → 12/19, FB 12/13 → 13/13, ST 12/13 → 12/13 public actions; the Engine's own
«unanswered» count is 0 in both rounds because it takes the announcement, which names the PC, as an answer.
The outcome tags: the scriptwriter never wrote `richiede.esito` (the one round-5 answer kept on disk has no `esito` key at
any level, so it is not a misplaced key; why it does not tag is not established). In the two fights 21 of its lines were refused for
telling an outcome without the tag; 8 of those said «dal crollo», a ruin, not a fall (now out of the words), and the
rest named a fall, a parry or a blow («rimbalza», «cade», «giace», «incassa», «a vuoto»). No `subito` line was said for
a later action (round 4: 5). Answers to the actions: none got nothing at all. The actions that got only their
announcement or their card: CM 8, CA 10, FB 1, ST 1, by the judge's count (round 4 counted «announcement only» as 4,
2, 3, 6, with a narrower definition).
Also found: CM T21–T25, the party down and the fight over, Zirrà and Grosso standing, five turns of «Livia Sarti non
agisce.» and nothing moving (no rule for a fallen party); declared attacks the rules arbiter gave no roll («Lo colpisco
ancora», «Carico quello al centro»: CM T9, T11, T12, CA T9, T10); «Oltre a voi, qui non si vede nessuno in piedi» after
the fight forgets Tonio, the boy who stood up at T6 (not one of the Engine's characters); a stage direction spoken as
Zirrà's words (CA T8); the reader's refused pick at FB T5 («pagava» against the theme «pagare») again.

## After round 5 (16 November)
- The due facts of a card (R-dovuto, prove/fatti-dovuti.ts) no longer count the announcement as narration: round 5's CA
  T9 heard «Livia Sarti dice: «Carico quello al centro…»», the check read «centr» as Grosso's hit on Livia, and the hit
  went untold. The announcement row is marked in the turn's output (`attribuita`) and left out of the check.
- Two words out of the Italian outcome lists (`lingue/it/motore.yaml`): «centr» is now «centra» (it read «al centro»
  as a hit) and «crollo» is no longer a defeat word (8 of the 21 scriptwriter lines refused for an untagged outcome
  said «dal crollo», a ruin of the tower). Tests: test/coerenza-prima-frase.test.ts, test/fatti-dovuti.test.ts.
- The announcement leaves out an identity or status claim that opens with «Io» («Io sono lento», «Io sono la più veloce
  di tutti»: «Io» made it look like the PC's own act; in English «I'm»/«I am» unless an -ing verb follows), and keeps
  the «?» of a question the player asked whole («Fulco Granito dice: «Sei Oreste?».»; round 5 said «Sei Oreste» as a
  statement). Tests: test/annuncio-d4.test.ts, test/coerenza-prima-frase.test.ts.
- The announcement is not an answer to the action (`azioniSenzaRisposta` leaves its row out): in profile A an action
  no line answered gets the Engine's acknowledgement («Anna ci prova, ma non ci riesce.», from its card) when its card
  says how it went, or when no scriptwriter will write its line; with the scriptwriter on, an action with no card waits
  for its `subito`, so the table does not hear both. No repair call goes to the small model in profile A. So
  `azioni_senza_risposta` changes meaning from round 6: round 5's zeros in profile A counted the announcement as an
  answer. Test: test/conferma-profilo-a.test.ts.
- The scriptwriter's outcome tag is mandatory in a fight: every line of a combatant declares `richiede.esito`, with two
  new types, `ferito` (someone took a blow this turn: «Ahi! … prendi questa») and `nessuno` (no outcome told; still
  refused if it has an outcome word); the prompt has a real key and one generic example per type, and in a fight the
  request asks a hit and a miss line per likely attack (the Engine says the one the card confirms). Gate before round
  6, two real `claude -p` calls on a fight request: 11 of 12 lines tagged (the twelfth, a narrator line with a
  combatant among its actors and no tag, would be refused), the `subito` answer came as a hit-and-miss pair, so its
  delivery now picks the line the card confirms. The text of refused lines is now recorded.
- The stall counter (the lead's rule): the count starts again only on a real new decision or new information (a roll,
  a scene change, a fight on, a clue or fact brought by a public line, or an action that commits: `stallo.impegno`);
  naming or questioning an NPC with nothing new in the answer counts as stalling, and a fight earlier in the visit no
  longer exempts the turns after it. Offline gate on round 5's scripts and logs: ST stalls from T4 to T12 (S1, S2, S3
  three times; the hard S1 at n 4 and 7 owes two marks to the scene's danger clock), then T13's «poi vado» commits; FB
  never stalls (its players keep «going» somewhere, by their words). Tests: test/mondo-stallo.test.ts.
- The defeat path (docs/combattimento.md): a fight that ends with the whole party down closes the scene with its
  prepared defeat ending (or the Engine's sentence) and pauses the table for the Game Master; round 5's CM had five
  silent turns there. torre-mozza has two defeat endings (Zirrà or Grosso standing). Test: test/sconfitta.test.ts.
- In a fight, the PC's own attack with no target named rolls against its last target (docs/prove.md): round 5 had
  five declared attacks resolved as «nessun tiro».
Not measured live yet.

## Measured, round 6 (profile A, 17 November, `a126c90`)

Runs: `esperimenti/risultati/e2e-finale-3b/coerenzaA6-*`, the same four scripts and setup as rounds 4 and 5 (0.6B
reader, rules arbiters, the sceneggiatore in the background, mock voice, ports 4950–4953, a clean log per run, memory
45–61% free), after the round-5 decisions («After round 5»). Judge: opus, the same rubric, the brief adapted (what is by
design now: the acknowledgements, the defeat path, stall moves on question turns, with a right/wrong verdict asked
for every stall move) (`coerenzaA6-evidenza-opus.md`).

| | CM | CA | FB | ST |
|---|---|---|---|---|
| H heard, opus, round 4 → 5 → 6 | 4 → 1 → 0 | 3 → 1 → 1 | 1 → 0 → 0 | 0 → 0 → 0 |
| of which in the lines' prose | 0 (1 unsure) → 1 → 0 | 1 → 1 → 1 | 0 → 0 → 0 | 0 → 0 → 0 |
| of which in the announcement | 4 → 0 → 0 | 2 → 0 → 0 | 1 → 0 → 0 | 0 → 0 → 0 |
| false claims inside an attributed announcement (not H), round 5 → 6 | 6 → 8 | 5 → 2 | 5 → 11 | 2 → 1 |
| turns played (script turns; server turns) | 25 | 14; 16, paused at the defeat | 13 | 14 |
| median first audio (ms), round 4 → 5 → 6 | 674 → 670 → 542 | 670 → 666 → 681 | 670 → 682 → 670 | 678 → 676 → 684 |
| scriptwriter tag rate in the fights (lines with `richiede.esito` / lines that needed one) | 112 / 115 | 51 / 52 | — | — |
| the tags written (colpito / mancato / ferito / nessuno) | 27 / 33 / 5 / 47 | 13 / 15 / 2 / 21 | 0 / 0 / 0 / 13 | 0 / 0 / 0 / 16 |
| scriptwriter lines accepted / refused | 134 / 21 (outcome word untagged 6, no tag 3, stall tag 6, label 2, away 4) | 68 / 3 | 81 / 3 | 43 / 0 |
| tagged outcome not on the card at delivery (refused) | 2 | 3 | 0 | 0 |
| stall moves | — | — | 0 | 9 (T4–T12) |
| defeat path | — | T16: the prepared ending, then the pause | — | — |
| Engine acknowledgements of unanswered actions | 6 | 5 | 0 | 0 |

Private content heard: 0. A fallen or absent character acting or speaking: 0 (CM: after Zirrà died at T14 every line
was Grosso's or the Engine's). Every PC that went down got its death saves. The coherence events: all right (CM 9,
CA 5); the four refused picks right but one (FB T5, «pagava» against the theme «pagare», again). The one H:
- **CA T15**, a scriptwriter `subito` line answering Nespola's «Ho zero punti ferita, sono a terra.»: «Zirrà: Tre per
  terra, e il fuoco ancora caldo.», while the ledger had two PCs dead and Nespola standing. The scriptwriter took the
  player's claim as true, and a PC's state is not among the facts a line carries (`richiede.stati` is for NPCs).
The stall (ST, 9 moves, judge: 8 right, T9 unsure, a private question the only action): S1 the prepared horn (T4), S2
the prepared clue (T5, «Mancano gli stivali buoni e il mantello…»), S3 the prepared summary (T6, «I cani tirano verso
il bosco…»), the hard S1 twice as a mark of the danger's clock (T7, T10; o_mezzanotte reached 3), S2 the clue lines
(T8 the slate, T11 the posts), S3 the Engine's sentence of the leads (T9, T12; its third «lead» is the last clock
sign). The scriptwriter's top-up was asked twice (T8, T11, level 3). FB had none: its players «go» somewhere almost
every turn (to a mill and a ford the campaign does not have), which commits by the words; the Engine counted 12 of 13
answers with nothing new there. The tags: the scriptwriter now writes them (97–98% of the lines that needed one); the
outcome-word refusal is mostly noise on narration («la terra cade nelle crepe», «il muro crollato», «il buio cade»), and
the delivery check refused 5 `subito` lines whose outcome the card did not have. The defeat path fired once (CA T16):
«Nespola muore.», then the prepared «Zirrà fruga nelle vostre bisacce…», then the pause; it was said over three dead
PCs, so it is now kept for a party that is not all dead («After round 6»).
Also found: CM T11 and T25 declared attacks with no roll («Pugnale ancora, il goblin si gira verso di me»: no
first-person verb; «finisco quello con la lancia»: nobody with a spear, and no R-inesistente line either); the
announcement still keeps a world or someone else's clause after the PC's own words («Oreste dice che sulla collina
c'è una grotta», FB T8) and cuts three quotes mid-phrase; FB T7 and T11: an NPC present answers words addressed to
an NPC who does not exist; the private `subito` answers that reached the phone: 1/2, 0/2, 2/2, 0/0 (the views show the
table only).

## After round 6 (17 November)
- A stall tag from the scriptwriter only at the level its request asked for; elsewhere the key is dropped and the line
  kept (round 6: the `prossime` writer copied `stallo:` from the format block onto ordinary lines: CM T7 lost six lines
  to «stallo 2», and 16 lines in CA, FB and ST never reached the reader's catalogue). The key left the format block;
  the stall task names it.
- The defeat ending is not said when every PC at the table is dead (it assumes survivors: CA T16 heard «Vi lascia
  legati davanti alla porta di ferro» over three dead PCs): the Engine's `regia.righe.sconfitta_morti` instead.
- The announcement keeps only the PC's own words: a later clause that is a claim or someone else's act ends it
  («Pugnale ancora, il goblin si gira verso di me» → «Pugnale ancora»; «Oreste dice che…» and «non si ferma nessuno» are
  someone else's; after a colon the clause is the PC's speech and stays), and it is never cut mid-phrase: a sentence up
  to six words past the twelve is said whole, and a following sentence is joined only if it fits whole (round 6 cut
  «… al goblin che la sta», «… E tu, Berta, se tuo»). Test: test/annuncio-d4.test.ts.
- In a fight a go-on with no verb («Ancora!», «Pugnale ancora») rolls against the PC's last target, like «lo colpisco
  ancora» (round 6, CM T11). Test: test/classificatore-regole.test.ts.
- The outcome-word refusal only on a scriptwriter line by or about a fighter of this visit (speaker, actor, or named):
  round 6 refused narration like «il buio cade», «il muro crollato». Test: test/sceneggiatore.test.ts.
- A PC's state is a line fact too (`richiede.stati: {pg_x: a_terra}`, loader, validator, scriptwriter prompt and
  check): round 6's one H, CA T15, was a scriptwriter line that took a player's «Ho zero punti ferita» as true («Tre
  per terra»). The prompt says a player's claim about the PC is what they believe, and the real states are in «Cosa è
  vero adesso»; the Engine filters the line on the ledger like an NPC's. Test: test/fatti-battuta.test.ts.
- Words to someone the campaign does not have («Chiedo a Oreste…», «Madre Carla, …») get the neutral «Oreste? Qui
  nessuno conosce questo nome.» also with the scriptwriter on, and no NPC answers for them (round 6, FB T7, T11; see
  «Characters the players invent»).
- «Go» to a place the campaign does not have is not a commitment for the stall, and the Engine says where the roads
  really go (docs/mondo.md §5; round 6, FB: a mill, a ford, a cave). Test: test/coerenza-destinazioni.test.ts.
Tests: test/sceneggiatore.test.ts, test/sconfitta.test.ts. Not measured live yet.

## Measured, round 7 (profile A, 17 November, `b656a38`)

Runs: `esperimenti/risultati/e2e-finale-3b/coerenzaA7-*`, the same four scripts and setup as rounds 4–6 (0.6B reader,
rules arbiters, the sceneggiatore in the background, mock voice, ports 4950–4953, a clean log per run, memory 69–74%
free), after the fixes of «After round 6». Judge: opus, the same rubric, the brief adapted to the new by-design lines
(`coerenzaA7-evidenza-opus.md`). This round closes the coherence work for now.

| | CM | CA | FB | ST |
|---|---|---|---|---|
| H heard, opus, round 4 → 5 → 6 → 7 | 4 → 1 → 0 → 0 (1 unsure) | 3 → 1 → 1 → 0 | 1 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| of which in the announcement, round 4 → 7 | 4 → 0 | 2 → 0 | 1 → 0 | 0 → 0 |
| median first audio (ms), round 4 → 7 | 674 → 669 | 670 → 668 | 670 → 674 | 678 → 684 |
| scriptwriter tag rate in the fights (with `richiede.esito` / needed one) | 103 / 106 | 47 / 49 | — | — |
| tagged outcome not on the card at delivery (refused) | 6 | 4 | 0 | 0 |
| stall moves | — | — | 1 (T5, the prepared S1) | 9 (T4–T12) |
| defeat path | T24: every PC dead, «Nessuno di voi si rialza…» | T15: the prepared ending | — | — |

Private content heard: 0. A fallen or absent character acting or speaking: 0. Every death save present. Nothing heard
contradicts a card; some outcomes are only on the cards (misses; CA T15 Zirrà's hit that downed Nespola, which is not
among the facts the Engine owes the table). The unsure one: CM T22, «La mazza cala di taglio, e il colpo rimbomba
contro i muri…» for T21's hit, which may be heard as a miss. All 10 stall moves right (judge); the who-is-there,
due-fact and scriptwriter-filter events right but two unsure. The roads sentence answered FB's mill (T3).
Not as built, found by the judge and by the logs:
- **the invented-name line never fired** (FB T7: Ugo answered «Chiedo a Oreste…» again). Cause: the live lexicon
  (`pronunce-gioco.yaml`, written during play in the campaign's folder) had learned «Oreste» and «Carla» from the
  scriptwriter's pronunciations in round 6's off-the-rails run, so for the Engine they were campaign names. The file
  came from the test runs and was moved out of `campagne/torre-mozza/`; the rule should count only verified lexicon
  entries as known, and test runs should not write into a campaign's folder;
- **«Pugnale ancora» did not roll at CA T11**: the action also names «il goblin», and the named-target path of the
  clear-attack step still needs an attack verb (the go-on words count only when no target is named). **Fixed** after
  round 7: the go-on is read before giving up on a named target, and a name in its own clause aims it (docs/prove.md
  §3; test/classificatore-regole.test.ts);
- the stall's count still resets on a commitment toward something that does not exist (FB T8 «Vado lì, adesso», a
  cave with no name; T11 seizing a cart nobody has);
- the S3 sentence of the leads lists the last clock sign as a «road»; a scriptwriter line confirmed a ford that does not
  exist (FB T7); repeated catchphrases («Le pecore non aspettano.», «Ugo batte la pala per terra due volte.»).
The PC-state tag was used once (CA). The announcement: 0 H, every false claim attributed; one world clause kept (FB
T9) and some questions and later own clauses dropped by the «one sentence» rule.

## After round 7 (17 November, package P1)
- The lexicon learned in play: a test instance keeps it in its log folder, and only its verified entries count as
  known names (docs/pronuncia.md; the cause of round 7's silent invented-name line).
- A scriptwriter line may not take as true a place or a person the players invented in this visit (an unknown
  destination's head word, an invented name); a sentence that denies it passes, and «Cosa è vero adesso» of its
  request lists them (docs/sceneggiatore.md). Test: test/sceneggiatore.test.ts, test/coerenza-destinazioni.test.ts.

- A commitment toward something that does not exist does not reset the stall: going «there» after naming a place
  nobody knows, or speaking to an invented name (docs/mondo.md §5); a sentence-initial vocative in a sentence that
  speaks to someone is an invented name too. Test: test/coerenza-destinazioni.test.ts, test/coerenza-nomi-nuovi.test.ts.

- R-fuori judges the state per clause, not per sentence (docs/combattimento.md §3): on the frozen replay set the rules'
  path catches 82 of 117 (76 before), touching the same 4 clean sentences. Test: test/guardia-fuori.test.ts.

- **A replay set of the private replies** (A7): the private replies stay on the rules (no yes/no judge on them), and
  their raw text has been logged since round 3 (`tipo: risposta_privata`). `coerenza-insieme.ts --private --tutte`
  builds their set from the runs that have it (`esperimenti/coerenza/insieme-private.json`: 10 replies of round 3 and
  of the smoke run), labelled by hand like the public one (`etichette-private.json`: 8 sentences, 7 violations, all an
  out-of-play or invented goblin speaking in a private reply during the fight), then by an opus subagent blind on all
  25 sentences: it agreed on all 8 and called two more doubtful violations (Ugo's mule, Tonio looking), labelled clean
  by the public set's precedent («Tonio watches: a character in the scene»). Score (`coerenza-punteggio.ts --insieme
  private`): the rules catch 6 of 7 and touch no clean sentence; the miss is a sentence carried with no subject after
  a preposition («Tra un respiro e l'altro sussurra: …»), which R-fuori does not carry by design.

## Final round (profile A, 18–19 November)

Riccardo's goal (17 November): close the actionable items of `docs/da-fare.md`, then play a full blind round with
0 H. The round was played after packages P1 and P2. Setup:
- profile A: the Qwen3 0.6B reader on 4613, the rules arbiters, the sceneggiatore in the background (`claude -p`)
  and the mock voice;
- ports 4960–4964, one game at a time;
- before each game the driver checks memory (≥ 25% free), disk (≥ 1000 MB) and swap (≤ 8 GB)
  (`esperimenti/risultati/finale/giro.sh`).

The scripts were the four blind torre-mozza scripts: combat with manual rolls (CM) and with automatic rolls (CA),
off the rails (FB) and stall (ST). The fifth was `pressione` (PR), run B-style in profile A. It also checks A31:
the server's ERROR «parola segreta nel messaggio del selettore» when a player's own words hold a secret. At T5 of
every PR game Livia tells Berta in private about the bailiff and the unpaid tithe.

The judge was an opus subagent with the rounds' rubric (`esperimenti/risultati/finale/brief-giudice.md`; from attempt 4
`finale4-brief-giudice.md`, which adds what changed). Evidence: `esperimenti/risultati/finale/finale{1..5}-torre-mozza-*`
and `finale{1..5}-evidenza-opus*.md`. When an attempt had an H, its cause was fixed with a test, and the round was
played again. From attempt 3 on, the lead also had the unsure items that lean H fixed before calling it done.

| attempt (HEAD) | CM | CA | FB | ST | PR | H | A31 ERRORs |
|---|---|---|---|---|---|---|---|
| 1 (`121b271`) | 0 | 0 (1 unsure) | 0 | 0 | 1 | 1 | FB 3, ST 1, others 0 |
| 2 (`a92555d`) | 0 | 0 (1 unsure) | 0 | 0 | 1 | 1 | 0 in all five |
| 3 (`ab2fc7d`) | 0 (2 unsure) | 0 (2 unsure) | 0 | 0 | 0 | **0** | 0 in all five |
| 3, second judge | 0 (1 unsure) | 0 (1 unsure) | 0 (1 unsure) | 0 | 0 (1 unsure) | **0** | — |
| 4 (`e44cea5`) | 0 (3 unsure) | 0 (1 unsure) | 0 | 0 | 0 (3 unsure) | **0** | 0 in all five |
| 5 (`6206bd1`, CM and PR only) | 0 (3 unsure) | — | — | — | 1 (2 unsure) | 1 | 0 in both |
| 6 (`60de6b0`) | 0 (2 unsure) | 0 (3 unsure) | 0 (2 unsure) | 0 (2 unsure) | 0 (3 unsure) | **0** | 0 in all five |

The H and their fixes:
- **Attempt 1, PR T1.** Livia's Carisma check succeeded (20 against 17), yet the table heard Berta's refusal, «Questo
  non lo so…». The confession was out of context for that action, so the Engine took Berta's deflection instead.
  `fe01d82`: a release line out of context after a successful check is no longer replaced by a refusal. The Engine
  first tries the line it indicated for that action (test/rilascio-indicata.test.ts).
- **Attempt 1, A31.** FB had 3 ERRORs and ST had 1. Each came from the `quando` of a scriptwriter line, which goes
  into the reader's catalogue: «un PG accusa Ugo di aver portato i goblin alla torre» and «un PG chiede a Ugo se ha
  visto salire qualcuno». Both are public. They matched only because torre-mozza's secret-word regexes were too broad.
  `0cb4448`: those regexes now need Tonio or the boy, and the scriptwriter's validator checks `quando` for secret
  words as it checks the text («parole segrete nel quando», test/sceneggiatore.test.ts).
- **Attempt 2, PR T2.** Eliandro failed his Intelligence check, and the table still heard the slate clue: «Ogni erre è
  rovesciata…». `ab2fc7d`: a release line is refused for an action whose check failed, and has no passed one. The
  NPC's deflection is said instead, and the Engine no longer indicates release lines for such an action
  (test/rilascio-indicata.test.ts, docs/prove.md).

Attempt 3 has 0 H in all five games, the goal. The first judge's four unsure items were Grosso answering «Ehi goblin!
Chi vi paga?» (CM T19, CA T17: defensible, the plural and the only foe standing), «La spada corta batte sullo scudo
rosso» (CA T8, may retell a miss) and a cellar-door line (CM T24). It counted no wrong over-fire, and all 15 stall
moves were right.

A second, independent opus judge (`finale3-evidenza-opus-2.md`) also counted 0 certain H. It flagged four things that
are H by the letter of the rubric. All four were fixed before attempt 4:
- the defeat ending «Vi sveglia il freddo» said with one PC dead (CM T32, CA T22, PR T32). `e44cea5`: an ending says
  the PCs' states it assumes (`richiede.stati.tutti`), and torre-mozza has a second ending that fits a dead PC (docs/
  combattimento.md);
- announcements that kept a world or state clause and dropped the PC's act (CM T15, CA T14, FB T9, PR T12/T13).
  `9ec6177`, «After round 4» above;
- a Charisma success answered by Berta's rebuff (FB T2). `86a972e`: who gave way to a passed social check has no
  refusal lines for the turn, and «Cosa è vero adesso» says so (docs/prove.md);
- the clock sign said word for word again by a stall line (ST T7/T9). `7135e01`: the Engine does not pick a line the
  table heard in the last three turns (docs/mondo.md).

After attempt 3 torre-mozza's boy also got his NPC sheet (`95eafa4`, below).

Attempt 4 has 0 certain H in all five games. The judge had 7 unsure items. Three lean H, and each had a general fix
before attempt 5:
- **PR T18:** the table heard «Eliandro cade a terra.» and the round order before Eliandro's own announcement. The
  Engine took his announcement, which quoted a question, for the narrator's closing invitation. `f767a61`: the
  invitation is never an announcement (docs/combattimento.md);
- **PR T11/T13:** a surprised Zirrà, who lost the round, snapped her fingers, kicked the fire and spoke. `b8ffb24`: an
  NPC losing the round neither acts nor speaks in a line of it, and R-fuori replaces a sentence where it acts
  (docs/combattimento.md, «Surprise»);
- **CM T19:** a scriptwriter line, «Sui sassi gelati resta una striscia scura…», implied a wound no card had dealt. It
  was built on the player's «sento sangue». `4824d8e`: a line telling a wound or a fall says whose, and the ledger
  checks it, with the new class `ferito` (docs/sceneggiatore.md).

Also fixed: the round order said after a PC's death named the dead PC (CM T24, `6206bd1`).

The other four unsure items are announcements that keep a false relative or label clause inside the PC's own act.
They are attributed: «…al goblin che la sta per colpire» (CM T12), «…che scappa verso le scale» (PR T15), and
«Ultimo goblin: lo blocco…» (CM T23, CA T18; corrected at the table at CM T23 by the who-is-there line).

Checked in the attempt-4 logs: 0 ERROR lines, and the new announcements as intended. The defeat path at PR T23 chose
the ending that ties everybody: nobody at the table was dead. There was no successful social check and no Engine
repeat, so those two fixes are covered only by their tests.

Attempt 5 replayed CM and PR, where those cases happened, on `6206bd1`. CM had 0 H; PR had 1:
- **PR T15:** a scriptwriter line written for T14, «Nessun dardo parte: … il mantello grigio resta fermo.», was heard
  after the card of Eliandro's dart that hit («Eliandro colpisce Zirrà.»). Eliandro had cast, then died later in T14,
  and the scriptwriter took his action for a dead PC's attempt. The line carried `esito: nessuno` and named no
  fighter, so neither the tag rule nor the outcome-word refusal saw it. `60de6b0`: in a fight any line that tells an
  attack's outcome (a weapon or a spell with a hit or miss word, a launch verb, or «nessun …») carries a real
  `richiede.esito`, which the Engine checks against the cards of the line's own turn (docs/sceneggiatore.md).
- **CM T9 (unsure):** Grosso's surprise ended in that turn's facts («Grosso: Sorpreso finisce.»), and his filler was
  heard before the new round's order. `fd022ca`: a lose-turn condition that ends in a turn holds for that turn's
  narration; the block writes it in lowercase.

The other unsure items: an announcement's false relative clause (CM T17), a soft miss line that matches its card (CM
T23), Zirrà answering an invented hold (PR T20), and `nar_piccone` given for an action it does not answer (PR T11).
In attempt 5 the logs also show the new rules at work: the surprised NPCs marked in the block for their round, one
wound line refused per game, and the defeat ending for a dead PC («chi respira ancora», PR).

**Attempt 6** replayed all five games on `60de6b0` (the opus judge in `finale6-evidenza-opus.md`, brief
`finale6-brief-giudice.md`). It had 0 certain H in every game, a full blind round with 0 H, after all the fixes; that is
Riccardo's goal. The logs show the new rules at work:
- the passed-social-check rule live for the first time («Hanno ceduto…»: FB once, PR twice);
- the attack-outcome guard refusing one line (PR), and the wound guard refusing four (CM 2, CA 1, PR 1);
- the defeat ending that wakes everybody said only with nobody dead (CM).

The judge found two regressions of the round's own rules, fixed after it:
- **CM T17, CA T14:** «Non lo colpisco ancora, aspetto la risposta» rolled an attack at the last target. `e551935`: a
  negated attack verb is no attack (docs/prove.md);
- **CA T10:** a late line's true miss, written for T7, was refused at T10 («no card of this turn says so»). The Engine
  kept only the last turn's cards. `fa5ba86`: the cards of an earlier turn come from the recent ones
  (docs/sceneggiatore.md).

A short confirmation run of CM on `e551935` checked T17 (below).

**Confirmation run** (CM only, `e551935`, profile A, `esperimenti/risultati/finale/conferma-torre-mozza-combattimento-A-manuale/`):
at T17 the table hears only the player's words, «Livia Sarti: «Non lo colpisco ancora, aspetto la risposta».», then
Tonio's line; no roll and no hit. The server log has 0 ERROR lines. No judge was run on it: it checks the two fixes, it
is not a new round.

The other unsure items of attempt 6 are not H classes:
- the scriptwriter contradicts prepared clue facts: chalk against charcoal on the slate (ST T4 vs T8); two sets of
  sheep names on the posts (ST T7 vs T11); the boy's hands «legate» again after he dropped the rope (PR T19 vs T11);
- a scriptwriter's key handover the ledger never registered (FB T2, then Berta «aspetto qui con la chiave» at T6);
- a soft line after a failed check (PR T4) and Berta's urging after a passed one (PR T6);
- Zirrà assuming Grosso asleep (CM T16), a late threat (CA T14), an idle line in the turn she strikes (CA T7), Berta
  heard after a question to the invented «Madre Carla» (FB T11).

Live checks (Playwright), both passed:
- A9: on the projector a dead NPC shows greyed with «MORTO». Seen live during attempt 1's CM game, on Zirrà
  (`finale1-fila-fuori-CM.png`, `apps/web/e2e/fila-fuori.spec.ts`).
- A25: the panel's «Cambia a mano» on torre-mozza, on port 4965 with the scripted narrator
  (`finale1-cambia-a-mano.png`).

A31 needed a game where a player's own words hold a secret. That happened at PR T5 in all three attempts, with 0
ERROR lines each time. After `0cb4448` no game had an ERROR line, so L1 is closed in play.

**The boy without a sheet.** Attempts 1 and 2 both had the same unsure case, CA T17 and T16. Tonio's confession
(«Il ragazzo tiene gli occhi bassi e parla piano…») came as the answer to a question put to a dead goblin. Right
after it the Engine said «Oltre a voi, qui non si vede nessuno in piedi». The boy had no NPC sheet, so for the Engine
he was not there.

He has one now (`95eafa4`): a minimal comparsa, in the tower's `png_presenti`, with his rows tagged. The new validator
warning `PNG.senza_scheda` flags a character who acts in narrator rows with no sheet (docs/repertorio.md). It also
fires on nozze-neve, ponte-lanterne and prova-f0, which still need sheets for such characters.

The sheet makes the Engine count him as present («Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» in
attempt 4). It does not tie a confession to the character the question was put to: the line's actors are checked for
presence and state, not against the action's addressee. Attempt 3 was measured without the sheet, attempt 4 with it.

Still open, none of it H (judges of attempts 3 to 6):
- **Announcements** keep a false relative or label clause inside the PC's own act («al goblin che scappa», «Ultimo
  goblin:»). All of them are attributed.
- **The combat flow:**
  - PCs act several times inside one round before the NPCs reach their slot (attempt 3, CM: Zirrà was killed in round
    1 without acting);
  - some declared attacks get no roll;
  - death saves come one turn late.
- **The stall counter** resets on non-commitments (FB T6, ST T13 in attempt 3).
- **Public actions with no answer at the table** (attempt 3): CM 8, CA 5, FB 4, ST 2, PR 8.
- **The 0.6B reader** often returns invalid JSON, so the Engine's deterministic fallback picks the line.
- **The theme matcher** misses inflections that are not a prefix («pagava» for the theme «pagare», attempt 4, FB T5).
  A safe stem match needs the language's verb endings in the pack.
- **The scriptwriter contradicts prepared clue facts** (attempt 6: chalk or charcoal, the sheep names, the rope): its
  request needs the clue facts already told in this visit.
- **An object handover told by a scriptwriter line** is not tracked in the ledger (FB, the key).
- **R-ripetuta does not reach a catchphrase across distant turns** (Berta's «Le pecore non aspettano» at T2 and T12).
## Characters the players invent (Riccardo's decision, 16 November)

The blind off-the-rails script addressed «Oreste» and «Madre Carla», people the campaign never had; Berta and Ugo
answered for them (bug 9). The players' new names are found by `apps/server/src/coerenza/nomi-nuovi.ts`: a capitalised
word in mid-sentence of a public action that the campaign does not know (no PC, NPC, alias, lexicon entry
(`pronunce.yaml`, `pronunce-gioco.yaml`) or capitalised word of its texts) and that is not an ordinary word, the same
evidence the dictation uses to learn a name. Dry run over the 380 actions of every run folder in
`esperimenti/risultati/e2e-finale-3b/`: only «Oreste» (8 actions) and «Carla» (16, «Madre» being an ordinary word).
- **Mode B and the local reader** (built): no narrator can bring a minor character in, so the Engine answers a new
  name with a neutral line before the invitation, once per name in a visit of the scene («Oreste? Qui nessuno conosce
  questo nome.», `coerenza.nome_nuovo`: neutral for a person or a place), and «Cosa è vero adesso» gets «Nessuno in
  scena si chiama Oreste: nessun PNG risponde a quel nome, non dargli voce.»; the log has «coherence: nobody here has
  that name, said by the Engine» and narrazioni.jsonl a record `tipo: nome_inventato`. With the scriptwriter on, for a
  name the action speaks to (`nomiRivolti`: a vocative, «chiedo a Oreste», «Sei Oreste?»; a mention, «il santuario di
  Brychan», stays the scriptwriter's, with its pronunciation): round 6 had Ugo and Berta answer words to «Oreste» and
  «Madre Carla». And in both cases no NPC line answers such an action unless it names that NPC (the reader's pick is
  refused), and no `subito` is asked for it. Tests: test/coerenza-nomi-nuovi.test.ts.
- **Mode A** (built): a minor improvised NPC may enter through `[nuovo png] Nome, ruolo` (parser
  `narrazione/parser.ts`; the narrator prompts it and en say when). The director (`improvvisatiDalNarratore`) takes one
  a response and at most 8 a session, never a name the campaign has, and only with an improvising narrator (mode B
  and the local reader refuse it: the neutral line answers there). It gets the id `png_imp_<name>`, enters the scene
  now (the visit's presence), the ledger as `improvvisato` (no stats; «Cosa è vero adesso» says «Oreste in piedi
  (improvvisato: nessuna statistica, non sa nessun segreto)»), `[esce] Oreste` takes it out like any NPC, and it is
  written to narrazioni.jsonl (`tipo: png_improvvisato`), the snapshot (a resume finds it) and the session register
  (`png_improvvisati`), which `scripts/tra-sessioni.sh` lists for the Preparer to keep, recast or drop
  (.claude/skills/preparatore/riferimenti/tra-le-sessioni.md). It speaks only in `[narratore]` lines. Tests:
  test/coerenza-improvvisati.test.ts, strumenti/test_tra_sessioni.py.
- **A silent exit** (Ugo leaves with no `[esce]`, then speaks; built): the judge asks aside, never blocking the voice,
  for each NPC in the scene and in play that a public narrator sentence names: «nella frase da controllare, Ugo lascia
  la scena adesso…?» (`coerenza.domanda.esce`); on «si» the director takes it as the narrator's `[esce]` (the same
  checks; log «presence: silent exit, from the yes/no question»), so R-assente drops Ugo's later lines and the ledger
  has him gone. Scored offline first (`insieme-uscite.json`, `etichette-uscite.json`: the 188 narrator sentences of
  the stall and off-the-rails runs, `coerenza*`, `canary-*`, `prima-*`, that name an NPC in the scene; two labelled
  exits, one of them unsure): **0 false «si» on 186 sentences where the NPC stays**, the clear exit caught («Ugo sputa,
  si volta verso il sentiero del bosco e si incammina verso la carbonaia»), the unsure one («… e poi torna alla
  carbonaia») not. A false «si» would silence a present NPC for the visit, hence the zero is the condition. Only with
  the judge (profile B). Test: test/coerenza-giudice.test.ts.

## The invented goblins: data, not checker? (16 November)

torre-mozza has exactly two foes at the tower, both with sheets: Zirrà (aliases goblin, goblina, capobanda) and
Grosso (hobgoblin). Its data say so: the tower scene's `png_presenti: [png_zirra, png_grosso]`, its opening («una
goblin svelta, … un hobgoblin»), and the narrator-facing `vincoli_pubblici` «Nella banda ci sono solo Zirrà e Grosso:
gli altri goblin se ne sono andati.» (in the narrator's scene context, campagna/contesto.ts). The plural elsewhere
(«una banda di goblin» known to the PCs, «i goblin chiamano», the front «I goblin della Torre Mozza») is the village's
view of the band, not more creatures. So no `gregari` were added: the third goblin is the blind script's («Vedo tre
goblin davanti alla porta»), and the narration followed the players over its own scene sheet; that is the checker's
job (R-inesistente, the yes/no candidate). Why the validator's warning `SCHEDA.nemici_senza_statistiche`
(strumenti/valida/regole_gregari.py) stayed silent: it compares a scene's public text with the words of the
campaign's declared minion types, and torre-mozza declares none; with a type declared, «goblin» in the tower's text
would still be covered by Zirrà, an NPC with a sheet and that alias. It is right not to fire here.

## Risks and limits
- The checker still reads Italian or English words: the subject of a sentence, a fall, a hit. A sentence that names a
  creature by a noun outside its aliases («la creatura») is not seen. The ledger makes the rules simpler (one notion
  of present, down, known), not omniscient.
- A stale ledger raises false violations: every Engine event must write its journal entry, and a test per event type
  checks it.
- The repair call adds latency and cost; it is off when the voice would wait, and its success rate is measured before
  it becomes the default.
