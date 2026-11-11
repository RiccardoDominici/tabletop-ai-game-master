/**
 * The pronunciation lexicon (docs/pronuncia.md): campagne/<id>/pronunce.yaml, the cards' `pronuncia` field and
 * the names added during play, applied only to the text sent to the voice.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { testoPerVoce } from '../src/voce/cache-audio';
import { candidatiNomi, estraiPronunce, LessicoVivo } from '../src/voce/lessico-vivo';
import { creaPronunciatore, FILE_LESSICO, FILE_LESSICO_GIOCO, pronunciatoreDa, stileQwen, vociDellaCampagna } from '../src/voce/pronuncia';
import type { NomeMotoreVoce } from '../src/voce/tipi';

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'campagne');
const cartelle: string[] = [];
afterEach(() => {
  for (const c of cartelle.splice(0)) fs.rmSync(c, { recursive: true, force: true });
});

/** A copy of a fixture campaign with a lexicon. */
function conLessico(base: string, lessico: unknown[]): string {
  const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-pronuncia-'));
  cartelle.push(radice);
  const dest = path.join(radice, base);
  fs.cpSync(path.join(FIXTURE, base), dest, { recursive: true });
  fs.writeFileSync(path.join(dest, FILE_LESSICO), YAML.stringify({ lessico }));
  return dest;
}

const LESSICO_IT = [
  { nome: 'Zirrà', tipo: 'luogo', it: { grafia: 'Dzirrà', nota: "z sonora, accento sull'ultima", forme: { Zirrani: 'Dzirràni', zirrana: 'dzirràna' } }, en: { grafia: 'Dzeer-RAH', forme: { Zirrans: 'DZEER-rahns' } } },
  { nome: 'Eliandro', tipo: 'png', it: { grafia: 'Eliàndro' } },
  { nome: 'Torre Mozza', tipo: 'luogo', it: { grafia: 'Tòrre Mòzza' } },
  { nome: 'Mozza', tipo: 'luogo', it: { grafia: 'MOZZA_CORTA' } },
  { nome: 'Sasso', tipo: 'luogo', solo_maiuscolo: true, it: { grafia: 'Sàsso' } },
  { nome: 'Velka', tipo: 'dio', en: { grafia: 'VEL-kah' } }, // only English: not used in an Italian campaign
];

