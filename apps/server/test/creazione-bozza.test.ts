/**
 * Creation at the table, the draft's rules (docs/creazione.md; creazione/azioni.ts, bozza.ts, vista.ts; audit C-CRE-01,
 * 02, 04, 06, 07, X-OPT-01, 02): the steps in the set's order, manual dice checked (count and faces), the Game Master's
 * options, races and classes refused with their reason, hit points, money, purchases with the Engine's own inventory
 * (price, change, load, AC), the starting book, languages, the hopeless character, undoing a step. On the invented
 * fucina fixture; no server.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AzioneCreazione } from '@tabletop-ai-gm/shared';
import { caricaRegole } from '../src/regole/caricatore';
import { annullaPasso, applica } from '../src/creazione/azioni';
import { nuovaBozza, type Bozza, type CtxCreazione, type OpzioniCampagnaCreazione } from '../src/creazione/bozza';
import { vistaBozza } from '../src/creazione/vista';
import { voceDelPg } from '../src/creazione/voce';
import { DadiCrittografici } from '../src/prove/dadi';

const FUCINA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'fucina');
const regole = caricaRegole(FUCINA);

function ctx(opz: Partial<OpzioniCampagnaCreazione> = {}, manuale = true): CtxCreazione {
  const s = regole.sistema;
  expect(s.id).toBe('fucina-prova');
  return { s, cr: s.creazione!, manuale, opz: { modo: 'entrambi', metodo: null, opzioni: ['scambio_punti', 'scambio'], rimedi: null, puntiFerita: null, livello: null, incantesimi: null, ...opz } };
}

function nuova(c: CtxCreazione): Bozza {
  return nuovaBozza('cr_prova', 'telefono_di_prova_1', '00112233445566778899aabbccddeeff', new Date('2026-11-22T10:00:00Z'));
}

const dadi = (b: Bozza) => () => new DadiCrittografici(b.seme, b.contatore);

/** Applies an action and fails the test with the refusal's text when it is refused. */
function fai(c: CtxCreazione, b: Bozza, a: AzioneCreazione): void {
  const e = applica(c, b, a, dadi(b));
  if (!e.ok) throw new Error(`${a.tipo}: ${e.errore}`);
}
function rifiuta(c: CtxCreazione, b: Bozza, a: AzioneCreazione): string {
  const e = applica(c, b, a, dadi(b));
  expect(e.ok).toBe(false);
  return e.ok ? '' : e.errore;
}

/** Rolls the four scores in order with these dice (manual rolls: the player's real dice). */
function punteggi(c: CtxCreazione, b: Bozza, tiri: number[][]): void {
  for (const t of tiri) fai(c, b, { tipo: 'tira', valori: t });
}

