/**
 * Costo per sessione (strumenti/costi.ts): LLM e voce separati, righe assegnate alla sessione aperta
 * in quel momento, il resto «fuori sessione».
 */
import { describe, expect, it } from 'vitest';
import { sommaPerSessione } from '../src/strumenti/costi';

describe('somma dei costi per sessione', () => {
  it('turni, LLM e voce di due sessioni, più una riga fuori sessione', () => {
    const sessioni = [
      { id: 's2', campagna: 'nozze-neve', creata: '2026-11-09T20:00:00.000Z', aggiornata: '2026-11-09T22:00:00.000Z', turno: 2 },
      { id: 's1', campagna: 'prova-f0', creata: '2026-11-08T20:00:00.000Z', aggiornata: '2026-11-08T21:00:00.000Z', turno: 1 },
    ];
    const righe = [
      { ts: '2026-11-08T20:10:00.000Z', tipo: 'turno', turno: 1, costo_usd: 0.001 },
      { ts: '2026-11-08T20:10:05.000Z', tipo: 'voce', turno: 1, costo_usd: 0.0004, byte_testo: 200, secondi_audio: 30 },
      { ts: '2026-11-09T20:05:00.000Z', tipo: 'preriscaldamento', costo_usd: 0.002 },
      { ts: '2026-11-09T20:06:00.000Z', tipo: 'turno', turno: 1, costo_usd: 0.001 },
      { ts: '2026-11-09T20:07:00.000Z', tipo: 'turno', turno: 2, costo_usd: 0.001 },
      { ts: '2026-11-09T20:07:01.000Z', tipo: 'arbitro_relazioni', costo_usd: 0.0001 },
      { ts: '2026-11-09T20:07:09.000Z', tipo: 'voce', turno: 2, costo_usd: 0.0006, byte_testo: 300, secondi_audio: 45 },
      { ts: '2026-11-10T09:00:00.000Z', tipo: 'turno', turno: 1, costo_usd: 0.005 },
      { ts: 'rotta', tipo: 'turno', costo_usd: 99 },
    ];
    const s = sommaPerSessione(righe, sessioni);
    expect(s.map((x) => x.sessione)).toEqual(['s1', 's2', 'fuori sessione']);
    expect(s[0]).toMatchObject({ campagna: 'prova-f0', turni: 1, llm_usd: 0.001, voce_usd: 0.0004, totale_usd: 0.0014, voce_byte: 200, voce_minuti: 0.5 });
    expect(s[1]).toMatchObject({ turni: 2, llm_usd: 0.0041, voce_usd: 0.0006, totale_usd: 0.0047, voce_minuti: 0.8 });
    expect(s[1]!.usd_per_turno).toBeCloseTo(0.00235, 5);
    expect(s[2]).toMatchObject({ inizio: '2026-11-10', turni: 1, llm_usd: 0.005 });
  });
});
