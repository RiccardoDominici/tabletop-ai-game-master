/**
 * Hit points, gear, coins, counters and the game clock carried from one session to the next (docs/strati.md, «The cycle
 * between sessions»; sessione/stato-pg.ts): the log's `pg_alla_fine` and `tempo_alla_fine` from the Engine's snapshot,
 * a package's `pg_all_inizio` and `tempo_all_inizio` read and checked, and the Engine starting from them. On the
 * invented bottega fixture.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { ErrorePacchetto, statoAllInizio } from '../src/campagna/pacchetti';
import type { Campagna } from '../src/campagna/tipi';
import { loggerMuto } from '../src/logger';
import type { FonteDadi } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import { caricaRegole } from '../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import { pgAllaFine, secondiDiOra, tempoAllaFine } from '../src/sessione/stato-pg';
import { orologioDiSistema } from '../src/turni/orologio';

const BOTTEGA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'bottega');
const dadi = (): FonteDadi => ({ seme: 'uno', contatore: 0, tira: () => 1 });

function motore(allInizio?: Campagna['statoAllInizio']): MotoreProve {
  const c = caricaCampagna(BOTTEGA);
  const regole = caricaRegole(BOTTEGA);
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro: null, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_aldo', 'pg_bice', 'pg_ciro'], nome }), dadi: dadi(), ...(allInizio ? { allInizio } : {}) });
}

describe('the log: where the PCs and the clock ended', () => {
  it('hit points, items, coins, worn armor, counters, prepared spells, and the day and time', () => {
    const m = motore();
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'compra', oggetto: 'corda' });
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'togli', oggetto: 'scudo' });
    m.impostaPf('pg_bice', 2);
    m.tempoDelMaster({ cosa: 'avanza', durata: { ora: 3 } });
    const foto = m.esporta();
    const fine = pgAllaFine(foto, ['pg_aldo', 'pg_bice', 'pg_ciro'])!;
    const aldo = fine.find((x) => x.id === 'pg_aldo')!;
    expect(aldo).toMatchObject({ pf: 9, monete: { mo: 19, ma: 5 }, indossati: ['maglia'] });
    expect(aldo.oggetti).toMatchObject({ corda: 1, freccia: 12, maglia: 1, scudo: 1, spada: 1 });
    expect(fine.find((x) => x.id === 'pg_bice')).toMatchObject({ pf: 2, contatori: { slot_1: 1 }, incantesimi: ['scintilla'] });
    expect(tempoAllaFine(foto)).toEqual({ giorno: 1, ora: 21, minuto: 0 });
    // Without dice there is nothing to carry.
    expect(pgAllaFine(undefined, ['pg_aldo'])).toBeNull();
  });
});

describe('the package: pg_all_inizio and tempo_all_inizio', () => {
  it('read and checked: PC ids of pg.yaml, whole numbers, lists of ids, a day from 1', () => {
    const ok = statoAllInizio({ pg_all_inizio: { pg_aldo: { pf: 4, monete: { mo: 3 }, indossati: [] } }, tempo_all_inizio: { giorno: 2, ora: 8 } }, ['pg_aldo'], 'sessione.yaml');
    expect(ok).toEqual({ pg: { pg_aldo: { pf: 4, monete: { mo: 3 }, indossati: [] } }, tempo: secondiDiOra({ giorno: 2, ora: 8, minuto: 0 }) });
    expect(() => statoAllInizio({ pg_all_inizio: { pg_zeta: { pf: 1 } } }, ['pg_aldo'], 'x')).toThrow(ErrorePacchetto);
    expect(() => statoAllInizio({ pg_all_inizio: { pg_aldo: { monete: { mo: -1 } } } }, ['pg_aldo'], 'x')).toThrow(/monete/);
    expect(() => statoAllInizio({ tempo_all_inizio: { giorno: 0 } }, ['pg_aldo'], 'x')).toThrow(/tempo_all_inizio/);
    expect(statoAllInizio({}, ['pg_aldo'], 'x')).toBeNull();
  });

  it('the next session starts there: the Engine applies it over the sheets, and again at «Ricomincia»', () => {
    const fine = motore();
    fine.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'oggetto', oggetto: 'freccia', quante: -10 });
    fine.inventarioDelMaster({ tipo: 'inventario', id: 'pg_aldo', cosa: 'togli', oggetto: 'maglia' });
    fine.impostaPf('pg_aldo', 5);
    fine.tempoDelMaster({ cosa: 'avanza', durata: { giorno: 1 } });
    const foto = fine.esporta();
    const pg = Object.fromEntries(pgAllaFine(foto, ['pg_aldo', 'pg_bice', 'pg_ciro'])!.map(({ id, ...s }) => [id, s]));
    const ora = tempoAllaFine(foto)!;
    const m = motore({ pg, tempo: secondiDiOra(ora) });
    expect(m.stato.puntiFerita('pg_aldo')!.attuali).toBe(5);
    expect(m.inventario!.oggetti('pg_aldo').find((x) => x.id === 'freccia')!.quante).toBe(2);
    // No chain mail on: AC 10 + Dexterity 1 + shield 1.
    expect(m.vistaInventario('pg_aldo')!.difesa).toBe(12);
    expect(m.tempo.testoOra()).toBe('giorno 2, 18:00');
    m.impostaPf('pg_aldo', 9);
    m.azzera();
    expect(m.stato.puntiFerita('pg_aldo')!.attuali).toBe(5);
  });
});
