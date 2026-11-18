# Notes on the Preparatore skill: blind test A12 (campaign `mulino-notte`)

Blind test of `.claude/skills/preparatore/SKILL.md` (version stamp «9 November 2026», file dated 18 November).
A new agent wrote this campaign following only the skill, the files it names (riferimenti/, schema, modelli/,
lingue/it/), the repo CLAUDE.md and the validator's own messages. Not opened: the campaigns in `campagne/`
(prova-f0, ponte-lanterne, nozze-neve, torre-mozza) and the Engine's source. Brief (one line, Italian):
«Una sola serata (one-shot) per 3-4 giocatori, low fantasy: un mulino sul fiume dove di notte la ruota gira da
sola, e in paese spariscono le galline; tono da fiaba inquieta, niente horror esplicito. lingua: it».

Scope agreed with the lead: steps 1–12 (strict validator), no `scripts/prepara.sh` (disk nearly full, image model
needs 8 GB), no servers. Skipped and why: the blind script subagent of step 12 (it writes outside `campagne/<id>/`,
which the lead forbids committing), the independent review of step 14, the ear test of 11b (paid external call),
step 16. The lead asked for one commit for the campaign and one for these notes, which overrides the skill's
commit cadence (after steps 5, 8, 11, 12, 15, 16).

Severity: **high** = a new author following the skill literally produces a wrong or failing campaign, or cannot
continue without guessing; **medium** = the skill is unclear or contradicts another file, and the author must
guess or dig; **low** = wording, stale pointers, readability.

Each finding: where in the skill, what happened, suggested fix.

## Findings from the reading (step 0, before writing)

### N1 (medium) Step 0 sends the author to example campaigns
- **Where**: SKILL step 0 («Then look at the examples»: `campagne/prova-f0/`, `campagne/ponte-lanterne/` and its
  NOTE_SULLA_SKILL.md); also riferimenti/mestiere.md §8–§9 (torre-mozza, nozze-neve, ponte-lanterne),
  riferimenti/motore.md (nozze-neve), riferimenti/immagini.md rule 4 (ponte-lanterne), docs/prove.md §9 (torre-mozza
  `d_zirra_porta` as the only example of a world question).
- **What happened**: in a blind test these are off limits, so the only worked example left is the
  `strumenti/test_valida_fixtures/mini/` fixture: one scene, no `domande`, no `gregari`, no stall lines, no
  `attori`/`menzionati`, no `conseguenze`, no multi-scene clock. Every one of those had to be written from the
  schema prose alone.
- **Fix**: make the skill sufficient without real campaigns: add a second fixture (`mini-tre-scene`) that passes
  `--rigoroso` and shows a session clock with `serata`, two scenes on the same place, a world question, a minion line,
  stall lines of the three levels, `attori`/`menzionati`/`stati`, an outcome with `richiede`, a consequence with
  `tracce`. Point step 0 at it instead of the campaigns.

### N2 (medium) Step 0's reading list is shorter than what the steps then require
- **Where**: SKILL step 0 vs «Sheets and checks» (docs/prove.md §2, §8, §9), step 3 (docs/mondo.md), and the
  references, which send the reader to `lingue/<lingua>/preparatore/riferimenti.md` (schema.md «Campaign language»,
  mestiere.md §0, repertorio.md §3).
- **What happened**: the checkpoint of step 0 is passable, but stall lines, `conseguenze`, `domande`, gates of
  `avanza_quando` and world questions are specified only in docs/mondo.md and docs/prove.md §9, which step 0 does
  not list. There are also two example files per language (`skill.md` and `riferimenti.md`) with overlapping content;
  SKILL.md points only to the first, its references only to the second.
- **Fix**: add docs/mondo.md §2–§5 and docs/prove.md §2, §9 to the step 0 list; merge the two example files or say
  in step 0 that both exist and which is for what.

