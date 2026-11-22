# Checks and dice

Item 4 of the requests of 9 November (docs/richieste-2026-11-09.md). Riccardo wrote: "if I try to hit with a
crossbow, an attack roll; if I try to convince someone, a Persuasion check." The system must show the ability and
skill, the die, the modifier, the DC and the outcome. The outcome must depend on the roll, not on the narrator.

In short:
- **The Engine rolls, the model does not.** A fast arbiter (Haiku, with structured output) decides only *what* is
  rolled. DC, AC, modifiers, dice and outcomes are computed by the code, from the sheets and the SRD 5.2.
- **The narrator receives the outcomes as facts.** «Ida Ferraro: Persuasione (Carisma) verso Bertoldo: 18 contro CD 15 →
  RIUSCITA.» (Ida Ferraro: Persuasion (Charisma) toward Bertoldo: 18 vs DC 15 → SUCCESS.) It narrates the consequence
  and does not change it.
- **Projector and phones show one card per roll.** A private roll appears only on the phone of its player.

## 1. Research

### Rules (SRD 5.2, CC-BY-4.0)
- **d20 checks** [OPENED] (SRD_CC_v5.2.pdf, "D20 Tests"). The formula is d20 + ability modifier + proficiency bonus,
  if it applies.
  - Modifier: (score − 10) / 2, rounded down.
  - Proficiency bonus: +2 at levels 1–4, +3 at levels 5–8, and so on up to +9.
- **When to roll** [OPENED]. "When the outcome is uncertain and narratively interesting, the dice determine the
  result." The SRD asks for a check when there is "a chance of meaningful failure".
  - A trivial action does not roll.
  - An impossible action does not roll.
- **DC scale** [OPENED]: 5 very easy, 10 easy, 15 medium, 20 hard, 25 very hard, 30 nearly impossible. In the Italian
  SRD the table is «Classi Difficoltà tipiche» (Typical Difficulty Classes) [OPENED, IT_SRD_CC_v5.2.1.pdf].
- **Advantage and disadvantage** [OPENED]. Two d20s are rolled and the higher or lower is kept. Multiple sources do not
  stack, and advantage and disadvantage together cancel out.
- **Natural 20 and 1** [OPENED]. They count only for attack rolls: a 20 is always a critical hit (the damage dice are
  rolled twice), a 1 always misses. They do not count on checks or saving throws.
- **Attacks** [OPENED]. The roll is compared with the AC. A ranged weapon has disadvantage if an enemy that can see the
  attacker is within 1.5 metres of them.
  - At 0 hit points a monster dies or is knocked out, at the Game Master's choice.
  - At 0 hit points a PC falls unconscious and makes death saving throws.
- **Influence** [OPENED].
  - The NPC is friendly, indifferent or hostile. Friendly or hostile: no roll. Undecided: a roll with DC 15 or with the
    NPC's Intelligence, if higher.
  - Friendly attitude: advantage. Hostile: disadvantage.
  - Skills: Persuasion, Deception, Intimidation, Performance, and Animal Handling with beasts.
- **Helping** [OPENED]. Whoever helps gives advantage to the companion's check.
- **Passive checks** [OPENED]: 10 + the modifier. SRD 5.2 does not give the ±5 for advantage and disadvantage.
- **Not in SRD 5.2** (checked against the full text). Group checks and a general rule for opposed checks are missing;
  there is only the tie-break for initiative.
- **Italian names** [OPENED, SRD 5.2.1 IT]. Skills and abilities as in campagna/regole-srd.ts. Armour: Armatura
  imbottita (padded armour), di cuoio (leather), di cuoio borchiato (studded leather), di pelle (hide); Giaco di maglia
  (chain shirt); Corazza a scaglie (scale mail), di piastre (plate), ad anelli (ring mail), a strisce (splint); Mezza
  armatura (half plate); Cotta di maglia (chain mail); Armatura a piastre (plate armour).
- **Sites not opened** [SNIPPET]: telodoioildungeon.it and dragonslair.it, only for the date of the Italian translation.

### How other AI masters do it
- **FIREBALL** (ACL 2023) [OPENED, arxiv.org/abs/2305.01528]. With the real game state (Avrae) generations improve: the
  state has to be kept out of the model.
- **Labyrinth** (Wordplay 2024) [OPENED, abstract, arxiv.org/abs/2409.06949]. Functions for dice and for state improve
  coherence.
  - [SNIPPET, cis.upenn.edu] Dice and state can interfere, up to a "dice roll deadlock". That is why here the turn loop
    is fixed and the model holds no tools.
- **Avrae commands** (2025) [OPENED, arxiv.org/abs/2510.18112]. A single changed phrase in the prompt shifts the output a
  lot: measured test cases are needed (§6).
- **CriticaLLM** [OPENED, arxiv.org/abs/2610.21525] and **static versus agentic master** [OPENED,
  arxiv.org/abs/2502.19519]: the central problem is following the rules.
- **Over-accommodation** [OPENED, news.ycombinator.com/item?id=42698610]. An AI master that is «troppo arrendevole» (too
  accommodating): without a real roll, "everything you do succeeds".
  - [OPENED, dev.to, article without sources] Invented rolls, such as a d20 that comes up 47.
  - [SNIPPET, techradar.com] All rolls successful.
- **Friends & Fables** [OPENED, fables.gg patch notes and blog]. The game shows the check with its bonuses and rolls with
  a touch. It does not say who decides the outcome.
  - [SNIPPET, reviews of competitors] Wrong dice and lost combat state.
- **AI Realm** [SNIPPET, guide]. The sheet rolls 1d20 + modifier and puts the result in the chat, so the model can narrate
  it. Hidden Door [SNIPPET, FAQ] has a hidden-stats layer.
- **Common lessons** [SNIPPET, thavernia.com and Fable Reborn, CHI EA 2023]:
  - fix the DC before the roll, outside the model;
  - narrate after the roll;
  - do not lengthen the wait: in Fable Reborn a slow scorer broke the pacing.

### What the research changed from the starting plan
1. **No group checks.** They are not in SRD 5.2. Those who cooperate use «aiuto» (help), which gives advantage (SRD
   "Helping").
2. **Opposed checks are a declared house rule.**
   - Against an NPC the roll is against its passive score: 10 + modifier, for example passive Perception against
     Stealth. Only the player rolls and the card stays simple.
   - Between two PCs both roll and the higher wins. On a tie, nobody prevails.
   - Grappling and shoving: simplified to Athletics against passive. SRD 5.2 uses a saving throw of the target with
     DC 8 + Strength + proficiency.
3. **Social checks follow «Influenzare» (Influence).**
   - DC from the NPC's sheet: 15 or its Intelligence, or `influenza.cd`.
   - Advantage or disadvantage from `atteggiamento_pg`.
   - "Friendly" and "hostile" become the arbiter's types `nessuna` (none) and `impossibile` (impossible).
   - The Engine also maps to Influence a threat that Haiku had labelled «contrapposta» (opposed), because the DC must come
     from the data.
4. **No automatic 20 on checks** (SRD 5.2).
5. **The check arbiter is not merged with the action arbiter** (`relazioni`).
   - `relazioni` is called only when there are other actions queued and the rules are not enough: a single player's
     action never calls it.
   - Its prompt is tuned to its own cases (strumenti/valuta-arbitro.ts).
   - A separate call, launched when the action is submitted, costs 0 ms at closing. Measurements in §6.
6. **NPCs that attack are a «reazione» (reaction) decided together with the action**, not a line from the narrator. A
   `[attacco]` line would arrive after the narrator has already spoken, and narrating the outcome would require a second
   call. The reaction comes out in the same decision as the action that triggers it: for example, one hits a hostile NPC
   who stays standing. The Engine rolls it right after that action. In a rule set with turn order (individual or side
   initiative) there is no reaction out of turn: during a fight the NPC acts in its own step, and an attack that opens
   a fight gives the attacked side surprise and initiative instead (`turni` of the resolvers, `senzaReazioneFuoriTurno`).
   Third e2e pass, HEAD rerun T6: Grosso, surprised and losing round one, still «reagisce» and swung at Livia before the
   order was rolled. A provocation answered with a blow outside a fight stays a reaction, and it opens the fight.

## 2. Sheets and data (the schema for the Preparer skill)

Everything is additive: a campaign without sheets plays as before, without dice (log `PROVE E DADI … nessun PG ha una
scheda` (CHECKS AND DICE … no PC has a sheet)). Types and loader: campagna/schede.ts, campagna/prove-scena.ts,
campagna/regole-srd.ts.

```yaml
# pg.yaml → personaggi[]: the level stays the PC's (personaggi[].livello)
    scheda:
      caratteristiche: {forza: 16, destrezza: 14, costituzione: 15, intelligenza: 10, saggezza: 12, carisma: 8}  # 1–30, all six
      competenze: [atletica, percezione, intimidire, sopravvivenza]   # ids of the 18 skills (Italian names accepted)
      maestrie: [furtivita]               # optional: double proficiency
      tiri_salvezza: [forza, costituzione]
      armatura: {tipo: giaco di maglia, scudo: false}   # the code computes the AC; or ca: 14 with no armour
      pf: 12                              # maximum hit points
      attacchi:
        - {nome: "Balestra leggera", caratteristica: destrezza, danno: "1d8", tipo_danno: perforante, distanza: true}
        - {nome: "Spada lunga", caratteristica: forza, danno: "1d8", tipo_danno: tagliente}   # proficient: true by default; bonus: +1 for a magic weapon

# png/<id>.yaml
scheda:
  gs: 1/2                                 # challenge rating (sets proficiency); or livello
  caratteristiche: {…}                    # as above; Intelligence sets the Influence DC
  competenze: [intuizione, percezione]    # count toward passives (Perception vs Stealth…)
  armatura: {tipo: armatura di pelle}     # or ca: 13
  pf: 11
  attacchi: [{nome: "Mazza ferrata", caratteristica: forza, danno: "1d6", tipo_danno: contundente}]
  influenza: {cd: 12}                     # optional: fixed DC to persuade it
# atteggiamento_pg.<pg>.stato (ostile | indifferente | amichevole), already in the schema: gives disadvantage or advantage.

# campagna.yaml: minions, nameless foes with a stat line by creature type (campagna/gregari.ts, C5)
gregari:
  - tipo: goblin
    nome: "goblin"                        # the cards and the narrator call one this («goblin 2» when several)
    parole: [goblin, sentinella]          # words that name one in a PC's action
    scheda: {gs: 1/4, …}                  # an NPC sheet of the campaign's rule set
# scena.yaml / scene/*.yaml: the minions of this scene
gregari: [{tipo: goblin, quanti: 2}]

# scena.yaml / scene/*.yaml: the DCs set by the Preparer (obstacles, NON-essential clues, bottleneck solutions)
prove:
  - id: p_cassetta
    quando: "un PG apre di nascosto il lucchetto della cassetta del pedaggio"   # public, ≤ 15 words, the arbiter sees it
    abilita: rapidita_di_mano             # or caratteristica: forza, or salvezza: destrezza
    cd: 15
    indizio: i_lettera                    # optional; an essential clue here is a warning (F3): it arrives anyway, at a price
    se_fallisce: "il lucchetto scatta rumoroso"   # optional: the price, given to the narrator

# campagna.yaml: a campaign that wants to play without dice (some briefs ask for this)
regole: {dadi: false}

# repertorio: a line comes out only after a successful check of the action it answers
richiede: {prova: persuasione}            # skill, ability, scene id p_…, or prova/salvezza/attacco
```

