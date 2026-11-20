/**
 * The item catalog (docs/regole.md §2 «Catalogo»; mechanism M2 of docs/regole-audit/; rows C-CRE-09, C-ABI-04,
 * C-ABI-09, C-ARM-01, C-WPN-01/02/04, C-RACE-03/17, C-CLS-12/16): coins and prices, the AC and the attack lines derived
 * from a sheet's gear, the class and race restrictions, and a monster that keeps its typed numbers. On the invented
 * bottega fixture.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { leggiCatalogo, leggiCosto, leggiMonete, scriviCosto, voce } from '../src/regole/catalogo';
import { caricaRegole } from '../src/regole/caricatore';
import { applicaDotazione, attacchiDa, difesaDa, penalitaIndossate, restrizioniViolate, type Dotazione } from '../src/regole/equipaggiamento';
import { caricaSchedeGeneriche } from '../src/regole/schede';

const BOTTEGA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'bottega');

function carica() {
  const regole = caricaRegole(BOTTEGA);
  const avvisi: string[] = [];
  const schede = caricaSchedeGeneriche(regole.sistema, caricaCampagna(BOTTEGA), (m) => avvisi.push(m));
  return { s: regole.sistema, schede, avvisi };
}

/** A gear view by hand: ids → how many, and what is worn. */
const dotazione = (n: Record<string, number>, indossati: string[] = []): Dotazione => ({ quante: (id) => n[id] ?? 0, indossati: new Set(indossati) });

describe('coins and prices', () => {
  it('prices are written in any coin and kept in the smallest; a pack divides weight and price', () => {
    const { s, avvisi } = carica();
    expect(s.id).toBe('bottega-prova');
    expect(avvisi).toEqual([]);
    expect(s.monete!.tagli.map((t) => t.id)).toEqual(['mp', 'mo', 'ma', 'mr']);
    expect(voce(s.catalogo, 'spada')!.costo).toBe(800);
    expect(voce(s.catalogo, 'freccia')).toMatchObject({ costo: 10, peso: 1, confezione: 10 });
    expect(voce(s.catalogo, 'sasso')!.costo).toBeNull();
    expect(scriviCosto(s.monete!, 850)).toBe('8 mo 5 ma');
    // The platinum coin is worth 10 gold but prices are not written in it (monete.prezzi).
    expect(scriviCosto(s.monete!, 1203)).toBe('12 mo 3 mr');
  });

  it('a malformed price, an unknown ammunition or class is an error of the set', () => {
    const errori: string[] = [];
    const m = leggiMonete({ base: 'mo', tagli: [{ id: 'mo', vale: 10 }, { id: 'mr', vale: 1 }] }, errori);
    expect(leggiCosto('3 zz', m, 'x', errori)).toBeNull();
    leggiCatalogo(
      { armi: [{ id: 'arco', nome: 'Arco', danno: '1d6', gittate: [10, 20, 30], munizioni: [freccia_finta()] }], restrizioni: [{ classe: 'druido', cosa: 'arma', ammessi: ['arco'], penalita: { attacco: -2 } }] },
      m,
      { caratteristiche: new Set(['forza']), abilita: new Set(), classi: new Set(['mago']), razze: null },
      errori,
    );
    expect(errori.join('\n')).toMatch(/«3 zz»|15 mr/);
    expect(errori.join('\n')).toMatch(/munizioni: «freccia_x» is not in catalogo.munizioni/);
    expect(errori.join('\n')).toMatch(/range bands need catalogo.gittate/);
    expect(errori.join('\n')).toMatch(/«druido» is not a class/);
  });
});

function freccia_finta(): string {
  return 'freccia_x';
}

describe('Armor Class from the gear', () => {
  it('worn armor + Dexterity + shield; carried but not worn does not count; a monster keeps its typed AC', () => {
    const { s, schede } = carica();
    expect(schede.get('pg_aldo')!.difesa).toBe(16);
    expect(difesaDa(s, schede.get('pg_aldo')!, dotazione({ maglia: 1, scudo: 1 }, ['maglia', 'scudo']))!.da).toBe('Cotta di maglia + Scudo');
    expect(schede.get('pg_bice')!.difesa).toBe(10);
    expect(schede.get('pg_ciro')!.difesa).toBe(14);
    expect(schede.get('png_guardia')!.difesa).toBe(15);
    expect(schede.get('png_guardia')!.attacchi.map((a) => a.nome)).toEqual(['Mazza di granito']);
  });

  it('an armor that caps the characteristic; swapping armor changes the AC in place', () => {
    const { s, schede } = carica();
    const aldo = schede.get('pg_aldo')!;
    expect(difesaDa(s, aldo, dotazione({ corazza: 1 }, ['corazza']))!.valore).toBe(16);
    applicaDotazione(s, aldo, dotazione({ giubba: 1, spada: 1 }, ['giubba']));
    expect(aldo.difesa).toBe(13);
    expect(aldo.attacchi.map((a) => a.id)).toEqual(['spada']);
  });
});

