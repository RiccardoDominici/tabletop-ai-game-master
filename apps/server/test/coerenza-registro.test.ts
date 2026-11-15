/**
 * The coherence ledger (coerenza/registro.ts, docs/coerenza.md §1): one read model of the Engine's sources, rebuilt
 * before every model call and check, with a journal of what changed. Invented fixture names; then the whole server: a
 * fall in a fight is in the journal and on the Game Master panel, and a private attack leaves its public consequence
 * (the wound) without revealing the act.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo, TiroMostrato } from '@tabletop-ai-gm/shared';
import { DiarioRegistro } from '../src/coerenza/diario';
import { bandaPf, costruisciRegistro, differenze, type FontiRegistro } from '../src/coerenza/registro';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const carta = (o: Partial<TiroMostrato>): TiroMostrato => ({ id: 't1', turno: 3, chi: 'pg_ida', nome: 'Ida', di_png: false, tipo: 'attacco', etichetta: 'Spada', dadi: [15], dado: 15, vantaggio: null, motivo_vantaggio: null, modificatore: 3, totale: 18, contro: { tipo: 'CA', valore: 13, descrizione: null }, bersaglio: { id: 'png_ruggero', nome: 'Ruggero' }, riuscita: true, critico: false, fallimento_critico: false, danno: null, a_terra: false, privata: false, avversario: null, ...o }) as TiroMostrato;

function fonti(o: Partial<FontiRegistro> = {}): FontiRegistro {
  const pf: Record<string, { attuali: number; massimi: number }> = { pg_ida: { attuali: 10, massimi: 10 }, pg_teo: { attuali: 0, massimi: 8 }, png_ruggero: { attuali: 3, massimi: 12 }, png_bertoldo: { attuali: 9, massimi: 9 } };
  const fuori: Record<string, 'a_terra' | 'morto' | 'fuggito'> = { pg_teo: 'a_terra' };
  return {
    turno: 3,
    scena: 'ponte',
    pg: [{ id: 'pg_ida', nome: 'Ida Ferraro', nomi: ['Ida Ferraro', 'Ida'] }, { id: 'pg_teo', nome: 'Teo', nomi: ['Teo'] }],
    png: [
      { id: 'png_ruggero', nome: 'Ruggero lo sgherro', nomi: ['ruggero', 'sgherro'], nascosto: false },
      { id: 'png_bertoldo', nome: 'Bertoldo', nomi: ['bertoldo'], nascosto: false },
      { id: 'png_ombra', nome: 'Ombra', nomi: ['ombra'], nascosto: true },
    ],
    gregari: [],
    presenti: new Set(['png_ruggero', 'png_bertoldo', 'png_ombra']),
    pf: (id) => pf[id] ?? null,
    fuori: (id) => fuori[id] ?? null,
    morenti: new Set(['pg_teo']),
    fatti: [],
    carte: [],
    negati: [],
    ...o,
  };
}

describe('the ledger, from the Engine sources', () => {
  it('state from hit points and the out-of-play marks, presence, a hidden NPC; bands never numbers', () => {
    const r = costruisciRegistro(fonti());
    const di = (id: string) => r.entita.find((e) => e.id === id)!;
    expect(di('pg_ida')).toMatchObject({ tipo: 'pg', stato: 'in_piedi', presenza: 'in_scena' });
    expect(di('pg_teo').stato).toBe('morente');
    expect(di('png_ruggero')).toMatchObject({ stato: 'grave', presenza: 'in_scena' });
    expect(di('png_ombra').stato).toBe('nascosto');
    expect([bandaPf({ attuali: 6, massimi: 12 }), bandaPf({ attuali: 7, massimi: 12 }), bandaPf({ attuali: 3, massimi: 12 }), bandaPf(null)]).toEqual(['ferito', 'in_piedi', 'grave', 'in_piedi']);
    // Dead stays dead; the fled are not in the scene.
    const r2 = costruisciRegistro(fonti({ fuori: (id) => (id === 'png_ruggero' ? 'morto' : id === 'png_bertoldo' ? 'fuggito' : null), presenti: new Set(['png_ruggero']) }));
    expect(r2.entita.find((e) => e.id === 'png_ruggero')!.stato).toBe('morto');
    expect(r2.entita.find((e) => e.id === 'png_bertoldo')).toMatchObject({ stato: 'fuggito', presenza: 'altrove' });
  });

  it('a private attack: the wound is public in the entity state, the act stays private with its knower', () => {
    // Teo stabs Ruggero in private: the body shows the wound to everybody, who did it only Teo knows (lead's note 3).
    const r = costruisciRegistro(
      fonti({
        carte: [carta({ chi: 'pg_teo', nome: 'Teo', privata: true })],
        fatti: [{ chiave: 'azione:3:pg_teo:0', testo: 'Pugnalo Ruggero alle spalle, senza farmi vedere', turno: 3, pubblico: false, conosciutoDa: ['pg_teo'] }],
      }),
    );
    expect(r.entita.find((e) => e.id === 'png_ruggero')!.stato).toBe('grave');
    expect(r.esiti).toEqual([expect.objectContaining({ chi: 'pg_teo', privata: true, riuscita: true })]);
    expect(r.fatti).toEqual([expect.objectContaining({ pubblico: false, conosciutoDa: ['pg_teo'] })]);
  });

  it('the journal: what changed, from what to what, with its cause; the first ledger is only the baseline', () => {
    const d = new DiarioRegistro();
    expect(d.aggiorna(fonti(), 'avvio').nuovi).toEqual([]);
    const { nuovi } = d.aggiorna(fonti({ turno: 4, fuori: (id) => (id === 'png_ruggero' ? 'morto' : id === 'pg_teo' ? 'a_terra' : null) }), 'carte del turno');
    expect(nuovi).toEqual([{ turno: 4, tipo: 'stato', id: 'png_ruggero', da: 'grave', a: 'morto', causa: 'carte del turno' }]);
    expect(differenze(costruisciRegistro(fonti()), costruisciRegistro(fonti({ scena: 'mulino', presenti: new Set(['png_bertoldo']) })), 'cambio di scena').map((e) => [e.tipo, e.id, e.a])).toEqual([
      ['scena', 'mulino', 'mulino'],
      ['presenza', 'png_ruggero', 'altrove'],
      // Hidden is a way of being in the scene: elsewhere, the hidden NPC is simply standing.
      ['stato', 'png_ombra', 'in_piedi'],
      ['presenza', 'png_ombra', 'altrove'],
    ]);
    // Saved and resumed: the history comes back, the next ledger is a new baseline.
    const copia = new DiarioRegistro();
    copia.importa(JSON.parse(JSON.stringify(d.esporta())));
    expect(copia.storia).toHaveLength(1);
    expect(copia.aggiorna(fonti(), 'ripresa').nuovi).toEqual([]);
  });
});

class Arbitro implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
    return Object.fromEntries(i.azioni.map((a) => [a.id, /colpisco|pugnalo/i.test(a.testo) ? { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' } : base(a.id)]));
  }
}

describe('the ledger with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('a fall in a fight is in the journal and on the panel; a private blow leaves its wound public, its act private', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (t: number): string => (t === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[narratore] Il ferro suona.\n[invito] tutti');
    // T1: Corrado 10 + 5 hits Ruggero, 8 + 3 = 11: Ruggero (11 HP) goes to 0 with the blow that opens the fight.
    const { url } = await prova.avvia(cartella, copione, {}, { arbitroProve: new Arbitro(), dadi: new DadiACopione([10, 8, 15, 5, 10]) });
    const schermo = await prova.proiettore(url);
    const corrado = await prova.telefono(url, 'pg_corrado');
    const s1 = await inizia(schermo, corrado);
    const dopo = attendi(corrado, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(corrado, 'pg_corrado', 'Colpisco Ruggero con la spada', s1.versione_scena);
    await dopo;
    const master = await prova.master(url);
    const st = await master.stato();
    expect(st.coerenza?.entita.find((e) => e.id === 'png_ruggero')).toMatchObject({ stato: 'morto', presenza: 'in_scena' });
    expect(st.coerenza?.entita.find((e) => e.id === 'pg_corrado')).toMatchObject({ tipo: 'pg', presenza: 'in_scena' });
    expect(st.coerenza?.eventi).toContainEqual(expect.objectContaining({ tipo: 'stato', id: 'png_ruggero', a: 'morto' }));
  });

  it('a private action is a fact only its author knows, on the panel', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (t: number): string => (t === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[privato pg_teo] Il lucchetto cede.\n[narratore] Il vento soffia.\n[invito] tutti');
    const { url } = await prova.avvia(cartella, copione, {}, { arbitroProve: new Arbitro() });
    const schermo = await prova.proiettore(url);
    const teo = await prova.telefono(url, 'pg_teo');
    const s1 = await inizia(schermo, teo);
    const dopo = attendi(teo, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(teo, 'pg_teo', 'Apro di nascosto il lucchetto della cassetta', s1.versione_scena, true);
    await dopo;
    const st = await (await prova.master(url)).stato();
    expect(st.coerenza?.privati.map((p) => [p.testo, p.conosciuto_da])).toEqual([
      ['Il lucchetto cede.', ['pg_teo']],
      ['Apro di nascosto il lucchetto della cassetta', ['pg_teo']],
    ]);
  });
});
