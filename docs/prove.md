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
   who stays standing. The Engine rolls it right after that action.

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
     magic missile, and the narrator killed the goblin with no damage.
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
        not enough); if the `quando` names an NPC, the action names it; two checks tied → nothing;
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
     - The DC is set by the Engine, as always. No advantage and no «impossibile» (impossible), but the die is rolled
       anyway and play is never stuck.
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
   - Right after, the NPC's reaction, if any, rolls.
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
     (`EsitoAzioneProve.fallite`, `provaFallita`).
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
- **Real combat**:
  - initiative and turn order;
  - unprovoked NPC attacks (an `[attacco]` line, to be agreed with the «voce» parser);
  - death saving throws and PCs at 0 HP (today «a terra, privo di sensi» (down, unconscious), does not act until healed);
  - conditions (prone, grappled…);
  - multiple attacks, spells and saving throws imposed by NPCs;
  - melee/range distance kept by the Engine.
- **Game Master panel**: PC and NPC HP with healing, damage and rest by hand, and the latest cards. Today NPC HP are only in
  the logs and the archive.
- **Attitudes**: the Engine uses the ones from the sheet. When an NPC changes its mind in the story, the advantage does not
  follow yet (needs `set_attitude`, architettura.md).

Credits: this work includes material from the System Reference Document 5.2 («SRD 5.2») by Wizards of the Coast LLC,
https://www.dndbeyond.com/srd, licensed under the Creative Commons Attribution 4.0 International License.
