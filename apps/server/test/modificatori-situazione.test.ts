/**
 * Situational attack modifiers as set data (R4; Basic Fantasy pp. 54–55, 59; audit P5-28, P5-29, P5-32, P5-54a,
 * P5-54b): conditions that carry numbers (blinded −4 to hit and +4 to be hit, −2 initiative, surprised on 1–4; an
 * invisible target −4, not doubled for a blind attacker; cover from the panel), the words of a shot at a foe engaged with
 * the shooter (−5), and a missile that misses into a melee rolled again at an engaged ally. The card says which applied.
 * Invented fixture: test/fixtures/campagne/tana.
 */
import { describe, expect, it } from 'vitest';
import type { MotoreProve } from '../src/prove/motore';
import { DadiPerFacce, azione } from './aiuti/cripta';
import { motoreTana } from './aiuti/tana';

const contro = (pg: string[], dadi: Record<number, number[]>): MotoreProve => motoreTana(new DadiPerFacce(dadi), { gregari: [] }, pg, undefined, ['png_artigliatore']);
const metti = (m: MotoreProve, id: string, condizione: string) => m.attivi.aggiungi(id, { tipo: 'condizione', condizione, durata: { tipo: 'scena' }, finisceSeFerito: false }, 'prova', 1, { seme: 'x', contatore: 0, tira: () => 1 });
const tiroDi = (r: Awaited<ReturnType<MotoreProve['risolvi']>>, chi: string) => r.tiri.find((t) => t.chi === chi && t.tipo === 'attacco')!;

describe('conditions that carry numbers', () => {
  it('a blinded attacker: −4 on the roll, said on the card', async () => {
    const m = contro(['pg_dario'], { 20: [10], 6: [1] });
    metti(m, 'pg_dario', 'accecato');
    const t = tiroDi(await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]), 'pg_dario');
    // Dexterity 16 (+1) and the class's +1, then −4.
    expect(t.modificatore).toBe(-2);
    expect(t.regola).toMatch(/condizioni: Accecato −4/);
  });

  it('a blinded target is +4 to hit; a blind attacker against an invisible target is −4 once', async () => {
    const m = contro(['pg_dario'], { 20: [10], 6: [1] });
    metti(m, 'png_artigliatore', 'accecato');
    expect(tiroDi(await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]), 'pg_dario').modificatore).toBe(6);
    const n = contro(['pg_dario'], { 20: [10], 6: [1] });
    metti(n, 'pg_dario', 'accecato');
    metti(n, 'png_artigliatore', 'invisibile');
    const t = tiroDi(await n.risolvi(1, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]), 'pg_dario');
    expect(t.modificatore).toBe(-2);
  });

  it('cover set from the panel during a fight: −4 to hit the one behind it', async () => {
    const m = contro(['pg_dario'], { 20: [10], 6: [6, 1, 6, 6, 1, 1] });
    m.iniziaCombattimento();
    expect(m.condizione('png_artigliatore', 'al_riparo', true)).toBe(true);
    const t = tiroDi(await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]), 'pg_dario');
    expect(t.modificatore).toBe(-2);
    expect(t.regola).toMatch(/condizioni: Al riparo −4/);
  });

  it('blinded: −2 to initiative and surprised on 1–4 (one die for the side, each its own range)', () => {
    // d6: initiative Dario 4, Bruna 4, the beast 1; the PCs' surprise die 3, the enemies' 6.
    const m = contro(['pg_dario', 'pg_bruna'], { 6: [4, 4, 1, 3, 6] });
    metti(m, 'pg_dario', 'accecato');
    m.iniziaCombattimento();
    const v = m.vistaCombattimento()!;
    const ini = Object.fromEntries(v.combattenti.map((c) => [c.id, c.iniziativa]));
    expect(ini).toMatchObject({ pg_dario: 3, pg_bruna: 4 });
    const cond = (id: string) => v.combattenti.find((c) => c.id === id)!.condizioni.map((c) => c.id);
    expect(cond('pg_dario')).toContain('sorpreso');
    expect(cond('pg_bruna')).not.toContain('sorpreso');
  });
});

describe('shots at a melee', () => {
  it('the words of a shot at a foe engaged with the shooter: −5 («a bruciapelo»)', async () => {
    const m = contro(['pg_dario'], { 20: [10], 6: [1] });
    const t = tiroDi(await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero a bruciapelo")]), 'pg_dario');
    expect(t.modificatore).toBe(-3);
    expect(t.regola).toMatch(/Nemico addosso −5/);
  });

  it('a missile that misses an NPC engaged with another PC is rolled at that PC, by the Game Master', async () => {
    // Turn 1: Bruna's sword hits (d20 20, d8 1): she is engaged with the beast; d6: initiative Bruna 2, Dario 1 (+1),
    // the beast 1, surprise 6, morale 1 + 1. Turn 2: Dario's shot rolls a 1, the shot into the melee 20 at Bruna, 3 damage.
    const m = contro(['pg_bruna', 'pg_dario'], { 8: [1], 20: [20, 1, 20], 6: [2, 1, 1, 6, 1, 1, 3], 3: [1], 4: [1] });
    await m.risolvi(1, [azione('pg_bruna', 'Colpisco Artiglio Nero con la spada')]);
    const prima = m.stato.puntiFerita('pg_bruna')!.attuali;
    const r = await m.risolvi(2, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]);
    expect(r.fatti.join(' ')).toMatch(/Il colpo finisce nella mischia, verso Bruna/);
    const colpo = r.tiri.find((t) => t.chi === 'pg_dario' && t.bersaglio?.id === 'pg_bruna')!;
    expect(colpo).toMatchObject({ riuscita: true });
    expect(m.stato.puntiFerita('pg_bruna')!.attuali).toBeLessThan(prima);
  });
});
