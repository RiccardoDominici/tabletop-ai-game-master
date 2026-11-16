/**
 * The defeat path (docs/combattimento.md, «The defeat path»): when a fight ends with every PC at the table down, dead
 * or fled, the Engine says the scene's defeat ending (a prepared `finale` with `sconfitta: true`, or its own sentence)
 * and the table pauses for the Game Master. Round 5 (combat manual, T21–T25) had five silent turns of «… non agisce.».
 * Invented fixture: Corrado alone at the table, 1 hit point, no armour; Ruggero's mace drops him.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { testo } from '../src/lingua';
import { attendi, agisci, inizia, Prova } from './aiuti/partita';

class ArbitroColpo implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
    return Object.fromEntries(i.azioni.map((a) => [a.id, /colpisco/i.test(a.testo) ? { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' } : base(a.id)]));
  }
}

const fragile = (d: Record<string, unknown>): void => {
  const pg = (d['personaggi'] as Array<Record<string, unknown>>).find((p) => p['id'] === 'pg_corrado')!;
  const scheda = pg['scheda'] as Record<string, unknown>;
  scheda['pf'] = 1;
  scheda['armatura'] = { tipo: 'nessuna' };
  (scheda['caratteristiche'] as Record<string, number>)['destrezza'] = 1;
};

describe('the defeat path', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  async function gioca(battute: unknown[] = []) {
    prova = new Prova();
    const cartella = prova.campagna('prove', { ritocchi: { 'pg.yaml': fragile }, ...(battute.length ? { battute: { 'narrazione.yaml': battute } } : {}) });
    const { url } = await prova.avvia(cartella, () => '[narratore] La mazza di Ruggero cala.\n[invito] tutti', {}, { arbitroProve: new ArbitroColpo(), dadi: new DadiACopione([3]) });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_corrado');
    const s = await inizia(schermo, tel);
    const dopo = attendi(tel, (x) => (x.fase === 'pausa' && x.turno === s.turno) || (x.fase === 'finestra' && x.turno === s.turno + 1));
    await agisci(tel, 'pg_corrado', 'Colpisco Ruggero con la spada', s.versione_scena);
    return dopo;
  }

  it('the party down: the Engine\'s sentence, then the table pauses for the Game Master', async () => {
    const s = await gioca();
    const detto = s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(detto).toContain(testo('regia.righe.sconfitta'));
    expect(s.fase).toBe('pausa');
    expect(s.trascrizione.at(-1)?.testo).toBe(testo('regia.righe.fine_scena'));
  });

  it('a prepared defeat ending of the scene comes first', async () => {
    const finale = { id: 'nar_sconfitta', chi: 'narratore', tipo: 'finale', sconfitta: true, quando: 'i PG sono tutti a terra', temi: ['sconfitta'], richiede: { stati: { png_ruggero: 'in_gioco' } }, attori: ['png_ruggero'], testo: ['[narratore] Ruggero vi trascina al guado e vi lascia lì, legati, per il barone.'], max_usi: 1 };
    const s = await gioca([finale]);
    const detto = s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(detto).toContain('Ruggero vi trascina al guado e vi lascia lì, legati, per il barone.');
    expect(detto).not.toContain(testo('regia.righe.sconfitta'));
    expect(s.fase).toBe('pausa');
  });
});
