/**
 * The bestiary (R4; docs/regole.md §2, «Bestiario»; audit rows P5-20, P5-21, P6-00, P6-04, P6-05, P6-06, P6-07): stat
 * blocks as data, a sheet that points to one, the attack bonus by hit dice, hit points rolled per creature from the
 * session seed, and every attack of a monster's round. Invented fixture: test/fixtures/campagne/tana.
 */
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { gregariDellaCampagna } from '../src/campagna/gregari';
import { caricaRegole, leggiSistema } from '../src/regole/caricatore';
import { dadiVitaEffettivi, formulaPuntiFerita, leggiDadiVita } from '../src/regole/bestiario';
import { caricaSchedeGeneriche, leggiSchedaGenerica } from '../src/regole/schede';
import { DadiCrittografici } from '../src/prove/dadi';
import { DadiPerFacce } from './aiuti/cripta';
import { TANA, motoreTana } from './aiuti/tana';
import { azione } from './aiuti/cripta';

const set = () => caricaRegole(TANA).sistema;

describe('hit dice as the manual prints them', () => {
  it('reads dice, the plus or minus, ½ and the asterisks', () => {
    expect(leggiDadiVita('3+2*')).toEqual({ numero: 3, mezzo: false, bonus: 2, asterischi: 1 });
    expect(leggiDadiVita('1-1')).toEqual({ numero: 1, mezzo: false, bonus: -1, asterischi: 0 });
    expect(leggiDadiVita('½*')).toEqual({ numero: 0, mezzo: true, bonus: 0, asterischi: 1 });
    expect(leggiDadiVita('9**')).toMatchObject({ numero: 9, asterischi: 2 });
    expect(leggiDadiVita(4)).toMatchObject({ numero: 4, bonus: 0 });
    expect(leggiDadiVita('tre')).toBeNull();
  });
  it('the tables read the dice without the plus or minus; ½ and 1−1 are less than one (p. 54)', () => {
    const r = { unoMenoMenoDiUno: true };
    expect(dadiVitaEffettivi(leggiDadiVita('3+2')!, r)).toBe(3);
    expect(dadiVitaEffettivi(leggiDadiVita('3-1')!, r)).toBe(3);
    expect(dadiVitaEffettivi(leggiDadiVita('1-1')!, r)).toBe(0);
    expect(dadiVitaEffettivi(leggiDadiVita('1-1')!, { unoMenoMenoDiUno: false })).toBe(1);
    expect(dadiVitaEffettivi(leggiDadiVita('½')!, r)).toBe(0);
  });
  it('hit points to roll: the set\'s die per hit die plus the bonus; ½ is the set\'s own', () => {
    const b = set().bestiario!;
    expect(formulaPuntiFerita(leggiDadiVita('3+2')!, b)).toEqual({ numero: 3, facce: 8, bonus: 2 });
    expect(formulaPuntiFerita(leggiDadiVita('½')!, b)).toEqual({ numero: 1, facce: 4, bonus: 0 });
  });
});

describe('a sheet that points to a stat block', () => {
  it('the set reads its entries inline and from regole/mostri.yaml', () => {
    const s = set();
    expect(s.mostri!.map((m) => m.id)).toEqual(['artigliatore', 'predone', 'serpe_cenere', 'drago_brina', 'spettro_lanterna', 'occhio_pietra']);
    expect(s.bestiario).toMatchObject({ dadoVita: 8, abilita: ['mischia', 'distanza'], unoMenoMenoDiUno: true });
  });

  it('takes every number from the entry: AC, hit dice and asterisks, attack bonus by the table, attacks a round, morale', () => {
    const c = caricaCampagna(TANA);
    const schede = caricaSchedeGeneriche(set(), c);
    const a = schede.get('png_artigliatore')!;
    expect(a).toMatchObject({ mostro: 'artigliatore', difesa: 14, dadiVita: 2, speciali: 1, morale: 9, px: 50, salvaCome: { classe: 'guerriero', livello: 2 } });
    // 2 hit dice: +2 by the bestiary's table, on both attack abilities; the lines roll with melee.
    expect(a.abilita).toMatchObject({ mischia: 2, distanza: 2 });
    expect(a.attacchi.map((x) => [x.id, x.abilita, `${x.danno.numero}d${x.danno.facce}`])).toEqual([['artiglio', 'mischia', '1d3'], ['morso', 'mischia', '1d4']]);
    expect(a.perRound).toEqual([['artiglio', 'artiglio', 'morso']]);
    // No hit points written: 2d8 to roll, their average until then; no warning for the missing ability scores.
    expect(a.pfDaTirare).toEqual({ numero: 2, facce: 8, bonus: 0 });
    expect(a.pf_massimi).toBe(9);
    expect(a.avvisi).toEqual([]);
  });

  it('a minion type of the entry: «1−1» hit dice are less than one, so +0 and 1d8−1', () => {
    const c = caricaCampagna(TANA);
    const g = gregariDellaCampagna(c);
    const schede = caricaSchedeGeneriche(set(), { pg: c.pg, png: [...c.png, ...g.comePng] });
    const p = schede.get(g.gregari[0]!.id)!;
    expect(p).toMatchObject({ dadiVita: 0, morale: 7, abilita: { mischia: 0 } });
    expect(p.pfDaTirare).toEqual({ numero: 1, facce: 8, bonus: -1 });
  });

  it('the sheet\'s own keys win: written hit points are not rolled, a written AC stands, an unknown entry is reported', () => {
    const s = set();
    const a = leggiSchedaGenerica(s, 'png_x', 'X', true, { mostro: 'artigliatore', pf: 11, difesa: 16, abilita: { mischia: 4 } })!;
    expect(a).toMatchObject({ pf_massimi: 11, difesa: 16, abilita: { mischia: 4, distanza: 2 } });
    expect(a.pfDaTirare).toBeUndefined();
    expect(a.avvisi.join(' ')).toMatch(/abilita\.mischia: 4 scritto a mano, la tabella dei mostri dà 2 per 2 dadi vita/);
    const b = leggiSchedaGenerica(s, 'png_y', 'Y', true, { mostro: 'grifone', pf: 3 })!;
    expect(b.avvisi.join(' ')).toMatch(/mostro: «grifone» non è un mostro del bestiario/);
  });

  it('a malformed bestiary is an error of the set', () => {
    const errori: string[] = [];
    leggiSistema({ id: 'x', licenza: { libera: true }, risoluzione: { tipo: 'd20_cd' }, caratteristiche: [{ id: 'forza' }], difficolta: [{ id: 'n', valore: 10 }], abilita: [{ id: 'mischia', caratteristica: 'forza' }], bestiario: { dado_vita: 7, attacco: [{ da: 2, bonus: 2 }, { da: 1, bonus: 1 }], abilita: ['spada'] }, mostri: [{ id: 'Brutto' }, { id: 'ok', dadi_vita: 'tre' }] }, errori, []);
    expect(errori.join(' | ')).toMatch(/bestiario\.dado_vita/);
    expect(errori.join(' | ')).toMatch(/bestiario\.attacco\[2\]: «da» grows/);
    expect(errori.join(' | ')).toMatch(/bestiario\.abilita: «spada»/);
    expect(errori.join(' | ')).toMatch(/mostri\[1\]: an id in snake_case/);
    expect(errori.join(' | ')).toMatch(/mostri\.ok\.dadi_vita/);
  });
});