describe('the scores: 3d6 in order, entered die by die', () => {
  it('asks Forza first, refuses the wrong number of dice and a die off its faces, then sets the scores', () => {
    const c = ctx();
    const b = nuova(c);
    expect(vistaBozza(c, b).da_tirare).toEqual({ numero: 3, facce: 6, bonus: 0, per: 'Forza' });
    expect(rifiuta(c, b, { tipo: 'tira', valori: [3, 4] })).toMatch(/3 dadi da 6 facce/);
    expect(rifiuta(c, b, { tipo: 'tira', valori: [3, 4, 7] })).toMatch(/da 1 a 6/);
    expect(rifiuta(c, b, { tipo: 'tira', valori: null })).toMatch(/Scrivi i dadi/);
    punteggi(c, b, [[6, 5, 3], [4, 4, 2], [5, 5, 1], [6, 3, 3]]);
    const v = vistaBozza(c, b);
    expect(v.caratteristiche.punteggi).toEqual({ forza: 14, mente: 10, agilita: 11, tempra: 12 });
    expect(v.caratteristiche.bonus).toEqual({ forza: 1, mente: 0, agilita: 0, tempra: 0 });
    expect(v.da_tirare).toBeNull();
    // The step waits for the player's word: the options may still change the scores.
    expect(v.corrente).toBe('caratteristiche');
    expect(b.tiri.map((t) => t.per)).toEqual(['Forza', 'Mente', 'Agilità', 'Tempra']);
  });

  it('automatic rolls: the Engine rolls with the draft\'s own dice (the same seed rolls the same scores)', () => {
    const c = ctx({}, false);
    const a = nuova(c);
    const b = nuova(c);
    expect(rifiuta(c, a, { tipo: 'tira', valori: [1, 2, 3] })).toMatch(/il Motore/);
    for (let i = 0; i < 4; i++) {
      fai(c, a, { tipo: 'tira', valori: null });
      fai(c, b, { tipo: 'tira', valori: null });
    }
    expect(a.base).toEqual(b.base);
    expect(a.contatore).toBe(12);
    expect(Object.values(a.base!).every((n) => n >= 3 && n <= 18)).toBe(true);
  });

  it('the Game Master\'s options the campaign allows: point swapping and one swap; not the full shuffle', () => {
    const c = ctx();
    const b = nuova(c);
    punteggi(c, b, [[6, 5, 3], [4, 4, 2], [5, 5, 1], [6, 3, 3]]);
    // −2 to Agilità (11 → 9) for +1 to Forza (14 → 15); never below 9 (p. 186).
    fai(c, b, { tipo: 'opzione', opzione: 'scambio_punti', da: 'agilita', a: 'forza' });
    expect(b.base).toMatchObject({ forza: 15, agilita: 9 });
    expect(rifiuta(c, b, { tipo: 'opzione', opzione: 'scambio_punti', da: 'agilita', a: 'forza' })).toMatch(/Agilità non può scendere sotto 9/);
    fai(c, b, { tipo: 'opzione', opzione: 'scambio', da: 'mente', a: 'tempra' });
    expect(b.base).toMatchObject({ mente: 12, tempra: 10 });
    expect(rifiuta(c, b, { tipo: 'opzione', opzione: 'scambio', da: 'mente', a: 'tempra' })).toMatch(/solo 1 volte/);
    expect(rifiuta(c, b, { tipo: 'assegna', valori: { forza: 9, mente: 15, agilita: 12, tempra: 10 } })).toMatch(/non ha permesso/);
  });

  it('a method to assign: the rolled values placed by the player, the same values only', () => {
    const c = ctx({ metodo: 'da_disporre' });
    const b = nuova(c);
    expect(vistaBozza(c, b).da_tirare?.per).toBe('Punteggio 1 di 4');
    punteggi(c, b, [[6, 5, 3], [4, 4, 2], [5, 5, 1], [6, 3, 3]]);
    expect(vistaBozza(c, b).caratteristiche.da_assegnare).toEqual([14, 10, 11, 12]);
    expect(rifiuta(c, b, { tipo: 'assegna', valori: { forza: 14, mente: 14, agilita: 11, tempra: 12 } })).toMatch(/proprio questi valori/);
    fai(c, b, { tipo: 'assegna', valori: { forza: 10, mente: 14, agilita: 12, tempra: 11 } });
    expect(b.base).toEqual({ forza: 10, mente: 14, agilita: 12, tempra: 11 });
  });

  it('the hopeless character: no class open, so the step does not close; the flip (21 − score) opens them', () => {
    const c = ctx();
    const b = nuova(c);
    punteggi(c, b, [[2, 2, 3], [1, 3, 2], [3, 3, 2], [2, 2, 2]]);
    expect(b.base).toEqual({ forza: 7, mente: 6, agilita: 8, tempra: 6 });
    const v = vistaBozza(c, b);
    expect(v.caratteristiche.senza_speranza).toEqual(['ritira', 'ribalta']);
    expect(rifiuta(c, b, { tipo: 'conferma', passo: 'caratteristiche' })).toMatch(/nessuna classe/);
    fai(c, b, { tipo: 'rimedio', rimedio: 'ribalta' });
    expect(b.base).toEqual({ forza: 14, mente: 15, agilita: 13, tempra: 15 });
    expect(rifiuta(c, b, { tipo: 'rimedio', rimedio: 'ritira' })).toMatch(/almeno una classe/);
    fai(c, b, { tipo: 'conferma', passo: 'caratteristiche' });
    expect(vistaBozza(c, b).corrente).toBe('razza');
  });
});

/** A draft with its scores confirmed. */
function conPunteggi(c: CtxCreazione, tiri: number[][]): Bozza {
  const b = nuova(c);
  punteggi(c, b, tiri);
  fai(c, b, { tipo: 'conferma', passo: 'caratteristiche' });
  return b;
}
const LAMA = [[6, 5, 5], [4, 4, 2], [5, 5, 1], [6, 4, 3]]; // forza 16, mente 10, agilita 11, tempra 13
const ARCANO = [[4, 3, 3], [6, 5, 3], [5, 4, 3], [4, 3, 3]]; // forza 10, mente 14, agilita 12, tempra 10

