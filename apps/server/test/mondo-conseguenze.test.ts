/**
 * Marks make things happen (docs/mondo.md §3): consequences of a clock's marks and of the fronts' omens, applied
 * by state (never twice), heard only by who could perceive them, off-screen events that surface later as traces,
 * NPCs that move or change attitude. Invented fixture: test/fixtures/campagne/mondo.
 */
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaMondo } from '../src/campagna/mondo';
import { conScena, type Campagna } from '../src/campagna/tipi';
import { compilaContestoCampagna } from '../src/campagna/contesto';
import { loggerMuto } from '../src/logger';
import { MondoInGioco, type VoceCronaca } from '../src/mondo/mondo';
import { StatoOrologi } from '../src/scena/orologi';
import { inizia, Prova, turno } from './aiuti/partita';

const MONDO = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mondo');

/** A world on the fixture, with the director's scene switchable by the test. */
function mondoDiProva(scena = 'scena_mulino') {
  const c = caricaCampagna(MONDO);
  let corrente = scena;
  const orologi = new StatoOrologi(c);
  orologi.impostaScena(conScena(c, scena).scena, 0);
  const registrate: VoceCronaca[] = [];
  const rivelati: string[] = [];
  const mondo = new MondoInGioco({ campagna: c, orologi: () => orologi, scena: () => corrente, log: loggerMuto(), registra: (v) => registrate.push(v), rivela: (id) => rivelati.push(id) });
  const vai = (id: string, t: number): void => {
    corrente = id;
    orologi.impostaScena(conScena(c, id).scena, t);
  };
  return { c, orologi, mondo, registrate, rivelati, vai };
}

describe('campagna/mondo: what the Engine reads of the world', () => {
  it('consequences, omens with al_segno, dooms, timeline events on a mark, the fronts’ extra clocks', () => {
    const c: Campagna = caricaCampagna(MONDO);
    const m = c.mondo!;
    expect(m.conseguenze.map((x) => `${x.id}:${x.origine}:${x.alSegno}`)).toEqual([
      'o_piena@1:conseguenza:1',
      'o_voci@1:conseguenza:1',
      'o_piena@2:conseguenza:2',
      'p_fiume#0:presagio:3',
      'p_fiume@pieno:destino:4',
      'p_voci@pieno:destino:4',
      't_notte:evento:4',
    ]);
    const presagio = m.conseguenze.find((x) => x.id === 'p_fiume#0')!;
    expect(presagio).toMatchObject({ cosa: "Il fiume rompe l'argine a monte.", detto: 'Si sente un tonfo lontano, a monte.', cast: ['png_mugnaio'] });
    expect(m.orologiExtra.map((o) => o['id'])).toEqual(['o_voci']);
    expect(m.pericoli.map((p) => `${p.id}:${p.mosse.length}:${p.segniVisibili.length}`)).toEqual(['p_fiume:2:2', 'p_voci:1:1']);
    // The extra clock is a clock of the Engine, never active in a scene.
    const o = new StatoOrologi(c);
    expect(o.trova('o_voci')).toMatchObject({ segmenti: 4, pieni: 0 });
    expect(o.attivo('o_voci')).toBe(false);
  });

  it('an entry it cannot read is a warning, not a crash', () => {
    const avvisi: string[] = [];
    const m = caricaMondo([{ id: 'o_x', segmenti: 4, conseguenze: [{ al_segno: 9, cosa: 'troppo' }, { al_segno: 2 }] }], {}, (a) => avvisi.push(a));
    expect(m.conseguenze).toEqual([]);
    expect(avvisi).toHaveLength(2);
  });

  it('the consequences never reach the narrator’s cached context; preparazione neither', () => {
    const contesto = compilaContestoCampagna(caricaCampagna(MONDO));
    expect(contesto).not.toContain('rovina la farina');
    expect(contesto).not.toContain('rompe l');
    expect(contesto).toContain('Il fiume sale');
  });
});

describe('the fronts’ extra clocks between sessions', () => {
  it('a package’s pieni_all_inizio can say where an extra clock starts; the server accepts it', () => {
    const prova = new Prova();
    try {
      const cartella = prova.campagna('arco', {
        ritocchi: {
          'campagna.yaml': (d) => {
            (d['preparazione'] as Record<string, unknown>)['fronti'] = [{ id: 'fronte_x', pericoli: [], orologi_extra: [{ id: 'o_voce', nome: 'La voce gira', segmenti: 4 }] }];
          },
          'sessioni/02/sessione.yaml': (d) => {
            d['pieni_all_inizio'] = { o_temporale: 1, o_voce: 2 };
          },
        },
      });
      const c = caricaCampagna(cartella, undefined, { pacchetto: 2 });
      const o = new StatoOrologi(c);
      expect(o.trova('o_voce')).toMatchObject({ pieni: 2, segmenti: 4 });
      expect(o.trova('o_temporale')!.pieni).toBe(1);
      expect(new MondoInGioco({ campagna: c, orologi: () => o, scena: () => c.scena.id, log: loggerMuto() }).riconcilia(1)).toEqual([]);
    } finally {
      void prova.chiudi();
    }
  });
});

