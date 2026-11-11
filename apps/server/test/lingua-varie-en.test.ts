/**
 * Frasi fisse «varie» nella lingua dei contenuti (lingue/<codice>/testi-varie.yaml, docs/lingue.md): motivi
 * dei segnali audio e blocco «Audio» del contesto, errori dello schema detti al modello nel ritentativo,
 * descrizione della CA composta quando la si legge, nome del tipo di danno sulle carte. E il caricatore,
 * che divide le frasi dell'apertura con le abbreviazioni della lingua della campagna anche prima che il
 * server imposti la lingua attiva. L'italiano resta quello di sempre (lo controllano gli altri test).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { CatalogoAudio } from '../src/audio/catalogo';
import { bloccoAudioContesto, risolviEffetto, risolviUmore } from '../src/audio/cue';
import { caricaCampagna } from '../src/campagna/caricatore';
import { leggiScheda } from '../src/campagna/schede';
import { impostaLingua, linguaAttiva } from '../src/lingua';
import { erroriSchema, estraiJson } from '../src/llm/strutturato';
import { dannoMostrato } from '../src/prove/testi';

const cat = new CatalogoAudio(path.join(import.meta.dirname, 'fixtures', 'audio'));
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');

afterEach(() => impostaLingua('it'));

describe('segnali audio in inglese', () => {
  it('i motivi di un rifiuto e il blocco di contesto', () => {
    impostaLingua('en');
    expect(risolviUmore('tensione', cat)).toMatchObject({ ok: false, motivo: expect.stringMatching(/^mood «tensione» is not in the vocabulary \(esplorazione_tesa, .*, auto\)$/) });
    expect(risolviEffetto('tuono', cat)).toEqual({ ok: false, motivo: 'effect «tuono» is not in the campaign catalogue' });
    expect(risolviEffetto('trombone', cat)).toEqual({ ok: false, motivo: 'unknown effect «trombone»' });
    expect(risolviEffetto('', cat)).toEqual({ ok: false, motivo: 'empty effect' });
    const blocco = bloccoAudioContesto(cat).split('\n');
    expect(blocco[0]).toBe('## Audio: [umore] and [effetto] lines');
    expect(blocco[1]).toMatch(/^- Moods: .*, auto \(back to the music of the place\)\.$/);
    expect(blocco[2]).toBe('- Effects: campana, porta.');
  });
});

describe('uscita strutturata: errori per il ritentativo', () => {
  const schema = { type: 'object', properties: { scelta: { type: 'string', enum: ['a', 'b'] } }, required: ['scelta'], additionalProperties: false };

  it('in italiano come prima, in inglese nella lingua dei contenuti', () => {
    expect(erroriSchema(schema, { altro: 1 })).toEqual(['$.scelta: manca', '$.altro: campo non previsto']);
    impostaLingua('en');
    expect(erroriSchema(schema, { altro: 1 })).toEqual(['$.scelta: missing', '$.altro: unexpected field']);
    expect(erroriSchema(schema, { scelta: 'c' })).toEqual(['$.scelta: value "c" is not one of ["a","b"]']);
    expect(erroriSchema({ type: 'array', items: { type: 'integer' }, maxItems: 1 }, [1, 2.5])).toEqual(['$[1]: expected integer, found number', '$: more than 1 items']);
    expect(() => estraiJson('no braces')).toThrow('no JSON object in the answer');
  });
});

describe('CA della scheda: descritta quando la si legge', () => {
  const scheda = (s: Record<string, unknown>) => leggiScheda('pg_ida', 'Ida', false, { caratteristiche: { destrezza: 14 }, pf: 10, ...s }, 1)!;

  it('nella lingua attiva al momento della lettura, non del caricamento', () => {
    const maglia = scheda({ armatura: { tipo: 'cotta_di_maglia', scudo: true } });
    const nuda = scheda({ scudo: true });
    const scritta = scheda({ ca: 14 });
    expect([maglia.ca_da, nuda.ca_da, scritta.ca_da]).toEqual(['Cotta di maglia + scudo', 'senza armatura + scudo', 'scritta nella scheda']);
    impostaLingua('en');
    expect([maglia.ca_da, nuda.ca_da, scritta.ca_da]).toEqual(['Chain Mail + shield', 'no armor + shield', 'written in the sheet']);
    expect(JSON.parse(JSON.stringify(nuda)).ca_da).toBe('no armor + shield');
  });
});

describe('danno sulle carte: nome del tipo nella lingua dei contenuti', () => {
  it('il plurale dopo il totale (it) e il nome inglese (en)', () => {
    const d = { formula: '1d8+2', dadi: [6], bonus: 2, totale: 8 };
    expect(dannoMostrato({ ...d, tipo: 'perforante' }).nome_tipo).toBe('perforanti');
    expect(dannoMostrato({ ...d, tipo: 'fuoco' }).nome_tipo).toBe('da fuoco');
    expect(dannoMostrato({ ...d, tipo: null }).nome_tipo).toBeNull();
    impostaLingua('en');
    expect(dannoMostrato({ ...d, tipo: 'perforante' })).toEqual({ ...d, tipo: 'perforante', nome_tipo: 'piercing' });
    expect(dannoMostrato({ ...d, tipo: 'fuoco' }).nome_tipo).toBe('fire');
  });
});

describe('caricatore: frasi nella lingua della campagna', () => {
  const copie: string[] = [];
  afterAll(() => {
    for (const c of copie) fs.rmSync(c, { recursive: true, force: true });
  });

  /** La campagna mini con un'apertura inglese che ha un'abbreviazione solo inglese («Sgt.»). */
  function copia(lingua: string | null): string {
    const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-lingua-'));
    copie.push(cartella);
    fs.cpSync(MINI, cartella, { recursive: true });
    const scena = path.join(cartella, 'scena.yaml');
    fs.writeFileSync(scena, fs.readFileSync(scena, 'utf8').replace(/^apertura: .*$/m, 'apertura: "Sgt. Hale opens the door. The rain stops."'));
    if (lingua) fs.appendFileSync(path.join(cartella, 'campagna.yaml'), `\nlingua: ${lingua}\n`);
    return cartella;
  }

  it('lingua: en in campagna.yaml, anche con la lingua attiva italiana', () => {
    expect(linguaAttiva()).toBe('it');
    const c = caricaCampagna(copia('en'));
    expect(c.lingua).toBe('en');
    // La prima scena legge prima il riassunto iniziale (una frase): l'apertura è il resto.
    expect(c.scena.apertura.slice(-2)).toEqual(['Sgt. Hale opens the door.', 'The rain stops.']);
    expect(c.scena.apertura).not.toContain('Sgt.');
  });

  it('senza lingua nella campagna vale quella della configurazione', () => {
    const c = caricaCampagna(copia(null), undefined, { linguaConfigurazione: 'en' });
    expect(c.lingua).toBeNull();
    expect(c.scena.apertura.slice(-2)).toEqual(['Sgt. Hale opens the door.', 'The rain stops.']);
    // Senza nessuna delle due, la lingua attiva (italiano): «Sgt.» chiude la frase.
    expect(caricaCampagna(copia(null)).scena.apertura.slice(-3)).toEqual(['Sgt.', 'Hale opens the door.', 'The rain stops.']);
  });
});
