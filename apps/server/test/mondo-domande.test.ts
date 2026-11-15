/**
 * World questions and NPCs' own checks (docs/prove.md §9): a scene writes an uncertain fact with the fact that asks it
 * and its odds, or an NPC's check with its sheet; the Engine rolls it through the Game Master's roll path when the fact
 * happens in that scene, once per session; the narrator gets the answer as a world line. Invented fixtures: `mondo`
 * (no sheets) and `prove` (SRD 5.2 sheets), `bx` (a manual's d20 set).
 */
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { compilaContestoCampagna } from '../src/campagna/contesto';
import type { Campagna, DatiYaml } from '../src/campagna/tipi';
import { loggerMuto } from '../src/logger';
import { DadiACopione } from '../src/prove/dadi';
import { DomandeInGioco, domandaDa, domandeDellaCampagna } from '../src/mondo/domande';
import { MondoInGioco } from '../src/mondo/mondo';
import { tiroDelMondo } from '../src/mondo/tiri';
import { StatoOrologi } from '../src/scena/orologi';
import { inizia, Prova, turno } from './aiuti/partita';
import { motoreSet, motoreSrd } from './aiuti/motori-prove';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');

const GUARDIA = { id: 'd_ruota', domanda: 'La ruota del mulino è inceppata?', quando: 'azione', temi: ['ruota'], tiro: { dado: 6, almeno: 4 }, se_si: 'La ruota è inceppata da un ramo.', se_no: 'La ruota gira libera.' };

/** The `mondo` fixture with these questions on its first scene. */
function conDomande(domande: unknown[]): Campagna {
  const c = caricaCampagna(path.join(FIX, 'mondo'));
  const scene = c.scene.map((s) => (s.id === 'scena_mulino' ? { ...s, dati: { ...s.dati, domande } } : s));
  return { ...c, scene, scena: scene.find((s) => s.id === c.scena.id)! };
}

describe('reading the questions of a scene', () => {
  it('a question needs a fact, both answers and exactly one of odds or an NPC check', () => {
    const avvisi: string[] = [];
    const a = (m: string): number => avvisi.push(m);
    expect(domandaDa('s', GUARDIA as DatiYaml, a)).toMatchObject({ id: 'd_ruota', scena: 's', tiro: { dado: 6, almeno: 4, visibile: false }, prova: null, si: GUARDIA.se_si, no: GUARDIA.se_no });
    expect(domandaDa('s', { ...GUARDIA, se_no: '' } as DatiYaml, a)).toBeNull();
    expect(domandaDa('s', { ...GUARDIA, quando: 'mai' } as DatiYaml, a)).toBeNull();
    expect(domandaDa('s', { ...GUARDIA, prova_png: { png: 'png_x', prova: 'abilita:percezione' } } as DatiYaml, a)).toBeNull();
    const { tiro: _t, ...senzaTiro } = GUARDIA;
    expect(domandaDa('s', senzaTiro as DatiYaml, a)).toBeNull();
    expect(domandaDa('s', { ...senzaTiro, prova_png: { png: 'png_x', prova: 'abilita:percezione', difficolta: 'difficile' } } as DatiYaml, a)).toMatchObject({ tiro: null, prova: { png: 'png_x', prova: 'abilita:percezione', difficolta: 'difficile', visibile: false } });
    expect(avvisi).toHaveLength(5); // an unknown quando is said twice: the gate, then the question
    expect(domandeDellaCampagna(conDomande([GUARDIA, GUARDIA]))).toHaveLength(1);
  });
});

describe('the narrator never reads a question in advance', () => {
  it('the cached context has neither the odds nor the answers', () => {
    const contesto = compilaContestoCampagna(conDomande([GUARDIA]));
    expect(contesto).not.toContain(GUARDIA.se_si);
    expect(contesto).not.toContain(GUARDIA.se_no);
    expect(contesto).not.toContain(GUARDIA.domanda);
  });
});

describe('a question in play', () => {
  it('rolled when its fact happens in its scene, once; the answer is queued for the narrator and saved', () => {
    const q = domandeDellaCampagna(conDomande([GUARDIA]));
    const richieste: string[] = [];
    const dadi = new DadiACopione([5, 1]);
    const d = new DomandeInGioco(q, { tira: (r) => (richieste.push(r.origine), tiroDelMondo(r, dadi)), log: loggerMuto() });
    expect(d.fatti('scena_mulino', [{ tipo: 'azione', testo: 'Guardo il fiume' }], 1)).toEqual([]);
    expect(d.fatti('scena_bosco', [{ tipo: 'azione', testo: 'Tocco la ruota' }], 2)).toEqual([]); // another scene
    expect(d.fatti('scena_mulino', [{ tipo: 'azione', testo: 'Spingo la ruota del mulino' }], 3)).toEqual([{ id: 'd_ruota', turno: 3, si: true, fatto: GUARDIA.se_si }]);
    expect(d.fatti('scena_mulino', [{ tipo: 'azione', testo: 'Spingo ancora la ruota' }], 4)).toEqual([]); // answered: canon
    expect(richieste).toEqual(['d_ruota']);
    const salvato = JSON.parse(JSON.stringify(d.esporta()));
    expect(d.prendi().map((r) => r.fatto)).toEqual([GUARDIA.se_si]);
    expect(d.prendi()).toEqual([]);
    const e = new DomandeInGioco(q, { tira: () => { throw new Error('must not roll again'); }, log: loggerMuto() });
    e.importa(salvato);
    expect(e.fatti('scena_mulino', [{ tipo: 'azione', testo: 'La ruota!' }], 5)).toEqual([]);
    expect(e.prendi().map((r) => r.fatto)).toEqual([GUARDIA.se_si]); // not yet given before the restart
  });

  it('an NPC check without a sheet stays open: nobody answers it instead of the dice', () => {
    const { tiro: _t, ...senzaTiro } = GUARDIA;
    const q = domandeDellaCampagna(conDomande([{ ...senzaTiro, prova_png: { png: 'png_mugnaio', prova: 'abilita:percezione' } }]));
    const d = new DomandeInGioco(q, { tira: () => { throw new Error('no odds here'); }, provaDelPng: () => null, log: loggerMuto() });
    expect(d.fatti('scena_mulino', [{ tipo: 'azione', testo: 'Spingo la ruota' }], 1)).toEqual([]);
    expect(d.date()).toEqual([]);
  });

  it('the world rolls its questions with its own saved dice through the hook', () => {
    const c = conDomande([GUARDIA]);
    const o = new StatoOrologi(c);
    const visti: number[] = [];
    const m = new MondoInGioco({ campagna: c, orologi: () => o, scena: () => 'scena_mulino', log: loggerMuto(), dadi: new DadiACopione([2]), tira: (r, dadi) => { const e = tiroDelMondo(r, dadi); visti.push(e.valore); return e; } });
    m.fatti([{ tipo: 'azione', testo: 'Guardo la ruota' }], 1);
    expect(visti).toEqual([2]);
    expect(m.domande.prendi()).toEqual([{ id: 'd_ruota', turno: 1, si: false, fatto: GUARDIA.se_no }]);
    expect(m.esporta().domande?.risposte).toHaveLength(1);
  });
});

