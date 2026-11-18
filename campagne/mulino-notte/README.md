# La ruota che gira da sola (`mulino-notte`)

One-shot for 3–4 players (five pregenerated PCs, level 1, SRD 5.2), about two and a half hours, in Italian
(`lingua: it`). Low fantasy, an uneasy fairy tale: no explicit horror. Written blind with the Preparatore skill
(item A12 of `docs/da-fare.md`); what the skill lacked is in `NOTE_SULLA_SKILL.md`.

## The evening in a few lines
At Ronchetto, on the river Lenta, the mill wheel has turned by itself around midnight for nine nights, and hens
vanish from the henhouses. The village blames the drowned miller's wife of the legend and signs a petition to the
count against old Ermete. The truth: Folco, the count's steward, reopens the upstream weir every night with the key
he says he leaves at the castle, steals the hens with the count's cart and keeps them alive in the count's granary,
because he has promised the mill to his brother-in-law. Viola, Ermete's granddaughter, pulls the oak brake from the
wheel every evening and ties hen feathers to the paddles, in exchange for a letter that promises her a servant's
place in town and is worth nothing.

Three scenes: the yard of Adalgisa at sunset (`scena.yaml`), the mill at dusk (`scene/scena_mulino.yaml`), the same
mill at midnight with the village and its lanterns (`scene/scena_ruota.yaml`, the climax). The weir upstream and the
village square are places without a sheet (`campagna.yaml → nodi`).

## The NPCs
| NPC | Voice | Wants | Lies about | Signal |
|---|---|---|---|---|
| Ermete, the miller | vincent | keep the mill and his granddaughter | the brake «is always there in the morning» | takes off his cap and turns it in his hands |
| Viola, his granddaughter | tabitha | go into service in town with the steward's letter | where she is at night | pulls her sleeves over her hands |
| Folco Rasi, the steward | lucian | have Ermete driven out and give the mill to his brother-in-law | the weir key; the granary | buttons his coat to the last button; steps in front of the granary door |
| Adalgisa, the hen-wife | nadine | get her hens back before the fair | what she heard last night | pulls her shawl tight and looks at the empty henhouse |

Adalgisa (nadine) and Viola (tabitha) have similar voices: they never share a scene. At midnight Viola is locked in
the house across the yard; she is talked about, never on stage.

## Clues, clock and choice
- Three key conclusions (`rivelazioni`): the water comes from the weir and Folco has the key (6 clues), the hens are
  alive in the granary (5), Viola pulls the brake (5). Each scene has a proactive clue as a stall line (level 2).
- One session clock, `o_mezzanotte` (8 marks, pace `serata`), active in all three scenes: bells, a dog, voices, lanterns,
  the river rising, the wheel turning, the straw lit. The midnight scene starts at 5 at least.
- The final choice (`brief.yaml → decisioni.strade`): tell the village the truth (Folco, cornered, names Viola: her
  shame); a private deal with Folco (the petition still goes to the count: Ermete has to leave); put the brake back in
  front of everyone with no names (Folco keeps the hens: Adalgisa loses them). The scene outcomes (`esiti`) close the
  scene on the first that holds, in that order; a full clock burns the wheel.

## Who sees what
- `stile.yaml`, the public facts, the scene sheets without HIDDEN elements, the NPCs' appearance, character and voice, the
  PC sheets without private knowledge, the voice examples and the catalogue (`id · chi · tipo · quando`) go to the selector
  in mode B. Nothing secret is written there (validator `SEGRETI.contesto_b`, and a hand reading of the catalogue).
- `pg.yaml → conoscenze_private` goes only to each player's phone.
- `campagna.yaml → preparazione` (villain, fronts, chronology, logistics), `brief.yaml`, `parole_segrete.yaml`,
  `autovalutazione.md` and `NOTE_SULLA_SKILL.md` are for whoever prepares and the Game Master.

## What is still missing
- Images and audio: `scripts/prepara.sh campagne/mulino-notte` was not run (blind test scope: the disk is nearly full and
  the image model needs 8 GB of RAM). There is no `immagini/manifest.json` or `audio/manifest.json`, so the campaign is
  **not ready to play** yet.
- The two blind action scripts of step 12 (`esperimenti/copioni/mulino-notte/`), the `--copioni` measure of the catalogue,
  the independent review of step 14 and the ear test of the names (`strumenti/pronuncia/prova.ts`).
