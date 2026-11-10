# Craft: how to design a campaign that holds up live

These pages collect what the manual does not say and what the tests have taught: the test scene (campagne/prova-f0), an
independent review, two A/B experiments with a blind judge (esperimenti/giudizio-ab-1 and -2), and the blind test of the
skill with the campaign campagne/ponte-lanterne (four scenes, with its NOTE_SULLA_SKILL.md). Titles and sample lines of
those campaigns are in «lingue/<lingua>/preparatore/riferimenti.md», mestiere.md.

## 1. Situation, not plot (A3, C3)
- Start from **who wants what**. The villain has a plan that goes on even if the PCs stand still. Write the chronology
  "if the PCs do not intervene": it is what makes the clock advance.
- **A hidden truth, simple enough to say in one sentence**, and hard to prove in front of others. The proofs are objects,
  behaviours, stories: never the word of a single NPC.
- **An NPC knows the truth and is not believed**: good tension. But they must have a reason not to tell all of it (fear,
  shame, another guilt), otherwise the scene resolves at the first turn.
- **The danger can be heard from outside**: voices, footsteps, bells. A danger that is seen only in dialogue does not press.
- **The world's accounts add up.** In the blind test the four most serious defects were accounts: two trips that fit between
  two strokes while the story said "only one"; a boat too small for the groups; a line in a book dated before the fact it
  proved; a chain that worked in reverse. Write the chronology with the hours and the logistics with minutes and seats
  (schema.md), and have the validator redo the accounts.
- **The choice stays hard when the truth is out.** With all the proofs in hand, the answer must not become obvious: if a
  promise or an NPC cancels the price of a road, the choice is fake.

## 2. Well-drawn NPCs (§3, §6)
- **Three different registers** among the NPCs of a scene: you and the trade names; you and a cold formal form; the formal
  form to everyone. Plus three lexicons (forge, kitchen, medicine) and three sentence lengths. Test: read the sample lines
  without names and guess who speaks.
- **The singular formal pronoun is not used** where the language has one: it sounds like a plural when spoken. (Pronoun
  and register forms are specific to each language: «lingue/<lingua>/preparatore/riferimenti.md», mestiere.md §2.)
- **Few registered voices.** Two identical or similar voices (`simile_a` in voci.yaml) never stand in the same scene: decide
  it in the brief, because it decides who can meet whom (§9, "Voices between scenes").
- **Every NPC wants something in this scene**, which sets it against another NPC or a front. The desire shows in the
  lines: it asks, bargains, sets conditions (D7). It does not hand out information.
- **`sotto_pressione` changes behaviour, not intensity**: "becomes calm and very slow", not "gets angrier".
- **Do not give an NPC the power to close the climax** (D8). At most it holds the crowd on the threshold "for the time of an
  answer": the PCs carry the proof.
- **`mai_dice`** contains the keyword of its secret. When a rule holds only up to a certain moment, write the moment: "X's
  name, until they have confessed".

## 3. Lies, signals, cede_se (D6)
- The `versione` is short, concrete, repeatable, and always the same.
- The `segnale` is **a visible physical gesture** ("straightens the red scarf and looks at the baskets"), different from the
  habitual gesture. It must not contradict the appearance: someone with floury arms does not "wipe their clean hands".
- **`cede_se` is observable in a transcript.** "A PC puts one black grain from her sacks in her hand" can be seen; "when she
  trusts" cannot.
  - Several conditions are joined with the Engine's fixed word for "or" (the campaign language's word; see
    «lingue/<lingua>/preparatore/riferimenti.md», mestiere.md §3).
  - Privacy is defined in the scene ("who hears what"). Then it goes into the confession as `richiede.privata: true`.
- **One confession for each condition**, each with its structural gate (see repertorio.md §4). The A/B judgement no. 2 found
  confessions that came out in public: `quando` alone does not stop them.
- A lie that gives way when someone asks "the names of the three witnesses" must really have no names. If the canon gives it
  one, the condition never triggers.

## 4. Clues (C4, F3, A9)
- For every key conclusion:
  - **at least seven clues** is a good number for the main one;
  - **at least one proactive**: it arrives by itself with the soft move, for example the dog that trembles;
  - **at least one for a specific PC**: a prayer, a spell, private knowledge.
- A clue is **described, not concluded**: "it smells of burning and stains the fingers, like the dust of a dead brazier". The
  word for the conclusion is said by the players.
