import { describe, expect, it } from 'vitest';
import type { TiroMostrato } from '@cantastorie/shared';
import {
  DURATA_CODA_MS,
  MASSIMO_CARTE_GRANDI,
  MENO,
  chiaveTiri,
  conSegno,
  contoTiro,
  descriviTiro,
  esitoTiro,
  facciaCasuale,
  giaVisibile,
  indiceDadoScartato,
  livelloPf,
  passoAnimazione,
  sommaDanno,
  testoContro,
  testoCosa,
  testoDanno,
  testoPf,
  testoVantaggio,
  tipoDannoPlurale,
  tiriPubbliciSenzaMiei,
  tiriRecenti,
  turnoInNarrazione,
  vistaTiriSchermo,
} from './tiri';

/** Una prova riuscita di base; ogni test cambia solo ciò che gli serve. */
function tiro(parziale: Partial<TiroMostrato> = {}): TiroMostrato {
  return {
    id: 't1',
    turno: 3,
    chi: 'arianna',
    nome: 'Arianna',
    di_png: false,
    tipo: 'prova',
    etichetta: 'Persuasione (Carisma)',
    dadi: [17],
    dado: 17,
    vantaggio: null,
    motivo_vantaggio: null,
    modificatore: 5,
    totale: 22,
    contro: { tipo: 'CD', valore: 15, descrizione: null },
    bersaglio: null,
    riuscita: true,
    critico: false,
    fallimento_critico: false,
    danno: null,
    a_terra: false,
    privata: false,
    avversario: null,
    ...parziale,
  };
}

