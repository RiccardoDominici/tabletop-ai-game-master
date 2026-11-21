/**
 * Turn Undead as a power rolled against the cleric's class table (M1 + M4, docs/prove.md §12; audit rows X-TU-01,
 * X-TU-02, P5-47, P5-48, C-CLS-05): one d20 for the group, checked from the weakest up; 2d6 hit dice affected, at least
 * one creature; a D cell's damage rolled once (×level), the survivors turned; a failure, partial too, locks the power
 * for a turn; the turned leave the fight and count as defeated for XP. On the invented cripta fixture (cleric row 1:
 * skeleton 10, putrid 14, spectre No; row 4: D, T, 14).
 */
import { describe, expect, it } from 'vitest';
import type { TiroInserito } from '../src/prove/richieste';
import type { RichiestaTiroMaster } from '@tabletop-ai-gm/shared';
import { azione, motoreCripta } from './aiuti/cripta';

const condizioni = (m: ReturnType<typeof motoreCripta>, id: string) => m.attivi.condizioni(id);
const inserito = (r: RichiestaTiroMaster, valori: number[]): [string, TiroInserito] => [r.id, { richiesta: r, valori, da: 'telefono' }];

describe('Turn Undead', () => {
  it('a success on both: 2d6 hit dice from the weakest, both turned; the fight they were in ends, and they are worth XP', async () => {
    const m = motoreCripta({ 20: [15], 6: [2, 1] });
    const r = await m.risolvi(1, [azione('pg_oreste', 'Scaccio i non morti col simbolo sacro')]);
    const f = r.fatti.join(' ');
    expect(f).toMatch(/Oreste usa Scacciare i morti: tira 15 sulla tabella del suo livello e riesce su 2 di loro, dal più debole\./);
    expect(f).toMatch(/Dadi vita colpiti: 3; ne subiscono l'effetto Ossa, Putrido\./);
    expect(condizioni(m, 'png_ossa')).toEqual(['scacciato']);
    expect(condizioni(m, 'png_putrido')).toEqual(['scacciato']);
    // The player's own d20: the action's card.
    expect(r.tiri.find((t) => t.chi === 'pg_oreste' && t.tipo === 'prova')).toMatchObject({ etichetta: 'Scacciare i morti', dadi: [15], riuscita: true, contro: { valore: 10 } });
    // Both out of the fight: it ends, and they count as defeated (20 + 40 XP).
    expect(m.inCombattimento).toBe(false);
    expect(m.vistaEsperienza()!.guadagni.map((g) => g.motivo).sort()).toEqual(['Ossa', 'Putrido']);
    // Already turned: not targets again.
    const r2 = await m.risolvi(2, [azione('pg_oreste', 'Scaccio i non morti col simbolo sacro')]);
    expect(r2.fatti.join(' ')).toMatch(/Scacciare i morti non trova un bersaglio adatto: non succede niente/);
  });

  it('a partial failure: the weaker turned, the stronger resists; the power is locked for a turn, the fight goes on', async () => {
    const m = motoreCripta({ 20: [12], 6: [6] });
    const r = await m.risolvi(1, [azione('pg_oreste', 'Scaccio i non morti col simbolo sacro')]);
    const f = r.fatti.join(' ');
    expect(f).toMatch(/riesce su 1 di loro/);
    expect(condizioni(m, 'png_ossa')).toEqual(['scacciato']);
    expect(condizioni(m, 'png_putrido')).toEqual([]);
    expect(f).toMatch(/Scacciare i morti è fallito almeno in parte: Oreste non può riprovarci per un po'\./);
    expect(m.inCombattimento).toBe(true);
    // The next round of the fight: still locked (a turn is sixty rounds).
    const r2 = await m.risolvi(2, [azione('pg_oreste', 'Scaccio i non morti col simbolo sacro')]);
    expect(r2.fatti.join(' ')).toMatch(/Oreste ha appena fallito Scacciare i morti: deve aspettare prima di riprovare/);
  });

  it('at the 4th level: D destroys the skeleton with 1d8 × 4 rolled once, T turns the putrid one with no roll needed', async () => {
    const m = motoreCripta({ 20: [3], 6: [6], 8: [2] }, { allInizio: { pg: { pg_oreste: { livello: 4 } }, tempo: null } });
    const r = await m.risolvi(1, [azione('pg_oreste', 'Scaccio i non morti col simbolo sacro')]);
    const f = r.fatti.join(' ');
    // 1d8 × 4: four dice of 2 = 8 against Ossa's 6 hit points.
    expect(f).toMatch(/Scacciare i morti: Ossa prende 8 danni/);
    expect(f).toMatch(/Ossa si sgretola in polvere\./);
    expect(m.stato.fuoriGioco('png_ossa')).toBe('morto');
    expect(condizioni(m, 'png_putrido')).toEqual(['scacciato']);
    expect(f).not.toMatch(/fallito almeno in parte/);
  });

  it('a failure on the weakest: nobody is turned, and the power is locked', async () => {
    const m = motoreCripta({ 20: [4], 6: [6] });
    const r = await m.risolvi(1, [azione('pg_oreste', 'Scaccio i non morti col simbolo sacro')]);
    expect(r.fatti.join(' ')).toMatch(/non riesce su nessuno/);
    expect(condizioni(m, 'png_ossa')).toEqual([]);
    expect(r.fatti.join(' ')).toMatch(/fallito almeno in parte/);
  });

  it('a class without the table: its words do not call the power, an attack on the undead stays an attack', async () => {
    const m = motoreCripta({ 20: [20], 6: [6] });
    const r = await m.risolvi(1, [azione('pg_gaia', 'Colpisco i morti con la lancia, Ossa per primo')]);
    expect(r.fatti.join(' ')).toMatch(/Gaia: attacco con Lancia a Ossa/);
    const r2 = await m.risolvi(2, [azione('pg_gaia', 'Alzo il simbolo sacro e scaccio i morti')]);
    expect(r2.fatti.join(' ')).not.toMatch(/Scacciare i morti/);
    expect(condizioni(m, 'png_ossa')).toEqual([]);
  });

  it('manual rolls: the player is asked the d20, then the 2d6 hit dice', async () => {
    const m = motoreCripta({ 20: [1], 6: [1] });
    const d = await m.decidi(1, [azione('pg_oreste', 'Scaccio i non morti col simbolo sacro')]);
    const [r1] = m.richiesteGiocatori(d).filter((x) => x.chi === 'pg_oreste');
    expect(r1).toMatchObject({ etichetta: 'Scacciare i morti', facce: 20, quanti: 1 });
    const dopo = m.richiesteGiocatori(d, new Map([inserito(r1!, [16])])).filter((x) => x.chi === 'pg_oreste');
    expect(dopo).toEqual([expect.objectContaining({ etichetta: 'Scacciare i morti: dadi vita colpiti', facce: 6, quanti: 2 })]);
    const e = m.completa(d, new Map([inserito(r1!, [16]), inserito(dopo[0]!, [1, 1])]), true);
    expect(e.fatti.join(' ')).toMatch(/Dadi vita colpiti: 2; ne subiscono l'effetto Ossa\./);
  });
});
