/**
 * Powers and resources (docs/regole.md §2 «Poteri» and «Risorse»; mechanisms M3 and M4; audit rows C-SP-01, C-CLS-11,
 * C-THF-10, X-SV-04): spells counted by the class's slots and spent when cast, refused with a clear line once gone and
 * back after a rest; a potion off the sheet; arrows; the sneak attack once per target per fight with double damage; the
 * targets' own saves; the rules arbiter and the Engine's pass that call a power by its name. On the invented magia fixture.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { DadiACopione, type FonteDadi } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import { Risorse } from '../src/prove/risorse';
import type { ArbitroProve, DecisioneRegole, IngressoArbitroProve } from '../src/prove/tipi';
import { caricaRegole, leggiSistema } from '../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import { orologioDiSistema } from '../src/turni/orologio';

const MAGIA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'magia');

/** Dice by faces: each kind of die cycles its own values (a d20 never gets a d6's number); others roll 1. */
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

function motore(dadi: number[] | Record<number, number[]>, arbitro: ArbitroProve<DecisioneRegole> | null = null): MotoreProve {
  const c = caricaCampagna(MAGIA);
  const regole = caricaRegole(MAGIA);
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ilaria', 'pg_bruno', 'pg_sara'], nome }), dadi: Array.isArray(dadi) ? new DadiACopione(dadi) : new DadiPerFacce(dadi) });
}

let n = 0;
const azione = (autore: string, testo: string) => ({ id: `a${++n}`, autore, testo, privata: false, revisione: 1 });

