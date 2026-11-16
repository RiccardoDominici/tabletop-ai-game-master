/**
 * The coherence checker (coerenza/verifica.ts, docs/coerenza.md §3): the guards as named rules in one pipeline, one
 * decision per sentence, one record per violation. Unit cases with stub guards (each guard keeps its own tests), then
 * the whole server: a prewritten line of the repertoire that contradicts the state is corrected too, and every
 * violation is in the narration log with its rule and on the Game Master panel.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { VerificaTurno, type RegoleTurno, type Violazione } from '../src/coerenza/verifica';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { DadiACopione } from '../src/prove/dadi';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

function verificatore(r: Partial<RegoleTurno> = {}): { v: VerificaTurno; viste: Violazione[] } {
  const viste: Violazione[] = [];
  const v = new VerificaTurno({ turno: 4, idPng: new Set(['png_ruggero', 'png_bertoldo']), nomiPg: ['ida', 'teo'], ...r }, (x) => viste.push(x));
  return { v, viste };
}
const frase = (testo: string, etichetta = 'narratore', segmento = 0) => ({ etichetta, testo, voce: testo, segmento });

describe('the checker, rule by rule, in one pipeline', () => {
  it('R-esito and R-fuori: the Engine line once per turn, then the sentence is dropped; each violation recorded', () => {
    const { v, viste } = verificatore({ correggiEsito: (t) => (/ride/.test(t) ? { testo: 'Ruggero giace a terra, senza vita.', motivo: 'fuori_gioco_agisce' } : /crolla/.test(t) ? { testo: 'Ruggero è ancora in piedi.', motivo: 'caduta_senza_fatto' } : null) });
    expect(v.verifica(frase('Ruggero ride piano.'))).toEqual({ tipo: 'dici', testo: 'Ruggero giace a terra, senza vita.', voce: 'Ruggero giace a terra, senza vita.', riparabile: { regola: 'R-fuori', originale: 'Ruggero ride piano.', motivo: 'fuori_gioco_agisce' } });
    expect(v.verifica(frase('Ruggero ride ancora.'))).toEqual({ tipo: 'togli' });
    expect(v.verifica(frase('Ruggero crolla sul ponte.')).tipo).toBe('dici');
    expect(viste.map((x) => [x.regola, x.azione])).toEqual([
      ['R-fuori', 'sostituita'],
      ['R-fuori', 'tolta'],
      ['R-esito', 'sostituita'],
    ]);
    expect(viste[0]).toMatchObject({ turno: 4, etichetta: 'narratore', frase: 'Ruggero ride piano.', sostituto: ['Ruggero giace a terra, senza vita.'] });
  });

  it('R-assente, R-privato, R-rifiuto, R-ripetuta; R-numeri rewrites and goes on', () => {
    const { v, viste } = verificatore({
      presenti: new Set(['png_bertoldo']),
      spostaPrivata: (t) => (/lucchetto/.test(t) ? { id_pg: 'pg_teo', comuni: ['lucch'] } : null),
      rifiutoDopoProva: (et) => (et === 'png_bertoldo' ? [{ etichetta: 'narratore', testo: 'Bertoldo scuote la testa.' }] : null),
      giàSentite: new Set(['il mulo sbuffa sul ponte', 'ida tocca a te']),
    });
    expect(v.verifica(frase('Fermi tutti.', 'png_ruggero'))).toEqual({ tipo: 'togli' });
    expect(v.verifica(frase('Teo apre il lucchetto in silenzio.'))).toMatchObject({ tipo: 'dici', privato: 'pg_teo' });
    expect(v.verifica(frase('Il sentiero è dietro il mulino.', 'png_bertoldo', 3))).toEqual({ tipo: 'sostituisci', righe: [{ etichetta: 'narratore', testo: 'Bertoldo scuote la testa.' }] });
    expect(v.verifica(frase('Il mulo sbuffa sul ponte.'))).toEqual({ tipo: 'togli' });
    // A turn prompt that names a PC comes back across turns; said twice in one answer, the second is dropped.
    expect(v.verifica(frase('Ida, tocca a te.')).tipo).toBe('dici');
    expect(v.verifica(frase('Ida, tocca a te.')).tipo).toBe('togli');
    const n = v.verifica(frase('Ruggero ha 5 punti ferita e barcolla.'));
    expect(n.tipo === 'dici' && !/5/.test(n.testo)).toBe(true);
    expect(viste.map((x) => x.regola)).toEqual(['R-assente', 'R-privato', 'R-rifiuto', 'R-ripetuta', 'R-ripetuta', 'R-numeri']);
    expect(viste[1]).toMatchObject({ azione: 'spostata', id_pg: 'pg_teo' });
  });

  it('a repertoire line: its narrator rows go through the fact rules, the NPC rows do not', () => {
    const { v, viste } = verificatore({ correggiEsito: (t) => (/crolla/.test(t) ? { testo: 'Ruggero è ancora in piedi.', motivo: 'caduta_senza_fatto' } : null) });
    expect(v.verificaBattuta('nar_crollo', { etichetta: 'narratore', testo: 'Ruggero crolla nel fango.' })).toBe('Ruggero è ancora in piedi.');
    expect(v.verificaBattuta('nar_crollo', { etichetta: 'png_ruggero', testo: 'Crollo, crollo!' })).toBeNull();
    expect(v.verificaBattuta('nar_ponte', { etichetta: 'narratore', testo: 'Il ponte trema.' })).toBeNull();
    expect(viste).toEqual([expect.objectContaining({ regola: 'R-esito', azione: 'sostituita', battuta: 'nar_crollo' })]);
  });
});

class ArbitroColpo implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
    return Object.fromEntries(i.azioni.map((a) => [a.id, /colpisco/i.test(a.testo) ? { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' } : base(a.id)]));
  }
}

class ArbitroNessuno implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    return Object.fromEntries(i.azioni.map((a) => [a.id, { id: a.id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null } as DecisioneProva]));
  }
}

describe('the checker with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  /**
   * The targeted repair (docs/coerenza.md §3): Ruggero is dead; the narration has him laugh in its second sentence. The
   * model is asked to fix that sentence with the exact error and the ledger; a fix that passes the fact rules is said
   * instead of the Engine's line, one that does not is not.
   */
  async function partitaConRiparazione(riparazione: string): Promise<{ t3: string[]; registri: Array<Record<string, unknown>>; richiesta: string }> {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    let richiesta = '';
    const copione = (t: number, m: string): string => {
      if (m.includes('## Correggi una frase')) {
        richiesta = m;
        return `[narratore] ${riparazione}`;
      }
      return t === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : t === 3
          ? '[narratore] Corrado si china su Ruggero.\n[narratore] Ruggero alza la testa e ride.\n[narratore] Ida e Corrado si guardano.\n[invito] tutti'
          : '[narratore] Il ferro suona sul ponte.\n[invito] tutti';
    };
    // T1: Corrado 10 + 5 hits Ruggero for 8 + 3 = 11: Ruggero (11 HP) dies with the blow that opens the fight.
    const { url } = await prova.avvia(cartella, copione, { TAGM_RIPARAZIONE: 'si', TAGM_RIPARAZIONE_MS: '2000' }, { arbitroProve: new ArbitroColpo(), dadi: new DadiACopione([10, 8, 15, 5, 10]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const corrado = await prova.telefono(url, 'pg_corrado');
    let s = await inizia(schermo, ida);
    for (const [perCorrado, perIda] of [['Colpisco Ruggero con la spada', 'Guardo il fiume'], ['Aspetto', 'Aspetto'], ['Guardo Ruggero', 'Aspetto']] as const) {
      const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === s.turno + 1);
      await agisci(corrado, 'pg_corrado', perCorrado, s.versione_scena);
      await agisci(ida, 'pg_ida', perIda, s.versione_scena);
      s = await dopo;
    }
    const t3 = s.trascrizione.filter((v) => v.turno === 3 && v.tipo === 'narrazione').map((v) => v.testo);
    return { t3, registri: prova.narrazioni().filter((r) => r['tipo'] === 'violazione' && r['turno'] === 3), richiesta };
  }

  it('the repair that passes the fact rules is said instead of the Engine line, recorded as «riparata»', async () => {
    const { t3, registri, richiesta } = await partitaConRiparazione('Ruggero giace immobile nel fango, gli occhi aperti.');
    expect(t3.join(' ')).toContain('Ruggero giace immobile nel fango, gli occhi aperti.');
    expect(t3.join(' ')).not.toMatch(/ride|senza vita/);
    expect(registri.map((r) => [r['regola'], r['azione']])).toEqual([
      ['R-fuori', 'sostituita'],
      ['R-fuori', 'riparata'],
    ]);
    // The model got the exact sentence, the error and «Cosa è vero adesso».
    expect(richiesta).toContain('«Ruggero alza la testa e ride.»');
    expect(richiesta).toMatch(/fa agire o parlare chi è a terra, morto, fuggito o uscito/);
    expect(richiesta).toContain('## Cosa è vero adesso');
  }, 20_000);

  it('a repair that breaks the same rule is not said: the Engine line stays', async () => {
    const { t3, registri } = await partitaConRiparazione('Ruggero si alza e ride ancora.');
    expect(t3.join(' ')).toContain('Ruggero giace a terra, senza vita.');
    expect(t3.join(' ')).not.toMatch(/ride/);
    expect(registri.map((r) => r['azione'])).toEqual(['sostituita']);
  }, 20_000);

  it('a prewritten line that has a standing NPC fall is corrected, and the violation is logged with its rule', async () => {
    prova = new Prova();
    const crollo = { id: 'nar_crollo', chi: 'narratore', tipo: 'reazione', quando: 'i PG parlano con Ruggero', temi: ['ruggero'], testo: ['[narratore] Ruggero crolla nel fango, senza un grido.'], max_usi: 3 };
    const cartella = prova.campagna('prove', { battute: { 'png_ruggero.yaml': [crollo] } });
    const copione = (t: number): string => (t === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[usa] nar_crollo > pg_ida\n[invito] tutti');
    const { url } = await prova.avvia(cartella, copione, {}, { arbitroProve: new ArbitroNessuno() });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const s1 = await inizia(schermo, ida);
    const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(ida, 'pg_ida', 'Parlo con Ruggero del pedaggio', s1.versione_scena);
    const s2 = await dopo;
    const detto = s2.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(detto).toContain('Ruggero è ancora in piedi.');
    expect(detto.join(' ')).not.toMatch(/crolla/);
    expect(prova.narrazioni().filter((r) => r['tipo'] === 'violazione')).toEqual([expect.objectContaining({ turno: 1, regola: 'R-esito', azione: 'sostituita', battuta: 'nar_crollo' })]);
    const st = await (await prova.master(url)).stato();
    expect(st.coerenza?.violazioni).toEqual([expect.objectContaining({ regola: 'R-esito', sostituto: ['Ruggero è ancora in piedi.'] })]);
  });
});
