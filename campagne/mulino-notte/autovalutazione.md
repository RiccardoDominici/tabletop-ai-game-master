# Self-assessment: `mulino-notte`

Written blind with the Preparatore skill (test A12). Grades as designed, before any play test or independent review.

## Validator
`python3 -I strumenti/valida_campagna.py campagne/mulino-notte --rigoroso --avvisi`, with node: **0 errors, 2 warnings**
(3 scenes, 4 NPCs, 115 lines). With `--senza-node` a third warning appears (the mode B context not compiled), which
confirms that the default run read the real context.

### Justified warnings
- `REPERTORIO.prova_aggirabile` on `nar_soppalco`: the granary loft opens after a successful lock, roof or door check,
  or without a roll when the PCs hold Folco's key ring (`battute_usate: [nar_mazzo_sfilato]`, itself behind a Sleight of
  Hand check). Intended: whoever has the key does not pick the lock.
- `PRONUNCIA.non_verificata` (16 names): the ear test (`strumenti/pronuncia/prova.ts`, a paid drama-3 and Whisper call)
  was outside the blind test's scope. `verificata` is not written by hand.

## Steps not done, and why
- Step 12, the two blind action scripts and `--copioni`: they live in `esperimenti/copioni/<id>/`, outside the folder the
  lead allowed to commit. So the average catalogue per action (must stay under 4) is **not measured**.
- Step 14, the independent review (an Opus subagent): out of scope for this test. Its questions were asked by hand below,
  which is weaker.
- Step 16, images and audio: not run (disk and RAM). The dry runs of step 11 were read and corrected.

## Rubric R1–R12 (manual §9), as designed
| Criterion | Grade | Evidence |
|---|---|---|
| R1 Agency of PCs | 3 | No line names a PC or adds a gesture; lines start from the outcome; defeat endings say «quando riaprite gli occhi», no PC choice. |
| R2 Consequences | 2 | Every scene check has a concrete `se_fallisce` (the lock snaps and Folco turns, a tile breaks in front of everyone); the clock gate on leaving the yard. Some failures only cost noise. |
| R3 Canon consistency | 3 | 26 atomic facts cited by id; chronology and logistics redone by `MONDO` (the water's 70 minutes, Folco's walk, the cart's sixteen places). |
| R4 Knowledge boundaries | 3 | Five lies with their signal in every version, ten confessions with structural gates, `SEGRETI` clean on the real mode B context. |
| R5 NPC voice | 2 | Four lengths and lexicons (mill, town, notary, yard); but Ermete and Adalgisa both say «tu» in the climax, told apart only by lexicon, length and «figlioli». |
| R6 Prose for listening | 2 | Within the validator's measures; runs of very short NPC sentences (Ermete) may sound flat. |
| R7 Concreteness | 3 | Three senses per scene, two of them not visual; the danger is heard (bell, dog, river, wheel). |
| R8 Handback | 2 | Lines stop at the reaction point; the invitation is left to the Engine. |
| R9 Spotlight | 3 | Each PC has a private knowledge that opens a road: Tarcisio the gauge post and the water's hour, Ilde the clay and the henhouse, Nerina the key ring, Benno the worthless letter, Cosma Adalgisa's trust. |
| R10 Rhythm and tension | 2 | Intensity 2 → 3 → 5, session clock `serata`; the yard can drag if the table does not look at the cart or the boots. |
| R11 Proactive world | 3 | Eight signs heard from every scene, stall lines of three levels in each scene, Folco's and Adalgisa's initiatives at the third bell. |
| R12 Clue flow | 3 | 16 clues on 3 conclusions, a proactive clue per scene, no essential clue behind a roll; the two-missing-clues test passes for each conclusion. |

## Known weaknesses of the design (what a reviewer should attack first)
1. **Road 2's price is the villain's win.** In the private deal, the petition still reaches the count and Ermete has to
   leave Ronchetto: Folco gets what he wanted. It is a price for the PCs and for Ermete, but the skill's rule reads as
   forbidding it. The validator's `SCELTA.premio` saw it only before the prices were reworded (NOTE W5).
2. **A heist can soften road 3.** A table that frees Adalgisa's fourteen hens with the cart (it holds sixteen) and then
   puts the brake back in public avoids most of road 3's price. All thirty-one hens do not fit in one trip
   (`c_carro non_porta g_galline_tutte`), and the cart creaks in a night full of lanterns, but Adalgisa's alone do fit.
3. **The price of road 1 can arrive early.** Folco names Viola in his key confessions, which can come out in the yard
   if a PC steals the key ring there and shows it. Then the climax has its price before midnight.
4. **The brake ending closes the scene at mark 6** (NOTE W8): putting the brake back before the water and then also
   exposing Folco needs both to happen before mark 6.

## Three main risks for a small, fast narrator
1. **The weir has no scene sheet.** Its lines play from the mill scene; the reader must map «vado a monte», «salgo alla
   chiusa» to them, and the GM stays in `scena_mulino` meanwhile. Folco seen there is only `menzionati` (NOTE W11).
2. **The climax hangs on exact lines.** If the PCs accuse Folco with the key *seen* but not *stolen*, no confession opens
   (`fol_chiave_mostrata` needs `nar_mazzo_sfilato`), the reader has only voice examples, and the clock runs to the
   burning wheel.
3. **Two NPCs say «tu» at midnight.** Ermete and Adalgisa share the scene and the informal register; with a fast reader
   that improvises an NPC line, the voices may blur (the TTS voices, vincent and nadine, are far apart).

## What I corrected along the way
- The wheel turning on the last mark would have ended the climax before anyone acted: the wheel moved to mark 7,
  the burning straw to mark 8.
- Two `quando` told the selector the mechanism («prima che arrivi l'acqua», «dopo che le tavole si sono alzate»);
  rewritten as times of the evening.
- Red clay in the weir's image prompt would have linked Folco's boots on the projector; removed.
- The audio deduction put the mill's ambience on a still wheel and a bright track on the climax; corrected with
  `audio` fields and a tense music tag.
