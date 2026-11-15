/**
 * Dictation from the phones (docs/ascolto.md): phonetic key, vocabulary, Whisper prompt, post-correction of the
 * campaign names and learning from the players' edits. Invented fixture names only (CLAUDE.md, «Framework principle»):
 * the real campaigns are measured by the round trip (strumenti/ascolto/giro.ts), not here.
 */
import { describe, expect, it } from 'vitest';
import { impara } from '../src/dettato/apprendimento';
import { chiaveRifiuto, correggi, type Correzione } from '../src/dettato/correzione';
import { chiaveFonetica, somiglianzaFonetica } from '../src/dettato/fonetica';
import { linguaDettato, paroleComuni, paroleMinuscole } from '../src/dettato/lingua';
import { costruisciPrompt, stimaToken } from '../src/dettato/prompt';
import { costruisciVocabolario, paroleDi, type FontiVocabolario } from '../src/dettato/vocabolario';
import type { VoceLessico } from '../src/voce/pronuncia';

/** Texts of an invented campaign: its lowercase words are ordinary words (rocca, grumo, fonda…). */
const TESTI_IT = [
  'La rocca sgretolata domina la valle. Un grumo di fango copre il sentiero.',
  'Zelmira custodisce la chiave della rocca; Odorico porta il carro fino a Valfonda, alla Rocca Sgretolata.',
  'Il vecchio mugnaio parla piano, guarda la ruota del mulino e conta i sacchi di farina.',
];
const LESSICO_IT: VoceLessico[] = [
  { nome: 'Zelmira', tipo: 'png', it: { grafia: 'Dzelmìra' } },
  { nome: 'Odorico', tipo: 'png', it: { grafia: 'Odorìco' } },
  { nome: 'Grumo', tipo: 'png', solo_maiuscolo: true, it: { grafia: 'Grùmo' } },
  { nome: 'Valfonda', tipo: 'luogo', it: { grafia: 'Valfónda', suono: 'valfonda' } },
  { nome: 'Rocca Sgretolata', tipo: 'luogo', it: { grafia: 'Ròcca Sgretolàta' } },
  // Never said at the table: must stay out of prompt and correction (a spoiler otherwise).
  { nome: 'Morgaldo', tipo: 'png', it: { grafia: 'Morgàldo' } },
];
const DETTI_IT = new Set(paroleDi(TESTI_IT.slice(0, 2).join(' ')));

function fontiIt(extra: Partial<FontiVocabolario> = {}): FontiVocabolario {
  return {
    lingua: 'it',
    pg: [{ nome: 'Ninfa Rovere', mio: true }, { nome: 'Bastiano' }, { nome: 'Teobaldo' }],
    png: [
      { nome: 'Zelmira', presente: true },
      { nome: 'Odorico', presente: false },
      { nome: 'Grumo', presente: true, alias: ['mugnaio'] },
    ],
    appresi: [],
    lessico: LESSICO_IT,
    menzionato: (w) => DETTI_IT.has(w),
    termini: ['Destrezza', 'Percezione'],
    ...extra,
  };
}

const comuniIt = paroleComuni('it', TESTI_IT);
const vociIt = costruisciVocabolario(fontiIt());
const corr = (t: string, extra: { rifiutate?: Set<string> } = {}) => correggi(t, { lingua: 'it', voci: vociIt, comuni: comuniIt, ...extra });

