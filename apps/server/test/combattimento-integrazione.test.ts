/**
 * Combattimento col server intero (docs/combattimento.md): un attacco apre lo scontro, l'iniziativa
 * decide l'ordine, la finestra si apre SOLO per il PG di turno, l'azione scritta da un altro PG fuori
 * turno resta in coda e si risolve al suo turno, il PNG agisce da solo nel suo turno; il proiettore ha
 * la barra dell'iniziativa e il pannello del master può terminare lo scontro.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { AzionePrivata, StatoTavolo } from '@cantastorie/shared';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
class Arbitro implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    return Object.fromEntries(i.azioni.map((a) => [a.id, /colpisco/i.test(a.testo) ? { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' } : base(a.id)]));
  }
}

describe('combattimento col server intero', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('turni dall’iniziativa, finestra solo per chi è di turno, PNG da solo, fine dal master', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (t: number): string => (t === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[narratore] Il ferro suona sul ferro.\n[invito] tutti');
    // T1: Corrado 10+5 colpisce Ruggero, 3+3 danni. Iniziativa: Ida 15+2, Corrado 5+2, Ruggero 10+1 → Ida, Ruggero, Corrado.
    // T2 (Ida): niente tiro; poi Ruggero 15+4 colpisce Corrado (aggressore), 4+2 danni. Poi tocca a Corrado (T3: 1, manca).
    const { url, messaggi } = await prova.avvia(cartella, copione, {}, { arbitroProve: new Arbitro(), dadi: new DadiACopione([10, 3, 15, 5, 10, 15, 4, 1]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const corrado = await prova.telefono(url, 'pg_corrado');
    const mieCorrado: AzionePrivata[] = [];
    corrado.on('azione:mia', (a) => a && mieCorrado.push(a));
    const s1 = await inizia(schermo, ida);
    await agisci(corrado, 'pg_corrado', 'Colpisco Ruggero con la spada', s1.versione_scena);
    await agisci(ida, 'pg_ida', 'Guardo il fiume', s1.versione_scena);

    const s2: StatoTavolo = await attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(s2.combattimento?.combattenti.map((c) => [c.id, c.iniziativa])).toEqual([['pg_ida', 17], ['png_ruggero', 11], ['pg_corrado', 7]]);
    expect(s2.combattimento?.turno_di).toEqual(['pg_ida']);
    expect(s2.finestra.invitati).toEqual(['pg_ida']);
    expect(messaggi.at(-1)).toMatch(/Inizia il combattimento\. Iniziativa: Ida Ferraro 17, Ruggero lo sgherro 11, Corrado Lanzi 7\./);
    expect(messaggi.at(-1)).toMatch(/Tocca ora a: Ida Ferraro \(pg_ida\)/);

    // Corrado scrive fuori turno: la sua azione non si risolve adesso, resta in coda per il suo turno.
    await agisci(corrado, 'pg_corrado', 'Colpisco ancora Ruggero', s2.versione_scena);
    await agisci(ida, 'pg_ida', 'Mi tengo pronta dietro Corrado', s2.versione_scena);
    const s3: StatoTavolo = await attendi(ida, (x) => x.fase === 'finestra' && x.turno === 3);
    expect(s3.combattimento?.turno_di).toEqual(['pg_corrado']);
    expect(s3.finestra.invitati).toEqual(['pg_corrado']);
    expect(messaggi.at(-1)).toMatch(/Turno di Ruggero lo sgherro: attacco con Mazza ferrata a Corrado Lanzi: 19 contro CA 15 → COLPITO, 6 danni contundenti/);
    expect(messaggi.at(-1)).not.toMatch(/Colpisco ancora Ruggero/);
    expect(s3.pg.find((p) => p.id === 'pg_corrado')?.pf).toEqual({ attuali: 6, massimi: 12 });
    expect(mieCorrado.some((a) => a.testo === 'Colpisco ancora Ruggero' && a.stato === 'in_coda' && a.turno === 3)).toBe(true);

    // Il master chiude lo scontro.
    const master = await prova.master(url);
    expect(await master.comanda({ tipo: 'combattimento_termina' })).toEqual({ ok: true });
    const st = await master.stato();
    expect(st.tavolo.combattimento ?? null).toBeNull();
    expect(st.combattimento?.attivo).toBe(false);
    expect(st.combattimento?.condizioni.map((c) => c.id)).toContain('prono');
  });
});
