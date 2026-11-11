# Languages

Request from Riccardo of 10 November 2026 (docs/richieste-2026-11-09.md, §12): the project is independent of language; the game language is chosen in configuration. Today everything is in Italian; English is the second language, complete.

## The two languages of a game

- **Content language**: that of the campaign (`lingua` in `campagna.yaml`, and in the Preparer's brief). It applies to everything the Engine says or writes: model prompts, the turn message, the Engine's fixed phrases (notices, reasons, system lines, reservations), language rules (announcement, guards, sentence splitter), dice keywords, voices.
- **Interface language**: that of the configuration (`lingua` in `config/predefinita.yaml`, overridden by `config/locale.yaml` or by `TAGM_LINGUA`). It applies to the fixed texts of the phone, the projector and the panel.
- A campaign without `lingua` is in the language of the configuration. Usually the two coincide; if not, the phone is in the language of the player and the story is in that of the campaign.
- ISO 639-1 codes: `it`, `en`. An unknown language stops startup with a clear error.

## Where the language-dependent parts live

```
config/predefinita.yaml          lingua: it                       (the configuration choice)
campagne/<id>/campagna.yaml      lingua: en                       (the campaign language)
prompts/<codice>/*.md            model prompts (narrator, selector, action arbiter, minimal reader, summary, rules)
lingue/<codice>/testi*.yaml      fixed Engine phrases, keyed, with {placeholders} (testi-modelli.yaml: what goes to the models)
lingue/<codice>/motore.yaml      Engine language rules (announcement, links between actions, phrases, guards, names)
lingue/<codice>/prove.yaml       dice-arbiter keywords (SRD 5.2) and names of abilities and skills
lingue/<codice>/prosa.yaml       validator prose rules (sentences, clichés, numbers spelled out, voice and tone), and the word lists of the checks on aliases, ids, the "quando" (when) field of lines, and privacy
lingue/<codice>/preparatore/     the Preparer's examples in that language (skill.md, riferimenti.md)
apps/web/src/lingua/<codice>/    interface dictionaries (TypeScript: the compiler checks the keys)
assets/voci/voci.yaml            voices per language (Fish and Qwen)
```

- The web dictionaries live in `apps/web/src`, not in `lingue/`: this way `tsc` finds the missing keys, and Vite does not have to read files outside the app. Everything else is in `lingue/` and is YAML or Markdown, read by the server (TypeScript) and by the validator (Python) in the same format.
- Italian is the reference: the `it` package contains exactly today's texts and rules, and the existing tests stay green without changes. Every other language must have all of Italian's keys, with the same placeholders: the tests check this (`lingue.test.ts` for the server, `lingua.test.ts` for the web).

## How the code uses it

- Server: `apps/server/src/lingua/` loads and checks the content-language package at startup (and when the session loop changes package). The active package is one per process: one server plays one campaign. The Engine's functions ask for `testo('chiave', { nome })` and `pacco().motore…`; without a language set, Italian applies, so tests and tools that do not set it behave as before.
- What is read before the language is set uses the campaign's language: the loader splits the sentences of openings and summaries with the `lingua` of `campagna.yaml`, otherwise with that of the configuration (`linguaConfigurazione`, passed by `avvio.ts` and `strumenti/prerender.ts`). What is composed at load time and shown later is composed when it is read (getters): the description of the AC on the sheets (`ca_da`), the panel's notice about a package that does not load. The tools that load a campaign outside the server (`prerender.ts`) set the language as the server does, so the cache key of the audio is the same.
- Prompts: `prompts/<lingua>/<nome>.md`. The variables `TAGM_PROMPT_*` still force a specific file.
- Language rules (`lingua/motore.ts`): each module asks for its section of `motore.yaml` with `regole('sezione', compila)`; the expressions are texts, compiled on first request and cached next to the language package. The sections: `annuncio` (llm/annuncio.ts: in Italian the player is cited; in English it is turned into the third person), `collegamenti` (azioni/regole.ts: «anch'io» (me too), «me too», «I follow Corrado»), `frasi` (abbreviations for the splitter), `finzione` and `numeri_regole` (the two guards of the voice), `privato` (stop words of the private-actions guard), `nomi` (titles skipped in short names), `fatti_dovuti` (prove/fatti-dovuti.ts: word roots that describe a hit, a fall, a death save; the fallback lines are in testi-prove.yaml, `prove.dovuti`), `nascosto` (campagna/nascosto.ts, and in Python strumenti/valida/lingua.py and strumenti/audio/campagna_audio.py: the markers of the hidden elements of the scene sheets, «NASCOSTA» and «HIDDEN»; ALL of them apply in every campaign, so that an English campaign with the Italian marker, or the reverse, does not lose the secret). The prompts that were in the code (`arbitro-azioni`, `lettore-minimo`, `riassunto`) are read with `prompt(nome)`; the JSON fields and the protocol labels stay the same in every language.
- The minimal reader receives the turn as data (`RichiestaNarrazione.dati`), not from the text of the message.
- Web: `apps/web/src/lingua/` (`t('chiave', { … })`), no new dependency. The interface language arrives from the server (`/api/salute` at page load, and `StatoTavolo.lingua`); until it arrives, Italian applies. Dates and times are written with `localeInterfaccia()` (`it-IT`, `en-GB`). The damage type of the cards arrives from the Engine already in the content language (`DannoMostrato.nome_tipo`, from `prove.yaml`: «perforanti» (Italian for piercing), «piercing»), and the web puts it in the dictionary sentence (`comune.tiri.danni_tipo`); only a card from before, without `nome_tipo`, falls back on the Italian grammar of the type written in the sheet (`tipoDannoPlurale`).
- Validator: `strumenti/valida/` reads `lingue/<campaign language>/prosa.yaml`.
- Voices: the voice registry has voices per language; the NPCs of a campaign choose among those of its language.

## What stays in Italian (for now)

- Code identifiers, YAML field names, log messages, loader and validator errors for those who write campaigns, and the internal documents of `docs/` (the guide `docs/guide/` is in English). This is the separate phase already decided by Riccardo.

## Verification

- Tests of the server and the web as before, plus: the keys and placeholders of the packages, the prompts of every language present, the English language rules on their examples (announcement in the third person, "me too" as a dependency, English phrases, SRD abilities from English words).
- English game with the full server: `apps/server/test/partita-en.test.ts` (campaign `test/fixtures/campagne/en-mini`, script `test/fixtures/copione-en.txt`). E2E: `apps/web/e2e/lingua-en.spec.ts` (the start command is at the top of the file): three turns in English, English interface on phone, projector and panel, fake voice.
