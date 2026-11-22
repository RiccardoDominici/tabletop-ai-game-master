# R6 live check: exploration on the clock, light, the elves' combination classes

Rules-engine package R6 (docs/prove.md §14–15, docs/regole.md §2 «Esplorazione», «Classi combinate»), checked on real
pages: projector, phones and the Game Master panel in a browser (Playwright), the scripted narrator, **manual rolls**
(every PC roll typed on the phone). Redone from scratch by `rifai.sh` (it copies the campaigns to the scratch folder,
starts two test servers on ports 5031 and 5032 with a fresh panel token, runs `apps/web/e2e/esplorazione.spec.ts`,
extracts the evidence and stops the servers). The run recorded here is on the final code of the package (85dc5c7 and
after).

| file | what it is |
|---|---|
| `fatti-e-tiri-cunicolo.md`, `fatti-e-tiri-torre-mozza.md` | turn by turn, the facts the narrator received and the cards (with the rule lines), from the server logs |
| `log-esplorazione.jsonl` | the Engine's exploration, light, supplies and travel log lines of both runs (the Game Master's hidden rolls with their dice) |
| `playwright/` | screenshots, numbered in the order of the run |
| `pg-creati/pg_fiordaliso.yaml` | the elf built at the table (an invented name) |

## Run 1: a dungeon crawl on the invented cunicolo fixture (port 5031)

The fixture's numbers are invented (a check every 2 turns underground, 1–2 on 1d6; every 3 hours outdoors; a torch of
1d4+2 turns; a rest rule of a turn every hour, which Basic Fantasy does not have). The dice seed `a004b669` was found by
replaying the crawl's windows on the Engine: with it the torch burns out before the wandering monster comes. PCs: Aldo
(human fighter, chain mail, a torch), Bice (human magic-user, no rations), Dora (dwarf fighter, darkvision 18 m).

