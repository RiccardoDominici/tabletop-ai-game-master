/**
 * The first sentence of a turn's audio never waits for the yes/no judge (docs/coerenza.md, «First audio»): round 3 of
 * the coherence layer waited 0.9–2.5 s for the answer on a flagged first sentence in 6 of 15 turns. Here narraTurno
 * runs with a fake narrator, a fake voice queue and the real judge on a fake model whose answer is held until the test
 * releases it: the Engine's line for the flagged mention must be in the voice before the answer comes. Invented
 * fixture: Ruggero the bandit (alias «sgherro»), dead; Ida standing.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import pino from 'pino';
import { GiudiceDomande } from '../src/coerenza/giudice';
import { contestoMenzioni } from '../src/coerenza/menzioni';
import type { Registro } from '../src/coerenza/registro';
import { impostaLingua } from '../src/lingua';
import type { ModelloLinguaggio } from '../src/llm/modello';
import type { Narratore } from '../src/llm/tipi';
import { MisuratoreTurno } from '../src/metriche/misure';
import { narraTurno, type ParametriTurno } from '../src/turni/narrazione';
import { guardiaAttori } from '../src/coerenza/attori';
import type { CorrezioneEsito } from '../src/narrazione/guardia-esiti';
import type { PipelineVoce } from '../src/voce/pipeline';

const registro: Registro = {
  turno: 4,
  scena: 'scena_ponte',
  entita: [
    { id: 'pg_ida', tipo: 'pg', nome: 'Ida Marchi', nomi: ['Ida Marchi', 'Ida'], stato: 'in_piedi', presenza: 'in_scena', uscito: null },
    { id: 'png_ruggero', tipo: 'png', nome: 'Ruggero', nomi: ['ruggero', 'sgherro'], stato: 'morto', presenza: 'in_scena', uscito: null },
  ],
  fatti: [],
  esiti: [],
  negati: [],
};

/** A fast model whose answers wait for `libera`, in order. */
function trattenuto(): { modello: ModelloLinguaggio; libera: (r: 'si' | 'no') => void; chieste: () => number } {
  const attese: Array<(r: 'si' | 'no') => void> = [];
  let n = 0;
  const modello = {
    provider: 'finto',
    modello: 'finto',
    capacita: { strutturato: true, preriscalda: false },
    descrizione: 'finto',
    chiedi: async () => {
      n += 1;
      const r = await new Promise<'si' | 'no'>((ok) => attese.push(ok));
      return { testo: JSON.stringify({ risposta: r }), modello: 'finto', stopReason: 'end_turn', uso: { input_tokens: 0, output_tokens: 0 }, costo: { costo_usd: 0 }, id: null };
    },
    flusso: async () => ({}),
  } as unknown as ModelloLinguaggio;
  return { modello, libera: (r) => attese.shift()?.(r), chieste: () => n };
}

function narratore(testo: string): Narratore {
  return {
    nome: 'finto',
    modello: 'finto',
    narra: async (_r, onTesto) => {
      onTesto(testo);
      return { testo, modello: 'finto', stopReason: 'end_turn', uso: { input_tokens: 0, output_tokens: 0 } as never, costo: { costo_usd: 0 } as never, idMessaggio: null };
    },
  };
}

async function turno(testo: string, risposta: 'si' | 'no', altro: Partial<ParametriTurno> = {}): Promise<{ primaDellaRisposta: string[]; dopo: string[] }> {
  const voce: string[] = [];
  const pipeline = { accoda: (f: { testo: string }) => voce.push(f.testo), effettoFineTurno: () => undefined } as unknown as PipelineVoce;
  const campagna = { png: [{ id: 'png_ruggero', nome: 'Ruggero', voce_id: 'v_ruggero' }], pg: [{ id: 'pg_ida', nome: 'Ida Marchi' }], alias: {} } as never;
  const m = trattenuto();
  const giudice = new GiudiceDomande({ modello: m.modello, ms: 2000, registro, contesto: contestoMenzioni(registro, [], [], []), ombra: () => null, log: pino({ level: 'silent' }) as never, turno: 4 });
  const fatto = narraTurno(
    { campagna, narratore: narratore(testo), pipeline, log: pino({ level: 'silent' }) as never },
    {
      turno: 4,
      sistema: [],
      messaggio: '',
      signal: new AbortController().signal,
      misuratore: new MisuratoreTurno(4, 0, 0, 'mock', 0),
      ora: () => Date.now(),
      onFrase: () => undefined,
      pronuncia: (t) => t,
      giudice,
      lineeDette: new Set(),
      ...altro,
    },
  );
  // The answer is held: whatever is in the voice now did not wait for it.
  for (let k = 0; k < 20 && m.chieste() === 0; k++) await new Promise((r) => setTimeout(r, 5));
  await new Promise((r) => setTimeout(r, 10));
  const primaDellaRisposta = [...voce];
  m.libera(risposta);
  // A second question (the next sentence, carried) answers «no».
  for (let k = 0; k < 20; k++) {
    await new Promise((r) => setTimeout(r, 5));
    m.libera('no');
  }
  await fatto;
  return { primaDellaRisposta, dopo: voce };
}

