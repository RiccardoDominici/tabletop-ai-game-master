/**
 * Monster specials (R4; docs/regole.md §2, «Bestiario»; audit P6-03, P6-16, P6-18, P6-19, P6-20, P6-25, P6-26): a hit's
 * rider with the target's save (paralysis on the clock, poison save-or-die), a special action in the monster's step (a
 * breath on every PC with a save for half, uses per day, at most every other round; a petrifying gaze), a creature only
 * silver or magic hurts, a damage type it is immune to. Invented fixture: test/fixtures/campagne/tana, without the
 * scene's raiders (`gregari: []`), so each fight is one monster against the PCs named.
 */
import { describe, expect, it } from 'vitest';
import type { RichiestaTiroMaster } from '@tabletop-ai-gm/shared';
import type { TiroInserito } from '../src/prove/richieste';
import type { MotoreProve } from '../src/prove/motore';
import type { FonteDadi } from '../src/prove/dadi';
import { DadiPerFacce, azione } from './aiuti/cripta';
import { motoreTana } from './aiuti/tana';

const inserito = (r: RichiestaTiroMaster, valori: number[]): [string, TiroInserito] => [r.id, { richiesta: r, valori, da: 'telefono' }];

/** Dice by faces that the manual-roll dry run can copy (it then sees the Engine's real next dice, not placeholder 1s). */
class DadiCopiabili implements FonteDadi {
  readonly seme = 'copiabili';
  contatore = 0;
  constructor(private readonly valori: Record<number, number[]>, private readonly i = new Map<number, number>()) {}
  tira(facce: number): number {
    this.contatore++;
    const l = this.valori[facce];
    if (!l?.length) return 1;
    const k = this.i.get(facce) ?? 0;
    this.i.set(facce, k + 1);
    return l[k % l.length]!;
  }
  clona(): FonteDadi {
    return new DadiCopiabili(this.valori, new Map(this.i));
  }
}
/** One monster on stage against the PCs named, with the dice by faces. */
const contro = (png: string, pg: string[], dadi: Record<number, number[]>): MotoreProve => motoreTana(new DadiPerFacce(dadi), { gregari: [] }, pg, undefined, [png]);
const usiRestanti = (m: MotoreProve, png: string, linea: string): number | undefined => m.esporta().risorse?.contatori.find(([id]) => id === png)?.[1].find(([k]) => k === `uso:${linea}`)?.[1];

describe('a hit\'s rider: the target saves, then the effect', () => {
  it('the clawbeast\'s claw paralyses a PC who fails the save, for turns on the game clock; a made save stops it', async () => {
    // d6: the bow's damage 1, Dario 1 (+1), the beast 6 (it acts at once), surprise 6. d20: the shot 20, then claw 20 and
    // Dario's save 1 (fails), claw 20 and his save 20 (made), bite 20. Claws 1, bite 2: Dario (5 HP) keeps 1.
    const m = contro('png_artigliatore', ['pg_dario'], { 6: [1, 1, 6, 6], 20: [20, 20, 1, 20, 20, 20], 3: [1], 4: [2] });
    const r = await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]);
    expect(r.fatti.join(' ')).toMatch(/Dario[^.]*paralizzato/);
    expect(m.attivi.condizioni('pg_dario')).toEqual(['paralizzato']);
    // The saves are Dario's own cards, next to the claws'.
    expect(r.tiri.filter((t) => t.tipo === 'salvezza' && t.chi === 'pg_dario').map((t) => t.riuscita)).toEqual([false, true]);
    // Paralysed, he loses his step: the paralysis lasts turns of the clock, not the fight.
    const r2 = await m.risolvi(2, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]);
    expect(r2.fatti.join(' ')).toMatch(/paralizzato/i);
  });

  it('a snake\'s poison: a failed save kills the PC outright, no death save follows', async () => {
    // The sword's damage d8 1; d6: Bruna 1, the snake 6, surprise 6; d20: Bruna's 20, the bite 20, her save 1.
    const m = contro('png_serpe', ['pg_bruna'], { 8: [1], 6: [1, 6, 6], 20: [20, 20, 1], 4: [1] });
    const r = await m.risolvi(1, [azione('pg_bruna', 'Colpisco Serpe di Cenere con la spada')]);
    expect(m.stato.fuoriGioco('pg_bruna')).toBe('morto');
    expect(r.fatti.join(' ')).toMatch(/Veleno della serpe/);
    expect(r.tiri.some((t) => t.chi === 'pg_bruna' && /morte/i.test(t.etichetta))).toBe(false);
  });

  it('manual rolls: the PC\'s save against the bite is asked at the table, in the monster\'s step', async () => {
    // The Engine's dice: the snake's initiative 6 and the surprise die 6, its bite 20, 1 damage.
    const m = motoreTana(new DadiCopiabili({ 6: [6, 6], 20: [20], 4: [1] }), { gregari: [] }, ['pg_bruna'], undefined, ['png_serpe']);
    const d = await m.decidi(1, [azione('pg_bruna', 'Colpisco Serpe di Cenere con la spada')]);
    let inseriti = new Map<string, TiroInserito>();
    let chiesto: RichiestaTiroMaster | undefined;
    for (let i = 0; i < 6 && !chiesto; i++) {
      const rq = m.richiesteGiocatori(d, inseriti);
      chiesto = rq.find((x) => x.per === 'salvezza');
      for (const x of rq) if (x !== chiesto) inseriti = new Map([...inseriti, inserito(x, Array(x.quanti).fill(x.facce === 20 ? 20 : 1))]);
    }
    expect(chiesto).toMatchObject({ chi: 'pg_bruna', tipo: 'salvezza', etichetta: 'Veleno della serpe', facce: 20 });
    const e = m.completa(d, new Map([...inseriti, inserito(chiesto!, [19])]), true);
    expect(e.fatti.join(' ')).toMatch(/Bruna resiste a Veleno della serpe/);
    expect(e.tiri.find((t) => t.tipo === 'salvezza' && t.chi === 'pg_bruna')?.manuale).toBe('telefono');
    expect(m.stato.fuoriGioco('pg_bruna')).toBeNull();
  });
});

