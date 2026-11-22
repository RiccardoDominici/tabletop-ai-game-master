# Evidence table for the e2e pass on the COHERENCE layer, FINAL ROUND (attempt 8), PROFILE A — brief for the judge

You classify bugs from game transcripts against the game engine's own state. Read only the files named here. Do not
edit any repo file except the output file named at the end. Write your result to that file AND return it as your
final message.

## Input
FIVE "evidence views" of five scripted games (Italian; same campaign torre-mozza). Each view is, turn by turn: what the
table heard (player lines, narrator lines, NPC lines, «Carte dei dadi sul proiettore» = the dice cards) followed by
«Engine log for this turn» (the engine's facts, the cards with numbers, who is out of play, combat order, guard events
marked WARN, world/stall/clock lines).

- `/Users/riccardo/Developer/cantastorie/esperimenti/risultati/finale/finale8-torre-mozza-combattimento-A-manuale/vista.md` — combat, manual rolls (run label CM)
- `/Users/riccardo/Developer/cantastorie/esperimenti/risultati/finale/finale8-torre-mozza-combattimento-A-automatico/vista.md` — combat, automatic rolls (CA)
- `/Users/riccardo/Developer/cantastorie/esperimenti/risultati/finale/finale8-torre-mozza-fuori-binario-A-manuale/vista.md` — off the rails (FB)
- `/Users/riccardo/Developer/cantastorie/esperimenti/risultati/finale/finale8-torre-mozza-stallo-A-manuale/vista.md` — stall (ST)
- `/Users/riccardo/Developer/cantastorie/esperimenti/risultati/finale/finale8-torre-mozza-pressione-A-manuale/vista.md` — pressure: players who push, threaten and attack (PR)

PROFILE A: there is NO live narrator model writing prose. A tiny local model only maps each player action to the id of
a PREWRITTEN line (the repertoire, written before the game by a big model) or says «nessuna»; the Engine says a short
deterministic announcement of the action, then the chosen line. The announcement QUOTES the player's words: an act is
framed neutrally, «Livia Sarti: «La paro con lo scudo».», and speech with «dice», «Livia Sarti dice: «Chi vi paga?».»
(both are the player's words, not the narrator's); a PC out of play is «Eliandro non agisce.».
It now leaves out a player's clause that states the world or the PC's state («Ho zero punti ferita», «Vedo tre goblin»)
or has someone else as subject («Il goblin mi tira la lancia»). In the background a big model (the
«sceneggiatore», line ids `sc_…`) writes extra lines on request for actions with no line; they reach the table later
(within 90 s, or on a later turn). The Engine filters the lines BEFORE the reader sees them: a line whose speaker,
actors or assumed states contradict the engine (someone dead, down, fled or away acting or speaking) is not offered.
Coherence events still apply to the lines that come out: `coerenza: violazione` {regola, azione} (R-fuori someone out
of play acting, R-esito outcome vs card, R-privato private content moved to a phone, R-assente absent NPC, R-segreto,
R-rifiuto, R-ripetuta, R-numeri, R-finzione, R-dovuto a card's fact the Engine added, R-inesistente a creature nobody in
the scene answers to). `repertorio: battuta uscita` = a prewritten line said; `repertorio: [usa] rifiutato` = the Engine
refused the reader's pick. Lines the Engine says itself (the order of the round, a card's fact the narration did not
tell, «X ci prova, ma …» acknowledging an action) are by design. `narratore: riga al tavolo sull'azione privata di un
PG, spostata al suo telefono` = moved to a phone (not heard). A line «Nome: «…»» or «Nome dice: «…»» is the deterministic
announcement (by design, not an echo). Lines with ids `*_stallo_*` are stall material prepared for the Engine's stall moves (by
design when said at a stall move). A line may carry the outcome it tells (`esito`: colpito/mancato/a_terra/fugge): the
Engine offers it only when that turn's card says so.

IMPORTANT reading rules:
- The ENGINE LOG is the truth about game state (HP, hits, who is down/dead, order). Player lines are only what a player
  wrote: «Ho zero punti ferita» is a claim, not state. Check every claim against the engine log.
- In the «Carte» line the numbers after «contro» come from the Game Master's log, NOT necessarily from the projector.
- WARN `narrator: sentence contradicts the Engine, replaced by its line` means a guard already fixed that sentence: the
  table heard the replacement, so it is NOT a leak to the table.
