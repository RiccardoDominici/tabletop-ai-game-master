# Image prompts

`strumenti/immagini/genera.py` generates the images (FLUX.2 klein, locally). `strumenti/immagini/campagna.py` composes
them, and it reads **only** these fields:

| File | Field | Use |
|---|---|---|
| stile.yaml | `stile_immagini` | the `[STILE]` fragment, appended to every prompt; in English |
| scena*.yaml, scene/*.yaml | `immagine.prompt_luogo`, `immagine.invarianti`, `png_presenti` | image of the place, 16:9 |
| png/*.yaml | `aspetto.prompt_immagine` (or `aspetto.prompt_ritratto`), `aspetto.invarianti` | portrait 3:4; the invariants end up in the prompt as "Fixed traits: …" |
| png/*.yaml | `aspetto.prompt_ritratto` | optional: if present, the portrait uses it instead of `prompt_immagine` |
| png/*.yaml | `aspetto.situazioni: [{id, prompt, dopo}]` | the same NPC in another situation, 16:9, with the portrait as reference |
| campagna.yaml | `nodi[].immagine.prompt_luogo` | a place without a scene sheet (the server shows it for linked places) |

For every scene in which an NPC is present, its image in the place is also generated automatically.

## Rules
1. **English** for `prompt_luogo`, `prompt_immagine`, `prompt_ritratto` and `situazioni[].prompt` (the generator
   understands them better) [V warning]. The invariants may be in the campaign language.
2. **`[STILE]`** appears in `prompt_immagine` and in `prompt_ritratto` as a placeholder, once only [V]. `stile_immagini`
   is its content: technique, palette, light. The projector format (full-bleed, no margins, signatures, text or letters)
   is appended to every prompt by the tool (`strumenti/immagini/formato.py`): do not write it here.
3. **Fixed traits**: age, build, hair, one recognisable garment, one object. The invariants are at least three [V] and
   must be **visible at first glance**.
4. **No secrets.** Images go to the projector from the first turn:
   - a scar under the hood, a hidden tattoo, the object stolen in a pocket do not belong in the portrait or in the
     invariants [R];
   - put them in a `situazione` (for example `{id: senza_cappuccio, dopo: [i_cicatrice], prompt: "hood
     lowered, a thin white scar splits his left eyebrow"}`), to be shown after the reveal;
   - `dopo` says which clue or line makes it appear on the projector [R]: without it, the Engine looks for it by
     similarity between the situation's id and the NPC's clues, and may not find it (in ponte-lanterne it did not find
     Vischi's `studio_cassa`; see «lingue/<lingua>/preparatore/riferimenti.md», immagini.md §1);
   - the situation appears at the **first** id of `dopo` that comes out, so each of them must reveal the trait. The
     validator derives the trait from the secrets lexicon: these are the hidden facts that the id makes public (the
     secret words that list it in `pubblica_dopo`, the `fatti_noti` of the line). Error if an id of `dopo` is a voice
     example or a filler, or does not reveal the trait the others reveal, or if another situation of the NPC, visible
     earlier, shows the same trait [V]. A situation that shows nothing hidden (a jailer at the chain) follows a moment: a
     sign, a key moment, an ending;
   - the validator searches for the secret words in prompts and invariants [R], but its regexes are in the campaign's
     language and the prompts are in English: the reading with `--dry-run` stays your job.
5. **The place** describes what is seen on entering, with the main interactive elements, without people (the
   situations add them).
6. Check with `--dry-run`: it prints every composed prompt, without loading the model.
