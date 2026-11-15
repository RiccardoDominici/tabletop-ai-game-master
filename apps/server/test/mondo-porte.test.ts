/**
 * Structured `avanza_quando` (docs/mondo.md §2): facts of the game owe marks to a clock. The gates (pure), the
 * debt in StatoOrologi (due at once, not held back by the maximum pace, paid off-screen when the clock is not
 * active), and the server in mode A: an owed mark the narrator does not show is said by the Engine.
 * Invented fixture: test/fixtures/campagne/mondo.
 */
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { conScena, type Campagna, type DatiYaml } from '../src/campagna/tipi';
import { DadiACopione } from '../src/prove/dadi';
import { tiroDelMondo, type RichiestaTiroMondo } from '../src/mondo/tiri';
import { loggerMuto } from '../src/logger';
import { MondoInGioco } from '../src/mondo/mondo';
import { TiriDelMaster } from '../src/prove/tiri-master';
import { apre, portaDa, PorteDelMondo, porteDegliOrologi } from '../src/mondo/porte';
import { StatoOrologi } from '../src/scena/orologi';
import { inizia, Prova, turno } from './aiuti/partita';

const MONDO = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mondo');

describe('mondo/porte: the gates of avanza_quando', () => {
  it('a string is a note; a mapping is a gate; an unreadable gate is reported, not applied', () => {
    const avvisi: string[] = [];
    expect(portaDa('o_x', 0, 'una nota', (m) => avvisi.push(m))).toBeNull();
    expect(portaDa('o_x', 1, { quando: 'azione', temi: ['ruota'] })).toMatchObject({ chiave: 'o_x#1', quando: 'azione', temi: ['ruota'], segni: 1, volte: null });
    expect(portaDa('o_x', 2, { quando: 'resta_in_scena' }, (m) => avvisi.push(m))).toBeNull();
    expect(portaDa('o_x', 3, { quando: 'quando_vuole' }, (m) => avvisi.push(m))).toBeNull();
    expect(avvisi).toEqual(['o_x.avanza_quando[2]: resta_in_scena needs turni', 'o_x.avanza_quando[3]: unknown quando "quando_vuole"']);
  });

  it('each kind of fact opens only its gates', () => {
    const g = (d: Record<string, unknown>) => portaDa('o_x', 0, d)!;
    expect(apre(g({ quando: 'cambio_scena' }), { tipo: 'cambio_scena', da: 'a', b: 'x' } as never)).toBe(true);
    expect(apre(g({ quando: 'lascia_scena', scena: 'a' }), { tipo: 'cambio_scena', da: 'a', a: 'b' })).toBe(true);
    expect(apre(g({ quando: 'lascia_scena', scena: 'a' }), { tipo: 'cambio_scena', da: 'b', a: 'a' })).toBe(false);
    const resta = g({ quando: 'resta_in_scena', turni: 3 });
    expect([1, 2, 3, 4, 6].map((n) => apre(resta, { tipo: 'turno_in_scena', scena: 's', turniNellaVisita: n }))).toEqual([false, false, true, false, true]);
    expect(apre(g({ quando: 'battuta', ids: ['b_x'] }), { tipo: 'battuta', id: 'b_x' })).toBe(true);
    expect(apre(g({ quando: 'indizio', ids: ['i_x'] }), { tipo: 'battuta', id: 'i_x' })).toBe(false);
    expect(apre(g({ quando: 'azione', temi: ['ruota'] }), { tipo: 'azione', testo: 'Anna ferma la RUOTA con un palo' })).toBe(true);
    expect(apre(g({ quando: 'prova_fallita' }), { tipo: 'prova_fallita', prove: ['furtivita'] })).toBe(true);
    expect(apre(g({ quando: 'prova_fallita', prove: ['atletica'] }), { tipo: 'prova_fallita', prove: ['furtivita'] })).toBe(false);
    expect(apre(g({ quando: 'scontro' }), { tipo: 'scontro' })).toBe(true);
  });

  it('a gate opens once per moment and at most `volte` times; it owes `segni` marks', () => {
    const c = caricaCampagna(MONDO);
    const porte = new PorteDelMondo(porteDegliOrologi(c.campagnaNarratore['orologi'] as Array<Record<string, unknown>>));
    const via = { tipo: 'cambio_scena' as const, da: 'scena_mulino', a: 'scena_bosco' };
    expect(porte.fatti([via]).map((d) => `${d.porta}:${d.segni}`)).toEqual(['o_sera#1:1', 'o_piena#2:1']);
    expect(porte.fatti([via]).map((d) => d.porta)).toEqual(['o_sera#1']); // lascia_scena has volte: 1
    expect(porte.fatti([{ tipo: 'azione', testo: 'la ruota' }, { tipo: 'azione', testo: 'ancora la ruota' }]).map((d) => d.porta)).toEqual(['o_piena#1']);
    expect(porte.fatti([{ tipo: 'prova_fallita', prove: ['atletica', 'forza'] }])).toEqual([{ porta: 'o_piena#3', orologio: 'o_piena', segni: 2, quando: 'prova_fallita' }]);
    const salvate = porte.esporta();
    const altre = new PorteDelMondo(porte.porte);
    altre.importa(salvate);
    expect(altre.fatti([via]).map((d) => d.porta)).toEqual(['o_sera#1']);
  });
});

