/**
 * The Game Master's secret rolls (M9, docs/prove.md §12; audit rows C-CLS-18, C-CLS-19, C-THF-04, C-THF-05, C-THF-06,
 * C-THF-08, C-THF-09): an ability the set marks `segreta` is rolled with the Engine's dice even with manual rolls, its
 * card stays on the Game Master's panel, and the narrator hears how the character perceives a failure; situational
 * percentage points (a scene check's `aggiustamento`, a difficulty rung's `percentuale`); a failure band (pick pockets
 * noticed above twice the target); an NPC's save against a PC's power follows `tiri_master`. On the cripta fixture.
 */
import { describe, expect, it } from 'vitest';
import { strumentiRegole } from '../src/prove/risolutore-regole';
import { DadiACopione } from '../src/prove/dadi';
import { StatoProve } from '../src/prove/stato';
import { loggerMuto } from '../src/logger';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaRegole } from '../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import type { ArbitroProve, DecisioneRegole } from '../src/prove/tipi';
import { azione, CRIPTA, motoreCripta } from './aiuti/cripta';

/** The d10s of a d100 roll (units first, then tens; 00 + 0 = 100), for the dice by faces. */
const d100 = (n: number): number[] => [(n % 10) + 1, (Math.floor(n / 10) % 10) + 1];

/** A model arbiter that always says the same check (the difficulty rung included). */
function arbitro(abilita: string, difficolta: string | null = null): ArbitroProve<DecisioneRegole> {
  return {
    classifica: async (ing) => Object.fromEntries(ing.azioni.map((a) => [a.id, { id: a.id, tipo: 'prova', caratteristica: null, abilita, mossa: null, bersaglio: null, arma: null, prova_scena: null, difficolta, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null, potere: null } as DecisioneRegole])),
  } as ArbitroProve<DecisioneRegole>;
}

describe('a secret roll', () => {
  it('manual rolls ask nothing: the Engine rolls, the card is the Game Master’s, a failure is told as «nothing noticed»', async () => {
    // d100 55 against Tessa's Origliare 30: failed.
    const m = motoreCripta({ 10: d100(55) });
    const d = await m.decidi(1, [azione('pg_tessa', 'Ascolto alla porta di ferro')]);
    expect(m.richiesteGiocatori(d)).toEqual([]);
    const r = m.completa(d, new Map(), true);
    const carta = r.tiri.find((t) => t.chi === 'pg_tessa')!;
    expect(carta).toMatchObject({ etichetta: 'Origliare', dadi: [55], riuscita: false, nascosta: true });
    expect(m.tiriPubblici()).toEqual([]);
    expect(m.tiriDelMaster().map((t) => t.etichetta)).toEqual(['Origliare']);
    const f = r.fatti.join(' ');
    expect(f).toMatch(/Tessa: Tiro segreto del master \(il giocatore non vede il dado né l'esito\): /);
    expect(f).toMatch(/Tessa non nota niente: raccontalo come se non ci fosse niente da notare, senza dire che il tiro è fallito\./);
    expect(f).not.toMatch(/NON succede/);
    // The scene check's outcome gates stay true to the dice (a line that needs the success does not come out).
    expect(r.perAzione.get(d.azioni[0]!.id)!.riuscita).toBe(false);
  });

  it('a success is the plain fact, still secret', async () => {
    const m = motoreCripta({ 10: d100(12) });
    const r = await m.risolvi(1, [azione('pg_tessa', 'Ascolto alla porta di ferro')]);
    expect(r.tiri[0]).toMatchObject({ riuscita: true, nascosta: true });
    expect(r.fatti[0]).not.toMatch(/non nota niente/);
  });

  it('«riuscita»: the thief believes it worked', async () => {
    const m = motoreCripta({ 10: d100(90) }, { arbitro: arbitro('sgattaiolare') });
    const r = await m.risolvi(1, [azione('pg_tessa', 'Sgattaiolo verso la porta')]);
    expect(r.tiri[0]).toMatchObject({ etichetta: 'Sgattaiolare', nascosta: true, riuscita: false });
    expect(r.fatti.join(' ')).toMatch(/Tessa pensa che sia andata bene: raccontalo così, senza dire che il tiro è fallito/);
  });
});

describe('situational points and failure bands', () => {
  it('a difficulty rung gives a d100 threshold its percentage points (difficile −20)', async () => {
    // Origliare 30 − 20 = 10: a 25 fails.
    const m = motoreCripta({ 10: d100(25) }, { arbitro: arbitro('origliare', 'difficile') });
    const r = await m.risolvi(1, [azione('pg_tessa', 'Ascolto il muro bagnato')]);
    expect(r.tiri[0]).toMatchObject({ riuscita: false, contro: { valore: 10 } });
    expect(r.fatti[0]).toMatch(/\(aggiustamento −20\)/);
  });

  it('pick pockets: a failure above twice the target, or 00, is noticed', async () => {
    for (const [dado, notato] of [[45, false], [61, true], [100, true]] as const) {
      const m = motoreCripta({ 10: d100(dado) }, { arbitro: arbitro('borseggiare') });
      const r = await m.risolvi(1, [azione('pg_tessa', 'Sfilo la borsa al guardiano')]);
      expect(r.tiri[0]!.riuscita, String(dado)).toBe(false);
      expect(/Fallimento grave: la vittima se ne accorge/.test(r.fatti.join(' ')), String(dado)).toBe(notato);
    }
  });
});

describe('an NPC’s save against a PC’s power follows tiri_master', () => {
  it('hidden by default; shown with «visibili»; with «a_volte» only when the odds are close', () => {
    const c = caricaCampagna(CRIPTA);
    const s = caricaRegole(CRIPTA).sistema;
    const schede = caricaSchedeGeneriche(s, c);
    const base = { turno: 1, sistema: s, schede, stato: new StatoProve(schede), dadi: new DadiACopione([1]), proveScena: [], nome: (id: string) => id, esiste: () => true, log: loggerMuto() };
    const salva = (modo?: 'nascosti' | 'visibili' | 'a_volte', mod = 0) => strumentiRegole({ ...base, ...(modo ? { tiriMaster: () => modo } : {}) } as never).salvezzaDelBersaglio('png_putrido', 'ts_magia', mod, new DadiACopione([10]), false)!.t.nascosta;
    expect(salva()).toBe(true);
    expect(salva('nascosti')).toBe(true);
    expect(salva('visibili')).toBe(false);
    // Putrido saves as a 2nd-level fighter: magia 16, a d20 needing 16+ (one in four): not a toss-up, hidden.
    expect(salva('a_volte')).toBe(true);
    // With +5 to the save: 11+ (one in two): shown.
    expect(salva('a_volte', 5)).toBe(false);
  });
});