The code computes all modifiers: ability, skill (with proficiency and expertise), saving throw, passive, attack roll,
damage and AC from the armour. Neither the file nor the model writes a modifier.
- **AC:** a `ca` different from the one from the armour is a warning, and the computed value counts.
- **Incomplete sheet:** does not stop the session. A missing score counts as 10, and each error is a warning in the log.
- **Narrator context:** `scheda` and `prove` stay out, because they would be useless numbers in the cache and DCs not to
  be read out.

**For the skill's validator** (strumenti/valida_campagna.py, to be updated). To check:
- the six abilities, with scores from 1 to 30;
- skills and saving throws among the allowed ids;
- `armatura.tipo` among the SRD armours, or an integer `ca`;
- `pf` > 0;
- attacks with `nome`, a valid `caratteristica` and a `danno` NdF with F in {4, 6, 8, 10, 12};
- `gs` or `livello` on NPCs;
- in the elements of `prove`: `id` p_…, `quando` (at most 15 words, without secrets), `cd` from 5 to 30, a skill, an
  ability or a save, and an `indizio` that exists and is not essential;
- `richiede.prova` recognisable;
- `regole.dadi` boolean.

**Validator choices** (strumenti/valida/regole_schede.py, already in use; where the text above leaves room):
- **(a) Scores.** PCs from 1 to 20, NPCs from 1 to 30. The PC level goes from 1 to 20: outside that, it is an error.
- **(b) Essential clue.** An essential clue cited by a check is an **error**, not a warning: the check cannot be the only
  route to a clue that the campaign declares essential. The Engine gives it anyway, at a price; the validator forbids
  writing the link.
- **(c) CR bands.** NPC AC, HP and attack bonus are bands **approximated from the tables of the 2014 Dungeon Master's
  Guide**, not from SRD 5.2: AC from 9 to typical+3, HP up to the CR cap, attack bonus no more than proficiency +5, and
  no more than two damage dice below CR 2. They are in `strumenti/valida/srd.py` and should be revised with a better
  source.
- **(d) Forms of `richiede.prova`.** Accepted: a skill or ability with the exact id (`persuasione`, `rapidita_di_mano`),
  an id `p_…` of a scene check, the name of an attack as an id (`balestra_leggera`), and the types `prova`, `salvezza`,
  `attacco`, `contrapposta`. The Engine compares exact strings: an Italian name or a capital letter is not enough.

Recommended consistency checks (warnings):
- every playable PC has a sheet;
- every NPC that can fight or must be persuaded has a sheet;
- `atteggiamento_pg` is consistent with what is needed.

**Minions** (C5 of docs/e2e-finale.md: an attack on a creature without a sheet resolved «sì, ma», the narrator invented
goblins and killed one with no card). At startup every scene's minion becomes a sheeted combatant of the checks'
Engine (avvio.ts, `gregariDellaCampagna`): id `png_<tipo>_<scene without scena_>_<n>`, name, the type's sheet, the
morale of the sheet. They are the scene's enemies: an attack whose words name one («tiro alla sentinella») targets the
first one standing (the clear-attack pass and the rules arbiter; an arbiter's attack on an unknown target is
re-targeted the same way), the arbiters see them among the NPCs in scene, they join a fight there, their hit points
are in the checks' snapshot (ids come from the data, so a resume finds them). They do not speak and are not NPC cards:
the narrator knows them from the scene sheet's `gregari` (the stat line's `scheda` stays out of its context) and from
the facts. An attack gesture in a scene with nobody with stats standing (no NPC with a sheet, no minion) is an attack
on nobody: no roll, and the fact tells the narrator not to invent the creature (`prove.fatto.attacco_senza_bersaglio`).
Next to an enemy, an attack with no target named stays a doubt: no roll. Validator: `SCHEDA.gregari` (types, sheets as
the set's NPC sheets, the scenes' entries) and the warning `SCHEDA.nemici_senza_statistiche` when a scene names a
minion's word with no minion of that type nor an NPC by that name (strumenti/valida/regole_gregari.py). Tests:
test/gregari.test.ts. Example: `strumenti/test_valida_fixtures/tre-scene` (the toll guard on the ferry); in a played campaign, ponte-lanterne, the consul's two guards at the Casa del Sale (the SRD 5.2 Guard).

## 3. Flow

1. **Action submitted** (Regia.inviaAzione). In the background the check arbiter classifies it: prove/motore.ts →
   `preclassifica`, one Haiku call per action.
   - The decision stays cached for (action, revision, scene version).
   - If the action changes, it is redone.
   - At the end of a narration, the queued actions, now stale, are redone together.
2. **Window closed** (Regia.finestraChiusa, now async). `MotoreProve.risolvi` collects the decisions.
   - Those in flight it waits for at most 4 s (with the rules arbiter there is nothing to wait for).
   - Those missing it requests in a single call.
   - A clear attack is an attack whatever the arbiter said (`attaccoDiRegole`, applied to every arbiter, Haiku included): a
     weapon of the PC's sheet used («tiro con la balestra», «lancio il dardo incantato contro…») or an attack gesture,
     against an NPC with a sheet named in what the PC does. In the second pass of the final e2e Haiku gave «no roll» to the
     magic missile, and the narrator killed the goblin with no damage. In a fight the PC's own attack in the first
     person with no target named («lo colpisco ancora», «carico quello al centro»: `parole.attacco_mio` of
     `lingue/<code>/prove.yaml`, whole words) goes to that PC's last target if it is still standing, else to the first
     enemy standing in the turn order (`GestoreCombattimento.bersaglioImplicito`): round 5 of the coherence layer had
     five such declared attacks resolved as «nessun tiro». So does a short go-on with no verb, the action's first clause
     being only `parole.attacco_ancora` («Ancora!») or a weapon of the PC's sheet and those words («Pugnale ancora»;
     round 6, CM T11), also when an enemy is named in a later clause («Pugnale ancora, il goblin si gira verso di me»:
     round 7, CA T11, still no roll, because a named target wanted an attack verb). A go-on whose own clause names one
     enemy («Ancora contro il goblin», «Di nuovo su Ruggero»: only the aiming words `parole.attacco_verso`, weapon
     words and that enemy's name words) goes to that enemy; a bare go-on keeps the last target, whoever is named later
     («Ancora! Bertoldo, scappa» does not hit Bertoldo). In a fight, a named target with the first-person words («Tiro
     ancora a Ruggero») is an attack on it; outside one they do not make a named NPC a target («Tiro ancora la corda
     verso Ruggero»). A player's claim («il goblin mi colpisce») is not an attack, nor is a negated one: «Non lo colpisco
     ancora, aspetto la risposta» (a negation of `parole.attacco_negazioni` at most three words before every attack word,
     with only short words between; final round, attempt 6, CM T17 rolled it at the last target);
     an invented foe («quello con la lancia») is rolled against a real enemy.
   - «Impossibile» needs a reason the scene records (prove/impossibile.ts, after every arbiter; A1, 17 November): Haiku
     called lifting an overturned cart impossible three runs of three, its own `motivo` saying a strong fighter can
     try. A model's «impossibile» stands when one of the scene's `vincoli_pubblici` shares at least two content words
     with the action (names count): the public facts the Preparer writes are the recorded reason. A constraint only
     licenses the verdict, it never makes one: the Engine never turns an action into «impossibile». Without a
     licence, if the rules arbiter rolls a check for the action, that check is rolled, on the set's ladder from the
     signals (at worst hard: the cart is Athletics against 20); if the rules find nothing to roll (flying), the model's
     verdict stays. That last path, and Haiku's side of the whole rule, are not measured live (no API credit since 16
     November): replayed on the cached answers of §5 of docs/prove-verifica.md only. Test: test/prove-motore.test.ts.
   - Speech is not a perception check (`soloParlato`, after every arbiter): an action that is speech only (speech
     removed, what is left are ways of saying it, `parole.modi_del_dire`: «sottovoce», «a bassa voce», «mi avvicino»,
     and the names of those spoken to; or it opens with a vocative, or it is only questions) keeps its check only if it
     is social (or SRD Insight); otherwise it becomes the rules arbiter's social check, if any, or no roll. In the second
     pass Haiku rolled «Ascoltare» for «chiedo sottovoce a Berta…» (D6).
   - On timeout, or with no model, the **rules arbiter** decides (prove/classificatore-regole.ts). It is the default of the
     fully local profile (`arbitro_prove: {provider: regole}`): the small model has as little responsibility as possible.
     In order:
     0. it looks at what the PC DOES (prove/parole-testo.ts): speech (in quotation marks, after «dico agli altri:», the
        rest of the sentence after a verb of saying) counts only for social checks; words are matched WHOLE, with the
        package's endings removed («trappola» = «trappole», but «spalla» ≠ «spallata»); generic words of place, body and
        objects (`parole.generiche`: porta, passaggio, scala, spalla…) find nothing on their own; an action made only of
        questions, direct or indirect («chiedo a Ugo se…» (I ask Ugo whether…)), does not roll;
     1. attack: an attack verb, or a weapon from the sheet actually USED («tiro con la fionda» (I shoot with the sling),
        not «spada in mano» (sword in hand)), against a target with a sheet named in what it does;
     2. help: «aiuto / do una mano a / copro» («help / give … a hand / I cover» in English) + a PC acting in the same turn;
     3. scene check: two content words of its `quando`, or one of its `parole` and one of the `quando` (a single word is
        not enough), and its intent: one of its `parole`, or the action word of the `quando` (its first content word,
        «guarda» in «un PG guarda la corda…»; root against root, «salgo» for «sale»: `intentoDelQuando`). Shared nouns
        alone are no intent: «Resto vicino al camino» rolled Perception against «un PG guarda la corda a nodi appesa
        vicino al camino» (17 November, live on ponte-lanterne). If the `quando` names an NPC, the action names it; two
        checks tied → nothing;
     4. skill by keyword: the SRD table of the content language (`parole.abilita` in lingue/<codice>/prove.yaml); for a
        non-SRD rule set, `parole_chiave` in regole.yaml (weight 2), the `parole` of steps with `per:` (weight 1) and the
        `quando` of moves; two ids tied → nothing. Stealth and Sleight of Hand against an NPC are opposed. The attack skill
        of the set (`mischia`, `distanza`) found only by word does not roll: attacks are decided by step 1;
     5. everything else, with no keywords: no roll.
     - A SOCIAL check (the SRD social skills, Charisma or the rule set's social skill, a scene check with that ability)
       requires an NPC the PC addresses («Berta, …», «chiedo a Berta» (I ask Berta), `parole.rivolto`) or the social word
       in what it does («convinco Bertoldo» (I convince Bertoldo)): naming them is not enough («guardo la chiave che Berta
       stringe» (I look at the key Berta is clutching)).
     - In the final end-to-end test of 10 November (profile A, docs/e2e-finale.md, D1), 14 of 35 cards were absurd.
       Re-running the same 51 actions from the two scripts with the Basic Fantasy set: 18 cards instead of 35, and the
       absurd ones drop to one, debatable (a Dexterity saving throw for «mi aggrappo al ramo» (I cling to the branch), from
       the set's keyword). The lost cards are all of that kind (words said to others, questions, «spada in mano», attacks on
       those with no sheet); kept are Charisma for «Berta, dammi la chiave» (Berta, give me the key), Climb for «mi
       arrampico» (I climb), and attacks on a target.
     - The DC is set by the Engine, as always. With no data (no scene check, no NPC to influence, no defence) the
       difficulty follows the set's ladder from the default rung (SRD: medium), one rung for what makes the action
       easier or harder (prove/difficolta.ts; `parole.difficolta` of lingue/<code>/prove.yaml): a signal in what the PC
       does («con la rincorsa», «con una corda» easier; «viscido», «controcorrente», «al buio», «che crolla» harder),
       or, when the action says nothing, a hard signal in a sentence of the narration or of the scene's description
       that shares a content word with the action («il fiume è gonfio» for «nuoto nel fiume»). One rung at most: two
       hardships in one sentence are a hard check, and the scene does not add to the action's own words (measured: the
       scene's «ponte stretto sul fiume gonfio» made reading runes on the bridge very hard). A nuisance alone (rain,
       cold, mud) is not a signal. A routine move (`parole.abilita_se_difficile`: «salgo sul…», «corro», «cammino
       su…») rolls only with a hard signal: no chance of meaningful failure, no roll. A manual's set moves on its own
       ladder (d20 by DC, roll-under by divisor, 2d6 by modifier). No advantage and no «impossibile» (impossible): the
       die is rolled anyway, at worst hard, and play is never stuck. Measured in docs/prove-verifica.md §5.
     - Which arbiter: `regole` is the default of the local profile (no model, no wait at closing, no GPU race with the
       reader); `anthropic` is the default when a key is present; `{provider: locale, modo: minimo}` is an explicit option
       for those with a more powerful machine (prove/arbitro-minimo.ts: the model chooses among the candidates, within 3 s,
       otherwise the classifier decides). The startup log says which one is in use.
     - Keywords live in ONE place per language, lingue/<codice>/prove.yaml (`parole`: SRD skills, attack and help verbs,
       «a mani nude» (bare-handed)), stems as regular expressions on normalised text; prove/parole-chiave.ts compiles them
       (`paroleSrd()`, candidates per set) for the classifier and the minimal mode. Italian is the table as it always was;
       English covers the same skills and moves («I climb the wall» → Athletics, «I try to persuade the guard» →
       Persuasion, «I shoot Ruggero with my crossbow» → attack: test/prove-lingua.test.ts).
     - Language: SRD names (abilities, skills, difficulties, armour, conditions, damage types) from prove.yaml (Italian from
       the Italian SRD 5.2.1, English from SRD 5.2); fact phrases, card texts and messages to the arbiters from
       lingue/<codice>/testi-prove.yaml (keys `prove.…` and `regole.…`); prompts of the arbiters and of «Chiedi una regola»
       (Ask a rule) in prompts/<codice>/arbitro-prove.md, arbitro-minimo.md, risponditore-regole.md. The ids (JSON schema,
       sheets) stay the same in every language (docs/lingue.md).
     - Agreement with the Haiku arbiter (strumenti/confronta-arbitri.ts, 10 November; Haiku's decisions are cached, so the
       measurement repeats identically):

       | Set | roll yes/no | same type | same skill or check | same DC/AC (when both roll) |
       |---|---|---|---|---|
       | 16 hand-written cases | 15/16 (94%) | 14/16 (88%) | 5/6 | 9/9 |
       | 95 actions from the B3 turns of nozze-neve | 71/95 (75%) | 66/95 (69%) | 6/11 | 9/11 (82%) |

       Re-run after whole-word matching (11 November): 16 cases equal (15/16, 14/16, 5/6, 9/9); B3 71/95, 66/95, 6/10, 9/10;
       the times the classifier rolls and Haiku does not drop from 8 to 7, those where Haiku rolls and the classifier does
       not rise from 17 to 18.

       Many B3 disagreements are questions to NPCs that Haiku itself rolls in one run and not in another (for example
       «Intimidire» (Intimidate) for «ettore, sei salito al sasso?» (Ettore, did you climb up to the rock?)). Others are real
       gaps in the classifier: no «impossibile» (impossible), no advantages, and the lie without a lying verb («dico a
       Ruggero che il barone mi manda» (I tell Ruggero the baron sent me)).