### N3 (medium) «The singular formal pronoun is not used» says the opposite in Italian
- **Where**: riferimenti/mestiere.md §2 («The singular formal pronoun is not used where the language has one: it
  sounds like a plural when spoken») vs the Italian examples (`lingue/it/preparatore/riferimenti.md`, mestiere §2:
  «Il «voi» singolare non va usato») and the same mestiere §2 bullet that recommends «tu e un lei freddo; lei a
  tutti».
- **What happened**: read in English, «the singular formal pronoun» of Italian is *lei*, which the next bullet
  recommends. The Italian file means the archaic singular *voi*. The manual's full NPC example (Ilaria, §3) and the
  mini fixture (Bruno) both «danno del voi» to strangers, so the reference examples break the rule.
- **Fix**: in mestiere.md §2 write «the archaic singular formal pronoun that is a plural form (Italian *voi*)»; fix the
  manual's Ilaria example and the fixture's Bruno to *lei* or *tu*.

### N4 (medium) «The mechanism of the climax, one line per state»: no field
- **Where**: SKILL step 3, last bullet («The mechanism of the climax is written in one line per state») and step 13
  («every text says the same thing as the line of step 3»).
- **What happened**: neither SKILL.md nor schema.md names the YAML field where those lines go; the Italian example
  gives only the sentence shape. I put them in `brief.yaml → decisioni.altre`, the only free field I could find.
- **Fix**: name a field (for example `preparazione.meccanismo: ["chiusa aperta: …", "chiusa chiusa: …"]`) and let
  the validator at least check that it exists for a campaign with a climax.

### N5 (high) Step 9 omits stall lines, the defeat ending and the §6b tags
- **Where**: SKILL step 9 and the coverage table of riferimenti/repertorio.md §8.
- **What happened**: step 9 lists waiting lines and deviations «(always)», but says nothing about the stall lines
  (`stallo: 1|2|3`, one per level per scene, warning `REPERTORIO.stallo_scarso`), the defeat ending (`sconfitta`,
  warning `REPERTORIO.sconfitta_mancante`) or the tags `attori` / `menzionati` / `richiede.stati` / `richiede.esito`
  (warning `REPERTORIO.png_non_segnato`). They are in repertorio.md §2 and §6b only, and the §8 checklist that step 9
  says to tick omits all of them, plus the waiting lines. A reader who ticks §8 ships without them, and since they
  are warnings they survive `--rigoroso`. The tags are what CLAUDE.md's «the small model relays, it never decides»
  rests on.
- **Fix**: add to step 9 a bullet «Stall lines, defeat ending, tags (always)» with the three codes, and add the rows
  to the §8 table. Consider making `REPERTORIO.png_non_segnato` an error in strict mode.

### N6 (low) Step 7 has no validator check, though class PNG exists
- **Where**: SKILL step 7, «Check: the questions of the step».
- **What happened**: `--classi` lists `PNG` (the §3 sheet and the cross-checks), but no step runs it; its errors
  arrive only in step 8's full run.
- **Fix**: «Check: `--solo PNG,SCENA,PG` with no errors, and the questions of the step».

### N7 (low) Validator classes that no step runs
- **Where**: the step table of SKILL.md.
- **What happened**: `SCELTA`, `VINCOLI`, `DOMANDE`, `AUDIO`, `VOCE`, `LIVELLO` appear in no `--solo` list. `SCELTA`
  is mentioned in step 1's text, but it compares prices with NPC desires, which exist only at step 7.
- **Fix**: add `SCELTA` to step 7's check, `VINCOLI,DOMANDE` to step 5's, `VOCE` to step 9's, `LIVELLO` to step 1's.

### N8 (low) Rule 9: «at most four PNGs with voice per scene»
- **Where**: SKILL rule 9.
- **What happened**: four voices are registered, but nadine and tabitha are `simile_a`, so a scene holds at most
  three voiced NPCs, and at most one of the two women's voices. With a cast of two women this decides the whole
  scene plan, and the skill states it only implicitly.