describe('testi della carta', () => {
  it('conSegno usa il meno vero', () => {
    expect(conSegno(5)).toBe('+5');
    expect(conSegno(0)).toBe('+0');
    expect(conSegno(-1)).toBe(`${MENO}1`);
    expect(conSegno(-1)).toBe('−1');
  });

  it('testoContro e testoCosa', () => {
    expect(testoContro(tiro())).toBe('CD 15');
    expect(testoContro(tiro({ contro: { tipo: 'CA', valore: 13, descrizione: null } }))).toBe('CA 13');
    expect(testoCosa(tiro())).toBe('Persuasione (Carisma)');
    expect(testoCosa(tiro({ etichetta: 'Balestra leggera', bersaglio: { id: 'g1', nome: 'il goblin' } }))).toBe(
      'Balestra leggera contro il goblin',
    );
  });

  it('esito di prove e salvezze', () => {
    expect(esitoTiro(tiro()).testo).toBe('Riuscita');
    expect(esitoTiro(tiro()).tono).toBe('buono');
    const fallita = esitoTiro(tiro({ tipo: 'salvezza', riuscita: false }));
    expect(fallita.testo).toBe('Fallita');
    expect(fallita.tono).toBe('cattivo');
  });

  it('esito degli attacchi, coi naturali', () => {
    expect(esitoTiro(tiro({ tipo: 'attacco' })).testo).toBe('Colpito');
    expect(esitoTiro(tiro({ tipo: 'attacco', riuscita: false })).testo).toBe('Mancato');
    const critico = esitoTiro(tiro({ tipo: 'attacco', critico: true, dado: 20, dadi: [20] }));
    expect(critico).toMatchObject({ testo: 'Colpo critico', tono: 'buono', speciale: true });
    const uno = esitoTiro(tiro({ tipo: 'attacco', riuscita: false, fallimento_critico: true, dado: 1, dadi: [1] }));
    expect(uno).toMatchObject({ testo: '1 naturale', tono: 'cattivo', speciale: true });
  });

  it('contrapposta tra PG: pareggio a totali uguali', () => {
    const avversario = { nome: 'Bianca', etichetta: 'Atletica (Forza)', dadi: [12], dado: 12, modificatore: 3, totale: 15 };
    expect(esitoTiro(tiro({ tipo: 'contrapposta', totale: 15, riuscita: false, avversario })).testo).toBe('Pareggio');
    expect(esitoTiro(tiro({ tipo: 'contrapposta', totale: 15, riuscita: false, avversario })).tono).toBe('pari');
    expect(esitoTiro(tiro({ tipo: 'contrapposta', totale: 18, riuscita: true, avversario })).testo).toBe('Riuscita');
    expect(esitoTiro(tiro({ tipo: 'contrapposta', totale: 9, riuscita: false, avversario })).testo).toBe('Fallita');
  });

  it('dado scartato col vantaggio e lo svantaggio', () => {
    expect(indiceDadoScartato(tiro())).toBeNull();
    expect(indiceDadoScartato(tiro({ dadi: [17, 9], dado: 17, vantaggio: 'vantaggio' }))).toBe(1);
    expect(indiceDadoScartato(tiro({ dadi: [9, 17], dado: 17, vantaggio: 'vantaggio' }))).toBe(0);
    expect(indiceDadoScartato(tiro({ dadi: [17, 9], dado: 9, vantaggio: 'svantaggio' }))).toBe(0);
    // Facce uguali: se ne scarta una sola, la seconda.
    expect(indiceDadoScartato(tiro({ dadi: [11, 11], dado: 11, vantaggio: 'vantaggio' }))).toBe(1);
  });

  it('testoVantaggio', () => {
    expect(testoVantaggio(tiro())).toBeNull();
    expect(testoVantaggio(tiro({ vantaggio: 'vantaggio', motivo_vantaggio: 'Corrado lo aiuta' }))).toBe(
      'Vantaggio: Corrado lo aiuta',
    );
    expect(testoVantaggio(tiro({ vantaggio: 'svantaggio', motivo_vantaggio: '  ' }))).toBe('Svantaggio');
  });

  it('tipo di danno al plurale', () => {
    expect(tipoDannoPlurale('perforante')).toBe('perforanti');
    expect(tipoDannoPlurale('Contundente')).toBe('contundenti');
    expect(tipoDannoPlurale('tagliente')).toBe('taglienti');
    expect(tipoDannoPlurale('necrotico')).toBe('necrotici');
    expect(tipoDannoPlurale('psichico')).toBe('psichici');
    expect(tipoDannoPlurale('radioso')).toBe('radiosi');
    expect(tipoDannoPlurale('fuoco')).toBe('da fuoco');
    expect(tipoDannoPlurale('veleno')).toBe('da veleno');
    expect(tipoDannoPlurale('perforanti')).toBe('perforanti');
    expect(tipoDannoPlurale('da freddo')).toBe('da freddo');
    expect(tipoDannoPlurale('')).toBe('');
  });

  it('somma e riga del danno', () => {
    const danno = { formula: '1d8+2', dadi: [6], bonus: 2, totale: 8, tipo: 'perforante' };
    expect(sommaDanno(danno)).toBe('6 + 2 = 8');
    expect(testoDanno(danno)).toBe('Danni 1d8+2: 6 + 2 = 8 perforanti');
    expect(testoDanno({ formula: '2d8+2', dadi: [3, 7], bonus: 2, totale: 12, tipo: null })).toBe('Danni 2d8+2: 3 + 7 + 2 = 12');
    expect(sommaDanno({ dadi: [5], bonus: 0, totale: 5 })).toBe('5');
    expect(sommaDanno({ dadi: [4], bonus: -1, totale: 3 })).toBe(`4 ${MENO} 1 = 3`);
    expect(sommaDanno({ dadi: [], bonus: 3, totale: 3 })).toBe('3');
  });

  it('conto del d20 e descrizione intera', () => {
    expect(contoTiro(tiro())).toBe('17 + 5 = 22');
    expect(contoTiro(tiro({ dado: 4, modificatore: -1, totale: 3 }))).toBe(`4 ${MENO} 1 = 3`);
    const attacco = tiro({
      tipo: 'attacco',
      nome: 'Corrado',
      etichetta: 'Balestra leggera',
      bersaglio: { id: 'g1', nome: 'il goblin' },
      contro: { tipo: 'CA', valore: 13, descrizione: null },
      critico: true,
      dado: 20,
      dadi: [20],
      totale: 25,
      danno: { formula: '2d8+3', dadi: [6, 4], bonus: 3, totale: 13, tipo: 'perforante' },
      a_terra: true,
    });
    expect(descriviTiro(attacco)).toBe(
      'Corrado, Balestra leggera contro il goblin: 20 + 5 = 25 contro CA 13. Colpo critico. ' +
        'Danni 2d8+3: 6 + 4 + 3 = 13 perforanti. Il goblin è a terra.',
    );
  });
});

