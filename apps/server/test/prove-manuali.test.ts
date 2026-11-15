/**
 * Manual rolls in the Engine (docs/prove.md §8): what each player is asked to roll (from a dry run of the resolver),
 * the turn resolved with the dice they entered, the switch to the Engine's dice, and the card the table sees without
 * the DC. Invented fixtures: `prove` (SRD 5.2), `bx` (d20 with a fixed situational bonus), `soglia` (d100 roll-under
 * with a bonus tens die), `pbta` (2d6), and a copy of `bx` with an x-in-6 ability.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { totaleRichiesta } from '@tabletop-ai-gm/shared';
import { cartaPerIlTavolo, erroreValori, richiestaPubblica } from '../src/prove/richieste';
import { az, inserito, motoreSet, motoreSrd } from './aiuti/motori-prove';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');

describe('manual rolls, SRD 5.2', () => {
  it('Persuasion with advantage: the phone is asked two d20 and the bonus, never the DC; the card uses the dice entered', async () => {
    // The Engine's dice would give 1 and 1: if they were used, the card would show them.
    const m = motoreSrd({ 'Convinco Bertoldo a farci passare gratis': { tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' } }, [1]);
    const d = await m.decidi(3, [az('a1', 'pg_ida', 'Convinco Bertoldo a farci passare gratis')]);
    const [r] = m.richiesteGiocatori(d);
    expect(r).toMatchObject({ id: 'r_a1', chi: 'pg_ida', tipo: 'prova', etichetta: 'Persuasione (Carisma)', facce: 20, quanti: 2, tieni: 'alto', somma: false, modificatore: 5, vantaggio: 'vantaggio', sotto_soglia: false });
    // The panel sees the DC; the public request has none.
    expect(r!.contro).toMatchObject({ tipo: 'CD', valore: 15 });
    const pubblica = richiestaPubblica(r!);
    expect(JSON.stringify(pubblica)).not.toMatch(/contro|bersaglio|regola|"15"/);
    // The dry run left the real state alone: no card, no die drawn.
    expect(m.tiriPubblici()).toEqual([]);
    const e = m.completa(d, new Map([inserito(r!, [4, 13])]));
    expect(e.tiri[0]).toMatchObject({ dadi: [4, 13], dado: 13, totale: 18, riuscita: true, manuale: 'telefono', contro: { valore: 15 } });
    expect(totaleRichiesta(r!, [4, 13])).toBe(18);
    // What the table sees: total and outcome, no DC and no rule text.
    const tavolo = cartaPerIlTavolo(e.tiri[0]!);
    expect(tavolo).toMatchObject({ totale: 18, riuscita: true, contro_nascosto: true, contro: { valore: 0, descrizione: null } });
    expect(tavolo.regola).toBeUndefined();
  });

  it('an attack: the player rolls the d20, the Engine rolls the damage', async () => {
    const t = 'Tiro con la balestra leggera a Ruggero';
    const m = motoreSrd({ [t]: { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' } }, [6]);
    const d = await m.decidi(3, [az('a1', 'pg_corrado', t)]);
    const [r] = m.richiesteGiocatori(d);
    expect(r).toMatchObject({ tipo: 'attacco', facce: 20, quanti: 1, tieni: null });
    expect(r!.contro.tipo).toBe('CA');
    const e = m.completa(d, new Map([inserito(r!, [18])]));
    expect(e.tiri[0]).toMatchObject({ tipo: 'attacco', dadi: [18], riuscita: true, manuale: 'telefono' });
    // 1d8 from the Engine's dice (6) + Dexterity.
    expect(e.tiri[0]!.danno?.dadi).toEqual([6]);
  });

  it('two attacks on the same NPC both ask a roll (the dry run downs nobody); switched to automatic, the Engine rolls', async () => {
    const t1 = 'Tiro con la balestra leggera a Ruggero';
    const t2 = 'Colpisco Ruggero con la spada lunga';
    const m = motoreSrd({ [t1]: { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' }, [t2]: { tipo: 'attacco', bersaglio: 'png_ruggero' } }, [2, 2, 2]);
    const d = await m.decidi(3, [az('a1', 'pg_corrado', t1), az('a2', 'pg_ida', t2)]);
    const rs = m.richiesteGiocatori(d);
    expect(rs.map((r) => r.chi)).toEqual(['pg_corrado', 'pg_ida']);
    const e = m.completa(d, new Map([inserito(rs[0]!, [3]), inserito(rs[1]!, null, 'motore')]));
    expect(e.tiri.map((t) => [t.chi, t.dadi, t.manuale])).toEqual([
      ['pg_corrado', [3], 'telefono'],
      ['pg_ida', [2], 'motore'],
    ]);
  });

  it('a player test without a request (manual turn): the Engine rolls it, says so, and its DC stays hidden', async () => {
    const t = 'Tiro con la balestra leggera a Ruggero';
    const m = motoreSrd({ [t]: { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' } }, [15, 6]);
    const d = await m.decidi(3, [az('a1', 'pg_corrado', t)]);
    const e = m.completa(d, new Map(), true);
    expect(e.tiri[0]).toMatchObject({ dadi: [15], manuale: 'motore' });
    expect(m.tiriPubblici()[0]).toMatchObject({ contro_nascosto: true, contro: { valore: 0 } });
    // Automatic turn: nothing marked, the DC on the card.
    const auto = motoreSrd({ [t]: { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' } }, [15, 6]);
    const e2 = auto.completa(await auto.decidi(3, [az('a1', 'pg_corrado', t)]));
    expect(e2.tiri[0]!.manuale).toBeUndefined();
    expect(auto.tiriPubblici()[0]!.contro.valore).toBeGreaterThan(0);
  });

  it('a dead PC asks no roll, and its fact says dead, not down', async () => {
    const t = 'Tiro con la balestra leggera a Ruggero';
    const m = motoreSrd({ [t]: { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' } }, [15]);
    m.stato.danneggia('pg_corrado', 99);
    m.stato.segnaUscito('pg_corrado', 'morto');
    const d = await m.decidi(3, [az('a1', 'pg_corrado', t)]);
    expect(m.richiesteGiocatori(d)).toEqual([]);
    expect(m.completa(d, new Map(), true).fatti[0]).toBe('[1] Corrado Lanzi: è morto.');
  });

  it('no roll, no request: plain speech and an action the arbiter calls trivial', async () => {
    const m = motoreSrd({ 'Saluto Bertoldo': { tipo: 'nessuna' } }, [10]);
    const d = await m.decidi(3, [az('a1', 'pg_ida', 'Saluto Bertoldo')]);
    expect(m.richiesteGiocatori(d)).toEqual([]);
  });

  it('a private action: its request is marked private (only its player\'s phone)', async () => {
    const t = 'Apro di nascosto il lucchetto della cassetta del pedaggio';
    const m = motoreSrd({ [t]: { tipo: 'prova', abilita: 'rapidita_di_mano', prova_scena: 'p_cassetta' } }, [10]);
    const d = await m.decidi(3, [az('a1', 'pg_teo', t, true)]);
    const [r] = m.richiesteGiocatori(d);
    expect(r).toMatchObject({ privata: true, chi: 'pg_teo' });
    expect(r!.contro.valore).toBe(15);
  });

  it('the values must fit the request', () => {
    const r = { facce: 20, quanti: 2, tieni: 'alto' as const, somma: false, tenuti: 1, modificatore: 3 };
    expect(erroreValori(r, [4])).toBe('quanti');
    expect(erroreValori(r, [4, 21])).toBe('facce');
    expect(erroreValori(r, [4, 2.5])).toBe('facce');
    expect(erroreValori(r, [4, 20])).toBeNull();
    expect(totaleRichiesta({ ...r, tieni: 'basso' }, [4, 20])).toBe(7);
  });
});

describe('manual rolls with a manual\'s rule set', () => {
  it('d20 with a fixed situational bonus (no second die): one d20, the bonus includes the +2', async () => {
    const t = 'Convinco Bertoldo a lasciarci passare';
    const m = motoreSet(path.join(FIX, 'bx'), { [t]: { tipo: 'prova', caratteristica: 'potere', bersaglio: 'png_bertoldo', vantaggio: 'vantaggio', motivo: 'gli offro da bere' } }, [1]);
    const d = await m.decidi(1, [az('a1', 'pg_ida', t)]);
    const [r] = m.richiesteGiocatori(d);
    expect(r).toMatchObject({ facce: 20, quanti: 1, tieni: null, modificatore: 2 });
    const e = m.completa(d, new Map([inserito(r!, [12])]));
    expect(e.tiri[0]).toMatchObject({ dadi: [12], totale: 14, manuale: 'telefono' });
  });

  it('d100 roll-under with a bonus tens die: two percentiles, the lowest kept, no bonus', async () => {
    const t = 'Convinco Bertoldo a lasciarci passare';
    const m = motoreSet(path.join(FIX, 'soglia'), { [t]: { tipo: 'prova', abilita: 'persuadere', bersaglio: 'png_bertoldo', vantaggio: 'vantaggio', motivo: 'conosce la famiglia' } }, [1]);
    const d = await m.decidi(1, [az('a1', 'pg_ida', t)]);
    const [r] = m.richiesteGiocatori(d);
    expect(r).toMatchObject({ facce: 100, quanti: 2, tieni: 'basso', modificatore: 0, sotto_soglia: true });
    expect(r!.contro.tipo).toBe('soglia');
    // 47 and 23: same units die in the manual (the second only gives its tens), so the card keeps 27 and 47 → 27.
    const e = m.completa(d, new Map([inserito(r!, [47, 23])]));
    expect(e.tiri[0]).toMatchObject({ facce: 100, dadi: [47, 27], dado: 27, manuale: 'telefono' });
    const sola = motoreSet(path.join(FIX, 'soglia'), { [t]: { tipo: 'prova', abilita: 'persuadere', bersaglio: 'png_bertoldo' } }, [1]);
    const d1 = await sola.decidi(1, [az('a1', 'pg_ida', t)]);
    const [r1] = sola.richiesteGiocatori(d1);
    const e1 = sola.completa(d1, new Map([inserito(r1!, [100])]));
    expect(e1.tiri[0]).toMatchObject({ dadi: [100], dado: 100 });
  });

  it('x in 6: a d6 under the sheet\'s chance', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'x-su-6-'));
    fs.cpSync(path.join(FIX, 'bx'), dir, { recursive: true });
    const f = path.join(dir, 'regole', 'regole.yaml');
    const set = YAML.parse(fs.readFileSync(f, 'utf8')) as Record<string, unknown>;
    set['abilita'] = [{ id: 'forzare', nome: 'Forzare una porta', caratteristica: null, soglia: { dado: 6, predefinita: 2 } }];
    fs.writeFileSync(f, YAML.stringify(set));
    const t = 'Sfondo la porta della cantina';
    const m = motoreSet(dir, { [t]: { tipo: 'prova', abilita: 'forzare' } }, [6]);
    const d = await m.decidi(1, [az('a1', 'pg_ida', t)]);
    const [r] = m.richiesteGiocatori(d);
    expect(r).toMatchObject({ facce: 6, quanti: 1, sotto_soglia: true, modificatore: 0 });
    const e = m.completa(d, new Map([inserito(r!, [2])]));
    expect(e.tiri[0]).toMatchObject({ dadi: [2], riuscita: true, manuale: 'telefono' });
  });

  it('2d6: two d6 added, plus the stat', async () => {
    const t = 'Convinco Bertoldo a lasciarci passare';
    const m = motoreSet(path.join(FIX, 'pbta'), { [t]: { tipo: 'prova', mossa: 'convincere', bersaglio: 'png_bertoldo' } }, [1]);
    const d = await m.decidi(1, [az('a1', 'pg_ida', t)]);
    const [r] = m.richiesteGiocatori(d);
    expect(r).toMatchObject({ facce: 6, quanti: 2, somma: true, tenuti: 2, modificatore: 2 });
    expect(totaleRichiesta(r!, [5, 6])).toBe(13);
    const e = m.completa(d, new Map([inserito(r!, [5, 6])]));
    expect(e.tiri[0]).toMatchObject({ dadi: [5, 6], totale: 13, grado: { id: 'successo' } });
  });
});
