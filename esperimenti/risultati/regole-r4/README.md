# Live check of the rules-engine work R4 (21 November 2026)

Monsters and combat (docs/combattimento.md, docs/regole.md §2 «Bestiario»): stat blocks as data, every attack of a
round, specials as powers with the defender's save, defences, morale as the manual times it, surprise by the stat block,
missiles into a melee, subduing damage. On the real server with the scripted narrator (`--finto`: no model), the rules
arbiter, the Engine's dice with a fixed seed and **manual rolls** (the headless players roll their own dice from
`--seme-giocatori 00112233445566778899aabbccddeeff` and enter them; the Game Master's dice are the Engine's).

Three runs on a copy of the invented fixture `apps/server/test/fixtures/campagne/tana` (`campagna/tana/`, built by
`campagna.py`: a one-session package with three scenes; the PCs have 18, 8 and 12 hit points instead of the fixture's
9, 5 and 6, and the frost drake has 2 hit dice instead of 4, so its 1d8-per-die breath does not end every run in round
one), and one on **torre-mozza** with the real Basic Fantasy set. Everything is redone by `rifai.sh` (test ports
5013–5016, stopped at the end). The dice seeds of the Game Master's side were picked among a few tried so that the
turns show the rules below; the rules do not depend on them.

Files of each run: `fatti-e-tiri.md` (the facts the narrator received and the cards, from the server log, by
`../regole-r2/fatti.py`), `tavolo.md` (what the table heard and the cards on the projector), `trascrizione.md`,
`turni.jsonl`, `riepilogo.json` (`tiri_al_tavolo`: every roll the players were asked). No «a player roll was not asked»
or «card dice differ» line in any of the four server logs.

## tana/ — the den (script `esperimenti/copioni/regole-r4/tana.yaml`, port 5013)

A beast of three attacks a round whose claws paralyse, three raiders (`gregari`, `scheda: {mostro: predone}`, morale 7).