describe('MondoInGioco: consequences by state', () => {
  it('a mark seen: state changes at once, the sentence is queued for the Engine, the log has it', () => {
    const { orologi, mondo, registrate } = mondoDiProva();
    expect(mondo.atteggiamenti.stato('png_mugnaio', 'pg_anna')).toBe('indifferente');
    orologi.avanza('o_piena', 1, false);
    const nuove = mondo.riconcilia(1);
    expect(nuove).toMatchObject([{ id: 'o_piena@1', visto: true, turno: 1, scena: 'scena_mulino' }]);
    expect(registrate.map((v) => v.id)).toEqual(['o_piena@1']);
    expect(mondo.atteggiamenti.stato('png_mugnaio', 'pg_anna')).toBe('ostile');
    expect(mondo.atteggiamenti.stato('png_mugnaio', 'pg_bruno')).toBe('amichevole');
    expect(mondo.prendiDaSentire()).toEqual([{ id: 'o_piena@1', testo: 'Dalla cantina sale un gorgoglio, e il mugnaio impallidisce.', battuta: null }]);
    expect(mondo.prendiDaSentire()).toEqual([]);
    // −1 then +1: the mark is not applied twice.
    orologi.indietro('o_piena');
    mondo.riconcilia(2);
    orologi.avanza('o_piena', 3, false);
    expect(mondo.riconcilia(3)).toEqual([]);
  });

  it('an NPC moved by a consequence leaves this scene and is present where it went; a hidden NPC appears', () => {
    const { orologi, mondo, rivelati } = mondoDiProva();
    orologi.avanza('o_piena', 1, false);
    orologi.avanza('o_piena', 3, false);
    mondo.riconcilia(3);
    expect(mondo.presentiIn('scena_mulino', ['png_mugnaio', 'png_ladra'])).toEqual(['png_ladra']);
    expect(mondo.presentiIn('scena_ponte', [])).toEqual(['png_mugnaio']);
    expect(rivelati).toEqual(['png_ladra']);
    expect(mondo.indiziOfferti).toEqual(['i_farina']);
  });

  it('off-screen: logged as not seen, no sentence now, its traces surface where the clock is active or with its NPC', () => {
    const { orologi, mondo, vai } = mondoDiProva();
    vai('scena_bosco', 2); // o_piena is not active in the wood
    const e = mondo.fatti([{ tipo: 'cambio_scena', da: 'scena_mulino', a: 'scena_bosco' }], 2); // lascia_scena: +1 off-screen
    expect(e.fuoriScena).toEqual([{ id: 'o_piena', pieni: 1 }]);
    expect(e.nuove).toMatchObject([{ id: 'o_piena@1', visto: false, scena: 'scena_bosco' }]);
    expect(mondo.prendiDaSentire()).toEqual([]);
    expect(mondo.atteggiamenti.stato('png_mugnaio', 'pg_anna')).toBe('ostile'); // the world changed anyway
    expect(mondo.emergono(3, new Set())).toEqual([]); // nobody here could know
    vai('scena_mulino', 5);
    expect(mondo.emergono(5, new Set()).map((x) => x.tracce)).toEqual(["Nel cortile c'è fango fino alle caviglie, e la porta della cantina è aperta."]);
    expect(mondo.cronaca.find((v) => v.id === 'o_piena@1')).toMatchObject({ visto: false, emerso_al_turno: 5 });
    expect(mondo.emergono(6, new Set())).toEqual([]); // once
    // An extra clock (never active): its traces come with an NPC of the consequence.
    vai('scena_bosco', 6);
    mondo.fatti([{ tipo: 'turno_in_scena', scena: 'scena_bosco', turniNellaVisita: 3 }], 8);
    expect(orologi.trova('o_voci')!.pieni).toBe(1);
    expect(mondo.emergono(8, new Set(['png_ladra']))).toEqual([]);
    expect(mondo.emergono(9, new Set(['png_mugnaio'])).map((x) => x.id)).toEqual(['o_voci@1']);
    void orologi;
  });

  it('a consequence about NPCs none of whom is here is not seen, even with its clock active', () => {
    const c = caricaCampagna(MONDO);
    const orologi = new StatoOrologi(c);
    const mondo = new MondoInGioco({ campagna: c, orologi: () => orologi, scena: () => 'scena_mulino', presenti: () => new Set(['png_ladra']), log: loggerMuto() });
    orologi.avanza('o_piena', 1, false); // o_piena@1 is about the miller, who is not here
    expect(mondo.riconcilia(1)).toMatchObject([{ id: 'o_piena@1', visto: false }]);
    expect(mondo.prendiDaSentire()).toEqual([]);
  });

  it('during a scene, the news of an off-screen event arrive with an NPC who knows, never in the same turn', () => {
    const { mondo, vai } = mondoDiProva();
    vai('scena_bosco', 6);
    mondo.fatti([{ tipo: 'turno_in_scena', scena: 'scena_bosco', turniNellaVisita: 3 }], 8); // o_voci@1, off-screen
    expect(mondo.emergonoInScena(8, new Set(['png_mugnaio']))).toEqual([]);
    expect(mondo.emergonoInScena(9, new Set(['png_mugnaio'])).map((x) => x.id)).toEqual(['o_voci@1']);
    expect(mondo.prendiDaSentire()).toEqual([{ id: 'o_voci@1', testo: 'Il mugnaio ha gli occhi rossi: in paese lo chiamano ladro.', battuta: null }]);
  });

  it('a full clock off-screen logs its doom and its timeline event, and says nothing', () => {
    const { orologi, mondo, vai } = mondoDiProva();
    vai('scena_ponte', 1); // o_sera is not active on the bridge
    orologi.aggiungiDebito('o_sera', 4);
    const e = mondo.fatti([], 1);
    expect(e.nuove.map((v) => `${v.id}:${v.visto}`)).toEqual(['t_notte:false']);
    expect(mondo.prendiDaSentire()).toEqual([]);
  });

  it('the snapshot keeps it all; an older snapshot without world counts every mark reached as applied', () => {
    const a = mondoDiProva();
    a.orologi.avanza('o_piena', 1, false);
    a.mondo.riconcilia(1);
    const b = mondoDiProva();
    b.orologi.importa(a.orologi.esporta());
    b.mondo.importa(JSON.parse(JSON.stringify(a.mondo.esporta())));
    expect(b.mondo.riconcilia(2)).toEqual([]);
    expect(b.mondo.atteggiamenti.stato('png_mugnaio', 'pg_anna')).toBe('ostile');
    expect(b.mondo.prendiDaSentire().map((x) => x.id)).toEqual(['o_piena@1']);
    const vecchio = mondoDiProva();
    vecchio.orologi.importa(a.orologi.esporta());
    vecchio.mondo.importa(undefined);
    expect(vecchio.mondo.riconcilia(2)).toEqual([]);
  });
});

