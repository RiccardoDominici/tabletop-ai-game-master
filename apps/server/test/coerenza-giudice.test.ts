/**
 * The yes/no judge (coerenza/giudice.ts): a fake model answers «si» or «no», or never in time; the Engine's line once
 * per turn, then the sentence dropped; the sentence after a «si» asked too; on a deadline the rules decide. Invented
 * fixture: Ruggero the bandit (alias «sgherro»), dead; Bertoldo standing.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { GiudiceDomande } from '../src/coerenza/giudice';
import { contestoMenzioni } from '../src/coerenza/menzioni';
import type { Registro } from '../src/coerenza/registro';
import { impostaLingua } from '../src/lingua';
import type { ModelloLinguaggio, RichiestaModello } from '../src/llm/modello';
import pino from 'pino';
import type { CorrezioneEsito } from '../src/narrazione/guardia-esiti';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

/** A fake fast model: `risposta(messaggio)` says «si» / «no», or `null` never answers (a deadline). */
function modello(risposta: (m: string) => 'si' | 'no' | null, viste: string[] = []): ModelloLinguaggio {
  return {
    provider: 'finto',
    modello: 'finto',
    capacita: { strutturato: true, preriscalda: false },
    descrizione: 'finto',
    chiedi: async (q: RichiestaModello) => {
      // Only the sentence under judgement (not the previous one, also in the message).
      const m = /Frase da controllare: «([^»]*)»/u.exec(q.messaggi[0]!.testo)?.[1] ?? '';
      viste.push(q.messaggi[0]!.testo);
      const r = risposta(m);
      if (r === null) {
        await new Promise((_, rifiuta) => q.signal?.addEventListener('abort', () => rifiuta(new Error('aborted')), { once: true }));
      }
      return { testo: JSON.stringify({ risposta: r }), modello: 'finto', stopReason: 'end_turn', uso: { input_tokens: 0, output_tokens: 0 }, costo: { costo_usd: 0 }, id: null } as never;
    },
    flusso: async () => ({}) as never,
  };
}

const registro: Registro = {
  turno: 3,
  scena: 'scena_ponte',
  entita: [
    { id: 'pg_ida', tipo: 'pg', nome: 'Ida Marchi', nomi: ['Ida Marchi', 'Ida'], stato: 'in_piedi', presenza: 'in_scena', uscito: null },
    { id: 'png_ruggero', tipo: 'png', nome: 'Ruggero', nomi: ['ruggero', 'sgherro'], stato: 'morto', presenza: 'in_scena', uscito: null },
    { id: 'png_bertoldo', tipo: 'png', nome: 'Bertoldo', nomi: ['bertoldo'], stato: 'in_piedi', presenza: 'in_scena', uscito: null },
  ],
  fatti: [],
  esiti: [],
  negati: [],
};

function giudice(m: ModelloLinguaggio, ombra: (t: string) => CorrezioneEsito = () => null, ms = 300): GiudiceDomande {
  return new GiudiceDomande({ modello: m, ms, registro, contesto: contestoMenzioni(registro, [], [], []), ombra, log: pino({ level: 'silent' }) as never, turno: 3 });
}

beforeAll(() => impostaLingua('it'));

