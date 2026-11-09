/**
 * Moduli puri delle azioni simultanee: propagazione, spareggio, regole, testi degli avvisi.
 */
import { describe, expect, it } from 'vitest';
import { daSegnalare, percorsoVerso } from '../src/azioni/propagazione';
import { relazioniDaRegole } from '../src/azioni/regole';
import { Spareggio } from '../src/azioni/spareggio';
import { avvisoConflitto, avvisoDipendenza } from '../src/azioni/testi';
import type { Azione, AzioneArbitro } from '../src/azioni/tipi';

function az(id: string, autore: string, dipende_da: string[] = [], stato: Azione['stato'] = 'in_coda', causa: string | null = null): Azione {
  return { id, autore, testo: id, privata: false, inviata_alle: 0, modificata_alle: 0, versione_vista: 1, turno: 1, stato, motivo: null, richiesta: null, dipende_da, conflitti: [], revisione: 1, causa };
}

describe('propagazione', () => {
  it('catena A→B→C: ritirata A segnala B e C, una volta sola', () => {
    const azioni = [az('A', 'pg_a'), az('B', 'pg_b', ['A']), az('C', 'pg_c', ['B']), az('D', 'pg_d')];
    expect(daSegnalare(azioni, 'A')).toEqual(['B', 'C']);
    // Se B e C sono già da confermare per la stessa radice, non si riavvisano.
    const gia = [az('A', 'pg_a'), az('B', 'pg_b', ['A'], 'da_confermare', 'A'), az('C', 'pg_c', ['B'], 'da_confermare', 'A')];
    expect(daSegnalare(gia, 'A')).toEqual([]);
    expect(percorsoVerso(azioni, 'C', 'A')).toEqual(['C', 'B', 'A']);
  });

  it('cambio che non tocca il dipendente: nessun avviso a lui né a valle', () => {
    const azioni = [az('A', 'pg_a'), az('B', 'pg_b', ['A']), az('C', 'pg_c', ['B']), az('E', 'pg_e', ['A'])];
    expect(daSegnalare(azioni, 'A', new Set(['E']))).toEqual(['E']);
    expect(daSegnalare(azioni, 'A', new Set())).toEqual([]);
  });

  it('ignora azioni non vive e cicli', () => {
    const azioni = [az('A', 'pg_a', ['C']), az('B', 'pg_b', ['A']), az('C', 'pg_c', ['B']), az('R', 'pg_r', ['A'], 'ritirata')];
    expect(daSegnalare(azioni, 'A')).toEqual(['B', 'C']);
  });
});

describe('Spareggio', () => {
  const x = (id: string, autore: string, t: number) => ({ id, autore, inviata_alle: t });
  it('prima scrive, prima arriva; entro 1 s ruota tra i giocatori', () => {
    const s = new Spareggio(['pg_a', 'pg_b', 'pg_c']);
    expect(s.vincitore(x('1', 'pg_b', 0), x('2', 'pg_a', 1500))).toBe('1');
    // Pareggi: vince pg_a (puntatore 0), poi la priorità passa a pg_b, poi a pg_c…
    expect(s.vincitore(x('1', 'pg_a', 0), x('2', 'pg_b', 300))).toBe('1');
    expect(s.vincitore(x('1', 'pg_a', 0), x('2', 'pg_b', 300))).toBe('2');
    expect(s.vincitore(x('1', 'pg_c', 300), x('2', 'pg_a', 0))).toBe('1');
  });
  it('ordina per invio, i gruppi entro 1 s a rotazione', () => {
    const s = new Spareggio(['pg_a', 'pg_b', 'pg_c']);
    const ordine = s.ordina([x('3', 'pg_c', 5000), x('2', 'pg_b', 100), x('1', 'pg_a', 600)]).map((a) => a.id);
    expect(ordine).toEqual(['1', '2', '3']); // 100 e 600 pari: pg_a ha la priorità
    const dopo = s.ordina([x('2', 'pg_b', 100), x('1', 'pg_a', 600)]).map((a) => a.id);
    expect(dopo).toEqual(['2', '1']); // ora tocca a pg_b
  });
});

