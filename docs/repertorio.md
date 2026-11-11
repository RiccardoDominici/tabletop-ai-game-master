# Repertoire: lines written in advance, chosen in the moment

Riccardo's proposal (2 November 2026): a strong model writes the dialogues and the important moments **beforehand**;
during play the fast model **chooses** which line to start; it improvises only what has not been foreseen.

It is the idea of the *beats* of Façade and of *storylets* (quality-based narrative): hand-written pieces, each with
**conditions** to be eligible and **effects** on the state. Here the «gestore» (manager) that picks them is Haiku, and
Haiku fills the gaps with short improvised sentences.

## Why it pays off (three gains in one)

1. **Quality.** The lines that matter (lies, confessions, clues, signs of the threat, key moments) are written by Opus
   calmly, following the manual; they can be re-read and corrected before the session.
2. **Latency.** The text is known in advance: the audio is **generated beforehand** with the cloned voice of the NPC.
   In play it starts right away, without waiting for synthesis and without the risk of Qwen's thin margin (RTF 0.9–1.0).
3. **Secrets.** The lines that touch a secret are already written: the fast model no longer needs to know the secret.
   It sees only the id and a description without secrets (e.g. "Ottavia gives in on the rye"). It cannot reveal what it
   does not know (E2 taken to the extreme).

The price: coverage. If the players do something unforeseen, it is improvised (as today). Later, the Director in the
background will write new lines for the topics that emerge (the background «studio» (study)), so coverage grows during
the session.

## File: `campagne/<id>/repertorio/*.yaml`

One file per NPC (`png_<nome>.yaml`) plus `narrazione.yaml` (clues, clock signs, moments, transitions).

```yaml
battute:
  - id: ott_segale_domanda          # unique in the campaign, lowercase ascii
    chi: png_ottavia                  # or narratore (narrator)
    tipo: menzogna                    # menzogna | verita | confessione | reazione | rifiuto | richiesta |
                                      # saluto | indizio | segno_orologio | momento | transizione | finale
    quando: "un PG chiede da dove viene la segale"   # ≤ 15 words, WITHOUT secrets: this is what the selector sees
    temi: [segale, mugnaio, pane]     # keywords for the Engine's prefilter
    richiede:                         # conditions checked by the Engine, all true (optional fields)
      indizi_rivelati: []             # ids of clues already revealed
      indizi_non_rivelati: []
      battute_usate: []               # ids of lines already used
      battute_non_usate: []
      orologio: {id: o_colpevole, min: 0, max: 3}   # signs already shown, bounds included
      privata: true                   # responds only to an action marked private from the phone
      da_pg: [pg_assenzio]            # responds only to actions by these PCs
      oppure: []                      # alternatives: base AND at least one (see «Dalla prova cieca di ponte-lanterne», i.e. "From the blind check of ponte-lanterne")
    testo:                            # lines in the narrator's protocol, in order
      - "[narratore] Ottavia si sistema il fazzoletto rosso."
      - "[png_ottavia] La segale è di Gualtiero, come ogni anno. Buona."
    varianti:                         # 0–2 other versions of the same content, to avoid repeating
      - ["[narratore] …", "[png_ottavia] …"]
    effetti:                          # applied by the Engine when the line comes out
      rivela_indizi: []
      menzogna_detta: ott_segale      # records the lie (fixed version, signal shown)
      fatti_noti: []                  # canon facts that the PCs now know
      avanza_orologio: null           # id of the clock if it is a sign
    max_usi: 1                        # variants count as uses of the same line
```

Rules for whoever writes the lines:
- text following the rules of the manual §5 and §6 (short sentences, the NPC's voice, a signal when lying, no PC
  decisions made for them);
- **no PC names** in the lines: address the group in the plural (*voi*) or the single person without a name; the name
  and the invitation are added by the improvisation;
- each NPC speaks only about what is in its `sa`, as today;
- minimum coverage: each clue has its revelation line (one for each way in `come_si_trova`), each lie its version with a
  signal, each `cede_se` its confession, each clock sign its line, each ending its closing; for each NPC, reactions to a
  kind question, an accusation, a threat, an offer, help, a greeting, and a polite refusal for topics outside its `sa`.

## Selector protocol (Haiku)

Lines as today, plus a new one:

