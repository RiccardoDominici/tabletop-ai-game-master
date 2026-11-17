/**
 * A16 (docs/f0-contratti.md, docs/strati.md): in mode A the narrator marks what its answer revealed, `[indizio] i_x`,
 * `[menzogna] <mente_su id>`, `[fatto] f_x`; the Engine checks each id like `[orologio]`, and the end-of-session log
 * gets clues, lies and known facts as in mode B (before: null sections). Invented fixtures, scripted narrator.
 */
import { afterEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { caricaCampagna } from '../src/campagna/caricatore';
import { ParserNarratore } from '../src/narrazione/parser';
import { MarcheRivelate } from '../src/scena/marche';
import { FIXTURE, inizia, Prova, turno } from './aiuti/partita';

describe('the protocol lines', () => {
  it('[indizio], [menzogna], [fatto] are control lines, never read aloud; an empty one is an anomaly', () => {
    const p = new ParserNarratore({ idPng: ['png_oste'], idPg: ['pg_anna'], alias: {} });
    const e = [...p.aggiungi('[narratore] Dietro il banco c’è una brocca.\n[indizio] i_brocca\n[Menzogna] oste_vino.\n[fatto] F_OSTE_LADRO\n[fatto]\n[invito] tutti\n'), ...p.chiudi()];
    expect(e.filter((x) => x.tipo === 'frase').map((x) => (x as { testo: string }).testo)).toEqual(['Dietro il banco c’è una brocca.']);
    expect(e.filter((x) => x.tipo === 'marca').map((x) => [(x as { cosa: string }).cosa, (x as { id: string }).id])).toEqual([
      ['indizio', 'i_brocca'],
      ['menzogna', 'oste_vino'],
      ['fatto', 'f_oste_ladro'],
    ]);
    expect(e.some((x) => x.tipo === 'anomalia' && (x as { codice: string }).codice === 'marca_vuota')).toBe(true);
  });
});

describe('MarcheRivelate: the Engine checks each id', () => {
  it('a clue of the scene, a canon fact not yet known, each once; the rest refused with why', () => {
    const m = new MarcheRivelate(caricaCampagna(path.join(FIXTURE, 'mini')));
    const o = { scena: 'scena_locanda', presenti: new Set(['png_oste']) };
    expect(m.proponi('indizio', 'i_brocca', 2, o)).toEqual({ ok: true });
    expect(m.proponi('indizio', 'i_brocca', 3, o)).toMatchObject({ ok: false, motivo: expect.stringMatching(/already marked at turn 2/) });
    expect(m.proponi('indizio', 'i_nessuno', 3, o)).toMatchObject({ ok: false, motivo: expect.stringMatching(/unknown clue/) });
    expect(m.proponi('indizio', 'i_vino_annacquato', 3, { ...o, scena: 'scena_altra' })).toMatchObject({ ok: false, motivo: expect.stringMatching(/not to the scene in play/) });
    expect(m.proponi('fatto', 'f_oste_ladro', 4, o)).toEqual({ ok: true });
    expect(m.proponi('fatto', 'f_pioggia', 4, o)).toMatchObject({ ok: false, motivo: expect.stringMatching(/known to the PCs from the start/) });
    expect(m.proponi('menzogna', 'non_una_bugia', 4, o)).toMatchObject({ ok: false, motivo: expect.stringMatching(/unknown lie/) });
    const salvate = m.esporta();
    expect(salvate).toEqual({ indizi: [['i_brocca', 2]], menzogne: [], fatti_noti: [['f_oste_ladro', 4]] });
    const n = new MarcheRivelate(caricaCampagna(path.join(FIXTURE, 'mini')));
    n.importa(salvate);
    expect(n.proponi('indizio', 'i_brocca', 9, o)).toMatchObject({ ok: false });
  });
});

describe('server, mode A: a marked clue reaches the turn log and the snapshot', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('accepted, refused, and in the end-of-session log', async () => {
    prova = new Prova();
    const copione = (t: number): string =>
      t === 1 ? "[narratore] Anna, dietro il banco c'è una brocca d'acqua.\n[indizio] i_brocca\n[indizio] i_inventato\n[invito] tutti" : '[narratore] Anna, la pioggia batte.\n[invito] tutti';
    const { url } = await prova.avvia(prova.campagna('mini'), copione, { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Guardo dietro il banco.');
    expect(s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ')).not.toMatch(/i_brocca|indizio/);
    const t1 = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!;
    expect(t1['marche']).toEqual([
      { cosa: 'indizio', id: 'i_brocca', ok: true },
      { cosa: 'indizio', id: 'i_inventato', ok: false, motivo: 'unknown clue i_inventato' },
    ]);
  });
});
