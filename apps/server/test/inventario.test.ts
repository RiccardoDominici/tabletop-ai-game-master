/**
 * The inventory and the coins in the Engine (docs/regole.md §2 «Catalogo», docs/prove.md §10; mechanism M2; rows C-EQ-01,
 * C-CRE-06, C-WPN-06, P5-27, P5-30, C-CLS-12, C-CLS-16): buying with change, a purchase refused, items and coins found,
 * an armor swap that changes the AC every reader sees, ammunition spent by each shot, range bands by the distance said,
 * the crossbow's rate of fire, the restrictions in play, and the snapshot. On the invented bottega fixture.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { DadiACopione, type FonteDadi } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import type { ArbitroProve, DecisioneRegole, IngressoArbitroProve } from '../src/prove/tipi';
import { caricaRegole } from '../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import { orologioDiSistema } from '../src/turni/orologio';

const BOTTEGA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'bottega');

/** Dice by faces: each kind of die cycles its own values; others roll 1. */
class DadiPerFacce implements FonteDadi {
  readonly seme = 'facce';
  contatore = 0;
  private readonly i = new Map<number, number>();
  constructor(private readonly valori: Record<number, number[]>) {}
  tira(facce: number): number {
    this.contatore++;
    const l = this.valori[facce];
    if (!l?.length) return 1;
    const k = this.i.get(facce) ?? 0;
    this.i.set(facce, k + 1);
    return l[k % l.length]!;
  }
}

/** An arbiter that makes every action an attack on the stone guard with the named weapon line. */
const attaccaCon = (arma: string): ArbitroProve<DecisioneRegole> => ({
  classifica: async (i: IngressoArbitroProve) =>
    Object.fromEntries(i.azioni.map((a) => [a.id, { id: a.id, tipo: 'attacco', caratteristica: null, abilita: null, mossa: null, potere: null, bersaglio: 'png_guardia', arma, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null } as DecisioneRegole])),
});

function motore(dadi: number[] | Record<number, number[]>, arbitro: ArbitroProve<DecisioneRegole> | null = null, alTavolo = ['pg_aldo', 'pg_bice', 'pg_ciro']): MotoreProve {
  const c = caricaCampagna(BOTTEGA);
  const regole = caricaRegole(BOTTEGA);
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: alTavolo, nome }), dadi: Array.isArray(dadi) ? new DadiACopione(dadi) : new DadiPerFacce(dadi) });
}

let n = 0;
const azione = (autore: string, testo: string) => ({ id: `a${++n}`, autore, testo, privata: false, revisione: 1 });
const monete = (m: MotoreProve, id: string) => Object.fromEntries(m.inventario!.monete(id).map((x) => [x.id, x.quante]));
const quante = (m: MotoreProve, id: string, oggetto: string) => m.inventario!.oggetti(id).find((x) => x.id === oggetto)?.quante ?? 0;

