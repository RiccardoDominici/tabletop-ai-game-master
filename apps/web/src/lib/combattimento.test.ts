import { describe, expect, it } from 'vitest';
import type { CombattentePubblico, CombattimentoPubblico } from '@tabletop-ai-gm/shared';
import {
  combattenteDi,
  elencoItaliano,
  etichettaRound,
  etichettaStato,
  etichettaTiriMorte,
  iniziali,
  nomiDiTurno,
  ordinaCombattenti,
  testoPf,
  tonoPf,
} from './combattimento';

function combattente(parziale: Partial<CombattentePubblico> & Pick<CombattentePubblico, 'id' | 'nome'>): CombattentePubblico {
  return {
    di_png: false,
    iniziativa: null,
    corrente: false,
    pf: null,
    condizioni: [],
    stato: 'in_gioco',
    tiri_morte: null,
    ...parziale,
  };
}

const scontro: CombattimentoPubblico = {
  round: 2,
  fase: null,
  iniziativa: 'individuale',
  combattenti: [
    combattente({ id: 'ida', nome: 'Ida', corrente: true, pf: { attuali: 9, massimi: 9 } }),
    combattente({ id: 'ruggero', nome: 'Ruggero', di_png: true, pf: { attuali: 3, massimi: 11 } }),
    combattente({ id: 'corrado', nome: 'Corrado', pf: { attuali: 0, massimi: 12 }, stato: 'a_terra' }),
    combattente({ id: 'bertoldo', nome: 'Bertoldo', di_png: true, stato: 'fuggito' }),
  ],
  turno_di: ['ida'],
  azioni: [],
};

describe('ordine della barra', () => {
  it('chi è morto o fuggito va in coda, gli altri restano nell\'ordine del server', () => {
    const ordine = ordinaCombattenti([
      combattente({ id: 'a', nome: 'A', stato: 'morto' }),
      combattente({ id: 'b', nome: 'B' }),
      combattente({ id: 'c', nome: 'C', stato: 'fuggito' }),
      combattente({ id: 'd', nome: 'D', stato: 'a_terra' }),
    ]);
    expect(ordine.map((c) => c.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});

describe('colore della barra dei PF', () => {
  it('verde sopra il 50%, giallo fino al 50% incluso, rosso a 0', () => {
    expect(tonoPf(9, 9)).toBe('verde');
    expect(tonoPf(7, 12)).toBe('verde');
    expect(tonoPf(6, 12)).toBe('giallo');
    expect(tonoPf(3, 11)).toBe('giallo');
    expect(tonoPf(0, 12)).toBe('rosso');
    expect(tonoPf(-2, 12)).toBe('rosso');
  });
});

describe('etichette', () => {
  it('round con e senza fase', () => {
    expect(etichettaRound(2, null)).toBe('Round 2');
    expect(etichettaRound(2, 'movimento')).toBe('Round 2 · fase movimento');
  });

  it('stato: nulla per chi è in gioco, altrimenti la parola', () => {
    expect(etichettaStato('in_gioco')).toBeNull();
    expect(etichettaStato('stabile')).toBeNull();
    expect(etichettaStato('a_terra')).toBe('a terra');
    expect(etichettaStato('morto')).toBe('morto');
    expect(etichettaStato('fuggito')).toBe('fuggito');
  });

  it('PF: numeri per i PG, niente per i PNG', () => {
    expect(testoPf({ di_png: false, pf: { attuali: 7, massimi: 12 } })).toBe('7/12');
    expect(testoPf({ di_png: true, pf: { attuali: 3, massimi: 11 } })).toBeNull();
    expect(testoPf({ di_png: false, pf: null })).toBeNull();
  });

  it('tiri contro la morte: ☠ con i fallimenti, ✓ con i successi', () => {
    expect(etichettaTiriMorte({ successi: 1, fallimenti: 2 })).toBe('☠ 2/3 ✓ 1/3');
  });

  it('iniziali e elenco in italiano', () => {
    expect(iniziali('Ruggero Fondovalle')).toBe('RF');
    expect(iniziali('ida')).toBe('ID');
    expect(iniziali('  ')).toBe('?');
    expect(elencoItaliano(['Ida'])).toBe('Ida');
    expect(elencoItaliano(['Ida', 'Ruggero'])).toBe('Ida e Ruggero');
    expect(elencoItaliano(['Ida', 'Ruggero', 'Corrado'])).toBe('Ida, Ruggero e Corrado');
  });
});

describe('chi tocca e chi è nello scontro', () => {
  it('nomi di turno_di, con l\'id come ripiego', () => {
    expect(nomiDiTurno({ ...scontro, turno_di: ['ida', 'sconosciuto'] })).toEqual(['Ida', 'sconosciuto']);
  });

  it('trova il combattente del proprio PG, o null', () => {
    expect(combattenteDi(scontro, 'corrado')?.nome).toBe('Corrado');
    expect(combattenteDi(scontro, 'arianna')).toBeNull();
  });
});
