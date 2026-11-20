/**
 * The panel's gear and clock commands on a real server (docs/prove.md §10–11; master/comandi.ts): `inventario` and
 * `tempo` reach the Engine, a refusal comes back to the panel, and the phones' table state carries the PC's gear view
 * (`pg[].scorta`), so the phone's sheet changes without reopening it. On the invented bottega fixture, scripted narrator.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { Prova, attendi } from './aiuti/partita';

describe('the gear and the clock from the panel', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('a purchase, an armor swap, a refused purchase, time passing; the phone sees the new numbers', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('bottega'), () => '[narratore] La bottega è silenziosa.\n[invito] tutti', { TAGM_MODO: 'improvvisa' });
    const aldo = await prova.telefono(url, 'pg_aldo');
    const master = await prova.master(url);
    expect((await master.stato()).combattimento?.catalogo?.voci.some((v) => v.id === 'corda')).toBe(true);
    // The phone listens before the command: the new state comes right after it.
    const carico = attendi(aldo, (x: StatoTavolo) => x.pg.find((p) => p.id === 'pg_aldo')?.scorta?.carico?.fascia === 'Carico pesante');
    expect(await master.comanda({ tipo: 'inventario', id: 'pg_aldo', cosa: 'compra', oggetto: 'corda', quante: 2 })).toEqual({ ok: true });
    const s = await carico;
    expect(s.pg.find((p) => p.id === 'pg_aldo')!.scorta!.monete).toEqual([{ id: 'mo', nome: "Monete d'oro", quante: 18 }, { id: 'ma', nome: "Monete d'argento", quante: 5 }]);
    const difesa = attendi(aldo, (x: StatoTavolo) => x.pg.find((p) => p.id === 'pg_aldo')?.scorta?.difesa === 12);
    expect(await master.comanda({ tipo: 'inventario', id: 'pg_aldo', cosa: 'togli', oggetto: 'maglia' })).toEqual({ ok: true });
    await difesa;
    const no = await master.comanda({ tipo: 'inventario', id: 'pg_bice', cosa: 'compra', oggetto: 'corazza' });
    expect(no).toMatchObject({ ok: false, errore: expect.stringContaining('non ha abbastanza monete') });
    expect(await master.comanda({ tipo: 'tempo', cosa: 'avanza', durata: { ora: 1 } })).toEqual({ ok: true });
    expect((await master.stato()).combattimento?.tempo?.ora).toBe('giorno 1, 19:00');
    expect(await master.comanda({ tipo: 'tempo', cosa: 'avanza', durata: {} })).toMatchObject({ ok: false });
  });
});