describe('money: buying with change, a purchase refused, coins found and paid', () => {
  it('a lantern for 6 gold paid in gold; a rope with only gold and copper left takes a gold coin and gives change', () => {
    const m = motore([10]);
    expect(monete(m, 'pg_aldo')).toEqual({ mo: 20, ma: 5 });
    const r = m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'compra', oggetto: 'lanterna' })!;
    expect(r).toMatchObject({ ok: true, fatto: 'Aldo compra Lanterna per 6 mo.' });
    expect(monete(m, 'pg_aldo')).toEqual({ mo: 14, ma: 5 });
    expect(quante(m, 'pg_aldo', 'lanterna')).toBe(1);
    // Bice: 8 gold, 3 silver, 10 copper. A flask of oil (1 silver) with a silver coin; then a backpack the merchant sells
    // for 2 gold 5 silver: with 2 silver left, she hands over 3 gold and gets 5 silver back (fewest coins).
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'compra', oggetto: 'olio' })!.fatto).toBe('Bice compra Fiasca d\'olio per 1 ma.');
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'compra', oggetto: 'zaino', prezzo: '2 mo 5 ma' })!.fatto).toBe('Bice compra Zaino per 2 mo 5 ma (resto: 5 ma).');
    expect(monete(m, 'pg_bice')).toEqual({ mo: 5, ma: 7, mr: 10 });
  });

  it('a purchase it cannot pay is refused and changes nothing', () => {
    const m = motore([10]);
    const r = m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'compra', oggetto: 'corazza' })!;
    expect(r.ok).toBe(false);
    expect(r.fatto).toBe('Bice non ha abbastanza monete per Corazza: costa 200 mo, ne ha 8 mo 4 ma.');
    expect(monete(m, 'pg_bice')).toEqual({ mo: 8, ma: 3, mr: 10 });
  });

  it('packs: three torches out of a pack of five cost three fifths of its price, rounded up', () => {
    const m = motore([10]);
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_ciro', cosa: 'compra', oggetto: 'torcia', quante: 3 })!.fatto).toBe('Ciro compra 3 × Torcia per 6 ma.');
    expect(monete(m, 'pg_ciro')).toEqual({ ma: 6 });
  });

  it('coins found and paid (by worth, with change), a sale at the catalog price; the typed effects do the same', () => {
    const m = motore([10]);
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_ciro', cosa: 'monete', monete: { mo: 3 } })!.fatto).toBe('Ciro riceve 3 mo.');
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_ciro', cosa: 'monete', monete: { mo: -1 } })!.ok).toBe(true);
    expect(m.inventario!.valore('pg_ciro')).toBe(12 * 10 + 300 - 100);
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_ciro', cosa: 'vendi', oggetto: 'fionda' })!.fatto).toBe('Ciro vende Fionda per 1 mo.');
    expect(m.vistaInventario('pg_ciro')!.attacchi).not.toContain('Fionda');
  });
});

describe('armor swap: the AC every reader sees', () => {
  it('a thief puts on chain mail: AC 16 for attacks and traps; its thief abilities are refused in it', async () => {
    const m = motore({ 20: [3, 15], 100: [10] });
    expect(m.vistaInventario('pg_ciro')!.difesa).toBe(14);
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_ciro', cosa: 'oggetto', oggetto: 'maglia' })!.fatto).toBe('Ciro prende Cotta di maglia.');
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_ciro', cosa: 'indossa', oggetto: 'maglia' })!.fatto).toMatch(/^Ciro indossa Cotta di maglia: Classe d'Armatura 16\. Ciro ora ha un carico leggero .*: si muove di 6 metri a round\.$/);
    // Only one armor: the padded jerkin came off.
    expect(m.inventario!.oggetti('pg_ciro').filter((x) => x.indossato).map((x) => x.id)).toEqual(['maglia']);
    // A trap's attack reads the same AC: the save fails (d20 3), the needle's d20 15 + 0 against 16 misses; against the
    // padded jerkin's 14 it would hit.
    const t = await m.risolvi(1, [azione('pg_ciro', 'Apro la cassa del mercante')]);
    const ago = t.tiri.find((x) => x.tipo === 'attacco')!;
    expect(ago).toMatchObject({ contro: { valore: 16 }, riuscita: false });
    const r = await m.risolvi(2, [azione('pg_ciro', 'Scassino il lucchetto con il grimaldello')]);
    expect(r.fatti.join(' ')).toMatch(/Ciro non può usare Scassinare con cotta di maglia addosso: nessun tiro/);
  });

  it('a magic-user in armor cannot cast: refused, nothing spent', async () => {
    const m = motore({ 20: [15], 6: [4] });
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'indossa', oggetto: 'giubba' });
    const r = await m.risolvi(1, [azione('pg_bice', 'Lancio scintilla sulla guardia')]);
    expect(r.fatti.join(' ')).toMatch(/Bice non può lanciare Scintilla con giubba imbottita addosso: non spende nulla/);
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'togli', oggetto: 'giubba' });
    const r2 = await m.risolvi(2, [azione('pg_bice', 'Lancio scintilla sulla guardia')]);
    expect(r2.fatti.join(' ')).toMatch(/Bice usa Scintilla/);
  });

  it('a forbidden armor cannot be put on; a weapon that is not a magic-user’s takes −4', async () => {
    const m = motore({ 20: [15], 8: [5] }, attaccaCon('spada'));
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'spada' });
    const r = await m.risolvi(1, [azione('pg_bice', 'Colpisco la guardia con la spada')]);
    // d20 15 + mischia 1 + Forza −1 − 4 = 11 against AC 15.
    expect(r.tiri[0]).toMatchObject({ etichetta: expect.stringContaining('Spada'), totale: 11, riuscita: false });
    expect(r.tiri[0]!.regola).toMatch(/penalità −4/);
  });
});