describe('phonetic key', () => {
  it('merges the Italian spellings of one sound', () => {
    expect(chiaveFonetica('Zorrà', 'it')).toBe(chiaveFonetica('Tsora', 'it'));
    expect(chiaveFonetica('Faggioli', 'it')).toBe(chiaveFonetica('fagioli', 'it'));
    expect(chiaveFonetica('Chiara', 'it')).toBe(chiaveFonetica('Kiara', 'it'));
    expect(chiaveFonetica('Gnocco', 'it')).toBe(chiaveFonetica('Niocco', 'it'));
    expect(chiaveFonetica('Val di Rame', 'it')).toBe(chiaveFonetica('Valdirame', 'it'));
    expect(chiaveFonetica('Hilda', 'it')).toBe(chiaveFonetica('Ilda', 'it'));
  });
  it('merges the English spellings of one sound', () => {
    expect(chiaveFonetica('Philippa', 'en')).toBe(chiaveFonetica('Filipa', 'en'));
    expect(chiaveFonetica('Neeve', 'en')).toBe(chiaveFonetica('Niev', 'en'));
    expect(chiaveFonetica('Kael', 'en')).toBe(chiaveFonetica('Cael', 'en'));
  });
  it('scores close sounds above distant ones', () => {
    expect(somiglianzaFonetica('Zelmira', 'Selmira', 'it')).toBeGreaterThan(0.85);
    expect(somiglianzaFonetica('Odorico', 'Odorigo', 'it')).toBeGreaterThan(0.85);
    expect(somiglianzaFonetica('Ugo', 'uno', 'it')).toBeLessThan(0.5);
    expect(somiglianzaFonetica('pane', 'cane', 'it')).toBeLessThan(0.7);
  });
});

describe('vocabulary', () => {
  it('puts the speaker first, then the other PCs, the NPCs in the scene, and the names said at the table', () => {
    const nomi = vociIt.map((v) => v.scritto);
    expect(nomi.slice(0, 3)).toEqual(['Ninfa Rovere', 'Ninfa', 'Rovere']);
    expect(nomi.indexOf('Zelmira')).toBeLessThan(nomi.indexOf('Odorico'));
    expect(nomi).toContain('Valfonda');
    expect(nomi).toContain('Rocca Sgretolata');
  });
  it('keeps names never said at the table out (no spoilers)', () => {
    expect(vociIt.map((v) => v.scritto)).not.toContain('Morgaldo');
  });
  it('takes the heard forms from the lexicon respellings', () => {
    const z = vociIt.find((v) => v.scritto === 'Zelmira')!;
    expect(z.sentiti).toContain('Dzelmìra');
    expect(vociIt.find((v) => v.scritto === 'Grumo')!.soloMaiuscolo).toBe(true);
    expect(vociIt.find((v) => v.scritto === 'Destrezza')!.correggibile).toBe(false);
  });
});

describe('prompt', () => {
  const modelli = linguaDettato('it').prompt;
  it('is a sentence in the play language with the characters first', () => {
    const p = costruisciPrompt(vociIt, modelli);
    expect(p.startsWith(modelli.inizio)).toBe(true);
    expect(p).toContain('Personaggi: Ninfa Rovere, Bastiano, Teobaldo, Zelmira');
    expect(p).toMatch(/Nomi: .*Valfonda/);
    expect(p).not.toContain('Morgaldo');
    // «Ninfa» alone is inside «Ninfa Rovere»: listed once.
    expect(p.match(/Ninfa/g)).toHaveLength(1);
  });
  it('stays under the token budget, cutting the least relevant names', () => {
    const molti = costruisciVocabolario(fontiIt({ appresi: Array.from({ length: 80 }, (_, i) => ({ scritto: `Nomeinventato${i}`, sentiti: [], turno: 1 })) }));
    const p = costruisciPrompt(molti, modelli, 120);
    expect(stimaToken(p)).toBeLessThanOrEqual(120);
    expect(p).toContain('Ninfa Rovere');
    expect(p).not.toContain('Nomeinventato79');
  });
});