| turn | what happens | rule |
|---|---|---|
| 1 | At the inn: nothing explored, no check counted, no light line (the panel's clock box has neither) | a scene without `esplorazione` explores nothing; without `luce` it is lit |
| — | The Game Master moves the party to the tunnel: the box shows «Mostri erranti (Sotterraneo, Galleria, primo livello): prossimo controllo tra 2 turni, ogni 2 turni, 2 su 1d6» and «È buio pesto… Non vedono nulla: Aldo, Bice» (`01-galleria-buia.png`) | the scene's `esplorazione` and `luce: buio`; darkvision as a race trait |
| 3 | «Accendo una torcia»: the torch's 1d4+2 turns rolled hidden (3 turns); the narrator hears «È buio: la luce di Aldo (torcia) illumina 9 metri intorno, poi penombra fino a 15 metri» (`02-torcia-accesa.png`) | catalog `luce` on the clock (R2), the party's light against the dark |
| 4 | Check at 18:30 (two turns after arriving at 18:10): 6 on 1d6, nothing (a hidden Game Master card) | `controllo` every `ogni` |
| 6 | The torch burns out: the owed line «La luce di Aldo si spegne.», then «È buio pesto… Dora vede al buio fino a 18 metri, in bianco e nero. Non vedono nulla: Aldo, Bice.»; check at 18:50: 6, nothing (`03-torcia-spenta.png`) | the narrator told what the party sees when it changes |
| 8 | Check at 19:10: **1** → the tunnel's table (1d6 = 1: giant rat), 1d4 = 1: one rat joins the scene as `png_ratto_gigante_inc1_1` with 4 hit points from the session seed; the narration did not tell it, so the Engine said «Arriva qualcuno: Ratto.» (`04-incontro.png`, `05-incontro-proiettore.png`; the transcript's lines in `09-viaggio-nel-bosco.png`) | the encounter table, the creatures as combatants, the owed `incontro` fact |
| 9 | Past an hour without a rest the PCs are weary. Aldo attacks the rat in the dark: d20 **−3** (Strength +1, class +1, «Affaticato −1», «Accecato −4») 17 → 14 against AC 12, hit, 4 damage, the rat down. Dora's phone shows the card with −3 (`06-scontro-al-buio-telefono.png`); the rule line with the conditions is in `fatti-e-tiri-cunicolo.md` (the table's card does not show the AC) | the dark's condition for whoever has no light and no darkvision; the rest rule's condition |
| 10 | «Ci riposiamo un momento contro la parete»: the window costs the rule's turn, «Il gruppo si ferma a riprendere fiato: la stanchezza passa.» (`08-stanchi.png` before it) | `esplorazione.riposo` (the fixture's) |
| — | A day in the woods from the panel: 9 miles at Aldo's pace (chain mail: 6 m a round, 6 miles a day), Dora leading. Her course check (the fixture's `orientarsi`, d20 6) fails: only the panel says «Dora ha perso la strada (tiro del master): decidi tu dove arriva il gruppo.». Nine wilderness checks every 3 hours, none a hit. At midnight Aldo and Dora open a pack (2 days left) and drink a waterskin, Bice has no food (a day within the grace: «Bice: 1 giorni senza cibo» on the panel) and drinks her only waterskin (`09-viaggio-nel-bosco.png`; Dora's sheet in `10-dora-scheda.png`) | the journey's checks on the terrain's table; the leader's secret check; food and water at each midnight |

## Run 2: torre-mozza with Basic Fantasy's rules (port 5032)

A copy of torre-mozza with creation at the table (`creazione: {modo: entrambi}`), manual rolls, no fixed seed.

| step | what happens | rule (Basic Fantasy page) |
|---|---|---|
| creation | 3d6 in order: Forza 13, Intelligenza 14, Saggezza 10, Destrezza 12, Costituzione 11, Carisma 9; race elf; the class list offers **Guerriero/Mago** (`11-tm-classi-elfo.png`: both Prime Requisites met, elves only) | combination classes, p. 6 |
| | the magic-user's book (read magic and magic missile, p. 8); hit points a **d6** = 5 (p. 6); 150 gp; chain mail with no «niente incantesimi» on it, a longsword, a week of rations and a waterskin (`12-tm-acquisti-guerriero-mago.png`); one more language for Intelligence 14; Fiordaliso, approved (`13-tm-pronto.png`) | p. 6, 3–4, 10–12 |
| sheet | the created PC's «Scheda» on the phone: race, class and level, the scores, the languages, the spellbook, then the gear (`14-tm-scheda-fiordaliso.png`). Before 85dc5c7 it showed only the gear | — |
| light | the Game Master sets the sheepfold's light to «buio»: «Fiordaliso vede al buio fino a 18 metri» (nobody blind) | darkvision 60', p. 5, 43 |
| encounter | «Tira un incontro» on the first dungeon level's table (p. 180): 1d12 = 2, **Goblin**, 2d4 = 7: seven goblins join the scene with their bestiary numbers (`15-tm-incontro-e-buio.png`) | pp. 180, 75 |
| journey | 8 miles through the forest (×2/3: 8 miles a day at 6 m a round), Fiordaliso leading: the save vs. Death Ray with Wisdom, rolled by the Game Master in secret (d20 8: lost; the panel only); a wilderness check at 4 hours (5, nothing); midnight: a ration day from the week's pack (6 left) and the waterskin (`16-tm-viaggio-foresta.png`) | pp. 44–45, 181 |
| turn 1 | «Lancio il dardo incantato contro goblin» in chain mail: the spell is cast (no armor refusal for a fighter/magic-user), the player's die 4: Goblin 1 down. The goblins were not surprised (3 on 1d6), held their morale (4 against 7) and attacked: one hit (2 damage) (`17-tm-dardo-in-armatura.png`) | p. 6; pp. 50, 57 |

## What the runs found, and what changed

- **The panel's «Luce», «Tira un incontro» and «Morale» were refused as unknown commands** (the server keeps an
  allow-list of command types). Fixed in 85dc5c7, with a server test that sends the three over the socket.
- **A spell «contro goblin» hit Zirrà**, torre-mozza's goblin chief, who was not in the scene, instead of the six
  wandering goblins standing there (an earlier run): the rules arbiter preferred any NPC named by its alias. Now an NPC
  here comes first, then the scene's minions, an NPC elsewhere last (85dc5c7). The run above hit Goblin 1.
- **A created PC's «Scheda» showed only its gear** (R5 never opened it): it now shows the sheet's data (85dc5c7).
- Basic Fantasy's numbers are hard on a lone level-1 caster: an earlier run met six goblins with the chief and the elf
  died; another bought no waterskin, travelled two days and dropped to 0 from thirst (1d4 a day from the first day,
  p. 44). The spec now buys rations and water and travels one day.
- Not changed (other packages' choices): the table's card hides the rule line that names the conditions, since it
  shows the AC (the players see the total modifier, −3); a spitting cobra's «Sputo» line has no damage nor power (one
  of the bestiary specials no power expresses yet: the sheet warns, the Engine uses 1d4); the journey's public line
  rounds the time to the largest unit («dura 1 giorno» for a day and four hours).

## Rerun

    esperimenti/risultati/regole-r6/rifai.sh

It needs no model and no key (scripted narrator, mock voice); about three minutes. The torre-mozza run has no fixed
seed: its creatures, numbers and the course check change from run to run (the spec rolls the table again when it gives
a group without a stat block).