```
[usa] <id_battuta>          the pre-written line comes out here, in this order (not rewritten)
[narratore] …               brief improvised bridge (minor outcome, PC name, invitation)
[png_<nome>] …              only if no line fits; the Engine counts it as improvisation
[invito] pg_…              as today, always last
```

- The Engine puts in the context of each turn the **list of available lines** (true conditions, uses left):
  `id · chi · tipo · quando`. Never the text of lines not yet come out. The type is **neutral**: `menzogna`, `verita`
  and `confessione` become `risposta` (they would tell the selector who is lying); the real type stays in the logs and
  in the Game Master's panel.
- `[usa]` with an id that is not available: discarded and recorded.
- **Multiple scenes**: a line with `scena: <id>` enters the catalog only in that scene; without `scena` it applies
  everywhere.
- **Return**: returning to a scene already visited, the Engine does not reread the opening (nor, for the first scene,
  the session recap): it says the sheet's `rientro` line (`rientro: tr_casera`, if still available; it comes out and
  counts as used), or the text of `rientro`, or the first sentence of the opening.
- **Clue modes**: the revelation lines of a clue with `modi` ≥ 2 are alternative routes. Once found by one route, the
  others (revelation only, facts already known) leave the catalog. At startup the Engine warns if a clue has fewer
  revelation lines than its modes.
- **Lies already told**: `effetti.menzogna_detta` is the id of a `mente_su` of the NPC. After it has come out, the turn's
  message carries «Menzogne già dette» (Lies already told) with the version (already public), so the improvising NPC
  does not contradict itself; the truth never enters.
- **Gates on the action** (`richiede.privata`, `richiede.da_pg`): the Engine puts a line in the catalog only if the turn
  contains an action it can answer (private for `privata: true`, from the listed PCs for `da_pg`), and accepts
  `[usa] <id> > <pg>` only toward that action. Lines without a gate answer only public actions: a private action
  receives no generic lines.
- The effects are applied by the Engine; the `[orologio]` line is no longer needed for signs written in the repertoire.
- In the public transcript goes the text of the line that came out (it is public by now).
- **Selector context**: in repertoire mode the secrets leave Haiku's context (truth of the lies, `segreto`, canon facts
  with `noto_ai_pg: false` not yet revealed). What remains is the public information, the NPCs' character, and their
  public `sa`.

## From the blind check of ponte-lanterne (applied by the Engine)

These were proposals from the validator and from the Preparer's skill; the server has applied them since the evening of
2 November.

