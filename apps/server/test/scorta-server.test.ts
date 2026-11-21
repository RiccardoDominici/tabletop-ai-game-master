/**
 * The panel's gear and clock commands on a real server (docs/prove.md §10–11; master/comandi.ts): `inventario` and
 * `tempo` reach the Engine, a refusal comes back to the panel, and each PC's phone gets its own gear view on its own
 * channel (`pg:scorta`), so the phone's sheet changes without reopening it, while the table state every phone and the
 * projector receive has nobody's purse (R2's leftover: it was in `pg[].scorta` for all). On the invented bottega fixture,
 * scripted narrator.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { ScortaScheda, StatoTavolo } from '@tabletop-ai-gm/shared';
import { Prova, attendi, attendiEvento, emetti } from './aiuti/partita';

describe('the gear and the clock from the panel', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('a purchase, an armor swap, a refused purchase, time passing; the phone sees the new numbers', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('bottega'), () => '[narratore] La bottega è silenziosa.\n[invito] tutti', { TAGM_MODO: 'improvvisa' });
    // The phone listens before choosing its PC: its gear comes when it is chosen.
    const aldo = prova.nuovo(url);
    await emetti<StatoTavolo>((cb) => aldo.emit('telefono:entra', cb));
    const primaScorta = attendiEvento<ScortaScheda | null>(aldo, 'pg:scorta', (x) => !!x);
    await emetti((cb) => aldo.emit('telefono:scegli_pg', { id_pg: 'pg_aldo', dispositivo: 'tel-pg_aldo-0123456789' }, cb));
    expect((await primaScorta)!.monete.length).toBeGreaterThan(0);
    const bice = await prova.telefono(url, 'pg_bice');
    const master = await prova.master(url);
    expect((await master.stato()).combattimento?.catalogo?.voci.some((v) => v.id === 'corda')).toBe(true);
    // Every gear event Bice's phone gets is Bice's own: never Aldo's purse.
    const diBice: Array<ScortaScheda | null> = [];
    bice.on('pg:scorta', (x: ScortaScheda | null) => diBice.push(x));
    // The phone listens before the command: the new gear comes right after it, on its own channel only.
    const carico = attendiEvento<ScortaScheda | null>(aldo, 'pg:scorta', (x) => x?.carico?.fascia === 'Carico pesante');
    const tavolo = attendi(aldo, () => true);
    expect(await master.comanda({ tipo: 'inventario', id: 'pg_aldo', cosa: 'compra', oggetto: 'corda', quante: 2 })).toEqual({ ok: true });
    const s = await carico;
    expect(s!.monete).toEqual([{ id: 'mo', nome: "Monete d'oro", quante: 18 }, { id: 'ma', nome: "Monete d'argento", quante: 5 }]);
    // The table state has no gear at all (hit points only).
    expect(JSON.stringify((await tavolo).pg)).not.toMatch(/scorta|monete|Carico/);
    const difesa = attendiEvento<ScortaScheda | null>(aldo, 'pg:scorta', (x) => x?.difesa === 12);
    expect(await master.comanda({ tipo: 'inventario', id: 'pg_aldo', cosa: 'togli', oggetto: 'maglia' })).toEqual({ ok: true });
    await difesa;
    expect(diBice.length).toBeGreaterThan(0);
    expect(diBice.every((x) => !JSON.stringify(x).includes('"quante":18'))).toBe(true);
    const no = await master.comanda({ tipo: 'inventario', id: 'pg_bice', cosa: 'compra', oggetto: 'corazza' });
    expect(no).toMatchObject({ ok: false, errore: expect.stringContaining('non ha abbastanza monete') });
    expect(await master.comanda({ tipo: 'tempo', cosa: 'avanza', durata: { ora: 1 } })).toEqual({ ok: true });
    expect((await master.stato()).combattimento?.tempo?.ora).toBe('giorno 1, 19:00');
    expect(await master.comanda({ tipo: 'tempo', cosa: 'avanza', durata: {} })).toMatchObject({ ok: false });
  });
});