describe('uncertain outcomes: a gate with tiro is rolled by the Engine, never decided by the AI', () => {
  const g = (tiro: unknown) => portaDa('o_piena', 0, { quando: 'scontro', tiro })!;

  it('reads the roll; an unreadable roll means no roll', () => {
    expect(g({ dado: 6, almeno: 4 }).tiro).toEqual({ dado: 6, almeno: 4, visibile: false });
    expect(g({ dado: 20, almeno: 15, visibile: true }).tiro).toEqual({ dado: 20, almeno: 15, visibile: true });
    expect(g({ dado: 6, almeno: 9 }).tiro).toBeNull();
  });

  it('the hook gets the request; the marks are owed only on a success, and only successes count for volte', () => {
    const porte = new PorteDelMondo([{ ...g({ dado: 6, almeno: 4 }), volte: 1 }]);
    const richieste: unknown[] = [];
    const dadi = new DadiACopione([2, 5, 6]);
    const tira = { tiro: (r: RichiestaTiroMondo) => (richieste.push(r), tiroDelMondo(r, dadi)), turno: 7 };
    const fallito = porte.fatti([{ tipo: 'scontro' }], tira);
    expect([...fallito]).toEqual([]);
    expect(fallito.falliti).toEqual([{ porta: 'o_piena#0', orologio: 'o_piena', quando: 'scontro', tiro: { riuscito: false, valore: 2, dado: 6, almeno: 4, visibile: false } }]);
    expect(richieste[0]).toEqual({ origine: 'o_piena#0', motivo: 'o_piena: scontro', turno: 7, dado: 6, almeno: 4, visibile: false });
    expect(porte.fatti([{ tipo: 'scontro' }], tira)).toMatchObject([{ porta: 'o_piena#0', segni: 1, tiro: { riuscito: true, valore: 5 } }]);
    expect(porte.fatti([{ tipo: 'scontro' }], tira)).toEqual([]); // volte: 1 reached, no roll asked
    expect(richieste).toHaveLength(2);
  });

  it('the world rolls with its own dice by default, and the snapshot replays them', () => {
    const c = caricaCampagna(MONDO);
    const conTiro: Campagna = { ...c, campagnaNarratore: { ...c.campagnaNarratore, orologi: (c.campagnaNarratore['orologi'] as DatiYaml[]).map((o) => (o['id'] === 'o_piena' ? { ...o, avanza_quando: [{ quando: 'scontro', tiro: { dado: 6, almeno: 4 } }] } : o)) } };
    const esiti = (m: MondoInGioco) => [1, 2, 3, 4, 5, 6].map((t) => m.fatti([{ tipo: 'scontro' }], t).debiti.length);
    const o1 = new StatoOrologi(conTiro);
    const a = new MondoInGioco({ campagna: conTiro, orologi: () => o1, scena: () => 'scena_mulino', log: loggerMuto() });
    const salvato = JSON.parse(JSON.stringify(a.esporta()));
    const o2 = new StatoOrologi(conTiro);
    const b = new MondoInGioco({ campagna: conTiro, orologi: () => o2, scena: () => 'scena_mulino', log: loggerMuto() });
    b.importa(salvato);
    expect(esiti(b)).toEqual(esiti(a));
    // With the director's hook (the Game Master roll path, no Engine dice: a campaign without sheets), the rolls use
    // the world's own dice, and a resume replays them: the hook never draws from dice nobody saves.
    const conGancio = (orologi: StatoOrologi) => {
      const gm = new TiriDelMaster({ modo: () => 'nascosti', dadi: () => null, log: loggerMuto(), nuovoIdTiro: () => 'tm', nome: () => 'Il master', mostra: () => undefined });
      const m = new MondoInGioco({ campagna: conTiro, orologi: () => orologi, scena: () => 'scena_mulino', log: loggerMuto(), tira: (r, dadi) => gm.tira(r, dadi) });
      return { m, valori: () => gm.registro().map((x) => x.valore) };
    };
    const g1 = conGancio(new StatoOrologi(conTiro));
    for (const t of [1, 2, 3]) g1.m.fatti([{ tipo: 'scontro' }], t);
    const aMeta = JSON.parse(JSON.stringify(g1.m.esporta()));
    for (const t of [4, 5, 6]) g1.m.fatti([{ tipo: 'scontro' }], t);
    const g2 = conGancio(new StatoOrologi(conTiro));
    g2.m.importa(aMeta);
    for (const t of [4, 5, 6]) g2.m.fatti([{ tipo: 'scontro' }], t);
    expect(g2.valori()).toEqual(g1.valori().slice(3));
    expect(aMeta.dadi.contatore).toBe(3);
    // With scripted dice: 3 fails, 4 succeeds.
    const o3 = new StatoOrologi(conTiro);
    const d = new MondoInGioco({ campagna: conTiro, orologi: () => o3, scena: () => 'scena_mulino', log: loggerMuto(), dadi: new DadiACopione([3, 4]) });
    expect([d.fatti([{ tipo: 'scontro' }], 1).debiti.length, d.fatti([{ tipo: 'scontro' }], 2).debiti.length]).toEqual([0, 1]);
  });
});