describe('race and class: only the legal ones, the others refused with their reason', () => {
  it('Forza 16 closes the small race (Forza at most 15); a small one cannot be a caster; Mente 10 opens the caster', () => {
    const c = ctx();
    const b = conPunteggi(c, LAMA);
    const v = vistaBozza(c, b);
    expect(v.razze).toEqual([
      { id: 'umano', nome: 'Umano', ammessa: true, motivo: null },
      { id: 'piccolo', nome: 'Piccolo', ammessa: false, motivo: 'Forza 16: serve ≤ 15' },
    ]);
    expect(rifiuta(c, b, { tipo: 'scegli', passo: 'razza', id: 'piccolo' })).toBe('Non puoi essere Piccolo: Forza 16, serve ≤ 15.');
    expect(rifiuta(c, b, { tipo: 'scegli', passo: 'classe', id: 'lama' })).toMatch(/Adesso tocca a «Razza»/);
    fai(c, b, { tipo: 'scegli', passo: 'razza', id: 'umano' });
    fai(c, b, { tipo: 'scegli', passo: 'classe', id: 'lama' });
    // A fighter has no spells: the step closes by itself, the hit points come next.
    expect(vistaBozza(c, b).corrente).toBe('punti_ferita');

    const p = conPunteggi(c, [[4, 4, 4], [3, 3, 2], [5, 4, 3], [4, 3, 3]]); // forza 12, mente 8
    fai(c, p, { tipo: 'scegli', passo: 'razza', id: 'piccolo' });
    expect(vistaBozza(c, p).classi.find((x) => x.id === 'arcano')).toEqual({ id: 'arcano', nome: 'Arcano', ammessa: false, motivo: 'non per un Piccolo' });
    expect(rifiuta(c, p, { tipo: 'scegli', passo: 'classe', id: 'arcano' })).toBe('Un Piccolo non può essere Arcano.');
    const u = conPunteggi(c, [[4, 4, 4], [3, 3, 2], [5, 4, 3], [4, 3, 3]]);
    fai(c, u, { tipo: 'scegli', passo: 'razza', id: 'umano' });
    expect(rifiuta(c, u, { tipo: 'scegli', passo: 'classe', id: 'arcano' })).toBe('Non puoi essere Arcano: Mente 8, serve ≥ 9.');
  });
});

/** A legal human fighter up to the purchases. */
function lamaAlleCompere(c: CtxCreazione): Bozza {
  const b = conPunteggi(c, LAMA);
  fai(c, b, { tipo: 'scegli', passo: 'razza', id: 'umano' });
  fai(c, b, { tipo: 'scegli', passo: 'classe', id: 'lama' });
  fai(c, b, { tipo: 'tira', valori: [5] });
  fai(c, b, { tipo: 'tira', valori: [6, 5, 4] });
  return b;
}

describe('hit points and money', () => {
  it('the class die plus Tempra (d8 + 1 = 6), at least 1; then 3d6 × 10 coins', () => {
    const c = ctx();
    const b = conPunteggi(c, LAMA);
    fai(c, b, { tipo: 'scegli', passo: 'razza', id: 'umano' });
    fai(c, b, { tipo: 'scegli', passo: 'classe', id: 'lama' });
    expect(vistaBozza(c, b).da_tirare).toEqual({ numero: 1, facce: 8, bonus: 1, per: 'Punti ferita del 1° livello' });
    expect(rifiuta(c, b, { tipo: 'tira', valori: [9] })).toMatch(/da 1 a 8/);
    fai(c, b, { tipo: 'tira', valori: [5] });
    expect(vistaBozza(c, b).punti_ferita.totale).toBe(6);
    expect(vistaBozza(c, b).da_tirare).toEqual({ numero: 3, facce: 6, bonus: 0, per: 'Monete iniziali' });
    fai(c, b, { tipo: 'tira', valori: [6, 5, 4] });
    expect(vistaBozza(c, b).monete).toMatchObject({ formula: '3d6 × 10 mo', dadi: [6, 5, 4], totale: 150 });
    expect(vistaBozza(c, b).corrente).toBe('acquisti');
  });

  it('the campaign\'s «massimo»: the first level\'s die counts its maximum, nothing to roll', () => {
    const c = ctx({ puntiFerita: 'massimo' });
    const b = conPunteggi(c, LAMA);
    fai(c, b, { tipo: 'scegli', passo: 'razza', id: 'umano' });
    fai(c, b, { tipo: 'scegli', passo: 'classe', id: 'lama' });
    expect(vistaBozza(c, b).punti_ferita.totale).toBe(9);
    expect(vistaBozza(c, b).corrente).toBe('monete');
  });

  it('a player cannot change the class once its hit points are rolled; the Game Master can, and they are rolled again', () => {
    const c = ctx();
    const b = lamaAlleCompere(c);
    expect(rifiuta(c, b, { tipo: 'indietro', passo: 'classe' })).toMatch(/Hai già tirato «Punti ferita»/);
    expect(rifiuta(c, b, { tipo: 'indietro', passo: 'monete' })).toMatch(/solo il master/);
    annullaPasso(c, b, 'classe', true);
    expect(b.classe).toBeNull();
    expect(b.dadiPf).toEqual([]);
    // The money does not read the class: it stays rolled.
    expect(b.dadiMonete).toEqual([6, 5, 4]);
    expect(vistaBozza(c, b).corrente).toBe('classe');
  });
});