describe('a special action in the monster\'s step', () => {
  it('a breath reaches every PC standing, 1d8 per hit die, a made save halves it; one use spent, no breath next round', async () => {
    // d6: the vial 1, Selva 1, Bruna 1, the drake 6, surprise 6; round 2 re-rolls (drake 6, Bruna 1, Selva 1). d20: the
    // vial 20, Bruna's save 1, Selva's 20, the claws and the next vial 1. d8 2: 4 hit dice = 4d8 = 8; Bruna takes 8,
    // Selva half (4).
    const m = contro('png_drago', ['pg_selva', 'pg_bruna'], { 6: [1, 1, 1, 6, 6, 6, 1, 1], 20: [20, 1, 20, 1, 1, 1], 8: [2], 4: [1] });
    const r = await m.risolvi(1, [azione('pg_selva', 'Lancio la fiala di gelo a Brina')]);
    expect(r.fatti.join(' ')).toMatch(/Brina usa Soffio di brina/);
    const danni = r.tiri.filter((t) => t.chi === 'png_drago' && t.etichetta === 'Soffio di brina').map((t) => [t.bersaglio?.id, t.danno?.totale]);
    expect(danni).toEqual([['pg_bruna', 8], ['pg_selva', 4]]);
    expect(usiRestanti(m, 'png_drago', 'soffio')).toBe(3);
    // Round 2: the breath is not ready (at most every other round): the drake bites and claws.
    const r2 = await m.risolvi(2, [azione('pg_selva', 'Lancio la fiala di gelo a Brina')]);
    const linee = r2.tiri.filter((t) => t.chi === 'png_drago').map((t) => t.etichetta);
    expect(linee).not.toContain('Soffio di brina');
    expect(linee).toContain('Morso');
    expect(usiRestanti(m, 'png_drago', 'soffio')).toBe(3);
  });

  it('a gaze petrifies a PC who fails: out of the fight like the dead; with nobody else standing the PCs lose', async () => {
    // d6: the shot 1, Dario 1 (+1), the eye 6, surprise 6; d20: the shot 20, Dario's save 1.
    const m = contro('png_occhio', ['pg_dario'], { 6: [1, 1, 6, 6], 20: [20, 1], 4: [1] });
    const r = await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco a Occhio di Pietra")]);
    expect(m.attivi.condizioni('pg_dario')).toContain('pietrificato');
    expect(r.combattimento?.sconfitta).toBe(true);
  });
});

describe('defences', () => {
  it('only silver or magic hurts the wraith: the sword hits for nothing and the card says why; the silver dagger hurts', async () => {
    const m = contro('png_spettro', ['pg_bruna'], { 6: [1], 20: [20], 8: [8], 4: [4] });
    const prima = m.stato.puntiFerita('png_spettro')!.attuali;
    const r = await m.risolvi(1, [azione('pg_bruna', 'Colpisco Lanterna Spenta con la spada')]);
    expect(r.fatti.join(' ')).toMatch(/Spada colpisce Lanterna Spenta ma non lo ferisce: lo feriscono solo armi argento o magica/);
    expect(m.stato.puntiFerita('png_spettro')!.attuali).toBe(prima);
    await m.risolvi(2, [azione('pg_bruna', "Colpisco Lanterna Spenta col pugnale d'argento")]);
    expect(m.stato.puntiFerita('png_spettro')!.attuali).toBeLessThan(prima);
  });

  it('a damage type the creature is immune to deals nothing', async () => {
    const m = contro('png_drago', ['pg_selva'], { 6: [1], 20: [20] });
    const prima = m.stato.puntiFerita('png_drago')!.attuali;
    const r = await m.risolvi(1, [azione('pg_selva', 'Lancio la fiala di gelo a Brina')]);
    expect(r.fatti.join(' ')).toMatch(/Brina è immune al danno da/);
    expect(m.stato.puntiFerita('png_drago')!.attuali).toBe(prima);
  });
});
