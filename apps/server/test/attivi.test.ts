/**
 * Timed effects (docs/regole.md §2 «Effetti tipati», docs/prove.md §10; audit rows C-SP-02, C-SP-03, C-SP-04): a
 * condition, a bonus or an immunity from a power, with its duration, in and out of a fight. Sleep puts the targets that
 * fail their save to sleep (they lose their turn, count as out for the fight and morale, are always hit, and wake when
 * hurt); charm lasts the scene; Shield raises AC by the kind of attack and blocks the magic missile. On the magia fixture.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { Attivi } from '../src/prove/attivi';
import type { FonteDadi } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import { caricaRegole } from '../src/regole/caricatore';
import { leggiEffetto } from '../src/regole/effetti';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import type { SchedaGenerica } from '../src/regole/tipi';
import { orologioDiSistema } from '../src/turni/orologio';

const MAGIA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'magia');

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

function motore(dadi: Record<number, number[]>, ritocca: (s: Map<string, SchedaGenerica>) => void = () => {}): MotoreProve {
  const c = caricaCampagna(MAGIA);
  const regole = caricaRegole(MAGIA);
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  ritocca(schede);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro: null, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ilaria', 'pg_bruno', 'pg_sara'], nome }), dadi: new DadiPerFacce(dadi) });
}

let n = 0;
const azione = (autore: string, testo: string) => ({ id: `a${++n}`, autore, testo, privata: false, revisione: 1 });

describe('the timed effects state', () => {
  const nomi = { nome: (id: string) => id, nomeCondizione: (id: string) => ({ addormentato: 'Addormentato' })[id] ?? id };
  const dadi: FonteDadi = { seme: 'x', contatore: 0, tira: () => 3 };

  it('rounds by the caster level tick down and end; scene-long ones end at the scene change; a rest ends the rest', () => {
    const a = new Attivi(nomi);
    expect(a.aggiungi('png_x', leggiEffetto({ tipo: 'condizione', condizione: 'addormentato', durata: { round_per_livello: 2 } }, 'x', []) as never, 'Sonno', 2, dadi)).toBe('png_x è addormentato per 4 round.');
    a.aggiungi('png_y', leggiEffetto({ tipo: 'condizione', condizione: 'affascinato', durata: 'scena' }, 'x', []) as never, 'Amicizia', 1, dadi);
    a.aggiungi('pg_a', leggiEffetto({ tipo: 'bonus', a: 'difesa', valore: 3, contro: 'mischia', durata: { round: '1d4', round_per_livello: 1 } }, 'x', []) as never, 'Scudo', 1, dadi);
    expect(a.bonus('pg_a', 'difesa', 'mischia')).toBe(3);
    expect(a.bonus('pg_a', 'difesa', 'distanza')).toBe(0);
    expect(a.condizioni('png_x')).toEqual(['addormentato']);
    for (let i = 0; i < 3; i++) expect(a.passaRound()).toEqual([]);
    // Scudo: 1d4 (3) + 1 = 4 rounds, Sonno 4: both end at the fourth.
    expect(a.passaRound().map((x) => x.id).sort()).toEqual(['pg_a', 'png_x']);
    expect(a.condizioni('png_y')).toEqual(['affascinato']);
    expect(a.cambioScena().map((x) => x.id)).toEqual(['png_y']);
    a.aggiungi('png_z', leggiEffetto({ tipo: 'condizione', condizione: 'addormentato', durata: 'riposo' }, 'x', []) as never, 'X', 1, dadi);
    expect(a.riposo().map((x) => x.id)).toEqual(['png_z']);
    // The snapshot keeps them.
    a.aggiungi('png_x', leggiEffetto({ tipo: 'immunita', a: ['dardo_arcano'], durata: 'permanente' }, 'x', []) as never, 'Talismano', 1, dadi);
    const b = new Attivi(nomi);
    b.importa(a.esporta());
    expect(b.immune('png_x', 'dardo_arcano')).toBe(true);
    expect(b.riposo()).toEqual([]);
  });
});

describe('sleep, charm and shield through the Engine', () => {
  it('sleep: who fails sleeps (loses the turn, counts as out, always hit), wakes when hurt', async () => {
    // d20 2 for the brigante's save (fails against 15); everyone's initiative d6 3.
    const m = motore({ 20: [2], 6: [3] });
    const r = await m.risolvi(1, [azione('pg_ilaria', 'Lancio sonno sui briganti')]);
    expect(r.fatti[0]).toMatch(/Brigante è addormentato per 10 round/);
    expect(m.attivi.condizioni('png_brigante')).toEqual(['addormentato']);
    // No damage, no fight: sleep is not hostile by its data (no damage), the PCs choose what comes next.
    expect(m.inCombattimento).toBe(false);
    // Sara strikes the sleeper with a d20 of 2: hit anyway, and the blow wakes him.
    const colpo = await m.risolvi(2, [azione('pg_sara', 'Colpisco il brigante con la spada corta')]);
    const t = colpo.tiri.find((x) => x.chi === 'pg_sara')!;
    expect(t).toMatchObject({ dado: 2, riuscita: true });
    expect(t.regola).toMatch(/colpito comunque: addormentato/);
    expect(colpo.fatti[0]).toMatch(/Il colpo scuote Brigante: non è più addormentato/);
    expect(m.attivi.condizioni('png_brigante')).toEqual([]);
  });

  it('in a fight a sleeping NPC loses its step and counts as out for the fight’s end', async () => {
    // Only the brigante in the fight: Ilaria attacks him (opening the fight), then he sleeps → the fight ends.
    const m = motore({ 20: [12, 2], 6: [3] }, (s) => {
      s.delete('png_capo');
      s.delete('png_scheletro');
    });
    await m.risolvi(1, [azione('pg_sara', 'Colpisco il brigante con la spada corta')]);
    expect(m.inCombattimento).toBe(true);
    const r = await m.risolvi(2, [azione('pg_ilaria', 'Lancio sonno sul brigante')]);
    expect(m.attivi.condizioni('png_brigante')).toEqual(['addormentato']);
    expect(r.combattimento?.finito).toBeTruthy();
    expect(m.inCombattimento).toBe(false);
  });

  it('charm: a humanoid of few hit dice who fails is charmed for the scene; the immune and the too strong are said', async () => {
    const m = motore({ 20: [3], 6: [3] }, (s) => {
      const ilaria = s.get('pg_ilaria')!;
      s.set('pg_ilaria', { ...ilaria, incantesimi: ['amicizia', 'amicizia'] });
    });
    const r = await m.risolvi(1, [azione('pg_ilaria', 'Lancio amicizia sul brigante')]);
    expect(r.fatti[0]).toMatch(/Brigante è affascinato fino alla fine della scena/);
    const s2 = await m.risolvi(2, [azione('pg_ilaria', 'Lancio amicizia sullo scheletro')]);
    expect(s2.fatti[0]).toMatch(/Amicizia non ha effetto su Scheletro/);
    expect(m.fineScena()).toBe("Finiscono: affascinato di Brigante.");
    expect(m.attivi.condizioni('png_brigante')).toEqual([]);
  });

  it('shield: +3 AC against melee for the caster’s own rounds, and immune to the magic missile', async () => {
    const m = motore({ 20: [12], 6: [3] }, (s) => {
      const ilaria = s.get('pg_ilaria')!;
      s.set('pg_ilaria', { ...ilaria, incantesimi: ['scudo', 'dardo_arcano'] });
    });
    const r = await m.risolvi(1, [azione('pg_ilaria', 'Evoco lo scudo magico')]);
    expect(r.fatti[0]).toMatch(/Ilaria ha \+3 alla Classe d'Armatura contro la mischia per 7 round/);
    expect(m.attivi.bonus('pg_ilaria', 'difesa', 'mischia')).toBe(3);
    expect(m.attivi.bonus('pg_ilaria', 'difesa', 'distanza')).toBe(6);
    expect(m.attivi.immune('pg_ilaria', 'dardo_arcano')).toBe(true);
    // The snapshot keeps it across a restart.
    expect(m.esporta().attivi?.attivi.find(([id]) => id === 'pg_ilaria')?.[1]).toHaveLength(3);
  });
});
