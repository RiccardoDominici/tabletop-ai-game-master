/**
 * Fatti dello scontro che il tavolo deve sentire (prove/fatti-dovuti.ts, docs/combattimento.md): il
 * caso della e2e finale del 10 novembre, col narratore che saltava il PG a 0 punti ferita, il suo tiro
 * contro la morte e i danni inflitti. Il Motore controlla nome + parola chiave e, se manca, aggiunge la
 * riga breve del pacchetto della lingua. In italiano e in inglese, poi col server intero.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { StatoTavolo, TiroMostrato } from '@cantastorie/shared';
import { impostaLingua } from '../src/lingua';
import { diceFatto, fattiDovuti, fattiMancanti, rigaDovuta, TIPI_FATTO_DOVUTO, type FattoDovuto } from '../src/prove/fatti-dovuti';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const CORRADO = { id: 'pg_corrado', nome: 'Corrado Lanzi' };
const RUGGERO = { id: 'png_ruggero', nome: 'Ruggero lo sgherro' };

/** Una carta d'attacco riuscita di `chi` contro `bersaglio` (i campi che contano qui). */
function attacco(chi: { id: string; nome: string }, bersaglio: { id: string; nome: string }, o: Partial<TiroMostrato> = {}): TiroMostrato {
  return {
    id: `t_${chi.id}`,
    turno: 1,
    chi: chi.id,
    nome: chi.nome,
    di_png: chi.id.startsWith('png_'),
    tipo: 'attacco',
    etichetta: 'Spada',
    bersaglio,
    riuscita: true,
    danno: { formula: '1d8+3', dadi: [4], bonus: 3, totale: 7, tipo: 'tagliente', nome_tipo: 'taglienti' },
    a_terra: false,
    privata: false,
    ...o,
  } as TiroMostrato;
}

describe('fatti dovuti dalle carte del turno', () => {
  it('colpi e cadute, uno per creatura (il più grave); niente per i colpi mancati e le azioni private', () => {
    const tiri = [
      attacco(CORRADO, RUGGERO),
      attacco(RUGGERO, CORRADO, { a_terra: true }),
      attacco({ id: 'pg_ida', nome: 'Ida Ferraro' }, RUGGERO, { riuscita: false, danno: null }),
      attacco({ id: 'pg_teo', nome: 'Teo' }, { id: 'png_bertoldo', nome: 'Bertoldo' }, { privata: true }),
    ];
    expect(fattiDovuti(tiri).map((f) => `${f.tipo}:${f.id}`)).toEqual(['colpito:png_ruggero', 'a_terra:pg_corrado']);
    // Il tiro contro la morte nello stesso turno prende il posto della caduta, nella stessa posizione.
    expect(fattiDovuti(tiri, [{ ...CORRADO, esito: 'morente' }]).map((f) => `${f.tipo}:${f.id}`)).toEqual(['colpito:png_ruggero', 'morente:pg_corrado']);
    expect(fattiDovuti([], [{ ...CORRADO, esito: 'morto' }])).toEqual([{ tipo: 'morto', ...CORRADO }]);
  });

  it('a vicenda: chi è colpito e ha colpito porta con sé chi l’ha colpito', () => {
    const f = fattiDovuti([attacco(CORRADO, RUGGERO), attacco(RUGGERO, CORRADO)]);
    expect(f).toEqual([
      { tipo: 'colpito', ...RUGGERO, da: [CORRADO] },
      { tipo: 'colpito', ...CORRADO, da: [RUGGERO] },
    ]);
    // Senza scambio, niente `da`.
    expect(fattiDovuti([attacco(RUGGERO, CORRADO)])).toEqual([{ tipo: 'colpito', ...CORRADO }]);
  });
});

