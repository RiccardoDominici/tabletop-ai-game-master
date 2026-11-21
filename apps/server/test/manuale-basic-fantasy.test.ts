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
import { rigaDi } from '../src/regole/progressione';
import { pxDiScheda } from '../src/regole/esperienza';

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

describe('time, light and travel (pp. 42, 45)', () => {
  it('a turn is ten minutes, a round ten seconds (60 to a turn); exploring a window is a turn; a night eight hours', () => {
    const s = set();
    const u = Object.fromEntries(s.tempo!.unita.map((x) => [x.id, x.secondi]));
    expect(u['turno']! / u['round']!).toBe(60);
    expect(u['turno']).toBe(600);
    expect(s.tempo!.round).toBe('round');
    expect(s.tempo!.perFinestra).toBe(600);
    expect(s.riposo!.find((r) => r.id === 'notte')!.durata).toBe(8 * 3600);
  });
  it('travel: 0.6 × the movement in feet a day (40\' → 24 miles), here 2 per metre; terrain ×1/3, ×2/3, ×1, ×1 1/3', () => {
    const s = set();
    expect(12 * s.viaggio!.perMovimento).toBe(24);
    expect(s.viaggio!.oreAlGiorno).toBe(8);
    expect(s.viaggio!.terreni.map((t) => t.per)).toEqual([0.333, 0.667, 1, 1.333]);
  });
});


