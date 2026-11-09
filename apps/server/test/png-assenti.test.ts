/**
 * PNG fuori scena (playtest di nozze-neve, fase 2 §B4): Zelia parlava in casera e Adelina a casa
 * Bonfanti, scene in cui «non vengono mai»; il Motore filtrava per `png_presenti` solo le battute
 * pre-scritte. Ora anche una riga improvvisata `[png_x]` di un PNG che non è nella scena si scarta
 * prima della voce e della trascrizione, con una riga di log e il conto nel registro del turno.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { inizia, Prova, turno } from './aiuti/partita';

let prova: Prova;
afterEach(async () => prova?.chiudi());

describe('righe improvvisate di PNG assenti', () => {
  it('la guardia non è nella scena: la sua riga non si sente e non si scrive; l’oste sì', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', { ritocchi: { 'scena.yaml': (d) => (d['png_presenti'] = ['png_oste']) } });
    const { url } = await prova.avvia(cartella, () => '[png_guardia] Fermi tutti, in nome del conte!\n[png_oste] Benvenuta, Anna: siediti.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const s = await inizia(schermo, tel);
    const s2 = await turno(tel, 'pg_anna', s, 'Entro e saluto.');
    const testi = s2.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ');
    expect(testi).not.toContain('Fermi tutti');
    expect(testi).toContain('Benvenuta, Anna');
    const registro = prova.turni().find((r) => r['turno'] === 1)!;
    expect(registro['righe_png_assenti']).toBe(1);
    const n = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!;
    expect((n['anomalie'] as Array<{ codice: string }>).map((a) => a.codice)).toContain('png_assente');
  }, 20_000);
});
