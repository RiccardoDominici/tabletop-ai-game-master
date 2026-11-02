/** Parti pure del pannello del master: token, note di regia, sezione delle note nel messaggio. */
import { describe, expect, it } from 'vitest';
import { NoteRegia } from '../src/master/note';
import { nuovoToken, tokenDaConfig, tokenValido } from '../src/master/token';
import { compilaMessaggioTurno, sezioneNoteRegia, TITOLO_NOTE_REGIA } from '../src/narrazione/messaggio';

describe('token del master', () => {
  it('nuovo a ogni avvio, sicuro per un URL', () => {
    const a = nuovoToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(nuovoToken()).not.toBe(a);
  });
  it('da configurazione solo se abbastanza lungo e pulito', () => {
    expect(tokenDaConfig('corto')).toBeNull();
    expect(tokenDaConfig('con spazi dentro e basta')).toBeNull();
    expect(tokenDaConfig('  token_lungo_abbastanza  ')).toBe('token_lungo_abbastanza');
    expect(tokenDaConfig(undefined)).toBeNull();
  });
  it('confronto esatto, anche con tipi sbagliati', () => {
    expect(tokenValido('abcdefghijklmnop', 'abcdefghijklmnop')).toBe(true);
    expect(tokenValido('abcdefghijklmnop', 'abcdefghijklmnoX')).toBe(false);
    expect(tokenValido('abcdefghijklmnop', 'abc')).toBe(false);
    expect(tokenValido('abcdefghijklmnop', 42)).toBe(false);
    expect(tokenValido('abcdefghijklmnop', undefined)).toBe(false);
  });
});

describe('note di regia', () => {
  it('al massimo 3, da 1 a 15 turni, testo ripulito', () => {
    const n = new NoteRegia();
    expect(n.aggiungi('  Frasi   corte. ', 15, 4)).toMatchObject({ ok: true, nota: { testo: 'Frasi corte.', turni_rimasti: 15, creata_al_turno: 4 } });
    expect(n.aggiungi('x', 0, 4).ok).toBe(false);
    expect(n.aggiungi('x', 16, 4).ok).toBe(false);
    expect(n.aggiungi('x', 2.5, 4).ok).toBe(false);
    expect(n.aggiungi('', 3, 4).ok).toBe(false);
    expect(n.aggiungi('y'.repeat(281), 3, 4).ok).toBe(false);
    expect(n.aggiungi('Due', 1, 4).ok).toBe(true);
    expect(n.aggiungi('Tre', 2, 4).ok).toBe(true);
    expect(n.aggiungi('Quattro', 2, 4)).toMatchObject({ ok: false });
    expect(n.testi).toEqual(['Frasi corte.', 'Due', 'Tre']);
  });
  it('ogni turno narrato consuma un turno; a zero la nota esce', () => {
    const n = new NoteRegia();
    n.aggiungi('Una', 1, 0);
    n.aggiungi('Due', 2, 0);
    expect(n.consumaTurno().map((x) => x.testo)).toEqual(['Una']);
    expect(n.elenco).toMatchObject([{ testo: 'Due', turni_rimasti: 1 }]);
    expect(n.consumaTurno().map((x) => x.testo)).toEqual(['Due']);
    expect(n.testi).toEqual([]);
  });
  it('si tolgono per id', () => {
    const n = new NoteRegia();
    const r = n.aggiungi('Una', 3, 0);
    expect(r.ok && n.togli(r.nota.id)?.testo).toBe('Una');
    expect(n.togli('n99')).toBeNull();
  });
  it('nel messaggio del turno, vicino all’ordine di rispondere', () => {
    expect(sezioneNoteRegia([])).toBeNull();
    const m = compilaMessaggioTurno({ turno: 2, trascrizione: [], azioni: [], pgAlTavolo: [{ id: 'pg_a', nome: 'A' }], noteRegia: ['Frasi corte.'] });
    expect(m).toContain(`${TITOLO_NOTE_REGIA} (`);
    expect(m.indexOf(TITOLO_NOTE_REGIA)).toBeGreaterThan(m.indexOf('## Turno 2'));
    expect(m.indexOf(TITOLO_NOTE_REGIA)).toBeLessThan(m.indexOf('pg_presenti'));
    expect(compilaMessaggioTurno({ turno: 2, trascrizione: [], azioni: [], pgAlTavolo: [] })).not.toContain(TITOLO_NOTE_REGIA);
  });
});