describe('progression by class and level (pp. 7–9, 53, 57, 49)', () => {
  const cl = (s: SistemaRegole, id: string) => s.classi!.find((c) => c.id === id)!.progressione;

  it('experience points to reach levels 1, 2, 9, 10, 20 (pp. 7–8)', () => {
    const s = set();
    // p. 7 Fighter: 0, 2,000, 240,000 (level 9), 360,000 (level 10), 1,560,000 (level 20).
    expect(cl(s, 'guerriero').px[0]).toBe(0);
    expect(cl(s, 'guerriero').px[1]).toBe(2000);
    expect(cl(s, 'guerriero').px[8]).toBe(240000);
    expect(cl(s, 'guerriero').px[9]).toBe(360000);
    expect(cl(s, 'guerriero').px[19]).toBe(1560000);
    // p. 7 Cleric: 0, 1,500, 180,000 (level 9), 270,000 (level 10), 1,170,000 (level 20).
    expect(cl(s, 'chierico').px[1]).toBe(1500);
    expect(cl(s, 'chierico').px[8]).toBe(180000);
    expect(cl(s, 'chierico').px[9]).toBe(270000);
    expect(cl(s, 'chierico').px[19]).toBe(1170000);
    // p. 8 Magic-User: 0, 2,500, 300,000 (level 9), 450,000 (level 10), 1,950,000 (level 20).
    expect(cl(s, 'mago').px[1]).toBe(2500);
    expect(cl(s, 'mago').px[8]).toBe(300000);
    expect(cl(s, 'mago').px[9]).toBe(450000);
    expect(cl(s, 'mago').px[19]).toBe(1950000);
    // p. 8 Thief: 0, 1,250, 150,000 (level 9), 225,000 (level 10), 975,000 (level 20).
    expect(cl(s, 'ladro').px[1]).toBe(1250);
    expect(cl(s, 'ladro').px[8]).toBe(150000);
    expect(cl(s, 'ladro').px[9]).toBe(225000);
    expect(cl(s, 'ladro').px[19]).toBe(975000);
  });

  it('hit dice: one die a level to the 9th, then fixed points (p. 7–8)', () => {
    const s = set();
    expect(cl(s, 'guerriero').dadiVita).toEqual([
      { da: 1, dado: { numero: 1, facce: 8, bonus: 0 }, fissi: null },
      { da: 10, dado: null, fissi: 2 },
    ]);
    expect(cl(s, 'chierico').dadiVita[0]).toMatchObject({ da: 1, dado: { facce: 6 } });
    expect(cl(s, 'chierico').dadiVita[1]).toMatchObject({ da: 10, fissi: 1 });
    expect(cl(s, 'mago').dadiVita[0]).toMatchObject({ da: 1, dado: { facce: 4 } });
    expect(cl(s, 'mago').dadiVita[1]).toMatchObject({ da: 10, fissi: 1 });
    expect(cl(s, 'ladro').dadiVita[0]).toMatchObject({ da: 1, dado: { facce: 4 } });
    expect(cl(s, 'ladro').dadiVita[1]).toMatchObject({ da: 10, fissi: 2 });
  });

  it('attack bonus by level (p. 53): Fighter with NM, Cleric and Thief share a column, Magic-User its own', () => {
    const s = set();
    const at = (id: string, l: number) => rigaDi(cl(s, id).attacco, l)!.bonus;
    // Fighter: NM 0; level 1 +1; 2–3 +2; 4 +3; 5–6 +4; 7 +5; 8–10 +6; 11–12 +7; 13–15 +8; 16–17 +9; 18–20 +10.
    expect([0, 1, 2, 3, 4, 9, 12, 20].map((l) => at('guerriero', l))).toEqual([0, 1, 2, 2, 3, 6, 7, 10]);
    // Cleric or Thief: 1–2 +1; 3–4 +2; 5–6 +3; 7–8 +4; 9–11 +5; 12–14 +6; 15–17 +7; 18–20 +8.
    expect([1, 2, 3, 4, 9, 12, 20].map((l) => at('chierico', l))).toEqual([1, 1, 2, 2, 5, 6, 8]);
    expect([1, 2, 3, 4, 9, 12, 20].map((l) => at('ladro', l))).toEqual([1, 1, 2, 2, 5, 6, 8]);
    // Magic-User: 1–3 +1; 4–5 +2; 6–8 +3; 9–12 +4; 13–15 +5; 16–18 +6; 19–20 +7.
    expect([1, 2, 3, 4, 9, 12, 20].map((l) => at('mago', l))).toEqual([1, 1, 1, 2, 4, 4, 7]);
  });

  it('thief abilities (p. 9): seven values per row, levels 1, 9, 10, 15, 16, 20', () => {
    const s = set();
    const ab = cl(s, 'ladro').abilita!;
    expect(ab.colonne).toEqual(['scassinare', 'trappole', 'borseggiare', 'muoversi_in_silenzio', 'scalare', 'nascondersi', 'ascoltare']);
    for (const r of ab.righe) expect(r.valori).toHaveLength(7);
    const v = (l: number) => rigaDi(ab.righe, l)!.valori;
    expect(v(1)).toEqual([25, 20, 30, 25, 80, 10, 30]);
    expect(v(9)).toEqual([65, 60, 70, 65, 88, 50, 62]);
    expect(v(10)).toEqual([68, 63, 74, 68, 89, 53, 65]);
    expect(v(15)).toEqual([83, 78, 94, 83, 94, 68, 80]);
    expect(v(16)).toEqual([84, 79, 95, 85, 95, 69, 83]);
    expect(v(20)).toEqual([88, 83, 99, 93, 99, 73, 95]);
  });

  it('turn undead (p. 57): rows at levels 1, 7, 8, 11, 12, 20; nine cells each', () => {
    const s = set();
    const rows = cl(s, 'chierico').tabelle['scacciare_non_morti']!;
    for (const r of rows) expect(r.valori).toHaveLength(9);
    const v = (l: number) => rigaDi(rows, l)!.valori;
    expect(v(1)).toEqual([13, 17, 19, null, null, null, null, null, null]);
    expect(v(7)).toEqual([2, 5, 9, 13, 17, 19, null, null, null]);
    expect(v(8)).toEqual(['T', 3, 7, 11, 15, 18, 20, null, null]);
    expect(v(11)).toEqual(['D', 'T', 2, 5, 9, 13, 17, 19, null]);
    expect(v(12)).toEqual(['D', 'T', 'T', 3, 7, 11, 15, 18, 20]);
    expect(v(20)).toEqual(['D', 'D', 'D', 'D', 'D', 'T', 'T', 3, 7]);
  });

  it('XP by monster hit dice (p. 49): rows 0, 1, 9, 25 and the extra per die above 25', () => {
    const s = set();
    const e = s.esperienza!;
    expect(rigaDi(e.perDadiVita, 0)).toEqual({ da: 0, px: 10, speciale: 3 });
    expect(rigaDi(e.perDadiVita, 1)).toEqual({ da: 1, px: 25, speciale: 12 });
    expect(rigaDi(e.perDadiVita, 9)).toEqual({ da: 9, px: 1075, speciale: 75 });
    expect(rigaDi(e.perDadiVita, 25)).toEqual({ da: 25, px: 9000, speciale: 325 });
    // Over 25 dice: +750 XP and +25 special per die (p. 49).
    expect(e.oltre).toEqual({ px: 750, speciale: 25 });
  });
});