describe('a weapon that costs the day’s spells', () => {
  it('attacking with it empties the prepared spells and slots, and the card says so', async () => {
    const m = motore({ 20: [15], 6: [2] }, attaccaCon('mazza'));
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'mazza' });
    const r = await m.risolvi(1, [azione('pg_bice', 'Colpisco la guardia con la mazza')]);
    expect(r.tiri[0]!.regola).toMatch(/Bice ha usato un'arma proibita alla sua fede \(Mazza\): perde gli incantesimi di oggi/);
    expect(m.vistaInventario('pg_bice')!.contatori.find((c) => c.id === 'slot_1')!.restanti).toBe(0);
  });
});

describe('ammunition, range bands, rate of fire', () => {
  it('each shot spends an arrow of the first kind left; at none the shot is refused', async () => {
    const m = motore({ 20: [12], 6: [3] }, attaccaCon('arco'));
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'oggetto', oggetto: 'freccia', quante: -11 });
    expect(quante(m, 'pg_aldo', 'freccia')).toBe(1);
    await m.risolvi(1, [azione('pg_aldo', "Tiro con l'arco alla guardia")]);
    expect(quante(m, 'pg_aldo', 'freccia')).toBe(0);
    m.terminaCombattimento();
    const r = await m.risolvi(2, [azione('pg_aldo', "Tiro con l'arco alla guardia")]);
    expect(r.fatti[0]).toMatch(/Aldo non ha più frecce per Arco: nessun attacco/);
  });

  it('the band by the distance said, by its words, or the default; beyond the long limit no shot', async () => {
    const m = motore({ 20: [12], 6: [3] }, attaccaCon('arco'));
    const carta = async (t: string) => {
      const r = await m.risolvi(++n, [azione('pg_aldo', t)]);
      m.terminaCombattimento();
      return r;
    };
    // d20 12 + distanza 1 + Destrezza 1 = 14, then the band.
    expect((await carta("Tiro con l'arco alla guardia a 25 metri")).tiri[0]).toMatchObject({ totale: 11 });
    expect((await carta("Tiro con l'arco alla guardia da vicino")).tiri[0]).toMatchObject({ totale: 16 });
    const media = await carta("Tiro con l'arco alla guardia a venti metri");
    expect(media.tiri[0]).toMatchObject({ totale: 14 });
    expect(media.tiri[0]!.regola).toMatch(/Gittata media 20 metri/);
    expect((await carta("Tiro con l'arco alla guardia")).tiri[0]!.regola).toMatch(/Gittata media: la distanza non è detta/);
    const fuori = await carta("Tiro con l'arco alla guardia a 40 metri");
    expect(fuori.tiri).toEqual([]);
    expect(fuori.fatti[0]).toMatch(/Aldo non può tirare con Arco a 40 metri: arriva a 30 metri/);
  });

  it('a crossbow shoots once every two rounds of a fight', async () => {
    // Aldo alone at the table: each of his turns closes a round of the fight.
    const m = motore({ 20: [3], 6: [3], 8: [2] }, attaccaCon('balestra'), ['pg_aldo']);
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'oggetto', oggetto: 'balestra' });
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'oggetto', oggetto: 'dardo', quante: 5 });
    const r1 = await m.risolvi(1, [azione('pg_aldo', 'Tiro con la balestra alla guardia')]);
    expect(r1.tiri.some((t) => t.chi === 'pg_aldo' && t.etichetta.startsWith('Balestra'))).toBe(true);
    // The opening shot comes before round 1; in round 1 it is still reloading; in round 2 it shoots again.
    const r2 = await m.risolvi(2, [azione('pg_aldo', 'Tiro con la balestra alla guardia')]);
    expect(r2.fatti.join(' ')).toMatch(/Aldo sta ancora ricaricando Balestra \(tira una volta ogni 2 round\)/);
    expect(m.combattimento.round).toBe(2);
    const r3 = await m.risolvi(3, [azione('pg_aldo', 'Tiro con la balestra alla guardia')]);
    expect(r3.tiri.some((t) => t.chi === 'pg_aldo' && t.etichetta.startsWith('Balestra'))).toBe(true);
    expect(quante(m, 'pg_aldo', 'dardo')).toBe(3);
  });
});