- **Fix**: «at most three: nadine and tabitha never share a scene, so a scene has at most one of the two female
  voices».

### N9 (low) The fixture shows `verificata:` written by hand
- **Where**: `strumenti/test_valida_fixtures/mini/pronunce.yaml`, which step 0 offers as the example.
- **What happened**: every entry has `verificata: {voce: prova, punteggio: 1.0}`, while schema.md says the ear test
  writes it. A literal reader copies it and silences `PRONUNCIA.non_verificata` without any test.
- **Fix**: a comment in the fixture («written by the ear test: never by hand»), or drop it from the fixture.

### N10 (low) The placeholder «the examples in lingue/<lingua>/preparatore/skill.md» breaks the sentences
- **Where**: SKILL.md, about 15 places (the brief's id, steps 1, 2, 3, 6, 7, 9, 10, 13, rule 1, rule 6).
- **What happened**: the phrase reads like the leftover of a search-and-replace («for example, see «the examples
  in …»;», «the format in «the examples in …»»). The Italian file is short and well organised by step, so the content is
  findable, but the reader must jump at each one.
- **Fix**: one sentence at the top («Every example of style lives in lingue/<lingua>/preparatore/skill.md, by
  step») and plain «(example in the language file)» in the body.

### N11 (low) The version stamp is stale
- **Where**: SKILL.md line 8 («Version of 9 November 2026»).
- **What happened**: the text cites features of 15–17 November (world questions, `tiri_master`, stall lines via the
  references). A reader cannot tell which date the rules are from.
- **Fix**: update the stamp with each edit, or drop it and rely on git.

## Findings while writing (step by step)

### W1 (medium) Step 3's check cannot reach zero errors when step 3 writes a scene gate
- **Where**: SKILL step 3, «The world that moves» (asks for gates such as `{quando: lascia_scena, scena: …}`), and
  the promise under «Order of work»: «every check can be satisfied with the files written up to that step».
- **What happened**: `--solo STILE,CANONE,FRONTI,SESSIONE,MONDO` gave `ERRORE [FRONTI.avanza_quando]
  o_mezzanotte.avanza_quando[1]: scena inesistente 'scena_aia'`, because scenes are written at step 5. The same
  holds for `sessione.scene_potenziali` (three warnings) and would hold for any `orologi_in_scena` or `parte_dopo`.
- **Fix**: either move the gates with `scena` to step 5 in the skill's text («write the gates that name a scene
  with the scene sheets»), or have the validator report a missing scene id as a warning when no scene sheet exists
  yet (`--solo` at step 3).

### W2 (low) `campagna.yaml` gets `rivelazioni`, `colli_di_bottiglia` and `nodi` at step 4, but step 3 has no rule for them
- **Where**: SKILL step 3 vs schema.md «campagna.yaml» (top-level keys).
- **What happened**: I wrote empty lists (`rivelazioni: []`, `nodi: []`) at step 3 so the file had every top-level
  key; the step 3 check accepted them silently. Nothing says whether the keys must already exist.
- **Fix**: one line in step 3: «leave `rivelazioni`, `colli_di_bottiglia` and `nodi` for step 4».

### W3 (low) `VINCOLI.contraddetto` matches words, not meaning
- **Where**: validator class `VINCOLI` (no step of the skill runs it; see N7).
- **What happened**: the soft move «Una lanterna passa di mano in mano fino al primo del muretto» was reported as
  saying the opposite of the public constraint «Il paese non passa il muretto finché nessuno lo spinge»: the two
  share «passa» and «muretto». I reworded the constraint («resta dietro il muretto») instead of the prose.
- **Fix**: none needed in the skill beyond running `VINCOLI` at step 5; a note in schema.md that the check is lexical
  (a negation plus shared words) would save the author a doubt.

