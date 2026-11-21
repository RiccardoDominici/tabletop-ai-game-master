/**
 * Subduing damage and brawling (R4; Basic Fantasy pp. 55–56; audit P5-41, P5-42): an attack whose words say so is at
 * −4 for half damage, bare hands are 1d3 and always subduing, and a creature brought to 0 with subduing damage is
 * knocked out — not dead, not dying — and wakes with 1 hit point after 1d4 turns. Invented fixture: tana.
 */
import { describe, expect, it } from 'vitest';
import type { MotoreProve } from '../src/prove/motore';
import { DadiPerFacce, azione } from './aiuti/cripta';
import { motoreTana } from './aiuti/tana';

const contro = (png: string, pg: string[], dadi: Record<number, number[]>): MotoreProve => motoreTana(new DadiPerFacce(dadi), { gregari: [] }, pg, undefined, [png]);
const tiroDi = (r: Awaited<ReturnType<MotoreProve['risolvi']>>, chi: string) => r.tiri.find((t) => t.chi === chi && t.tipo === 'attacco')!;

describe('subduing damage', () => {
  it('«col piatto»: −4 to hit, half damage, said on the card', async () => {
    // d20 20 hits; the sword's d8 7 → 3; d6: initiative and surprise, morale 1 + 1.
    const m = contro('png_capo', ['pg_bruna'], { 20: [20], 8: [7], 6: [1, 1, 6, 1, 1] });
    const prima = m.stato.puntiFerita('png_capo')!.attuali;
    const t = tiroDi(await m.risolvi(1, [azione('pg_bruna', 'Colpisco Varo col piatto della spada per tramortirlo')]), 'pg_bruna');
    // Strength 15 (+1) and the class's +1, then −4.
    expect(t.modificatore).toBe(-2);
    expect(t.regola).toMatch(/per tramortire −4, metà danno/);
    expect(t.danno?.totale).toBe(3);
    expect(m.stato.puntiFerita('png_capo')!.attuali).toBe(prima - 3);
  });

  it('brought to 0 by it: knocked out, not dead; it wakes with 1 hit point after 1d4 turns', async () => {
    const m = contro('png_capo', ['pg_bruna'], { 20: [20], 8: [8], 6: [1, 1, 6, 1, 1], 4: [2] });
    m.impostaPf('png_capo', 2);
    const r = await m.risolvi(1, [azione('pg_bruna', 'Colpisco Varo col piatto della spada per tramortirlo')]);
    expect(m.stato.puntiFerita('png_capo')!.attuali).toBe(0);
    expect(m.stato.tramortito('png_capo')).toBe(true);
    expect(m.stato.fuoriGioco('png_capo')).toBe('a_terra');
    expect(r.fatti.join(' ')).toMatch(/Varo è tramortito, non morto/);
    expect(m.combattimento.attivo).toBe(false);
    // 1d4 = 2 turns later he comes round.
    m.tempoDelMaster({ cosa: 'avanza', durata: { turno: 1 } });
    expect(m.stato.puntiFerita('png_capo')!.attuali).toBe(0);
    const f = m.tempoDelMaster({ cosa: 'avanza', durata: { turno: 1 } });
    expect(m.stato.puntiFerita('png_capo')!.attuali).toBe(1);
    expect(JSON.stringify(f)).toMatch(/Varo si riprende con 1 punto ferita/);
  });

  it('bare hands: 1d3, subduing, without the −4', async () => {
    const m = contro('png_capo', ['pg_bruna'], { 20: [20], 3: [3], 6: [1, 1, 6, 1, 1] });
    const t = tiroDi(await m.risolvi(1, [azione('pg_bruna', 'Do un pugno a Varo')]), 'pg_bruna');
    expect(t.modificatore).toBe(2);
    expect(t.regola).toMatch(/a mani nude, per tramortire/);
    expect(t.danno?.formula).toBe('1d3');
  });

  it('killing damage still kills: no knock-out without subduing damage', async () => {
    const m = contro('png_capo', ['pg_bruna'], { 20: [20], 8: [8], 6: [1, 1, 6, 1, 1] });
    m.impostaPf('png_capo', 2);
    await m.risolvi(1, [azione('pg_bruna', 'Colpisco Varo con la spada')]);
    expect(m.stato.fuoriGioco('png_capo')).toBe('morto');
  });
});
