/**
 * Manual rolls cover every roll of a player's own PC (docs/prove.md §8, «Follow-ups»): after the action's test the
 * Engine asks the damage of a hit, the other PC's die in a contest, the initiative when a fight starts and a dying PC's
 * death saves, round after round, from dry runs on a copy of the Engine. NPC rolls stay the Engine's. On a 2d6 set the
 * difficulty's modifier never reaches the player's bonus. Invented fixtures: `prove` (SRD 5.2), `bx`, `pbta`, `soglia`.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { totaleRichiesta, type RichiestaTiroMaster } from '@tabletop-ai-gm/shared';
import type { DecisioniTurno, MotoreProve } from '../src/prove/motore';
import { cartaPerIlTavolo, type TiroInserito } from '../src/prove/richieste';
import { az, inserito, motoreSet, motoreSrd } from './aiuti/motori-prove';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');

/**
 * Plays the table: asks the requests round after round, answers each with `valore(r)` (null = the Engine), as the
 * director does. Returns the rounds of requests and every value entered.
 */
function giocaAlTavolo(m: MotoreProve, d: DecisioniTurno, valore: (r: RichiestaTiroMaster) => number[] | null): { giri: RichiestaTiroMaster[][]; inseriti: Map<string, TiroInserito> } {
  const inseriti = new Map<string, TiroInserito>();
  const giri: RichiestaTiroMaster[][] = [];
  for (let i = 0; i < 20; i++) {
    const nuove = m.richiesteGiocatori(d, inseriti).filter((r) => !inseriti.has(r.id));
    if (!nuove.length) break;
    giri.push(nuove);
    for (const r of nuove) {
      const v = valore(r);
      const [k, x] = inserito(r, v, v === null ? 'motore' : 'telefono');
      inseriti.set(k, x);
    }
  }
  return { giri, inseriti };
}

const ATTACCO = 'Tiro con la balestra leggera a Ruggero';

