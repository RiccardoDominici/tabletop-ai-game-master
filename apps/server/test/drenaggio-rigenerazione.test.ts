/**
 * Energy drain and regeneration (R4; Basic Fantasy pp. 58–59, 152; audit P5-49, P6-21, P6-22): a touch that drains a
 * level — one hit die of maximum hit points, −1 on every d20 roll, slain at 0 — and a creature that regenerates, gets up
 * after falling, and dies only to the damage it cannot regenerate (fire). Invented fixture: tana.
 */
import { describe, expect, it } from 'vitest';
import type { MotoreProve } from '../src/prove/motore';
import { DadiPerFacce, azione } from './aiuti/cripta';
import { motoreTana } from './aiuti/tana';

const contro = (png: string, pg: string[], dadi: Record<number, number[]>): MotoreProve => motoreTana(new DadiPerFacce(dadi), { gregari: [] }, pg, undefined, [png]);

describe('energy drain (negative levels)', () => {
  it('a touch drains a level: one hit die of maximum hit points, −1 on her next d20 roll, kept in the snapshot', async () => {
    // Bruna's sword (d20 20, d8 1); d6: Bruna 1, the shade 6 (it acts first), surprise 6; its touch d20 20, d4 1; the
    // drained hit die d8 3; morale is 12. Then her attack roll of turn 2 shows the −1.
    const m = contro('png_ombra', ['pg_bruna'], { 20: [20], 8: [1, 3, 1], 6: [1, 6, 6, 1, 1, 1], 4: [1] });
    const r = await m.risolvi(1, [azione('pg_bruna', 'Colpisco Gelo con la spada')]);
    expect(r.fatti.join(' ')).toMatch(/Bruna perde 1 livello di energia/);
    expect(m.drenaggi!.di('pg_bruna')).toBe(1);
    expect(m.stato.puntiFerita('pg_bruna')!.massimi).toBe(9 - 3);
    const r2 = await m.risolvi(2, [azione('pg_bruna', 'Colpisco Gelo con la spada')]);
    const t = r2.tiri.find((x) => x.chi === 'pg_bruna' && x.tipo === 'attacco')!;
    // Strength 15 (+1) and the class's +1, then −1.
    expect(t.modificatore).toBe(1);
    const copia = contro('png_ombra', ['pg_bruna'], { 20: [20] });
    copia.importa(m.esporta());
    expect(copia.drenaggi!.di('pg_bruna')).toBe(1);
    expect(copia.stato.puntiFerita('pg_bruna')!.massimi).toBe(6);
  });

  it('drained to 0 hit points or less: slain', async () => {
    const m = contro('png_ombra', ['pg_bruna'], { 20: [20], 8: [1, 8], 6: [1, 6, 6, 1, 1], 4: [1] });
    m.impostaPf('pg_bruna', 3);
    const r = await m.risolvi(1, [azione('pg_bruna', 'Colpisco Gelo con la spada')]);
    expect(m.stato.fuoriGioco('pg_bruna')).toBe('morto');
    expect(r.fatti.join(' ')).toMatch(/Bruna muore, svuotato della vita/);
  });
});

describe('regeneration', () => {
  it('at 0 from a sword it is down, not dead; it gets up with 1 hit point and regenerates as rounds pass', async () => {
    // Radice has 4 hit points; the sword's d8 6; d6: Bruna 6, Radice 1, surprise 6, morale 1 + 1; its time down d4 2.
    const m = contro('png_ceppo', ['pg_bruna'], { 20: [20], 8: [6], 6: [6, 1, 6, 1, 1], 4: [2] });
    const r = await m.risolvi(1, [azione('pg_bruna', 'Colpisco Radice con la spada')]);
    expect(m.stato.fuoriGioco('png_ceppo')).toBe('a_terra');
    expect(r.fatti.join(' ')).toMatch(/Radice crolla, ma non è morto/);
    expect(m.combattimento.attivo).toBe(false);
    // Two rounds later it is up with 1, then 2 a round.
    const f = m.tempoDelMaster({ cosa: 'avanza', durata: { round: 2 } });
    expect(JSON.stringify(f)).toMatch(/Radice si rialza con 1 punto ferita/);
    m.tempoDelMaster({ cosa: 'avanza', durata: { round: 1 } });
    expect(m.stato.puntiFerita('png_ceppo')!.attuali).toBe(3);
  });

  it('fire it cannot regenerate: enough of it kills', async () => {
    const m = contro('png_ceppo', ['pg_bruna'], { 20: [20], 4: [4], 6: [6, 1, 6, 1, 1] });
    await m.risolvi(1, [azione('pg_bruna', 'Colpisco Radice con la torcia accesa')]);
    expect(m.stato.fuoriGioco('png_ceppo')).toBe('morto');
  });
});