describe('correction: true positives', () => {
  const casi: Array<[string, string]> = [
    ['Chiedo a Selmira se ha visto Odorico.', 'Chiedo a Zelmira se ha visto Odorico.'],
    ['Dico a Odorigo di fermare il carro.', 'Dico a Odorico di fermare il carro.'],
    ['Vado verso Val Fonda con Bastiano.', 'Vado verso Valfonda con Bastiano.'],
    ['Seguo Bastiàno e Teobaldo.', 'Seguo Bastiano e Teobaldo.'],
    ['Aiuto Ninfa Rovére a salire.', 'Aiuto Ninfa Rovere a salire.'],
    ['Chiedo a Grumo del mulino.', 'Chiedo a Grumo del mulino.'],
    ['Guardo Teobaldi negli occhi.', 'Guardo Teobaldo negli occhi.'],
    ['Torno alla Rocca Sgretolatta.', 'Torno alla Rocca Sgretolata.'],
    ["Prendo la lettera dell'Odorigo.", "Prendo la lettera dell'Odorico."],
    ['Bastiàno sale per primo.', 'Bastiano sale per primo.'],
  ];
  for (const [detto, atteso] of casi) {
    it(`«${detto}»`, () => expect(corr(detto).testo).toBe(atteso));
  }
  it('reports every replacement', () => {
    const r = corr('Chiedo a Selmira se ha visto Odorigo.');
    expect(r.correzioni).toEqual([
      { sentito: 'Selmira', scritto: 'Zelmira', motivo: 'fonetica', punteggio: expect.any(Number) },
      { sentito: 'Odorigo', scritto: 'Odorico', motivo: 'fonetica', punteggio: expect.any(Number) },
    ]);
  });
});

describe('correction: no false positives', () => {
  const ordinarie = [
    'Prendo la spada e attacco il lupo.',
    'Il grumo di fango non si stacca dalla ruota.',
    'Guardo dentro la rocca e cerco una porta.',
    'Chiedo al vecchio mugnaio quanta farina gli resta.',
    'Bastone alla mano, scendo verso il fiume.',
    'Vorrei sapere chi ha scritto la lettera e perché.',
    'Mi nascondo dietro il carro e aspetto che passino.',
    'Provo a calmare i cani con un pezzo di pane.',
    'Salgo sulla torre, poi guardo verso la valle.',
    'Ninfa, aspettami: arrivo subito.',
    // Ordinary words a name can sound like, lowercase or at the start of a sentence: no evidence of a name.
    'Non bastano mai.',
    'Bastano due passi e sei fuori.',
    'parlo con zelmira della chiave',
    'Teobaldi',
    'Dico che non ci credo e me ne vado.',
    'Con calma, tiro fuori la mappa e la mostro a tutti.',
  ];
  for (const t of ordinarie) it(`«${t}»`, () => expect(corr(t)).toEqual({ testo: t, correzioni: [] }));
  it('leaves an ambiguous span alone', () => {
    const voci = costruisciVocabolario({ ...fontiIt(), pg: [{ nome: 'Marta' }, { nome: 'Marto' }], png: [], lessico: [] });
    expect(correggi('Guardo Marti.', { lingua: 'it', voci, comuni: comuniIt }).testo).toBe('Guardo Marti.');
  });
  it('never proposes again a pair the player undid', () => {
    expect(corr('Chiedo a Selmira.', { rifiutate: new Set([chiaveRifiuto('Selmira', 'Zelmira')]) }).testo).toBe('Chiedo a Selmira.');
  });
  it('treats the words of the campaign texts as ordinary', () => {
    expect(paroleMinuscole(TESTI_IT).has('rocca')).toBe(true);
    expect(comuniIt.has('grumo')).toBe(true);
    expect(comuniIt.has('zelmira')).toBe(false);
  });
});

