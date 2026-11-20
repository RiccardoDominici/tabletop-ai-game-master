/**
 * Typed effects (docs/regole.md §2, «Effetti tipati»; audit gap 1, docs/regole-audit/basic-fantasy-gioco.md P4-13b,
 * P5-50, P5-53, P8-30): hit points change through every source, not only attacks. A fall by the set's table, a trap's
 * attack, damage and healing, save-or-die, a failed scene check's hazard, a rest and the Game Master's hazard from the
 * panel. On an invented fixture: the bx set with a falling table and a rest added.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { DadiACopione } from '../src/prove/dadi';
import { applicaEffetti, type ContestoEffetti } from '../src/prove/effetti';
import { MotoreProve } from '../src/prove/motore';
import { risolviTurnoRegole } from '../src/prove/risolutore-regole';
import { StatoProve } from '../src/prove/stato';
import { leggiSistema } from '../src/regole/caricatore';
import { leggiEffetti, leggiEffetto, formulaAlLivello } from '../src/regole/effetti';
import { passiCaduta, leggiCadute } from '../src/regole/salute';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import { sistemaSrd } from '../src/regole/srd';
import type { RegoleCampagna } from '../src/regole/tipi';
import { orologioDiSistema } from '../src/turni/orologio';

const BX = path.join(import.meta.dirname, 'fixtures', 'campagne', 'bx');

/** The bx set with a falling table (1d6 every 10, to the nearest step, at most 20) and two rests. */
function setConSalute(): RegoleCampagna['sistema'] {
  const d = YAML.parse(fs.readFileSync(path.join(BX, 'regole', 'regole.yaml'), 'utf8')) as Record<string, unknown>;
  d['cadute'] = { dadi: '1d6', ogni: 10, unita: 'piedi', arrotonda: 'vicino', massimo: 20 };
  d['riposo'] = [{ id: 'notte', nome: 'Una notte di sonno', cura: 1 }, { id: 'tutto', nome: 'Riposo pieno', cura: 'tutti' }];
  const errori: string[] = [];
  const s = leggiSistema(d, errori, []);
  expect(errori).toEqual([]);
  return s!;
}

function contesto(stato: StatoProve, dadi: number[], extra: Partial<ContestoEffetti> = {}): ContestoEffetti {
  return { turno: 1, stato, dadi: new DadiACopione(dadi), nome: (id) => id, cadute: setConSalute().cadute!, danni: { nome: 'Punti ferita', aZero: 'a terra' }, log: loggerMuto(), ...extra };
}

const stato = (): StatoProve => new StatoProve(new Map(['pg_a', 'pg_b', 'png_x'].map((id) => [id, { id, pf_massimi: 10 }])));

describe('typed effects: the closed list as data', () => {
  it('reads each kind, and reports what is not one of them', () => {
    const errori: string[] = [];
    const e = leggiEffetti(
      [
        { tipo: 'danno', dadi: '1d6+1', colpi: { ogni_livelli: 3, massimo: 5 } },
        { tipo: 'cura', dadi: '1d6+1' },
        { tipo: 'caduta', altezza: 20 },
        { tipo: 'attacco', bonus: 1, dadi: '1d6+1' },
        { tipo: 'condizione', condizione: 'addormentato', durata: { round_per_livello: 5 }, finisce_se_ferito: true },
        { tipo: 'bonus', a: 'difesa', valore: 3, contro: 'mischia', durata: { round: 5, round_per_livello: 1 } },
        { tipo: 'immunita', a: ['dardo_incantato'], durata: { round: '1d4' } },
        { tipo: 'stabilizza' },
        { tipo: 'morte' },
      ],
      'x',
      errori,
    );
    expect(errori).toEqual([]);
    expect(e.map((x) => x.tipo)).toEqual(['danno', 'cura', 'caduta', 'attacco', 'condizione', 'bonus', 'immunita', 'stabilizza', 'morte']);
    expect(e[4]).toMatchObject({ durata: { tipo: 'round', perLivello: 5 }, finisceSeFerito: true });
    // Game turns of ten minutes: no game clock, so they last the scene.
    expect(leggiEffetto({ tipo: 'condizione', condizione: 'paralizzato', durata: { turni: '2d8' } }, 'y', [])).toMatchObject({ durata: { tipo: 'scena' } });
    leggiEffetti([{ tipo: 'teletrasporto' }, { tipo: 'danno', dadi: 'tanti' }, { tipo: 'bonus', a: 'fortuna', valore: 0 }], 'z', errori);
    expect(errori.join(' | ')).toMatch(/z\[1\]: tipo one of danno/);
    expect(errori.join(' | ')).toMatch(/z\[2\]\.dadi: a dice formula/);
    expect(errori.join(' | ')).toMatch(/z\[3\]\.a: difesa, attacchi, salvezze, danni/);
  });

  it('dice that grow with the caster level: per level, a bonus every n levels, a cap', () => {
    const fuoco = leggiEffetto({ tipo: 'danno', dadi: '1d6', dadi_per_livello: { massimo: 10 } }, 'x', [])!;
    expect(formulaAlLivello(fuoco as never, 5)).toEqual({ numero: 5, facce: 6, bonus: 0 });
    expect(formulaAlLivello(fuoco as never, 14)).toEqual({ numero: 10, facce: 6, bonus: 0 });
    const ferite = leggiEffetto({ tipo: 'cura', dadi: '2d6', bonus_per_livello: { ogni_livelli: 1 } }, 'x', [])!;
    expect(formulaAlLivello(ferite as never, 7)).toEqual({ numero: 2, facce: 6, bonus: 7 });
  });
});

