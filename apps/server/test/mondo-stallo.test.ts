/**
 * Stall S1 → S2 → S3 (docs/mondo.md §5, manual «Stall»). Before, every stall was S1 (`stallo: 1` hard-coded).
 * Now a counter grows on consecutive stalls outside a fight and goes back to zero on an action; each level carries
 * material from the Engine, never an empty «cosa fate?»; the fourth stall owes a mark to the scene's danger.
 * Invented fixture: test/fixtures/campagne/mondo.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { PericoloMondo } from '../src/campagna/mondo';
import { ContatoreStallo, livelloStallo, mossaDiStallo, senzaDecisione, stalloDuro, type ContestoStallo } from '../src/mondo/stallo';
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
  it('two answers with nothing new: the next window is a stall even with a «decided» action; something new resets', () => {
    const c = new ContatoreStallo();
    c.registraEsito(false);
    expect(c.registra('decisa', false)).toBe(0);
    c.registraEsito(false);
    expect(c.registra('decisa', false)).toBe(1);
    c.registraEsito(false);
    expect(c.registra('indecisa', false)).toBe(2);
    // In a fight an empty answer is not a stall.
    expect(c.registra('decisa', true)).toBe(0);
    c.registraEsito(true);
    expect(c.registra('decisa', false)).toBe(0);
    // An action toward an NPC present is a decision, even when no line answers it; but it does not reset the escalation.
    c.registraEsito(false);
    c.registraEsito(false);
    expect(c.registra('decisa', false, true)).toBe(0);
    c.registraEsito(false);
    expect(c.registra('decisa', false)).toBe(1);
    c.registraEsito(false);
    expect(c.registra('decisa', false, true)).toBe(0);
    c.registraEsito(false);
    expect(c.registra('decisa', false)).toBe(2);
  });

  it('after a fight in the scene, turns with nothing new are not a stall (coherence run: a parley, attacks after the fight)', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    // T1 opens a fight (Corrado hits Ruggero: 10 + 5, 8 + 3 = 11, Ruggero dies); then «nothing new» turns follow.
    const { url } = await prova.avvia(cartella, (t) => (t === 0 ? '[narratore] Il fiume.\n[invito] tutti' : '[narratore] Il vento soffia.\n[invito] tutti'), {}, { arbitroProve: new ArbitroColpo(), dadi: new DadiACopione([10, 8, 15, 5, 10]) });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_corrado');
    let s = await inizia(schermo, tel);
    for (const testo of ['Colpisco Ruggero con la spada', 'Cerco il secondo bandito nel fango.', 'Grido al bandito di arrendersi.', 'Cerco ancora il bandito.', 'Mi siedo sul ponte.']) s = await turno(tel, 'pg_corrado', s, testo);
    expect(prova.turni().filter((r) => r['stallo'])).toEqual([]);
  });

  it('real decisions toward the NPCs, answered only by improvised narration, never reach a stall (no free clue)', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    const { url } = await prova.avvia(cartella, () => '[narratore] Anna, la ruota cigola.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    for (let k = 0; k < 5; k++) s = await turno(tel, 'pg_anna', s, k % 2 ? 'Mugnaio, dimmi chi ha rotto il sacco.' : 'Chiedo alla ladra dove dorme stanotte.');
    expect(prova.turni().filter((r) => r['stallo'])).toEqual([]);
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
    expect(detto(4)).toContain('Sui sacchi di farina ci sono impronte piccole, di piedi scalzi.');
    expect(detto(5).join(' ')).toMatch(/Vi tornano in mente le strade ancora aperte: Il bosco; Il ponte/);
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
