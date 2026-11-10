# Preparatore references: examples in English

The English counterparts of the examples that stood in the files of `.claude/skills/preparatore/riferimenti/` (the Italian
originals are in `lingue/it/preparatore/riferimenti.md`, with the same section numbers). Each section (for example
«arco.md §1») matches the pointer «lingue/<lingua>/preparatore/riferimenti.md» in the reference file. A campaign in English
(`lingua: en`) uses these examples; the field names, ids and paths are the same in every language.

## arco.md

### §1 Example of campagna.yaml → preparazione.arco
```yaml
preparazione:
  arco:
    premessa: "One sentence: what happens in this story."
    domanda: "Will Lowtown still belong to the village at the end of winter?"   # yes-or-no [V]
    fronte: fronte_debiti            # the campaign front (preparazione.fronti, livello: campagna) [V]
    orologio: o_mercante             # the arc clock, among the front's orologi_extra [V]
    tappe:                           # 3–6, in order: what the front gets if nobody stops it [V]
      - {id: tp_lettere, segno: 1, cosa: "The merchant buys the village's debts.", segno_visibile: "Letters with a black seal on the doors.", entro_sessione: 1}
      - {id: tp_sfratti, segno: 2, cosa: "…", segno_visibile: "…", entro_sessione: 2}
      - {id: tp_darsena, segno: 4, cosa: "Lowtown becomes a wharf.", segno_visibile: "…", entro_sessione: 3}
    ritmo:                           # how it advances between sessions (the "world moves" step, step 3) [V]
      per_sessione: 1                # ticks at the end of a session, if the PCs don't get in the way
      accelera: ["a PC signs a paper for the merchant"]     # observable conditions in the log or the state
      rallenta: ["the PCs show the ledger to the council"]
    atti:                            # 2–3, consecutive sessions from the first to the last [V]
      - {id: atto_1, sessioni: [1], domanda: "Will the PCs find out who buys the debts?"}
      - {id: atto_2, sessioni: [2, 3], domanda: "Will Lowtown hold out against the merchant?"}
    finali:                          # 2–4: every state of the arc clock has at least one ending [V]
      - {id: fn_salvo, orologio: {min: 0, max: 2}, quando: "the merchant never reaches the wharf", esito: "…"}
      - {id: fn_diviso, orologio: {min: 3, max: 3}, quando: "…", esito: "…"}
      - {id: fn_perso, orologio: {min: 4, max: 4}, quando: "the wharf is built", esito: "…"}
    png_ricorrenti: [png_irma, png_bruno, png_mercante, png_console]   # 4–6, each with its sheet in png/ [V]
    fili:                            # promises, debts, mysteries: each one comes back somewhere [V]
      - {id: filo_tetto, cosa: "Irma's roof", torna_in: [2]}
    sessioni:                        # one line for each session after the first [V]
      - {numero: 2, abbozzo: "The council votes on evictions, and the merchant buys the votes.", tappe: [tp_sfratti], png: [png_console], fili: [filo_tetto]}
      - {numero: 3, abbozzo: "The night of the wharf.", tappe: [tp_darsena], png: [png_mercante]}
```

## immagini.md

### §1 The portrait and the situations
- "in ponte-lanterne it did not find Vischi's `studio_cassa`" (the Engine looks by similarity, and did not find it)
- "The invariants may be in the campaign language." (rule 1: the invariants follow the campaign language)
- `{id: senza_cappuccio, dopo: [i_cicatrice], prompt: "hood lowered, a thin white scar splits his left eyebrow"}`
  (the prompt is already in English, as rule 1 requires)

## motore.md

### §0 The test case
- "In the test of `campagne/nozze-neve`, three of the five serious problems of the review came from here."

## mestiere.md

### §0 The tests
- "the test scene «The bread of the lamps» (campagne/prova-f0)"
- "the blind test of the skill with «The lantern bridge» (campagne/ponte-lanterne, four scenes, with its NOTE_SULLA_SKILL.md)"

### §1 Situation
- "two trips that fit between two strokes while the story said «only one», a boat too small for the groups, a line in a book dated before the fact it proved, a chain that worked in reverse"

### §2 NPCs
- "you and the trade names; you and a cold formal form; the formal form to everyone. Plus three lexicons (forge, kitchen, medicine)"
- "The singular formal pronoun is not used where the language has one. Spoken, it sounds like a plural."
  (the rule is about each language's own forms: in English there is only "you", so the rule is about registers that the text
  makes explicit in other ways)

### §3 Lies, signals, cede_se
- `segnale`: "straightens the red scarf and looks at the baskets"; "someone with floury arms does not wipe their clean hands"
- `cede_se`: "A PC puts one black grain from her sacks in her hand"; "when she trusts"; the word that joins conditions: "Or"
- "the names of the three witnesses" (the question that must not make a lie give way if the canon has names)

### §4 Clues
- "it smells of burning and stains the fingers, like the dust of a dead brazier"
- "charcoal" (the word the players say)
- "opening a sack; breaking a loaf" (ways in `come_si_trova`)
- "the dog that trembles" (proactive clue)
- "the Duchess's bell «rang loudly»"; "the Duchess's big bell does not ring"; "the stone around the lion is described by the line"; "all except the big one"
- "who has the letter, how many brothers the grandmother has" (facts that improvisation tends to contradict)
- "the mark on the sack and the grains inside"

