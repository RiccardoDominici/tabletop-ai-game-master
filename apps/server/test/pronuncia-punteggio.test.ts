/**
 * The scoring of the pronunciation round trip (strumenti/pronuncia/punteggio.ts): phonetic keys, the name taken
 * out of the carrier sentence, and the score against the intended sound.
 */
import { describe, expect, it } from 'vitest';
import { chiaveFonetica, estraiNome, somiglianza, valuta } from '../../../strumenti/pronuncia/punteggio';
import { leggiProposte, maiuscolaComeIlNome } from '../../../strumenti/pronuncia/proposte';

describe('pronunciation scoring', () => {
  it('phonetic keys join spellings of the same sound', () => {
    expect(chiaveFonetica('Dzirrà', 'it')).toBe(chiaveFonetica('Zirra', 'it'));
    expect(chiaveFonetica('Eliàndro', 'it')).toBe(chiaveFonetica('Eliandro', 'it'));
    expect(chiaveFonetica('Chiara', 'it')).not.toBe(chiaveFonetica('Ciara', 'it'));
    expect(chiaveFonetica('NEEV', 'en')).toBe(chiaveFonetica('Niv', 'en'));
    expect(chiaveFonetica('KOOM-tyth', 'en')).toBe(chiaveFonetica('Coomtith', 'en'));
  });

  it('takes the name out of the carrier sentence', () => {
    const portante = 'Stasera parliamo di {nome}, poi andiamo.';
    expect(estraiNome('Stasera parliamo di Zirrà, poi andiamo.', portante, 'it')).toBe('Zirrà');
    expect(estraiNome('stasera parliamo di zirra poi andiamo', portante, 'it')).toBe('zirra');
    expect(estraiNome('Stasera parliamo di Eli Andro, poi andiamo.', portante, 'it')).toBe('Eli Andro');
    expect(estraiNome('I spoke with Neve last night.', 'I spoke with {nome} last night.', 'en')).toBe('Neve');
  });

  it('scores against the intended sound; the written name only when Whisper writes it back exactly', () => {
    const portante = 'I spoke with {nome} last night.';
    const giusto = valuta('I spoke with Neve last night.', portante, 'neev', 'Niamh', 'en');
    const ingenuo = valuta('I spoke with Nee Am last night.', portante, 'neev', 'Niamh', 'en');
    expect(giusto.sentito).toBe('Neve');
    expect(giusto.punteggio).toBeGreaterThan(ingenuo.punteggio + 0.2);
    expect(valuta('I spoke with Niamh last night.', portante, 'neev', 'Niamh', 'en').punteggio).toBe(1);
    expect(somiglianza('Dzirrà', 'Zirra', 'it')).toBe(1);
  });
});

describe('proposals of respellings', () => {
  it('capitalise like the name and drop case-only duplicates', () => {
    expect(maiuscolaComeIlNome('Ugo', ['ugo', 'Ùgo', 'ùgo', 'Hugo'])).toEqual(['Ugo', 'Ùgo', 'Hugo']);
    expect(maiuscolaComeIlNome('Aoibheann', ['ee-VAWN', 'ee-vawn', 'EE-vawn'])).toEqual(['ee-VAWN', 'Ee-vawn', 'EE-vawn']);
    expect(leggiProposte('```json\n[{"nome": "Berta", "suono": "berta", "candidate": ["Bèrta", "bèrta", "[x] B"]}]\n```')).toEqual([{ nome: 'Berta', suono: 'berta', candidate: ['Bèrta'] }]);
  });
});

describe('reading the model answer', () => {
  it('survives a broken list, and marks words that are not proper nouns', () => {
    const rotta = '[{"nome": "Ilde", "suono": "ilde", "candidate": ["Ìlde"]}, {"nome": "Signora", "non_nome": true}, {"nome": "Tecla", "candidate": ["Tècla"],}]';
    expect(leggiProposte(rotta)).toEqual([
      { nome: 'Ilde', suono: 'ilde', candidate: ['Ìlde'] },
      { nome: 'Signora', suono: '', candidate: [], nonNome: true },
    ]);
  });
});