describe('attack lines from the weapons', () => {
  it('melee lines add Strength to damage, a bow does not, a sling does; thrown and two-handed lines', () => {
    const { s, schede } = carica();
    const righe = (id: string) => schede.get(id)!.attacchi.map((a) => `${a.nome}|${a.danno.numero}d${a.danno.facce}${a.danno.bonus ? (a.danno.bonus > 0 ? '+' : '') + a.danno.bonus : ''}|${a.distanza ? 'distanza' : 'mischia'}|${a.abilita}`);
    expect(righe('pg_aldo')).toEqual(['Spada|1d8+1|mischia|mischia', 'Arco|1d6|distanza|distanza']);
    expect(schede.get('pg_aldo')!.attacchi[1]).toMatchObject({ gittate: [10, 20, 30], munizioni: ['freccia', 'freccia_argento'], arma: 'arco' });
    expect(righe('pg_bice')).toEqual(['Pugnale|1d4-1|mischia|mischia', 'Pugnale lanciato|1d4-1|distanza|distanza']);
    expect(righe('pg_ciro')).toEqual(['Pugnale|1d4|mischia|mischia', 'Pugnale lanciato|1d4|distanza|distanza', 'Fionda|1d4|distanza|distanza', 'Pugnale alle spalle|1d4|mischia|furtivo']);
    const lancia = attacchiDa(s, schede.get('pg_aldo')!, dotazione({ lancia: 1 }));
    expect(lancia.map((a) => `${a.nome}:${a.danno.facce}+${a.danno.bonus}`)).toEqual(['Lancia:6+1', 'Lancia a due mani:8+1', 'Lancia (lanciato):6+1']);
    expect(attacchiDa(s, schede.get('pg_aldo')!, dotazione({ balestra: 1 }))[0]).toMatchObject({ ricarica: 2, munizioni: ['dardo'] });
  });

  it('a line of the sheet that names a weapon disappears when the weapon is gone', () => {
    const { s, schede } = carica();
    expect(attacchiDa(s, schede.get('pg_ciro')!, dotazione({ fionda: 1 })).map((a) => a.nome)).toEqual(['Fionda']);
  });
});

describe('class and race restrictions', () => {
  it('a magic-user with a sword: −4 to hit with it; a small one cannot wield a great sword', () => {
    const { s, schede } = carica();
    const bice = attacchiDa(s, schede.get('pg_bice')!, dotazione({ spada: 1, pugnale: 1 }));
    expect(bice.find((a) => a.id === 'spada')!.penalita).toBe(-4);
    expect(bice.find((a) => a.id === 'pugnale')!.penalita).toBeUndefined();
    expect(attacchiDa(s, schede.get('pg_ciro')!, dotazione({ spadone: 1 })).map((a) => a.id)).toEqual([]);
    expect(restrizioniViolate(s, schede.get('pg_aldo')!, voce(s.catalogo, 'spadone')!)).toEqual([]);
  });

  it('a magic-user in armor casts nothing; a thief in heavy armor loses its thief abilities', () => {
    const { s, schede } = carica();
    expect(penalitaIndossate(s, schede.get('pg_bice')!, dotazione({ giubba: 1 }, ['giubba']))).toMatchObject({ senzaIncantesimi: true, motivi: ['Giubba imbottita'] });
    expect(penalitaIndossate(s, schede.get('pg_bice')!, dotazione({ giubba: 1 }, [])).senzaIncantesimi).toBeUndefined();
    expect(penalitaIndossate(s, schede.get('pg_ciro')!, dotazione({ maglia: 1 }, ['maglia'])).senzaAbilita).toEqual(['scassinare', 'furtivo']);
    expect(penalitaIndossate(s, schede.get('pg_ciro')!, dotazione({ giubba: 1 }, ['giubba'])).senzaAbilita).toBeUndefined();
  });
});
