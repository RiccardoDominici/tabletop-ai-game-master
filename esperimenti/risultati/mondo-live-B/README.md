# World that moves: live runs in mode B (15 November 2026)

Two short scripted games on test ports, with the server built from a clean worktree at the commit under test,
mode B (`repertorio`) with the local reader (`minimo`, Qwen3-8B on the shared mlx server, already running), mock
voice, no Anthropic key on this machine. Rules: docs/mondo.md.

## torre-mozza (port 4882, commit b339b3a)

`guida.log` (turns 1–12) and `guida-2.log` (turns 13–15, same session), `trascrizione.txt`, `turni.jsonl`, the
world's log lines `mondo-log.jsonl`, the Game Master panel's state `master-stato.json`, and the panel in Chromium:
`pannello-mondo-senza-spoiler.png`, `pannello-mondo-con-spoiler.png`, `pannello-intero.png`.

| Rule | Turn | Evidence |
|---|---|---|
| Pace from the evening | 1–6 | evening set to 0.5 h: o_mezzanotte marks at turns 2, 4, 6 (`mondo-log.jsonl`, «clock: evening pace updated») |
| Fact-driven mark | 7–8 | leaving the sheepfold owes o_mezzanotte a mark; at the carbonaia «La luna esce dalle nuvole…» (turn 8) |
| Consequence heard | 6 | mark 3 with Berta present: her line `ber_salgo_io` had been used by the reader as a filler at turn 5, so the Engine said the consequence's `detto` («Berta guarda il crinale…») |
| Hidden Game Master roll | 7 | o_sospetto gate `tiro: d6 4+`: rolled 6, success, mark paid off-screen |
| Off-screen event, traces later | 7 → 8 | o_sospetto@1 logged as not seen; at turn 8, with Ugo present, «Ugo ha il viso scuro: dal paese è salito un ragazzo…» |
| Attitude after a social check | 3, 15 | turn 3: Carisma 10 vs 17, failed: Berta would drop to hostile, which a check never does, so no change; turn 15: Berta towards Nespola indifferente → amichevole (cause `prova`) |
| Stall S1 → S2 → S3 | 10–12 | S1: a filler of the carbonaia and the due mark; S2: the Engine says the i_rovi clue line (the postern); S3: «Vi tornano in mente le strade ancora aperte: La Torre Mozza; Dallo stazzo…» |

An earlier run of the same script (not kept) found two bugs, fixed in b339b3a: Berta's impatience, unseen at the
carbonaia, surfaced at the carbonaia itself; and S2 picked a clue whose lines all have gates, so mode B had nothing
to say. A first attempt crashed at turn 1 on a broken HEAD (another agent's unfinished hunks, fixed in 0819b2f).

## Fixture `mondo` (port 4883, commit 8b3fa5b)

`guida.log`, `turni.jsonl`, `mondo-log.jsonl`, `master-stato.json`. Turn 1: an action on the wheel opens the gate,
the Engine says the owed mark and the consequence (the miller turns hostile to Anna). Turn 3: the gate again, mark
2: the Engine says the mark and the line written for the consequence (`nar_ruota_ferma`); the miller leaves the
scene and the hidden thief appears (`presenze`).
