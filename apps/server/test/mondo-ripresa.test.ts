/**
 * The world across a restart (docs/mondo.md, «Log and state»): a server stops after a seen consequence, an off-screen
 * one and a turn in a new scene; a new server on the same archive resumes. Nothing is applied twice, the attitudes and
 * the log are back, and `resta_in_scena` keeps counting from the real entry into the scene (not from 0): the fixture's
 * gate opens every 3 turns of a visit to the wood.
 * Invented fixture: test/fixtures/campagne/mondo.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { attendi, emetti, inizia, Prova, turno } from './aiuti/partita';

describe('server, mode A: the world after a restart', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('keeps log, attitudes and the visit; applies nothing twice', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    const copione = (): string => '[narratore] Anna, il vento scuote i rami.\n[invito] tutti';
    const a = await prova.avvia(cartella, copione, { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(a.url);
    const tel = await prova.telefono(a.url, 'pg_anna');
    const master = await prova.master(a.url);
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Anna guarda la ruota del mulino.'); // o_piena 1, seen: the miller turns hostile to Anna
    const nelBosco = attendi(tel, (x) => x.fase === 'finestra' && x.turno === 3);
    expect(await master.comanda({ tipo: 'scena', scena: 'scena_bosco' })).toEqual({ ok: true }); // entry at turn 2; o_piena 2 off-screen
    s = await nelBosco;
    s = await turno(tel, 'pg_anna', s, 'Anna cammina tra gli alberi.'); // turn 3, first of the visit: o_voci's gate wants 3
    const prima = await master.stato();
    expect(prima.mondo?.cronaca.map((v) => v.id)).toEqual(['o_piena@1', 'o_piena@2']);
    for (const c of [schermo, tel, master.c]) c.disconnect();
    await a.s.chiudi();

    const b = await prova.avvia(cartella, copione, { TAGM_MODO: 'improvvisa' });
    const master2 = await prova.master(b.url);
    const ripreso = await master2.stato();
    expect(ripreso.tavolo.fase).toBe('attesa');
    expect(ripreso.mondo?.cronaca).toEqual(prima.mondo?.cronaca);
    expect(ripreso.mondo?.atteggiamenti).toEqual(prima.mondo?.atteggiamenti);
    expect(ripreso.presenze?.find((p) => p.id === 'png_mugnaio')?.presente).toBe(false); // moved to the bridge, still
    const schermo2 = await prova.proiettore(b.url);
    const tel2 = await prova.telefono(b.url, 'pg_anna');
    const finestra = attendi(tel2, (x) => x.fase === 'finestra');
    await emetti((cb) => schermo2.emit('schermo:inizia', cb));
    s = (await finestra) as StatoTavolo;
    s = await turno(tel2, 'pg_anna', s, 'Anna ascolta il vento.'); // turn 4, second of the visit (entry at 2)
    expect((await master2.stato()).mondo?.cronaca.map((v) => v.id)).toEqual(['o_piena@1', 'o_piena@2']);
    s = await turno(tel2, 'pg_anna', s, 'Anna si siede su un sasso.'); // turn 5, third of the visit: o_voci +1 off-screen
    // (counted from 0 after the restart, the gate would have opened at turn 3 or 6, never at 5)
    const dopo = await master2.stato();
    expect(dopo.mondo?.cronaca.map((v) => `${v.id}@t${v.turno}`)).toEqual(['o_piena@1@t1', 'o_piena@2@t2', 'o_voci@1@t5']);
    // Each consequence written once in the narration log, across the two servers.
    const righe = prova.narrazioni().filter((r) => r['tipo'] === 'mondo').map((r) => r['id']);
    expect(righe).toEqual(['o_piena@1', 'o_piena@2', 'o_voci@1']);
  }, 30_000);
});
