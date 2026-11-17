/**
 * Combattimento (docs/combattimento.md): lo scontro guidato dal set di regole.
 * - SRD 5.2: iniziativa individuale, turno del PNG da solo (bersaglio: chi lo ha colpito), PG a 0 con
 *   «Privo di sensi» e tiri contro la morte (1 = due fallimenti, 20 = torna con 1 PF), condizioni che
 *   fanno perdere il turno e scadono, vantaggio dalle condizioni negli attacchi.
 * - B/X: iniziativa per schieramento ritirata a ogni round, fasi (i PNG tirano solo nella fase giusta),
 *   morale che fa fuggire i nemici.
 * - PbtA: nessuna iniziativa, niente turni, PF e fine dello scontro.
 * - Il set: la sezione `combattimento:` di regole.yaml, con gli errori per il validatore.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaSchede } from '../src/campagna/schede';
import { loggerMuto } from '../src/logger';
import { GestoreCombattimento } from '../src/prove/combattimento';
import { DadiACopione } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import { StatoProve } from '../src/prove/stato';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { caricaRegole } from '../src/regole/caricatore';
import { combattimentoSrd, leggiCombattimento, type Combattimento } from '../src/regole/combattimento';
import { orologioDiSistema } from '../src/turni/orologio';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');

/** Uno scontro con dipendenze finte: i PNG «colpiscono» per `danno` punti (o niente se null). */
function scontro(regole: Combattimento, pf: Record<string, number>, dadi: number[], danno: (png: string, fase: string) => number | null = () => 5) {
  const schede = new Map(Object.entries(pf).map(([id, p]) => [id, { id, pf_massimi: p }]));
  const stato = new StatoProve(schede);
  const fonte = new DadiACopione(dadi);
  const attacchi: Array<{ png: string; pg: string; fase: string }> = [];
  const g = new GestoreCombattimento({
    regole,
    stato,
    dadi: () => fonte,
    nome: (id) => id.replace(/^(pg|png)_/, ''),
    attacca: (png, pg, fase) => {
      const n = danno(png, fase.id);
      if (n === null) return null;
      attacchi.push({ png, pg, fase: fase.id });
      stato.danneggia(pg, n);
      const t = { id: `x${attacchi.length}`, tipo: 'attacco', nome: png, bersaglio: { id: pg, nome: pg }, riuscita: true, danno: { totale: n }, a_terra: stato.aTerra(pg) } as TiroMostrato;
      return { t, testo: `colpisce ${pg} per ${n}.` };
    },
    morale: (png) => (png === 'png_y' ? 7 : null),
    nuovoIdTiro: () => 'tm',
    log: loggerMuto(),
  });
  return { g, stato, attacchi };
}

describe('the target of an attack with no target named (round 5: «lo colpisco ancora» got no roll)', () => {
  it('the PC\'s last target while it stands, else the first enemy standing in the order; none outside a fight', () => {
    const { g, stato } = scontro(combattimentoSrd(), { pg_a: 10, png_x: 10, png_y: 10 }, [10, 18, 5, 1, 1, 1, 1, 1, 1], () => null);
    expect(g.bersaglioImplicito('pg_a', 'png_y')).toBeNull();
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }, { id: 'png_y', lato: 'png' as const, mod: 0 }];
    g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_y' }], autori: ['pg_a'], candidati: () => cand });
    expect(g.bersaglioImplicito('pg_a', 'png_y')).toBe('png_y');
    stato.danneggia('png_y', 20);
    expect(g.bersaglioImplicito('pg_a', 'png_y')).toBe('png_x');
    expect(g.bersaglioImplicito('png_x', null)).toBeNull();
  });
});