describe('falls by the set’s table', () => {
  it('to the nearest step (Basic Fantasy p. 59) or full steps only (SRD 5.2), capped', () => {
    const bf = leggiCadute({ dadi: '1d6', ogni: 10, unita: 'piedi', arrotonda: 'vicino', massimo: 20 }, [])!;
    expect([4, 5, 14, 15, 30, 250].map((h) => passiCaduta(bf, h))).toEqual([0, 1, 1, 2, 3, 20]);
    const srd = sistemaSrd().cadute!;
    expect([9, 10, 15, 19, 20, 500].map((h) => passiCaduta(srd, h))).toEqual([0, 1, 1, 1, 2, 20]);
    const errori: string[] = [];
    leggiCadute({ dadi: '1d6', ogni: 0 }, errori);
    expect(errori.join(' ')).toMatch(/cadute: \{dadi/);
  });

  it('a fall deals the table’s dice and says the height; too short, nothing', () => {
    const s = stato();
    const r = applicaEffetti({ effetti: [{ tipo: 'caduta', altezza: 15 }], bersaglio: 'pg_a', autore: null, fonte: 'Fossa coperta', livello: 1 }, contesto(s, [4, 3]));
    expect(r.danno).toBe(7);
    expect(s.puntiFerita('pg_a')).toEqual({ attuali: 3, massimi: 10 });
    expect(r.fatti[0]).toMatch(/Fossa coperta \(caduta da 15 piedi\): pg_a prende 7 danni; pg_a ha 3 punti ferita su 10/);
    // The card: the victim's, automatic, with the damage dice; no target, so it never opens a fight.
    expect(r.tiri[0]).toMatchObject({ chi: 'pg_a', tipo: 'attacco', automatico: true, bersaglio: null, danno: { formula: '2d6', dadi: [4, 3], totale: 7 } });
    const lieve = applicaEffetti({ effetti: [{ tipo: 'caduta', altezza: 3 }], bersaglio: 'pg_b', autore: null, fonte: 'Gradino', livello: 1 }, contesto(s, [6]));
    expect(lieve.danno).toBe(0);
    expect(lieve.fatti[0]).toMatch(/pg_b cade da 3 piedi: troppo poco per farsi male/);
  });
});

describe('damage, healing, a trap’s attack, save-or-die', () => {
  it('damage halved by a save, an NPC said only in words; healing up to the maximum', () => {
    const s = stato();
    const r = applicaEffetti({ effetti: [{ tipo: 'danno', dadi: { numero: 2, facce: 6, bonus: 0 }, dadiPerLivello: null, bonusPerLivello: null, colpi: null, tipoDanno: null }], bersaglio: 'png_x', autore: 'pg_a', fonte: 'Palla di fuoco', livello: 1, dimezza: true }, contesto(s, [5, 4]));
    expect(r.danno).toBe(4);
    expect(r.fatti[0]).toMatch(/Palla di fuoco: png_x prende 4 danni \(dimezzati dal tiro salvezza\); png_x è ferito ma regge/);
    // A PC's spell on an NPC: the caster's card aimed at the target (an attack card: it opens the fight).
    expect(r.tiri[0]).toMatchObject({ chi: 'pg_a', di_png: false, tipo: 'attacco', bersaglio: { id: 'png_x' } });
    s.danneggia('pg_b', 8);
    const c = applicaEffetti({ effetti: [{ tipo: 'cura', dadi: { numero: 1, facce: 6, bonus: 1 }, dadiPerLivello: null, bonusPerLivello: null }], bersaglio: 'pg_b', autore: 'pg_a', fonte: 'Cura ferite leggere', livello: 1 }, contesto(s, [6]));
    expect(c.cura).toBe(7);
    expect(s.puntiFerita('pg_b')).toEqual({ attuali: 9, massimi: 10 });
    expect(c.tiri[0]).toMatchObject({ tipo: 'prova', cura: true, automatico: true, danno: { totale: 7 }, bersaglio: { id: 'pg_b' } });
    expect(c.fatti[0]).toMatch(/Cura ferite leggere: pg_b recupera 7 punti ferita; pg_b ha 9 punti ferita su 10/);
  });

  it('healing never brings back the dead (only the Game Master does), and from 0 it calls the fight’s hook', () => {
    const s = stato();
    s.danneggia('pg_a', 10);
    s.segnaUscito('pg_a', 'morto');
    const morto = applicaEffetti({ effetti: [leggiEffetto({ tipo: 'cura', dadi: '1d6+1' }, 'x', [])!], bersaglio: 'pg_a', autore: 'pg_b', fonte: 'Pozione', livello: 1 }, contesto(s, [6]));
    expect(morto.cura).toBe(0);
    expect(s.puntiFerita('pg_a')!.attuali).toBe(0);
    expect(s.fuoriGioco('pg_a')).toBe('morto');
    expect(morto.fatti[0]).toMatch(/pg_a è morto: Pozione non lo riporta in vita/);
    s.danneggia('pg_b', 10);
    const rialzati: string[] = [];
    applicaEffetti({ effetti: [leggiEffetto({ tipo: 'cura', dadi: '1d6+1' }, 'x', [])!], bersaglio: 'pg_b', autore: null, fonte: 'Pozione', livello: 1 }, contesto(s, [2], { dopoCura: (id) => rialzati.push(id) }));
    expect(s.puntiFerita('pg_b')!.attuali).toBe(3);
    expect(rialzati).toEqual(['pg_b']);
  });

  it('a trap attacks like a monster: d20 + its bonus against the victim’s AC', () => {
    const s = stato();
    const trappola = leggiEffetto({ tipo: 'attacco', bonus: 1, dadi: '1d6+1' }, 'x', [])!;
    const colpo = applicaEffetti({ effetti: [trappola], bersaglio: 'pg_a', autore: null, fonte: 'Trappola a dardo', livello: 1 }, contesto(s, [13, 3], { difesa: () => 14 }));
    expect(colpo.tiri[0]).toMatchObject({ automatico: false, dado: 13, modificatore: 1, totale: 14, contro: { tipo: 'CA', valore: 14 }, riuscita: true, danno: { totale: 4 } });
    expect(colpo.fatti.join(' ')).toMatch(/Trappola a dardo attacca pg_a \(d20 \+1 contro CA 14: 14\) → COLPISCE/);
    const mancato = applicaEffetti({ effetti: [trappola], bersaglio: 'pg_b', autore: null, fonte: 'Trappola a dardo', livello: 1 }, contesto(s, [12], { difesa: () => 14 }));
    expect(mancato.danno).toBe(0);
    expect(mancato.fatti[0]).toMatch(/→ MANCA/);
  });

  it('save-or-die: the target is dead, out of play for good', () => {
    const s = stato();
    const r = applicaEffetti({ effetti: [{ tipo: 'morte' }], bersaglio: 'png_x', autore: null, fonte: 'Ago avvelenato', livello: 1 }, contesto(s, [1]));
    expect(s.fuoriGioco('png_x')).toBe('morto');
    expect(s.puntiFerita('png_x')!.attuali).toBe(0);
    expect(r.fatti[0]).toMatch(/png_x muore: Ago avvelenato/);
  });
});

describe('a failed scene check’s hazard, a rest, the Game Master’s hazard', () => {
  const nome = (id: string): string => id;

  it('the PC who fails the scene check takes the hazard’s effects; one who succeeds does not', () => {
    const s = setConSalute();
    const c = caricaCampagna(BX);
    const schede = caricaSchedeGeneriche(s, c);
    const st = new StatoProve(schede);
    const ps = [{ id: 'p_fossa', quando: 'un PG attraversa il pavimento marcio', caratteristica: 'destrezza', abilita: null, mossa: null, difficolta: 'normale', se_fallisce: 'il pavimento cede', parole: [], nome: 'Fossa coperta', effetti: [leggiEffetto({ tipo: 'caduta', altezza: 10 }, 'x', [])!] }];
    const decisione = (id: string) => ({ id, tipo: 'prova' as const, caratteristica: null, abilita: null, mossa: null, bersaglio: null, arma: null, prova_scena: 'p_fossa', difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
    // d20 3 (+2 Destrezza 14) against 13: fails; then 1d6 = 5 of the fall. Then a 15: succeeds, nothing.
    const dadi = new DadiACopione([3, 5, 15]);
    const ctx = contesto(st, [5]);
    const r = risolviTurnoRegole({ turno: 1, sistema: s, schede, stato: st, dadi, proveScena: ps, nome, esiste: () => true, log: loggerMuto(), effetti: { ...ctx, dadi }, azioni: [{ id: 'a1', autore: 'pg_corrado', testo: 'Attraverso il pavimento', privata: false }, { id: 'a2', autore: 'pg_ida', testo: 'Attraverso anch’io', privata: false }], decisioni: new Map([['a1', decisione('a1')], ['a2', decisione('a2')]]) } as never);
    expect(st.puntiFerita('pg_corrado')).toEqual({ attuali: 3, massimi: 8 });
    expect(st.puntiFerita('pg_ida')).toEqual({ attuali: 8, massimi: 8 });
    expect(r.fatti[0]).toMatch(/Prezzo del fallimento: il pavimento cede\. Fossa coperta \(caduta da 10 piedi\): pg_corrado prende 5 danni/);
    expect(r.perAzione.get('a1')!.tiri.map((t) => t.automatico ?? false)).toEqual([false, true]);
  });

  it('a rest heals every living character by the set’s rule, never the dead, and tells the narrator next turn', async () => {
    const s = setConSalute();
    const c = caricaCampagna(BX);
    const schede = caricaSchedeGeneriche(s, c);
    const m = new MotoreProve({ schede: new Map(), regole: { regole: { sistema: s, riassunto: '', estratti: [], cartella: null, avvisi: [] }, schede }, arbitro: null, riserva: false, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ida', 'pg_corrado'], nome }), dadi: new DadiACopione([4]) });
    m.stato.danneggia('pg_ida', 5);
    m.stato.danneggia('pg_corrado', 8);
    m.stato.segnaUscito('pg_corrado', 'morto');
    expect(m.combattimentoMaster().riposi).toEqual([{ id: 'notte', nome: 'Una notte di sonno' }, { id: 'tutto', nome: 'Riposo pieno' }]);
    const r = m.riposo('notte');
    expect(r).toEqual({ ok: true, fatto: 'Riposo (Una notte di sonno): pg_ida recupera 1 punti ferita (4 su 8).' });
    expect(m.stato.puntiFerita('pg_ida')!.attuali).toBe(4);
    expect(m.stato.puntiFerita('pg_corrado')!.attuali).toBe(0);
    expect(m.riposo('tutto')).toMatchObject({ ok: true });
    expect(m.stato.puntiFerita('pg_ida')!.attuali).toBe(8);
    expect(m.riposo('settimana')).toEqual({ ok: false, motivo: 'sconosciuto' });
    // The facts reach the narrator in the next resolved turn, first; the snapshot keeps them meanwhile.
    expect(m.esporta().fatti_in_sospeso).toHaveLength(2);
    const turno = await m.risolvi(2, []);
    expect(turno.fatti.slice(0, 2).join(' ')).toMatch(/Riposo \(Una notte di sonno\).*Riposo \(Riposo pieno\)/);
    expect(m.esporta().fatti_in_sospeso).toBeUndefined();
  });

  it('the Game Master’s hazard from the panel: a fall by the table, damage by a formula; a malformed one is refused', () => {
    const s = setConSalute();
    const c = caricaCampagna(BX);
    const schede = caricaSchedeGeneriche(s, c);
    const m = new MotoreProve({ schede: new Map(), regole: { regole: { sistema: s, riassunto: '', estratti: [], cartella: null, avvisi: [] }, schede }, arbitro: null, riserva: false, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ida'], nome }), dadi: new DadiACopione([6, 2]) });
    expect(m.effettoDelMaster('pg_ida', 'caduta', 20, 'Frana', 3)!.fatti[0]).toMatch(/Frana \(caduta da 20 piedi\): pg_ida prende 8 danni/);
    expect(m.stato.puntiFerita('pg_ida')!.attuali).toBe(0);
    expect(m.tiriDelMaster().at(-1)).toMatchObject({ chi: 'pg_ida', automatico: true, danno: { formula: '2d6', totale: 8 } });
    expect(m.effettoDelMaster('pg_ida', 'danno', 'tanti', 'Boh', 3)).toBeNull();
    expect(m.effettoDelMaster('png_nessuno', 'danno', '1d6', 'Boh', 3)).toBeNull();
  });

  it('the SRD set has the same rules as data: its falling table and the long rest', () => {
    const srd = sistemaSrd();
    expect(srd.riposo).toEqual([{ id: 'lungo', nome: 'Riposo lungo', cura: { tipo: 'tutti' }, ricarica: true }]);
    expect(srd.cadute).toMatchObject({ ogni: 10, arrotonda: 'giu', massimo: 20 });
  });
});
