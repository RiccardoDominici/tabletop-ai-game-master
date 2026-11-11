# Repertoire: the lines written in advance (version 2)

Read `docs/repertorio.md` first. Here is how to write them well, and the coverage the validator demands.

## 1. What it is for
Haiku in repertoire mode (mode B) **does not know the secrets**. It receives:
- the public context of the campaign and of the scene (the exact list is in rule 1 of the skill; it is printed by
  `npx tsx strumenti/contesto_modo_b.ts campagne/<id>`);
- the catalogue of the lines relevant to the turn's actions, in the form `id · who · type · when` (lies, truths and
  confessions appear there as "response");
- the voice examples of the NPCs.

It ties each line to the action it answers (`[usa] id > pg_x`) and improvises only the joints: the announcement of each
public action (the PC's name and what they wrote, manual N15) and the passages between one line and the next. The lines
serve four things:
- **quality**: you write them, calmly;
- **latency**: the audio is generated beforehand;
- **secrets**: the secret text comes out only when the conditions are true;
- **direction**: clock ticks, moments and endings arrive at the right time.

## 2. Three classes of lines
| Class | What | How it is marked |
|---|---|---|
| selectable | lies, confessions, clues, clock ticks, key moments, endings, answers to precise questions | (no flag) |
| voice example | greeting, kind question, accusation, threat, generic offer and help, refusal | `solo_esempio: true` |
| filler | moves that answer nothing, used only at a stall: the dog gets up, time passes, an NPC recalls the rite | `riempitivo: true` |

A voice example cannot lie, reveal, confess or advance the clock [V]. A filler is only of type moment, clue, transition or
request [V].

## 3. id, quando, temi: the three fields that decide everything
- **id**: `<prefix>_<neutral subject>`. Prefixes: `nar_` for the narrator, `fin_` for endings, `tr_` for transitions, three
  letters of the NPC for NPCs (`ott_`, `bal_`).
  - **No secrets in the id**: a neutral subject, not the secret's name. The id must not give away the secret or the
    culprit (examples: «lingue/<lingua>/preparatore/riferimenti.md», repertorio.md §3).
  - **The id reads like a sentence.** The selector sees the id together with its NPC and deduces what it says: an id that
    names the nature of the line (`_versione`, `_verita`, `_confessa`, "version", "truth", "confess") tells who lies; one that
    names the outcome ("the PC was caught") tells who was caught. Use the subject and the situation. The words that give it
    away are an error in strict mode (`REPERTORIO.id_rivelatore`); the others you find only by reading the catalogue
    (`--catalogo`, step 10).
  - For generic reactions the id ends with the category: `ott_saluto` (greeting), `ott_domanda_gentile` (kind question),
    `ott_accusa` (accusation), `ott_minaccia` (threat), `ott_offerta` (offer), `ott_aiuto` (help), `ott_rifiuto` (refusal).
- **quando**: at most 15 words. It describes **an observable fact** in the fiction or in the action. It too reads like a
  sentence: a line saying "a PC asks the NPC why they did not climb to the high place" says that they should have climbed.
  - No truths: "a PC shows the other a black grain, where the third NPC does not hear", not "the other confesses".
  - No words that say who lies: lie, falsehood, confess, secret, hide, truth, and their equivalents in the campaign language
    (the list is in «lingue/<lingua>/preparatore/riferimenti.md», repertorio.md §3) [V].
  - If it is needed to cite a secret (the PC has found the black grains), the line must require the clue that makes it public
    (`richiede.indizi_rivelati`).
- **temi**: the words with which a player would write the action, in their real forms: the inflected forms and the
  singular/plural, as they are typed.
  - The Engine compares them with the action as whole words; a theme of at least five letters also works as the beginning of a
    word (a stem takes its derived forms, but a short word takes unrelated ones too: see the examples in
    «lingue/<lingua>/preparatore/riferimenti.md», repertorio.md §3).
  - No generic words (door, who, night, bread, look, open, man, inside…) [R].
  - No words with two meanings that the prefilter cannot tell apart (for example one word that is both a sound and a verb
    form). Choose the form that has one meaning only ("bell" rather than "strike").
  - A line enters the catalogue also when the action names the NPC who speaks (name or `alias`).
  - Clock ticks have neutral themes (`[orologio]`), because the state carries them, not the words. An ending with neutral themes
    arrives also by state, but the Engine accepts it only tied to a public action of the turn (motore.md): at least one ending
    per scene has the themes of the decisive action.
  - Test the themes on the blind scripts of your campaign: `--copioni esperimenti/copioni/<id>` (step 12). The average catalogue
    by themes must stay under 4 lines per action.
- **max_usi**: at most 1 plus the number of variants, also for voice examples [V]: beyond that, the same text would repeat.

## 4. Confessions with a real gate
Each condition of `cede_se` is a line of type `confessione`. Its `richiede` translates the condition into something the Engine
can check:

| Condition in cede_se | richiede |
|---|---|
| "in private", "where X does not hear" | `privata: true` |
| "when Assenzio asks her…" | `da_pg: [pg_assenzio]` |
| "when a PC shows her the black grain" | `indizi_rivelati: [i_speroni_neri]` |
| "after having told her version" | `battute_usate: [<id of the lie>]` |
| "at the third stroke" | `orologio: {id, min, max}` |

A confession without any of these gates is a warning, and an error in strict mode.

Then:
- `effetti.fatti_noti` contains the truth (`mente_su.verita`): this is how the validator ties the confession to the lie;
- two alternative confessions of the same truth exclude each other with `battute_non_usate`.

**Gates with "oppure".** `richiede` wants all its conditions true. For "any one of these proofs" write
`richiede.oppure: [{indizi_rivelati: [i_a]}, {indizi_rivelati: [i_b]}]`: the base conditions, plus at least one alternative. The
Engine applies it (`repertorio/condizioni.ts`), and the validator checks it: a confession is closed only if every alternative has a
gate. For the gates on the action, the chosen alternative applies (`{privata: true}` or `{indizi_rivelati: [i_x]}`).
- **The hinge clue.** When many lines depend on "one of several roads" (the letter arrives in two ways, the grandmother gives way in
  three), make all the roads reveal the same clue, and close the lines that come later with that single clue (`indizi_rivelati`):
  no chains of `oppure` to reread.

## 5. Lies
- One line of type `menzogna` for each `mente_su`, with `effetti.menzogna_detta: <mente_su.id>`.
- **The signal in every version** (text and variants), in a `[narratore]` line, with the words of `segnale` [V].
- The NPC's text follows the `versione` of the sheet. A variant may shorten it ("I already told you. The village mill"), but not
  change its content.

## 6. The other lines
- **Clues**: one line for each way of finding them (`modi`) [V]. A clue of type `png` has as many ways as there are conditions
  of the `cede_se` that reveals it: clues and lies are designed together.
  - Describe, do not conclude.
  - `effetti.rivela_indizi`, plus `fatti_noti` only if the fact is said in full.
- **Clock ticks**: only gestures and sounds that are seen and heard; an NPC who speaks, speaks in its own lines (a `[png_…]` line
  inside a tick is a warning, and a narrator that summarises an NPC goes against D1). One line per segment, with
  `richiede.orologio: {id, min: k-1, max: k-1}` and `effetti.avanza_orologio` [V]. The text follows the tick of campagna.yaml. A
  detail may be added, up to four sentences.
- **Key moments**: the NPCs' initiatives and evolutions (one burns the sacks, another wraps the crumb for a daughter), the climax, the
  turning points.
- **Audio signals** (`audio: {effetto, umore}`, schema.md "Audio"): few, and only where the text calls for them.
  - `effetto` on lines whose **first sentence** names the sound: the tick "the bell strikes the third stroke" carries `effetto: campana`;
    a smashed door, `porta`. Never an effect that the line does not name: the table would hear a noise without a cause.
  - `umore` on the turns that the scene's `musica.transizione` already foresees: the tick that starts the chase, the ending in which
    someone is left behind, the vigil that ends. At most two mood changes per scene outside the endings; `auto` returns to the music of
    the place.
  - No signals on voice examples, fillers, or lines that can come out at any moment.
- **Endings**: one for each outcome of the `taglio` [V at least one], with `richiede.orologio` at a full clock if they arrive only at the
  climax. If the scene has `esiti`, each outcome cites its ending [V].
- **Closing of the evening** (`tipo: chiusura`): one for each scene, with `scena: <id>` [V; an error in strict mode]. The Engine
  says it when the Game Master presses «Chiudi la sessione» in that scene; the selector never sees it. It is `chi: narratore`, with
  two to four `[narratore]` rows in the campaign's language:
  - the moment where the table stops, then a closing image (a sound, a light, a gesture of the place);
  - a hook for next time on something the players already know that is still open (a question, a clock that runs). Never a new
    mystery, never a secret word;
  - nothing that a PC does: the players have not said it.
  The closing can come at ANY moment of the scene, so the hook says only what stays true there: what the players know on arriving,
  a question still open, the clock. A hook that names something the scene can change (the NPC who still holds the key) has a gate:
  `richiede.battute_non_usate` with the line that changes it, or `indizi_non_rivelati`. Keep one closing per scene without such
  gates. No `effetti` [V]. The Engine takes the closing tied to the scene with the most conditions met. `quando` says the moment («il master chiude la serata in cantina»),
  `temi` one or two words of the place. If no closing fits, the sceneggiatore writes one at the table, or the Engine reads a fixed
  line: both are fallbacks, not the plan.
- **Voice examples**: for every supporting or main NPC, at least three, with a greeting and a refusal [V]. They cover the categories kind
  question, accusation, threat, offer and help (warning if missing). Their text enters the selector's context, so **no secret words** [V].
- **Fillers**: at least one [V]; usually the scene's soft move and a few NPC initiatives.
- **No line presupposes another optional line.** A line like "The mule, no." does not work if the mule appears only in a filler that may not
  have come out. If the link is needed, write it: `richiede.battute_usate`.
- **Several scenes**: `scena: <id>` (or a list of ids) ties a line to those scenes. The Engine does not list the lines in which an NPC absent
  from the current scene speaks. Ticks of a clock active in several scenes, and the lines of clues findable at several moments, have no `scena`
  (mestiere.md §9).
- **Transitions**: at least two (warning), to enter and leave the nearby places.

## 7. Secret words (repertorio/parole_segrete.yaml)
```yaml
parole:
  - parola: "…"                                  # readable form, in the campaign language
    regex: "…"                                   # Python, on the lower-cased text
    fatti: [f_…]                                 # the hidden facts it reveals
    pubblica_dopo: [<id of a line or clue that makes it public>]
    nota: "…"
    ammessa_nel_catalogo: []                     # very rare, must be justified (schema.md, reading 17)
```
- **A regex looks for the link, not the word.** A word may appear also in a PC's public hook (their own profession, a public bond):
  what must be searched is the secret fact ("the stranger is a surgeon"), not the word alone.
- **Word boundaries.** A regex also fires in the middle of a longer word: a short fragment matched inside other words and names. Start with
  `\b` (warning `SEGRETI.regex_dentro_parola`).
- **Proper names carry secrets too.** A guild name, in a PC's hook, may contain a secret word. Search the regexes in the names of guilds,
  places and nicknames.
- **Every hidden fact** has at least one entry (warning `SEGRETI.fatto_scoperto`).
- **The catalogue, the public fields** (opening, summary, common situation, public sheets of the PCs, appearance reading, sample line,
  signs of the active clocks), **the context of mode B** (compiled by the server, scene by scene: `SEGRETI.contesto_b`) **and the voice
  examples** do not contain any secret regex yet [V]. The context is compiled with node; without node it remains a warning, and the work is
  not finished.
- **Every line that says a secret word** is either in `pubblica_dopo`, or comes after an id that belongs to it, or belongs to an NPC who has
  the fact in its `sa` [V]. If it makes it public, it is in `pubblica_dopo` [V].
- **`da_togliere_dal_contesto` is no longer needed.** It was a declared list that nobody applied: the server's compiler works by allowlist,
  and the validator checks what it actually sends. If it is there, it is ignored. What must not reach the selector must be written
  elsewhere: `come_si_trova`, elements marked HIDDEN, `mai_dice`, `preparazione`.

## 8. Coverage table (tick it before writing the text)
- [ ] for each clue: `modi` revealing lines
- [ ] for each `mente_su`: a lie, with the signal in every version
- [ ] for each condition of `cede_se`: a confession with its gate
- [ ] for each active clock: one tick per segment
- [ ] for each outcome of the taglio: an ending; plus the closing with the choice left open (C13)
- [ ] for each scene: a closing of the evening (`tipo: chiusura`, `scena: <id>`): a closing image and a hook for next time
- [ ] for each NPC: greeting, kind question, accusation, threat, offer, help, refusal (examples or selectable)
- [ ] for each extra named in a hook or in the common situation (the groom, the bride): at least one narrator line, because the players
  will look for them
- [ ] for each entry of `riferimenti/motore.md`: its answer (private lines, ticks, endings, objects)
- [ ] for each probable question of the scripts: a selectable answer, or a voice example that guides the improvisation
- [ ] no line cites what only another optional line introduced
- [ ] at least one filler and two transitions
- [ ] for each line: no PC names, no secrets in id and quando, distinctive themes

## 9. Prose of the lines [V]
- **Narrator**:
  - sentences of 16 words at most, with an average between 8 and 14 across the whole repertoire;
  - at most 4 sentences per version and 70 words in all;
  - no sentence in the third person about a PC: the second person, or nothing. The PC in the third person appears only in the
    announcement of its action (manual N15), which the narrator improvises before the line;
  - the line starts from the outcome and does not repeat the action: "Black grains are inside the crumb", not "You break the
    loaf: inside…", which after the announcement "Ginestra breaks a loaf" would sound twice.
- **NPCs**:
  - at most 2 sentences per line, 4 in confessions, moments and endings;
  - sentences within the ceiling of the `stile` (a range of two to six words → 9 at most).
- No PC names, figures, brackets, ellipses or the expressions of §5.
- Address an unknown PC without gender agreement, where the language has it: an imperative, not a gendered term. A vocative of trade
  ("sister", "soldier") is fine only if the `quando` says whom one speaks to.