describe('combattimento SRD 5.2', () => {
  it('iniziativa, turno del PNG contro chi lo ha colpito, PG a 0: privo di sensi e tiri contro la morte', () => {
    // Iniziativa: a 10+2 = 12, b 5+0 = 5, x 18+1 = 19 → x, a, b. Il PNG colpisce a per 20 (va a 0).
    const { g, stato, attacchi } = scontro(combattimentoSrd(), { pg_a: 10, pg_b: 10, png_x: 10 }, [10, 5, 18, 1], () => 20);
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 2 }, { id: 'pg_b', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 1 }];
    const r = g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r.fatti[0]).toBe('Inizia il combattimento. Iniziativa: x 19, a 12, b 5.');
    // The order rolled in this turn, for the Engine's table line (bug 6 of the third e2e pass); none in the next turn.
    expect(r.ordine).toEqual(['x', 'a', 'b']);
    expect(attacchi).toEqual([{ png: 'png_x', pg: 'pg_a', fase: 'turno' }]);
    expect(stato.aTerra('pg_a')).toBe(true);
    // Il turno di a: tiro contro la morte 1 → due fallimenti; poi tocca a b.
    expect(r.fatti.join(' ')).toMatch(/a è a terra: tiro salvezza contro la morte 1 contro CD 10 → fallito \(successi 0, fallimenti 2\)/);
    // L'esito del tiro è un fatto che il tavolo deve sentire (prove/fatti-dovuti.ts): resta a terra.
    expect(r.morte).toEqual([{ id: 'pg_a', nome: 'a', esito: 'morente' }]);
    expect(r.invitati).toEqual(['pg_b']);
    expect(r.intestazione).toMatch(/round 1\. Ordine: x, a, b\. Tocca ora a: b \(pg_b\)/);
    const v = g.vista((id) => stato.puntiFerita(id))!;
    expect(v.combattenti.find((c) => c.id === 'pg_a')).toMatchObject({ stato: 'a_terra', condizioni: [{ id: 'privo_di_sensi' }], tiri_morte: { successi: 0, fallimenti: 2 } });
    expect(v.turno_di).toEqual(['pg_b']);
  });

  /*
   * A3 of docs/da-fare.md: with automatic rolls the panel starts the fight at the click (`inizia`), and the next
   * window's `dopoAzioni` consumed the step at the head as if a PC had just played it: an NPC first in the order lost
   * its first step. The click's order was never said at the table either (`ordine` came only from `dopoAzioni`).
   */
  it('a fight opened at the click: an NPC first in the order strikes in the next window, and the order is said then', () => {
    // Initiative: a 5, x 18 → x, a. x hits a for 3.
    const { g, attacchi } = scontro(combattimentoSrd(), { pg_a: 10, png_x: 10 }, [5, 18], () => 3);
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }];
    expect(g.inizia(cand, [], null)).toBe('Inizia il combattimento. Iniziativa: x 18, a 5.');
    expect(g.turnoDi()).toBeNull();
    const r = g.dopoAzioni({ turno: 2, attacchi: [], autori: [], candidati: () => cand });
    expect(attacchi).toEqual([{ png: 'png_x', pg: 'pg_a', fase: 'turno' }]);
    expect(r.ordine).toEqual(['x', 'a']);
    expect(r.invitati).toEqual(['pg_a']);
    // a plays its step; then x again, in round 2. The order is said once.
    const r2 = g.dopoAzioni({ turno: 3, attacchi: [], autori: ['pg_a'], candidati: () => cand });
    expect(attacchi).toHaveLength(2);
    expect(r2.ordine).toBeUndefined();
    // A PC first after the click: its step is the one the window plays, as before.
    const pgPrimo = scontro(combattimentoSrd(), { pg_a: 10, png_x: 10 }, [18, 5], () => 3);
    pgPrimo.g.inizia(cand, [], null);
    expect(pgPrimo.g.turnoDi()).toEqual(['pg_a']);
    pgPrimo.g.dopoAzioni({ turno: 2, attacchi: [], autori: ['pg_a'], candidati: () => cand });
    expect(pgPrimo.attacchi).toEqual([{ png: 'png_x', pg: 'pg_a', fase: 'turno' }]);
    expect(pgPrimo.g.turnoDi()).toEqual(['pg_a']);
  });

  it('round 2: il PNG passa al PG in piedi; un 20 naturale rimette in piedi con 1 PF', () => {
    const { g, stato, attacchi } = scontro(combattimentoSrd(), { pg_a: 10, pg_b: 10, png_x: 10 }, [10, 5, 18, 1, 20], (png) => (attacchi.length ? 1 : 20));
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 2 }, { id: 'pg_b', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 1 }];
    g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    const r = g.dopoAzioni({ turno: 2, attacchi: [], autori: ['pg_b'], candidati: () => cand });
    expect(attacchi.at(-1)).toEqual({ png: 'png_x', pg: 'pg_b', fase: 'turno' });
    expect(r.fatti.join(' ')).toMatch(/tiro salvezza contro la morte 20 contro CD 10 → venti naturale: torna in sé con 1 punto ferita/);
    expect(r.morte).toEqual([{ id: 'pg_a', nome: 'a', esito: 'rialzato' }]);
    expect(stato.puntiFerita('pg_a')).toEqual({ attuali: 1, massimi: 10 });
    expect(r.invitati).toEqual(['pg_a']);
    expect(g.vista(() => null)!.combattenti.find((c) => c.id === 'pg_a')!.condizioni).toEqual([]);
  });

  it('una condizione che fa perdere il turno scade a fine round; vantaggio negli attacchi dalle condizioni', async () => {
    const { g } = scontro(combattimentoSrd(), { pg_a: 10, png_x: 10 }, [15, 3], () => 1);
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }];
    g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(g.aggiungiCondizione('png_x', 'stordito', 1)).toBe(true);
    const r = g.dopoAzioni({ turno: 2, attacchi: [], autori: ['pg_a'], candidati: () => cand });
    // Turno di x (stordito), poi il round finisce e la condizione scade.
    expect(r.fatti).toEqual(['Turno di x: è stordito, non agisce.', 'x: Stordito finisce.']);
    const r2 = g.dopoAzioni({ turno: 3, attacchi: [], autori: ['pg_a'], candidati: () => cand });
    expect(r2.fatti).toEqual(['Turno di x: png_x colpisce pg_a: 1 danno (raccontalo in una frase sua). Dettagli: colpisce pg_a per 1.']);

    // Col Motore vero: Corrado attacca Ruggero prono → vantaggio, motivo dalla condizione.
    const c = caricaCampagna(path.join(FIX, 'prove'));
    const schede = caricaSchede(c);
    const arbitro: ArbitroProve = { classifica: async (i: IngressoArbitroProve) => Object.fromEntries(i.azioni.map((a) => [a.id, { id: a.id, tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga', caratteristica: null, abilita: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null } as DecisioneProva])) };
    const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
    const m = new MotoreProve({ schede, arbitro, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_corrado'], nome }), dadi: new DadiACopione([12, 3, 15, 4, 4, 10, 2]) });
    expect(m.iniziaCombattimento()).toMatch(/Inizia il combattimento/);
    expect(m.condizione('png_ruggero', 'prono', true)).toBe(true);
    const turno = m.turnoCombattimento();
    expect(turno).toEqual(['pg_corrado']);
    const esito = await m.risolvi(1, [{ id: 'a1', autore: 'pg_corrado', testo: 'Colpisco Ruggero con la spada', privata: false, revisione: 1 }]);
    expect(esito.tiri[0]).toMatchObject({ tipo: 'attacco', vantaggio: 'vantaggio', motivo_vantaggio: 'il bersaglio è prono' });
  });
});

// A17 of docs/da-fare.md: Basic Fantasy p. 51, «Any characters/monsters with equal numbers act simultaneously».
describe('simultaneous initiative ties (iniziativa.pari: simultanei)', () => {
  const simultanei = (): Combattimento => ({ ...combattimentoSrd(), iniziativa: { ...combattimentoSrd().iniziativa, pari: 'simultanei' } });
  const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 2 }, { id: 'png_x', lato: 'png' as const, mod: 0 }];

  it('a tied NPC the PC drops still strikes at that same moment; with the fixed order it does not', () => {
    // Initiative: a 10+2, x 12+0: both 12. a acts first (the PCs' step of the tie), drops x.
    const { g, stato, attacchi } = scontro(simultanei(), { pg_a: 10, png_x: 5 }, [10, 12], () => 3);
    g.inizia(cand, [], null);
    expect(g.turnoDi()).toEqual(['pg_a']);
    stato.danneggia('png_x', 5);
    const r = g.dopoAzioni({ turno: 2, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(attacchi).toEqual([{ png: 'png_x', pg: 'pg_a', fase: 'turno' }]);
    expect(r.fatti.join(' ')).toMatch(/Turno di x, nello stesso istante in cui cade \(iniziativa pari\): png_x colpisce pg_a: 3 danni/);
    expect(stato.puntiFerita('pg_a')).toEqual({ attuali: 7, massimi: 10 });
    expect(r.finito).toBeTruthy();
    // The fixed order (the set says nothing): the higher modifier goes first, and a fallen NPC does not strike.
    const fisso = scontro(combattimentoSrd(), { pg_a: 10, png_x: 5 }, [10, 12], () => 3);
    fisso.g.inizia(cand, [], null);
    expect(fisso.g.turnoDi()).toEqual(['pg_a']);
    fisso.stato.danneggia('png_x', 5);
    fisso.g.dopoAzioni({ turno: 2, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(fisso.attacchi).toEqual([]);
  });

  it('the modifier does not break a tie; tied PCs share one window; an NPC dropped by an earlier number does not strike', () => {
    const tre = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'pg_b', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 3 }];
    // a 9, b 9, x 6+3 = 9: one PC step (a and b), then x's step at the same number.
    const { g } = scontro(simultanei(), { pg_a: 10, pg_b: 10, png_x: 5 }, [9, 9, 6], () => 1);
    expect(g.inizia(tre, [], null)).toBe('Inizia il combattimento. Iniziativa: a 9, b 9, x 9.');
    expect(g.turnoDi()).toEqual(['pg_a', 'pg_b']);
    // Not tied: a 15 drops x (8+0); x's own step comes later: no strike.
    const due = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }];
    const n = scontro(simultanei(), { pg_a: 10, png_x: 5 }, [15, 8], () => 1);
    n.g.inizia(due, [], null);
    n.stato.danneggia('png_x', 5);
    n.g.dopoAzioni({ turno: 2, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => due });
    expect(n.attacchi).toEqual([]);
  });

  it('the set: pari is ordine or simultanei', () => {
    const errori: string[] = [];
    expect(leggiCombattimento({ iniziativa: { pari: 'simultanei' } }, combattimentoSrd(), new Set(['destrezza']), errori).iniziativa.pari).toBe('simultanei');
    expect(leggiCombattimento({ iniziativa: { pari: 'ordine' } }, combattimentoSrd(), new Set(['destrezza']), errori).iniziativa.pari).toBeUndefined();
    expect(errori).toEqual([]);
    leggiCombattimento({ iniziativa: { pari: 'a caso' } }, combattimentoSrd(), new Set(['destrezza']), errori);
    expect(errori.join(' ')).toMatch(/iniziativa\.pari: ordine o simultanei/);
  });
});

describe('combattimento alla B/X e alla PbtA', () => {
  const bx = caricaRegole(path.join(FIX, 'bx')).sistema.combattimento;

  it('il set B/X: iniziativa per schieramento ogni round, quattro fasi, morale', () => {
    expect(bx.iniziativa).toEqual({ tipo: 'per_schieramento', dado: 6, caratteristica: null, ogniRound: true });
    expect(bx.fasi.map((f) => `${f.id}:${f.png}`)).toEqual(['movimento:null', 'proiettili:attacco_distanza', 'magia:null', 'mischia:attacco_mischia']);
    expect(bx.fine.morale).toBe(true);
    expect(bx.danni.pgAZero).toBe('morte');
  });

  it('per schieramento: i PNG agiscono nella fase giusta; il PG è invitato fase per fase', () => {
    // Schieramenti: PG 2, PNG 5 → prima i PNG. Solo png_y ha un'arma a distanza (proiettili).
    const { g, attacchi } = scontro(bx, { pg_a: 8, png_x: 6, png_y: 6 }, [2, 5], (png, fase) => (fase === 'proiettili' && png !== 'png_y' ? null : 1));
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }, { id: 'png_y', lato: 'png' as const, mod: 0 }];
    const r = g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r.fatti[0]).toBe('Inizia il combattimento. Iniziativa per schieramento: PG 2, PNG 5; agiscono prima i PNG.');
    // The projector's bar: the side acting first comes first.
    expect(g.vista(() => null)!.combattenti.map((c) => c.id)).toEqual(['png_x', 'png_y', 'pg_a']);
    expect(attacchi).toEqual([]); // movimento: i PNG non attaccano da soli
    expect(r.intestazione).toMatch(/fase «Movimento»/);
    expect(r.invitati).toEqual(['pg_a']);
    const r2 = g.dopoAzioni({ turno: 2, attacchi: [], autori: ['pg_a'], candidati: () => cand });
    expect(attacchi).toEqual([{ png: 'png_y', pg: 'pg_a', fase: 'proiettili' }]);
    expect(r2.intestazione).toMatch(/fase «Proiettili»/);
  });

  it('surprise (the set declares it): an attack opens the fight, only the side attacked rolls; surprised, it loses round 1', () => {
    const conSorpresa: Combattimento = { ...bx, sorpresa: { dado: 6, finoA: 2, condizione: 'paralizzato' } };
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }];
    // Sides: PG 5, PNG 2 → PCs first; surprise for the NPCs only (the PC struck first): 1 ≤ 2 → surprised.
    const { g, attacchi } = scontro(conSorpresa, { pg_a: 8, png_x: 6 }, [5, 2, 1], () => 1);
    const r = g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r.fatti[0]).toBe('Inizia il combattimento. Iniziativa per schieramento: PG 5, PNG 2; agiscono prima i PG. Sorpresa: i nemici tirano 1 su 1d6 e sono colti di sorpresa (paralizzato): perdono il primo round.');
    expect(g.condizioniDi('png_x').map((c) => c.nome)).toEqual(['Paralizzato']);
    // Round 1: the surprised NPC never acts in its phases; from round 2 the condition is gone.
    for (let t = 2; t <= 4; t++) g.dopoAzioni({ turno: t, attacchi: [], autori: ['pg_a'], candidati: () => cand });
    expect(attacchi).toEqual([]);
    const tardi = scontro(conSorpresa, { pg_a: 8, png_x: 6 }, [5, 2, 4], () => 1);
    const r2 = tardi.g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r2.fatti[0]).toMatch(/Sorpresa: i nemici tirano 4 su 1d6: non sono colti di sorpresa\.$/);
    expect(tardi.g.condizioniDi('png_x')).toEqual([]);
  });

  it('surprise from the panel: both sides roll; surprised PCs skip round 1, the NPCs act, round 2 opens for the PCs', () => {
    const conSorpresa: Combattimento = { ...bx, sorpresa: { dado: 6, finoA: 2, condizione: 'paralizzato' } };
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }];
    // Sides 5 (PCs) and 2; surprise: PCs 1 (surprised), NPCs 6 (not); then the next round's sides 3 and 4.
    const { g, attacchi } = scontro(conSorpresa, { pg_a: 8, png_x: 6 }, [5, 2, 1, 6, 3, 4], () => 1);
    const fatto = g.inizia(cand, [], null);
    expect(fatto).toMatch(/i personaggi tirano 1 su 1d6 e sono colti di sorpresa/);
    expect(fatto).toMatch(/i nemici tirano 6 su 1d6: non sono colti di sorpresa/);
    expect(g.turnoDi()).toEqual([]);
    // The table closes the window: the PC's steps of round 1 are skipped, the NPC strikes in its phase.
    const r = g.dopoAzioni({ turno: 2, attacchi: [], autori: [], candidati: () => cand });
    expect(attacchi.length).toBeGreaterThan(0);
    expect(r.fatti.join(' ')).toMatch(/Paralizzato/);
    expect(g.condizioniDi('pg_a')).toEqual([]);
    expect(g.turnoDi()).toEqual(['pg_a']);
  });

  it('a set with one death save: the PC at 0 dies at the first failure, and the fact says one of one, not «third»', () => {
    const unSolo: Combattimento = { ...combattimentoSrd(), danni: { ...combattimentoSrd().danni, tiriMorte: { cd: 10, successi: 1, fallimenti: 1, ventiRialza: false, unoDoppio: false } } };
    // As the first SRD test: x 19, a 12, b 5; x hits a for 20 (to 0); at a's step its one death save is a 1: dead.
    const { g } = scontro(unSolo, { pg_a: 10, pg_b: 10, png_x: 10 }, [10, 5, 18, 1], () => 20);
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 2 }, { id: 'pg_b', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 1 }];
    const r = g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r.fatti.join(' ')).toMatch(/a è a terra: tiro salvezza contro la morte 1 contro CD 10 → fallimenti 1 su 1: è MORTO/);
  });

  it('every PC down: nobody can help, the dying PC\'s death saves are rolled to the end before the fight closes', () => {
    // a 12, x 6; x hits a for 20 (a is the only PC: down); saves 12, 3, 15 → three successes: stable.
    const { g, stato } = scontro(combattimentoSrd(), { pg_a: 10, png_x: 10 }, [10, 5, 12, 3, 15, 11], () => 20);
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 2 }, { id: 'png_x', lato: 'png' as const, mod: 1 }];
    g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    const r = g.dopoAzioni({ turno: 2, attacchi: [], autori: ['pg_a'], candidati: () => cand });
    const tutto = r.fatti.join(' ');
    expect(tutto).toMatch(/Nessuno è in piedi per soccorrerli/);
    expect(tutto).toMatch(/successi 3 su 3: è stabile/);
    expect(r.finito).toMatch(/PG/);
    // A structured flag for the defeat path (scena/regia.ts), not the localised reason.
    expect(r.sconfitta).toBe(true);
    expect(stato.aTerra('pg_a')).toBe(true);
  });

  it('surprise in the set\'s data: read, and its errors for the validator', () => {
    const errori: string[] = [];
    const letto = leggiCombattimento({ sorpresa: { dado: 6, fino_a: 2, condizione: 'paralizzato' } }, bx, new Set(), errori);
    expect(letto.sorpresa).toEqual({ dado: 6, finoA: 2, condizione: 'paralizzato' });
    expect(errori).toEqual([]);
    leggiCombattimento({ sorpresa: { dado: 6, fino_a: 2, condizione: 'nessuna' } }, bx, new Set(), errori);
    leggiCombattimento({ sorpresa: { dado: 7, fino_a: 2, condizione: 'paralizzato' } }, bx, new Set(), errori);
    expect(errori).toEqual([expect.stringMatching(/sorpresa\.condizione/), expect.stringMatching(/sorpresa\.dado/)]);
    expect(combattimentoSrd().sorpresa).toBeNull();
  });

  it('morale: al primo nemico caduto 2d6 contro 7; sopra, fuggono e lo scontro finisce', () => {
    const { g, stato } = scontro(bx, { pg_a: 8, png_x: 6, png_y: 6 }, [2, 5, 6, 6], () => null);
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }, { id: 'png_y', lato: 'png' as const, mod: 0 }];
    g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    stato.danneggia('png_x', 6);
    const r = g.dopoAzioni({ turno: 2, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r.fatti).toContain('Morale dei nemici: 12 contro 7 → CEDONO e fuggono (y).');
    expect(r.fatti.at(-1)).toBe('Il combattimento è finito: i nemici sono fuggiti o fuori combattimento.');
    expect(g.attivo).toBe(false);
    expect(r.invitati).toBeNull();
  });

  it('PbtA: nessuna iniziativa, niente turni né inviti; lo scontro finisce coi nemici fuori gioco', () => {
    const pbta = caricaRegole(path.join(FIX, 'pbta')).sistema.combattimento;
    expect(pbta.iniziativa.tipo).toBe('nessuna');
    const { g, stato } = scontro(pbta, { pg_a: 6, png_x: 4 }, [3], () => 1);
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }];
    const r = g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r.invitati).toBeNull();
    expect(r.intestazione).toMatch(/senza iniziativa/);
    expect(g.vista(() => null)!.iniziativa).toBe('nessuna');
    stato.danneggia('png_x', 4);
    const r2 = g.dopoAzioni({ turno: 2, attacchi: [], autori: ['pg_a'], candidati: () => cand });
    expect(r2.fatti.at(-1)).toBe('Il combattimento è finito: i nemici sono a terra.');
  });
});