describe('the resources state: slots by the class table, prepared copies, the rest', () => {
  it('a level-2 magic-user has two first-level slots; each prepared copy is one cast; a rest gives them back', () => {
    const regole = caricaRegole(MAGIA);
    const schede = caricaSchedeGeneriche(regole.sistema, caricaCampagna(MAGIA));
    const r = new Risorse(regole.sistema, schede);
    const dardo = regole.sistema.poteri!.find((p) => p.id === 'dardo_arcano')!;
    const cura = regole.sistema.poteri!.find((p) => p.id === 'cura_ferite')!;
    expect(r.slotDi(schede.get('pg_ilaria')!)).toEqual([2]);
    expect(r.slotDi(schede.get('pg_bruno')!)).toEqual([1]);
    expect(r.puoLanciare('pg_ilaria', dardo)).toEqual({ ok: true, livello: 1 });
    r.lancia('pg_ilaria', dardo, 1);
    expect(r.restanti('pg_ilaria', 'slot_1')).toBe(1);
    expect(r.incantesimiDi('pg_ilaria')).toEqual(['sonno']);
    expect(r.puoLanciare('pg_ilaria', dardo)).toEqual({ ok: false, motivo: 'non_preparato', livello: 1 });
    // A spell of another class: refused whatever the list says.
    expect(r.puoLanciare('pg_ilaria', cura)).toEqual({ ok: false, motivo: 'classe', livello: null });
    expect(r.puoLanciare('pg_sara', dardo)).toEqual({ ok: false, motivo: 'classe', livello: null });
    const salvato = r.esporta();
    const ripreso = new Risorse(regole.sistema, schede);
    ripreso.importa(salvato);
    expect(ripreso.restanti('pg_ilaria', 'slot_1')).toBe(1);
    expect(ripreso.ricarica('riposo')).not.toEqual([]);
    expect(ripreso.restanti('pg_ilaria', 'slot_1')).toBe(2);
    expect(ripreso.incantesimiDi('pg_ilaria')).toEqual(['dardo_arcano', 'sonno']);
  });

  it('the loader reports a spell with no class level, a save that is not one, an unknown class, a sheet item that is not one', () => {
    const errori: string[] = [];
    leggiSistema({ id: 'x', nome: 'x', licenza: { libera: true }, risoluzione: { tipo: 'd20_cd' }, caratteristiche: [{ id: 'forza' }], difficolta: [{ id: 'n', valore: 10 }], abilita: [{ id: 'mischia', caratteristica: 'forza' }], classi: [{ id: 'mago' }], poteri: [{ id: 'p1', tipo: 'incantesimo', effetti: [{ tipo: 'cura', dadi: '1d4' }] }, { id: 'p2', tipo: 'incantesimo', livello: { bardo: 1 }, salvezza: { abilita: 'mischia' }, effetti: [{ tipo: 'condizione', condizione: 'nessuna' }] }, { id: 'p3', tipo: 'azione' }] }, errori, []);
    const t = errori.join(' | ');
    expect(t).toMatch(/poteri\.p1\.livello: a spell needs \{class: spell level\}/);
    expect(t).toMatch(/poteri\.p2\.livello: «bardo» is not a class of the set/);
    expect(t).toMatch(/poteri\.p2\.salvezza\.abilita: a save of the set/);
    expect(t).toMatch(/condition «nessuna» is not one of the set's/);
    expect(t).toMatch(/poteri\.p3: effetti, or descrittivo: true/);
  });
});

describe('casting through the Engine (rules arbiter): spent, refused when gone, back after a rest', () => {
  it('a damage spell named in the action: the slot is spent, the target hit, the fight opens; the same spell again is refused', async () => {
    const m = motore([4]);
    const r1 = await m.risolvi(1, [azione('pg_ilaria', 'Lancio il dardo arcano contro il brigante')]);
    expect(r1.fatti[0]).toMatch(/Ilaria usa Dardo arcano \(incantesimo di 1° livello: gliene restano 1 di quel livello per oggi\)\. Dardo arcano: Brigante prende 5 danni/);
    expect(r1.tiri[0]).toMatchObject({ chi: 'pg_ilaria', tipo: 'attacco', automatico: true, bersaglio: { id: 'png_brigante' }, danno: { formula: '1d6+1', totale: 5 } });
    expect(m.stato.puntiFerita('png_brigante')!.attuali).toBe(7);
    // A hostile power opens the fight, like an attack.
    expect(m.inCombattimento).toBe(true);
    m.terminaCombattimento();
    const r2 = await m.risolvi(2, [azione('pg_ilaria', 'Lancio ancora il dardo arcano contro il brigante')]);
    expect(r2.fatti[0]).toMatch(/Ilaria non ha Dardo arcano tra gli incantesimi preparati per oggi: nessun incantesimo parte/);
    expect(r2.tiri).toEqual([]);
    expect(m.stato.puntiFerita('png_brigante')!.attuali).toBe(7);
    // The rest gives the prepared copy and the slot back.
    expect(m.riposo('notte')).toMatchObject({ ok: true, fatto: expect.stringMatching(/Gli incantesimi e le risorse del riposo tornano/) });
    const r3 = await m.risolvi(3, [azione('pg_ilaria', 'Lancio il dardo arcano contro il brigante')]);
    expect(r3.fatti.join(' ')).toMatch(/Ilaria usa Dardo arcano/);
    // The snapshot keeps the counts across a restart.
    expect(m.esporta().risorse?.contatori.find(([id]) => id === 'pg_ilaria')?.[1]).toEqual([['slot_1', 1]]);
  });

  it('even when the model arbiter calls it an attack, a power named in the action is a power (never an unlimited weapon)', async () => {
    const arbitro: ArbitroProve<DecisioneRegole> = { classifica: async (i: IngressoArbitroProve) => Object.fromEntries(i.azioni.map((a) => [a.id, { id: a.id, tipo: 'attacco', caratteristica: null, abilita: null, mossa: null, potere: null, bersaglio: 'png_brigante', arma: 'pugnale', prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null } as DecisioneRegole])) };
    const m = motore([3], arbitro);
    const r = await m.risolvi(1, [azione('pg_ilaria', 'Lancio il dardo arcano contro il brigante')]);
    expect(r.fatti[0]).toMatch(/Ilaria usa Dardo arcano/);
    expect(r.tiri[0]).toMatchObject({ automatico: true, danno: { totale: 4 } });
  });

  it('an area spell: each target within the limit rolls its own save (the Game Master’s side), the too strong and the immune are said', async () => {
    // The brigante's save: 17 + 0 against guerriero 3 «magia» 15: saved, so no effect on him.
    const m = motore([17]);
    const r = await m.risolvi(1, [azione('pg_ilaria', 'Lancio sonno sui briganti')]);
    const f = r.fatti.join(' ');
    expect(f).toMatch(/Ilaria usa Sonno/);
    expect(f).toMatch(/Sonno non ha effetto su Scheletro/);
    expect(f).toMatch(/Brando è troppo potente per Sonno/);
    expect(f).toMatch(/Brigante resiste a Sonno \(tiro salvezza riuscito\)/);
    const salvezza = r.tiri.find((t) => t.tipo === 'salvezza')!;
    expect(salvezza).toMatchObject({ chi: 'png_brigante', nascosta: true, contro: { valore: 15 } });
    // The NPC's save stays off the table's cards; the Game Master panel has it.
    expect(m.tiriPubblici().some((t) => t.tipo === 'salvezza')).toBe(false);
    expect(m.tiriDelMaster().some((t) => t.tipo === 'salvezza' && t.chi === 'png_brigante')).toBe(true);
  });

  it('a healing spell on an ally, a potion off the sheet; once gone, a clear refusal', async () => {
    const m = motore([5]);
    m.stato.danneggia('pg_sara', 7);
    const r = await m.risolvi(1, [azione('pg_bruno', 'Uso cura ferite su Sara')]);
    expect(r.fatti[0]).toMatch(/Bruno usa Cura ferite .*Cura ferite: Sara recupera 6 punti ferita; Sara ha 7 punti ferita su 8/);
    expect(r.tiri[0]).toMatchObject({ tipo: 'prova', cura: true, bersaglio: { id: 'pg_sara' } });
    m.stato.danneggia('pg_bruno', 4);
    const p1 = await m.risolvi(2, [azione('pg_bruno', 'Bevo la pozione')]);
    expect(p1.fatti[0]).toMatch(/Bruno usa Pozione di cura \(ne restano 0\)\. Pozione di cura: Bruno recupera 4 punti ferita/);
    const p2 = await m.risolvi(3, [azione('pg_bruno', 'Bevo la pozione')]);
    expect(p2.fatti[0]).toMatch(/Bruno non ha più Pozione di cura: non succede niente/);
  });
});

describe('arrows and the sneak attack', () => {
  it('each shot spends an arrow; with none left the attack is refused', async () => {
    const m = motore({ 20: [12], 6: [3] });
    await m.risolvi(1, [azione('pg_sara', "Tiro con l'arco corto al brigante")]);
    m.terminaCombattimento();
    await m.risolvi(2, [azione('pg_sara', "Tiro con l'arco corto al brigante")]);
    m.terminaCombattimento();
    const r = await m.risolvi(3, [azione('pg_sara', "Tiro con l'arco corto al brigante")]);
    expect(r.fatti[0]).toMatch(/Sara non ha più frecce per Arco corto: nessun attacco/);
  });

  it('double damage (twice the weapon’s roll), once per target per fight; then an ordinary attack', async () => {
    // d20 15 hits (13 + 1 Forza 12? no: 12 → 0; 15 ≥ 13); the damage die 3, doubled: 6.
    const m = motore({ 20: [15], 6: [3] });
    const r1 = await m.risolvi(1, [azione('pg_sara', 'Colpisco il brigante con la spada corta alle spalle')]);
    expect(r1.tiri[0]).toMatchObject({ riuscita: true, danno: { totale: 6 } });
    const r2 = await m.risolvi(2, [azione('pg_sara', 'Colpisco il brigante con la spada corta alle spalle')]);
    expect(r2.tiri[0]!.regola).toMatch(/Colpo furtivo già usato contro Brigante in questo scontro: attacco normale/);
    expect(r2.tiri[0]!.danno?.totale).toBe(3);
    // The fight ends: the sneak attack comes back.
    m.terminaCombattimento();
    const r3 = await m.risolvi(3, [azione('pg_sara', 'Colpisco il brigante con la spada corta alle spalle')]);
    expect(r3.tiri[0]!.regola).not.toMatch(/già usato/);
  });
});