### W4 (low) Step 5's check passes, but class `SCENA` has 12 errors the skill does not mention
- **Where**: SKILL step 5 («The `SCENA` errors that cite NPCs and PCs are closed at steps 6 and 7»).
- **What happened**: correct as stated, but three of them are `SCENA.posta` («la posta riguarda almeno un PG o un
  PNG»), whose text does not say that the NPCs merely lack a sheet yet. A literal reader might rewrite the stakes.
- **Fix**: make `SCENA.posta` say «cita png_x, che non ha ancora una scheda», like `SCENA.png_presenti`.

### W5 (high) `SCELTA.premio` punishes the most natural price: losing exactly what one wants
- **Where**: SKILL step 1 («the price weighs on someone who does not want it … The validator compares the prices with
  the desires of the NPCs (`SCELTA.premio`)»).
- **What happened**: at step 7, with the NPC desires written, `--rigoroso` gave three errors. Every price was the
  *negation* of its bearer's desire: Viola wants «andare a servizio in città con la lettera», the price was «la lettera
  per la città non vale più niente»; Ermete wants «tenere il mulino», the price was «Ermete perde il mulino»; Adalgisa
  wants «riavere le galline prima della fiera», the price was «non le rivede più». The check compares five-letter
  roots (`['città', 'lette']`, `['mulin', 'paese']`, `['fiera', 'galli', 'inver']`) and cannot see «non», «perde», «non
  vale». I fixed it by rewording the prices with other words (serva, mugnaio, pollastre, mercato), which says the
  same thing and passes. That is gaming a lexical check, not improving the design.
- **What it missed**: the one real problem. Road 2's price (Ermete has to leave Ronchetto) is exactly what the villain
  Folco desires. In normal mode that was a warning (`somiglia al desiderio di png_folco`); after rewording it vanished
  too. I keep the road and say so in `autovalutazione.md`: a villain who wins is a price for the PCs, not a reward,
  but the skill's rule («if an NPC or a PC desires it, it is a reward in disguise») reads as forbidding it.
- **Fix**: (a) in the skill, say whether the villain's desire counts; (b) in the validator, skip the bearer
  comparison when the price contains a negation or a loss verb from `lingue/<code>/prosa.yaml` (perde, non, più,
  nessuno), or downgrade it to a warning that asks for a justification line in `decisioni.strade[].nota`.

### W6 (low) Step 7's checks are passable, but the voice test is weak when two NPCs share «tu»
- **Where**: SKILL step 7 check, riferimenti/mestiere.md §2 («three different registers among the NPCs of a scene»).
- **What happened**: with four NPCs and the ban on singular *voi* (N3), only two registers remain (tu, lei). In the
  climax Ermete and Adalgisa both say «tu»; they differ by lexicon (mill vs yard), sentence length (3–7 vs 4–9) and tic.
  The validator has no check for it; the skill's test («recognise who speaks without names») is the only guard.
- **Fix**: in mestiere.md §2, say that with two registers the third difference must come from lexicon and length,
  and give the Italian forms that remain (tu + mestiere, tu + «figlioli», lei freddo, lei rispettoso).

### W7 (medium) `richiede.orologio` needs both bounds in a line, but not in an outcome, and the docs show one
- **Where**: riferimenti/repertorio.md §4 table («`orologio: {id, min, max}`»), schema.md «esiti» (lists `orologio`
  among the gates without a shape), docs/repertorio.md «Scene outcomes with gates» (example
  `orologio: {id: o_mezzanotte, min: 8}`).
- **What happened**: twelve lines with a one-sided gate (`{id, min: 5}`, `{id, max: 3}`) failed with
  `REPERTORIO.richiede … estremi dell'orologio fuori misura`. The message does not say that a bound is missing; I
  guessed it from the mini fixture. The same one-sided form on scene `esiti` passes (`SCENA` had no error), and it is
  the form docs/repertorio.md uses as its example.
- **Fix**: either accept one bound in lines (min defaults to 0, max to `segmenti`), or say «servono min e max» in the
  message and in repertorio.md §4, and make the `esiti` check consistent with it.

