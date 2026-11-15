/**
 * Manual rolls with the whole server (docs/prove.md §8): the window closes, the Engine asks the players to roll, the
 * voice says «Ida, fai un tiro di Persuasione», the projector and the phones get the request without the DC, a private
 * action's request reaches only its phone, the player enters the dice, the Game Master panel sees the DC and can enter
 * or switch a roll to the Engine, and the narrator receives the outcome of the dice entered. Invented fixture `prove`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { AudioFrase, Esito, RichiestaTiro, StatoTavolo } from '@tabletop-ai-gm/shared';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { Prova, agisci, attendi, attendiEvento, emetti, inizia } from './aiuti/partita';

const vuota = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });

class ArbitroParole implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const out: Record<string, DecisioneProva> = {};
    for (const a of i.azioni) {
      const d = vuota(a.id);
      if (/convinco/i.test(a.testo)) Object.assign(d, { tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' });
      else if (/lucchetto/i.test(a.testo)) Object.assign(d, { tipo: 'prova', abilita: 'rapidita_di_mano', prova_scena: 'p_cassetta' });
      else if (/balestra/i.test(a.testo)) Object.assign(d, { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' });
      out[a.id] = d;
    }
    return out;
  }
}

const COPIONE = (turno: number): string => (turno === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[narratore] Il vento porta odore di fango.\n[invito] tutti');
const MANUALE = { TAGM_TIRI_GIOCATORI: 'manuale' };

describe('manual rolls with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the request without DC on projector and phones, the private one only on its phone; the dice entered decide', async () => {
    prova = new Prova();
    // The Engine's dice are all 1s: any card showing other values used the players' dice.
    const { url, messaggi } = await prova.avvia(prova.campagna('prove'), COPIONE, MANUALE, { arbitroProve: new ArbitroParole(), dadi: new DadiACopione([1]) });
    const schermo = await prova.proiettore(url);
    const frasi: AudioFrase[] = [];
    schermo.on('audio:frase', (f) => frasi.push(f));
    const ida = await prova.telefono(url, 'pg_ida');
    const teo = await prova.telefono(url, 'pg_teo');
    const master = await prova.master(url);
    const s1 = await inizia(schermo, ida);
    expect(s1.tiri_manuali).toBe(true);

    const richiesteIda = attendiEvento<RichiestaTiro[]>(ida, 'tiri:richiesti', (r) => r.length > 0);
    const richiesteTeo = attendiEvento<RichiestaTiro[]>(teo, 'tiri:richiesti', (r) => r.length > 0);
    const attesa = attendi(schermo, (x) => (x.tiri_richiesti?.length ?? 0) > 0);
    await agisci(ida, 'pg_ida', 'Convinco Bertoldo a dirmi chi paga lo sgherro', s1.versione_scena);
    await agisci(teo, 'pg_teo', 'Intanto apro piano il lucchetto della cassetta', s1.versione_scena, true);
    const st: StatoTavolo = await attesa;
    // Projector: only the public request, no DC anywhere in the table state.
    expect(st.tiri_richiesti).toHaveLength(1);
    expect(st.tiri_richiesti![0]).toMatchObject({ chi: 'pg_ida', etichetta: 'Persuasione (Carisma)', facce: 20, quanti: 2, tieni: 'alto', modificatore: 5 });
    expect(JSON.stringify(st.tiri_richiesti)).not.toMatch(/"contro"|"bersaglio"|"regola"/);
    expect(st.fase).toBe('narrazione');
    const [ri] = await richiesteIda;
    const [rt] = await richiesteTeo;
    expect(rt).toMatchObject({ chi: 'pg_teo', privata: true, etichetta: 'Rapidità di mano (Destrezza)', quanti: 1 });
    // The voice says the public request, never the private one, never a number to beat.
    await new Promise((r) => setTimeout(r, 100));
    const detto = frasi.map((f) => f.testo).join(' | ');
    expect(detto).toContain('Ida, fai un tiro di Persuasione, con vantaggio.');
    expect(detto).not.toMatch(/Teo|lucchetto|15/);
    // The panel sees both requests with their DC.
    const sm = await master.stato();
    expect(sm.tiri?.giocatori).toBe('manuale');
    expect(sm.tiri?.richieste.map((r) => [r.chi, r.contro.valore])).toEqual([
      ['pg_ida', 15],
      ['pg_teo', 15],
    ]);

    // A phone cannot roll for another PC, nor enter the wrong dice.
    expect(await emetti<Esito>((cb) => teo.emit('tiro:inserisci', { id_pg: 'pg_teo', id: ri!.id, valori: [10, 10] }, cb))).toMatchObject({ ok: false });
    expect(await emetti<Esito>((cb) => ida.emit('tiro:inserisci', { id_pg: 'pg_ida', id: ri!.id, valori: [10] }, cb))).toMatchObject({ ok: false });
    expect(await emetti<Esito>((cb) => ida.emit('tiro:inserisci', { id_pg: 'pg_ida', id: ri!.id, valori: [4, 21] }, cb))).toMatchObject({ ok: false });
    // Ida rolled 4 and 13; the Game Master enters Teo's 6 for him.
    const dopo = attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(await emetti<Esito>((cb) => ida.emit('tiro:inserisci', { id_pg: 'pg_ida', id: ri!.id, valori: [4, 13] }, cb))).toEqual({ ok: true });
    expect(await master.comanda({ tipo: 'tiro', id: rt!.id, valori: [6] })).toEqual({ ok: true });
    const s2 = await dopo;

    // The narrator got the outcomes of the dice entered (DC included: it narrates, it never says it aloud).
    const m = messaggi.at(-1)!;
    expect(m).toContain('Ida Ferraro: Persuasione (Carisma) verso Bertoldo (con vantaggio: Bertoldo è ben disposto): 18 contro CD 15 → RIUSCITA.');
    expect(m).toMatch(/Teo \(azione PRIVATA[^\n]*Rapidità di mano \(Destrezza\): 13 contro CD 15 → FALLITA/);
    // The table's card: dice, bonus, total and outcome, no DC.
    expect(s2.tiri).toHaveLength(1);
    expect(s2.tiri![0]).toMatchObject({ chi: 'pg_ida', dadi: [4, 13], totale: 18, riuscita: true, manuale: 'telefono', contro_nascosto: true, contro: { valore: 0 } });
    expect(s2.tiri![0]!.regola).toBeUndefined();
    expect(s2.tiri_richiesti).toEqual([]);
    // The panel keeps the full card.
    const sm2 = await master.stato();
    expect(sm2.tiri?.carte.find((t) => t.chi === 'pg_teo')).toMatchObject({ dadi: [6], contro: { valore: 15 }, manuale: 'master' });
  });

  it('the Game Master switches a forgotten roll to the Engine; a stop drops the wait and gives the actions back', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('prove'), COPIONE, MANUALE, { arbitroProve: new ArbitroParole(), dadi: new DadiACopione([17]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    const s1 = await inizia(schermo, ida);
    let attesa = attendi(schermo, (x) => (x.tiri_richiesti?.length ?? 0) > 0);
    await agisci(ida, 'pg_ida', 'Convinco Bertoldo a farci passare', s1.versione_scena);
    await attesa;
    const dopo = attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(await master.comanda({ tipo: 'tiro', id: '*', valori: null })).toEqual({ ok: true });
    const s2 = await dopo;
    // The Engine's dice (17, 17 with advantage); the card still hides the DC (the roll was asked to the table).
    expect(s2.tiri![0]).toMatchObject({ dadi: [17, 17], manuale: 'motore', contro_nascosto: true });

    attesa = attendi(schermo, (x) => (x.tiri_richiesti?.length ?? 0) > 0);
    await agisci(ida, 'pg_ida', 'Convinco Bertoldo a farci passare di nuovo', s2.versione_scena);
    await attesa;
    const fermo = attendi(ida, (x) => x.fase === 'pausa');
    expect(await master.comanda({ tipo: 'ferma_narrazione' })).toEqual({ ok: true });
    const s3 = await fermo;
    expect(s3.tiri_richiesti).toEqual([]);
    // The late roll finds no request.
    expect(await emetti<Esito>((cb) => ida.emit('tiro:inserisci', { id_pg: 'pg_ida', id: 'r_x', valori: [3, 3] }, cb))).toMatchObject({ ok: false });
  });

  it('the Game Master asks a check from the panel: it joins the next window, the player rolls it, the narrator gets it', async () => {
    prova = new Prova();
    const { url, messaggi } = await prova.avvia(prova.campagna('prove'), COPIONE, MANUALE, { arbitroProve: new ArbitroParole(), dadi: new DadiACopione([1]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    const s1 = await inizia(schermo, ida);
    // The panel offers the set's checks and difficulties, and the PCs with a sheet.
    const sm = await master.stato();
    expect(sm.tiri?.catalogo.prove).toEqual(expect.arrayContaining([{ id: 'abilita:percezione', nome: 'Percezione (Saggezza)' }, { id: 'salvezza:destrezza', nome: 'Tiro salvezza su Destrezza' }]));
    expect(sm.tiri?.catalogo.difficolta).toEqual(expect.arrayContaining([{ id: 'difficile', nome: 'difficile', valore: 20 }]));
    // Refused: an unknown check, a difficulty not of the set, a PC without sheet or unknown.
    expect(await master.comanda({ tipo: 'chiedi_prova', id_pg: 'pg_ida', cosa: 'abilita:volare', difficolta: null })).toMatchObject({ ok: false });
    expect(await master.comanda({ tipo: 'chiedi_prova', id_pg: 'pg_ida', cosa: 'abilita:percezione', difficolta: 'impossibilissima' })).toMatchObject({ ok: false });
    expect(await master.comanda({ tipo: 'chiedi_prova', id_pg: 'pg_nessuno', cosa: 'abilita:percezione', difficolta: null })).toMatchObject({ ok: false });
    expect(await master.comanda({ tipo: 'chiedi_prova', id_pg: 'pg_ida', cosa: 'abilita:percezione', difficolta: 'difficile', motivo: 'sentire i passi sul ponte' })).toEqual({ ok: true });
    expect((await master.stato()).tiri?.chieste).toMatchObject([{ id_pg: 'pg_ida', nome: 'Percezione (Saggezza)', difficolta: 'difficile' }]);
    // Nobody acts: «Risolvi ora» closes the window, the check is asked to Ida.
    const richiesta = attendiEvento<RichiestaTiro[]>(ida, 'tiri:richiesti', (r) => r.length > 0);
    expect(await master.comanda({ tipo: 'chiudi_finestra' })).toEqual({ ok: true });
    const [r] = await richiesta;
    expect(r).toMatchObject({ chi: 'pg_ida', etichetta: 'Percezione (Saggezza)', dal_master: true, quanti: 1 });
    const dopo = attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(await emetti<Esito>((cb) => ida.emit('tiro:inserisci', { id_pg: 'pg_ida', id: r!.id, valori: [17] }, cb))).toEqual({ ok: true });
    const s2 = await dopo;
    expect(s2.turno).toBe(s1.turno + 1);
    // Ida's Perception is +0: 17 against the «difficile» DC 20 the Game Master chose. Not a stall: no world move asked.
    const m = messaggi.at(-1)!;
    expect(m).toMatch(/Ida Ferraro: Percezione \(Saggezza\): 17 contro CD 20 → FALLITA/);
    expect(m).toContain('prova chiesta dal master: Percezione (Saggezza), per sentire i passi sul ponte');
    expect(m).not.toMatch(/^Stallo/m);
    expect(s2.tiri![0]).toMatchObject({ chi: 'pg_ida', dadi: [17], totale: 17, contro_nascosto: true });
    expect((await master.stato()).tiri?.chieste).toEqual([]);
  });

  it('follow-ups: after the hit the phone is asked the damage, then every PC the initiative; a switch to the Engine holds', async () => {
    prova = new Prova();
    const { url, messaggi } = await prova.avvia(prova.campagna('prove'), COPIONE, MANUALE, { arbitroProve: new ArbitroParole(), dadi: new DadiACopione([3]) });
    const schermo = await prova.proiettore(url);
    const frasi: AudioFrase[] = [];
    schermo.on('audio:frase', (f) => frasi.push(f));
    const corrado = await prova.telefono(url, 'pg_corrado');
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    const s1 = await inizia(schermo, corrado);
    const attacco = attendiEvento<RichiestaTiro[]>(corrado, 'tiri:richiesti', (r) => r.length > 0);
    await agisci(corrado, 'pg_corrado', 'Tiro con la balestra a Ruggero', s1.versione_scena);
    await agisci(ida, 'pg_ida', 'Guardo il fiume', s1.versione_scena);
    const [ra] = await attacco;

    expect(ra).toMatchObject({ id: expect.stringMatching(/^r_/), tipo: 'attacco' });
    // The hit: the same phone is asked the damage next, the voice says it.
    const danno = attendiEvento<RichiestaTiro[]>(corrado, 'tiri:richiesti', (r) => r.some((x) => x.per === 'danno'));
    expect(await emetti<Esito>((cb) => corrado.emit('tiro:inserisci', { id_pg: 'pg_corrado', id: ra!.id, valori: [18] }, cb))).toEqual({ ok: true });
    const [rd] = await danno;

    expect(rd).toMatchObject({ per: 'danno', facce: 8, quanti: 1 });
    // The fight's initiative comes after the damage; Ida is asked hers.
    const iniIda = attendiEvento<RichiestaTiro[]>(ida, 'tiri:richiesti', (r) => r.some((x) => x.per === 'iniziativa'));
    expect(await emetti<Esito>((cb) => corrado.emit('tiro:inserisci', { id_pg: 'pg_corrado', id: rd!.id, valori: [7] }, cb))).toEqual({ ok: true });
    const [ri] = await iniIda;
    for (let i = 0; i < 40 && !frasi.some((f) => f.testo.includes('iniziativa')); i++) await new Promise((r) => setTimeout(r, 50));
    const detto = frasi.map((f) => f.testo).join(' | ');
    expect(detto).toContain('Corrado, tira i danni.');
    expect(detto).toContain('Ida, tira l\'iniziativa.');
    // The Game Master gives Corrado's initiative to the Engine; Ida rolls hers; the turn goes on.
    const sm = await master.stato();
    const rc = sm.tiri!.richieste.find((x) => x.chi === 'pg_corrado' && x.per === 'iniziativa')!;
    const dopo = attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(await master.comanda({ tipo: 'tiro', id: rc.id, valori: null })).toEqual({ ok: true });
    for (const r of sm.tiri!.richieste.filter((x) => x.chi !== 'pg_corrado')) expect(await master.comanda({ tipo: 'tiro', id: r.id, valori: [10] })).toEqual({ ok: true });
    void ri;
    const s2 = await dopo;
    const carta = s2.tiri!.find((t) => t.chi === 'pg_corrado')!;
    expect(carta).toMatchObject({ dadi: [18], manuale: 'telefono', contro_nascosto: true });
    expect(carta.danno?.dadi).toEqual([7]);
    expect(messaggi.at(-1)!).toMatch(/Balestra leggera[^\n]*COLPITO, \d+ danni/);
  }, 20_000);

  it('automatic rolls (the campaign or the instance says so): no request, no wait, the card keeps the DC', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('prove'), COPIONE, { TAGM_TIRI_GIOCATORI: 'automatico' }, { arbitroProve: new ArbitroParole(), dadi: new DadiACopione([4, 13]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const s1 = await inizia(schermo, ida);
    expect(s1.tiri_manuali).toBeUndefined();
    const dopo = attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    await agisci(ida, 'pg_ida', 'Convinco Bertoldo a farci passare', s1.versione_scena);
    const s2 = await dopo;
    expect(s2.tiri![0]).toMatchObject({ dadi: [4, 13], contro: { valore: 15 } });
    expect(s2.tiri![0]!.manuale).toBeUndefined();
  });
});