describe('regole', () => {
  const nomi = new Map([
    ['ginestra', 'pg_ginestra'],
    ['corrado', 'pg_corrado'],
    ['assenzio', 'pg_assenzio'],
    ['teodora', 'pg_teodora'],
  ]);
  const a = (id: string, autore: string, testo: string, privata = false): AzioneArbitro => ({ id, autore, nome: autore, testo, privata });
  const coda = [a('a1', 'pg_ginestra', 'vado verso la grata'), a('a2', 'pg_corrado', 'parlo col nano')];

  it('verbo di legame + nome: dipendenza certa dall’azione di quel PG', () => {
    expect(relazioniDaRegole(a('n', 'pg_teodora', 'Seguo Ginestra'), coda, nomi)).toMatchObject({ dipende_da: ['a1'], certo: true });
    expect(relazioniDaRegole(a('n', 'pg_teodora', 'copro corrado con la balestra'), coda, nomi)).toMatchObject({ dipende_da: ['a2'], certo: true });
    expect(relazioniDaRegole(a('n', 'pg_teodora', 'vado insieme a Ginestra'), coda, nomi)).toMatchObject({ dipende_da: ['a1'], certo: true });
  });

  it('«anch’io» certo solo con un candidato; ambiguo con due', () => {
    expect(relazioniDaRegole(a('n', 'pg_teodora', 'anch’io'), [coda[0]!], nomi)).toMatchObject({ dipende_da: ['a1'], certo: true });
    expect(relazioniDaRegole(a('n', 'pg_teodora', 'anche io!'), coda, nomi)).toMatchObject({ dipende_da: [], certo: false, formula: 'anch_io' });
    expect(relazioniDaRegole(a('n', 'pg_teodora', "anch'io come corrado"), coda, nomi)).toMatchObject({ dipende_da: ['a2'], certo: true });
  });

  it('«anche io» in mezzo a una frase non è certo (può essere un paragone)', () => {
    expect(relazioniDaRegole(a('n', 'pg_teodora', 'come ginestra ho fame anche io, ma vado nel retro e mi arrangio'), [coda[0]!], nomi)).toMatchObject({ certo: false });
    expect(relazioniDaRegole(a('n', 'pg_teodora', 'anche io vado verso la grata'), [coda[0]!], nomi)).toMatchObject({ certo: true, dipende_da: ['a1'] });
  });

  it('nome senza legame non è una dipendenza certa; privata altrui mai candidata', () => {
    expect(relazioniDaRegole(a('n', 'pg_teodora', 'saluto Corrado'), coda, nomi)).toMatchObject({ dipende_da: [], certo: false, formula: null });
    expect(relazioniDaRegole(a('n', 'pg_teodora', 'lo seguo'), [a('p', 'pg_assenzio', 'segreto', true)], nomi)).toMatchObject({ dipende_da: [], certo: false });
  });
});

describe('testi degli avvisi', () => {
  it('neutri, con la scelta, senza «Conflitto»', () => {
    const t = avvisoDipendenza({ nomeRadice: 'Ginestra', testoRadice: 'vado avanti', evento: 'ritirata', testoMio: "anch'io vado avanti" });
    expect(t).toBe("Ginestra ha ritirato «vado avanti». La tua «anch'io vado avanti» dipendeva da quella. Confermi, cambi o ritiri?");
    expect(avvisoConflitto({ nomeVincitore: null, testoVincitore: null })).toBe('Qualcun altro ci è arrivato prima. Vuoi cambiare azione?');
    expect(avvisoConflitto({ nomeVincitore: 'Corrado', testoVincitore: 'prendo la chiave' })).not.toMatch(/conflitto/i);
  });
});
