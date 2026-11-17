/**
 * Initiative by sides with the whole server (A2 of docs/da-fare.md: until now only unit-tested, no example campaign's
 * set uses it). Invented fixture `bx` (an old-school set: one d6 per side, re-rolled every round, four phases, the
 * NPCs strike only in the phase of their weapon). An attack opens the fight; the window opens for the PCs' whole side,
 * phase after phase; the NPC strikes in the melee phase only; round 2 rolls the sides again.
 * Also simultaneous ties (A17: `iniziativa.pari: simultanei`) on the same fixture made individual: the NPC the PC
 * drops at the same number still strikes, and the table hears it (the guards do not replace the sentence).
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { DadiACopione } from '../src/prove/dadi';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const COPIONE = (turno: number): string => (turno === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[narratore] Il ferro suona sul ferro.\n[invito] tutti');

describe('initiative by sides, whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the window opens for the PCs\' side phase by phase; the NPC strikes in melee only; round 2 re-rolls', async () => {
    prova = new Prova();
    // T1: Corrado 15 hits Ruggero (difesa 13), 3 damage. Sides PC 5, NPC 2 → PCs first. Melee (T5): Corrado 4 misses;
    // Ruggero 18 hits Corrado, 4 damage. Round 2: PC 1, NPC 6 → NPCs first.
    const dadi = new DadiACopione([15, 3, 5, 2, 4, 18, 4, 1, 6]);
    const { url, messaggi } = await prova.avvia(prova.campagna('bx'), COPIONE, { TAGM_TIRI_GIOCATORI: 'automatico' }, { dadi });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const corrado = await prova.telefono(url, 'pg_corrado');
    let s: StatoTavolo = await inizia(schermo, ida);

    // The opening attack.
    let dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(corrado, 'pg_corrado', 'Colpisco Ruggero con la spada', s.versione_scena);
    await agisci(ida, 'pg_ida', 'Resto dietro Corrado', s.versione_scena);
    s = await dopo;
    expect(messaggi.at(-1)).toMatch(/Inizia il combattimento\. Iniziativa per schieramento: PG 5, PNG 2; agiscono prima i PG\./);
    // The whole side is on turn, in the movement phase.
    expect([...(s.combattimento?.turno_di ?? [])].sort()).toEqual(['pg_corrado', 'pg_ida']);
    expect([...s.finestra.invitati].sort()).toEqual(['pg_corrado', 'pg_ida']);
    expect(messaggi.at(-1)).toMatch(/fase «Movimento»/);
    expect(s.combattimento?.combattenti.map((c) => c.id)).toEqual(['pg_ida', 'pg_corrado', 'png_ruggero']);

    // Movement, missiles, magic: the PCs wait; Ruggero (melee only) does nothing in those phases.
    for (const [turno, fase] of [[3, 'Proiettili'], [4, 'Magia'], [5, 'Mischia']] as const) {
      dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === turno);
      await agisci(corrado, 'pg_corrado', 'Tengo la spada alta', s.versione_scena);
      await agisci(ida, 'pg_ida', 'Resto dietro Corrado', s.versione_scena);
      s = await dopo;
      expect(messaggi.at(-1)).toMatch(new RegExp(`fase «${fase}»`));
      expect(messaggi.at(-1)).not.toMatch(/Turno di Ruggero/);
    }

    // Melee: Corrado swings, then Ruggero strikes back in his own melee step; then round 2 rolls the sides again.
    dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 6);
    await agisci(corrado, 'pg_corrado', 'Colpisco ancora Ruggero con la spada', s.versione_scena);
    await agisci(ida, 'pg_ida', 'Resto dietro Corrado', s.versione_scena);
    s = await dopo;
    const melee = messaggi.at(-1)!;
    expect(melee).toMatch(/Turno di Ruggero lo sgherro: Ruggero lo sgherro colpisce Corrado Lanzi/);
    expect(melee).toMatch(/Round 2: iniziativa PG 1, PNG 6; prima i PNG\./);
    expect(s.pg.find((p) => p.id === 'pg_corrado')?.pf?.attuali).toBeLessThan(8);
    // Round 2, NPCs first: their movement step needs no window, the PCs' movement opens for the side.
    expect([...(s.combattimento?.turno_di ?? [])].sort()).toEqual(['pg_corrado', 'pg_ida']);
  }, 30_000);
});

describe('simultaneous initiative ties, whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('a tie: the PC drops the NPC, the NPC strikes at that same moment, the table hears both', async () => {
    prova = new Prova();
    const cartella = prova.campagna('bx', {
      ritocchi: {
        'regole/regole.yaml': (d) => {
          const c = d['combattimento'] as Record<string, unknown>;
          c['iniziativa'] = { tipo: 'individuale', dado: 6, caratteristica: null, ogni_round: false, pari: 'simultanei' };
          c['fasi'] = [{ id: 'turno', nome: 'Turno', png: 'attacco' }];
        },
        'png/png_ruggero.yaml': (d) => {
          (d['scheda'] as Record<string, unknown>)['pf'] = 3;
        },
      },
    });
    const copione = (t: number): string =>
      t === 2 ? '[narratore] La spada di Corrado abbatte Ruggero.\n[narratore] Nello stesso istante la mazza di Ruggero colpisce Corrado alla spalla.\n[invito] tutti' : COPIONE(t);
    // T1: Corrado misses (2); initiative 4 and 4, a tie. T2: Corrado 15 hits for 5 (Ruggero has 3); Ruggero 15 hits for 4.
    const { url, messaggi } = await prova.avvia(cartella, copione, { TAGM_TIRI_GIOCATORI: 'automatico' }, { dadi: new DadiACopione([2, 4, 4, 15, 5, 15, 4]) });
    const schermo = await prova.proiettore(url);
    const corrado = await prova.telefono(url, 'pg_corrado');
    let s: StatoTavolo = await inizia(schermo, corrado);
    let dopo = attendi(corrado, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(corrado, 'pg_corrado', 'Colpisco Ruggero con la spada', s.versione_scena);
    s = await dopo;
    expect(messaggi.at(-1)).toMatch(/Iniziativa: Corrado Lanzi 4, Ruggero lo sgherro 4\./);
    expect(s.combattimento?.turno_di).toEqual(['pg_corrado']);
    dopo = attendi(corrado, (x: StatoTavolo) => (x.fase === 'finestra' && x.turno === 3) || x.fase === 'pausa', 15_000);
    await agisci(corrado, 'pg_corrado', 'Colpisco ancora Ruggero con la spada', s.versione_scena);
    s = await dopo;
    expect(messaggi.find((m) => m.includes('nello stesso istante'))).toMatch(/Turno di Ruggero lo sgherro, nello stesso istante in cui cade \(iniziativa pari\): Ruggero lo sgherro colpisce Corrado Lanzi: 4 danni/);
    expect(s.pg.find((p) => p.id === 'pg_corrado')?.pf).toEqual({ attuali: 4, massimi: 8 });
    expect(s.trascrizione.filter((v) => v.turno === 2).map((v) => v.testo)).toContain('Nello stesso istante la mazza di Ruggero colpisce Corrado alla spalla.');
  }, 30_000);

  it('the same tie in profile A\'s seat, the narration silent on the blow: the Engine\'s due line tells the PC\'s hit', async () => {
    prova = new Prova();
    prova.nomeNarratore = 'minimo';
    const cartella = prova.campagna('bx', {
      ritocchi: {
        'regole/regole.yaml': (d) => {
          const c = d['combattimento'] as Record<string, unknown>;
          c['iniziativa'] = { tipo: 'individuale', dado: 6, caratteristica: null, ogni_round: false, pari: 'simultanei' };
          c['fasi'] = [{ id: 'turno', nome: 'Turno', png: 'attacco' }];
        },
        'png/png_ruggero.yaml': (d) => {
          (d['scheda'] as Record<string, unknown>)['pf'] = 3;
        },
      },
    });
    const copione = (t: number): string =>
      t === 2 ? '[narratore] La spada di Corrado abbatte Ruggero.\n[invito] tutti' : COPIONE(t);
    // T1: Corrado misses (2); initiative 4 and 4, a tie. T2: Corrado 15 hits for 5 (Ruggero has 3); Ruggero 15 hits for 4.
    const { url, messaggi } = await prova.avvia(cartella, copione, { TAGM_TIRI_GIOCATORI: 'automatico' }, { dadi: new DadiACopione([2, 4, 4, 15, 5, 15, 4]) });
    const schermo = await prova.proiettore(url);
    const corrado = await prova.telefono(url, 'pg_corrado');
    let s: StatoTavolo = await inizia(schermo, corrado);
    let dopo = attendi(corrado, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(corrado, 'pg_corrado', 'Colpisco Ruggero con la spada', s.versione_scena);
    s = await dopo;
    expect(messaggi.at(-1)).toMatch(/Iniziativa: Corrado Lanzi 4, Ruggero lo sgherro 4\./);
    expect(s.combattimento?.turno_di).toEqual(['pg_corrado']);
    dopo = attendi(corrado, (x: StatoTavolo) => (x.fase === 'finestra' && x.turno === 3) || x.fase === 'pausa', 15_000);
    await agisci(corrado, 'pg_corrado', 'Colpisco ancora Ruggero con la spada', s.versione_scena);
    s = await dopo;
    expect(messaggi.find((m) => m.includes('nello stesso istante'))).toMatch(/Turno di Ruggero lo sgherro, nello stesso istante in cui cade \(iniziativa pari\): Ruggero lo sgherro colpisce Corrado Lanzi: 4 danni/);
    expect(s.pg.find((p) => p.id === 'pg_corrado')?.pf).toEqual({ attuali: 4, massimi: 8 });
    // Not «Ruggero giace a terra»: the fallen NPC's blow of this turn is a due fact, told by the Engine.
    expect(s.trascrizione.filter((v) => v.turno === 2).map((v) => v.testo)).toContain('Corrado incassa il colpo.');
  }, 30_000);
});
