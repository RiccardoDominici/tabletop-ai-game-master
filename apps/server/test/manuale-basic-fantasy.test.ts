/**
 * Data check of the Basic Fantasy r142 rule set against the manual (CC BY-SA 4.0; the brief of the rules-engine work:
 * «for every table, a test that a few rows match the manual»). This is NOT a behaviour test — those run on invented
 * fixtures (test/poteri.test.ts, salvezze.test.ts…) — but the check that the numbers copied into
 * campagne/torre-mozza/regole/regole.yaml are the manual's, page by page, so a typo in a table is caught. Each expected
 * value below was read in the manual (printed page in the comment).
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaRegole } from '../src/regole/caricatore';
import { bersaglioSalvezza, rigaAlLivello } from '../src/regole/salvezze';
import { caricaSchedeGeneriche, trattiDi } from '../src/regole/schede';
import { bonusTratti } from '../src/regole/tratti';
import type { SistemaRegole } from '../src/regole/tipi';
import { limitiDi } from '../src/regole/carico';
import { Risorse } from '../src/prove/risorse';
import { Inventario } from '../src/prove/inventario';
import { loggerMuto } from '../src/logger';

const BF = path.join(import.meta.dirname, '..', '..', '..', 'campagne', 'torre-mozza');

function set(): SistemaRegole {
  const r = caricaRegole(BF);
  // A broken set falls back to the SRD at runtime: make sure this one loads as itself.
  expect(r.sistema.id).toBe('basic-fantasy-r142');
  return r.sistema;
}

const slot = (s: SistemaRegole, classe: string, livello: number): number[] => rigaAlLivello(s.classi!.find((c) => c.id === classe)!.incantesimiAlGiorno, livello)!.slot;

describe('spells per day (Basic Fantasy pp. 7–8)', () => {
  it('Magic-User', () => {
    const s = set();
    expect(slot(s, 'mago', 1)).toEqual([1]);
    expect(slot(s, 'mago', 3)).toEqual([2, 1]);
    expect(slot(s, 'mago', 10)).toEqual([4, 3, 3, 2, 2]);
    expect(slot(s, 'mago', 20)).toEqual([6, 5, 5, 4, 4, 3]);
  });
  it('Cleric: none at 1st level', () => {
    const s = set();
    expect(slot(s, 'chierico', 1)).toEqual([]);
    expect(slot(s, 'chierico', 2)).toEqual([1]);
    expect(slot(s, 'chierico', 12)).toEqual([4, 4, 3, 2, 2, 1]);
    expect(slot(s, 'chierico', 20)).toEqual([6, 5, 5, 4, 3, 3]);
  });
});

describe('the level-1 and level-2 Cleric and Magic-User spells (pp. 15–41)', () => {
  it('every spell of the four lists is a power of the set (37: four are on both lists)', () => {
    const p = set().poteri!.filter((x) => x.tipo === 'incantesimo');
    expect(p).toHaveLength(37);
    const livelli = (id: string) => p.find((x) => x.id === id)?.livello;
    // p. 15–16: one entry per spell, with each class's level.
    expect(livelli('individuare_il_magico')).toEqual({ chierico: 1, mago: 1 });
    expect(livelli('individuare_il_male')).toEqual({ chierico: 1, mago: 2 });
    expect(livelli('blocca_persone')).toEqual({ chierico: 2, mago: 3 });
    expect(livelli('leggere_il_magico')).toEqual({ mago: 1 });
    expect(p.filter((x) => x.livello['chierico'] === 1).length).toBe(8);
    expect(p.filter((x) => x.livello['chierico'] === 2).length).toBe(8);
    expect(p.filter((x) => x.livello['mago'] === 1).length).toBe(13);
    expect(p.filter((x) => x.livello['mago'] === 2).length).toBe(12);
  });

  it('the numbers of the spells with typed effects', () => {
    const p = set().poteri!;
    const di = (id: string) => p.find((x) => x.id === id)!;
    // Magic Missile, p. 29: 1d6+1, one more missile every three levels beyond the 1st, at most 5.
    expect(di('dardo_incantato').effetti[0]).toMatchObject({ tipo: 'danno', dadi: { numero: 1, facce: 6, bonus: 1 }, colpi: { ogni: 3, massimo: 5 } });
    // Sleep, p. 36: creatures of 3 HD or less, or one of 4; 5 rounds per level; save vs Spells; undead immune.
    expect(di('sonno')).toMatchObject({ dadiVitaMax: 3, oppureUnoFinoA: 4, salvezza: { abilita: 'ts_incantesimi', esito: 'annulla' } });
    expect(di('sonno').immuni).toContain('non_morto');
    expect(di('sonno').effetti[0]).toMatchObject({ tipo: 'condizione', condizione: 'addormentato', durata: { tipo: 'round', perLivello: 5 }, finisceSeFerito: true });
    // Cure Light Wounds, p. 20: 1d6+1.
    expect(di('cura_ferite_leggere').effetti[0]).toMatchObject({ tipo: 'cura', dadi: { numero: 1, facce: 6, bonus: 1 } });
    // Shield, p. 36: +3 AC against melee, +6 against missiles, 5 rounds + 1 per level; blocks magic missiles.
    expect(di('scudo').effetti).toMatchObject([
      { tipo: 'bonus', a: 'difesa', valore: 3, contro: 'mischia', durata: { tipo: 'round', dadi: { bonus: 5 }, perLivello: 1 } },
      { tipo: 'bonus', a: 'difesa', valore: 6, contro: 'distanza' },
      { tipo: 'immunita', a: ['dardo_incantato'] },
    ]);
    // Hold Person, p. 25: a humanoid; one target saves at −2; 2d8 turns (no game clock: the scene).
    expect(di('blocca_persone')).toMatchObject({ soloTipi: ['umanoide'], salvezza: { modificatore: -2 } });
    // Charm Person, p. 18: a humanoid of 4 HD or less, save vs Spells (with Wisdom against charm, p. 60).
    expect(di('charme')).toMatchObject({ soloTipi: ['umanoide'], dadiVitaMax: 4, salvezza: { abilita: 'ts_charme' } });
    // Bless, p. 17: +1 to attack rolls for 1 minute per level (6 rounds).
    expect(di('benedizione').effetti[0]).toMatchObject({ tipo: 'bonus', a: 'attacchi', valore: 1, durata: { perLivello: 6 } });
  });
});

const ts = (s: SistemaRegole, classe: string, livello: number): number[] => rigaAlLivello(s.tiriSalvezza!.classi[classe]!, livello)!.valori;

describe('saving throws by class and level (p. 61): Death Ray or Poison, Wands, Paralysis, Breath, Spells', () => {
  it('a few rows of each class', () => {
    const s = set();
    expect(s.tiriSalvezza!.colonne.map((c) => c.id)).toEqual(['morte', 'bacchette', 'paralisi', 'soffio', 'incantesimi']);
    expect(ts(s, 'guerriero', 0)).toEqual([13, 14, 15, 16, 18]);
    expect(ts(s, 'guerriero', 1)).toEqual([12, 13, 14, 15, 17]);
    expect(ts(s, 'guerriero', 3)).toEqual([11, 12, 14, 15, 16]);
    expect(ts(s, 'guerriero', 20)).toEqual([5, 6, 8, 9, 10]);
    expect(ts(s, 'chierico', 1)).toEqual([11, 12, 14, 16, 15]);
    expect(ts(s, 'chierico', 20)).toEqual([5, 6, 9, 11, 10]);
    expect(ts(s, 'mago', 11)).toEqual([11, 10, 9, 13, 11]);
    expect(ts(s, 'mago', 20)).toEqual([8, 6, 5, 11, 8]);
    expect(ts(s, 'ladro', 1)).toEqual([13, 14, 13, 16, 15]);
    expect(ts(s, 'ladro', 20)).toEqual([6, 8, 8, 6, 8]);
  });

  it('race traits (pp. 5–6) and the exceptions of p. 60', () => {
    const s = set();
    const razza = (id: string) => s.razze!.find((r) => r.id === id)!.tratti;
    expect(bonusTratti(razza('nano'), { tipo: 'salvezza', colonna: 'morte' })).toBe(4);
    expect(bonusTratti(razza('nano'), { tipo: 'salvezza', colonna: 'soffio' })).toBe(3);
    expect(bonusTratti(razza('elfo'), { tipo: 'salvezza', colonna: 'incantesimi' })).toBe(2);
    expect(bonusTratti(razza('elfo'), { tipo: 'salvezza', colonna: 'paralisi' })).toBe(1);
    expect(bonusTratti(razza('halfling'), { tipo: 'iniziativa' })).toBe(1);
    expect(bonusTratti(razza('halfling'), { tipo: 'abilita', abilita: 'distanza' })).toBe(1);
    expect(s.abilita.find((a) => a.id === 'ts_veleno')).toMatchObject({ caratteristica: 'costituzione', salvezza: 'morte' });
    expect(s.abilita.find((a) => a.id === 'ts_charme')).toMatchObject({ caratteristica: 'saggezza', salvezza: 'incantesimi' });
    expect(s.abilita.find((a) => a.id === 'ts_illusioni')).toMatchObject({ caratteristica: 'intelligenza', salvezza: 'incantesimi' });
  });

  it('the four pregenerated PCs save as they did before the tables (the same odds), now from the table and the race', () => {
    const s = set();
    const schede = caricaSchedeGeneriche(s, caricaCampagna(BF));
    const tiro = (pg: string, abilita: string) => {
      const sch = schede.get(pg)!;
      const t = bersaglioSalvezza(s, sch, abilita, bonusTratti(trattiDi(s, sch), { tipo: 'salvezza', colonna: s.abilita.find((a) => a.id === abilita)!.salvezza as string }))!;
      // The number the d20 alone must reach.
      return t.contro - t.modificatore;
    };
    // Before: the sheet's bonus against 17 (Livia ts_morte 5 → 12, Fulco 10 → 7, Nespola ts_soffio 4 → 13, Eliandro ts_incantesimi 4 → 13).
    expect(tiro('pg_livia', 'ts_morte')).toBe(12);
    expect(tiro('pg_fulco', 'ts_morte')).toBe(7);
    expect(tiro('pg_nespola', 'ts_soffio')).toBe(13);
    expect(tiro('pg_eliandro', 'ts_incantesimi')).toBe(13);
    // Zirrà saves as a level-3 fighter (11 12 14 15 16).
    expect(bersaglioSalvezza(s, schede.get('png_zirra')!, 'ts_incantesimi')).toMatchObject({ contro: 16, fonte: 'tabella' });
  });
});

describe('death and dying (p. 188, optional «Save vs. Death»)', () => {
  it('the PC’s own save vs. Death Ray, 2d10 rounds dying, prepared spells lost; binding wounds stabilises', () => {
    const s = set();
    expect(s.combattimento.danni.tiriMorte).toMatchObject({ abilita: 'ts_morte', finestra: { numero: 2, facce: 10, bonus: 0 }, perdeIncantesimi: true, successi: 1, fallimenti: 1, ventiRialza: false, unoDoppio: false });
    expect(s.poteri!.find((p) => p.id === 'fasciare')).toMatchObject({ tipo: 'azione', effetti: [{ tipo: 'stabilizza' }] });
  });
});

describe('the item catalog (pp. 10–12): coins, weapons, ranges, armor, gear', () => {
  const v = (s: SistemaRegole, id: string) => s.catalogo!.voci.find((x) => x.id === id)!;
  it('coins: 1 pp = 5 gp, 1 gp = 10 sp, 1 ep = 5 sp, 1 sp = 10 cp; twenty coins to the pound (p. 10)', () => {
    const s = set();
    expect(Object.fromEntries(s.monete!.tagli.map((t) => [t.id, t.vale]))).toEqual({ mp: 500, mo: 100, me: 50, ma: 10, mr: 1 });
    expect(s.monete!.peso).toEqual({ quante: 20, peso: 1 });
  });
  it('weapons: price, size, weight, damage (p. 11); ranges in metres, feet × 0.3 (p. 11); rate of fire (p. 54)', () => {
    const s = set();
    const arma = (id: string) => v(s, id) as Extract<ReturnType<typeof v>, { tipo: 'arma' }>;
    expect(arma('ascia_da_mano')).toMatchObject({ costo: 400, taglia: 'S', peso: 5, danno: { numero: 1, facce: 6 } });
    expect(arma('spadone')).toMatchObject({ costo: 1800, taglia: 'L', peso: 10, mani: 2, danno: { facce: 10 } });
    expect(arma('randello')).toMatchObject({ costo: 20, taglia: 'M', peso: 1, danno: { facce: 4 } });
    expect(arma('mazza')).toMatchObject({ costo: 600, taglia: 'M', peso: 10, danno: { facce: 8 } });
    // Longbow 70/140/210 feet, shortbow 50/100/150, sling 30/60/90, dagger 10/20/30.
    expect(arma('arco_lungo').gittate).toEqual([21, 42, 63]);
    expect(arma('arco_corto').gittate).toEqual([15, 30, 45]);
    expect(arma('fionda').gittate).toEqual([9, 18, 27]);
    expect(arma('pugnale').lancio!.gittate).toEqual([3, 6, 9]);
    expect(arma('balestra_leggera').ricarica).toBe(2);
    expect(arma('balestra_pesante').ricarica).toBe(3);
    expect(arma('lancia').aDueMani!.danno.facce).toBe(8);
    expect(s.catalogo!.gittate!.fasce.map((f) => f.bonus)).toEqual([1, 0, -2]);
    // Silver ammunition (†) and the sling stone, not for sale.
    expect(v(s, 'freccia_arco_lungo_argento')).toMatchObject({ costo: 400, proprieta: ['argento'] });
    expect(v(s, 'sasso')).toMatchObject({ costo: null, danno: { facce: 3 } });
  });
  it('armor and shields: no armor AC 11; leather 13, chain 15, plate 17, shield +1, with price and weight (p. 11)', () => {
    const s = set();
    expect(s.catalogo!.difesa).toEqual({ senzaArmatura: 11, caratteristica: 'destrezza' });
    expect(v(s, 'cuoio')).toMatchObject({ ca: 13, peso: 15, costo: 2000, categoria: 'cuoio' });
    expect(v(s, 'cotta_di_maglia')).toMatchObject({ ca: 15, peso: 40, costo: 6000, categoria: 'metallo' });
    expect(v(s, 'armatura_a_piastre')).toMatchObject({ ca: 17, peso: 50, costo: 30000 });
    expect(v(s, 'scudo')).toMatchObject({ bonus: 1, peso: 5, costo: 700 });
  });
  it('gear: the 46 items of p. 10 with packs; containers and light of p. 12', () => {
    const s = set();
    expect(s.catalogo!.voci.filter((x) => x.tipo === 'attrezzo' && !x.proprieta.includes('animale'))).toHaveLength(46);
    expect(v(s, 'torcia')).toMatchObject({ costo: 100, peso: 1, confezione: 6, luce: { raggio: 9, fioca: 6, durata: { numero: 1, facce: 4, bonus: 4 }, unita: 'turno' } });
    expect(v(s, 'lanterna')).toMatchObject({ costo: 500, peso: 2, luce: { durata: { numero: 1, facce: 6, bonus: 18 }, consuma: 'olio' } });
    expect(v(s, 'morso_e_briglie')).toMatchObject({ costo: 150, peso: 3 });
    expect(v(s, 'razioni')).toMatchObject({ costo: 1000, peso: 14 });
    expect(v(s, 'zaino')).toMatchObject({ capienza: 40 });
    expect(v(s, 'cavallo_da_guerra')).toMatchObject({ costo: 20000, proprieta: ['animale'] });
  });
  it('restrictions (pp. 5–8, 187): magic-user −5 and no spells in armor; thief in metal armor; dwarf and halfling weapons', () => {
    const s = set();
    const r = (k: string, id: string) => s.catalogo!.restrizioni.filter((x) => (x.classe ?? x.razza) === id && x.cosa === k);
    expect(r('arma', 'mago')[0]).toMatchObject({ ammessi: ['pugnale', 'pugnale_argento', 'randello'], penalita: { attacco: -5 } });
    expect(r('armatura', 'mago')[0]!.penalita).toEqual({ senzaIncantesimi: 'perso' });
    expect(r('armatura', 'ladro')[0]).toMatchObject({ ammessiCategorie: ['cuoio'] });
    expect(r('armatura', 'ladro')[0]!.penalita.senzaAbilita).toContain('alle_spalle');
    expect(r('arma', 'nano')[0]).toMatchObject({ vietati: ['spadone', 'arma_in_asta', 'arco_lungo'], penalita: { vietato: true } });
    expect(r('arma', 'halfling')[0]).toMatchObject({ vietatiTaglie: ['L'] });
  });
  it('the four pregenerated PCs keep their AC and attack lines, now from the catalog', () => {
    const s = set();
    const schede = caricaSchedeGeneriche(s, caricaCampagna(BF));
    const vista = (id: string) => schede.get(id)!.attacchi.map((a) => `${a.id}|${a.danno.numero}d${a.danno.facce}${a.danno.bonus ? `+${a.danno.bonus}` : ''}|${a.abilita}|${a.distanza}`);
    expect(['pg_livia', 'pg_fulco', 'pg_nespola', 'pg_eliandro'].map((id) => schede.get(id)!.difesa)).toEqual([17, 15, 15, 12]);
    expect(vista('pg_livia')).toEqual(['spada_lunga|1d8+2|mischia|false', 'arco_corto|1d6|distanza|true']);
    expect(vista('pg_fulco')).toEqual(['mazza|1d8+1|mischia|false', 'fionda|1d4+1|distanza|true']);
    expect(vista('pg_nespola')).toEqual(['spada_corta|1d6|mischia|false', 'fionda|1d4|distanza|true', 'spada_corta_alle_spalle|1d6|alle_spalle|false']);
    expect(vista('pg_eliandro')).toEqual(['pugnale|1d4|mischia|false', 'pugnale_lanciato|1d4|distanza|true']);
    expect(schede.get('pg_livia')!.attacchi[1]!.munizioni).toEqual(['freccia_arco_corto', 'freccia_arco_corto_argento']);
    for (const p of ['pg_livia', 'pg_fulco', 'pg_nespola', 'pg_eliandro']) expect(schede.get(p)!.avvisi).toEqual([]);
  });
});

describe('carrying capacity and movement (p. 42)', () => {
  it('light and heavy loads by Strength, the halfling’s own table and lighter armor; movement in metres (feet × 0.3)', () => {
    const s = set();
    const c = s.carico!;
    expect(limitiDi(c, 3, 'umano')).toEqual([25, 60]);
    expect(limitiDi(c, 12, 'nano')).toEqual([60, 150]);
    expect(limitiDi(c, 17, 'elfo')).toEqual([70, 180]);
    expect(limitiDi(c, 18, 'umano')).toEqual([80, 195]);
    expect(limitiDi(c, 5, 'halfling')).toEqual([30, 60]);
    expect(limitiDi(c, 14, 'halfling')).toEqual([55, 110]);
    expect(c.pesoArmatura).toEqual({ halfling: 0.25 });
    // 40'/30' no armor, 30'/20' leather, 20'/10' metal.
    expect(s.movimento!.righe).toEqual([
      { armatura: 'nessuna', valori: [12, 9] },
      { armatura: 'cuoio', valori: [9, 6] },
      { armatura: 'metallo', valori: [6, 3] },
    ]);
    expect(s.movimento!.perTurno).toBe(3);
  });
  it('the four PCs: what they carry, their band and their movement', () => {
    const s = set();
    const schede = caricaSchedeGeneriche(s, caricaCampagna(BF));
    const risorse = new Risorse(s, schede);
    const inv = new Inventario({ sistema: s, schede, risorse, nome: (id) => id, log: loggerMuto() });
    const vista = (id: string) => {
      const c = inv.carico(id)!;
      return [c.peso, c.nome, c.movimento];
    };
    expect(vista('pg_livia')).toEqual([58.05, 'Carico leggero', 6]);
    expect(vista('pg_fulco')).toEqual([60.45, 'Carico leggero', 6]);
    expect(vista('pg_nespola')).toEqual([19.9, 'Carico leggero', 9]);
    expect(vista('pg_eliandro')).toEqual([22.35, 'Carico leggero', 12]);
  });
});