describe('purchases: the catalog\'s prices, change, load and AC, as in play', () => {
  it('a mail coat, a shield and a sword: the coins left, the AC (14 + 1 shield), the weight and the band', () => {
    const c = ctx();
    const b = lamaAlleCompere(c);
    fai(c, b, { tipo: 'compra', id: 'cotta', quante: 1 });
    fai(c, b, { tipo: 'compra', id: 'scudo', quante: 1 });
    fai(c, b, { tipo: 'compra', id: 'spada', quante: 1 });
    fai(c, b, { tipo: 'compra', id: 'torcia', quante: 3 });
    const a = vistaBozza(c, b).acquisti!;
    // 150 − 40 − 5 − 10 = 95 gp, then three torches of a pack of six (1 gp): 5 sp, with change.
    expect(a.monete).toEqual([{ id: 'mo', nome: "Monete d'oro", quante: 94 }, { id: 'ma', nome: "Monete d'argento", quante: 5 }]);
    expect(a.difesa).toBe(15);
    expect(a.attacchi).toEqual(['Spada 1d8+2']);
    // 54 lb with Forza 16 is over the light band's 50 (the fixture's table): heavy, 3 m a round in metal armor.
    expect(a.carico).toMatchObject({ nome: 'Carico pesante', movimento: 3 });
    expect(a.peso).toBeCloseTo(40 + 5 + 4 + 0.5 + (94 + 5) / 20, 1);
    // Giving back the torches returns what they cost, exactly.
    fai(c, b, { tipo: 'vendi', id: 'torcia', quante: 3 });
    expect(vistaBozza(c, b).acquisti!.monete).toEqual([{ id: 'mo', nome: "Monete d'oro", quante: 95 }]);
    expect(rifiuta(c, b, { tipo: 'compra', id: 'arco', quante: 4 })).toMatch(/Non bastano le monete/);
    fai(c, b, { tipo: 'conferma', passo: 'acquisti' });
    expect(vistaBozza(c, b).corrente).toBe('lingue');
  });

  it('a small character may not buy a large weapon (shown with the reason); a caster\'s sword shows its penalty', () => {
    const c = ctx();
    const p = conPunteggi(c, [[4, 4, 4], [3, 3, 4], [5, 4, 3], [4, 3, 3]]);
    fai(c, p, { tipo: 'scegli', passo: 'razza', id: 'piccolo' });
    fai(c, p, { tipo: 'scegli', passo: 'classe', id: 'lama' });
    fai(c, p, { tipo: 'tira', valori: [6] });
    fai(c, p, { tipo: 'tira', valori: [3, 3, 3] });
    expect(vistaBozza(c, p).acquisti!.voci.find((v) => v.id === 'spadone')).toMatchObject({ vietato: 'vietato a: Piccolo', penalita: null });
    expect(rifiuta(c, p, { tipo: 'compra', id: 'spadone', quante: 1 })).toBe('Spadone: vietato a: Piccolo.');
    // The small race's d6 cap: 6 + Tempra +0.
    expect(vistaBozza(c, p).punti_ferita).toMatchObject({ dado: '1d6', totale: 6 });
  });
});

