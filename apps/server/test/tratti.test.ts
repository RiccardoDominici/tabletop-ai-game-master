/**
 * Race and class traits (M6, docs/regole.md §2 «Razze e tratti»; audit rows C-RACE-20 (WRONG), C-RACE-13, C-RACE-18,
 * C-RACE-06/14/22, C-RACE-12): a bonus to initiative, to an ability's rolls, to the saves of some table columns, an
 * immunity, a smaller surprise range. Carried by the sheet's race, class or own `tratti`, applied by the Engine. On the
 * magia fixture: Sara is a «folletto» (+1 initiative, +1 with missiles, +2 to saves, surprised one face less, immune to
 * paralysis).
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import type { FonteDadi } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import { leggiSistema, caricaRegole } from '../src/regole/caricatore';
import { leggiEffetto } from '../src/regole/effetti';
import { caricaSchedeGeneriche, trattiDi } from '../src/regole/schede';
import { bonusTratti, leggiTratti } from '../src/regole/tratti';
import { orologioDiSistema } from '../src/turni/orologio';

const MAGIA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'magia');

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

function motore(dadi: Record<number, number[]>): MotoreProve {
  const c = caricaCampagna(MAGIA);
  const regole = caricaRegole(MAGIA);
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro: null, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ilaria', 'pg_bruno', 'pg_sara'], nome }), dadi: new DadiPerFacce(dadi) });
}

let n = 0;
const azione = (autore: string, testo: string) => ({ id: `a${++n}`, autore, testo, privata: false, revisione: 1 });

describe('traits as data', () => {
  it('reads the closed list and sums by kind; the sheet’s race and class bring theirs', () => {
    const errori: string[] = [];
    const t = leggiTratti([{ tiro: 'iniziativa', bonus: 1 }, { tiro: 'abilita', abilita: ['distanza'], bonus: 1 }, { tiro: 'salvezza', colonne: ['morte'], bonus: 4 }, { immune: ['paralizzato'] }, { sorpresa: -1 }], 'x', { abilita: new Set(['distanza']), colonne: new Set(['morte']) }, errori);
    expect(errori).toEqual([]);
    expect(bonusTratti(t, { tipo: 'iniziativa' })).toBe(1);
    expect(bonusTratti(t, { tipo: 'abilita', abilita: 'distanza' })).toBe(1);
    expect(bonusTratti(t, { tipo: 'abilita', abilita: 'mischia' })).toBe(0);
    expect(bonusTratti(t, { tipo: 'salvezza', colonna: 'morte' })).toBe(4);
    expect(bonusTratti(t, { tipo: 'salvezza', colonna: null })).toBe(0);
    leggiTratti([{ tiro: 'fortuna', bonus: 1 }, { tiro: 'abilita', abilita: ['volare'], bonus: 2 }, { sorpresa: 0 }, { tiro: 'iniziativa' }], 'y', { abilita: new Set(), colonne: new Set() }, errori);
    const msg = errori.join(' | ');
    expect(msg).toMatch(/y\[1\]\.tiro: iniziativa, abilita, salvezza or esperienza/);
    expect(msg).toMatch(/y\[2\]\.abilita: abilities of the set \(not: volare\)/);
    expect(msg).toMatch(/y\[3\]\.sorpresa: a whole number, not 0/);
    expect(msg).toMatch(/y\[4\]: \{tiro: iniziativa/);
    const regole = caricaRegole(MAGIA);
    const sara = caricaSchedeGeneriche(regole.sistema, caricaCampagna(MAGIA)).get('pg_sara')!;
    expect(sara.razza).toBe('folletto');
    expect(trattiDi(regole.sistema, sara)).toHaveLength(5);
  });

  it('an unknown race on a sheet is reported', () => {
    const s = leggiSistema({ id: 'x', nome: 'x', licenza: { libera: true }, risoluzione: { tipo: 'd20_cd' }, caratteristiche: [{ id: 'forza' }], difficolta: [{ id: 'n', valore: 10 }], razze: [{ id: 'nano' }] }, [], [])!;
    const avvisi: string[] = [];
    caricaSchedeGeneriche(s, { pg: [{ id: 'pg_x', nome: 'X', pubblico: { scheda: { caratteristiche: { forza: 10 }, pf: 3, razza: 'drago' } } }], png: [] } as never, (m) => avvisi.push(m));
    expect(avvisi.join(' ')).toMatch(/razza: «drago» non è una razza del set/);
  });
});

describe('the traits in play', () => {
  it('initiative: the folletto adds its +1 to Dexterity (Basic Fantasy’s halfling: audit C-RACE-20)', async () => {
    const m = motore({ 20: [12], 6: [3] });
    await m.risolvi(1, [azione('pg_sara', 'Colpisco il brigante con la spada corta')]);
    const ini = new Map(m.vistaCombattimento()!.combattenti.map((x) => [x.id, x.iniziativa]));
    // d6 3 + Destrezza 16 (+1) + 1 = 5; Ilaria 3 + Destrezza 13 (+1) = 4; Bruno 3 + 9 (0) = 3.
    expect([ini.get('pg_sara'), ini.get('pg_ilaria'), ini.get('pg_bruno')]).toEqual([5, 4, 3]);
  });

  it('a missile attack and a save get the trait; melee does not', async () => {
    const m = motore({ 20: [10], 6: [3] });
    const r = await m.risolvi(1, [azione('pg_sara', "Tiro con l'arco corto al brigante")]);
    // Destrezza 16 → +1, folletto +1 with missiles.
    expect(r.tiri.find((t) => t.chi === 'pg_sara')!.modificatore).toBe(2);
    m.terminaCombattimento();
    const corpo = await m.risolvi(2, [azione('pg_sara', 'Colpisco il brigante con la spada corta')]);
    expect(corpo.tiri.find((t) => t.chi === 'pg_sara')!.modificatore).toBe(0);
  });

  it('surprise per creature: the side’s die against each member’s own range', async () => {
    // The brigante opens the fight? No: Ilaria strikes first, so the NPCs roll; the PCs roll when the Game Master opens it.
    const m = motore({ 20: [12], 6: [2] });
    const fatto = m.iniziaCombattimento()!;
    // 2 on 1d6: surprised on 1–2, but the folletto only on 1.
    expect(fatto).toMatch(/Ilaria, Bruno colti di sorpresa \(sorpreso\), perdono il primo round; gli altri no/);
    expect(m.perdeIlTurno('pg_sara')).toBeNull();
    expect(m.perdeIlTurno('pg_ilaria')).toBe('Sorpreso');
  });

  it('an immunity of the race: a condition it ignores', () => {
    const m = motore({ 20: [12], 6: [3] });
    const fatto = m.attivi.aggiungi('pg_sara', leggiEffetto({ tipo: 'condizione', condizione: 'addormentato', durata: { round: 3 } }, 'x', []) as never, 'Prova', 1, { seme: 'x', contatore: 0, tira: () => 1 });
    expect(fatto).toMatch(/Sara è addormentato per 3 round/);
    // paralizzato is not a condition of the fixture's set: the race's immunity is read by id, the name stays the id.
    expect(m.attivi.aggiungi('pg_sara', { tipo: 'condizione', condizione: 'paralizzato', durata: { tipo: 'scena' }, finisceSeFerito: false }, 'Prova', 1, { seme: 'x', contatore: 0, tira: () => 1 })).toMatch(/Nessun effetto su Sara: è immune a paralizzato/);
  });
});
