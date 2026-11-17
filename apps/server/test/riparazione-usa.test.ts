/**
 * A27 (docs/da-fare.md): the repair with a second call for a [usa] rejected for a reason another pick can mend (not in
 * the turn's catalogue, a clock's pace). In profile B the selector's own announcement names the PC, so the action
 * counted as answered and the repair never came. Invented fixture; scripted narrator (no model call).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { agisci, attendi, inizia, Prova, turno } from './aiuti/partita';

describe('a rejected [usa] in mode B gets the repair call, with the reason', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('off the catalogue: the repair message says why, and its answer is heard', async () => {
    prova = new Prova();
    const visti: string[] = [];
    const copione = (_t: number, m: string): string => {
      visti.push(m);
      return /## Azioni rimaste senza risposta/.test(m) ? '[narratore] Anna, il fuoco scoppietta nel camino.' : '[narratore] Anna si guarda intorno.\n[usa] nar_inesistente_xyz > pg_anna\n[invito] tutti';
    };
    const { url } = await prova.avvia(prova.campagna('mini'), copione);
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Mi siedo vicino al camino.');
    const riparazione = visti.find((m) => /## Azioni rimaste senza risposta/.test(m));
    expect(riparazione).toMatch(/la battuta che avevi scelto è stata rifiutata: battuta inesistente/);
    expect(s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo)).toContain('Anna, il fuoco scoppietta nel camino.');
    expect(prova.turni().at(-1)).toMatchObject({ riparazioni: 1 });
  });

  it('a clock\'s second sign in one reply, then a line not in the turn\'s catalogue: each repaired, with why', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', {
      battute: {
        'narrazione.yaml': [
          { id: 'nar_lampo', chi: 'narratore', tipo: 'segno_orologio', quando: 'il temporale si avvicina', temi: ['temporale'], testo: ['[narratore] Un lampo illumina la sala.'], effetti: { avanza_orologio: 'o_temporale' }, max_usi: 1 },
        ],
      },
    });
    const riparazioni: string[] = [];
    // Both PCs are named in the first sentence, as the selector's announcement would name them.
    const copione = (t: number, m: string): string => {
      if (/## Azioni rimaste senza risposta/.test(m)) return riparazioni.push(m), '[narratore] Anna, la pioggia batte sui vetri.';
      // T1: Bruno gets the clock's sign; Anna's pick is the same clock's second sign of the reply.
      if (t === 1) return '[narratore] Anna e Bruno guardano fuori.\n[usa] nar_tuono > pg_bruno\n[usa] nar_lampo > pg_anna\n[invito] tutti';
      // T2: Anna's pick is a real line, not in this turn's catalogue (nobody looks behind the counter).
      return '[narratore] Anna si alza.\n[usa] nar_brocca > pg_anna\n[invito] tutti';
    };
    const { url } = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(url);
    const anna = await prova.telefono(url, 'pg_anna');
    const bruno = await prova.telefono(url, 'pg_bruno');
    let s = await inizia(schermo, anna);
    for (const [perAnna, perBruno] of [['Guardo fuori dalla finestra.', 'Guardo il temporale dalla finestra.'], ['Mi siedo vicino al camino.', 'Bevo il mio vino.']] as const) {
      const dopo = attendi(anna, (x) => x.fase === 'finestra' && x.turno === s.turno + 1, 15_000);
      await agisci(anna, 'pg_anna', perAnna, s.versione_scena);
      await agisci(bruno, 'pg_bruno', perBruno, s.versione_scena);
      s = await dopo;
    }
    const rifiuti = prova
      .narrazioni()
      .filter((r) => r['tipo'] === 'turno')
      .flatMap((r) => (r['uscita'] as Array<{ tipo: string; id?: string; per?: string; riparabile?: boolean }>).filter((u) => u.tipo === 'usa_rifiutato').map((u) => [r['turno'], u.id, u.per, u.riparabile]));
    expect(rifiuti).toEqual([
      [1, 'nar_lampo', 'pg_anna', true],
      [2, 'nar_brocca', 'pg_anna', true],
    ]);
    expect(riparazioni).toHaveLength(2);
    const mancanti = riparazioni.map((m) => m.slice(m.indexOf('## Azioni rimaste senza risposta')));
    // Bruno got his sign: only Anna is repaired, each time with the reason of her refused pick.
    expect(mancanti[0]).toMatch(/\(pg_anna\).*rifiutata: un segno di o_temporale è già uscito in questa risposta/);
    expect(mancanti[0]).not.toMatch(/\(pg_bruno\)/);
    expect(mancanti[1]).toMatch(/\(pg_anna\).*rifiutata: non era nel catalogo del turno/);
  }, 20_000);
});