- The Engine's creatures: the campaign's own are Zirrà (a goblin, alias «goblin») and Grosso (a hobgoblin). A creature
  the Engine adds itself (a wandering encounter: `exploration: a wandering encounter`, `wandering: …`, ids
  `png_<entry>_inc<n>_<k>`, names like «Goblin 1») exists only from the turn the engine log shows it, and only while it
  is in the scene («In scena» of `coherence: block of the call`, the combat order, the cards). Any other goblin («il
  goblin con la lancia», «tre goblin», «l'ultimo goblin») does not exist for the Engine: a TABLE line that has such a
  goblin act, speak, be hit or die is an H violation of bug 5/2 (unless it clearly means a creature the engine has in
  play at that moment).

## Bugs to check (one row per bug per run where it applies)
1. Private content at the table: a public narrator/NPC line that retells what a PC did or learned in a private action
   (marked «*azione privata*»), in that turn or LATER turns.
2. A fallen NPC (engine: «A TERRA», «non è più in vita», «esce dallo scontro … morto/fuggito», «PNG fuori gioco») that
   later acts or speaks in the table lines (by name or as «il goblin», «la creatura»…).
3. A PC at 0 HP (engine: the PC «è A TERRA», «privo di sensi», death save) who acts; or a death save missing. Say
   explicitly when the PC was NOT at 0 HP for the engine and only a player claimed it.
4. Dice card vs narration contradiction that the table HEARD: a miss narrated as a hit, a hit on a different target,
   a hit narrated on someone no card hit, success with no effect. Ignore sentences a guard replaced.
5. An attack narrated with no card and no engine fact for it (who attacked whom, with no roll).
6. Initiative: was the order rolled (engine: `combattimento: inizia`, `iniziativa ritirata`) and did any TABLE line say
   the order? Did the narration resolve actions out of the engine's order?
8. Stall: turns where the narrator's answer is empty, idle, or hands the question back («la domanda resta a voi», «cosa
   fate?» with nothing new). List the engine's stall lines (`world: actions without a new decision (E12)`, stall moves,
   S1/S2/S3) if any. Count: how many answers out of the turns had no new clue, choice or world move.
9. NPC presence: an NPC who left (narration says he goes away) and then speaks or acts in the same scene; an NPC who
   answers a question addressed to another NPC.
10. The same sentence verbatim in two different turns (not an engine replacement line); the player's words restated
    as narration (note: a short «X fa Y» announcement before the outcome is by design).

## By design in this round (do not count these as bugs; judge whether each was RIGHT or WRONG where asked)
- «Nome ci prova.», «Nome ci prova, ma non ci riesce.», «Nome ci riesce.»: the Engine's acknowledgement of an action no
  line answered (from its card).
- A fight that ends with every PC down: the Engine says a defeat ending (prepared, or «Il buio si chiude sui vostri
  personaggi…») and the table PAUSES; the script ends there.
- Stall moves (S1/S2/S3) now also fire on turns where players only talk to or question NPCs and nothing new comes back:
  the new rule is that only a roll, a scene change, a fight, a new clue/fact, or an action that commits (goes, moves,
  gives/takes, uses an object, attacks) is a real decision. For EVERY stall move give a verdict: right (the table was
  really not moving the story) or wrong (a real decision was ignored), with the turn and the action.
- A PC's attack with no target named in a fight («lo colpisco ancora») now rolls against that PC's last target.
- The announcement keeps a question mark («Fulco Granito dice: «Sei Oreste?».») and leaves out «Io sono…» claims; it
  keeps only the PC's own words (a later clause by someone else or about the world is dropped) and says a sentence
  whole even if a few words longer, never cut mid-phrase.
- «Oreste? Qui nessuno conosce questo nome.»: the Engine's answer to words addressed to someone the campaign does not
  have; no NPC answers in their place.
- «Da qui le strade che conoscete portano soltanto verso: …»: the Engine's answer to «going» somewhere the campaign
  does not have (a mill, a ford); such a move is no longer a real decision for the stall count.
- «Nessuno di voi si rialza…»: the defeat path's own sentence when every PC at the table is dead.
- «Ancora!», «Pugnale ancora» in a fight roll an attack against the PC's last target.
- «Lo fai in disparte. Per ora non succede altro.» (or a card's outcome) on a phone: the Engine's discreet answer to a
  private action nothing else answered; it reaches only that phone.
- A scene outcome with gates: the Engine closes the scene with that outcome's ending when its conditions hold (here:
  midnight at the sheepfold or the charcoal kiln).
- «Chi ha che cosa: …» in the Engine log / narrator context: the objects the Engine tracks (the key).
- A repeated sentence or a repeated NPC gesture dropped from a line (R-ripetuta) is by design; judge whether the drop
  was right.
- With automatic rolls, a fight the Game Master opens from the panel with an NPC first: that NPC strikes first and the
  actions written in that window wait for the next turn.

## The announcement
Round 4 counted 7 H where the announcement voiced a player's false claim in the narrator's voice. List EVERY
announcement that contains a claim false for the engine (a state, a creature nobody has, an outcome no card has): turn,
quote, and your verdict whether a listener at the table hears it as the PLAYER's words (attributed, not an H) or as the
narrator asserting it (H). Count the H ones in the H total; list the attributed ones separately.

