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
    expect(v.verifica(frase('Ruggero ride piano.'))).toEqual({ tipo: 'dici', testo: 'Ruggero giace a terra, senza vita.', voce: 'Ruggero giace a terra, senza vita.' });
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
      giàSentite: new Set(['il mulo sbuffa sul ponte']),
    });
    expect(v.verifica(frase('Fermi tutti.', 'png_ruggero'))).toEqual({ tipo: 'togli' });
    expect(v.verifica(frase('Teo apre il lucchetto in silenzio.'))).toMatchObject({ tipo: 'dici', privato: 'pg_teo' });
    expect(v.verifica(frase('Il sentiero è dietro il mulino.', 'png_bertoldo', 3))).toEqual({ tipo: 'sostituisci', righe: [{ etichetta: 'narratore', testo: 'Bertoldo scuote la testa.' }] });
    expect(v.verifica(frase('Il mulo sbuffa sul ponte.'))).toEqual({ tipo: 'togli' });
    // A turn prompt that names a PC is never a repetition.
    expect(v.verifica(frase('Ida, tocca a te.')).tipo).toBe('dici');
    expect(v.verifica(frase('Ida, tocca a te.')).tipo).toBe('dici');
    const n = v.verifica(frase('Ruggero ha 5 punti ferita e barcolla.'));
    expect(n.tipo === 'dici' && !/5/.test(n.testo)).toBe(true);
    expect(viste.map((x) => x.regola)).toEqual(['R-assente', 'R-privato', 'R-rifiuto', 'R-ripetuta', 'R-numeri']);
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

class ArbitroNessuno implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    return Object.fromEntries(i.azioni.map((a) => [a.id, { id: a.id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null } as DecisioneProva]));
  }
}

describe('the checker with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

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
