/**
 * Il finale (playtest di nozze-neve, conclusioni §1: nessuna partita aveva un finale, perché
 * `fin_tramonto` e `nar_chiusura` venivano rifiutati 11 volte «senza > pg»):
 * - a orologio della scena completo il Motore fa dire da sé il primo finale disponibile nell'ordine
 *   del repertorio (con il perché degli altri nel log), poi la chiusura, e il tavolo va in pausa;
 * - il selettore può usare un finale senza «> pg»; la chiusura e la pausa seguono lo stesso;
 * - orologio completo ma nessun finale disponibile: si continua come prima.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { TESTO_FINE_SCENA } from '../src/scena/regia';
import { inizia, Prova, turno } from './aiuti/partita';

const FINALI = [
  // Prima nell'ordine, ma vale solo dopo la confessione: in queste partite resta fuori.
  { id: 'fin_confessato', chi: 'narratore', tipo: 'finale', quando: 'la locanda chiude dopo la confessione', temi: [], richiede: { orologio: { id: 'o_temporale', min: 2, max: 2 }, battute_usate: ['oste_confessa'] }, testo: ['[narratore] L’oste chiude il conto e la porta.'], max_usi: 1 },
  { id: 'fin_temporale', chi: 'narratore', tipo: 'finale', quando: 'il temporale arriva', temi: [], richiede: { orologio: { id: 'o_temporale', min: 2, max: 2 }, battute_non_usate: ['oste_confessa'] }, testo: ['[narratore] Il fiume esonda: la locanda resta un’isola nella notte.'], max_usi: 1 },
  { id: 'nar_chiusura', chi: 'narratore', tipo: 'momento', quando: 'dopo il temporale', temi: [], richiede: { orologio: { id: 'o_temporale', min: 2, max: 2 } }, testo: ['[narratore] All’alba la valle sarà un lago. Chi resta, e chi parte?'], max_usi: 1 },
];

let prova: Prova;
afterEach(async () => prova?.chiudi());

async function partita(copione: (turno: number) => string) {
  prova = new Prova();
  const cartella = prova.campagna('mini', { battute: { 'narrazione.yaml': FINALI } });
  const { url } = await prova.avvia(cartella, copione);
  const schermo = await prova.proiettore(url);
  const tel = await prova.telefono(url, 'pg_anna');
  const m = await prova.master(url);
  return { schermo, tel, m, s: await inizia(schermo, tel) };
}

describe('il finale del Motore', () => {
  it('orologio completo: il Motore dice il primo finale disponibile e la chiusura, poi il tavolo va in pausa', async () => {
    const { tel, s, m } = await partita((t) =>
      t === 1 ? '[usa] nar_tuono > pg_anna\n[narratore] Anna?\n[invito] tutti' : '[usa] nar_porta > pg_anna\n[narratore] Anna, cosa fai?\n[invito] tutti',
    );
    const s2 = await turno(tel, 'pg_anna', s, 'Ascolto il temporale.');
    expect(s2.fase).toBe('finestra');
    const fine = await turno(tel, 'pg_anna', s2, 'Il temporale mi fa chiudere la porta.');
    expect(fine.fase).toBe('pausa');
    const testi = fine.trascrizione.filter((v) => v.turno === 2).map((v) => v.testo);
    expect(testi.slice(-3)).toEqual(['Il fiume esonda: la locanda resta un’isola nella notte.', 'All’alba la valle sarà un lago. Chi resta, e chi parte?', TESTO_FINE_SCENA]);
    expect(testi.join(' ')).toContain('La porta sbatte.');
    expect(testi.join(' ')).not.toContain('L’oste chiude il conto'); // il finale che non vale
    const registro = prova.turni().find((r) => r['turno'] === 2)!;
    expect(registro['finale']).toBe('fin_temporale');
    expect((await m.stato()).repertorio!.usate.map((b) => b.id)).toEqual(expect.arrayContaining(['fin_temporale', 'nar_chiusura']));
    // Il master può riprendere (il tavolo non è morto): si riapre la finestra per tutti.
    const ripresa = new Promise<void>((ok) => tel.on('stato', (x) => x.fase === 'finestra' && ok()));
    expect(await m.comanda({ tipo: 'riprendi' })).toEqual({ ok: true });
    await ripresa;
  }, 20_000);

  it('il selettore usa il finale senza «> pg»: accettato, chiusura e pausa seguono', async () => {
    // L'orologio lo completa il master a finestra aperta: il finale entra nel catalogo «per stato»
    // e al turno dopo lo sceglie il selettore, senza legarlo a nessuna azione.
    const { tel, s, m } = await partita((t) => (t === 1 ? '[usa] nar_tuono > pg_anna\n[invito] tutti' : t === 2 ? '[narratore] Anna esita.\n[usa] fin_temporale\n[invito] tutti' : '[narratore] Piove.\n[invito] tutti'));
    const s2 = await turno(tel, 'pg_anna', s, 'Ascolto il temporale.');
    expect(await m.comanda({ tipo: 'orologio', id: 'o_temporale', passo: 1 })).toEqual({ ok: true });
    const fine = await turno(tel, 'pg_anna', s2, 'Aspetto.');
    expect(fine.fase).toBe('pausa');
    const r = prova.narrazioni().find((x) => x['tipo'] === 'turno' && x['turno'] === 2)!;
    const uscita = r['uscita'] as Array<{ tipo: string; id?: string; motore?: boolean }>;
    expect(uscita.filter((u) => u.tipo === 'usa_rifiutato')).toEqual([]);
    expect(uscita.find((u) => u.id === 'fin_temporale')).toMatchObject({ tipo: 'usa', per: null });
    expect(uscita.find((u) => u.id === 'nar_chiusura')).toMatchObject({ tipo: 'usa', motore: true });
  }, 20_000);

  it('orologio completo senza un finale disponibile: si gioca avanti come prima', async () => {
    prova = new Prova();
    // Il finale vale solo dopo la confessione, che non arriva.
    const cartella = prova.campagna('mini', { battute: { 'narrazione.yaml': [FINALI[0]] } });
    const { url } = await prova.avvia(cartella, (t) => (t === 1 ? '[usa] nar_tuono > pg_anna\n[invito] tutti' : t === 2 ? '[usa] nar_porta > pg_anna\n[invito] tutti' : '[narratore] Piove.\n[invito] tutti'));
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const s = await inizia(schermo, tel);
    const s2 = await turno(tel, 'pg_anna', s, 'Ascolto il temporale.');
    const s3 = await turno(tel, 'pg_anna', s2, 'Il temporale mi fa chiudere la porta.');
    expect(s3).toMatchObject({ fase: 'finestra', turno: 3 });
    expect(prova.turni().find((r) => r['turno'] === 2)!['finale']).toBeNull();
  }, 20_000);
});