describe('a caster\'s starting book and today\'s spells', () => {
  function arcano(c: CtxCreazione): Bozza {
    const b = conPunteggi(c, ARCANO);
    fai(c, b, { tipo: 'scegli', passo: 'razza', id: 'umano' });
    fai(c, b, { tipo: 'scegli', passo: 'classe', id: 'arcano' });
    return b;
  }
  it('read runes and exactly one more of the first level; prepared from the book, one a day at the first level', () => {
    const c = ctx();
    const b = arcano(c);
    const v = vistaBozza(c, b);
    expect(v.corrente).toBe('incantesimi');
    expect(v.incantesimi).toMatchObject({ fissi: [{ id: 'leggere_rune', nome: 'Leggere le rune' }], a_scelta: 1, slot: [1] });
    expect(v.incantesimi!.scelte.map((x) => x.id)).toEqual(['scintilla', 'luce_fredda']);
    expect(rifiuta(c, b, { tipo: 'incantesimi', libro: ['scintilla'], preparati: [] })).toMatch(/sempre Leggere le rune/);
    expect(rifiuta(c, b, { tipo: 'incantesimi', libro: ['leggere_rune', 'fiamma'], preparati: [] })).toMatch(/Fiamma è di livello 2/);
    expect(rifiuta(c, b, { tipo: 'incantesimi', libro: ['leggere_rune', 'scintilla', 'luce_fredda'], preparati: [] })).toMatch(/Scegli 1/);
    expect(rifiuta(c, b, { tipo: 'incantesimi', libro: ['leggere_rune', 'scintilla'], preparati: ['luce_fredda'] })).toMatch(/non è nel tuo libro/);
    expect(rifiuta(c, b, { tipo: 'incantesimi', libro: ['leggere_rune', 'scintilla'], preparati: ['scintilla', 'leggere_rune'] })).toMatch(/al più 1 al giorno/);
    fai(c, b, { tipo: 'incantesimi', libro: ['leggere_rune', 'scintilla'], preparati: ['scintilla'] });
    expect(b.libro).toEqual(['leggere_rune', 'scintilla']);
    expect(vistaBozza(c, b).corrente).toBe('punti_ferita');
  });

  it('the set\'s «tiro»: the Engine draws the spell for the book; the player prepares from it', () => {
    const c = ctx({ incantesimi: 'tiro' });
    const b = arcano(c);
    expect(b.libro).toHaveLength(2);
    expect(b.libro[0]).toBe('leggere_rune');
    expect(['scintilla', 'luce_fredda']).toContain(b.libro[1]);
    expect(rifiuta(c, b, { tipo: 'incantesimi', libro: ['leggere_rune', b.libro[1] === 'scintilla' ? 'luce_fredda' : 'scintilla'], preparati: [] })).toMatch(/li dà il master/);
    fai(c, b, { tipo: 'incantesimi', libro: [...b.libro], preparati: [b.libro[1]!] });
  });
});

describe('languages, the name, the finished PC', () => {
  it('the race\'s own and up to the bonus more; a name; the sheet passes the creation check; the pg.yaml entry', () => {
    const c = ctx();
    const b = lamaAlleCompere(c);
    fai(c, b, { tipo: 'compra', id: 'giaco', quante: 1 });
    fai(c, b, { tipo: 'compra', id: 'spada', quante: 1 });
    fai(c, b, { tipo: 'conferma', passo: 'acquisti' });
    // Mente 10: no extra language.
    expect(rifiuta(c, b, { tipo: 'lingue', lingue: ['comune', 'antico'] })).toMatch(/al più 0 lingue/);
    fai(c, b, { tipo: 'lingue', lingue: ['comune'] });
    expect(rifiuta(c, b, { tipo: 'descrizione', nome: '   ' })).toMatch(/Serve un nome/);
    fai(c, b, { tipo: 'descrizione', nome: 'Gaspare  Ferri', aspetto: 'Baffi rossi.\n' });
    const v = vistaBozza(c, b);
    expect(v.stato).toBe('pronta');
    expect(v.problemi).toEqual([]);
    const voce = voceDelPg(c, b, 'pg_gaspare_ferri', new Date('2026-11-22T10:05:00Z'));
    expect(voce).toMatchObject({ id: 'pg_gaspare_ferri', nome: 'Gaspare Ferri', specie: 'Umano', classe: 'Lama', livello: 1, aspetto: 'Baffi rossi.' });
    expect(voce['scheda']).toEqual({
      caratteristiche: { forza: 16, mente: 10, agilita: 11, tempra: 13 },
      classe: 'lama',
      livello: 1,
      px: 0,
      razza: 'umano',
      pf: 6,
      equipaggiamento: ['giaco', 'spada'],
      monete: { mo: 125 },
      lingue: ['comune'],
    });
    expect((voce['creazione'] as { tiri: unknown[] }).tiri).toHaveLength(6);
  });
});
