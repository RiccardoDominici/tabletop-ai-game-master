/**
 * Rientro in una scena già visitata (playtest di nozze-neve, fase 2 §E): tornando in casera il
 * narratore rileggeva l'apertura intera, e per la prima scena anche il riassunto di sessione che il
 * caricatore le incolla in testa. Ora: la battuta di `rientro` della scheda (tr_casera, la prima
 * volta), poi la prima frase dell'apertura; una scena senza `rientro` dice solo la prima frase.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@cantastorie/shared';
import { RADICE_REPO } from '../src/percorsi';
import { attendi, inizia, Prova, turno } from './aiuti/partita';

const NOZZE = path.join(RADICE_REPO, 'campagne', 'nozze-neve');

let prova: Prova;
afterEach(async () => prova?.chiudi());

describe('rientro in una scena già visitata', () => {
  it('la casera non si rilegge da capo: prima tr_casera, poi la prima frase; casa Bonfanti la sua prima frase', async () => {
    prova = new Prova();
    const cartella = path.join(prova.cartella, 'nozze-neve');
    fs.cpSync(NOZZE, cartella, { recursive: true, filter: (f) => !f.includes(`${path.sep}immagini`) && !f.includes(`${path.sep}audio${path.sep}`) });
    const { url } = await prova.avvia(cartella, () => '[narratore] Ida, il pomeriggio va avanti.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_ida');
    const m = await prova.master(url);
    let s = await inizia(schermo, tel);
    expect(s.trascrizione.find((v) => v.turno === 0)!.testo).toContain('Stamattina su Fontanive'); // il riassunto, una volta sola

    /** Cambia scena a finestra aperta e restituisce ciò che il narratore ha letto all'ingresso. */
    const vai = async (scena: string): Promise<string> => {
      const t0 = s.turno;
      const dopo = attendi(tel, (x) => x.fase === 'finestra' && x.turno === t0 + 1);
      expect(await m.comanda({ tipo: 'scena', scena })).toEqual({ ok: true });
      s = await dopo;
      return letto(s, t0);
    };
    const letto = (x: StatoTavolo, t: number) => x.trascrizione.filter((v) => v.turno === t && v.tipo === 'narrazione').map((v) => v.testo).join(' ');

    s = await turno(tel, 'pg_ida', s, 'Guardo la sala.');
    expect(await vai('scena_casa_bonfanti')).toContain('da dove cominciate?'); // prima volta: l'apertura intera
    const casera = await vai('scena_casera');
    expect(casera).toContain('il caldo vi viene incontro');
    expect(casera).not.toContain('Stamattina su Fontanive');
    expect(casera).not.toContain('chi si muove per primo?');
    const casa = await vai('scena_casa_bonfanti');
    expect(casa).toBe('A casa Bonfanti la scala scricchiola, e dalla stalla sale odore di fieno.');
    const ancora = await vai('scena_casera'); // tr_casera ha max_usi 1: ora la prima frase dell'apertura
    expect(ancora).toBe('Nella casera dei Bonfanti una riga di forme di formaggio divide la sala in due.');
    const cambi = prova.narrazioni().filter((r) => r['tipo'] === 'cambio_scena');
    expect(cambi.map((r) => r['rientro'] ?? null)).toEqual([null, 'tr_casera', 'testo', 'testo']);
    expect((await m.stato()).repertorio!.usate.map((b) => b.id)).toContain('tr_casera');
  }, 40_000);
});