beforeAll(() => impostaLingua('it'));

describe('the first sentence does not wait for the judge', () => {
  it('a flagged first sentence: the Engine line is in the voice before the answer; «si» drops the sentence', async () => {
    const r = await turno('[narratore] Lo sgherro sputa nel fiume.\n[narratore] Ida guarda il ponte.\n[invito] tutti', 'si');
    expect(r.primaDellaRisposta).toEqual(['Ruggero giace a terra, senza vita.']);
    expect(r.dopo).toEqual(['Ruggero giace a terra, senza vita.', 'Ida guarda il ponte.']);
  });

  it('«no»: the line was true anyway and the sentence follows it', async () => {
    const r = await turno('[narratore] Ida guarda il corpo dello sgherro.\n[invito] tutti', 'no');
    expect(r.primaDellaRisposta).toEqual(['Ruggero giace a terra, senza vita.']);
    expect(r.dopo).toEqual(['Ruggero giace a terra, senza vita.', 'Ida guarda il corpo dello sgherro.']);
  });

  it('a sentence after the first waits for its answer (the voice has slack)', async () => {
    const r = await turno('[narratore] Il vento soffia sul ponte.\n[narratore] Lo sgherro sputa nel fiume.\n[invito] tutti', 'si');
    expect(r.primaDellaRisposta).toEqual(['Il vento soffia sul ponte.']);
    expect(r.dopo).toEqual(['Il vento soffia sul ponte.', 'Ruggero giace a terra, senza vita.']);
  });
});

/** The rules before the judge: the unnamed actor of the visit (Ida's card on Ruggero at turn 2), and a named act. */
function regole(): (t: string) => CorrezioneEsito {
  const attori = guardiaAttori({ turno: 4, entita: registro.entita, storia: { carte: [{ turno: 2, chi: 'pg_ida', bersaglio: 'png_ruggero' }], fughe: [] }, fuoriOra: new Set() })!;
  return (t) => attori(t) ?? (t.includes('ride') ? { testo: 'Ruggero giace a terra, senza vita.', motivo: 'fuori_gioco_agisce' } : null);
}

describe('one Engine line once a turn, and never a model rewrite of an unnamed actor', () => {
  it('the rules\' line and the judge\'s are the same line: said once (round 3, T10\'s shape)', async () => {
    const r = await turno('[narratore] Ida para la lancia con lo scudo.\n[narratore] Lo sgherro ringhia e arretra.\n[invito] tutti', 'si', { correggiEsito: regole() });
    expect(r.dopo).toEqual(['Ruggero giace a terra, senza vita.']);
  });

  it('an unnamed actor\'s line is not handed to the repair; a named act\'s is', async () => {
    const chieste: string[] = [];
    const ripara = async (x: { frase: string }): Promise<string | null> => (chieste.push(x.frase), null);
    await turno('[narratore] Il vento soffia sul ponte.\n[narratore] Ida para la lancia con lo scudo.\n[invito] tutti', 'no', { correggiEsito: regole(), ripara });
    expect(chieste).toEqual([]);
    await turno('[narratore] Il vento soffia sul ponte.\n[narratore] Ruggero ride piano.\n[invito] tutti', 'no', { correggiEsito: regole(), ripara });
    expect(chieste).toEqual(['Ruggero ride piano.']);
  });
});

describe('the announcement is the player\'s words, not the narrator\'s assertion', () => {
  it('no fact rule on a sentence inside it; the same words as a narrator sentence are judged', async () => {
    const goblin = (t: string): CorrezioneEsito => (t.includes('sgherro') ? { testo: 'Ruggero giace a terra, senza vita.', motivo: 'creatura_inesistente' } : null);
    const dati = { azioni: [{ id_pg: 'pg_ida', nome: 'Ida Marchi', testo: 'Spingo lo sgherro contro il ponte.' }] };
    const r = await turno('[narratore] Ida Marchi dice: «Spingo lo sgherro contro il ponte».\n[narratore] Lo sgherro cade nel fiume.\n[invito] tutti', 'no', { correggiEsito: goblin, dati, giudice: null });
    expect(r.dopo).toEqual(['Ida Marchi dice: «Spingo lo sgherro contro il ponte».', 'Ruggero giace a terra, senza vita.']);
  });
});