describe('hit points rolled once per creature, from the session seed', () => {
  const seme = 'ab'.repeat(16);
  it('the same seed gives the same numbers (a resume, the manual-roll dry run); each raider its own', () => {
    const a = motoreTana(new DadiCrittografici(seme));
    const b = motoreTana(new DadiCrittografici(seme));
    const ids = ['png_artigliatore', 'png_predone_tana_1', 'png_predone_tana_2', 'png_predone_tana_3'];
    const pf = (m: ReturnType<typeof motoreTana>) => ids.map((id) => m.stato.puntiFerita(id)!.massimi);
    expect(pf(a)).toEqual(pf(b));
    for (const [i, n] of pf(a).entries()) expect(n).toBeGreaterThanOrEqual(i ? 1 : 2);
    expect(pf(a)[0]).toBeLessThanOrEqual(16);
    // The hit points start full and the snapshot round-trips against the rolled maximum.
    expect(a.stato.puntiFerita('png_artigliatore')!.attuali).toBe(pf(a)[0]);
    a.stato.danneggia('png_artigliatore', 1);
    b.importa(a.esporta());
    expect(b.stato.puntiFerita('png_artigliatore')).toEqual(a.stato.puntiFerita('png_artigliatore'));
  });
  it('the rolls do not draw from the session\'s dice: the next die is the same with or without monsters', () => {
    const d = new DadiCrittografici(seme);
    motoreTana(d);
    expect(d.contatore).toBe(0);
  });
});

describe('a monster\'s attacks of the round', () => {
  it('makes all three, each with its card; when its target drops the rest go to another PC', async () => {
    // d6 in order: the bow's damage 1, initiative Dario 6 (+1), Bruna 1, the beast 5, the raiders 1, then the enemies'
    // surprise die 6; d20 20 hits; the claws' d3 3, the bite's d4 4.
    const m = motoreTana(new DadiPerFacce({ 6: [1, 6, 1, 5, 1, 1, 1, 6, 1], 20: [20], 3: [3], 4: [4] }), {}, ['pg_dario', 'pg_bruna']);
    // The opening shot comes before round 1; Dario's own step of round 1 is next, then the beast's.
    await m.risolvi(1, [azione('pg_dario', 'Tiro con l\'arco ad Artiglio Nero')]);
    const r = await m.risolvi(2, [azione('pg_dario', 'Tiro con l\'arco ad Artiglio Nero')]);
    const carte = r.tiri.filter((t) => t.chi === 'png_artigliatore');
    expect(carte.map((t) => t.etichetta)).toEqual(['Artiglio', 'Artiglio', 'Morso']);
    // Dario has 5 HP: the first claw (3) leaves 2, the second (3) drops him; the bite goes to Bruna.
    expect(carte.map((t) => t.bersaglio?.id)).toEqual(['pg_dario', 'pg_dario', 'pg_bruna']);
    expect(r.fatti.join(' ')).toMatch(/Turno di Artiglio Nero, attacco 1 di 3/);
    expect(r.fatti.join(' ')).toMatch(/attacco 3 di 3: Artiglio Nero colpisce Bruna/);
  });
});