describe('la sezione combattimento: di regole.yaml', () => {
  it('errori per il validatore: tipo, effetti sconosciuti, condizione a zero inesistente', () => {
    const errori: string[] = [];
    leggiCombattimento({ iniziativa: { tipo: 'a_caso' }, condizioni: [{ id: 'gelato', effetti: ['vola'] }], condizione_a_zero: 'svenuto', fasi: [] }, combattimentoSrd(), new Set(['forza']), errori);
    expect(errori.join(' | ')).toMatch(/iniziativa\.tipo/);
    expect(errori.join(' | ')).toMatch(/effetto sconosciuto «vola»/);
    expect(errori.join(' | ')).toMatch(/condizione_a_zero/);
    expect(errori.join(' | ')).toMatch(/fasi: almeno una/);
  });
  it('senza la sezione: SRD completo per l’SRD (15 condizioni + Schivata), nessuna iniziativa per il 2d6', () => {
    const srd = caricaRegole(path.join(FIX, 'prove')).sistema.combattimento;
    expect(srd.condizioni).toHaveLength(16);
    expect(srd.danni.tiriMorte).toEqual({ cd: 10, successi: 3, fallimenti: 3, ventiRialza: true, unoDoppio: true });
  });
});

describe('reazioni e turni', () => {
  it('nello scontro a turni la reazione dell’arbitro non si tira: il PNG agisce solo nel suo turno', async () => {
    const c = caricaCampagna(path.join(FIX, 'prove'));
    const schede = caricaSchede(c);
    const dec = (id: string): DecisioneProva => ({ id, tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga', caratteristica: null, abilita: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: { png: 'png_ruggero', condizione: 'sempre' } });
    const arbitro: ArbitroProve = { classifica: async (i: IngressoArbitroProve) => Object.fromEntries(i.azioni.map((a) => [a.id, dec(a.id)])) };
    const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
    // Iniziativa: Corrado 15+2, Ruggero 3+1. Poi Corrado colpisce (10, danno 2).
    const m = new MotoreProve({ schede, arbitro, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_corrado'], nome }), dadi: new DadiACopione([15, 3, 10, 2, 9, 3]) });
    m.iniziaCombattimento();
    const r = await m.risolvi(1, [{ id: 'a1', autore: 'pg_corrado', testo: 'Colpisco Ruggero', privata: false, revisione: 1 }]);
    // Un solo attacco di Ruggero: quello del suo turno, non la reazione.
    expect(r.tiri.filter((t) => t.chi === 'png_ruggero')).toHaveLength(1);
    expect(r.fatti.join(' ')).not.toMatch(/reagisce/);
    expect(r.fatti.join(' ')).toMatch(/Turno di Ruggero lo sgherro/);
  });
});