- Write `come_si_trova` with the distinct ways (opening a sack; breaking a loaf) and put them in `modi`.
- **Every physical clue has its public constraint** (`vincolo_pubblico`): what anyone perceives, in one sentence, without the
  why. In the blind judgement of the snow wedding, the Duchess's bell "rang loudly": the clue was precisely that it is mute,
  but nobody had told the narrator, and the scene's senses made every bell ring. The constraint ("the Duchess's big bell does
  not ring") goes to the narrator and the selector; the why (the ring is inside) stays in `come_si_trova`. If the perceived
  thing is also secret, the constraint says that only the line describes it ("the stone around the lion is described by the
  line"). The scene must not say the opposite: senses, description and elements respect it ("all except the big one").
  For the other facts that improvisation tends to contradict (who has the letter, how many brothers the grandmother has)
  there are the scene's `vincoli_pubblici`, with the same rules.
- Two clues on the same object (the mark on the sack and the grains inside) make the solution too quick. It is fine if the
  climax holds anyway; otherwise, separate them.

## 5. Clock and pace (C2, T4, R10, R11)
- Six ticks for a scene of 20–30 minutes, with `segno_almeno_ogni: 2`.
- Every tick is an audible or visible phrase and **adds pressure**: the singing stops, a stone, a toll, the lanterns, the
  handle, the three strokes.
- A tick can open an opportunity: the dwarf goes to the window and the grate is unwatched for a moment (M9).
- The climax converges: the danger, the truth and the choice arrive at the same moment.

## 6. The choice that costs (R10, A4)
- The truth told to everyone must **cost something to someone the PCs care about**. Silence must cost something else. Example:
  the truth saves the stranger, but moves the village's anger onto the innkeeper.
- Foresee the "third way", which the players will always look for, and make it cost a price.
- **The clock's `al_completo`** says what the danger wants and how it reacts to each answer.

## 7. Writing for the ear (§5)
- Read texts: sentences of 8–14 words on average, 16 at most, one idea per sentence.
- Every place involves a sense beyond sight.
- Strong words go at the end of the sentence. No figures, acronyms, brackets or ellipses.
- Watch what the validator cannot hear:
  - an ambiguous pronoun ("behind, someone coughs");
  - a verb that reads in two ways ("comes out of the oven" sounds like "leaves the oven");
  - two sentences in a row with the same opening.
- Very short sentences one after another flatten the rhythm: alternate, and join gestures into one sentence.
- Live, every public action arrives announced ("Brann lifts the lid.", manual N15): the announcement is improvised by the
  narrator, with the PC's name and only what the player wrote. The lines written beforehand therefore do not name the PCs and
  start from the outcome; the word budget of the turn includes the announcements, and that too is why lines stay short.

## 8. Lessons from the tests, in brief
| Error found | Rule |
|---|---|
| The narrator concludes in place of the PCs ("it is not poison, it is charcoal") | clues describe; the prose rules forbid the solution-word |
| NPC lines reported by the narrator | every word of an NPC with a sheet in its own line |
| The selector fills the turns with available lines (A/B 1) | only what matters is selectable; examples and fillers; distinctive themes |
| The dog and the bag repeated three times | fillers only at a stall; anti-repetition |
| Mute NPCs in front of a question | voice examples for every NPC, so improvisation has a model |
| Clock stuck for five turns | ticks as lines, `segno_almeno_ogni`, Engine that imposes them |
| Confession in public of a secret "in private" (A/B 2) | `richiede.privata`, `da_pg`, clues: structural gates |
| Id `seb_cicatrice_…` and a `quando` with "trapdoor" | the selector reads id and quando: no secret there |
| The scar in the portrait: on the projector from the first turn | hidden traits only in `aspetto.situazioni` |
| The scene does not hold without a specific PC | common situation without names, backup roles (if the acolyte is missing, the steward blesses) |
| An NPC "knows the solution" and shouts it at the first turn | it bargains: asks for water, a promise, the door opened |
| Canon contradicted between two texts | one fact, one id, quoted everywhere |
| Two trips fit between two strokes; boat too small for the groups; dated line before the fact (blind test) | chronology and logistics, redone by the validator (`MONDO`) |
| The rule "the narrator never says the lion has been lowered" was the secret, in the selector's context | generic prose rules; the precise ban in `come_si_trova` |
| Map, cut and sketches with secrets, unchecked; `da_togliere_dal_contesto` only declared | the validator compiles the real context of mode B |
| A similar-voiced NPC brought into another's town, by desire, solution, line and cut | similar voices as data, searched in every text that moves an NPC |
| "The custodian shouts": the narrator seems to call the custodian by name | no name with a comma at the start of the sentence |
| "sa del leone" matched "Rosa del leone" | regex with `\b` |

## 9. More scenes (sessions of two or three hours)
The server plays one scene at a time; the GM moves to the next from the panel. Each scene has its own context, its NPCs
present and its active clocks; the state (clues, lines used, clocks) remains.

- **Session clock.** A danger that presses for the whole session has an eight-tick clock, active in every scene where it can be
  heard. A turn lasts a couple of minutes (six ticks every two turns fill half an hour), so `segno_almeno_ogni` ≈ session
  minutes ÷ (2 × segments): for two and a half hours and eight ticks, about nine; fewer if scene changes also bring a tick.
  With 2 the clock would fill in the first half hour. A short scene inside the session may have its own clock, of six ticks
  with `segno_almeno_ogni: 2`.
- **Ticks heard everywhere.** A tick of a clock active in several scenes comes out in any of them, so it is heard from all:
  the bell, the river's voice, the shouts from the bridge. "The low ramp goes under water" is not seen from the village. The
  tick line has no `scena` [V].
- **The same place at two moments.** The bridge at dusk and the bridge at midnight are two sheets. The second has as its node
  an event ("The third stroke"), with its own proactive clue. A clue is defined in one sheet only; its lines have no `scena`,
  so they remain findable later too.
- **Clocks that start from a choice.** A clock that must run only after a choice ("the bridge stays open after the stroke")
  declares `parte_dopo: [<id of the choice line>]`. The server does not apply it yet: until then, write the condition also in
  `avanza_quando` and close the first tick with `richiede.battute_usate`, and put the clock only among the `orologi_attivi` of
  the scene where the choice is made, so that the minimum rhythm does not ask for ticks before time.
- **Gates with "oppure".** A line that is valid for "if the PCs have any of the three proofs" has `richiede.oppure`
  (repertorio.md §4), or a hinge clue that all the proofs reveal. An ending with several gates is fragile: reread it for every
  path.
- **Voices between scenes.** The Engine does not list the lines of an NPC absent from the current scene. What remains are the
  texts that move it: desire, initiatives, evolution, bottleneck solutions, cut, outcomes. If two NPCs have similar voices,
  search for them: the validator warns about what it finds; deliberate cases are justified in the self-assessment.
- **Known places.** A place the PCs know from the start (the village church) has `noto_ai_pg: true`: it need not be discovered
  with three clues.

## 10. Music, environments and themes (docs/audio.md)
The audio pipeline derives everything from the public fields: usually nothing needs writing. Look at its deduction with
`genera_audio.py --dry-run` and correct with the fields of schema.md ("Audio") only what is wrong.

- **The mood comes from the scene's question, not from the furniture.** `musica.tag` (and `audio.umore_iniziale`) says what the
  table feels: an inn where a culprit is sought is `esplorazione_tesa`, not `taverna_calda`. One mood change per scene at most,
  at the turning point of the `transizione`.
- **Environments are what is heard from outside**, the same sounds as the `sensi` and the clock ticks: the rain, the river in
  spate, the crowd at the door. Two or three layers per place, the one that carries the strongest danger. Nothing that
  contradicts the scene: no water running where it is frozen, no crickets in winter, no crowd in a room locked from inside.
- **Effects are blows the narrator names**: the toll, the door, the chain. If an object matters for the climax, name it in the
  senses or the elements, so the pipeline finds it.
- **An NPC's theme comes from its public persona**: reading of appearance, surface and under-pressure personality, voice, timbre.
  Never from the lie, the secret, the role in the plot: an "ominous" theme for the NPC who lies tells the table whom to look for
  before they discover it. The affable liar sounds affable; the Phrygian mode does not go to someone who lies.
- **The campaign's themes resemble each other**: they are variations of one motif (`stile.audio.motivo`, or the generated one).
  Write the motif only if you have a better one: from four to twelve notes, by close degrees, closing long on the tonic or the
  fifth.