describe('correction: English', () => {
  const testiEn = ['The old miller watches the wheel turn. A rose grows by the gate of the keep.'];
  const comuniEn = paroleComuni('en', testiEn);
  const voci = costruisciVocabolario({
    lingua: 'en',
    pg: [{ nome: 'Aisling Cray', mio: true }, { nome: 'Corwen' }],
    png: [{ nome: 'Rose', presente: true }, { nome: 'Thaddeus Quill', presente: true }],
    appresi: [],
    lessico: [{ nome: 'Niamh', tipo: 'png', en: { grafia: 'NEEV' } }, { nome: 'Rose', tipo: 'png', solo_maiuscolo: true, en: { grafia: 'Rose' } }],
    menzionato: () => true,
  });
  const c = (t: string) => correggi(t, { lingua: 'en', voci, comuni: comuniEn }).testo;
  it('fixes respelled names', () => {
    expect(c('I ask Thadeus Quil about the key.')).toBe('I ask Thaddeus Quill about the key.');
    expect(c('I follow Corwin to the gate.')).toBe('I follow Corwen to the gate.');
    expect(c('I tell Neve to wait.')).toBe('I tell Niamh to wait.');
  });
  it('leaves ordinary English alone', () => {
    for (const t of ['I pick a rose by the gate.', 'I watch the wheel turn and wait.', 'Can I climb the wall quietly?', 'I draw my sword and attack the wolf.']) expect(c(t)).toBe(t);
  });
});

describe('learning from the edits', () => {
  const base = { lingua: 'it' as const, voci: vociIt, comuni: comuniIt, turno: 4 };
  it('learns a retyped name with what was heard', () => {
    const r = impara({ ...base, trascrizione: 'Chiedo a Sorvac della torre.', inviato: 'Chiedo a Zorvak della torre.' });
    expect(r.appresi).toEqual([{ scritto: 'Zorvak', sentiti: ['Sorvac'], turno: 4 }]);
  });
  it('maps back to Whisper’s raw form when the player fixed a server correction', () => {
    const correzioni: Correzione[] = [{ sentito: 'Selmira', scritto: 'Zelmira', motivo: 'fonetica', punteggio: 0.9 }];
    const r = impara({ ...base, trascrizione: 'Parlo con Zelmira.', correzioni, inviato: 'Parlo con Zelmina.' });
    expect(r.appresi).toEqual([{ scritto: 'Zelmina', sentiti: ['Selmira'], turno: 4 }]);
  });
  it('records a correction the player turned back', () => {
    const correzioni: Correzione[] = [{ sentito: 'Selmira', scritto: 'Zelmira', motivo: 'fonetica', punteggio: 0.9 }];
    const r = impara({ ...base, trascrizione: 'Parlo con Zelmira.', correzioni, inviato: 'Parlo con Selmira.' });
    expect(r.rifiutate).toEqual([chiaveRifiuto('Selmira', 'Zelmira')]);
    expect(r.appresi).toEqual([]);
  });
  it('does not learn a rewrite or an ordinary word', () => {
    expect(impara({ ...base, trascrizione: 'Attacco il lupo.', inviato: 'Scappo dal lupo.' }).appresi).toEqual([]);
    expect(impara({ ...base, trascrizione: 'Chiedo al mostro.', inviato: 'Chiedo a Zorvak.' }).appresi.map((a) => a.sentiti)).toEqual([[]]);
  });
  it('learns a new proper noun from a typed action, not a known name nor a sentence start', () => {
    const r = impara({ ...base, inviato: 'Racconto a Zelmira la storia di Brunilde. Poi aspetto.' });
    expect(r.appresi.map((a) => a.scritto)).toEqual(['Brunilde']);
  });
  it('a learned name is corrected in the next dictation', () => {
    const r = impara({ ...base, trascrizione: 'Chiedo a Sorvac della torre.', inviato: 'Chiedo a Zorvak della torre.' });
    const voci = costruisciVocabolario(fontiIt({ appresi: r.appresi }));
    const dopo = correggi('Seguo sorvac fino al ponte.', { lingua: 'it', voci, comuni: comuniIt });
    expect(dopo.testo).toBe('Seguo Zorvak fino al ponte.');
    expect(dopo.correzioni[0]!.motivo).toBe('appreso');
    expect(costruisciPrompt(voci, linguaDettato('it').prompt)).toContain('Zorvak');
  });
});