describe('StatoOrologi: marks owed by facts', () => {
  it('an owed mark is due at once, also against the maximum pace, and is paid by the next mark', () => {
    const o = new StatoOrologi(caricaCampagna(MONDO));
    const piena = o.trova('o_piena')!; // almeno ogni 6, al massimo ogni 2 (default)
    expect(o.avanza('o_piena', 1, { ritmo: true }).ok).toBe(true);
    expect(o.dovuto(piena, 2)).toBe(false);
    expect(o.aggiungiDebito('o_piena', 1)).toBe(1);
    expect(o.dovuto(piena, 2)).toBe(true); // the maximum pace (2) would have held it back
    expect(o.descrivi(2)).not.toContain('fermo');
    expect(o.avanza('o_piena', 2, { ritmo: true })).toMatchObject({ ok: true, orologio: { pieni: 2, debito: 0 } });
    expect(o.dovuto(piena, 3)).toBe(false);
    // One mark per clock per response stays.
    o.aggiungiDebito('o_piena', 2);
    expect(o.avanza('o_piena', 4, { inRisposta: new Set(['o_piena']) }).ok).toBe(false);
    // Never more than the marks left; saved and restored.
    expect(o.aggiungiDebito('o_piena', 10)).toBe(2);
    const altro = new StatoOrologi(caricaCampagna(MONDO));
    altro.importa(o.esporta());
    expect(altro.trova('o_piena')!.debito).toBe(2);
  });

  it('owed marks of a clock not active in the scene are paid off-screen at once', () => {
    const c = caricaCampagna(MONDO);
    const o = new StatoOrologi(c);
    const mondo = new MondoInGioco({ campagna: c, orologi: () => o, scena: () => 'scena_bosco', log: loggerMuto() });
    o.impostaScena(conScena(c, 'scena_bosco').scena, 4); // o_piena is active only at the mill
    const e = mondo.fatti([{ tipo: 'cambio_scena', da: 'scena_mulino', a: 'scena_bosco' }], 4);
    expect(e.debiti.map((d) => d.orologio)).toEqual(['o_sera', 'o_piena']);
    expect(e.fuoriScena).toEqual([{ id: 'o_piena', pieni: 1 }]);
    expect(o.trova('o_piena')).toMatchObject({ pieni: 1, debito: 0 });
    expect(o.trova('o_sera')).toMatchObject({ pieni: 0, debito: 1 }); // active in the wood: shown there
  });
});