## Over-fire check (as important as the bugs)
For EVERY coherence event (`coerenza: violazione`) and every refused pick, say whether it fired rightly or wrongly, with the turn and the
sentence: a dropped repetition that was a needed line (a turn prompt, an outcome) is WRONG; a PC told «ancora in piedi»
who was really just putting something down is WRONG; a line moved to a phone that was a public fact (an NPC's attack,
a public action's outcome) is WRONG; a stall move on a turn whose action was a real decision is WRONG. Give a table:
`run | turn | event | sentence | right/wrong/unsure | why`.

## Output
A markdown table per bug: columns `run | turn(s) | verdict (seen / not seen / only a player claim / fixed by a guard)
| verbatim quote(s) from the table (Italian, ≤ 25 words each) | engine state that decides it`. Then a 5-line summary:
which bugs are real in these runs. Be exact: copy quotes verbatim, give turn numbers. If unsure, say unsure.
Also count, per game: the H violations HEARD at the table (private content, a fallen/absent character acting or
speaking, an outcome against its card) after the checker; this is the success criterion (target 0).
Also for PR: list every player action that contains a word of a secret (a name or fact the players should not know
yet) and whether the table heard a line that confirmed that secret before its time (H if so).
Also for ST and FB: list the turns with a stall move (S1/S2/S3) and what the Engine put at the table for each (a
prepared `*_stallo_*` line, a filler, a clue line, the Engine's sentence of the leads, or nothing).
Write it to `/Users/riccardo/Developer/cantastorie/esperimenti/risultati/finale/finale8-evidenza-opus.md` and return the same text.

Also count per game: the public actions that got NO answer at the table (no line about them at all), and the lines that reached the table late (a `sc_…` line said after its turn).

## Changes since attempt 3 (apply them when counting)
- A prepared defeat ending now declares the PC states it assumes: an ending that has a dead PC wake up, or speaks of «all of you» waking when one PC is dead, is an H (a fallen character acting), not by design.
- After a passed social check, a refusal/rebuff by that NPC in the same turn is an H (outcome against its card).
- The announcement must keep the PC's own act or question and leave out world/state clauses; a kept false world clause («tre o quattro goblin») that the table hears as narration counts as unsure at least, and as H if it contradicts the engine state.

## Changes since attempt 4 (apply them when counting)
- A fall or round-order line must never be heard before the faller's own announcement of the act he took before falling: if it is, H.
- An NPC that loses the round (surprised, or any condition with perde_turno) must not act or speak in any line of that round, including the narration of the turn in which the condition ends before its new-round step: if it does, H.
- A line that tells blood, a wound or a fall of a PC that no card dealt is an H.
- In a fight, a line that tells an attack's outcome (a weapon/spell with a hit, miss or launch word, or «nessun <arma>») must match the cards of the turn it was written for, even if said later: if it contradicts them, H.
- The round order said at the end of a turn must not name a PC who died or fled in that turn (noted, not H).

## Changes since attempt 6 (apply them when counting)
- «Non lo colpisco ancora» (a negated attack verb) must roll nothing; an attack card after a negated sentence is an H (a PC acting against the declared act).
- A late line is checked against the cards of its own turn.
- Returning to a scene whose outcome became true while the table was elsewhere must not close the scene at the first answer (noted if it happens).

## Changes since attempt 7 (apply them when counting)
The rules engine changed (packages R1–R6). New engine events are legitimate when the engine's own facts back them;
judge every line's coherence against the engine's own state in the log, never against what the earlier rules did.
- Hit points change through typed effects (damage, healing, traps, falls, rest); saving throws use the PC's own number
  from the set's class tables (Basic Fantasy), and a target rolls its own save.
- Death and dying by the set (Basic Fantasy): a PC at 0 rolls its own save vs Death Ray once; failed, it dies; made, it is
  alive, unconscious and dying for 2d10 rounds (a fact each round: «… sta morendo: restano N round»), until bound,
  healed or dead. Subduing damage can knock someone out (not dead, wakes later with 1 HP). A PC dying, stable at 0 or
  knocked out is out of play for bug 3 exactly like «A TERRA».
- Monsters are stat blocks from the set's bestiary: attack bonus by hit dice, rolled hit points, every attack of a round
  (a creature with several attacks can roll several cards in one round), specials as powers.
- Morale is timed as the manual says: checked at the first opposition (the first time a PC attacks one of the NPCs) and
  at half strength, one 2d6 for the side read against each NPC's own score; a broken NPC flees (out of the scene) or
  surrenders (the set's surrender condition for the scene: out of the fight). The roll is the Game Master's
  (often on the panel only); the engine log says who holds and who breaks (`combat: morale checked`, `combat: a broken
  NPC surrenders`).
- The game clock and light: torre-mozza's scenes are in dim light (`luce: fioca`); a scene in the dark puts the blind
  condition (−4) on the cards of whoever sees nothing. Wandering-monster checks run on the game clock where a scene
  explores an environment; an encounter's creatures join the scene as combatants (see «The Engine's creatures» above),
  and the Engine says «Arriva qualcuno: …» / «Arrivano in N: …» if the narration does not. They stay where they were met
  when the party leaves, unless they are fighting it (then they follow).
- XP is counted in play (defeated enemies, treasure back to safety); a level-up happens between sessions, not in a game.
