/**
 * Stall S1 → S2 → S3 (docs/mondo.md §5, manual «Stall»). Before, every stall was S1 (`stallo: 1` hard-coded).
 * Now a counter grows on consecutive stalls outside a fight and goes back to zero on an action; each level carries
 * material from the Engine, never an empty «cosa fate?»; the fourth stall owes a mark to the scene's danger.
 * Invented fixture: test/fixtures/campagne/mondo.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { PericoloMondo } from '../src/campagna/mondo';
import { ContatoreStallo, impegna, livelloStallo, mossaDiStallo, senzaDecisione, stalloDuro, type ContestoStallo } from '../src/mondo/stallo';
import { attendi, inizia, Prova, turno } from './aiuti/partita';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';

class ArbitroColpo implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
    return Object.fromEntries(i.azioni.map((a) => [a.id, /colpisco/i.test(a.testo) ? { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' } : base(a.id)]));
  }
}

const fiume: PericoloMondo = { id: 'p_fiume', fronte: 'f', orologio: 'o_piena', impulso: 'allagare', mosse: ['sale di un palmo'], cast: ['png_mugnaio'], segniVisibili: ['Un tonfo a monte.'] };
const voci: PericoloMondo = { id: 'p_voci', fronte: 'f', orologio: 'o_voci', impulso: 'accusare', mosse: ['sparge una voce'], cast: ['png_mugnaio'], segniVisibili: [] };
const base: ContestoStallo = { pericoli: [voci, fiume], orologiAttivi: new Set(['o_piena']), presenti: new Set(), offerti: [], indiziDellaScena: ['i_a', 'i_b'], giàDati: new Set(), luoghiNoti: ['Il bosco', 'Il ponte'], fattiScoperti: [], ultimoSegno: null };

describe('mondo/stallo', () => {
  it('levels cycle 1, 2, 3; from the fourth stall S1 is hard', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(livelloStallo)).toEqual([1, 2, 3, 1, 2, 3, 1]);
    expect([1, 2, 3, 4, 7].map(stalloDuro)).toEqual([false, false, false, true, true]);
  });

  it('the counter grows on consecutive stalls, ignores a fight, restarts on an action', () => {
    const c = new ContatoreStallo();
    expect([c.registra(true, false), c.registra(true, false), c.registra(true, true), c.registra(true, false)]).toEqual([1, 2, 0, 3]);
    expect(c.registra(false, false)).toBe(0);
    expect(c.registra(true, false)).toBe(1);
  });

  it('the threat\'s last sign is S3 material apart, never a «road» of the leads (round 7, ST T9)', () => {
    const m = mossaDiStallo(3, { ...base, ultimoSegno: 'Un tonfo a monte.' });
    expect(m.piste).toEqual(['Il bosco', 'Il ponte']);
    expect(m.segno).toBe('Un tonfo a monte.');
    // One lead and the sign are still enough for S3, as before.
    expect(mossaDiStallo(3, { ...base, luoghiNoti: ['Il bosco'], ultimoSegno: 'Un tonfo a monte.' }).livello).toBe(3);
  });

  it('a prepared summary line makes S3 possible with fewer than two leads of the Engine', () => {
    const poco: ContestoStallo = { ...base, luoghiNoti: [], indiziDellaScena: [] };
    expect(mossaDiStallo(3, poco).livello).toBe(1);
    expect(mossaDiStallo(3, { ...poco, riassuntoPronto: true }).livello).toBe(3);
  });

  it('S1 names the danger of the scene; S2 a clue not given yet; S3 two or three leads; each falls back when empty', () => {
    expect(mossaDiStallo(1, base)).toMatchObject({ livello: 1, pericolo: { id: 'p_fiume' }, duro: false });
    expect(mossaDiStallo(1, { ...base, orologiAttivi: new Set(), presenti: new Set(['png_mugnaio']) }).pericolo?.id).toBe('p_voci');
    expect(mossaDiStallo(2, { ...base, offerti: ['i_z'] })).toMatchObject({ livello: 2, indizio: 'i_z' });
    expect(mossaDiStallo(2, { ...base, giàDati: new Set(['i_a']) })).toMatchObject({ livello: 2, indizio: 'i_b' });
    expect(mossaDiStallo(2, { ...base, indiziDellaScena: [] })).toMatchObject({ livello: 1 });
    expect(mossaDiStallo(3, { ...base, fattiScoperti: ['Il carro è rotto.'], ultimoSegno: 'Un tonfo.' })).toMatchObject({ livello: 3, piste: ['Il bosco', 'Il ponte', 'Il carro è rotto.'] });
    expect(mossaDiStallo(3, { ...base, luoghiNoti: ['Il bosco'] })).toMatchObject({ livello: 2, indizio: 'i_a' });
    expect(mossaDiStallo(4, base)).toMatchObject({ livello: 1, duro: true });
  });
});

describe('E12: two turns in a row without a new decision', () => {
  it('waiting, staying put, nothing, looking around, or the same action again; a real decision is not', () => {
    expect(['Aspetto.', 'Anna aspetta ancora.', 'Restiamo fermi', 'Bruno non fa niente.', 'Anna si guarda intorno.'].map((x) => senzaDecisione(x, null))).toEqual(['aspettare', 'aspettare', 'restare fermi', 'niente', 'guardarsi intorno']);
    expect(senzaDecisione('Anna aspetta e poi apre la porta.', null)).toBeNull();
    expect(senzaDecisione('Aspetto che il mugnaio parli.', null)).toBeNull();
    expect(senzaDecisione('Apro la botola.', 'apro la botola')).toBe('ripetuta');
  });

  it('the second such turn is a stall; a decision resets; one undecided PC among decided ones is a decision', () => {
    const c = new ContatoreStallo();
    const turno = (azioni: Array<[string, string]>) => c.registra(c.classifica(azioni.map(([autore, testo]) => ({ autore, testo }))), false);
    expect(turno([['pg_a', 'Aspetto.']])).toBe(0);
    expect(turno([['pg_a', 'Aspetto ancora.']])).toBe(1);
    expect(turno([['pg_a', 'Mi guardo intorno.']])).toBe(2);
    expect(turno([['pg_a', 'Aspetto.'], ['pg_b', 'Apro la porta.']])).toBe(0);
    expect(turno([['pg_b', 'Apro la porta.']])).toBe(0); // the same action again: undecided, the first time
    expect(turno([['pg_b', 'Apro la porta.']])).toBe(1);
  });
});

describe('server, mode A: four stalls in a row, then an action', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('S1, S2, S3 with their material, then a hard S1 that owes a mark; an action resets', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    const { url, messaggi } = await prova.avvia(cartella, () => '[narratore] Anna, la ruota cigola.\n[invito] tutti', { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const master = await prova.master(url);
    let s = await inizia(schermo, tel);
    for (let k = 0; k < 4; k++) {
      const dopo = attendi(tel, (x) => x.fase === 'finestra' && x.turno === s.turno + 1);
      expect(await master.comanda({ tipo: 'chiudi_finestra' })).toEqual({ ok: true });
      s = await dopo;
    }
    const [m1, m2, m3, m4] = messaggi.slice(-4) as [string, string, string, string];
    expect(m1).toMatch(/S1\)/);
    expect(m1).toContain('mosse del pericolo in scena: sale di un palmo; porta via un carro');
    expect(m2).toMatch(/S2\)/);
    expect(m2).toContain('(i_sacco): Chi solleva il sacco rotto trova un nastro rosso');
    expect(m3).toMatch(/S3\)/);
    expect(m3).toContain('piste che i PG conoscono: Il bosco; Il ponte');
    expect(m3).not.toContain('La città'); // kept for the next session: not a lead tonight
    // The fourth: S1 again, and the river's clock owes a mark (ordered, and said by the Engine when not shown).
    expect(m4).toMatch(/S1\)/);
    expect(m4).toMatch(/\[o_piena\][^\n]*Mostralo in questa risposta/);
    expect(s.trascrizione.filter((v) => v.turno === 4).map((v) => v.testo)).toContain("L'acqua lambisce la ruota.");
    expect(prova.turni().filter((r) => r['stallo']).map((r) => (r['stallo'] as { livello: number }).livello)).toEqual([1, 2, 3, 1]);
    // A real action: no stall section, and the counter starts again.
    s = await turno(tel, 'pg_anna', s, 'Anna sale sul tetto del mulino.');
    expect(messaggi.at(-1)).not.toContain('## Mossa del mondo');
    const dopo = attendi(tel, (x) => x.fase === 'finestra' && x.turno === s.turno + 1);
    await master.comanda({ tipo: 'chiudi_finestra' });
    await dopo;
    expect(messaggi.at(-1)).toMatch(/S1\)/);
  });
});

describe('server, mode B: the Engine brings the S2 clue line and says the S3 leads', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the selector has only fillers; the Engine adds the clue line at S2 and the leads at S3', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    const { url } = await prova.avvia(cartella, () => '[usa] nar_ruota\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const master = await prova.master(url);
    let s = await inizia(schermo, tel);
    for (let k = 0; k < 3; k++) {
      const dopo = attendi(tel, (x) => x.fase === 'finestra' && x.turno === s.turno + 1);
      expect(await master.comanda({ tipo: 'chiudi_finestra' })).toEqual({ ok: true });
      s = await dopo;
    }
    const detto = (t: number) => s.trascrizione.filter((v) => v.turno === t).map((v) => v.testo);
    expect(detto(2)).toContain('Sui sacchi di farina ci sono impronte piccole, di piedi scalzi.');
    expect(detto(3).join(' ')).toMatch(/Vi tornano in mente le strade ancora aperte: Il bosco; Il ponte/);
    expect(prova.turni().filter((r) => r['stallo']).map((r) => (r['stallo'] as { detto: string | null }).detto)).toEqual([null, 'nar_impronte', 'piste']);
  });
});

describe('mode B: answers that bring nothing new count, whatever the words (third e2e pass, bug 8)', () => {
  it('two answers with nothing new: the next window is a stall unless an action commits; something new resets', () => {
    const c = new ContatoreStallo();
    // A question to an NPC: decided, but it commits to nothing (the lead's rule after round 5).
    c.registraEsito(false);
    expect(c.registra('decisa', false, false)).toBe(0);
    c.registraEsito(false);
    expect(c.registra('decisa', false, false)).toBe(1);
    c.registraEsito(false);
    expect(c.registra('indecisa', false, false)).toBe(2);
    // In a fight an empty answer is not a stall.
    expect(c.registra('decisa', true, false)).toBe(0);
    c.registraEsito(true);
    expect(c.registra('decisa', false, false)).toBe(0);
    // An action that commits (or a roll) is a real decision: no stall, and the count and the escalation start again.
    c.registraEsito(false);
    c.registraEsito(false);
    expect(c.registra('decisa', false, true)).toBe(0);
    c.registraEsito(false);
    expect([c.fermi, c.n]).toEqual([0, 0]);
  });

  it('what commits: moving, going, giving, taking, using, attacking, in a sentence that is not a question', () => {
    expect(impegna('Vado al mulino, ho da fare.')).toBe(true);
    expect(impegna('Lascio Ugo con il suo carbone e vi vengo dietro.')).toBe(true);
    expect(impegna('Blocco le ruote con lo scudo.')).toBe(true);
    expect(impegna('Cosa facciamo? Aspettiamo qui o andiamo?')).toBe(false);
    expect(impegna('Io non mi fido di Ugo, mi sa che tiene le cose per sé.')).toBe(false);
    expect(impegna('Mi siedo sul muretto dello stazzo.')).toBe(false);
    expect(impegna('Berta, chi sa dove sta la lavagna?')).toBe(false);
  });

  it('after the fight is over, turns with nothing new count again (only a fight on is new by itself)', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    // T1 opens a fight (Corrado hits Ruggero: 10 + 5, 8 + 3 = 11, Ruggero dies); then «nothing new» turns follow.
    const { url } = await prova.avvia(cartella, (t) => (t === 0 ? '[narratore] Il fiume.\n[invito] tutti' : '[narratore] Il vento soffia.\n[invito] tutti'), {}, { arbitroProve: new ArbitroColpo(), dadi: new DadiACopione([10, 8, 15, 5, 10]) });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_corrado');
    let s = await inizia(schermo, tel);
    for (const testo of ['Colpisco Ruggero con la spada', 'Cerco il secondo bandito nel fango.', 'Grido al bandito di arrendersi.', 'Cerco ancora il bandito.', 'Mi siedo sul ponte.']) s = await turno(tel, 'pg_corrado', s, testo);
    // T1 is the fight; T2 and T3 bring nothing new; T4 is a stall, T5 the next one.
    expect(prova.turni().filter((r) => r['stallo']).map((r) => r['turno'])).toEqual([4, 5]);
  });

  it('questions to the NPCs that bring nothing new count as stalling (the lead\'s rule after round 5)', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    const { url } = await prova.avvia(cartella, () => '[narratore] Anna, la ruota cigola.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    for (let k = 0; k < 5; k++) s = await turno(tel, 'pg_anna', s, k % 2 ? 'Mugnaio, dimmi chi ha rotto il sacco.' : 'Chiedo alla ladra dove dorme stanotte.');
    expect(prova.turni().filter((r) => r['stallo']).map((r) => r['turno'])).toEqual([3, 4, 5]);
  });

  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('a table that sits and thinks, with no line to answer it: S1, then the Engine brings the clue (S2) and the leads (S3)', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    // Only improvised narration: no line answers the actions, no roll; the actions do not match the waiting patterns.
    const { url } = await prova.avvia(cartella, () => '[narratore] Anna, la ruota cigola.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    for (const testo of ['Mi siedo sul muretto del mulino.', 'Ci penso su, intanto.', 'Cosa facciamo adesso?', 'Non lo so, boh.', 'Mi siedo di nuovo.']) s = await turno(tel, 'pg_anna', s, testo);
    const detto = (t: number) => s.trascrizione.filter((v) => v.turno === t).map((v) => v.testo);
    expect(prova.turni().filter((r) => r['stallo']).map((r) => (r['stallo'] as { livello: number }).livello)).toEqual([1, 2, 3]);
    // S1 brings the world too: the Engine says a filler of the scene (canary on 97121cb: an improvised «nobody moves»).
    expect(prova.turni().filter((r) => r['stallo']).map((r) => (r['stallo'] as { detto: string | null }).detto)).toEqual(['nar_ruota', 'nar_impronte', 'piste']);
    expect(detto(3)).toContain('La ruota cigola e si ferma un istante.');
    expect(detto(4)).toContain('Sui sacchi di farina ci sono impronte piccole, di piedi scalzi.');
    expect(detto(5).join(' ')).toMatch(/Vi tornano in mente le strade ancora aperte: Il bosco; Il ponte/);
  });
});

describe('server, mode B: prepared stall lines (stallo: 1 | 2 | 3) are kept for the Engine\'s stall moves', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());
  // Round 4 (profile A, stall game): the reader used every filler as a waiting line by T6, and the one S1 at T14 found
  // none. A line tagged `stallo` is never in the reader's catalogue: the Engine says it at the stall move of its level.
  const stalli = [
    { id: 'nar_stallo_acqua', chi: 'narratore', tipo: 'momento', quando: 'il tavolo resta fermo', temi: ['acqua'], stallo: 1, testo: ['[narratore] Sotto le assi del mulino l\'acqua batte più forte.'], max_usi: 1 },
    { id: 'nar_stallo_sacchi', chi: 'narratore', tipo: 'indizio', quando: 'il tavolo resta fermo', temi: ['sacchi'], stallo: 2, testo: ['[narratore] Un sacco di farina si affloscia: sopra, impronte piccole di piedi scalzi.'], effetti: { rivela_indizi: ['i_farina'] }, max_usi: 1 },
    { id: 'nar_stallo_piste', chi: 'narratore', tipo: 'momento', quando: 'il tavolo resta fermo', temi: ['piste'], stallo: 3, richiede: { indizi_rivelati: ['i_farina'] }, testo: ['[narratore] Le impronte sulla farina, il bosco, il ponte: le strade sono lì.'], max_usi: 1 },
  ];

  it('S1, S2 and S3 say the prepared line of their level; the reader never gets them', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo', { battute: { 'narrazione.yaml': stalli } });
    const { url, messaggi } = await prova.avvia(cartella, () => '[narratore] Anna, la ruota cigola.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    for (const testo of ['Mi siedo sul muretto del mulino.', 'Ci penso su, intanto.', 'Cosa facciamo adesso?', 'Non lo so, boh.', 'Mi siedo di nuovo.']) s = await turno(tel, 'pg_anna', s, testo);
    expect(prova.turni().filter((r) => r['stallo']).map((r) => (r['stallo'] as { detto: string | null }).detto)).toEqual(['nar_stallo_acqua', 'nar_stallo_sacchi', 'nar_stallo_piste']);
    const detto = (t: number) => s.trascrizione.filter((v) => v.turno === t).map((v) => v.testo);
    expect(detto(4)).toContain('Un sacco di farina si affloscia: sopra, impronte piccole di piedi scalzi.');
    expect(detto(5)).toContain('Le impronte sulla farina, il bosco, il ponte: le strade sono lì.');
    expect(messaggi.join('\n')).not.toMatch(/nar_stallo_/);
  });
});

describe('server, mode B: the Engine does not pick a line the table just heard word for word (final round, ST T7/T9)', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('an S3 line whose only sentence was heard in the last turns is skipped: the Engine says the leads instead', async () => {
    prova = new Prova();
    // The scriptwriter's S3 line was the clock sign heard two turns before; here the narrator's own sentence of every turn.
    const eco = { id: 'nar_stallo_eco', chi: 'narratore', tipo: 'momento', quando: 'il tavolo resta fermo', temi: ['eco'], stallo: 3, testo: ['[narratore] La ruota del mulino cigola piano.'], max_usi: 1 };
    const cartella = prova.campagna('mondo', { battute: { 'narrazione.yaml': [eco] } });
    // Heard at T4 (the S2 turn), then the S3 of T5 would say it again.
    const { url } = await prova.avvia(cartella, (t) => (t === 4 ? '[narratore] La ruota del mulino cigola piano.\n[invito] tutti' : '[narratore] Anna, il vento gira.\n[invito] tutti'));
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    for (const testo of ['Mi siedo sul muretto del mulino.', 'Ci penso su, intanto.', 'Cosa facciamo adesso?', 'Non lo so, boh.', 'Mi siedo di nuovo.']) s = await turno(tel, 'pg_anna', s, testo);
    const s3 = prova.turni().filter((r) => r['stallo']).map((r) => r['stallo'] as { livello: number; detto: string | null }).find((x) => x.livello === 3);
    expect(s3?.detto).toBe('piste');
    expect(prova.turni().flatMap((r) => (r['uscita'] as Array<{ tipo: string; id?: string }>) ?? []).some((u) => u.id === 'nar_stallo_eco')).toBe(false);
  });
});

describe('server, mode B: the S3 sentence is never said twice word for word in a visit (round 7, ST T9 and T12)', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the second S3 says the variant', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('mondo'), () => '[narratore] Anna, la ruota cigola.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    for (let k = 0; k < 8; k++) s = await turno(tel, 'pg_anna', s, k % 2 ? 'Ci penso su, intanto.' : 'Mi siedo sul muretto del mulino.');
    const tutto = s.trascrizione.map((v) => v.testo);
    expect(tutto.filter((t) => /^Vi tornano in mente le strade ancora aperte/.test(t))).toHaveLength(1);
    expect(tutto.filter((t) => /^Le strade restano quelle/.test(t))).toHaveLength(1);
  });
});

describe('server, mode B: S3 says only what the table heard', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('a fact found through a private action is not among the leads said aloud', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    const copione = (t: number): string =>
      t === 1 ? '[usa] nar_macina > pg_anna\n[invito] tutti' : t === 2 ? '[usa] nar_cantina_privata > pg_anna\n[invito] tutti' : '[usa] nar_ruota\n[invito] tutti';
    const { url } = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const master = await prova.master(url);
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Anna esamina la macina.'); // public: f_macina
    s = await turno(tel, 'pg_anna', s, 'Anna scende da sola in cantina.', true); // private: f_ladra, only on her phone
    for (let k = 0; k < 3; k++) {
      const dopo = attendi(tel, (x) => x.fase === 'finestra' && x.turno === s.turno + 1);
      await master.comanda({ tipo: 'chiudi_finestra' });
      s = await dopo;
    }
    const s3 = s.trascrizione.filter((v) => v.turno === 5).map((v) => v.testo).join(' ');
    expect(s3).toContain('Vi tornano in mente le strade ancora aperte: Il bosco; Il ponte; La macina è stata cambiata da poco');
    expect(s.trascrizione.map((v) => v.testo).join(' ')).not.toContain('La ladra si nasconde');
  });
});

describe('server, mode A: E12, two turns of waiting', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the second turn that only waits gets the world’s S1 move with the action', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    const { url, messaggi } = await prova.avvia(cartella, () => '[narratore] Anna, la ruota cigola.\n[invito] tutti', { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Anna aspetta.');
    expect(messaggi.at(-1)).not.toContain('## Mossa del mondo');
    s = await turno(tel, 'pg_anna', s, 'Anna aspetta ancora.');
    expect(messaggi.at(-1)).toMatch(/## Mossa del mondo[\s\S]*S1\)/);
    expect(messaggi.at(-1)).toContain('Anna aspetta ancora.');
    s = await turno(tel, 'pg_anna', s, 'Anna apre la botola.');
    expect(messaggi.at(-1)).not.toContain('## Mossa del mondo');
  });
});