| turn | rule | seen |
|---|---|---|
| T1 | the PCs open the fight: only the attacked side rolls surprise | «Sorpresa: i nemici tirano 3 su 1d6: non sono colti di sorpresa»; initiative 1d6 + Dexterity, the players' own dice, re-rolled every round |
| T1 | morale at the first opposition (P5-45): one 2d6 for the side, read against each creature's own score | «Morale dei nemici: 4 su 2d6. Tengono: predone 2 (7), Artiglio Nero (9), predone 3 (7)» |
| T3, T7, T8 | every attack of the stat block's round (P6-07): claw, claw, bite | «Turno di Artiglio Nero, attacco 1 di 3 … 2 di 3 … 3 di 3», each against its own target's AC with the bonus of 2 hit dice (d20+2) |
| T3, T7 | a hit's rider with the defender's own save (P6-19) | Bruna's player rolls «Artiglio paralizzante» (18 against 13: resists); at T7 she rolls 6: «Bruna è paralizzato per 60 round» (1d4 turns: 1 turn of 60 rounds); at T9, the fight over, a closed window is one turn on the clock: «Finiscono: paralizzato di Bruna» |
| T8 | morale at half strength (P5-45): the rest flee | the second raider down (two of the four): «Morale dei nemici: 9 su 2d6. Tengono: Artiglio Nero (9). CEDONO e fuggono: predone 3 (7)» |
| T8–T9 | a PC at 0 when the fight ends before his death save (R3's leftover) | the beast's claw drops Dario to 0 in its step of T8; at T9 the Game Master ends the fight from the panel, and the save he still owed is asked of his player at that closed window: «Dario è a terra fuori da uno scontro: tiro salvezza contro la morte 7 contro 13 → … è MORTO» (`r_t9_morte_pg_dario_0`; log: «combat: the fight ended before these PCs at 0 rolled their death save: now») |

## cenere/ — the ash pit (script `cenere.yaml`, port 5014)

A snake that ambushes on 1–4 and whose bite kills unless the bitten saves against poison, and a frost drake with a breath.

| turn | rule | seen |
|---|---|---|
| T1 | the Game Master opens the fight from the panel: both sides roll surprise; with manual rolls the fight starts at the closed window, after the players' initiative | «Sorpresa: i personaggi tirano 1 su 1d6 e sono colti di sorpresa … i nemici tirano 1 su 1d6 e sono colti di sorpresa»; everybody loses round 1 («Dario è sorpreso: salta il turno», «Turno di Brina: è sorpreso, non agisce») |
| T1 | the stat block's special surprise (P6-28) | the PCs' die is read against 1–4, the snake's `sorprende: 4` (log `combattimento: sorpresa`, `"lato":"pg"`, `"agguato":4`); the drake's side against the set's 1–2 |
| T3 | a breath with the defender's save for half (P6-16), 1d8 per hit die, every PC standing | «Brina usa Soffio di brina … Bruna prende 15 danni da freddo … Dario prende 2 danni da freddo (dimezzati dal tiro salvezza) … Selva prende 6 danni»: each save asked of its player («Soffio di brina 1d20» in `tiri_al_tavolo`) |
| T4 | a missile that misses into a melee (P5-32) | Dario's arrow misses Brina, who fights Selva: «Il colpo finisce nella mischia, verso Selva: … → COLPITO, 1 danno» (the shooter's bonus, the Game Master's die) |
| T2, T6 | morale at the first opposition and at half strength | 6 on 2d6, both hold; the drake down (one of two): «7 contro 7 → tengono» |
| T8, T10 | poison: save or die (P6-18) | each bite that hurts asks the bitten player's save: «Salvezza contro il veleno 7 contro CD 12, fallita» (Bruna: d20 6 + Constitution 1) → «Bruna muore: Veleno della serpe»; Selva (3) and Dario (2) the same |

## lanterna/ — the lantern room (script `lanterna.yaml`, port 5015)

A wraith that only silver or magic hurts (`colpito_solo_da: [argento, magica]`), morale 12, surprised only on a 1.

| turn | rule | seen |
|---|---|---|
| T1, T2, T5 | weapons that cannot hurt it (P6-03) | Bruna's sword and Dario's arrows hit: «Spada colpisce Lanterna Spenta ma non lo ferisce: lo ferisce solo un'arma con una di queste proprietà: argento o magica. 0 danni; Lanterna Spenta non ha ferite» |
| T7, T9 | the silver dagger (`proprieta: [argento]` on the line) | «Pugnale d'argento … COLPITO, 4 danni», then 2 |
| T1 | surprised only on a 1 (`tratti: [{sorpresa: -1}]`) | «i nemici tirano 1 su 1d6 e sono colti di sorpresa»: at T3 «Turno di Lanterna Spenta: è sorpreso, non agisce» |
| T1 | morale 12 never fails | «Morale dei nemici: 9 contro 12 → tengono» |

## torre-mozza-manuale/ — the real Basic Fantasy set (script `torre-grosso.yaml`, port 5016)

Grosso and Zirrà are now `scheda: {mostro: hobgoblin}` and `{mostro: goblin}` with their own hit points, weapons and
(Zirrà) hit dice and XP; every number is the one their typed sheets had (asserted in manuale-basic-fantasy.test.ts).

| turn | rule | seen |
|---|---|---|
| T4, T5 | the attack bonus by hit dice from the bestiary's table (p. 53) | Grosso (1 HD) «d20+1», Zirrà (3−3 HD, counted as 3) «d20+3», the same numbers as before the migration |
| T1, T7 | morale from the entries | first opposition 7 on 2d6, both hold (8 and 7); Zirrà down, half strength: «6 contro 8 → tengono» |
| T5 | subduing damage (P5-41): the words of the action | «Colpisco Grosso con la mazza di piatto, per tramortirlo»: «d20−2 … (per tramortire −4, metà danno) → COLPITO, 2 danni» |
| T10, T12 | a stone into the melee | Nespola's sling misses Grosso, who fights Livia: «Il colpo finisce nella mischia, verso Livia Sarti» |
| T13 | killing damage beyond the hit points: dead, not knocked out | Livia's 10 drops Grosso (2 subduing, 12 killing against 7 hit points): «fuori combattimento», «Il combattimento è finito: i nemici sono a terra» |
| all | manual rolls | every PC die typed by its player, the Game Master's (the NPCs' attacks, the morale) hidden on the panel |

Not shown live (covered by the unit tests on the tana fixture): a subdued creature waking after its `sveglia`
(non-letale.test.ts), bare hands, energy drain and regeneration (drenaggio.test.ts, mostri-speciali.test.ts), surrender
(morale.test.ts), the GM-side morale card, a gaze, uses per day running out, resistances (mostri-speciali.test.ts),
conditions with numbers (modificatori-situazione.test.ts).

Found and fixed in this check: an NPC a hit did not hurt (a weapon it is immune to) was said «ferito ma regge»: at full
hit points it is now «non ha ferite»; the silver-only sentence read «solo armi argento o magica» and now names the
properties as a list.