describe('pronunciation lexicon', () => {
  it('replaces whole words, inflected forms, the unaccented form and lowercase player spellings', () => {
    const p = creaPronunciatore(caricaCampagna(conLessico('mini', LESSICO_IT)));
    expect(p('Andiamo a Zirrà, dove vive Eliandro.')).toBe('Andiamo a Dzirrà, dove vive Eliàndro.');
    expect(p('I Zirrani e una donna zirrana.')).toBe('I Dzirràni e una donna dzirràna.');
    expect(p('chiedo a eliandro della zirra')).toBe('chiedo a Eliàndro della Dzirrà');
    expect(p("La lettera dell'Eliandro.")).toBe("La lettera dell'Eliàndro.");
    expect(p('Eliandrone e Zirràvia restano.')).toBe('Eliandrone e Zirràvia restano.');
  });

  it('multi-word names win over their parts, and a respelling is never rewritten', () => {
    const p = creaPronunciatore(caricaCampagna(conLessico('mini', LESSICO_IT)));
    expect(p('La Torre Mozza e la Mozza.')).toBe('La Tòrre Mòzza e la MOZZA_CORTA.');
    expect(p('Torre\nMozza')).toBe('Tòrre Mòzza');
    expect(p(p('Torre Mozza a Zirrà'))).toBe('Tòrre Mòzza a Dzirrà');
  });

  it('solo_maiuscolo keeps a name that is also an ordinary word', () => {
    const p = creaPronunciatore(caricaCampagna(conLessico('mini', LESSICO_IT)));
    expect(p('Al Sasso tira un sasso.')).toBe('Al Sàsso tira un sasso.');
  });

  it('uses the campaign language: English respellings and the possessive', () => {
    const p = creaPronunciatore(caricaCampagna(conLessico('en-mini', LESSICO_IT)));
    expect(p("Zirrà's walls, the Zirrans' songs and the temple of Velka.")).toBe("Dzeer-RAH's walls, the DZEER-rahns' songs and the temple of VEL-kah.");
    expect(p('Eliandro waits.')).toBe('Eliandro waits.'); // no English entry
  });

  it('keeps the cards’ `pronuncia` field (capitalised whole words) and lets the lexicon override it', () => {
    const mini = caricaCampagna(path.join(FIXTURE, 'mini'));
    expect(creaPronunciatore(mini)('Bruno e il mantello bruno.')).toBe('Brùno e il mantello bruno.');
    const p = creaPronunciatore(caricaCampagna(conLessico('mini', [{ nome: 'Bruno', it: { grafia: 'BRU-no' } }])));
    expect(p('Bruno guarda Oste Bruno.')).toBe('BRU-no guarda Òste BRU-no.');
  });

  it('never touches what is shown: testoPerVoce keeps the written name on screen', () => {
    const p = creaPronunciatore(caricaCampagna(conLessico('mini', LESSICO_IT)));
    const { mostrato, voce } = testoPerVoce('narratore', 'Eliandro arriva da Zirrà.', p);
    expect(mostrato).toBe('Eliandro arriva da Zirrà.');
    expect(voce).toBe('Eliàndro arriva da Dzirrà.');
  });

  it('an empty lexicon is the identity', () => {
    expect(pronunciatoreDa([], 'it')('Zirrà')).toBe('Zirrà');
  });
});

describe('respelling per voice engine', () => {
  // As measured by the ear test (docs/pronuncia.md): Qwen spells «VAWN» out like an acronym, «KAD» it reads.
  const LESSICO_EN = [
    { nome: 'Aoibheann', tipo: 'pg', en: { grafia: 'ee-VAWN' } },
    { nome: 'Cadwgan', tipo: 'pg', en: { grafia: 'KAD-oo-gan', motori: { qwen: 'KAD-oo-gan' } } },
    { nome: 'Niamh', tipo: 'png', en: { grafia: 'NEEV', motori: { fish: 'NEE-uv' } } },
  ];

  it('Qwen default style: capitalised syllables of a hyphenated respelling become lowercase', () => {
    expect(stileQwen('ee-VAWN')).toBe('Ee-vawn');
    expect(stileQwen('KAD-oo-gan')).toBe('Kad-oo-gan');
    expect(stileQwen('NEEV')).toBe('NEEV');
    expect(stileQwen('Tòrre Mòzza')).toBe('Tòrre Mòzza');
  });

  it('each engine gets its own form: explicit `motori` first, then the Qwen style, else `grafia`', () => {
    const c = caricaCampagna(conLessico('en-mini', LESSICO_EN));
    const frase = 'Aoibheann and Cadwgan meet Niamh.';
    expect(creaPronunciatore(c, 'fish')(frase)).toBe('ee-VAWN and KAD-oo-gan meet NEE-uv.');
    expect(creaPronunciatore(c, 'qwen')(frase)).toBe('Ee-vawn and KAD-oo-gan meet NEEV.');
    expect(creaPronunciatore(c, 'mock')(frase)).toBe('ee-VAWN and KAD-oo-gan meet NEEV.');
    expect(creaPronunciatore(c)(frase)).toBe('ee-VAWN and KAD-oo-gan meet NEEV.');
  });

  it('the live lexicon follows the engine in use, and the screen text never changes', () => {
    let motore: NomeMotoreVoce = 'fish';
    const lessico = new LessicoVivo({ campagna: caricaCampagna(conLessico('en-mini', LESSICO_EN)), log: loggerMuto(), motore: () => motore });
    expect(lessico.pronuncia('Aoibheann waits.')).toBe('ee-VAWN waits.');
    motore = 'qwen'; // e.g. the selector fell back from drama-3 to the local voice
    expect(lessico.pronuncia('Aoibheann waits.')).toBe('Ee-vawn waits.');
    expect(lessico.per('fish')('Aoibheann waits.')).toBe('ee-VAWN waits.'); // audio prepared for drama-3
    const { mostrato, voce } = testoPerVoce('narratore', 'Aoibheann waits.', lessico.pronuncia);
    expect([mostrato, voce]).toEqual(['Aoibheann waits.', 'Ee-vawn waits.']);
  });
});