### W8 (medium) One line per clock segment, even with exclusive gates
- **Where**: SKILL rule 5 («one per segment») and repertorio.md §6 «Clock ticks».
- **What happened**: segment 7 needed two texts (the wheel turns; the wheel strains against the brake the PCs put
  back), so I wrote two lines with exclusive gates (`battute_non_usate` / `battute_usate` of the brake line).
  `COPERTURA.segno` refused it: «2 battute (serve 1)». I moved the brake ending to segment 6, so that the scene closes
  before segment 7 when the brake is in; it works, but the story bent to the checker.
- **Fix**: allow several tick lines for one segment when their gates exclude each other (the validator can check
  the exclusion the same way it checks alternative confessions), or document the pattern «end the scene before the
  sign that would contradict».

### W9 (low) A one-word question counts as a sentence in D3
- **Where**: repertorio.md §9 («at most 2 sentences per line»).
- **What happened**: «Io? Io la fermo, la ruota. Tutte le sere.» was counted as three sentences
  (`PROSA.frasi_battuta`), four times. For the ear «Io?» is a beat, not a sentence; the rule is fine, but the
  examples in the language file use exactly this shape («Io? Ho settant'anni e una pipa.» in the mini fixture has two).
- **Fix**: a line in lingue/it/preparatore/skill.md: «una domanda di una parola conta come frase».

### W10 (medium) Reading the catalogue found two leaks the validator cannot see
- **Where**: SKILL step 10 («you search for what a regex does not catch»), rule 1.
- **What happened**: with `SEGRETI` at zero, reading `contesto_modo_b.ts --catalogo` line by line still found:
  (a) two `quando` that told the selector the hidden mechanism as a future event: «un PG infila il fermo tra i raggi
  prima che arrivi l'acqua» and «un PG arriva alla chiusa di monte dopo che le tavole si sono alzate» (the water
  comes from upstream; someone raises the boards). No forbidden word, no secret regex, but a truth.
  (b) Adalgisa's waiting line («Granaglie per nessuno…», a yard image) had no `scena`, so it was also listed in the
  midnight scene, where she holds a lantern. `COPERTURA.attesa_png` was satisfied by it in both scenes.
- **Fix**: add to repertorio.md §3 a third example of a bad `quando`: «a `quando` that announces a world event the PCs
  do not know yet (the water will come) tells the mechanism»; and to step 9's waiting-line bullet: «a waiting line whose
  text belongs to one place gets that `scena`; one per scene where the NPC is».

### W11 (medium) An NPC seen at a place without a scene sheet cannot be tagged as acting
- **Where**: repertorio.md §6b (`attori` / `menzionati`) and schema.md «nodi» (places without a sheet).
- **What happened**: the weir upstream (`n_chiusa`) has no sheet; the PCs reach it from the mill scene, so its lines
  play while `scena_mulino` is current. In `nar_chiusa_appostati` the PCs watch an unnamed «cappotto scuro» open
  the lock: that is Folco acting, so §6b says `attori: [png_folco]`; but `attori` is offered only while that NPC is in the
  current scene, and Folco is not in `scena_mulino`, so the line would never come out. I tagged him `menzionati`, which
  §6b reserves for NPCs «only talked about».
- **Fix**: say in §6b how to tag an NPC that acts at an off-sheet place (perhaps `attori_altrove`, checked against the
  NPC being in play and not in another scene), or say that such a place needs its own scene sheet.

