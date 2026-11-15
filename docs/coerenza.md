# Coherence: one ledger, one block, one checker (design, 16 November 2026)

What this page is: the design of the coherence layer Riccardo asked for after the third e2e pass («sistema i bug,
studia un sistema che fixi in particolare la coerenza; usa qualcosa per segnarti queste cose e far sì che diventi
visibile quando necessario»). It replaces the habit of one guard per bug. Status: **approved by the lead on 16
November, being built in the order of «Order of work»**; nothing below is built yet except where marked «exists» or
«done».

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
  violations (rule, sentence, what was done). **Projector**: a mark on a downed or dead NPC's portrait, if cheap.

### 3. One checker (`apps/server/src/coerenza/verifica.ts`)
Every sentence, narrator or NPC, public or private, goes through one pipeline before the voice, against the ledger
of that moment, in every profile and mode: the improvised narration, the selector's prewritten lines (mode B) and the
local minimal reader's (prewritten lines can contradict the state too). The existing guards become rules behind one interface (`(frase, registro) → Violazione | null`), each
with an id and its word lists in the language pack:
`R-fuori` dead, down or fled who acts or speaks; `R-assente` an NPC not in the scene who speaks or acts; `R-esito` an
outcome against its card (polarity, target, a fall without a fact); `R-privato` a private fact in a public sentence
(the audience split makes it a backstop); `R-segreto`; `R-rifiuto`; `R-numeri`; `R-ripetuta` a recent line word for
word; `R-eco` the player's words restated beyond the announcement; and the end-of-turn `R-dovuto` (a card's fact not
told).
On a violation: (a) when the sentence is not yet needed by the voice (the buffer has slack) and a fast model is
available, one targeted repair: a short call with the exact error and the ledger rows, with a hard deadline (to
measure; about 1.5 s); (b) otherwise (profile A with the local reader goes straight here), or if the repair fails the
same rule again, the Engine's own sentence (exists: the guards' lines) or a drop. Every
violation is one log line and one record in `narrazioni.jsonl` (`tipo: violazione`, rule, sentence, action), counted
by `misure.py` per rule; the independent detector of what the table heard (`private_al_tavolo.py`) stays as a cross
check, so a leak can no longer hide behind a 0.

### Order of work (each step its own commit, tests on invented fixtures, docs in the same commit)
1. Ledger as a read model + journal + snapshot; no behaviour change. 2. The checker interface, the eleven guards moved
behind it with their tests unchanged, violations logged and counted. 3. The «Cosa è vero adesso» block replacing the
scattered sections. 4. The audience split for private actions. 5. Presence tags. 6. The panel box (and the projector
mark). 7. The targeted repair with its deadline, measured on the three e2e scripts. Then the e2e pass again.

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

## Risks and limits
- The checker still reads Italian or English words: the subject of a sentence, a fall, a hit. A sentence that names a
  creature by a noun outside its aliases («la creatura») is not seen. The ledger makes the rules simpler (one notion
  of present, down, known), not omniscient.
- A stale ledger raises false violations: every Engine event must write its journal entry, and a test per event type
  checks it.
- The repair call adds latency and cost; it is off when the voice would wait, and its success rate is measured before
  it becomes the default.