describe('progression as torre-mozza uses it (pp. 3–9, 49, 53, 57–58, 190)', () => {
  it('the set-level rules: attack bonus to melee, missile and the sneak attack (+4), Constitution on each die', () => {
    const s = set();
    expect(s.progressione).toEqual({ attacco: [{ abilita: 'mischia', piu: 0, classi: [] }, { abilita: 'distanza', piu: 0, classi: [] }, { abilita: 'alle_spalle', piu: 4, classi: ['ladro'] }], puntiFerita: { caratteristica: 'costituzione', minimo: 1 }, unLivelloPerAvventura: true });
    // p. 190, the optional XP for treasure: 1 gp = 1 XP, only once back to safety.
    expect(s.esperienza!.tesoro).toEqual({ px: 1, moneta: 'mo', quando: 'al_sicuro' });
    const razza = (id: string) => s.razze!.find((r) => r.id === id)!.tratti;
    expect(razza('umano')).toContainEqual({ tipo: 'esperienza', bonus: 10 });
    expect(razza('elfo')).toContainEqual({ tipo: 'dado_vita', facce: 6 });
    expect(razza('halfling')).toContainEqual({ tipo: 'dado_vita', facce: 6 });
    expect(razza('halfling')).toContainEqual({ tipo: 'almeno', valori: { nascondersi: 70 } });
  });

  it('Turn Undead is a power rolled against the cleric’s table (pp. 57–58)', () => {
    const p = set().poteri!.find((x) => x.id === 'scacciare_non_morti')!;
    expect(p.tabella!.dado).toEqual({ numero: 1, facce: 20, bonus: 0 });
    expect(p.tabella!.colonne.map((c) => c.dadiVita)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(p.tabella!.colpiti).toEqual({ numero: 2, facce: 6, bonus: 0 });
    expect(p.tabella!.distrugge).toEqual({ dadi: { numero: 1, facce: 8, bonus: 0 }, perLivello: true });
    expect(p.tabella!.dopoFallimento).toMatchObject({ tipo: 'tempo', unita: 'turno', dadi: { bonus: 1 } });
    expect(p.soloTipi).toEqual(['non_morto']);
    expect(p.effetti[0]).toMatchObject({ tipo: 'condizione', condizione: 'scacciato', durata: { tipo: 'tempo', unita: 'turno', dadi: { numero: 2, facce: 4 } } });
  });

  it('the four PCs keep today’s numbers, now from their class and level: no hand-typed attack bonus or thief percentage', () => {
    const s = set();
    const schede = caricaSchedeGeneriche(s, caricaCampagna(BF));
    for (const pg of ['pg_livia', 'pg_fulco', 'pg_nespola', 'pg_eliandro']) {
      const sch = schede.get(pg)!;
      expect(sch.px, pg).toBe(0);
      expect(sch.abilita['mischia'], pg).toBe(1);
      expect(sch.abilita['distanza'], pg).toBe(1);
      // The sneak attack is the thief's only (progressione.attacco.classi).
      expect(sch.abilita['alle_spalle'], pg).toBe(pg === 'pg_nespola' ? 5 : undefined);
      expect(Object.keys(sch.abilitaScritte!).filter((k) => ['mischia', 'distanza', 'alle_spalle', 'scassinare', 'nascondersi'].includes(k)), pg).toEqual([]);
      expect(sch.avvisi, pg).toEqual([]);
    }
    // Nespola: the thief's level-1 row and the halfling's 70 for hiding; the sneak attack +1 +4.
    expect(schede.get('pg_nespola')!.abilita).toMatchObject({ alle_spalle: 5, scassinare: 25, trappole: 20, borseggiare: 30, muoversi_in_silenzio: 25, scalare: 80, nascondersi: 70, ascoltare: 30 });
    // What is not a class table stays the sheet's: stuck doors, stonework, secret doors.
    expect(schede.get('pg_livia')!.abilita['forzare']).toBe(3);
    expect(schede.get('pg_fulco')!.abilita).toMatchObject({ forzare: 2, pietra: 2 });
    expect(schede.get('pg_eliandro')!.abilita['cercare']).toBe(3);
  });

  it('what the NPCs are worth when defeated, by their hit dice (p. 49)', () => {
    const s = set();
    const schede = caricaSchedeGeneriche(s, caricaCampagna(BF));
    expect(pxDiScheda(s.esperienza, schede.get('png_grosso')!)).toBe(25);
    expect(pxDiScheda(s.esperienza, schede.get('png_zirra')!)).toBe(145);
    expect(pxDiScheda(s.esperienza, schede.get('png_berta')!)).toBe(10);
  });
});

describe('the bestiary (pp. 53–54, 62–162)', () => {
  it('the monster attack bonus by hit dice (p. 53) and the d8, ½ = 1d4, «1−1» less than one (p. 54)', () => {
    const b = set().bestiario!;
    expect(b).toMatchObject({ dadoVita: 8, mezzo: { numero: 1, facce: 4, bonus: 0 }, abilita: ['mischia', 'distanza'], unoMenoMenoDiUno: true });
    const ab = (hd: number) => [...b.attacco].reverse().find((r) => hd >= r.da)!.bonus;
    expect([0, 1, 7, 8, 9, 10, 13, 15, 19, 20, 27, 31, 32, 40].map(ab)).toEqual([0, 1, 7, 8, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16]);
  });

  it('every printed stat block is an entry (275 with the ranges spelled out); a few checked by hand', () => {
    const s = set();
    expect(s.mostri).toHaveLength(275);
    const m = (id: string) => s.mostri!.find((x) => x.id === id)!.dati;
    // p. 97: ghoul AC 14, HD 2*, 2 claws 1 bite 1d4, morale 9, XP 100.
    expect(m('ghoul')).toMatchObject({ difesa: 14, dadi_vita: '2*', per_round: [['artiglio', 'artiglio', 'morso']], morale: 9, px: 100 });
    // p. 104: goblin AC 14 (11), HD 1-1, morale 7, XP 10; p. 111: hobgoblin AC 14 (11), HD 1, 1d8, morale 8, XP 25.
    expect(m('goblin')).toMatchObject({ difesa: 14, difesa_senza_armatura: 11, dadi_vita: '1-1', morale: 7, px: 10 });
    expect(m('hobgoblin')).toMatchObject({ difesa: 14, dadi_vita: '1', morale: 8, px: 25 });
    // p. 152: troll AC 16, HD 6*, claws 1d6 and bite 1d10, morale 10, XP 555.
    expect(m('troll')).toMatchObject({ difesa: 16, dadi_vita: '6*', morale: 10, px: 555 });
  });

  it('a goblin\'s sheet from its entry: +0 to hit (less than one hit die), 1d8−1 hit points, its XP by the table', () => {
    const s = set();
    const g = caricaSchedeGeneriche(s, { pg: [], png: [{ id: 'png_g', nome: 'Goblin', dati: { scheda: { mostro: 'goblin' } } } as never] }).get('png_g')!;
    expect(g).toMatchObject({ difesa: 14, dadiVita: 0, abilita: { mischia: 0, distanza: 0 }, pfDaTirare: { numero: 1, facce: 8, bonus: -1 }, morale: 7, px: 10 });
  });
});

describe('torre-mozza\'s monsters from the bestiary (the numbers they had)', () => {
  it('Grosso is the hobgoblin entry with his own hit points and mace; Zirrà the goblin entry as a 3−3 hit dice warrior', () => {
    const s = set();
    const schede = caricaSchedeGeneriche(s, caricaCampagna(BF));
    const g = schede.get('png_grosso')!;
    expect(g).toMatchObject({ mostro: 'hobgoblin', difesa: 14, pf_massimi: 7, dadiVita: 1, morale: 8, salvaCome: { classe: 'guerriero', livello: 1 }, abilita: { mischia: 1, distanza: 1 } });
    expect(g.pfDaTirare).toBeUndefined();
    expect(g.attacchi.map((a) => [a.nome, `${a.danno.numero}d${a.danno.facce}`, a.abilita])).toEqual([['Mazza ferrata', '1d8', 'mischia']]);
    const z = schede.get('png_zirra')!;
    expect(z).toMatchObject({ mostro: 'goblin', difesa: 14, pf_massimi: 12, dadiVita: 3, morale: 7, salvaCome: { classe: 'guerriero', livello: 3 }, abilita: { mischia: 3, distanza: 3 } });
    expect(z.attacchi.map((a) => [a.nome, `${a.danno.numero}d${a.danno.facce}`, a.abilita, a.distanza])).toEqual([['Spada corta', '1d6', 'mischia', false], ['Coltello lanciato', '1d4', 'distanza', true]]);
    expect(pxDiScheda(s.esperienza, g)).toBe(25);
    expect(pxDiScheda(s.esperienza, z)).toBe(145);
    expect([...g.avvisi, ...z.avvisi]).toEqual([]);
  });
});

describe('the bestiary\'s specials as typed data (pp. 62–162)', () => {
  it('the ghoul paralyses, the wight drains, the mountain dragon breathes fire first, the troll regenerates, undead are undead', () => {
    const s = set();
    const m = (id: string) => s.mostri!.find((x) => x.id === id)!.dati as Record<string, unknown> & { attacchi: Array<Record<string, unknown>>; per_round: string[][] };
    expect(m('ghoul').attacchi.map((a) => a['colpendo'])).toEqual([['paralisi_ghoul'], ['paralisi_ghoul']]);
    expect(m('ghoul')['tipo']).toEqual(['non_morto', 'ghoul']);
    expect(m('wight').attacchi[0]!['colpendo']).toEqual(['risucchio_1']);
    expect(m('wight')['colpito_solo_da']).toEqual(['argento', 'magica']);
    const drago = m('drago_montagna');
    expect(drago.per_round[0]).toContain('soffio');
    expect(drago.attacchi.find((a) => a['id'] === 'soffio')).toMatchObject({ potere: 'soffio_fuoco', usi: 10, ricarica: 2 });
    expect(drago['resistenze']).toEqual({ fuoco: 'immune' });
    expect(m('troll')['rigenera']).toEqual({ pf: 1, tranne: ['fuoco', 'acido'], a_zero: { round: '2d6' } });
    // A sheet from the dragon's entry: its breath is a power of the set, 1d8 per hit die.
    const sch = caricaSchedeGeneriche(s, { pg: [], png: [{ id: 'png_d', nome: 'Drago', dati: { scheda: { mostro: 'drago_montagna' } } } as never] }).get('png_d')!;
    expect(sch.attacchi.find((a) => a.id === 'soffio')).toMatchObject({ potere: 'soffio_fuoco', usi: 10 });
    expect(s.poteri!.find((p) => p.id === 'soffio_fuoco')).toMatchObject({ tipo: 'mostro', bersaglio: 'nemici', salvezza: { abilita: 'ts_soffio', esito: 'dimezza' } });
  });
});
