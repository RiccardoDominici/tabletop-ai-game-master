/**
 * Presence tags (docs/coerenza.md §1): the narration proposes [esce] png_x verso … / [entra] png_x, the Engine checks
 * them and keeps them for the visit. Third e2e pass, bug 9: Ugo took the road to the charcoal pile and went on talking
 * in the yard. Rebuilt on fixture names: the parser reads the tags, the director accepts a known NPC who is here (or
 * refuses one who is not), the NPC's next lines are dropped, the ledger says where he went, the panel undoes it.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { ParserNarratore } from '../src/narrazione/parser';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

describe('parser: [esce] and [entra]', () => {
  it('the NPC by id or alias, where to after «verso»; never a sentence', () => {
    const p = new ParserNarratore({ idPng: ['png_bertoldo'], idPg: ['pg_ida'], alias: { gabelliere: 'png_bertoldo' } });
    const ev = [...p.aggiungi('[narratore] Bertoldo prende la strada del mulino.\n[esce] png_bertoldo verso il mulino\n[entra] gabelliere\n[invito] tutti\n'), ...p.chiudi()];
    expect(ev.filter((e) => e.tipo === 'presenza')).toEqual([
      { tipo: 'presenza', png: 'png_bertoldo', presente: false, verso: 'il mulino', grezzo: 'png_bertoldo verso il mulino' },
      { tipo: 'presenza', png: 'png_bertoldo', presente: true, verso: null, grezzo: 'gabelliere' },
    ]);
    expect(ev.filter((e) => e.tipo === 'frase').map((e) => (e.tipo === 'frase' ? e.testo : ''))).toEqual(['Bertoldo prende la strada del mulino.']);
  });
});

describe('presence tags with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('Bertoldo leaves: his next line is dropped, the ledger says where; the panel brings him back', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (t: number): string =>
      t === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : t === 1
          ? '[narratore] Bertoldo prende la strada del mulino senza voltarsi.\n[esce] png_bertoldo verso il mulino\n[esce] png_nessuno\n[invito] tutti'
          : '[png_bertoldo] Il pedaggio si paga.\n[narratore] Il vento soffia sul ponte.\n[invito] tutti';
    const { url, messaggi } = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    let s = await inizia(schermo, ida);
    for (const testo of ['Guardo Bertoldo.', 'Chiedo a Bertoldo del pedaggio.']) {
      const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === s.turno + 1);
      await agisci(ida, 'pg_ida', testo, s.versione_scena);
      s = await dopo;
    }
    // Turn 2: Bertoldo is gone, so his line is not heard; the narrator's message said where he went.
    expect(s.trascrizione.filter((v) => v.turno === 2).map((v) => v.testo)).toEqual(['Chiedo a Bertoldo del pedaggio.', 'Il vento soffia sul ponte.']);
    expect(messaggi.at(-1)).toMatch(/Usciti dalla scena: Bertoldo \(al turno 1, verso il mulino\)/);
    const master = await prova.master(url);
    expect((await master.stato()).coerenza?.entita.find((e) => e.id === 'png_bertoldo')).toMatchObject({ presenza: 'uscito' });
    // The Game Master brings him back from the panel: his decision wins over the tag.
    expect(await master.comanda({ tipo: 'presenza', id_png: 'png_bertoldo', presente: true })).toEqual({ ok: true });
    expect((await master.stato()).coerenza?.entita.find((e) => e.id === 'png_bertoldo')).toMatchObject({ presenza: 'in_scena' });
  });
});