- **`richiede.oppure: [{…}, {…}]`**: the line is available if the base conditions hold **and** at least one of the
  alternatives. Each alternative is a block with the same keys as `richiede` (no nested `oppure`, at least two blocks).
  For action gates the open alternative applies: `{privata: true}` or `{indizi_rivelati: [i_x]}` means "a private
  action, or a public action after the clue". The base and alternative lists are combined; `da_pg` is the intersection
  if both state it. The loader rejects every `richiede` key it does not know: an ignored key would open the gate.
  A route with `prova` and another without (final e2e, D2): after a failed roll the Engine closes the line (docs/prove.md,
  «La carta e la storia d'accordo» (The card and the story in agreement)), but whoever does not roll gets it by the
  other route. The validator flags this with a warning (`REPERTORIO.prova_aggirabile`): if it is not intended, the check
  goes into the base or into every route.
- **`orologi[].parte_dopo: [<id battuta o indizio>]`**: the clock starts running when one of those lines comes out or one
  of those clues is revealed. Before that it does not advance, does not count for `segno_almeno_ogni` (the pace counts
  from the start), its signs do not enter the catalog, and the narrator sees it as stopped. In mode A the lines have no
  ids: the Game Master starts it with the +1 of the panel.
- **NPCs present**: only lines where the speaker is on stage enter the catalog: `chi` and every `[png_…]` in the lines and
  variants must be among the `png_presenti` of the scene in progress (the narrator always). `scena` also accepts a list
  (`scena: [scena_ponte_imbrunire, scena_terzo_tocco]`). The validator's measure of the scripts follows the same rules.

## Version 2 (after experiment A/B no. 1)

The blind judgment (`esperimenti/giudizio-ab-1/conclusioni.md`) showed that the selector fills the turns with *available*
lines instead of answering the actions. It therefore changes as follows:

- **Link to the action**: `[usa] <id> > <pg_id>` says which action the line answers. A line without `> pg` is admitted
  only if it is the due sign of its clock, an ending, or a move against a stall. The Engine rejects the output if a
  declared action remains without an answer (neither a line nor an improvised line addressed to that PC).
- **Only what matters comes out pre-written**: lies, confessions, clues, clock signs, moments, endings. Generic reactions
  have `solo_esempio: true`: they do not enter the catalog, but they go into the context as **examples of the voice** of
  the NPC for the improvisation.
- **Relevant catalog**: the Engine shows the lines whose `temi` or NPCs appear in the actions of the turn, plus the due
  clock sign; lines with `riempitivo: true` (the dog, the bag…) only at a stall, that is a closed window with no actions
  (timeout of the fast-paced phase, or «Risolvi ora» (Resolve now) with empty hands).
- **Anti-repetition**: a line and its variants do not return within 3 turns.
- **The Engine helps the selector** (nozze-neve playtest: 115 lines out of 139 never came out, clues asked for and not
  arriving, correct lines rejected because of a forgotten "> pg"):
  - *preselection*: for each public action, the catalog lines whose `temi` appear in that action, that answer that PC and
    speak with the right voice (the narrator, or an NPC the action names); no signs, transitions, endings or fillers; at
    most two per action. They go to the head of the catalog and into the section «Battute indicate dal Motore» (Lines
    suggested by the Engine), with the `[usa] id > pg` already written;
  - *inferred "> pg"*: without `> pg` (or with a wrong `> pg`) the Engine infers it if only one action of the turn can be
    the right one (the gates first, then the themes, then the NPC named), and records it (`pg_dedotti`); if it remains
    ambiguous, the `[usa]` is rejected as before.
- **Clock**: even in mode B the Engine writes «mostralo in questa risposta» (show it in this reply) when the sign is due.
- **Pace per clock** (nozze-neve playtest: the sunset ran at triple speed and starved the quarrel and the uncle):
  - the due sign belongs to ONE clock: the catalog admits only the signs of the due clocks, and if the selector does not
    use them the Engine states them itself, one per clock;
  - `segno_almeno_ogni` counts the turns in which the clock is active (earlier visits add up; entering a scene does not
    make it due); `segno_al_massimo_ogni` (default 2) forbids consecutive signs, except those tied to a PC's action (the
    sign's themes) and the Game Master;
  - at most one sign per clock and two clocks per reply;
  - `orologi_in_scena` in the scene sheet: on entering, the clock rises to at least `pieni_almeno`, and there it may have
    its own `segno_almeno_ogni` (nozze-neve: at the Sasso the sunset is at least six and runs at one sign every two).
- **Listed by state, not by themes**: endings, crowd lines and the closing come out based on the state of the clock (at
  full clock), because they have no players' words in their `temi`.
- **NPC aliases** for relevance: nano (dwarf) → Baldrin; ostessa/oste (innkeeper) → Ottavia; forestiero (stranger)/
  prigioniero (prisoner)/«quello là dentro» (that one in there) → Sebastiano. The Engine reads them from the `alias`
  field of the NPC sheet (no list in the code).
- **Honest evaluation**: the v2 `temi` were tuned on the scripts of the first experiment; the B2 comparison will be done on
  new scripts written blind (`esperimenti/copioni/prova2/`).

## Pre-generated audio

- A script generates the audio of each line of each line (and variant) with the voice service, and saves it to
  `cache/audio/<hash di voce+testo>.pcm` (not in git; it is regenerated).
- During play the pre-generated line enters the same queue as the improvised sentences, in the same order, but it is
  ready right away.

## Experiment: A (improvisation only, today) versus B (repertoire)

- **Fixed scripts** of player actions, written by an agent that sees only what the players see (`situazione_comune`,
  opening, PC sheets) and not the repertoire: one «indagine» (investigation), one «pressione» (pressure), each of about
  8 turns with 3 PCs, with 2–3 actions outside the foreseen, to test the improvisation.
- Same scene, same Haiku, same voice, same scripts for A and B.
- **Measures**: latency (first audio from the close of the window: median and worst), cost, share of pre-written and
  improvised lines.
- **Blind judgment**: an Opus agent receives the transcripts labelled X/Y at random and evaluates them with the manual's
  rubric R1–R12, also counting secret leaks, decisions taken in place of the PCs, invented facts, PCs in the third person
  outside the announcement of their action (N15), lines in the wrong voice.
- Audio samples of the two versions to listen to.