describe('server, mode A: an owed mark the narrator does not show', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('is ordered in the message and said by the Engine before the invitation', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    // The scripted narrator never writes [orologio]: it ignores the order.
    const { url, messaggi } = await prova.avvia(cartella, () => '[narratore] Anna, l’acqua scorre.\n[invito] tutti', { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Anna guarda la ruota del mulino.');
    expect(messaggi.at(-1)).toMatch(/\[o_piena\][^\n]*Mostralo in questa risposta/);
    const t1 = prova.turni().find((r) => r['turno'] === 1)!;
    expect(t1['segni_dovuti_detti']).toEqual(['o_piena']);
    const detto = s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(detto).toContain("L'acqua lambisce la ruota.");
    // Paid: the next turn does not owe it again.
    s = await turno(tel, 'pg_anna', s, 'Anna aspetta.');
    expect(prova.turni().find((r) => r['turno'] === 2)!['segni_dovuti_detti']).toEqual([]);
  });
});

describe('server, mode B: an owed mark', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('without a mark line the Engine says the mark’s text; with one, the line goes out and the debt is paid once', async () => {
    prova = new Prova();
    // A mark line for the SECOND mark of o_piena only: the first has none.
    const cartella = prova.campagna('mondo', {
      battute: {
        'narrazione.yaml': [
          { id: 'nar_cortile', chi: 'narratore', tipo: 'segno_orologio', quando: 'il fiume sale ancora', temi: ['fiume'], richiede: { orologio: { id: 'o_piena', min: 1, max: 1 } }, testo: ['[narratore] Il fiume entra nel cortile, torbido.'], effetti: { avanza_orologio: 'o_piena' }, max_usi: 1 },
        ],
      },
    });
    const { url } = await prova.avvia(cartella, () => '[narratore] Anna, la ruota gira.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const master = await prova.master(url);
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Anna guarda la ruota del mulino.'); // gate: o_piena owed
    expect(s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo)).toContain("L'acqua lambisce la ruota.");
    expect(prova.turni().find((r) => r['turno'] === 1)!['segni_dovuti_detti']).toEqual(['o_piena']);
    // Two turns later (maximum pace 2 does not hold a debt back anyway), the gate again: now a mark line exists.
    s = await turno(tel, 'pg_anna', s, 'Anna aspetta.');
    s = await turno(tel, 'pg_anna', s, 'Anna tocca la ruota bagnata.');
    const t3 = prova.turni().find((r) => r['turno'] === 3)!;
    expect(t3['segni_aggiunti']).toEqual(['nar_cortile']);
    // Mark 2 makes the miller run to the bridge: in mode B the Engine says the line written for that consequence.
    expect(t3['mondo_detto']).toEqual(['o_piena@2']);
    expect(s.trascrizione.filter((v) => v.turno === 3).map((v) => v.testo)).toContain('La ruota si ferma di colpo. Il mugnaio afferra un sacco e corre fuori, verso il ponte.');
    expect(t3['segni_dovuti_detti']).toEqual([]);
    const o = (await master.stato()).orologi.find((x) => x.id === 'o_piena')!;
    expect(o.pieni).toBe(2);
    expect((await master.stato()).mondo?.debiti).toEqual([]);
  });
});