describe('quali carte mostrare', () => {
  const narrazione = { fase: 'narrazione' as const, turno: 3, finestraAperta: false };

  it('turnoInNarrazione: dalla chiusura della finestra alla fine della narrazione', () => {
    expect(turnoInNarrazione(narrazione, 3)).toBe(true);
    expect(turnoInNarrazione({ fase: 'finestra', turno: 3, finestraAperta: false }, 3)).toBe(true);
    // La finestra successiva apre il turno dopo.
    expect(turnoInNarrazione({ fase: 'finestra', turno: 4, finestraAperta: true }, 3)).toBe(false);
    expect(turnoInNarrazione({ fase: 'pausa', turno: 3, finestraAperta: false }, 3)).toBe(false);
    expect(turnoInNarrazione({ fase: 'narrazione', turno: 4, finestraAperta: false }, 3)).toBe(false);
  });

  it('vistaTiriSchermo: grandi in narrazione, compatte dopo, poi nessuna', () => {
    expect(vistaTiriSchermo([], narrazione, null, 0)).toEqual({ modo: 'nessuno', inNarrazione: false });
    expect(vistaTiriSchermo([tiro()], narrazione, null, 0)).toEqual({ modo: 'grandi', inNarrazione: true });
    const tanti = Array.from({ length: MASSIMO_CARTE_GRANDI + 1 }, (_, i) => tiro({ id: `t${i}` }));
    expect(vistaTiriSchermo(tanti, narrazione, null, 0)).toEqual({ modo: 'compatti', inNarrazione: true });
    const dopo = { fase: 'finestra' as const, turno: 4, finestraAperta: true };
    expect(vistaTiriSchermo([tiro()], dopo, null, 5_000).modo).toBe('compatti');
    expect(vistaTiriSchermo([tiro()], dopo, 1_000, 1_000 + DURATA_CODA_MS - 1).modo).toBe('compatti');
    expect(vistaTiriSchermo([tiro()], dopo, 1_000, 1_000 + DURATA_CODA_MS).modo).toBe('nessuno');
  });

  it('chiaveTiri', () => {
    expect(chiaveTiri([tiro({ id: 'a' }), tiro({ id: 'b' })])).toBe('a|b');
    expect(chiaveTiri([])).toBe('');
  });

  it('tiriPubbliciSenzaMiei non ripete le carte della mia azione', () => {
    const pubblici = [tiro({ id: 'a' }), tiro({ id: 'b' }), tiro({ id: 'c' })];
    expect(tiriPubbliciSenzaMiei(pubblici, [{ id: 'b' }]).map((t) => t.id)).toEqual(['a', 'c']);
    expect(tiriPubbliciSenzaMiei(pubblici, undefined)).toHaveLength(3);
    expect(tiriPubbliciSenzaMiei(undefined, [{ id: 'b' }])).toEqual([]);
  });

  it('tiriRecenti: il turno narrato e quello appena prima, non i vecchi', () => {
    const tiri = [tiro({ id: 'a', turno: 2 }), tiro({ id: 'b', turno: 3 })];
    expect(tiriRecenti(tiri, 3).map((t) => t.id)).toEqual(['a', 'b']);
    expect(tiriRecenti(tiri, 4).map((t) => t.id)).toEqual(['b']);
    expect(tiriRecenti(tiri, 5)).toEqual([]);
  });

  it('punti ferita: livello e testo', () => {
    expect(livelloPf({ attuali: 12, massimi: 12 })).toBe('pieni');
    expect(livelloPf({ attuali: 7, massimi: 12 })).toBe('pieni');
    expect(livelloPf({ attuali: 6, massimi: 12 })).toBe('feriti');
    expect(livelloPf({ attuali: 3, massimi: 7 })).toBe('feriti');
    expect(livelloPf({ attuali: 0, massimi: 12 })).toBe('a_terra');
    expect(livelloPf({ attuali: -2, massimi: 12 })).toBe('a_terra');
    expect(testoPf({ attuali: 6, massimi: 12 })).toBe('6/12');
    expect(testoPf({ attuali: -2, massimi: 12 })).toBe('0/12');
  });
});

describe('animazione', () => {
  it('passi in ordine', () => {
    expect(passoAnimazione(-1)).toBe('attesa');
    expect(passoAnimazione(0)).toBe('lancio');
    expect(passoAnimazione(1199)).toBe('lancio');
    expect(passoAnimazione(1200)).toBe('modificatore');
    expect(passoAnimazione(1500)).toBe('totale');
    expect(passoAnimazione(1800)).toBe('esito');
    expect(passoAnimazione(5000)).toBe('fermo');
  });

  it('giaVisibile', () => {
    expect(giaVisibile('lancio', 'modificatore')).toBe(false);
    expect(giaVisibile('modificatore', 'modificatore')).toBe(true);
    expect(giaVisibile('totale', 'esito')).toBe(false);
    expect(giaVisibile('fermo', 'esito')).toBe(true);
  });

  it('facciaCasuale: tra 1 e 20, diversa da quella di prima', () => {
    expect(facciaCasuale(() => 0)).toBe(1);
    expect(facciaCasuale(() => 0.999)).toBe(20);
    expect(facciaCasuale(() => 0, 1)).toBe(2);
    expect(facciaCasuale(() => 0.999, 20)).toBe(1);
    for (let i = 0; i < 200; i++) {
      const f = facciaCasuale();
      expect(f).toBeGreaterThanOrEqual(1);
      expect(f).toBeLessThanOrEqual(20);
    }
  });
});
