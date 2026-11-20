/**
 * The game clock and the light sources (docs/prove.md §11; docs/regole.md §2 «Tempo»; audit P4-01, P4-17, C-EQ-06): a
 * closed window outside a fight costs the set's `per_finestra`, longer for the actions that take longer and one round
 * while someone is dying; a fight's round is a round; a rest takes its hours; a torch is spent when lit and goes out on
 * the clock (an owed fact); a lantern burns oil; a duration in turns becomes rounds; the clock rides the snapshot. On
 * the invented bottega fixture.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import type { FonteDadi } from '../src/prove/dadi';
import { fattiDovuti } from '../src/prove/fatti-dovuti';
import { MotoreProve } from '../src/prove/motore';
import { caricaRegole } from '../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import { orologioDiSistema } from '../src/turni/orologio';

const BOTTEGA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'bottega');

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

function motore(dadi: Record<number, number[]> = { 20: [10], 4: [2] }): MotoreProve {
  const c = caricaCampagna(BOTTEGA);
  const regole = caricaRegole(BOTTEGA);
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro: null, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_aldo', 'pg_bice', 'pg_ciro'], nome }), dadi: new DadiPerFacce(dadi) });
}

let n = 0;
const azione = (autore: string, testo: string) => ({ id: `a${++n}`, autore, testo, privata: false, revisione: 1 });

describe('the clock: what a window, a fight round, a rest and the Game Master cost', () => {
  it('exploring, each closed window is a turn; searching takes three; the Game Master lets an hour pass', async () => {
    const m = motore();
    expect(m.tempo.testoOra()).toBe('giorno 1, 18:00');
    await m.risolvi(1, [azione('pg_aldo', 'Guardo le armi appese')]);
    expect(m.tempo.testoOra()).toBe('giorno 1, 18:10');
    await m.risolvi(2, [azione('pg_bice', 'Frugo tra gli scaffali')]);
    expect(m.tempo.testoOra()).toBe('giorno 1, 18:40');
    expect(m.tempoDelMaster({ cosa: 'avanza', durata: { ora: 1 } })!.fatto).toBe('Passano 1 ora: è giorno 1, 19:40.');
  });

  it('a rest takes its hours; a fight refuses the Game Master’s time', async () => {
    const m = motore();
    m.riposo('notte');
    expect(m.tempo.testoOra()).toBe('giorno 2, 02:00');
    m.iniziaCombattimento();
    expect(m.tempoDelMaster({ cosa: 'avanza', durata: { turno: 1 } })).toMatchObject({ ok: false });
  });

  it('a duration in turns lasts that many turns of rounds: a fight’s rounds do not end it, the windows after do', async () => {
    const m = motore();
    m.attivi.aggiungi('pg_ciro', { tipo: 'bonus', a: 'difesa', valore: 2, contro: 'tutti', durata: { tipo: 'tempo', unita: 'turno', dadi: { numero: 0, facce: 0, bonus: 2 } } }, 'Benedizione', 1, m.dadiDelMotore);
    // Two turns = 120 rounds of ten seconds; one window (a turn) leaves one turn.
    await m.risolvi(1, [azione('pg_aldo', 'Guardo le armi appese')]);
    expect(m.attivi.bonus('pg_ciro', 'difesa')).toBe(2);
    const r = await m.risolvi(2, [azione('pg_aldo', 'Guardo la botola')]);
    expect(m.attivi.bonus('pg_ciro', 'difesa')).toBe(0);
    expect(r.fatti.join(' ')).toMatch(/Finiscono: benedizione di Ciro/);
  });
});

describe('light sources on the clock', () => {
  it('«accendo una torcia» spends one torch; it burns 1d4+2 turns (hidden) and goes out by itself, an owed fact', async () => {
    const m = motore({ 20: [10], 4: [2] });
    const r = await m.risolvi(1, [azione('pg_aldo', 'Accendo una torcia e scendo la botola')]);
    expect(r.fatti.join(' ')).toMatch(/Aldo accende: torcia/);
    expect(m.inventario!.oggetti('pg_aldo').find((x) => x.id === 'torcia')!.quante).toBe(2);
    // Lit after this window's time: 4 turns from now.
    expect(m.vistaTempo()!.luci).toEqual([{ chi: 'pg_aldo', oggetto: 'torcia', nome: 'Torcia', restante: '4 turni' }]);
    for (let k = 2; k <= 4; k++) await m.risolvi(k, [azione('pg_aldo', 'Avanzo nella cantina')]);
    const fine = await m.risolvi(5, [azione('pg_aldo', 'Avanzo nella cantina')]);
    expect(fine.fatti.join(' ')).toMatch(/Si spegne la luce di Aldo \(torcia\)/);
    expect(fine.luci).toEqual([{ id: 'pg_aldo', nome: 'Aldo' }]);
    expect(fattiDovuti(fine.tiri, [], [], fine.luci)).toEqual([{ tipo: 'buio', id: 'pg_aldo', nome: 'Aldo' }]);
    expect(m.vistaTempo()!.luci).toEqual([]);
  });

  it('a lantern burns oil: without a flask it cannot be lit; put out, what was left is lost', () => {
    const m = motore();
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'lanterna' });
    expect(m.tempoDelMaster({ cosa: 'accendi', id: 'pg_bice', oggetto: 'lanterna' })).toMatchObject({ ok: false, fatto: "Bice non può accendere la lanterna: le manca fiasca d'olio." });
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'olio' });
    expect(m.tempoDelMaster({ cosa: 'accendi', id: 'pg_bice', oggetto: 'lanterna' })).toMatchObject({ ok: true });
    expect(m.inventario!.oggetti('pg_bice').map((x) => x.id)).toEqual(['pugnale', 'giubba', 'lanterna']);
    expect(m.vistaTempo()!.luci[0]).toMatchObject({ oggetto: 'lanterna', restante: '2 ore' });
    expect(m.tempoDelMaster({ cosa: 'spegni', id: 'pg_bice', oggetto: 'lanterna' })).toMatchObject({ ok: true, fatto: 'Bice spegne: lanterna.' });
  });

  it('a night’s rest with a torch left burning: it burns down meanwhile', () => {
    const m = motore();
    m.tempoDelMaster({ cosa: 'accendi', id: 'pg_aldo', oggetto: 'torcia' });
    const r = m.riposo('notte');
    expect(r.ok && r.fatto).toMatch(/Si spegne la luce di Aldo \(torcia\)/);
  });
});

describe('the clock in the snapshot and the dying', () => {
  it('the time and the lights survive a resume; «Ricomincia» starts the clock again', () => {
    const m = motore();
    m.tempoDelMaster({ cosa: 'avanza', durata: { ora: 2 } });
    m.tempoDelMaster({ cosa: 'accendi', id: 'pg_aldo', oggetto: 'torcia' });
    const r = motore();
    r.importa(JSON.parse(JSON.stringify(m.esporta())));
    expect(r.tempo.testoOra()).toBe('giorno 1, 20:00');
    expect(r.vistaTempo()!.luci).toHaveLength(1);
    r.azzera();
    expect(r.tempo.testoOra()).toBe('giorno 1, 18:00');
  });

  it('while a PC is dying a window is one round, so binding the next window still comes in time', async () => {
    const m = motore({ 20: [15], 10: [3] });
    m.morenti.inizia('pg_ciro', 3);
    await m.risolvi(1, [azione('pg_aldo', 'Corro da Ciro')]);
    expect(m.morenti.restanti('pg_ciro')).toBe(2);
    expect(m.tempo.testoOra()).toBe('giorno 1, 18:00');
  });
});

describe('travel (the set’s viaggio)', () => {
  it('the slowest member sets the pace; the terrain multiplies; the clock moves by days and hours', () => {
    const m = motore();
    // Aldo in chain mail, lightly loaded: 6 m a round, 12 miles a day; on a road ×1.5 = 18. 27 miles: a day and a half.
    const r = m.tempoDelMaster({ cosa: 'viaggio', distanza: 27, terreno: 'strada' })!;
    expect(r.fatto).toMatch(/^Il viaggio di 27 miglia \(strada\) dura 1 giorno: 18 miglia al giorno, al passo di Aldo \(6 metri a round\)\./);
    // A whole day, then half of an eight-hour travel day.
    expect(m.tempo.testoOra()).toBe('giorno 2, 22:00');
  });

  it('an overloaded member keeps the group from setting off', () => {
    const m = motore();
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'corda', quante: 11 });
    expect(m.tempoDelMaster({ cosa: 'viaggio', distanza: 5, terreno: 'bosco' })).toMatchObject({ ok: false, fatto: 'Bice porta troppo peso per muoversi: il gruppo non parte.' });
  });
});