describe('an NPC\'s own check through the set\'s resolver', () => {
  it('SRD: the NPC\'s sheet and the difficulty decide; the odds are worked out for the «a_volte» rule', () => {
    const m = motoreSrd({}, [14]);
    const e = m.provaDelPng('png_ruggero', 'abilita:percezione', 'media', 3)!;
    expect(e).toMatchObject({ dado: 14, facce: 20 });
    expect(e.p).toBeGreaterThan(0);
    expect(e.p).toBeLessThan(1);
    // The die needed is the DC less the modifier; 14 succeeds exactly when it reaches it.
    expect(e.riuscita).toBe(14 >= e.almeno);
    expect(m.tiriPubblici()).toEqual([]); // no card joins the turn
    expect(m.provaDelPng('png_ruggero', 'abilita:volare', null, 3)).toBeNull();
    expect(m.provaDelPng('png_nessuno', 'abilita:percezione', null, 3)).toBeNull();
    m.stato.danneggia('png_ruggero', 999);
    expect(m.provaDelPng('png_ruggero', 'abilita:percezione', null, 3)).toBeNull(); // down: nothing to roll
  });

  it('a manual\'s d20 set: the set\'s characteristic and default difficulty', () => {
    const m = motoreSet(path.join(FIX, 'bx'), {}, [20]);
    const e = m.provaDelPng('png_ruggero', 'caratteristica:potere', null, 1);
    expect(e).toMatchObject({ dado: 20, facce: 20, riuscita: true });
  });
});

describe('world questions with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('no sheets: the action asks the question, the narrator hears the answer, the panel lists the roll, never asked again', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo', { ritocchi: { 'scena.yaml': (d) => { d['domande'] = [GUARDIA]; } } });
    const { url, messaggi } = await prova.avvia(cartella, () => '[narratore] Il vento gira.\n[invito] tutti', { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const master = await prova.master(url);
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Anna spinge la ruota del mulino.');
    const m = messaggi.at(-1)!;
    const risposta = [GUARDIA.se_si, GUARDIA.se_no].find((x) => m.includes(x));
    expect(risposta).toBeDefined();
    expect(m).toMatch(/Deciso dai dadi del master/);
    void master;
    s = await turno(tel, 'pg_anna', s, 'Anna guarda ancora la ruota.');
    expect(messaggi.at(-1)!).not.toMatch(/Deciso dai dadi del master/);
  }, 30_000);

  it('with sheets: an NPC\'s own check answers, the panel lists it with the question, the table sees no card by default', async () => {
    prova = new Prova();
    const domanda = { id: 'd_ruggero_nota', domanda: 'Ruggero si accorge della mano sulla cassetta?', quando: 'azione', temi: ['cassetta'], prova_png: { png: 'png_ruggero', prova: 'abilita:percezione', difficolta: 'media' }, se_si: 'Ruggero ha visto la mano.', se_no: 'Ruggero guarda il fiume.' };
    const cartella = prova.campagna('prove', { ritocchi: { 'scena.yaml': (d) => { d['domande'] = [domanda]; } } });
    const { url, messaggi } = await prova.avvia(cartella, () => '[narratore] Il fiume rumoreggia.\n[invito] tutti', { TAGM_MODO: 'improvvisa', TAGM_TIRI_GIOCATORI: 'automatico' }, { dadi: new DadiACopione([15]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    let s = await inizia(schermo, ida);
    s = await turno(ida, 'pg_ida', s, 'Ida guarda la cassetta del pedaggio.');
    const m = messaggi.at(-1)!;
    expect(m).toMatch(/Deciso dai dadi del master[^\n]*Ruggero (ha visto la mano|guarda il fiume)/);
    const sm = await master.stato();
    const r = sm.tiri!.del_master.find((x) => x.origine === 'd_ruggero_nota')!;
    expect(r).toMatchObject({ dado: 20, valore: 15, mostrato: false });
    expect(r.motivo).toMatch(/Ruggero.*Percezione.*Ruggero si accorge/);
    expect((s.tiri ?? []).some((t) => t.del_master)).toBe(false);
  }, 30_000);
});
