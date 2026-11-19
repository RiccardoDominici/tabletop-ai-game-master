/**
 * A21 (docs/repertorio.md, «Il finale»): a scene outcome with gates (`esiti[].richiede`) closes the scene when they hold,
 * before the clock is full: «the dramatic question has an answer». Invented fixture (mini), scripted narrator.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { ScenaCaricata } from '../src/campagna/tipi';
import { esitiDellaScena, esitoRaggiunto, motivoEsito } from '../src/scena/esiti-scena';
import { attendi, inizia, Prova, turno } from './aiuti/partita';

const scena = (esiti: unknown[]): ScenaCaricata => ({ id: 'scena_x', dati: { esiti } }) as unknown as ScenaCaricata;

describe('the gates of an outcome', () => {
  it('all must hold; an outcome without gates never closes the scene by itself; the first in order wins', () => {
    const esiti = esitiDellaScena(
      scena([
        { id: 'es_libero', finale: 'fin_a', richiede: { indizi_rivelati: ['i_x'], stati: { png_capo: ['a_terra', 'morto', 'fuggito'] } } },
        { id: 'es_orologio', detto: 'È mezzanotte.', richiede: { orologio: { id: 'o_notte', min: 3 } } },
        { id: 'es_libero_tema', finale: 'fin_b' },
      ]),
    );
    const stato = { indizi: new Set(['i_x']), battute: new Set<string>(), pieni: (id: string) => (id === 'o_notte' ? 1 : null), classe: (id: string) => (id === 'png_capo' ? ('in_gioco' as const) : null) };
    expect(motivoEsito(esiti[0]!, stato)).toBe('png_capo is in_gioco');
    expect(motivoEsito(esiti[1]!, stato)).toBe('clock o_notte at 1');
    expect(motivoEsito(esiti[2]!, stato)).toBe('no gates');
    expect(esitoRaggiunto(esiti, stato)).toBeNull();
    expect(esitoRaggiunto(esiti, { ...stato, classe: () => 'fuggito' })?.id).toBe('es_libero');
    expect(esitoRaggiunto(esiti, { ...stato, indizi: new Set(), pieni: () => 3 })?.id).toBe('es_orologio');
  });
});

describe('with the server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('mode B: the clue revealed answers the question; the Engine says the outcome\'s ending in that response', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', {
      battute: {
        'narrazione.yaml': [{ id: 'fin_brocca', chi: 'narratore', tipo: 'finale', quando: "la brocca dice tutto sull'oste", temi: ['finale'], testo: ["[narratore] L'acqua nella brocca spiega il vino: la serata alla locanda finisce qui."], max_usi: 1 }],
      },
      ritocchi: { 'scena.yaml': (d) => void (d['esiti'] = [{ id: 'es_brocca', descrizione: "Si scopre l'acqua.", finale: 'fin_brocca', richiede: { indizi_rivelati: ['i_brocca'] } }]) },
    });
    const { url } = await prova.avvia(cartella, () => '[usa] nar_brocca > pg_anna\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Guardo dietro il banco.');
    const detto = s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(detto).toContain("Dietro il banco c'è una brocca d'acqua, accanto alla botte.");
    expect(detto).toContain("L'acqua nella brocca spiega il vino: la serata alla locanda finisce qui.");
    expect(prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)).toMatchObject({ finale: 'fin_brocca', esito_scena: 'es_brocca' });
  }, 20_000);

  it('mode A: the narrator\'s checked [indizio] mark answers it; the outcome\'s sentence is said', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', {
      ritocchi: { 'scena.yaml': (d) => void (d['esiti'] = [{ id: 'es_brocca', descrizione: "Si scopre l'acqua.", finale: 'nar_tuono', detto: 'La verità sul vino è venuta fuori: la serata finisce qui.', richiede: { indizi_rivelati: ['i_brocca'] } }]) },
    });
    const copione = (t: number): string => (t === 1 ? "[narratore] Anna, dietro il banco c'è una brocca d'acqua.\n[indizio] i_brocca\n[invito] tutti" : '[narratore] Anna, piove.\n[invito] tutti');
    const { url } = await prova.avvia(cartella, copione, { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Guardo dietro il banco.');
    expect(s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo)).toContain('La verità sul vino è venuta fuori: la serata finisce qui.');
    expect(prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)).toMatchObject({ esito_scena: 'es_brocca' });
  }, 20_000);
});

describe('an outcome already true when the table comes back (blind test A12, mulino-notte W18)', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('does not close the scene at the first answer of the return: it answered nothing in this visit', async () => {
    // The mill's outcome waits for the river's second mark. Turn 1 brings the first (a «ruota» action); leaving the mill
    // owes the second, paid off-screen in the wood. Back at the mill the gate holds from the entry: before, the first
    // answer closed the scene with a stale ending («the water takes the yard») for something that happened elsewhere.
    prova = new Prova();
    const cartella = prova.campagna('mondo', {
      ritocchi: { 'scena.yaml': (d) => void (d['esiti'] = [{ id: 'es_piena', descrizione: "L'acqua prende il cortile.", detto: "L'acqua prende il cortile: la scena finisce.", richiede: { orologio: { id: 'o_piena', min: 2 } } }]) },
    });
    const copione = (): string => '[narratore] Anna, il vento scuote i rami.\n[invito] tutti';
    const a = await prova.avvia(cartella, copione, { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(a.url);
    const tel = await prova.telefono(a.url, 'pg_anna');
    const master = await prova.master(a.url);
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Anna guarda la ruota del mulino.'); // o_piena 1: the gate wants 2
    const nelBosco = attendi(tel, (x) => x.fase === 'finestra' && x.turno === 3);
    expect(await master.comanda({ tipo: 'scena', scena: 'scena_bosco' })).toEqual({ ok: true }); // o_piena 2, off-screen
    s = await nelBosco;
    s = await turno(tel, 'pg_anna', s, 'Anna cammina tra gli alberi.');
    expect((await master.stato()).mondo?.cronaca.map((v) => v.id)).toContain('o_piena@2'); // the second mark, off-screen
    const alMulino = attendi(tel, (x) => x.fase === 'finestra' && x.turno === 5);
    expect(await master.comanda({ tipo: 'scena', scena: 'scena_mulino' })).toEqual({ ok: true });
    s = await alMulino;
    s = await turno(tel, 'pg_anna', s, 'Anna ascolta il vento.');
    const dopo = prova.narrazioni().filter((r) => r['tipo'] === 'turno' && Number(r['turno']) >= 5);
    expect(dopo.some((r) => r['esito_scena'])).toBe(false);
    expect(s.trascrizione.map((v) => v.testo)).not.toContain("L'acqua prende il cortile: la scena finisce.");
  }, 30_000);
});
