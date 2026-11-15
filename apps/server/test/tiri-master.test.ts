/**
 * The Game Master's own rolls (docs/prove.md §9): the world's uncertain outcomes are rolled by the Engine through the
 * Game Master's roll path, logged, listed on the panel, and shown at the table by the campaign's `regole.tiri_master`
 * (hidden by default; «a_volte» for a toss-up; always; or when the data asks). Invented fixture `prove`, with a gate
 * on its clock that rolls a d6 when a fight starts.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { loggerMuto } from '../src/logger';
import { DadiACopione } from '../src/prove/dadi';
import { TiriDelMaster, mostraTiroDelMaster, probabilita } from '../src/prove/tiri-master';
import { Prova, attendi, inizia } from './aiuti/partita';

describe('which Game Master rolls the table sees', () => {
  it('hidden by default; always with «visibili»; a toss-up with «a_volte»; the data can ask', () => {
    expect(mostraTiroDelMaster('nascosti', { visibile: false, dado: 6, almeno: 4 }).mostra).toBe(false);
    expect(mostraTiroDelMaster('nascosti', { visibile: true, dado: 6, almeno: 4 })).toEqual({ mostra: true, perche: 'dati' });
    expect(mostraTiroDelMaster('visibili', { visibile: false, dado: 6, almeno: 6 }).mostra).toBe(true);
    // a_volte: 3+, 4+ and 5+ on a d6 (2/3, 1/2, 1/3) are a toss-up; 6+ (1/6) and 2+ (5/6) are not.
    expect([2, 3, 4, 5, 6].map((almeno) => mostraTiroDelMaster('a_volte', { visibile: false, dado: 6, almeno }).mostra)).toEqual([false, true, true, true, false]);
    expect(probabilita(20, 11)).toBe(0.5);
    expect(mostraTiroDelMaster('a_volte', { visibile: false, dado: 20, almeno: 19 }).mostra).toBe(false);
  });

  it('rolls with the given dice, keeps the last rolls with their reason, shows only what the rule says', () => {
    const mostrate: string[] = [];
    let n = 0;
    const t = new TiriDelMaster({ modo: () => 'a_volte', dadi: () => new DadiACopione([5, 1]), log: loggerMuto(), nuovoIdTiro: () => `t${++n}`, nome: () => 'Il master', mostra: (c) => mostrate.push(`${c.id}:${c.dado}`) });
    expect(t.tira({ origine: 'o_x#0', motivo: 'o_x: scontro', turno: 3, dado: 6, almeno: 4, visibile: false })).toEqual({ riuscito: true, valore: 5, dado: 6, almeno: 4, visibile: true });
    expect(t.tira({ origine: 'o_x#1', motivo: 'o_x: lascia_scena', turno: 4, dado: 6, almeno: 2, visibile: false })).toMatchObject({ riuscito: true, visibile: false });
    expect(mostrate).toEqual(['t1:5']);
    expect(t.registro().map((r) => [r.origine, r.motivo, r.valore, r.mostrato])).toEqual([
      ['o_x#0', 'o_x: scontro', 5, true],
      ['o_x#1', 'o_x: lascia_scena', 5, false],
    ]);
  });
});

describe('Game Master rolls with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  const conPorta = (d: Record<string, unknown>): void => {
    const o = (d['orologi'] as Array<Record<string, unknown>>)[0]!;
    o['avanza_quando'] = [{ quando: 'scontro', tiro: { dado: 6, almeno: 4 } }];
  };

  it('«visibili»: the world asks a roll when the fight starts, the table sees the Game Master card, the panel the reason', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove', { ritocchi: { 'campagna.yaml': conPorta } });
    const { url } = await prova.avvia(cartella, () => '[narratore] Il fiume rumoreggia.\n[invito] tutti', { TAGM_TIRI_MASTER: 'visibili' }, { dadi: new DadiACopione([5]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    await inizia(schermo, ida);
    const conCarta = attendi(schermo, (x) => (x.tiri ?? []).some((t) => t.del_master));
    expect(await master.comanda({ tipo: 'combattimento_inizia' })).toEqual({ ok: true });
    const st = await conCarta;
    const carta = st.tiri!.find((t) => t.del_master)!;
    expect(carta).toMatchObject({ chi: 'master', nome: 'Il master', dadi: [5], facce: 6, riuscita: true, contro_nascosto: true });
    // The reason stays with the Game Master.
    expect(JSON.stringify(carta)).not.toContain('o_piena');
    const sm = await master.stato();
    expect(sm.tiri?.master).toBe('visibili');
    expect(sm.tiri?.del_master).toMatchObject([{ origine: 'o_piena#0', motivo: 'o_piena: scontro', dado: 6, almeno: 4, valore: 5, riuscito: true, mostrato: true }]);
  });

  it('hidden by default: the roll happens, only the panel has it', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove', { ritocchi: { 'campagna.yaml': conPorta } });
    const { url } = await prova.avvia(cartella, () => '[narratore] Il fiume rumoreggia.\n[invito] tutti', {}, { dadi: new DadiACopione([2]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    await inizia(schermo, ida);
    expect(await master.comanda({ tipo: 'combattimento_inizia' })).toEqual({ ok: true });
    const sm = await master.stato();
    expect(sm.tiri?.master).toBe('nascosti');
    expect(sm.tiri?.del_master).toMatchObject([{ origine: 'o_piena#0', valore: 2, riuscito: false, mostrato: false }]);
    expect((sm.tavolo.tiri ?? []).some((t) => t.del_master)).toBe(false);
  });
});
