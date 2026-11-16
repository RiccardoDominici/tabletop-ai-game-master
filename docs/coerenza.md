# Coherence: one ledger, one block, one checker (design, 16 November 2026)

What this page is: the design of the coherence layer Riccardo asked for after the third e2e pass («sistema i bug,
studia un sistema che fixi in particolare la coerenza; usa qualcosa per segnarti queste cose e far sì che diventi
visibile quando necessario»). It replaces the habit of one guard per bug. Status: **built on 16 November** (steps 1–7
of «Order of work», `85a8340`…`2a7697c`), **measured** on the three blind scripts («Measured, round 1»: the success criterion
is not met yet), then fixed further (`5870930`…`97121cb`, not yet measured on the scripts). Not built: `R-eco` and the
projector mark (marked below).

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
  what it denies (`negati`, `fallite`).
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
  violations (rule, sentence, what was done). **Projector**: a mark on a downed or dead NPC's portrait, if cheap (not
built: the fallen already leave the projector's present list).

### 3. One checker (`apps/server/src/coerenza/verifica.ts`)
Every sentence, narrator or NPC, public or private, goes through one pipeline before the voice, against the ledger
of that moment, in every profile and mode: the improvised narration, the selector's prewritten lines (mode B) and the
local minimal reader's (prewritten lines can contradict the state too). The existing guards become rules behind one interface (`(frase, registro) → Violazione | null`), each
with an id and its word lists in the language pack:
`R-fuori` dead, down or fled who acts or speaks; `R-inesistente` a creature nobody in the scene answers to, attacked or
acting (built after round 1, below); `R-assente` an NPC not in the scene who speaks or acts; `R-esito` an
outcome against its card (polarity, target, a fall without a fact); `R-privato` a private fact in a public sentence
(the audience split makes it a backstop); `R-segreto`; `R-rifiuto`; `R-numeri`; `R-ripetuta` a recent line word for
word; `R-eco` the player's words restated beyond the announcement (not built: no rule yet, the measured runs had no
echo above the old repetition check); and the end-of-turn `R-dovuto` (a card's fact not told).
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
   (SezioneCoerenza.test.ts), not yet looked at in a browser. **Not done**: the projector mark on a downed NPC (the
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
Fixed after round 2 (tests on invented fixtures, **not measured on the scripts**): R-inesistente judges the state per
clause, and a state skips only where a body the noun could mean lies in the scene («Il goblin la ferisce alla spalla:
…, e lei sente il sangue» is caught); the object of any verb («spinge il goblin», «che il goblin si volti»); no carry
on relative pronouns (`inesistenti.relativi`: «Che fai?» stays); in a fight or after one in this visit every absent
noun is judged, named by the actions or not (so the model's repair, checked by the same guard, can no longer bring the
goblin back in a turn whose actions did not name it); a noun that names someone fled or fallen is left to R-fuori when
it is only the subject (its line and its carried subject); the line of who is really there at most once in three
turns. The absorbed-blow rule takes only a non-negated word and a target in a prepositional phrase («sulla spalla di
Fulco»). Still open: R-fuori's whole-sentence state check («non si muove verso la scala» read as a state), presence
without `[esce]` (bug 9), the NPCs the players invent (bug 9), the stall's repeated S3 sentence.

## Risks and limits
- The checker still reads Italian or English words: the subject of a sentence, a fall, a hit. A sentence that names a
  creature by a noun outside its aliases («la creatura») is not seen. The ledger makes the rules simpler (one notion
  of present, down, known), not omniscient.
- A stale ledger raises false violations: every Engine event must write its journal entry, and a test per event type
  checks it.
- The repair call adds latency and cost; it is off when the voice would wait, and its success rate is measured before
  it becomes the default.
