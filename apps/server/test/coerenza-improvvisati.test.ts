/**
 * Minor characters improvised in play (docs/coerenza.md, «Characters the players invent»): in mode A the narrator may
 * bring one in with [nuovo png] Name, role; the Engine registers it in the ledger as «improvvisato» (no stats, no
 * secrets), tracks its presence, and keeps it for the session log and the Preparer. In mode B the tag is refused.
 * Invented fixture.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { ParserNarratore } from '../src/narrazione/parser';
import { slugImprovvisato } from '../src/scena/regia';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

describe('parser: [nuovo png]', () => {
  it('the name before the first comma, the role after; an unreadable tag is an anomaly', () => {
    const p = new ParserNarratore({ idPng: ['png_bertoldo'], idPg: ['pg_ida'], alias: {} });
    const ev = [...p.aggiungi('[narratore] Un pastore alza la mano.\n[nuovo png] Oreste, pastore della valle\n[nuovo png]\n[invito] tutti\n'), ...p.chiudi()];
    expect(ev.filter((e) => e.tipo === 'nuovo_png')).toEqual([{ tipo: 'nuovo_png', nome: 'Oreste', ruolo: 'pastore della valle', grezzo: 'Oreste, pastore della valle' }]);
    expect(ev.some((e) => e.tipo === 'anomalia' && e.codice === 'nuovo_png_illeggibile')).toBe(true);
    expect(slugImprovvisato('Madre Càrla')).toBe('madre_carla');
  });
});

describe('with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  async function partita(modo: 'improvvisa' | 'repertorio'): Promise<{ s: StatoTavolo; messaggi: string[]; url: string }> {
    prova = new Prova();
    const copione = (t: number): string =>
      t === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : t === 1
          ? '[narratore] Un pastore con un cappello di paglia alza la mano: si chiama Oreste.\n[nuovo png] Oreste, pastore\n[invito] tutti'
          : t === 2
            ? '[narratore] Oreste prende le pecore e scende verso il guado.\n[esce] Oreste verso il guado\n[invito] tutti'
            : '[narratore] Il vento soffia sul ponte.\n[invito] tutti';
    const { url, messaggi } = await prova.avvia(prova.campagna('prove'), copione, { TAGM_MODO: modo });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    let s = await inizia(schermo, ida);
    for (const testo of ['Chiedo al pastore come si chiama.', 'Saluto Oreste.', 'Guardo il ponte.']) {
      const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === s.turno + 1);
      await agisci(ida, 'pg_ida', testo, s.versione_scena);
      s = await dopo;
    }
    return { s, messaggi, url };
  }

  it('mode A: registered as «improvvisato», in the scene, then out with [esce] by its name; logged for the session', async () => {
    const { messaggi, url } = await partita('improvvisa');
    // Turn 2's message: Oreste is in the scene, marked improvised; turn 3's: he left toward the ford.
    expect(messaggi[1]).toMatch(/In scena: [^\n]*Oreste in piedi \(improvvisato: nessuna statistica, non sa nessun segreto\)/);
    expect(messaggi[2]).toMatch(/Usciti dalla scena: Oreste \(al turno 2, verso il guado\)/);
    const r = prova.narrazioni().filter((x) => x['tipo'] === 'png_improvvisato');
    expect(r).toEqual([expect.objectContaining({ id: 'png_imp_oreste', nome: 'Oreste', ruolo: 'pastore', turno: 1, scena: expect.any(String) })]);
    const master = await prova.master(url);
    expect((await master.stato()).coerenza?.entita.find((e) => e.id === 'png_imp_oreste')).toMatchObject({ tipo: 'improvvisato', presenza: 'uscito' });
  }, 20_000);

  it('mode B: the tag is refused (the neutral line answers new names there)', async () => {
    await partita('repertorio');
    expect(prova.narrazioni().filter((x) => x['tipo'] === 'png_improvvisato')).toEqual([]);
  }, 20_000);
});