describe('follow-ups, SRD 5.2', () => {
  it('a hit asks the damage next, then the fight asks every PC\'s initiative at once; the cards use the dice entered', async () => {
    const m = motoreSrd({ [ATTACCO]: { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' } }, [4, 3, 2]);
    const d = await m.decidi(3, [az('a1', 'pg_corrado', ATTACCO)]);
    const prima = JSON.stringify(m.esporta());
    const valori: Record<string, number[]> = { r_a1: [18], r_a1_danno: [5] };
    const { giri, inseriti } = giocaAlTavolo(m, d, (r) => valori[r.id] ?? [r.chi === 'pg_ida' ? 19 : r.chi === 'pg_teo' ? 7 : 12]);
    // The dry runs left the real Engine alone: same HP, same dice counter, no card.
    expect(JSON.stringify(m.esporta())).toBe(prima);
    expect(giri.map((g) => g.map((r) => r.id))).toEqual([['r_a1'], ['r_a1_danno'], ['r_t3_iniziativa_pg_ida_0', 'r_t3_iniziativa_pg_corrado_0', 'r_t3_iniziativa_pg_teo_0']]);
    const danno = giri[1]![0]!;
    expect(danno).toMatchObject({ per: 'danno', chi: 'pg_corrado', tipo: 'attacco', facce: 8, quanti: 1, somma: false, privata: false });
    expect(danno.etichetta).toMatch(/Balestra leggera/);
    expect(giri[2]!.every((r) => r.per === 'iniziativa' && r.facce === 20 && r.quanti === 1)).toBe(true);
    const e = m.completa(d, inseriti, true);
    const carta = e.tiri.find((t) => t.chi === 'pg_corrado' && t.tipo === 'attacco')!;
    expect(carta).toMatchObject({ dadi: [18], manuale: 'telefono', riuscita: true });
    expect(carta.danno?.dadi).toEqual([5]);
    expect(carta.danno?.totale).toBe(5 + danno.modificatore);
    // The initiative is the players' die plus their modifier.
    const ini = new Map(m.vistaCombattimento()!.combattenti.map((c) => [c.id, c.iniziativa]));
    expect(ini.get('pg_ida')).toBe(19 + giri[2]![0]!.modificatore);
    expect(ini.get('pg_teo')).toBe(7 + giri[2]![2]!.modificatore);
  });

  it('a miss asks no damage: the fight\'s initiative comes right after the attack roll', async () => {
    const m = motoreSrd({ [ATTACCO]: { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' } }, [4]);
    const d = await m.decidi(3, [az('a1', 'pg_corrado', ATTACCO)]);
    const { giri } = giocaAlTavolo(m, d, (r) => (r.id === 'r_a1' ? [2] : [10]));
    expect(giri.map((g) => g.map((r) => r.per ?? 'prova'))).toEqual([['prova'], ['iniziativa', 'iniziativa', 'iniziativa']]);
  });

  it('the same turn played with the requests and played at once with the same dice gives the same result', async () => {
    const regole = { [ATTACCO]: { tipo: 'attacco' as const, bersaglio: 'png_ruggero', arma: 'balestra_leggera' } };
    const a = motoreSrd(regole, [5, 3, 2, 4]);
    const da = await a.decidi(3, [az('a1', 'pg_corrado', ATTACCO)]);
    const { inseriti } = giocaAlTavolo(a, da, (r) => (r.id === 'r_a1' ? [20] : r.per === 'danno' ? [8, 8] : [9]));
    const ea = a.completa(da, inseriti, true);
    const b = motoreSrd(regole, [5, 3, 2, 4]);
    const eb = b.completa(await b.decidi(3, [az('a1', 'pg_corrado', ATTACCO)]), inseriti, true);
    expect(ea.fatti).toEqual(eb.fatti);
    expect(ea.tiri).toEqual(eb.tiri);
    expect(a.esporta()).toEqual(b.esporta());
    // A natural 20 doubles the damage dice: two d8 were asked and added.
    expect(ea.tiri[0]!.danno?.dadi).toEqual([8, 8]);
  });

  it('a contest between two PCs asks both players at once; the other PC\'s die is theirs', async () => {
    const t = 'Strappo la mappa dalle mani di Corrado';
    const m = motoreSrd({ [t]: { tipo: 'contrapposta', abilita: 'atletica', bersaglio: 'pg_corrado', abilita_bersaglio: 'atletica' } }, [1]);
    const d = await m.decidi(3, [az('a1', 'pg_ida', t)]);
    const { giri, inseriti } = giocaAlTavolo(m, d, (r) => (r.chi === 'pg_ida' ? [14] : [6]));
    expect(giri).toHaveLength(1);
    expect(giri[0]!.map((r) => [r.id, r.chi, r.per ?? 'prova'])).toEqual([
      ['r_a1', 'pg_ida', 'prova'],
      ['r_a1_pg_corrado', 'pg_corrado', 'contesa'],
    ]);
    const e = m.completa(d, inseriti, true);
    expect(e.tiri[0]!.dadi).toEqual([14]);
    expect(e.tiri[0]!.avversario?.dadi).toEqual([6]);
    expect(e.tiri[0]!.avversario?.totale).toBe(6 + giri[0]![1]!.modificatore);
  });

  it('a private attack: its damage request is private too', async () => {
    const m = motoreSrd({ [ATTACCO]: { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' } }, [4]);
    const d = await m.decidi(3, [az('a1', 'pg_corrado', ATTACCO, true)]);
    const { giri } = giocaAlTavolo(m, d, (r) => (r.id === 'r_a1' ? [18] : [3]));
    expect(giri[1]![0]).toMatchObject({ id: 'r_a1_danno', privata: true });
  });

  it('a dying PC rolls their own death save at their step, against the rule\'s public DC', async () => {
    const m = motoreSrd({}, [10]);
    expect(m.iniziaCombattimento()).not.toBeNull();
    const ordine = m.vistaCombattimento()!.combattenti.map((c) => c.id);
    // A window with no action consumes the step on turn; down the PC of the next step: there it rolls a death save.
    const primoPg = ordine[1]!;
    expect(primoPg.startsWith('pg_')).toBe(true);
    m.stato.danneggia(primoPg, m.stato.puntiFerita(primoPg)!.attuali);
    const d = await m.decidi(4, []);
    const { giri, inseriti } = giocaAlTavolo(m, d, () => [15]);
    const morte = giri.flat().filter((r) => r.per === 'morte');
    expect(morte.length).toBeGreaterThan(0);
    expect(morte[0]).toMatchObject({ chi: primoPg, tipo: 'salvezza', facce: 20, quanti: 1, modificatore: 0, contro: { valore: 10 } });
    const e = m.completa(d, inseriti, true);
    const carta = e.tiri.find((t) => t.chi === primoPg && t.tipo === 'salvezza')!;
    expect(carta).toMatchObject({ dadi: [15], manuale: 'telefono', riuscita: true });
    expect(e.fatti.join(' ')).toMatch(/15 contro CD 10/);
  });

  it('a roll switched to the Engine stays the Engine\'s: no card says the player rolled it', async () => {
    const m = motoreSrd({ [ATTACCO]: { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' } }, [19, 4]);
    const d = await m.decidi(3, [az('a1', 'pg_corrado', ATTACCO)]);
    const { inseriti } = giocaAlTavolo(m, d, (r) => (r.id === 'r_a1' ? null : [10]));
    const e = m.completa(d, inseriti, true);
    expect(e.tiri[0]).toMatchObject({ dadi: [19], manuale: 'motore' });
  });
});

describe('follow-ups with a manual\'s rule set', () => {
  it('d20 set (bx): the damage of a hit is the player\'s, the NPC\'s answer the Engine\'s', async () => {
    const t = 'Colpisco Ruggero con la spada';
    const m = motoreSet(path.join(FIX, 'bx'), { [t]: { tipo: 'attacco', bersaglio: 'png_ruggero' } }, [3]);
    const d = await m.decidi(1, [az('a1', 'pg_ida', t)]);
    const { giri, inseriti } = giocaAlTavolo(m, d, (r) => (r.id === 'r_a1' ? [19] : r.per === 'danno' ? Array.from({ length: r.quanti }, () => 2) : [4]));
    expect(giri[1]!.map((r) => r.id)).toContain('r_a1_danno');
    const e = m.completa(d, inseriti, true);
    const carta = e.tiri.find((x) => x.chi === 'pg_ida' && x.tipo === 'attacco')!;
    expect(carta.danno?.dadi.every((x) => x === 2)).toBe(true);
    // Nothing of an NPC was asked.
    expect(giri.flat().every((r) => r.chi.startsWith('pg_'))).toBe(true);
  });

  it('2d6 set: the difficulty\'s modifier is not in the player\'s bonus, and the table card shows the phone\'s total', async () => {
    const t = 'Convinco Bertoldo a lasciarci passare';
    const m = motoreSet(path.join(FIX, 'pbta'), { [t]: { tipo: 'prova', mossa: 'convincere', bersaglio: 'png_bertoldo', difficolta: 'rischiosa' } }, [1]);
    const d = await m.decidi(1, [az('a1', 'pg_ida', t)]);
    const [r] = m.richiesteGiocatori(d);
    // Fascino +2 for the move; the risky difficulty's −1 stays secret.
    expect(r).toMatchObject({ facce: 6, quanti: 2, somma: true, modificatore: 2 });
    const e = m.completa(d, new Map([inserito(r!, [4, 3])]), true);
    expect(e.tiri[0]).toMatchObject({ totale: 8, modificatore: 1, modificatore_difficolta: -1 });
    const tavolo = cartaPerIlTavolo(e.tiri[0]!);
    expect(tavolo.totale).toBe(totaleRichiesta(r!, [4, 3]));
    expect(tavolo.modificatore).toBe(2);
    expect(tavolo.modificatore_difficolta).toBeUndefined();
  });

  it('every rule-set shape: the turn played with the requests equals the turn played at once', async () => {
    const t = 'Colpisco Ruggero con la spada';
    for (const set of ['bx', 'pbta', 'soglia']) {
      const regole = { [t]: { tipo: 'attacco' as const, bersaglio: 'png_ruggero' } };
      const a = motoreSet(path.join(FIX, set), regole, [5, 2, 6]);
      const da = await a.decidi(1, [az('a1', 'pg_ida', t)]);
      const { inseriti } = giocaAlTavolo(a, da, (r) => Array.from({ length: r.quanti }, () => Math.min(r.facce, 5)));
      const ea = a.completa(da, inseriti, true);
      const b = motoreSet(path.join(FIX, set), regole, [5, 2, 6]);
      const eb = b.completa(await b.decidi(1, [az('a1', 'pg_ida', t)]), inseriti, true);
      expect(ea.fatti, set).toEqual(eb.fatti);
      expect(ea.tiri, set).toEqual(eb.tiri);
      expect(a.esporta(), set).toEqual(b.esporta());
    }
  });
});
