/**
 * A41 (docs/mondo.md §3): a clock consequence's line is the Engine's. It never enters the reader's catalogue (on
 * torre-mozza the mark-3 line was a filler the reader used first, so the consequence fell back to its sentence), and
 * the Engine says it at the mark. Invented fixture (mini), scripted narrator, no model call.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { inizia, Prova, turno } from './aiuti/partita';

describe('a consequence line is said only by the Engine, at its mark', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('picked by the reader before the mark: refused, off the catalogue; at the mark: the Engine says it', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', {
      battute: {
        'png_oste.yaml': [
          { id: 'oste_tempesta', chi: 'png_oste', tipo: 'momento', quando: 'al primo tuono (la dice il Motore)', temi: [], testo: ['[png_oste] Chiudo le imposte. Stanotte non esce nessuno.'], max_usi: 1 },
        ],
      },
      ritocchi: {
        'campagna.yaml': (d) => {
          const o = (d['orologi'] as Array<Record<string, unknown>>).find((x) => x['id'] === 'o_temporale')!;
          o['conseguenze'] = [{ al_segno: 1, cosa: "L'oste chiude la locanda.", battuta: 'oste_tempesta' }];
        },
      },
    });
    const copione = (t: number): string =>
      t === 1 ? "[narratore] Anna parla all'oste.\n[usa] oste_tempesta > pg_anna\n[invito] tutti" : '[usa] nar_tuono > pg_anna\n[invito] tutti';
    const { url } = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, "Chiedo all'oste del vino.");
    s = await turno(tel, 'pg_anna', s, 'Guardo il temporale dalla finestra.');
    const narr = prova.narrazioni().filter((r) => r['tipo'] === 'turno');
    const uscita = (t: number) => narr.find((r) => r['turno'] === t)!['uscita'] as Array<{ tipo: string; id?: string; motivo?: string; motore?: boolean }>;
    // T1: the oste is named, but the consequence's line is not offered: the pick is refused as off the catalogue.
    expect(uscita(1).find((u) => u.id === 'oste_tempesta')).toMatchObject({ tipo: 'usa_rifiutato', motivo: expect.stringMatching(/non era nel catalogo/) });
    // T2: the first thunder is the mark; the Engine says the consequence's line in that response.
    expect(uscita(2).find((u) => u.id === 'oste_tempesta')).toMatchObject({ tipo: 'usa', motore: true });
    expect(s.trascrizione.filter((v) => v.turno === 2).map((v) => v.testo)).toContain('Chiudo le imposte. Stanotte non esce nessuno.');
  }, 20_000);
});
