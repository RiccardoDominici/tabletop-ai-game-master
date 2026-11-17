/**
 * A21 (docs/repertorio.md, «Il finale»): a scene outcome with gates (`esiti[].richiede`) closes the scene when they hold,
 * before the clock is full: «the dramatic question has an answer». Invented fixture (mini), scripted narrator.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { ScenaCaricata } from '../src/campagna/tipi';
import { esitiDellaScena, esitoRaggiunto, motivoEsito } from '../src/scena/esiti-scena';
import { inizia, Prova, turno } from './aiuti/partita';

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
