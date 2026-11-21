# Live check of the rules-engine work R2 (20–21 November 2026)

Equipment, load, money and game time (docs/regole.md §2 «Catalogo», «Carico», «Tempo»; docs/prove.md §10–11). Three
runs on the real server, test ports only, the scripted narrator (`--finto`: no model), the rules arbiter, the Engine's
dice with a fixed seed. `fatti-e-tiri.md` in each folder is what the narrator received each turn and the cards, taken
from the server log by `fatti.py` (records `prove: tiri del turno`); `tavolo.md`, `trascrizione.md`, `turni.jsonl`,
`riepilogo.json` come from the harness (apps/server/src/esperimenti/esegui.ts).

## bottega/ — the invented fixture, automatic rolls (port 4981)

    TAGM_PORTA=4981 TAGM_SEME_DADI=0123456789abcdef npx tsx apps/server/src/esperimenti/esegui.ts \
      esperimenti/copioni/regole-r2/bottega.yaml A --cartella apps/server/test/fixtures/campagne/bottega \
      --finto --tiri automatico --uscita regole-r2/bottega

| turn | rule | seen in fatti-e-tiri.md |
|---|---|---|
| 1 | a purchase from the panel; load bands | «Aldo compra 2 × Corda per 2 mo. Aldo ora ha un carico pesante (53.26 libbre): si muove di 3 metri a round.» |
| 1 | a torch lit by the action's words | «Aldo accende: torcia.» (one of his three torches spent) |
| 2 | a lantern burns its oil | «Bice accende: lanterna.» (the flask bought in turn 1 is spent) |
| 3 | range band by the distance said | «Gittata lontana −3 25 metri», one arrow spent (12 → 11) |
| 4 | the band's words | «Gittata vicina +2», hit for 6, arrow 11 → 10 |
| 5 | an armor swap changes the AC and the movement | «Aldo si toglie Cotta di maglia: Classe d'Armatura 12 … si muove di 9 metri a round» |
| 6 | the torch burns out on the clock | «Si spegne la luce di Aldo (torcia).» (an owed fact) |
| 6 | beyond the long limit | «Aldo non può tirare con Arco a 40 metri: arriva a 30 metri.» (no card, no arrow spent) |
| 9 | the Game Master's hour; the lantern runs out | «Tempo trascorso: 1 ora; ora è giorno 1, 20:30. Si spegne la luce di Bice (lanterna).» |
| 10 | a night's rest takes eight hours | «Riposo (Una notte di sonno): … Tempo trascorso: 8 ore; ora è giorno 2, 04:40.» |

The server turn numbers differ from the script's: during the fight an action waits for its PC's step. «Frugo tra le
casse» (turn 5) costs three turns by the fixture's `tempo.azioni`, which is why the clock reads 20:30 after one hour.

## torre-mozza-manuale/ — the real Basic Fantasy set, manual rolls (port 4982)

    TAGM_PORTA=4982 TAGM_SEME_DADI=0123456789abcdef npx tsx apps/server/src/esperimenti/esegui.ts \
      esperimenti/copioni/regole-r2/torre-arco.yaml A --campagna torre-mozza --finto --tiri manuale \
      --seme-giocatori 00112233445566778899aabbccddeeff --uscita regole-r2/torre-mozza-manuale

- The set loads as itself with its catalog; the clock starts at 17:00 (campagna.yaml `tempo_all_inizio`).
- Livia buys a week of dry rations (14 lb): 58.05 → 71.55 lb, over her Strength 16 light limit of 70 (p. 42), so she
  moves 3 m (10') in chain mail instead of 6 m.
- Livia's shortbow against Zirrà: «Gittata media 20 metri», «Gittata lunga −2 40 metri», and at 50 m «non può tirare con
  Arco corto a 50 metri: arriva a 45 metri» (p. 11: 50/100/150 feet = 15/30/45 m). Shortbow arrows 20 → 19 → 18.
- Fulco's sling «da vicino»: «Gittata corta +1», 4 damage = the 1d4 the player rolled (3) + his Strength +1 (p. 55);
  sling bullets 20 → 19.
- Livia takes off her shield: AC 17 → 16. Nespola's torch (1d4+4 turns) burns out within the hour the Game Master lets
  pass. The night's rest takes eight hours (02:40 of day 2).
- Manual rolls: every PC roll was asked at the table (`riepilogo.json → tiri_al_tavolo`: the bow's d20, the sling's
  d20 and 1d4, the listen d100, initiative); no «a player roll was not asked» or «card dice differ» line in the log.

## playwright/ — the panel and the phone in a real browser (port 4980)

`apps/web/e2e/scorta.spec.ts` (command in its header) on the fixture: R1's hazard button (Aldo 9 → 7 HP) and rest
button (→ 8 HP, the clock from 18:00 to 02:00 of day 2), a purchase from the gear control that makes the load heavy
(the phone's open sheet shows «Carico pesante … 3 metri» without reopening), an armor swap (AC 16 → 12 on the panel
and the phone), a torch lit from the panel (time left on the panel, only «Torcia accesa» on the phone), and «+1 ora»
that burns it down. Screenshots 01–05. The same commands run on a real server in apps/server/test/scorta-server.test.ts.

Not shown here, tested in the suite: a purchase that cannot be paid (refused back to the panel; this harness stops on
a refused Game Master command), the crossbow's rate of fire, the magic-user who cannot cast in armor and the thief's
abilities blocked in metal armor (test/inventario.test.ts), travel by the slowest PC (test/tempo.test.ts), carrying
everything into the next session package (test/stato-pg.test.ts, strumenti/test_tra_sessioni.py).