describe('names added during play', () => {
  it('finds capitalised unknown words in mid-sentence, not sentence openings or known names', () => {
    const noti = new Set(['eliandro', 'zirrà']);
    expect(candidatiNomi(['Mara Quill: Chiedo a Eliandro di Zorvak e della torre di Ombrafonda.', 'Narratore: Dove? Lontano.'], noti)).toEqual(['Zorvak', 'Ombrafonda']);
    expect(candidatiNomi(["Mara: I ask about Qeth's sword. Then I leave."], new Set())).toEqual(['Qeth']);
  });

  it('reads the sceneggiatore’s `pronunce` and adds only checked names, persisted and live', () => {
    const cartella = conLessico('mini', LESSICO_IT);
    const campagna = caricaCampagna(cartella);
    const lessico = new LessicoVivo({ campagna, log: loggerMuto() });
    const p = lessico.pronuncia;
    expect(lessico.daChiedere(['Mara: Chiedo a Eliandro di Zorvak.'])).toEqual(['Zorvak']);
    const proposte = estraiPronunce(
      [
        '```yaml',
        'battute: []',
        'pronunce:',
        '  - {nome: Zorvak, grafia: Dzòrvak, nota: z sonora}',
        '  - {nome: Eliandro, grafia: ELI-andro}', // already prepared: never changed
        '  - {nome: Qwyx, grafia: Kwiks}', // not asked, not in the lines
        '  - {nome: Brann, grafia: "[sigh] Bran"}', // voice markup
        '```',
      ].join('\n'),
    );
    expect(proposte.map((x) => x.nome)).toEqual(['Zorvak', 'Eliandro', 'Qwyx', 'Brann']);
    expect(lessico.aggiungi(proposte, { ammessi: 'Zorvak Brann', turno: 3, fonte: 'sceneggiatore' })).toEqual(['Zorvak']);
    expect(p('Zorvak e Eliandro.')).toBe('Dzòrvak e Eliàndro.');
    const scritto = YAML.parse(fs.readFileSync(path.join(cartella, FILE_LESSICO_GIOCO), 'utf8')) as { lessico: Array<Record<string, unknown>> };
    expect(scritto.lessico).toEqual([{ nome: 'Zorvak', it: { grafia: 'Dzòrvak', nota: 'z sonora' }, origine: { fonte: 'sceneggiatore', turno: 3 }, verificata: false }]);
    // A new server reads it back; the name is no longer asked.
    expect(vociDellaCampagna(caricaCampagna(cartella)).find((v) => v.nome === 'Zorvak')).toMatchObject({ fonte: 'gioco', grafia: 'Dzòrvak' });
    expect(new LessicoVivo({ campagna: caricaCampagna(cartella), log: loggerMuto() }).daChiedere(['Mara: Chiedo di Zorvak.'])).toEqual([]);
  });

  it('stops asking a name the sceneggiatore ignores', () => {
    const lessico = new LessicoVivo({ campagna: caricaCampagna(conLessico('mini', [])), log: loggerMuto() });
    const riga = ['Mara: Parlo con Gorm.'];
    expect(lessico.daChiedere(riga)).toEqual(['Gorm']);
    expect(lessico.daChiedere(riga)).toEqual(['Gorm']);
    expect(lessico.daChiedere(riga)).toEqual([]);
  });
});
