# Live check of the rules-engine work R1 (20 November 2026)

The real server on test port 4970, the scripted narrator (`--finto`: no model), the rules arbiter, the Engine's dice
with a fixed seed, on the invented fixture `apps/server/test/fixtures/campagne/magia` (three PCs: a level-2 magic-user
with two first-level slots, a level-2 cleric with one, a «folletto» fighter with two arrows; a bandit of 3 hit dice,
his boss of 5, an undead skeleton). Script: `esperimenti/copioni/regole-r1/cantina.yaml`.

    TAGM_PORTA=4970 TAGM_SEME_DADI=0123456789abcdef npx tsx apps/server/src/esperimenti/esegui.ts \
      esperimenti/copioni/regole-r1/cantina.yaml A --cartella apps/server/test/fixtures/campagne/magia \
      --finto --tiri automatico --uscita regole-r1

Files: `fatti-e-tiri.md` (the facts the narrator received each turn and the Game Master's hidden saves, from the server
log), `tavolo.md` (what the table heard and the cards on the projector), `trascrizione.md`, `turni.jsonl`,
`riepilogo.json`. Code: the commit that adds this folder.

Two more runs, with **manual rolls** (the default mode: the headless players roll their own dice and enter them):
- `manuale/`: the same script on port 4971 (`--tiri manuale --seme-giocatori 00112233445566778899aabbccddeeff`). The
  spell's damage and the cure's healing are asked of the caster («Dardo arcano 1d6», «Cura ferite 1d6» in
  `riepilogo.json → tiri_al_tavolo`), saves of the players likewise; no «a player roll was not asked» or «card dice
  differ» line in the log; each slot is spent once (the dry run of the requests works on a copy).
- `torre-mozza-manuale/`: `esperimenti/copioni/regole-r1/torre-dardo.yaml` on the real Basic Fantasy set (port 4972):
  the set loads as itself, Eliandro's magic missile is cast from his one slot and then refused, Nespola's sneak attack
  doubles the short sword's roll (4 → 8), the halfling's initiative carries its +1.

What each turn shows (`fatti-e-tiri.md`):

| turn | rule | seen |
|---|---|---|
| 1 | sleep: each target within the limit rolls its own save, hidden | the bandit's save (d20 4 against his fighter-3 table 15) on the Game Master's side only, failed: asleep 10 rounds (5 per level); the boss too strong (5 HD), the skeleton immune (undead) |
| 2 | a damage spell spends the second slot and opens the fight | «gliene restano 0»; the fight starts with the folletto's initiative trait |
| 3 | the slots are gone | «non ha Dardo arcano tra gli incantesimi preparati per oggi»: no card, nothing spent |
| 5, 6 | the sleeper in the fight | «è addormentato, non agisce», both rounds |
| 5 | the cleric heals | «Cura ferite: Ilaria recupera 1 punti ferita», the cleric's only slot spent |
| 4, 6, 8 | arrows | two shots, then «Sara non ha più frecce per Arco corto: nessun attacco» |
| 7 | the dart trap of a failed scene check | the save (pinned to the table's 11), then the trap's d20 +1 against AC 15 |
| 9 | the covered pit | a natural 1 on the save, the set's falling table (20 feet: 2d6 = 9), Sara to 0, her own death save at once (13 against 12): dying for 9 rounds; the table hears «Sara resta a terra, tra la vita e la morte» (an owed fact) |
| 10 | the panel's hazard; the countdown; binding | «Botola (caduta da 10 piedi)»; «Sara sta morendo: restano 8 round»; Bruno binds her: stable at 0, and the table hears «Sara respira ancora, ma non si muove» |
| 11 | the panel's rest | HP back by the set's rule, «Gli incantesimi e le risorse del riposo tornano», the sleep ends; the magic missile is cast again from a fresh slot |
| 12 | the new day's second slot | sleep again: the bandit, awake, rolls his save again (d20 12, failed) |

Found and fixed in this check: the rest healed a dying PC above 0 but her countdown went on (the rest's hook did not
end the dying window; the Game Master's HP command neither); a PC dropped to 0 outside a fight, her save, her binding
and a death by the window reached the narrator's facts but no line the table was sure to hear (only the fight's
outcomes were owed facts: now prove/fatti-dovuti.ts gets them too). Both fixed, with tests in test/morte.test.ts; the
runs here are after the fixes. The round-by-round countdown («restano N round») is a fact for the narrator, not an owed
line: the scripted narrator does not say it, a model narrator does.

Not shown live (covered by the unit tests on the same fixture): an NPC that makes its save (poteri.test.ts «an area
spell…»: «Brigante resiste a Sonno»), charm person (attivi.test.ts), Shield (attivi.test.ts), the sneak attack once per
target (poteri.test.ts), death in a fight by the window (morte.test.ts). The panel's new buttons were not opened in a
browser: the run sends the same commands the panel sends, through the headless panel of the harness.