### §5 Clock
- "the singing stops, a stone, a toll, the lanterns, the handle, the three strokes"
- "the dwarf goes to the window and the grate is unwatched for a moment"

### §6 The choice
- "the truth saves the stranger, but moves the village's anger onto the innkeeper"

### §7 Writing for the ear
- "behind, someone coughs" (ambiguous pronoun)
- "comes out of the oven" sounds like "leaves the oven" (verb read in two ways)
- "Brann lifts the lid." (announcement of an action, manual N15)

### §8 Lessons from the tests (table)
- "The narrator concludes in place of the PCs («it is not poison, it is charcoal»)"
- "The custodian shouts"; "no name with a comma at the start of the sentence"
- "sa del leone" matched "Rosa del leone" (the word "lion" inside a name)
- `seb_cicatrice_…` and a `quando` with "trapdoor"
- a similar-voiced NPC, "Bice (tabitha)", moved into the town of "Rosa (nadine)"
- "the dog and the bag" repeated three times
- "the lion" and the rule "the narrator never says the lion has been lowered"
- "the steward blesses" (backup role: if the acolyte is missing)

### §9 More scenes
- "The third stroke" (an event as a node)
- "The bridge stays open after the stroke" (a choice that starts a clock)
- "The low ramp goes under water" (a tick heard everywhere)
- "the bell, the river's voice, the shouts from the bridge"
- "the bridge at dusk" and "the bridge at midnight"
- "the village church" (a place the PCs know)

### §10 Music, environments and themes
- "an inn where a culprit is sought is `esplorazione_tesa`, not `taverna_calda`"
- "no water running where it is frozen, no crickets in winter, no crowd in a room locked from inside"
- "the affable liar sounds affable; the Phrygian mode does not go to someone who lies"

## repertorio.md

### §3 id, quando, temi
- ids: `nar_volto_candela` (not `seb_cicatrice_candela`); `bal_chi_malato` (not `bal_carbonai`); `ott_segale_domanda`; `zel_macchia_privato`; `zel_presa_macchia` ("Zelia caught")
- quando: "a PC asks Ettore why he did not climb to the high place"; "a PC shows Ottavia a black grain, where Baldrin does not hear", not "Ottavia confesses"
- words that say who lies: lie, falsehood, confess, secret, hide, truth
- themes: spezzo, spezzare, pezzo, pagnotta → in English: break, breaks, broke, loaf (stem: "loaf" also takes "loaves"; a short word takes unrelated words too)
- generic words: door, who, night, bread, look, open, man, inside
- two-meaning words: "strike" (a blow and a bell) → choose "bell" or "toll"
- prose: "Black grains are inside the crumb", not "You break the loaf: inside…", which after the announcement "Ginestra breaks a loaf" would sound twice

### §4 Confessions (conditions of cede_se)
- "in private", "where X does not hear"
- "when Assenzio asks her…"
- "when a PC shows her the black grain" (`i_speroni_neri`)
- "after having told her version"
- "at the third stroke"
- the word "or" in gates: "if the PCs have any of the three proofs"

### §6 Other lines
- "Ottavia burns the sacks", "Baldrin wraps the crumb for a daughter" (initiatives)
- "The mule, no." (a line that presupposes an optional line)
- "I already told you. The village mill" (variant that shortens the version)
- "Hands off the baskets!" (address an unknown PC without gender agreement); "Halt!" (to avoid)
- "sister", "soldier" (trade vocatives)

### §7 Secret words
- "surgeon": the public hook ("their surgeon, a deserter") and the fact ("the stranger is a surgeon")
- "the lantern in the cellar"; regex `lantern[^.]{0,40}(cellar|cask)`
- "sa del leone" and "Rosa del leone"; "roof" and "roofing" (a word inside a longer word)
- "Wave Bridgers" (a guild) contains "wave"

## schema.md

### stile.yaml
- NPC `stile`: "Sentences of two to six words" → 9 at most; number words one… twenty

### campagna.yaml
- orologio `nome`: "The village wants a culprit" (the obstacle, not the action)
- `colli_di_bottiglia`: "Only if the one who knows it proposes it"
- `segno`: "o_mercante: the payment did not arrive at dawn"
- `concetto`: "two sentences"; `aggancio`: no secrets

### scene
- `descrizione`: "plan of the place + WHO HEARS WHAT"
- `domanda_drammatica: "…?"`; `apertura: "…?"`

### NPCs
- `alias`: a dwarf, the innkeeper, the stranger (and to avoid: old man, girl)
- `lettura`: "1-2 sentences, max 35 words, to be read aloud"
- `invarianti`: in English, or the campaign's language
- `registro`: "you | formal | …, and with whom it changes"
- `atteggiamento_pg`: "one session only: no growth"
- `segnale`: "straightens the red scarf and looks at the baskets"

### audio
- `tonalita`: "D dorian"; note names: C…B (or do…si)
- `modo`: ionio, dorico, frigio, lidio, misolidio, eolio (or maggiore, minore)
- `umore_base` and `umore_iniziale`: `esplorazione_tesa`, `taverna_calda` (vocabulary values, they do not change)

### state
- `testo`: "Irma has sworn to Tobia that she will pay for the roof without the merchant."
- `citazione`: "I swear I will pay for the roof"
- object: "silver lantern"
- `o_processione`, `o_mercante`, `pg_tobia`: examples of ids and reasons

## tra-le-sessioni.md
- No example in Italian: the file uses only terms and shapes from `schema.md`.