3. **Rolls** (prove/risolutore.ts).
   - First the «aiuto» (help) actions are collected; they give advantage to the helped action.
   - Then each action rolls, in the table's resolution order.
   - Right after, the NPC's reaction, if any, rolls (not out of turn in a set with initiative: see point 6 of §1).
   - HP change immediately: the second hit finds the NPC already down.
   - Decisions first pass through `normalizzaDecisione`: the scene check wins, and social skills aimed at an NPC become
     Influence.
4. **Cards**. The table state carries `tiri` (the public cards), `dadi: true` and `pg[].pf`.
   - Each author receives their own `azione:mia` with `tiri`, including private ones.
   - The projector animates the cards while the narrator generates.
5. **Narrator**. The section «Esiti dei tiri» (Roll outcomes) comes right after the actions (narrazione/messaggio.ts), with
   the rules in prompts/it/narratore.md §6 and prompts/it/selettore.md §2.
   - In mode B, successful checks open the lines with `richiede.prova` (repertorio/condizioni.ts).
   - The card and the story agree (final e2e, D2: «Carisma, fallita» (Charisma, failed), then Berta handed over the key).
     A failed check tells the narrator what does NOT happen, through the text «Ciò che voleva NON succede («…»): non
     raccontarlo come riuscito» (What he wanted does NOT happen: do not narrate it as successful): the scene check, or the
     action's text; not for an essential clue. And a line tied with `richiede.prova` to a check that the action failed this
     turn does not answer it, even if another route via `oppure` would open it: the `[usa]` is refused («legata alla prova
     …, che … ha fallito» (tied to the check …, which … failed)), and the line leaves the catalogue for that action
     (`EsitoAzioneProve.fallite`, `provaFallita`). Nor does any release line (a clue, a confession, a truth, an
     ending, a line that reveals) answer an action whose check failed and none passed, gated or not: the final round
     heard the slate clue right after «Intelligenza, fallita», whose price was «le lettere si confondono». The `[usa]`
     is refused («la prova dell'azione è fallita…: un rilascio non le risponde»), the addressee's deflection takes its
     place (it agrees with the failure), and such a line is not among the Engine's indicated lines for that action.
     The Engine's own lines (a stall move's clue) are not held to this: they answer no action.
   - After a FAILED social check toward an NPC, that NPC refuses for the rest of the turn (second pass, indagine-B T10:
     after «Carisma 3… fallita» Haiku had Ugo say «Il sentiero lo conosco io» and point the path). The Engine marks it
     (`EsitoTurnoProve.negati`: the decision's target, or the NPC the action speaks to); in the repertoire only its
     `rifiuto` lines are available; in the narration its `[png_x]` line with no refusal word, or a narrator sentence where
     it does a giving verb («indica», «consegna», «rivela»), is replaced by its refusal line, once per turn (the answer
     and its repair share it; narrazione/guardia-rifiuti.ts; words in `guardia_rifiuti` of each language pack). Each
     written version of the `rifiuto` line is said once, then the neutral narrator line («Bertoldo scuote la testa e non
     risponde.»): in the third e2e pass (bug 10) Berta's only refusal line came back word for word at T1 and T4, as the
     answer to questions it did not address.
   - The mirror: after a PASSED social check toward an NPC, that NPC gives way for the rest of the turn (final round,
     FB T1–T2: Nespola's Charisma success, Berta indifferent → friendly, was answered with her rebuff «questa chiave
     non si vende»). Same targets (`EsitoTurnoProve.sociali` with `riuscita`); in the repertoire its `rifiuto` lines are
     out (`StatoRepertorio.convinti`), also for a scriptwriter's line said in the next window; «Cosa è vero adesso»
     says «Hanno ceduto in questo turno, dopo una prova sociale riuscita…: Berta Benni a Nespola.», so the
     scriptwriter, which writes the answer, knows the NPC does not rebuff. A rebuff the scriptwriter tags as a
     `reazione` is not caught by the tag: the block line is what keeps it out. Test: test/rifiuti.test.ts,
     test/coerenza-blocco.test.ts.
6. **State and resume**.
   - `FotografiaSessione.prove` holds HP, the seed and the dice counter, and the latest cards: a restart resumes with the
     same HP.
   - «Ricomincia» (Restart) restores full HP with a new seed.
   - Scene change: only the cached decisions are forgotten.

**Dice** (prove/dadi.ts): HMAC-SHA256(seed, counter), reduced to the faces with rejection of the tail values, so without
bias.
- The seed comes from `crypto.randomBytes` and is saved in the archive.
- `TAGM_SEME_DADI=<esadecimale>` replays a game.
- Every die rolled is in the log (`dadi: tiro`, with index, faces and value). Every resolved action is in the log
  (`prove: azione risolta` (action resolved), with dice, modifier, total, DC and outcome). Every turn is in the log
  (`prove: turno risolto` (turn resolved), with wait, late decisions, seed and counter).

## 4. What the arbiter decides (prove/arbitro-haiku.ts, prompt in prompts/<codice>/arbitro-prove.md)

The JSON schema has these fields, with the empty string when they are not needed:
- `tipo`: nessuna (none), impossibile (impossible), prova (check), salvezza (save), attacco (attack), contrapposta (opposed)
  or aiuto (help);
- `abilita` / `caratteristica` (skill / ability);
- `bersaglio` (target);
- `arma`: id from the sheet; empty = bare hands;
- `prova_scena`: id from the data;
- `difficolta`: from the SRD scale, only when there is no data;
- `abilita_bersaglio` (target's skill);
- `vantaggio` with `motivo`, at most ten words, no secrets;
- `aiuta` (helps);
- `reazione_png` and `reazione_quando` («sempre» (always) or «se_fallisce» (if_failed)).

The arbiter sees only public parts:
- the public summary of the scene;
- the last narration;
- the PCs with their weapons;
- the NPCs present, with the attitude toward each PC;
- the scene checks (id and `quando`);
- the other public actions of the turn.

The Engine discards everything that does not check out: non-existent ids, a weapon the PC does not have, an unknown scene
check.

## 5. Narration and screens

Examples of facts in the message (real, from the game on 4720):
```
- [1] Ida Ferraro: Persuasione (Carisma) verso Bertoldo (con vantaggio: Bertoldo è ben disposto): 25 contro CD 15 → RIUSCITA.
- [2] Corrado Lanzi: attacco con Balestra leggera a Ruggero lo sgherro: 19 contro CA 13 → COLPITO, 7 danni perforanti; Ruggero lo sgherro è ferito gravemente. Poi Ruggero lo sgherro reagisce: attacco con Mazza ferrata a Corrado Lanzi: 21 contro CA 15 → COLPITO, 5 danni contundenti; Corrado Lanzi ha 7 punti ferita su 12.
- [3] Teo (azione PRIVATA: …): Rapidità di mano (Destrezza): 16 contro CD 15 → RIUSCITA.
```
- **Numbers spoken aloud:** hit points, AC and DC are not said aloud (prompt). If the narrator writes them anyway («quattro
  punti di vita» (four hit points), «la CA 15» (the AC 15)), narrazione/numeri-regole.ts strips the number before voice
  and transcription: the card already shows it.
- **HP aloud:** for NPCs the narrator hears only how they are («ferito ma regge» (wounded but holding), «a terra» (down)),
  never the numbers. For PCs it hears the numbers, which players see on the phone anyway.
- **Projector** (apps/web/src/schermo/TiriSchermo.tsx, components/CartaTiro.tsx). A column of cards on the right:
  - on each card: who rolls, what and against whom, the d20 (two with advantage, the discarded die dimmed), the modifier,
    the total, the DC or AC, the outcome, and for attacks the damage and «a terra» (down);
  - the d20 spins for about 1.2 s, then the total and outcome appear: this covers the narrator's wait;
  - the animation plays once per card and respects `prefers-reduced-motion`;
  - when the narration ends the cards shrink together and then disappear.
- **Phone.** The card of one's own action, even a private one, is seen only on its player's phone. There are also the
  public «Tiri del turno» (Rolls this turn) and the HP under the name.
- **Test bench without a server:** `/schermo?carte=prova`, `?carte=galleria`, `/telefono?carte=prova`.

## 6. Verification (9 November)

- **Unit tests** (apps/server/test/prove-regole.test.ts, prove-motore.test.ts, prove-repertorio.test.ts): modifiers,
  proficiency, AC, formulas, reproducible and uniform dice (chi-square), advantage, critical and natural 1, HP, resolution
  with a fake arbiter. The resolver covers: Influence, scene check, attack and down, reaction, help, opposed, impossible,
  PC without sheet, absent or slow arbiter, cache at submission, resume. The `richiede.prova` gate has its own tests.
- **Integration with the whole server** (prove-integrazione.test.ts): card, fact in the message, line through the gate,
  private card only on its phone, HP after a restart, campaign without sheets unchanged.
- **Arbiter with real Haiku** (strumenti/valuta-prove.ts, 16 cases in test/prove/casi.yaml):
  - one call per action: **16/16 on type, 33/33 fields**; p50 1.7 s, p90 2.4 s, $0.0029 for 16 calls;
  - 16 actions in one call: 15/16, 7.1 s.
  - First round, before the tweaks: Haiku called a threat «contrapposta» (opposed) and forgot the skill of a scene check.
- **Latency.** Riccardo's phones, before the dice (logs/turni.jsonl, 40 turns): narrator's first token at **809 ms** after
  closing (median); the `relazioni` arbiter at 1.36 s (p50).
  - With the dice, e2e on 4720 (3 runs, 3 PCs, real Haiku): wait for the rolls at closing **1–2 ms**, because all
    decisions were ready from submission (`tardive: []`).
  - First token: 589 and 946 ms (mode B); 1520 ms (mode A, first turn, context cache still to be written).
  - The difference comes from Haiku, not from the dice: if a decision were missing at closing, the wait would be ≈ 1.7 s.
- **E2E** (apps/web/e2e/prove.spec.ts, `E2E_PORTA=4720`). Projector and three phones: Persuasion, crossbow with the
  thug's reaction, private lockpicking. The cards are right and the private one appears only on Teo's phone.
  - Screenshots in logs/screenshots/prove/e2e-*.png.
  - The narrator tells the outcomes as they are: convinced or not, hit or missed, wounded, the lock clicking open.

Live verification of checks, rolls, DCs and turns on a running server, scenario by scenario: docs/prove-verifica.md.

## 7. Open items

- **Preparer skill**: generate sheets per §2 (pregenerated PCs with abilities consistent with class and level; NPCs with
  CR, attacks and passives; `prove` for obstacles and non-essential clues; `richiede.prova` on confessions that must be
  earned; `regole.dadi: false` when the brief asks for it) and update the validator. The real campaigns (prova-f0,
  nozze-neve, ponte-lanterne) currently have no sheets, so they play without dice.
- **Private actions spoken aloud**: in all three checks on 4720 the narrator said Teo's private lockpicking out loud. In
  the two failed ones the lock's click was really audible, but the narrator named Teo anyway. The fact now forbids it.
  The `[privato pg_x]` channel of the «voce» (voice) agent is the right route, to be verified when it arrives.
  - Deterministic guard (narrazione/privato.ts): a line at the table that names the author and repeats the content of the
    private action goes to their phone.
  - Final e2e of 10 November: the narrator's line went to the phone, but the `[png_x]` reply of the NPC the PC was
    privately talking to was heard at the table. Now a `[png_x]` line goes to the phone of the one who acted when no public
    action of the turn is addressed to that NPC and a private action names them (by name or nickname), or when the turn has
    only one PC's private actions. More PCs speaking privately to the same NPC: it goes to whoever shares the most words
    with the line. In every language (names are enough). Tests: test/privato-guardia.test.ts, test/lingue-regole-en.test.ts.
  - Left over (pressione-B2 T6): a private question and a public action to the same NPC in the same turn; the answer to the
    private question was heard because the public action was also addressed to him. Now the line goes to the phone if it
    repeats more words of the private action than of each public action addressed to the NPC, or, on a tie, if it follows
    a line already moved to that PC.
  - Second pass of the final e2e (indagine-B T4): the PC's name in one sentence, the content in the next. A sentence is now
    judged TOGETHER with what precedes it (the line so far, or the last sentence of the previous line); the sentence itself
    must carry the name or at least one word in common. One word instead of two is enough when the line also names the NPC
    the private action speaks to (`pngInterpellati`: addressed, or right after a verb of saying, «I ask the innkeeper…»).
  - Outcomes of private actions are no longer among the table's facts: in the narrator message they have their own
    section («Esiti delle azioni PRIVATE», `EsitoTurnoProve.fattiPrivati`), and the «NON succede» clause of a private
    action does not quote the action: it only says to tell it in the `[privato pg_x]` line.
  - An NPC is recognised also by its trade (repertorio/pertinenza.ts, `nomiDeiPng`; campagna/nomi.ts,
    `paroleDiMestiere`): the word after a connector of the name («Hale the Innkeeper» → innkeeper, «Ruggero lo sgherro» →
    sgherro) and the first word of the sheet's `ruolo` without its article; connectors and articles are in
    `lingue/<code>/motore.yaml`, section `nomi`. In the second pass «I ask the innkeeper…» did not find Hale, so his reply
    to a private action was heard at the table. This holds everywhere NPC names are matched (private guard, rules arbiter,
    line relevance).
  - Third e2e pass (docs/e2e-finale-3.md, bug 1): leaks in LATER turns, which the guard (and the leak count) never looked
    at. «Nespola, la tua domanda sul prezzo del carbone è scivolata nel fango.» three turns after the whisper, while
    Nespola acted in public; «Livia ha chiesto a Ugo dove stava la notte, e lui ha detto che guardava il fuoco della
    carbonaia.» two turns after (the feed path is the message's «Esiti privati già dati»: the narrator's history has no
    private actions, the outcomes it gave to the phones are there). Now (`precedentePrivato`):
    - the director keeps the private actions of the evening and the private outcomes given (the last 10 turns:
      `azioniPrivate`, `privati`) with what each PC has said in public since; a narrator line that names that PC, names
      an NPC of the item (the one whispered to, or who gave the private outcome: `verso`) and shares two roots with it
      that the PC has not said aloud since goes to their phone, even if the PC acts in public in this turn;
    - a `richiamo` («la tua domanda», «ha chiesto», «sottovoce», «in privato»…, `lingue/<code>/motore.yaml`, section
      `privato_richiami`) lowers the threshold to one root, in the turn of the action too;
    - a turn whose only actions are private (combat T25 on HEAD: «Il goblin alza gli occhi verso di lei… Parla piano, in
      fretta… Dice che il ragazzo è stato portato via», with no name of the PC): a narrator line that names the NPC
      whispered to (not during a fight: there it may be that NPC's attack in its step), or shares two roots with the
      whisper, or one root right after a line already moved, goes to that phone; a world line that names nobody
      whispered to stays, and so does a line that names another PC (it is about that PC);
    - with two roots and no richiamo, the words the table has heard aloud since the private turn do not count, so a later
      public outcome («Livia abbassa la spada sul goblin») is not pulled to a phone because of an earlier whisper.
    Not saved with the session: after a resume only the outcomes count. Limit: a paraphrase with no word in common
    («prezzo» for «pagava») still needs one shared root and a richiamo or two roots.
  - Since the coherence layer's audience split (docs/coerenza.md §2, 16 November) the public narration call does not
    see a private action's content or any private outcome at all: «Teo fa qualcosa in privato verso Bertoldo»; the
    reply is a call apart that only reaches that phone. The guard above stays as the backstop (and the only defence
    with the local minimal reader, which makes one call per turn).
  - The detector of the runs was blind to the same cases: the leak count (`fughe`) measures only the campaign's secret
    words, and misure.py's `sospette` read the raw narration of the same turn and skipped a PC who also acted in public.
    `esperimenti/e2e-finale/private_al_tavolo.py` reads the table record (what the table heard), up to eight turns after
    each private action, with its own looser rule (the PC's or the addressed NPC's name and one root; two roots within
    two turns; one root in a turn with only private actions); misure.py reports it as `private.al_tavolo` with the
    guard's moves (`spostate_dalla_guardia`). On the third pass's table records it finds both judged leaks (fuori-binario
    T5, stallo T11). Test: strumenti/test_private_al_tavolo.py.
- **Real combat**:
  - initiative and turn order;
  - unprovoked NPC attacks (an `[attacco]` line, to be agreed with the «voce» parser);
  - death saving throws and PCs at 0 HP (today «a terra, privo di sensi» (down, unconscious), does not act until healed);
  - conditions (prone, grappled…);
  - multiple attacks, spells and saving throws imposed by NPCs;
  - melee/range distance kept by the Engine.
- **Game Master panel**: PC and NPC HP with healing, damage and rest by hand, and the latest cards. Today NPC HP are only in
  the logs and the archive.
- ~~**Attitudes**: the Engine uses the ones from the sheet.~~ Done (docs/mondo.md §4): the checks use the attitude in play
  (changed by the narrator's `[atteggiamento]`, by consequences, by social checks), and a social check aimed at an NPC moves
  it one step towards that PC, up on a success, down on a failure (never down to hostile), once per NPC per visit.

## 8. Manual rolls (15 November)

Riccardo (15 November): «il tiro automatico deve essere facoltativo: di default il master chiede "fai un tiro su
Furtività" e l'utente risponde quanto ha fatto, senza dirgli la classe difficoltà.» (Automatic rolling must be optional:
by default the Game Master asks "roll Stealth" and the player answers what they got, without being told the DC.)

**Engine** (prove/motore.ts, prove/richieste.ts, prove/dadi-giocatore.ts). `risolvi` is split in three steps, with the
same decisions as before:
1. `decidi(turno, azioni)`: the arbiter's decisions and the deterministic passes (clear attack, speech is not a check).
2. `richiesteGiocatori(decisioni, inseriti)`: what the players must roll now, read off a dry run of the whole turn (the
   set's resolver, then the fight) on a throwaway copy of the Engine: same state, the Engine's dice copied from here
   (`FonteDadi.clona`: seed and counter, or a scripted sequence), the values entered so far. So each rule set keeps one
   source for modifiers and dice, and the real dice never move. A request (`RichiestaTiro`, packages/shared) says what
   to roll and the player's own bonus: the label («Furtività (Destrezza)», «Danni: Balestra leggera», «Iniziativa»), the
   faces, how many dice (two with advantage, n for 2d6 or for damage), which die counts (`tieni`: highest, lowest;
   `somma` to add them), the bonus, roll-under or not, and `per` for a follow-up (`danno`, `contesa`, `iniziativa`,
   `morte`). The number to beat, the target and the rule text are only in the Game Master's copy (`RichiestaTiroMaster`).
   - **Every die of a PC is the player's** (prove/dadi-tavolo.ts). The resolvers and the fight draw a PC's dice through
     a group of the pass's table, never straight from the Engine: the action's test (`r_<action>`), the damage of its
     hit (`r_<action>_danno`: the weapon's dice and bonus, doubled dice on a critical), the other PC's die in a contest
     (`r_<action>_<pg>`), initiative, death saves and a PC's save against a monster's special in the monster's step (a
     poison bite, a breath: `per: salvezza`, R4) (`r_t<turn>_<per>_<pg>_<n>`). NPC rolls, side rolls (surprise,
     initiative by sides), morale and the Game Master's rolls never pass there.
   - **Rounds.** In the dry run a group with no value gets placeholder 1s and is missing; it is asked now only when no
     missing roll it may depend on comes before it: the damage waits for the attack roll of the same PC and action; the
     other actions' rolls are asked together; the fight's rolls wait for everything before them, except that one round's
     initiative rolls are asked together. The director asks, waits, and calls again with the new values until nothing is
     missing: attack → damage → initiative → a dying PC's death saves, as at a real table.
   - A placeholder 1 misses, so a second attack on the same NPC still asks for its roll. If the real first roll downs the
     target, the second value goes unused (logged): better an unused value than the Engine rolling a player's die.
   - No request: automatic attacks ask only their damage; help, trivial or impossible actions, a PC down or losing the
     turn ask nothing.
3. `completa(decisioni, inseriti)`: the real resolution, the same pass with the Engine's real dice. The values entered
   are served by request id (`DadiDelGiocatore` inside a group: a percentile is split back into the units and tens d10
   the resolver draws; with a bonus tens die the second value gives only its tens), so a player's die can never land on
   another roll. A request switched to automatic (`valori: null`) rolls with the Engine's dice. The card says who rolled
   (`manuale`: `telefono`, `master`, `dettato`, `motore`; a death save's card too); the Engine logs a warning if the dice
   on a test's card differ from those entered, and when a player's roll was rolled by the Engine because nobody asked
   it. A turn played with the requests and the same turn played at once with the same values give the same cards,
   facts, HP, fight and dice counter (test/prove-manuali-seguito.test.ts, every rule-set shape).
- **The table never sees the DC.** `cartaPerIlTavolo` strips the number to beat, its description and the rule text from
  every public card (`contro_nascosto: true`, `contro.valore` 0): `MotoreProve.tiriPubblici` and `tiriDellAzione`
  apply it, so the table state, `azione:mia` and a resumed session never carry it. Since 16 November this holds in both
  roll modes and for every card: a PC's check or attack (on request or rolled by the Engine), an NPC's attack against
  a PC's AC, a death save. Before, only cards rolled on request hid it, and the third e2e pass
  (docs/e2e-finale-3.md) found «contro CD 17», «contro CA 17» at the table in automatic mode. Untouched: an always-hit
  attack (nothing to beat) and a Game Master roll (its own card). Only the panel (`tiriDelMaster`) and the narrator's
  facts have the number. `regole.mostra_cd: true` in campagna.yaml (prove/modalita.ts, `mostraCdAlTavolo`; validator
  `SCHEDA.regole`) shows the cards as rolled. The server log «prove: tiri del turno» has both views: `tiri` (the
  panel's, with the DC) and `tavolo` (what the screens showed); `esperimenti/e2e-finale/tavolo_con_carte.py` quotes
  `tavolo`.
  On a 2d6 set the difficulty is a modifier of the roll: it is as secret as a DC. The card carries it apart
  (`modificatore_difficolta`), the request's bonus leaves it out, and the table's card shows the bonus and the total
  without it (the total the phone showed) and the outcome.

**Setting** (prove/modalita.ts). `regole.tiri_giocatori` in campagna.yaml: `manuale` (default, also when absent) or
`automatico` (the Engine rolls, as before). The Preparer writes it from the brief's `tiri_giocatori`; the validator
accepts only the two values (`SCHEDA.regole`, strumenti/valida/regole_schede.py). A test instance overrides it with
`TAGM_TIRI_GIOCATORI` (config.ts); under vitest the default is automatic, so tests that do not exercise manual rolls
never wait. The startup log line `PROVE E DADI` says the value and its origin (override, campaign, default).

**Director** (scena/tiri-giocatori.ts; regia.ts has only the call sites). When a window closes with actions:
1. phase `narrazione` (pause, «Ferma la narrazione» and the scene commands apply as in a narration), `decidi`, then the
   requests;
2. the narrator's voice says each PUBLIC request (language pack `prove.richiesta.*`: «Ida, fai un tiro di Persuasione,
   con vantaggio.», «Corrado, tira per colpire: Balestra leggera.»), never the DC, never a private action's request;
3. the wait (prove/attesa-tiri.ts) until every request is closed: values from the phone, from dictation, entered by the
   Game Master, or switched to the Engine's dice. No timeout and no watchdog during the wait (the watchdog starts with
   the narration); an interrupted turn (stop, restart, scene change) cancels the wait and the turn is dropped as a
   stopped narration is;
4. then `completa` and the narrator as before. The turn's latencies (`turni.jsonl`) start when the last die is in, not
   at the window's close, so the table's rolling time does not count as narrator latency.
- After each round of requests the director asks the Engine again with the values entered (step 2): the follow-ups
  (damage, initiative, death saves) get their own voice lines («Corrado, tira i danni.», «Ida, tira l'iniziativa.»,
  «Teo, tira contro la morte.», `prove.richiesta.*`); a private action's follow-ups stay on its phone. A roll the Game
  Master switches to the Engine keeps that PC's follow-ups of the same turn with the Engine; «Tutti al Motore» gives the
  Engine every roll left in the turn. At most 40 rounds (logged), far more than a turn needs.
- A turn with no request (nobody must roll) does not wait and says nothing. A combat turn with no PC action (the NPCs'
  steps) waits only when a player's roll comes up there: a dying PC's death save, the initiative of a new round.
- A fight the Game Master opens from the panel (item 11c, 16 November) starts at the next closed window, after that
  window's actions, as one an attack opens does: `MotoreProve.chiediCombattimento` keeps the request (in the snapshot,
  `combattimento_chiesto`), the dry run starts the fight on its copy (`dopoAzioni`, `apri`), so each PC's initiative is
  asked like any other roll («Ida, tira l'iniziativa.»), «Tira il Motore» works on it, and the real pass starts the fight
  with the dice entered; the world hears «scontro» once, in that turn. A window with no action still runs the wait. An interrupted turn leaves the request as it was
  (no half-open fight); «Termina combattimento» cancels a request not started yet; the panel shows «alla chiusura: si
  tira l'iniziativa». Automatic rolls start the panel's fight at once, as before; the first turn after the click says
  the order at the table and runs an NPC step at the head of it (A3, 17 November: the window consumed that step as if
  a PC had played it, so an NPC first in the order lost its first step, and the click's order was never said). The
  PCs' actions written in that window wait: with an NPC first in the order, that closure runs the NPC's step alone and
  the actions go back in queue for the next turn, where whoever is on turn resolves (`soloChiEraDiTurno`,
  scena/regia.ts); in a fight an empty window is the NPCs' turn, so its message carries the cards and no stall prompt.
  Test:
  test/combattimento.test.ts, test/combattimento-master-manuale.test.ts. Side rolls (surprise, initiative by
  sides) stay the Engine's, being no one player's own. Test: test/combattimento-master-manuale.test.ts.
- A restart during the wait loses the open requests (the requests are not in the session snapshot): the turn behaves as
  a turn caught in narration.

**Transport** (packages/shared). `StatoTavolo.tiri_manuali` and `tiri_richiesti` (public requests only, without DC) for
the projector and every phone; `tiri:richiesti` to the room of one PC (its own requests, private ones included), at
every change and when the PC is chosen, so a phone that reconnects finds its roll again (its gear view `pg:scorta`
travels the same way, R3: never in the table state); `tiro:inserisci` from the
phone (only for its own PC; refused: unknown or closed request, wrong number of dice, a die off its faces; `dettato:
true` when the values came from dictation); the Game Master command `{tipo: 'tiro', id, valori}` (`valori: null` = the
Engine rolls, `id: '*'` = every open request); `StatoMaster.tiri` with the requests WITH the DC and the last turn's
cards as rolled.

**Screens.** Phone: telefono/TiroDaFare.tsx, a full-screen card over the page while one of the PC's rolls is open:
what to roll, the bonus, one box per die, the total as you type, **Fatto**. Dictation: with the card open, the
microphone's transcript fills the boxes instead of the action box (telefono/numeriDettati.ts: digits and number words
in Italian and English, articles are never a 1; then the player confirms): this reuses POST /api/dettato unchanged.
Projector: schermo/RichiesteSchermo.tsx takes the cards' column while the table rolls. Cards: a card with
`contro_nascosto` shows dice, bonus, total and outcome, no number to beat (components/CartaTiro.tsx). Panel:
master/SezioneTiri.tsx, the «Tiri» box (the DCs, enter the dice for a player, «Tira il Motore», «Tutti al Motore»,
the last cards with who entered the dice).

**Checks asked by the Game Master** (master command `chiedi_prova`, panel «Tiri» → «Chiedi una prova»). The Game Master
picks a PC with a sheet, what to roll from the set's catalogue (`MotoreProve.catalogoDelMaster`: SRD skills, abilities
and saves; a manual's skills and characteristics), a difficulty of the set's scale or its default, a few words of why,
and «private». The check becomes a pseudo-action of that PC («m_<n>», text «prova chiesta dal master: Percezione
(Saggezza), per …») with its decision already taken (`decisioneDelMaster`, no arbiter), queued for the next closed
window («Risolvi ora» closes the open one). There it goes through the same path as an action: the request (marked
`dal_master`, «Il master ti chiede un tiro» on the phone) and the wait with manual rolls, the Engine's dice with
automatic ones, a card and a fact for the narrator. A turn with only the Game Master's checks is not a stall (no world
move is asked of the narrator). «Ricomincia» forgets the checks not yet rolled.

While the table rolls, the projector's centre line and the other phones' banner say «Si tirano i dadi…» instead of
«the narrator is preparing».

**Verification**: test/prove-manuali.test.ts (Engine, four rule-set shapes), test/prove-manuali-seguito.test.ts
(follow-ups: damage after a hit and none after a miss, initiative of every PC at once, a death save at its step, the
contest's two players, a private attack's damage, the 2d6 difficulty kept out of the bonus, dry runs that leave the
Engine untouched, the same result played round by round or at once on every rule-set shape),
test/prove-manuali-integrazione.test.ts (whole server: request without DC on projector and phones, private request
only on its phone, voice line, wrong dice refused, Game Master enters and switches, stop cancels the wait, the damage
and initiative rounds with their voice lines and a switch that holds, automatic unchanged), web
telefono/numeriDettati.test.ts, and the real pages in apps/web/e2e/tiri-manuali.spec.ts (fake narrator, rules arbiter,
no model; screenshots in logs/screenshots/tiri-manuali/); live runs in docs/prove-verifica.md.

## 9. The Game Master's own rolls (15 November)

Riccardo: «Il sistema di tiri può avvenire anche in background dal lato master. Non prendere tu le decisioni: ogni
tanto, quando reputi che sia bello che sia casuale, lo dici e fai vedere il tiro.» When an outcome is uncertain and
nobody at the table rolls for it, the Engine rolls; the model never picks the result.

- **Morale** (R4): the 2d6 of the NPCs' morale in a fight is the Game Master's roll: its card is the panel's (`nascosta`),
  shown at the table by `tiri_master` like the others (`a_volte` when holding is between one in three and two in three);
  docs/combattimento.md §3.
- **Reaction rolls** (R5; regole/reazioni.ts, prove/motore.ts `reazioneDelMaster`): a set's `reazioni` tables (Basic
  Fantasy's monster reactions, p. 50, and a retainer's answer to an offer, p. 46): from the panel («Tiro di reazione» in
  the Tiri box: the table, the PC who leads, the NPC if one reacts, the Game Master's adjustment from −10 to 10) the
  Engine rolls the table's dice + the lead PC's characteristic bonus + the adjustment and reads the band; the card is the
  Game Master's (`tiri_master`), the narrator hears the band in the next turn, and with an NPC its attitude towards that
  PC follows the band when the table gives one (docs/mondo.md §4). A player persuading an NPC in play still rolls their
  own check (with Basic Fantasy, a Charisma ability roll against the level's target, §13).
- **What rolls today.** The world's uncertain outcomes: an `avanza_quando` gate of a clock with `tiro: {dado, almeno,
  visibile?}` (docs/mondo.md §2, mondo-vivo's work): does the front advance when the PCs leave, does the news spread.
  The world asks its one roll hook (mondo/tiri.ts, `TiroDelMondo`); the director plugs in the Game Master's roll path,
  prove/tiri-master.ts, which rolls with the Engine's dice (saved with the checks' state) or, in a campaign without
  sheets, with the world's own dice that the world hands to the hook with every request (saved in the world's snapshot,
  so a resume replays them), logs every roll («Game Master roll», with the reason, the target and the probability), keeps the last 20
  for the panel and decides whether the table sees it. The NPCs' own rolls (reactions, NPC turns, initiative, death
  saves, morale) were already the Engine's and keep their cards as before.
- **Visibility**, `regole.tiri_master` in campagna.yaml (validator `SCHEDA.regole`; test override `TAGM_TIRI_MASTER`):
  - `nascosti` (default): never shown; the log and the panel («Tiri del master») have it;
  - `a_volte`: shown when the odds are close, from one in three to two in three (a d6 needing 3+, 4+ or 5+; a d20
    needing 8+ to 14+): a real toss-up is fun to watch, a near-sure roll is not;
  - `visibili`: always shown;
  - a roll whose data says `visibile: true` is always shown.
- **Shown** means a card «Il master» on the projector and the phones with the die and «Sì»/«No» (never what it was for,
  never the target: those are the Game Master's), and one line of the narrator's voice («Il master tira i dadi.»):
  inside a turn being resolved, before that turn's narration; at a scene change (a gate on leaving), as the first line
  of the new scene's reading; after a fight opened from the panel, before the next narration. A campaign without
  sheets has no cards: the line is the only sign, and the log has the roll.
- **The panel** («Tiri del master» in the Tiri box) lists the last rolls with what asked for them; with «senza
  spoiler» on, the reasons are hidden, and so are the DCs and what a private check was for.
- **World questions and NPCs' own checks** (mondo/domande.ts). A scene sheet can write, under `domande`, an uncertain
  fact it leaves to chance («is the guard awake?») with the fact that asks it (`quando`, the gate grammar of
  docs/mondo.md §2: `azione` with `temi`, `cambio_scena` = on arriving in this scene, `resta_in_scena`, `battuta`,
  `indizio`, `prova_fallita`, `scontro`; not `lascia_scena`) and either its odds (`tiro: {dado, almeno, visibile?}`)
  or an NPC's own check (`prova_png: {png, prova, difficolta?, visibile?}`, the ids of the panel's «Chiedi una
  prova»), and the two answers (`se_si`, `se_no`). When the fact happens in that scene the world asks: the odds go
  through the world's roll hook (the Engine's dice, or the world's own in a campaign without sheets); the NPC's check
  through `MotoreProve.provaDelPng`, the set's resolver with the NPC's sheet and the Engine's dice (null, and the
  question stays open, without dice, without the NPC's sheet, with the NPC down), then `TiriDelMaster.registra`. Both
  are logged («Game Master roll», «world: question answered by the dice»), listed on the panel with the question and,
  for the NPC, what it rolled, and shown by the same rule (`a_volte` with the check's odds of success: d20 against the
  DC with advantage counted, roll-under, 2d6 against the set's lowest band that is not a failure). The answer is
  canon: asked once per session, saved in the world's snapshot (`domande`), and given to the narrator as a line of the
  turn's world section («Deciso dai dadi del master, ora è un fatto…», `mondo.risposta`), in both modes. The scenes'
  `domande` stay out of the narrator's cached context (campagna/contesto.ts). Validator: class `DOMANDE`
  (strumenti/valida/regole_domande.py). Example: `strumenti/test_valida_fixtures/tre-scene/scena.yaml`, `d_cane` (and, in a played campaign, `campagne/torre-mozza/scene/scena_torre.yaml`, `d_zirra_porta`). Tests:
  test/mondo-domande.test.ts (reading, once per session, saved, the NPC check through the SRD and a manual's set,
  the cached context, the whole server with and without sheets).

## 10. Hit points from every source: typed effects, falls, rest (20 November)

Riccardo: «Il sistema di punti ferita, slot incantesimi, armi, peso… devi prendere il manuale e analizzare ogni singola
regola.» The rule audit (docs/regole-audit/basic-fantasy-gioco.md, gap 1) found that hit points changed only through an
attack between two sheets and the Game Master's `pf`: traps, falls, potions, healing spells and rest changed nothing.
Now every source goes through one Engine path, prove/effetti.ts, with the typed effects of docs/regole.md §2.

- **Typed effects** (regole/effetti.ts reads them, prove/effetti.ts applies them): `danno`, `cura`, `caduta`, `attacco`
  (a trap that attacks like a monster: d20 + its bonus against the victim's AC), `condizione`, `bonus`, `immunita`,
  `stabilizza`, `morte` (save or die). Damage and healing scale with the caster's level (`dadi_per_livello`,
  `bonus_per_livello`, `colpi`). Each damage or healing roll gets a card like an attack's: an automatic one with the
  dice («automatico: 2d6 = 7 danni»; healing «cura: 1d6+1 = 5 punti ferita», card field `cura: true`), and a fact for
  the narrator. A hazard's card is the victim's and has no target, so it never opens a fight; a power aimed at an NPC
  is its author's attack card, which does. Healing never brings back the dead (`StatoProve.curaRegola`): only the Game
  Master's `pf` does, as before. A character healed from 0 gets back on its feet in the fight (`dopoCura`).
- **A failed scene check's hazard.** A scene check can carry `nome` (the hazard's name on the card) and
  `effetti_se_fallisce` (typed effects): the PC who fails it takes them, through the same path, in both resolvers (the
  SRD's and the manual's). torre-mozza's pit, `p_fossa_salvezza`, is a fall of 2 metres by the set's table.
- **Falls** follow the set's `cadute` table (Basic Fantasy p. 59: 1d6 per 10 feet to the nearest step, at most 20d6;
  the SRD 5.2: 1d6 per full 10 feet, at most 20d6, in regole/srd.ts). A fall too short to hurt says so.
- **Rest and hazards from the panel** (Game Master commands `riposo` and `pericolo`, `MotoreProve.riposo` and
  `effettoDelMaster`). A rest applies the set's `riposo` kind to every character with a sheet who is not dead (a number,
  a formula rolled for each, or all), never during a fight; a hazard applies damage, healing or a fall to one
  character. The panel lists the set's kinds of rest (`CombattimentoMaster.riposi`). Their facts go to the transcript
  at once and to the narrator first in the next resolved turn (`fatti_in_sospeso`, kept in the snapshot).
- **Saving throws pinned to their number** (regole/salvezze.ts; audit X-SV-03). A save of a manual's set (an ability
  with `salvezza: true` or a column of `tiri_salvezza`) is rolled against its own number in the resolver, whoever asked
  for it (the model arbiter, the rules arbiter, a scene check, the panel's «Chiedi una prova»): the class and level
  table's number when the set has the table and the sheet a class (`scheda.classe`, `livello`, or `salva_come` for a
  monster), otherwise the sheet's bonus against the set's default difficulty, which is exactly the manual's odds. The
  difficulty and the arbiter's or a helper's advantage are dropped (the log says so); a fight's condition with
  `svantaggio_salvezze` still counts. A target rolls its own save against a PC's power (`salvezzaDelBersaglio`): an
  NPC with the Engine's dice, its card marked `nascosta` (only the Game Master panel lists it, docs/prove.md §9).
  Tests: test/salvezze.test.ts.
- **Powers and resources** (regole/poteri.ts, prove/poteri.ts, prove/risorse.ts; audit C-SP-01, C-CLS-11, C-THF-10). A
  decision of type `potere` (with `potere: <id>`) uses a power of the set: the rules arbiter finds one of the PC's
  powers by its words (`potereDiRegole`: the spells on its sheet, its items, the class actions), the model arbiter may
  name one (its schema has the set's powers), and the Engine applies the rules' finding after any arbiter, before the
  attack override, so a spell is never rolled as an unlimited weapon. The cost comes first: a spell of the caster's
  class needs a prepared copy (vancian) or a known spell (slots) and a slot of its level from the class table or the
  sheet's `slot`; an item one of `oggetti`. Spent, it is refused with a line for the narrator and nothing else
  happens. Then the targets (one named, every enemy standing in the fight or hostile in the scene within the hit-dice
  limit, the allies, oneself; types it never affects and immunities are said), each target's own save (an NPC's with
  the Engine's dice, hidden), and the effects. A hostile power on an NPC opens the fight like an attack
  (`EsitoTurnoProve.ostili`). Resources: counters of the set (`risorse`), slots, prepared copies and items in
  `StatoProveSalvato.risorse`; a rest that refreshes gives back the slots and the prepared list, the end of a fight
  the once-per-target uses and the per-fight counters. A weapon with `consuma` spends one per attack and is refused at
  0 (an NPC takes another weapon). An attack ability with `una_volta_per_bersaglio` (the sneak attack) is marked on
  its target until the fight ends, then the attack rolls with its `ripiego`; with `danno: doppio` the weapon's roll
  is doubled. The rules arbiter picks the weapon whose name the action says most fully («spada corta alle spalle»).
  Tests: test/poteri.test.ts.
- **Timed effects** (prove/attivi.ts): a `condizione`, `bonus` or `immunita` effect lives in the Engine state with its
  duration: rounds (rolled at the cast, + `round_per_livello` × the caster's level) tick at each round of a fight and at
  each closed window outside one (no game clock: P4-01 of the audit); `scena` ends at the scene change
  (`MotoreProve.fineScena`, called by the director), `riposo` at the panel's rest, `permanente` never. The fight reads
  the conditions as its own; a bonus counts on the bearer's AC (against melee or missiles), attack rolls, saves or
  damage; an immunity blocks a power (Shield and the magic missile) or a condition. Damage ends the conditions marked
  `finisce_se_ferito` (a sleeper wakes: «Il colpo scuote …»). What ends is a fact for the narrator. Saved in the
  snapshot (`StatoProveSalvato.attivi`). Tests: test/attivi.test.ts.
- **Traits** (regole/tratti.ts; audit C-RACE-20, C-RACE-13, C-RACE-18). A race's, a class's or the sheet's own traits
  add to initiative (`candidati`), to an ability's rolls and the attacks that use it (`cheCosa`), to the saves of some
  table columns (`extraSalvezza`), make it immune to a power or a condition, or change its own surprise range (the
  side's die is read against each member's: the elf surprised only on 1). torre-mozza's sheets now name their race and
  class and no longer write `ts_*`: the class table and the race traits give the same odds as before. Tests:
  test/tratti.test.ts, and test/manuale-basic-fantasy.test.ts for the set's numbers against the manual.
- **Death and dying by the set** (prove/morte.ts; audit P8-14): `tiri_morte.abilita` rolls the PC's own save, a
  `finestra` keeps it dying for some rounds (each a fact) until it is bound (`stabilizza`), healed, or dies, in and out of
  a fight (docs/combattimento.md §3, «At 0»); the window is in the snapshot (`StatoProveSalvato.morenti`). Tests:
  test/morte.test.ts.
- Tests: test/effetti.test.ts (the closed list, the scaling, both falling tables, damage halved by a save, healing that
  never revives, a trap's attack, save-or-die, a failed scene check's fall, a rest, the Game Master's hazard, the SRD's
  data), strumenti/test_valida_effetti.py (the validator's mirror).

Credits: this work includes material from the System Reference Document 5.2 («SRD 5.2») by Wizards of the Coast LLC,
https://www.dndbeyond.com/srd, licensed under the Creative Commons Attribution 4.0 International License.

- **Gear and coins from the panel** (Game Master command `inventario`, `MotoreProve.inventarioDelMaster`, prove/inventario.ts;
  docs/regole.md §2, «Catalogo»). With a set that has a catalog: an item found or lost (`cosa: oggetto`, `quante` negative
  to lose), coins gained or paid (`cosa: monete`, `monete: {mo: 3}`; negative = pay that worth with change), a purchase
  or a sale (`compra`, `vendi`, `prezzo` like «15 ma», default the catalog's), an armor or shield put on or taken off
  (`indossa`, `togli`; one of each kind, never a forbidden one). The AC and the attack lines are derived again at once,
  on the Engine's own copy of the sheet, so attacks, traps' attacks and the arbiter's weapon list see the same numbers. A
  change goes to the transcript and to the narrator in the next turn; a refusal («non ha abbastanza monete») only back to
  the panel. The typed effects `oggetto` and `monete` do the same from a power or a scene check. `vistaInventario(id)`
  is what the panel and the PC's own phone show (`ScortaScheda`: AC and what gives it, attack lines, items, coins, the
  counters of spell slots, resources and power items). Tests: test/inventario.test.ts, test/catalogo.test.ts.

## 11. The game clock, light and travel (20 November, rules-engine package R2)

The audit's P4-01 found no game time at all: nothing that lasts turns could run (light, potions, searches, wandering
monsters), and R1 ticked its round durations once per closed window as a stopgap. Now the Engine has a clock
(prove/tempo.ts) with the units of the set's `tempo` (docs/regole.md §2), in the snapshot like the rest of the state.

- **What moves it.** Each new round of a fight is one round. Each closed window outside a fight costs the scene's
  `tempo_per_finestra` or the set's `per_finestra` (Basic Fantasy: a turn, ten minutes, the pace of exploring), or more
  when an action has the words of one of `tempo.azioni`; while a PC is dying a window is one round (the table acts in
  the moment), so binding a friend in the next window still comes in time. A window that opens a fight (an attack, a
  hostile power, the panel's fight) is one round too: it is the fight's first moment, so a bonus of a few rounds drunk
  or cast just before (Shield, a potion) is still on when the blows fall (R3; before, the exploring turn passed first
  and ended it). A talk scene says its own length (`tempo_per_finestra: {round: 6}`: torre-mozza's sheepfold and
  charcoal pile), checked by the validator against the set's units. A rest takes its `durata` (a night: eight
  hours), after the healing. The Game Master moves it from the panel (command `tempo`: `avanza` by a duration, or a
  `viaggio`). A set without `tempo` keeps the old rule (a window is one round) and the panel shows no clock. The SRD 5.2 has its
  6-second round and 8-hour long rest as data but no window rule or start hour (`mostra: false`): its clock counts
  durations and is neither shown nor told. A one-shot's or a package's start hour (`tempo_all_inizio`) is the Engine's,
  never the narrator's.
- **What runs on it.** The timed effects (prove/attivi.ts) and the dying window (prove/morte.ts) tick by the whole
  rounds that went by; a duration in turns or hours (hold person's 2d8 turns) is turned into rounds when it is given.
- **Light.** A catalog item with `luce` is lit by an action's words («accendo una torcia»: the language pack's
  `parole.accendere` and a word of the item's name, read by code; `spegnere` to put it out) or from the panel: a torch is
  spent, a lantern spends a flask of its `consuma` (refused without one). Its burning time is rolled by the Engine's dice
  (a Game Master roll: the panel shows the time left, the phone only that it is lit) and counted on the clock; when it is
  up the light goes out with a fact, and the table must hear it (an owed fact of type `buio`, prove/fatti-dovuti.ts). A
  light put out is lost; one left burning through a rest burns down.
- **Travel** (Basic Fantasy p. 45; the set's `viaggio`): a distance and a terrain; the day's distance is the slowest PC
  at the table's movement now (by load and armor, docs/regole.md §2 «Carico») × `per_movimento` × the terrain; the clock
  moves by the whole days and the hours of the last travel day. An overloaded PC keeps the group from setting off.
- **Not yet**: wandering monster checks every few turns (P8-01), rations and water per day (P4-22), forced march, getting
  lost; light does not yet blind those without it (a scene's darkness state).

Tests: test/tempo.test.ts (fixture bottega), test/manuale-basic-fantasy.test.ts (the Basic Fantasy numbers).


## 12. Experience points and levels (21 November, rules-engine package R3)

The audit found no XP anywhere (P4-38 … P4-42, P6-05, P6-14, P8-19, P8-20): a campaign could not grow past the level the
Preparer wrote. The class tables now carry the XP of each level (docs/regole.md §2 «Progressione»), and the Engine counts
the XP the party earns (prove/esperienza.ts), by the set's `esperienza`, never the model.

- **Defeated creatures.** Each enemy of a fight that is dead, fled or at zero, and — when the fight ends with the PCs
  standing — each one out of it by a condition with `fuori_combattimento` (asleep, charmed, turned: Basic Fantasy counts
  them as down, p. 57), is worth its sheet's `px`, or the set's `per_dadi_vita` row for its `dadi_vita` (a classed NPC:
  the larger of hit dice and level) plus `speciale` per asterisk (`speciali`), once.
- **Treasure** (only when the set has `esperienza.tesoro`): the coins a PC gains (a typed effect `monete`, the panel's
  coins control) are worth the set's rate; with `quando: al_sicuro` (Basic Fantasy p. 190, an optional rule) they wait
  until the Game Master presses «Tesoro al sicuro» in the panel, with `trovato` they count at once. Purchases and sales
  are not treasure.
- **The Game Master's award** from the panel (command `esperienza`, `cosa: assegna`, `px`, a PC or the party, a reason):
  a non-combat challenge, gems the catalog does not list, a correction (negative).
- **Shares.** The party's XP are divided equally among the session's PCs who are not dead («divided by the number of
  adventurers», p. 49; not by the phones connected, which come and go: an absent player's share is the Game Master's to
  correct with a negative award; retainers' half shares are not modelled), each share raised by the PC's XP traits (the humans'
  +10%) and held one short of the level after next when the set has `un_livello_per_avventura` (here: one session).
- **Where it shows.** The panel's combat box has a «Punti esperienza» part: each PC's XP and level, the XP of the next
  level and «sale di livello alla prossima sessione» when it is reached, the treasure waiting, the award form and the
  session's awards. The narrator hears nothing of it (XP are out of the story). The snapshot keeps it; the session log
  writes each PC's total in `pg_alla_fine[].px` and the session's awards in `esperienza`.
- **The level-up** (prove/livelli.ts) is the step between sessions: `tra_sessioni.py pacchetto` raises `livello` in the
  next package for a PC whose XP reach it, with `pf_da_tirare` (the levels gained). The Engine starts the PC at that
  level: the class tables give its attack bonus, thief values, saves and spells per day at once (derived again; a
  hand-written override stays), the new row's extra slots are there today, and at the session's first closed window the
  hit points of each level gained are rolled — the class die with the characteristic's bonus (at least the set's
  `minimo`; a race's `dado_vita_massimo`), or the fixed points after name level — by the player (manual rolls: the
  phone asks «Punti ferita del 2° livello», with its bonus) or the Engine (automatic). The maximum and the current hit
  points grow by it; the narrator hears it first in that turn. The snapshot keeps the level, the maximum and whether the
  roll is owed, so neither a resume nor the dry run of manual rolls asks it twice; «Ricomincia» starts the level-up again.
  The log writes `pg_alla_fine[].livello` and `pf_massimi` for the session after.
- **The Game Master's secret rolls** (M9; Basic Fantasy p. 8–9: the GM rolls Listen, Remove Traps, Move Silently and
  Hide, the thief «always believes they are being successful»). An ability marked `segreta` (docs/regole.md §2) is
  rolled with the Engine's dice even with manual rolls (no request at the table, the dry run asks nothing), its card is
  `nascosta` (the panel shows it «solo al master»; the projector, the phones and the stall counter never see it), and
  the fact tells the narrator it is secret and, on a failure, how the character perceives it: `niente` («nothing to
  notice: tell it as if there were nothing, without saying the roll failed») or `riuscita` («believes it went well; whoever
  should not have noticed did»). The outcome gates (`richiede.prova`) stay true to the dice. This is so whatever
  `tiri_master` says: those rolls are the manual's secret, not the world's.
- **Situational points** on a threshold: a scene check's `aggiustamento` (points of the threshold; on a d20 check, of the
  roll) and a difficulty rung's `percentuale` for d100 thresholds (Basic Fantasy's set: facile +20, difficile −20, ardua
  −40), said in the fact; a **failure band** (`soglia.grave`): a failed roll above `oltre_volte` × the threshold, or the
  die's top face, adds «Fallimento grave: …» to the fact (pick pockets noticed).
- **An NPC's save** against a PC's power is a Game Master roll by `tiri_master` too (R1 kept it always hidden): hidden by
  default, a normal card at the table with `visibili`, and with `a_volte` when its odds are between one in three and two
  in three.
- **Turn Undead** (prove/scacciare.ts; Basic Fantasy p. 57–58, audit X-TU-01, P5-47, P5-48): a power with a `tabella`,
  rolled against the author's class rows (`classi[].tabelle.<power>`). A class without rows cannot use it. The targets
  are the reachable enemies of its `solo_tipi` not already under its condition; each one's column is the one its sheet's
  `tipo` names, else its hit dice's. The author rolls the table's die once for the group (the action's own roll: the
  phone asks it), checked from the weakest up and stopping at the first that resists; on a success the author rolls the
  hit dice affected (`colpiti`, a follow-up request), spent weakest first, at least one creature. A `D` cell's damage
  (`distrugge`, 1d8 × level) is rolled once (a third request with manual rolls) and dealt to each D target: one at 0
  crumbles to dust; every affected one still standing gets the power's effects (Basic Fantasy: `scacciato` for 2d4 turns,
  out of the fight, the duration a Game Master roll). Any target that resisted locks the power for `dopo_fallimento` (a
  turn: an immunity of the author to `uso:<power>`, ticking on the game clock). The power is `ostile`: it opens a fight,
  and the turned, out of it, count as defeated for XP when it ends.
- **Not yet**: the SRD 5.2 has no XP data (its XP by challenge rating are not in the code's set); retainers.

Tests: test/esperienza.test.ts (fixture cripta), test/progressione.test.ts and strumenti/test_valida_progressione.py (the
tables and the level maths, the same cases for both), test/manuale-basic-fantasy.test.ts (the Basic Fantasy numbers).

## 13. Every roll's number by the manual (22 November, rules-engine package R5)

Riccardo (20 November): «il punteggio dei vari tiri?». Each kind of roll of Basic Fantasy, the formula the Engine uses
with torre-mozza's set, and where the number comes from. Each line has a worked example in
apps/server/test/manuale-basic-fantasy.test.ts («every roll kind…»), and strumenti/regole/test_tiri_bf.py reads the
tables and sentences from the PDF (when it is present) and compares them with the set.

| roll | formula (who rolls) | data | manual |
|---|---|---|---|
| ability roll | d20 + the ability's bonus + the Game Master's adjustment (the rung) ≥ the target of the level: 17 at NM/1st, 16 at 2nd–3rd … 7 at 20th (the player) | `modificatore.tabella`; `difficolta` (the adjustments: facile −4, difficile +2, ardua +4); `difficolta_per_livello` | pp. 4, 189 |
| saving throw | d20 + race bonus (+ CON vs poison, WIS vs charm, INT vs illusions) ≥ the class table's number at the level; natural 20 succeeds, 1 fails (the player; an NPC's by the Engine, hidden) | `tiri_salvezza`, `classi[].tiri_salvezza`, race traits, `abilita ts_*` | pp. 5–6, 60–61 |
| attack | d20 + the class's attack bonus + STR (melee, thrown) or DEX (missile) + race (halfling +1 missiles) + situation (behind +2, charge +2, range +1/0/−2, blind −4, cover…) ≥ AC; natural 20 hits, 1 misses (the player; NPCs by the Engine) | `classi[].attacco`, `progressione.attacco`, `catalogo`, `modificatori`, `combattimento.condizioni` | pp. 6, 53–55, 59 |
| damage | the weapon's dice + STR (melee, thrown, sling), at least 1; sneak attack ×2 once per target | `catalogo.armi`, `attacchi.danno_minimo`, `alle_spalle` | pp. 9, 55 |
| thief ability | d100 ≤ the class table's percentage at the level (± the Game Master's points); listen, move silently, hide, traps: the Game Master's secret roll | `classi.ladro.abilita`, `segreta`, `difficolta[].percentuale` | pp. 8–9 |
| listening at a door (not a thief) | 1 on 1d6, the Game Master's secret roll | `ascoltare.soglia.senza` | p. 43 |
| stuck door | 1d6 ≤ 1 + STR bonus | `forzare.soglia.piu` | p. 43 |
| secret door, trap search | 1d6 ≤ 1, +1 with INT 15+, +1 for an elf | `cercare.soglia.piu`, the elf's trait | pp. 5, 43–44 |
| dwarf's stonework | 1d6 ≤ 2 after a search | the dwarf's `almeno: {pietra: 2}` | p. 5 |
| initiative | 1d6 + DEX bonus (+1 halfling), every round, ties simultaneous (the player; NPCs by the Engine) | `combattimento.iniziativa`, race trait | pp. 6, 51 |
| surprise | 1d6 per side, surprised on 1–2 (an elf on 1; ambushers up to 4; blinded 1–4) (the Engine) | `combattimento.sorpresa`, traits, stat blocks | pp. 5, 50, 59 |
| morale | 2d6 ≤ the creature's morale at the first opposition and at half strength; 12 never breaks (the Game Master, hidden) | `combattimento.fine.morale`, bestiary `morale` | p. 57 |
| reaction | 2d6 + the lead PC's CHA bonus + the Game Master's adjustment: ≤2 immediate attack, 3–7 unfavourable, 8–11 favourable, 12+ very favourable (the Game Master, from the panel) | `reazioni.reazione` | p. 50 |
| hiring a retainer | 2d6 + the PC's CHA bonus ± pay: ≤2 refusal −1 later, 3–5 refusal, 6–8 try again, 9–11 acceptance, 12+ acceptance +1 loyalty (the Game Master, from the panel) | `reazioni.assunzione` | p. 46 |
| Turn Undead | 1d20 ≥ the cleric's table; 2d6 hit dice turned, D destroys (1d8 × level) (the player) | `classi.chierico.tabelle`, `poteri.scacciare_non_morti` | pp. 57–58 |
| death (optional) | d20 + bonus ≥ the save vs Death Ray, then 2d10 rounds to bind the wounds (the player) | `combattimento.danni.tiri_morte` | p. 188 |
| hit points at creation and per level | the class die (d6 at most for elves and halflings) + CON, at least 1; fixed points after the 9th (the player) | `classi[].dadi_vita`, `progressione.punti_ferita`, `creazione.punti_ferita` | pp. 3–8 |
| ability scores at creation | 3d6 in order, each score (the player) | `creazione.caratteristiche` | p. 3 |
| starting money | 3d6 × 10 gp (the player) | `creazione.monete` | p. 3 |

## 14. Exploration on the clock (22 November, rules-engine package R6)

The audit's P8-01 to P8-03: the manual's wandering monsters had no place, though the clock of §11 counts the turns they
need. Now the set says which environments the party explores and how often the Game Master checks there
(docs/regole.md §2, «Esplorazione»), and the encounter tables those checks roll on; prove/esplorazione.ts runs them.

- **Where.** A scene sheet's `esplorazione: {ambiente, livello | tabella}` says the party explores there; a scene without
  it explores nothing (no checks: a village, a talk). The count starts when the party arrives and restarts in another
  environment.
- **The check.** Every `controllo.ogni` of game time (Basic Fantasy: 3 turns underground, about 4 hours in the
  wilderness), a Game Master roll on the set's die (1 on 1d6). Its card is the Game Master's: hidden by default, shown as
  `regole.tiri_master` says (`a_volte` by the check's odds), listed on the panel with the turn. A check that falls due
  during a fight waits for its end and is rolled at the first advance after it; an advance that spans several checks (a
  night's rest, the panel's hours) rolls them in order and stops at the first encounter, saying when it happened.
- **The encounter.** On a hit, the scene's table (`incontri`, by the scene's dungeon level or named by the scene): its
  dice, the entry's nested roll when it has one (a roc's size), how many (`numero`), and, where the environment says so,
  the creatures' surprise in advance (p. 181: surprised, the party may avoid them; not surprised, they ambush and surprise
  on 1–4). Every die is a Game Master card. A group without a stat block (NPC adventurers, the city's watch) is named for
  the Game Master to build.
- **What the table hears.** A fact for the narrator in the turn («Mostri erranti (tiro del master): arrivano 3 creature,
  goblin.»), owed like a light going out (prove/fatti-dovuti.ts, type `incontro`): if the narration does not tell it, the
  Engine says «Arriva qualcuno: Goblin.».
- **The panel** («Tempo di gioco» box): the environment and table of the scene, when the next check falls («prossimo
  controllo tra 2 turni, ogni 3 turni, 1 su 1d6»), or that one is due and waits for the fight's end, and the session's
  last encounter with its time.
- **Data.** torre-mozza carries pp. 180–182: the dungeon (every 3 turns), the wilderness (every 4 hours, surprise in
  advance, an ambush on 1–4) and the 17 tables (six dungeon levels, nine terrains, the city's day and night), each
  creature an entry of its bestiary with the block's «No. Appearing» (underground the first formula, outdoors the «Wild»
  one), checked against the PDF by strumenti/regole/test_incontri_bf.py. The city has no frequency in the manual: no
  automatic check.

Tests: test/esplorazione.test.ts (fixture cunicolo), strumenti/test_valida_esplorazione.py, strumenti/regole/test_incontri_bf.py.