describe('server, mode A: the table hears what the PCs could perceive', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('a seen consequence is said in the same response; an off-screen one surfaces with the scene opening', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    const { url } = await prova.avvia(cartella, () => '[narratore] Anna, l’acqua scorre.\n[invito] tutti', { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const master = await prova.master(url);
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Anna guarda la ruota del mulino.'); // gate azione: o_piena 1, said by the Engine
    const t1 = s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(t1).toEqual(expect.arrayContaining(["L'acqua lambisce la ruota.", 'Dalla cantina sale un gorgoglio, e il mugnaio impallidisce.']));
    expect(t1.indexOf("L'acqua lambisce la ruota.")).toBeLessThan(t1.indexOf('Dalla cantina sale un gorgoglio, e il mugnaio impallidisce.'));
    expect(prova.turni().find((r) => r['turno'] === 1)!['mondo_detto']).toEqual(['o_piena@1']);
    const mondo = prova.narrazioni().filter((r) => r['tipo'] === 'mondo');
    expect(mondo).toMatchObject([{ id: 'o_piena@1', origine: 'conseguenza', visto: true, turno: 1 }]);
    // Leaving the mill: o_piena +1 off-screen (lascia_scena). The miller goes to the bridge: nothing is said in the wood.
    expect(await master.comanda({ tipo: 'scena', scena: 'scena_bosco' })).toEqual({ ok: true });
    await new Promise((ok) => setTimeout(ok, 100));
    const dopo = prova.narrazioni().filter((r) => r['tipo'] === 'mondo');
    expect(dopo.at(-1)).toMatchObject({ id: 'o_piena@2', visto: false });
    // The bridge: the miller is there (moved by the consequence), and the traces of what happened surface.
    const arrivo = prova.narrazioni().length;
    expect(await master.comanda({ tipo: 'scena', scena: 'scena_ponte' })).toEqual({ ok: true });
    await new Promise((ok) => setTimeout(ok, 200));
    const cambio = prova.narrazioni().slice(arrivo).find((r) => r['tipo'] === 'cambio_scena' && r['a'] === 'scena_ponte')!;
    expect(String(cambio['testo'])).toContain("Sul ponte c'è il mugnaio, coi sacchi buoni.");
    const st = await master.stato();
    expect(st.presenze?.find((p) => p.id === 'png_mugnaio')?.presente).toBe(true);
    // The Game Master panel's «Mondo»: the log with seen / off-screen / surfaced, and the attitude changed.
    expect(st.mondo?.cronaca.map((v) => `${v.id}:${v.visto}:${v.emerso_al_turno}`)).toEqual(['o_piena@1:true:null', 'o_piena@2:false:3']);
    expect(st.mondo?.atteggiamenti).toMatchObject([{ png: 'png_mugnaio', pg: 'pg_anna', stato: 'ostile', base: 'indifferente', causa: 'conseguenza' }]);
  });
});
