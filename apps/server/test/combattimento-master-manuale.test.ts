/**
 * A fight the Game Master opens from the panel, with manual rolls (docs/prove.md §8, item 11c of docs/da-fare.md): the
 * players roll their own initiative. The fight starts at the next closed window, after its actions, as one an attack
 * opens does: the dry run asks each PC's initiative die like any other roll of theirs (the voice says «Ida, tira
 * l'iniziativa.»), the Game Master can still give one to the Engine, and the NPCs' initiative stays the Engine's. An
 * interrupted turn leaves no half-open fight; automatic rolls start it at once, as before, and an NPC first in the order
 * strikes in the first turn after the click (A3). Invented fixture `prove`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { AudioFrase, RichiestaTiro, StatoTavolo } from '@tabletop-ai-gm/shared';
import { DadiACopione } from '../src/prove/dadi';
import { Prova, agisci, attendi, attendiEvento, inizia } from './aiuti/partita';

const COPIONE = (turno: number): string => (turno === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[narratore] Il vento porta odore di fango.\n[invito] tutti');
const MANUALE = { TAGM_TIRI_GIOCATORI: 'manuale' };

describe('a fight opened from the panel, manual rolls', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('starts at the close: each PC rolls initiative, a switch to the Engine holds, the NPCs roll with the Engine', async () => {
    prova = new Prova();
    // The Engine's dice are all 2s: an initiative of 2 + modifier is the Engine's, anything else the player's.
    const { url } = await prova.avvia(prova.campagna('prove'), COPIONE, MANUALE, { dadi: new DadiACopione([2]) });
    const schermo = await prova.proiettore(url);
    const frasi: AudioFrase[] = [];
    schermo.on('audio:frase', (f) => frasi.push(f));
    const ida = await prova.telefono(url, 'pg_ida');
    // Corrado is at the table too: his initiative is asked as well, and the Game Master gives it to the Engine.
    const corrado = await prova.telefono(url, 'pg_corrado');
    const master = await prova.master(url);
    const s1 = await inizia(schermo, ida);

    expect(await master.comanda({ tipo: 'combattimento_inizia' })).toEqual({ ok: true });
    let sm = await master.stato();
    // Asked, not started: no order yet, nothing rolled; a second start is refused, «Termina» would cancel it.
    expect(sm.combattimento).toMatchObject({ attivo: false, chiesto: true });
    expect(sm.tavolo.combattimento ?? null).toBeNull();
    expect(await master.comanda({ tipo: 'combattimento_inizia' })).toMatchObject({ ok: false });

    const iniziativa = attendiEvento<RichiestaTiro[]>(ida, 'tiri:richiesti', (r) => r.some((x) => x.per === 'iniziativa'));
    await agisci(ida, 'pg_ida', 'Guardo il fiume', s1.versione_scena);
    await agisci(corrado, 'pg_corrado', 'Aspetto', s1.versione_scena);
    const [ri] = (await iniziativa).filter((x) => x.per === 'iniziativa');
    expect(ri).toMatchObject({ chi: 'pg_ida', facce: 20, quanti: 1 });
    for (let i = 0; i < 40 && !frasi.some((f) => f.testo.includes('iniziativa')); i++) await new Promise((r) => setTimeout(r, 50));
    expect(frasi.map((f) => f.testo).join(' | ')).toContain('Ida, tira l\'iniziativa.');

    // Ida enters 17; Corrado's initiative goes to the Engine from the panel.
    sm = await master.stato();
    const richieste = sm.tiri!.richieste.filter((x) => x.per === 'iniziativa');
    expect(richieste.map((r) => r.chi).sort()).toEqual(['pg_corrado', 'pg_ida']);
    const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    for (const r of richieste) expect(await master.comanda({ tipo: 'tiro', id: r.id, valori: r.chi === 'pg_ida' ? [17] : null })).toEqual({ ok: true });
    const s2 = await dopo;

    const cmb = s2.combattimento!;
    expect(cmb).toBeTruthy();
    const per = new Map(cmb.combattenti.map((c) => [c.id, c.iniziativa]));
    expect(per.get('pg_ida')).toBe(17 + ri!.modificatore);
    for (const r of richieste.filter((x) => x.chi !== 'pg_ida')) expect(per.get(r.chi)).toBe(2 + r.modificatore);
    // The NPCs' initiative is the Engine's die, never asked to anyone.
    expect(richieste.every((r) => r.chi.startsWith('pg_'))).toBe(true);
    expect((await master.stato()).combattimento).toMatchObject({ attivo: true });
    expect((await master.stato()).combattimento?.chiesto).toBeUndefined();
  }, 20_000);

  it('an interrupted turn leaves no half-open fight: still asked, not started; «Termina» cancels the request', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('prove'), COPIONE, MANUALE, { dadi: new DadiACopione([2]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    const s1 = await inizia(schermo, ida);
    expect(await master.comanda({ tipo: 'combattimento_inizia' })).toEqual({ ok: true });
    const iniziativa = attendiEvento<RichiestaTiro[]>(ida, 'tiri:richiesti', (r) => r.some((x) => x.per === 'iniziativa'));
    await agisci(ida, 'pg_ida', 'Guardo il fiume', s1.versione_scena);
    await iniziativa;
    expect(await master.comanda({ tipo: 'ferma_narrazione' })).toMatchObject({ ok: true });
    await new Promise((r) => setTimeout(r, 100));
    let sm = await master.stato();
    expect(sm.combattimento).toMatchObject({ attivo: false, chiesto: true });
    expect(sm.tavolo.combattimento ?? null).toBeNull();
    expect(await master.comanda({ tipo: 'combattimento_termina' })).toEqual({ ok: true });
    sm = await master.stato();
    expect(sm.combattimento?.chiesto).toBeUndefined();
    expect(sm.combattimento?.attivo).toBe(false);
  }, 20_000);

  it('the world hears of the fight once: a gate «scontro» rolls one Game Master die, when the fight starts', async () => {
    prova = new Prova();
    const conPorta = (d: Record<string, unknown>): void => {
      const o = (d['orologi'] as Array<Record<string, unknown>>)[0]!;
      o['avanza_quando'] = [{ quando: 'scontro', tiro: { dado: 6, almeno: 4 } }];
    };
    const cartella = prova.campagna('prove', { ritocchi: { 'campagna.yaml': conPorta } });
    const { url } = await prova.avvia(cartella, COPIONE, MANUALE, { dadi: new DadiACopione([2]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    const s1 = await inizia(schermo, ida);
    expect(await master.comanda({ tipo: 'combattimento_inizia' })).toEqual({ ok: true });
    // Asked, not started: the gate has not rolled yet.
    expect((await master.stato()).tiri?.del_master ?? []).toHaveLength(0);
    const iniziativa = attendiEvento<RichiestaTiro[]>(ida, 'tiri:richiesti', (r) => r.some((x) => x.per === 'iniziativa'));
    await agisci(ida, 'pg_ida', 'Guardo il fiume', s1.versione_scena);
    await iniziativa;
    const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    for (const r of (await master.stato()).tiri!.richieste) expect(await master.comanda({ tipo: 'tiro', id: r.id, valori: [12] })).toEqual({ ok: true });
    await dopo;
    const sm = await master.stato();
    expect(sm.combattimento).toMatchObject({ attivo: true });
    expect(sm.tiri?.del_master).toHaveLength(1);
  }, 20_000);

  it('automatic rolls: the fight starts at once with the Engine\'s dice, as before', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('prove'), COPIONE, { TAGM_TIRI_GIOCATORI: 'automatico' }, { dadi: new DadiACopione([2]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    await inizia(schermo, ida);
    expect(await master.comanda({ tipo: 'combattimento_inizia' })).toEqual({ ok: true });
    const sm = await master.stato();
    expect(sm.combattimento).toMatchObject({ attivo: true });
    expect(sm.combattimento?.chiesto).toBeUndefined();
  });

  // A3 of docs/da-fare.md: the next window consumed the head step as if a PC had played it, so an NPC first in the
  // order lost its first step, and the order rolled at the click was never said at the table.
  it('automatic rolls, an NPC first: it strikes in the first window after the click, and the table hears the order', async () => {
    prova = new Prova();
    // Initiative at the click (Ida, Corrado, Ruggero): 2+2, 3+2, 18+1 → Ruggero, Corrado, Ida. Ruggero 15+4 hits the
    // last PC who acted (Corrado) for 4+2.
    const { url, messaggi } = await prova.avvia(prova.campagna('prove'), COPIONE, { TAGM_TIRI_GIOCATORI: 'automatico' }, { dadi: new DadiACopione([2, 3, 18, 15, 4]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const corrado = await prova.telefono(url, 'pg_corrado');
    const master = await prova.master(url);
    const s1 = await inizia(schermo, ida);
    expect(await master.comanda({ tipo: 'combattimento_inizia' })).toEqual({ ok: true });
    const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(ida, 'pg_ida', 'Guardo il fiume', s1.versione_scena);
    await agisci(corrado, 'pg_corrado', 'Aspetto', s1.versione_scena);
    const s2 = await dopo;
    expect(messaggi.find((m) => m.includes('Turno di Ruggero lo sgherro'))).toMatch(/Ruggero lo sgherro colpisce Corrado Lanzi: 6 danni/);
    expect(s2.pg.find((p) => p.id === 'pg_corrado')?.pf).toEqual({ attuali: 6, massimi: 12 });
    expect(s2.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo)).toContain('Ordine del round: Ruggero, Corrado, Ida.');
    expect(s2.combattimento?.turno_di).toEqual(['pg_corrado']);
  }, 20_000);
});