describe('il Motore controlla la narrazione (italiano)', () => {
  const aTerra: FattoDovuto = { tipo: 'a_terra', ...CORRADO };
  const morente: FattoDovuto = { tipo: 'morente', ...CORRADO };
  const colpito: FattoDovuto = { tipo: 'colpito', ...RUGGERO };

  it('il caso della partita: la narrazione non dice la caduta né il tiro contro la morte → righe del Motore', () => {
    const righe = ['Ruggero alza la mazza ferrata.', 'Ida, tocca a te: che fai?'];
    expect(fattiMancanti([colpito, morente], righe).map((f) => f.riga)).toEqual(['Ruggero incassa il colpo.', 'Corrado resta a terra, tra la vita e la morte.']);
    expect(rigaDovuta(aTerra)).toBe('Corrado cade a terra.');
  });

  it('detto per nome (anche breve o soprannome) e parola chiave: niente righe in più', () => {
    expect(fattiMancanti([aTerra], ['Il colpo di Ruggero piega Corrado, che crolla nel fango.'])).toEqual([]);
    expect(fattiMancanti([colpito], ['La spada di Corrado affonda nel fianco dello sgherro, Ruggero barcolla.'])).toEqual([]);
    expect(fattiMancanti([colpito], ['Lo sgherro sputa sangue.'], () => ['sgherro'])).toEqual([]);
    // Il nome senza la parola chiave, o la parola senza il nome, non bastano.
    expect(fattiMancanti([aTerra], ['Corrado guarda il fiume.', 'Qualcuno cade a terra.'])).toHaveLength(1);
  });

  it('colpi a vicenda: «Corrado colpisce Ruggero» racconta un colpo solo, l’altro lo dice il Motore', () => {
    const due = fattiDovuti([attacco(CORRADO, RUGGERO), attacco(RUGGERO, CORRADO)]);
    expect(fattiMancanti(due, ['Corrado colpisce Ruggero alla spalla.']).map((f) => f.riga)).toEqual(['Corrado incassa il colpo.']);
    expect(fattiMancanti(due, ['Corrado colpisce Ruggero alla spalla. Ruggero risponde e lo ferisce, il colpo arriva a Corrado.'])).toEqual([]);
  });

  it('ogni riga del Motore supera il suo stesso controllo', () => {
    for (const tipo of TIPI_FATTO_DOVUTO) {
      const f: FattoDovuto = { tipo, ...CORRADO };
      expect(diceFatto(f, rigaDovuta(f)), tipo).toBe(true);
    }
  });
});

describe('il Motore controlla la narrazione (inglese)', () => {
  beforeAll(() => impostaLingua('en'));
  afterAll(() => impostaLingua('it'));
  const MARA = { id: 'pg_mara', nome: 'Mara Quill' };

  it('righe del pacchetto inglese, e il controllo con le parole inglesi', () => {
    expect(rigaDovuta({ tipo: 'a_terra', ...MARA })).toBe('Mara falls to the ground.');
    expect(rigaDovuta({ tipo: 'colpito', ...MARA })).toBe('Mara takes the blow.');
    expect(fattiMancanti([{ tipo: 'a_terra', ...MARA }], ['The goblin swings its club.']).map((f) => f.riga)).toEqual(['Mara falls to the ground.']);
    expect(fattiMancanti([{ tipo: 'a_terra', ...MARA }], ['The club catches Mara on the temple and she collapses.'])).toEqual([]);
    expect(fattiMancanti([{ tipo: 'morto', ...MARA }], ['Mara’s breath stops: she is dead.'])).toEqual([]);
    for (const tipo of TIPI_FATTO_DOVUTO) {
      const f: FattoDovuto = { tipo, ...MARA };
      expect(diceFatto(f, rigaDovuta(f)), tipo).toBe(true);
    }
  });
});

const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
class Arbitro implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    return Object.fromEntries(i.azioni.map((a) => [a.id, /colpisco/i.test(a.testo) ? { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' } : base(a.id)]));
  }
}

describe('fatti dovuti col server intero', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('il colpo detto dal narratore non si ripete; quello saltato lo dice il Motore, prima dell’invito', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    // T1: Corrado colpisce Ruggero (lo dice il narratore). T2: Ruggero colpisce Corrado (il narratore lo salta).
    const copione = (t: number): string =>
      t === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : t === 1
          ? '[narratore] La spada di Corrado affonda nel fianco di Ruggero.\n[invito] tutti'
          : '[narratore] Ida si tiene pronta, il ferro suona sul ferro.\n[narratore] Corrado, tocca a te: che fai?\n[invito] pg_corrado';
    const { url } = await prova.avvia(cartella, copione, {}, { arbitroProve: new Arbitro(), dadi: new DadiACopione([10, 3, 15, 5, 10, 15, 4, 1]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const corrado = await prova.telefono(url, 'pg_corrado');
    const s1 = await inizia(schermo, ida);
    await agisci(corrado, 'pg_corrado', 'Colpisco Ruggero con la spada', s1.versione_scena);
    await agisci(ida, 'pg_ida', 'Guardo il fiume', s1.versione_scena);
    const s2: StatoTavolo = await attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(s2.trascrizione.map((v) => v.testo).join(' ')).not.toMatch(/incassa/);

    await agisci(ida, 'pg_ida', 'Mi tengo pronta dietro Corrado', s2.versione_scena);
    const s3: StatoTavolo = await attendi(ida, (x) => x.fase === 'finestra' && x.turno === 3);
    const t2 = s3.trascrizione.filter((v) => v.turno === 2 && v.tipo === 'narrazione').map((v) => v.testo);
    expect(t2).toEqual(['Ida si tiene pronta, il ferro suona sul ferro.', 'Corrado incassa il colpo.', 'Corrado, tocca a te: che fai?']);
    const registro = prova.turni();
    expect(registro.find((r) => r['turno'] === 1)?.['fatti_aggiunti']).toEqual([]);
    expect(registro.find((r) => r['turno'] === 2)?.['fatti_aggiunti']).toEqual(['colpito:pg_corrado']);
  });
});