describe('the snapshot and the dry run', () => {
  it('an item gained in play, the worn armor and the coins survive a resume; the AC is derived again', () => {
    const m = motore([10]);
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'corda' });
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'togli', oggetto: 'maglia' });
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'monete', monete: { mp: 1 } });
    const foto = JSON.parse(JSON.stringify(m.esporta()));
    const r = motore([10]);
    r.importa(foto);
    expect(quante(r, 'pg_bice', 'corda')).toBe(1);
    expect(r.vistaInventario('pg_aldo')!.difesa).toBe(12);
    expect(monete(r, 'pg_aldo')).toEqual({ mp: 1, mo: 20, ma: 5 });
    // «Ricomincia»: back to the sheets.
    r.azzera();
    expect(quante(r, 'pg_bice', 'corda')).toBe(0);
    expect(r.vistaInventario('pg_aldo')!.difesa).toBe(16);
  });

  it('the requests of manual rolls run on a copy: no arrow is spent by asking', async () => {
    const m = motore({ 20: [12], 6: [3] }, attaccaCon('arco'));
    const d = await m.decidi(1, [azione('pg_aldo', "Tiro con l'arco alla guardia")]);
    m.richiesteGiocatori(d);
    m.richiesteGiocatori(d);
    expect(quante(m, 'pg_aldo', 'freccia')).toBe(12);
    m.completa(d);
    expect(quante(m, 'pg_aldo', 'freccia')).toBe(11);
  });
});

describe('load and movement (the set’s carico and movimento)', () => {
  it('the weight of the gear and the coins; the band by Strength; the movement by the worn armor', () => {
    const m = motore([10]);
    // Chain mail 30, shield 4, sword 3, bow 2, 12 arrows 1.2, 3 torches of a pack of five 0.6, backpack 2, 25 coins 0.5.
    expect(m.vistaInventario('pg_aldo')!.carico).toEqual({ peso: 43.3, unita: 'libbre', fascia: 'Carico leggero', limite: 50, movimento: 6, unita_movimento: 'metri' });
    // The small folk's own rows, and their armor weighs half.
    expect(m.vistaInventario('pg_ciro')!.carico).toMatchObject({ peso: 7.24, fascia: 'Carico leggero', limite: 30, movimento: 9 });
  });

  it('a heavy load slows: the fact of the purchase says the new band and movement; overloaded, no movement', () => {
    const m = motore([10]);
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'compra', oggetto: 'corda', quante: 2 })!.fatto).toBe('Aldo compra 2 × Corda per 2 mo. Aldo ora ha un carico pesante (53.26 libbre): si muove di 3 metri a round.');
    // Taking the chain mail off: lighter and no armor, so faster.
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'togli', oggetto: 'maglia' })!.fatto).toBe("Aldo si toglie Cotta di maglia: Classe d'Armatura 12. Aldo ora ha un carico pesante (53.26 libbre): si muove di 9 metri a round.");
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'corda', quante: 11 });
    expect(m.vistaInventario('pg_bice')!.carico).toMatchObject({ fascia: 'Sovraccarico', limite: null, movimento: 0 });
  });
});
