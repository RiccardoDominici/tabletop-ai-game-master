/**
 * Un finale per scena. Dopo il finale il tavolo riapre la finestra (decide il master) e l'orologio resta
 * completo: senza guardia il Motore, o il selettore dal catalogo «per stato», diceva un altro finale a
 * ogni turno (log del 3 novembre: sei finali di fila).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { inizia, Prova, turno } from './aiuti/partita';

const FINALI = [
  { id: 'fin_temporale', chi: 'narratore', tipo: 'finale', quando: 'il temporale arriva', temi: [], richiede: { orologio: { id: 'o_temporale', min: 2, max: 2 } }, testo: ['[narratore] Il fiume esonda: la locanda resta un’isola.'], max_usi: 1 },
  { id: 'fin_bis', chi: 'narratore', tipo: 'finale', quando: 'il temporale arriva, altra versione', temi: [], richiede: { orologio: { id: 'o_temporale', min: 2, max: 2 } }, testo: ['[narratore] Un secondo finale che non deve uscire.'], max_usi: 1 },
];

let prova: Prova;
afterEach(async () => prova?.chiudi());

describe('un finale per scena', () => {
  it('detto il finale, il turno dopo né il Motore né il selettore ne dicono un altro', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('mini', { battute: { 'narrazione.yaml': FINALI } }), (t) =>
      t === 1 ? '[usa] nar_tuono > pg_anna\n[invito] tutti' : t === 2 ? '[usa] nar_porta > pg_anna\n[invito] tutti' : '[narratore] Anna, piove.\n[usa] fin_bis\n[invito] tutti',
    );
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const s = await inizia(schermo, tel);
    const s2 = await turno(tel, 'pg_anna', s, 'Ascolto il temporale.');
    const s3 = await turno(tel, 'pg_anna', s2, 'Il temporale mi fa chiudere la porta.');
    expect(prova.turni().find((r) => r['turno'] === 2)!['finale']).toBe('fin_temporale');
    await turno(tel, 'pg_anna', s3, 'Aspetto.');
    expect(prova.turni().find((r) => r['turno'] === 3)!['finale']).toBeNull();
    const n3 = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 3)!;
    expect((n3['uscita'] as Array<{ tipo: string; id?: string }>).find((u) => u.id === 'fin_bis')).toMatchObject({ tipo: 'usa_rifiutato' });
  }, 20_000);
});
