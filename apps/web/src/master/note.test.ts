import { describe, expect, it } from 'vitest';
import { NOTA_REGIA_MAX_CARATTERI } from '@cantastorie/shared';
import { controllaNota, testoNoteAlCompleto, testoTurniNota } from './note';

describe('controllaNota', () => {
  it('nota valida: testo ripulito e turni interi', () => {
    expect(controllaNota('  Più ritmo  ', '5', 15)).toEqual({ valida: true, testo: 'Più ritmo', turni: 5, problema: null });
    expect(controllaNota('x', '15', 15).valida).toBe(true);
    expect(controllaNota('x', '1', 15).valida).toBe(true);
  });
  it('testo vuoto: non valida ma nessun problema da mostrare', () => {
    expect(controllaNota('   ', '15', 15)).toMatchObject({ valida: false, problema: null });
  });
  it('turni fuori limite o non interi', () => {
    for (const turni of ['0', '16', '', 'tre', '2.5', '-1']) {
      const esito = controllaNota('x', turni, 15);
      expect(esito.valida).toBe(false);
      expect(esito.turni).toBeNull();
      expect(esito.problema).toBe('I turni vanno da 1 a 15.');
    }
  });
  it('testo troppo lungo', () => {
    const esito = controllaNota('a'.repeat(NOTA_REGIA_MAX_CARATTERI + 1), '5', 15);
    expect(esito.valida).toBe(false);
    expect(esito.problema).toContain(String(NOTA_REGIA_MAX_CARATTERI));
  });
});

describe('testi delle note', () => {
  it('turni rimasti', () => {
    expect(testoTurniNota({ turni_rimasti: 5, turni_totali: 15 })).toBe('ancora 5 turni su 15');
    expect(testoTurniNota({ turni_rimasti: 1, turni_totali: 15 })).toBe('ultimo turno (su 15)');
  });
  it('al completo', () => {
    expect(testoNoteAlCompleto(3)).toContain('3 note');
  });
});
