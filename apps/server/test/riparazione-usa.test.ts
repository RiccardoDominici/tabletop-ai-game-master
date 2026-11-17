/**
 * A27 (docs/da-fare.md): the repair with a second call for a [usa] rejected for a reason another pick can mend (not in
 * the turn's catalogue, a clock's pace). In profile B the selector's own announcement names the PC, so the action
 * counted as answered and the repair never came. Invented fixture; scripted narrator (no model call).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { inizia, Prova, turno } from './aiuti/partita';

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
});