### W12 (low) The audio deduction contradicted two scenes, and the meaning of the six music tags is nowhere in the skill
- **Where**: SKILL step 11 (audio dry run), mestiere.md §10.
- **What happened**: the deduction gave the «mulino» ambience to a still wheel over a dry millrace and to the weir, and
  `musica.tag: rito_sacro` on the climax (I meant the village's prayer) chose a track tagged «Bright, Calming,
  Uplifting». The dry run made both visible, and the `audio` fields fixed them, as the skill says. But a new author picks
  the six tags blind: the skill lists them, never says what each sounds like.
- **Fix**: one line per tag in schema.md «Audio» (for example `rito_sacro`: solemn and calm; not for tension).

### W13 (low) Step 12's blind scripts live outside the campaign, so the catalogue measure was skipped
- **Where**: SKILL step 12 and «Commit» («add only `campagne/<id>` (and `esperimenti/copioni/<id>` …)»).
- **What happened**: the lead allowed commits of `campagne/<id>/` only, so the scripts were not written, and
  `--copioni` (average catalogue per action under 4) was not measured. The `temi` were chosen by hand only.
- **Fix**: none for the skill as such; but a generic script set that works on any campaign (actions built from
  the scene's elements and NPC names) would let the measure run even without the blind subagent.

### W14 (low) The valid ids for sheets are not listed anywhere the skill points to
- **Where**: SKILL «Sheets and checks» («Sheets are not written from memory: the validator redoes them»).
- **What happened**: skill ids (`indagare`, `rapidita_di_mano`, `intrattenere`, `acrobazia`…), armour names (`giaco di
  maglia`, `cotta di maglia`, `armatura di cuoio`) and class names were guessed from the fixture and docs/prove.md §2.
  They all passed at the first try, but nothing told me where the list lives (`strumenti/valida/srd.py`, which a blind
  author is not sent to).
- **Fix**: a table of the eighteen skill ids and the SRD armour names in schema.md «Sheets and checks».

### W15 (low) World questions (`domande`) have no place in the order of work
- **Where**: SKILL «Sheets and checks» (long paragraph on `domande`) vs the step table.
- **What happened**: the skill describes world questions in detail but no step says when to write them or which check
  covers them (`DOMANDE` is in no `--solo` list). I wrote none: every uncertain fact I found was already a PC's own
  check, which the skill says not to duplicate.
- **Fix**: mention them in step 5 («0–2 per scene, check `--solo DOMANDE`»).

## Summary

- **Result**: `python3 -I strumenti/valida_campagna.py campagne/mulino-notte --rigoroso --avvisi` with node: **0 errors,
  2 warnings**, both justified in `autovalutazione.md` (an intended roll-free route to the granary with the stolen keys;
  the ear test not run). 3 scenes, 4 NPCs, 5 PCs, 115 lines, 26 facts, 16 clues.
- **Was the skill enough?** Mostly yes: following it literally, with the references and the validator's messages,
  produced a campaign that passes strict mode without opening any existing campaign or the Engine's code. The gaps are
  in what a literal reader cannot know (no worked multi-scene example, steps that omit what the references require)
  and in checks that are lexical where the rule is semantic (`SCELTA.premio`, `VINCOLI`).
- **Findings**: 26 in all. **High 2** (N5, W5), **medium 9** (N1, N2, N3, N4, W1, W7, W8, W10, W11), **low 15**
  (N6–N11, W2, W3, W4, W6, W9, W12, W13, W14, W15).
- **The five most useful fixes**:
  1. Step 9 and the §8 coverage table: add stall lines, the defeat ending and the `attori`/`menzionati`/`stati` tags
     (N5); consider `REPERTORIO.png_non_segnato` as an error in strict mode.
  2. `SCELTA.premio`: understand a loss or negation in the price, and say whether a villain's win counts (W5).
  3. Replace the pointers to real campaigns with a multi-scene fixture, and add docs/mondo.md and docs/prove.md §2, §9 to
     step 0 (N1, N2).
  4. Clock gates: accept one-sided bounds in `richiede.orologio` or say «min e max» in the message (W7), and allow
     exclusive tick variants for one segment (W8).
  5. Fix the references that mislead the author: «singular formal pronoun» means Italian *voi*, not *lei* (N3); name a
     field for the climax mechanism (N4); add the «a `quando` that announces a hidden world event» example (W10).
