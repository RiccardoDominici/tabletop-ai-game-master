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
`riepilogo.json`. Code at commit 8b126e0 plus the harness and fixture changes of the same commit as this folder.

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
| 9 | the covered pit | a natural 1 on the save, the set's falling table (20 feet: 2d6 = 9), Sara to 0, her own death save at once (13 against 12): dying for 9 rounds |
| 10 | the panel's hazard; the countdown; binding | «Botola (caduta da 10 piedi)»; «Sara sta morendo: restano 8 round»; Bruno binds her: stable at 0 |
| 11 | the panel's rest | HP back by the set's rule, «Gli incantesimi e le risorse del riposo tornano», the sleep ends; the magic missile is cast again from a fresh slot |
| 12 | the new day's second slot | sleep again: the bandit, awake, rolls his save again (d20 12, failed) |

Found and fixed in this check: the rest healed a dying PC above 0 but her countdown went on (the rest's hook did not
end the dying window; the Game Master's HP command neither). Fixed in prove/motore.ts, with a regression test in
test/morte.test.ts; the run above is after the fix (turn 11 has no countdown line).

Not shown live (covered by the unit tests on the same fixture): an NPC that makes its save (poteri.test.ts «an area
spell…»: «Brigante resiste a Sonno»), charm person (attivi.test.ts), Shield (attivi.test.ts), the sneak attack once per
target (poteri.test.ts), death in a fight by the window (morte.test.ts). The panel's new buttons were not opened in a
browser: the run sends the same commands the panel sends, through the headless panel of the harness.