describe('the yes/no judge', () => {
  it('«si»: the Engine line once, then the sentence dropped; a sentence about nobody is not asked', async () => {
    const viste: string[] = [];
    const g = giudice(modello(() => 'si', viste));
    expect(await g.giudica('Il vento soffia sul ponte.')).toBeNull();
    expect(viste).toHaveLength(0);
    expect(await g.giudica('Ida spinge lo sgherro contro il parapetto.')).toMatchObject({ testo: 'Ruggero giace a terra, senza vita.', regola: 'R-fuori', fonte: 'domanda' });
    expect(await g.giudica('Ruggero ride piano.')).toMatchObject({ testo: '' });
    expect(viste[0]).toContain('Ruggero (Ruggero non è più in vita');
  });

  it('«no»: the sentence stays; the one after a «si» is asked with the same mentions (a carried subject)', async () => {
    const viste: string[] = [];
    const g = giudice(modello((m) => (m.includes('Quello') || m.includes('sputa') ? 'si' : 'no'), viste));
    expect(await g.giudica('Ida guarda il corpo di Ruggero.')).toBeNull();
    expect(await g.giudica('Lo sgherro sputa nel fiume.')).toMatchObject({ testo: 'Ruggero giace a terra, senza vita.' });
    expect(await g.giudica('Quello ride.')).toMatchObject({ testo: '' });
    expect(viste).toHaveLength(3);
  });

  it('a deadline or an error: the rules decide (a rule in observation stays in observation)', async () => {
    const regola = (t: string): CorrezioneEsito => (t.includes('ride') ? { testo: 'Ruggero giace a terra, senza vita.', motivo: 'fuori_gioco_agisce' } : null);
    const g = giudice(modello(() => null), regola, 50);
    expect(await g.giudica('Ruggero ride.')).toMatchObject({ testo: 'Ruggero giace a terra, senza vita.', fonte: 'regole' });
    const osservata = (): CorrezioneEsito => ({ testo: 'x', motivo: 'creatura_inesistente' });
    expect(await giudice(modello(() => null), osservata, 50).giudica('Lo sgherro sputa.')).toBeNull();
  });

  it('a sentence the rules already changed keeps the judge\'s state but is not asked', async () => {
    const viste: string[] = [];
    const g = giudice(modello(() => 'si', viste));
    expect(await g.giudica('Lo sgherro sputa nel fiume.', true)).toBeNull();
    expect(viste).toHaveLength(0);
  });
});

class ArbitroColpo implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
    return Object.fromEntries(i.azioni.map((a) => [a.id, /colpisco/i.test(a.testo) ? { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' } : base(a.id)]));
  }
}

describe('the judge with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the judge decides the public answer: a «si» gives the Engine line, a «no» keeps the sentence (R-fuori in its shadow)', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (t: number): string =>
      t === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : t === 3
          ? '[narratore] Corrado spinge lo sgherro contro il parapetto.\n[narratore] Ruggero alza la testa.\n[narratore] Ida guarda il fiume.\n[invito] tutti'
          : '[narratore] Il ferro suona sul ponte.\n[invito] tutti';
    // The fake model: «si» for the push (R-fuori alone would not see an object), «no» for the head (R-fuori would act).
    const viste: string[] = [];
    const finto = modello((m) => (m.includes('spinge') ? 'si' : 'no'), viste);
    // T1: Corrado kills Ruggero (alias «sgherro»).
    const { url } = await prova.avvia(cartella, copione, {}, { arbitroProve: new ArbitroColpo(), dadi: new DadiACopione([10, 8, 15, 5, 10]), domanda: { modello: () => finto, ms: 1000 } });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const corrado = await prova.telefono(url, 'pg_corrado');
    let s = await inizia(schermo, ida);
    for (const [perCorrado, perIda] of [['Colpisco Ruggero con la spada', 'Guardo il fiume'], ['Aspetto', 'Aspetto'], ['Spingo il corpo verso il parapetto', 'Guardo il fiume']] as const) {
      const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === s.turno + 1);
      await agisci(corrado, 'pg_corrado', perCorrado, s.versione_scena);
      await agisci(ida, 'pg_ida', perIda, s.versione_scena);
      s = await dopo;
    }
    const t3 = s.trascrizione.filter((v) => v.turno === 3 && v.tipo === 'narrazione').map((v) => v.testo);
    expect(t3).toContain('Ruggero giace a terra, senza vita.');
    expect(t3).toContain('Ruggero alza la testa.');
    expect(t3).toContain('Ida guarda il fiume.');
    expect(t3.join(' ')).not.toContain('spinge lo sgherro');
    const viol = prova.narrazioni().filter((r) => r['tipo'] === 'violazione' && r['turno'] === 3);
    // The judge's «si» on the push; R-fuori never acted on «Ruggero alza la testa.» (it is in the judge's shadow). The
    // fake narrator says the same lines again in the repair call of the unanswered action: dropped as said already.
    expect(viol.filter((r) => r['azione'] !== 'osservata').map((r) => [r['regola'], r['azione'], r['frase'], (r['dettaglio'] as { fonte?: string } | undefined)?.fonte])).toEqual([
      ['R-fuori', 'sostituita', 'Corrado spinge lo sgherro contro il parapetto.', 'domanda'],
      ['R-fuori', 'tolta', 'Corrado spinge lo sgherro contro il parapetto.', 'domanda'],
      ['R-ripetuta', 'tolta', 'Ruggero alza la testa.', undefined],
      ['R-ripetuta', 'tolta', 'Ida guarda il fiume.', undefined],
    ]);
  }, 20_000);
});
