/**
 * Voce drama-3 senza rete: il motore fish con un fetch finto (richiesta, PCM a 44,1 kHz, costo,
 * errori e attese), la riserva (ritentativo, Qwen, solo testo) e la pipeline coi motori espressivi
 * (direzione predefinita, parole a Qwen, frase senza voce, costi del turno, cache delle battute).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AudioFrase } from '@cantastorie/shared';
import { loggerMuto } from '../src/logger';
import { CacheAudio } from '../src/voce/cache-audio';
import { costoFish, MotoreVoceFish, sampleRateDa } from '../src/voce/fish';
import { PipelineVoce, type CostoVoceTurno, type FraseDaDire, type UscitaAudio } from '../src/voce/pipeline';
import type { VoceRegistro } from '../src/voce/registro-voci';
import { MotoreConRiserva } from '../src/voce/riserva';
import { ErroreVoce, type FlussoTts, type MotoreVoce, type RichiestaTts } from '../src/voce/tipi';

const REF = '0123456789abcdef0123456789abcdef';

function fileChiave(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'chiave-'));
  const f = path.join(d, '.env');
  fs.writeFileSync(f, 'ALTRO=1\nOPENROUTER_API_KEY=sk-or-prova-0000000000\n');
  return f;
}

function voci(): Map<string, VoceRegistro> {
  return new Map([
    ['narratore', { id: 'narratore', fish: REF, descrizione: '' }],
    ['vincent', { id: 'vincent', fish: null, descrizione: '' }],
  ]);
}

/** Risposta finta di OpenRouter: PCM a pezzi dispari, con una pausa prima del primo. */
function rispostaPcm(pezzi: number[], primoMs = 0): Response {
  const corpo = new ReadableStream<Uint8Array>({
    async start(c) {
      if (primoMs) await new Promise((r) => setTimeout(r, primoMs));
      for (const n of pezzi) c.enqueue(new Uint8Array(n).fill(1));
      c.close();
    },
  });
  return new Response(corpo, { status: 200, headers: { 'content-type': 'audio/pcm;rate=44100;channels=1' } });
}

async function raccogli(f: FlussoTts): Promise<number> {
  let n = 0;
  for await (const p of f.pezzi) n += p.length;
  return n;
}

describe('motore fish (OpenRouter finto)', () => {
  it('manda modello, reference_id, pcm e il testo espressivo; legge 44,1 kHz; costo per byte', async () => {
    let corpo: Record<string, unknown> = {};
    let auth = '';
    const motore = new MotoreVoceFish({
      fileChiave: fileChiave(),
      voci: voci(),
      log: loggerMuto(),
      fetch: (async (_url: string, init: RequestInit) => {
        corpo = JSON.parse(String(init.body)) as Record<string, unknown>;
        auth = (init.headers as Record<string, string>)['authorization']!;
        return rispostaPcm([301, 1369, 1000]);
      }) as unknown as typeof fetch,
    });
    const espressivo = '[sottovoce] Non venni.';
    const f = await motore.sintetizza({ id: 't1-f0', voce: 'narratore', testo: 'Non venni.', espressivo }, new AbortController().signal);
    expect(corpo).toEqual({ model: 'fish-audio/drama-3', input: espressivo, voice: REF, response_format: 'pcm' });
    expect(auth).toBe('Bearer sk-or-prova-0000000000');
    expect(f.sampleRate).toBe(44_100);
    expect(f.motore).toBe('fish');
    expect(f.byte_testo).toBe(Buffer.byteLength(espressivo));
    expect(f.costo_usd).toBeCloseTo(Buffer.byteLength(espressivo) * 2e-6, 10);
    expect(await raccogli(f)).toBe(2670);
  });

  it('voce senza reference_id → 404 (la pipeline passa alla voce del narratore)', async () => {
    const motore = new MotoreVoceFish({ fileChiave: fileChiave(), voci: voci(), log: loggerMuto(), fetch: (async () => rispostaPcm([10])) as unknown as typeof fetch });
    await expect(motore.sintetizza({ id: 'x', voce: 'vincent', testo: 'Eh?' }, new AbortController().signal)).rejects.toMatchObject({ stato: 404 });
  });

  it('nessun audio entro il limite → ErroreVoce 504; errore HTTP → stato e messaggio', async () => {
    const lento = new MotoreVoceFish({ fileChiave: fileChiave(), voci: voci(), log: loggerMuto(), primoByteMs: 50, fetch: (async () => rispostaPcm([10], 300)) as unknown as typeof fetch });
    await expect(lento.sintetizza({ id: 'x', voce: 'narratore', testo: 'Eh?' }, new AbortController().signal)).rejects.toMatchObject({ stato: 504 });
    const rotto = new MotoreVoceFish({
      fileChiave: fileChiave(),
      voci: voci(),
      log: loggerMuto(),
      fetch: (async () => new Response(JSON.stringify({ error: { message: 'provider giù' } }), { status: 502 })) as unknown as typeof fetch,
    });
    await expect(rotto.sintetizza({ id: 'x', voce: 'narratore', testo: 'Eh?' }, new AbortController().signal)).rejects.toThrow(/502: provider giù/);
  });

  it('tariffa e frequenza', () => {
    expect(costoFish('è').byte).toBe(2);
    expect(costoFish('a'.repeat(1_000_000)).usd).toBeCloseTo(2, 6);
    expect(sampleRateDa('audio/pcm;rate=44100;channels=1')).toBe(44_100);
    expect(sampleRateDa('audio/mpeg')).toBeNull();
  });
});

/** Motore programmabile: fallisce le prime `fallimenti` volte, poi dà 0,1 s di PCM. */
class MotoreProva implements MotoreVoce {
  richieste: RichiestaTts[] = [];
  constructor(
    readonly nome: 'fish' | 'qwen',
    private fallimenti: number,
    readonly espressivo = nome === 'fish',
    private readonly stato = 502,
  ) {}
  async salute() {
    return { pronto: true, modello: this.nome, sample_rate: 24_000, formato: 'pcm_s16le' as const, voci: ['narratore'] };
  }
  async sintetizza(r: RichiestaTts): Promise<FlussoTts> {
    this.richieste.push(r);
    if (this.fallimenti-- > 0) throw new ErroreVoce('guasto finto', this.stato);
    async function* pezzi(): AsyncGenerator<Uint8Array> {
      yield new Uint8Array(4800);
    }
    // Solo drama-3 costa: Qwen non dice né byte né dollari.
    return { sampleRate: 24_000, pezzi: pezzi(), ...(this.nome === 'fish' ? { costo_usd: 0.0001, byte_testo: 50 } : {}) };
  }
}

describe('riserva: ritentativo, Qwen, poi solo testo', () => {
  it('un guasto: ritenta e riesce', async () => {
    const fish = new MotoreProva('fish', 1);
    const m = new MotoreConRiserva(fish, () => null, loggerMuto());
    await m.sintetizza({ id: 'a', voce: 'narratore', testo: 'Ciao.' }, new AbortController().signal);
    expect(fish.richieste).toHaveLength(2);
  });

  it('due guasti: Qwen pronto riceve le sole parole', async () => {
    const fish = new MotoreProva('fish', 2);
    const qwen = new MotoreProva('qwen', 0);
    const m = new MotoreConRiserva(fish, () => qwen, loggerMuto());
    const f = await m.sintetizza({ id: 'a', voce: 'narratore', testo: 'Ciao.', espressivo: '[piano] Ciao.' }, new AbortController().signal);
    expect(f.motore).toBe('qwen');
    expect(qwen.richieste).toEqual([{ id: 'a', voce: 'narratore', testo: 'Ciao.' }]);
  });

  it('crediti finiti (402): nessun ritentativo; senza riserva → 503', async () => {
    const fish = new MotoreProva('fish', 5, true, 402);
    const m = new MotoreConRiserva(fish, () => null, loggerMuto());
    await expect(m.sintetizza({ id: 'a', voce: 'narratore', testo: 'Ciao.' }, new AbortController().signal)).rejects.toMatchObject({ stato: 503 });
    expect(fish.richieste).toHaveLength(1);
  });
});

function uscita(): { u: UscitaAudio; frasi: AudioFrase[]; byte: number[]; turni: number[] } {
  const r = { frasi: [] as AudioFrase[], byte: [] as number[], turni: [] as number[] };
  return {
    ...r,
    u: {
      frase: (m) => r.frasi.push(m),
      pezzo: (p) => r.byte.push((p.pcm as Uint8Array).length),
      fineFrase: () => undefined,
      fineTurno: (f) => r.turni.push(f.turno),
      interrompi: () => undefined,
    },
  };
}

function frase(indice: number, testo: string, extra: Partial<FraseDaDire> = {}): FraseDaDire {
  return { id_frase: `t1-f${indice}`, turno: 1, indice, parlante: 'png_ettore', nome: 'Ettore', voce_id: 'narratore', testo, ...extra };
}

describe('pipeline coi motori espressivi', () => {
  it('drama-3 riceve direzione predefinita e markup; il sottotitolo resta senza; costo a fine turno', async () => {
    const fish = new MotoreProva('fish', 0);
    const costi: CostoVoceTurno[] = [];
    const o = uscita();
    const p = new PipelineVoce({ motore: () => fish, uscita: o.u, log: loggerMuto(), direzione: () => 'burbero', registraCosto: (c) => costi.push(c) });
    p.accoda(frase(0, 'Eh? Lo so io.', { testo_voce: 'Eh? [sigh] Lo so io.' }));
    p.accoda(frase(1, 'Non venni.', { testo_voce: '[commosso] Non venni.' }));
    await p.chiudiTurno(1);
    expect(fish.richieste.map((r) => [r.testo, r.espressivo])).toEqual([
      ['Eh? Lo so io.', '[burbero] Eh? [sigh] Lo so io.'],
      ['Non venni.', '[commosso] Non venni.'],
    ]);
    expect(o.frasi.map((f) => f.testo)).toEqual(['Eh? Lo so io.', 'Non venni.']);
    expect(costi).toHaveLength(1);
    expect(costi[0]).toMatchObject({ tipo: 'voce', turno: 1, frasi: 2, byte_testo: 100, solo_testo: 0, riserva: 0, interrotto: false });
    expect(costi[0]!.costo_usd).toBeCloseTo(0.0002, 8);
  });

  it('a Qwen (non espressivo) vanno solo le parole, e nessuna riga di costo', async () => {
    const qwen = new MotoreProva('qwen', 0);
    const costi: CostoVoceTurno[] = [];
    const p = new PipelineVoce({ motore: () => qwen, uscita: uscita().u, log: loggerMuto(), direzione: () => 'burbero', registraCosto: (c) => costi.push(c) });
    p.accoda(frase(0, 'Lo so io.', { testo_voce: '[piano] Lo <whisper>so</whisper> io.' }));
    await p.chiudiTurno(1);
    expect(qwen.richieste).toEqual([{ id: 't1-f0', voce: 'narratore', testo: 'Lo so io.' }]);
    expect(costi).toEqual([]);
  });

  it('nessuna voce disponibile: la frase si annuncia con un silenzio da lettura e il turno finisce', async () => {
    const fish = new MotoreConRiserva(new MotoreProva('fish', 9), () => null, loggerMuto());
    const costi: CostoVoceTurno[] = [];
    const o = uscita();
    const p = new PipelineVoce({ motore: () => fish, uscita: o.u, log: loggerMuto(), registraCosto: (c) => costi.push(c) });
    p.accoda(frase(0, 'La neve copre il sentiero del Sasso.'));
    const esito = await p.chiudiTurno(1);
    expect(esito.interrotto).toBe(false);
    expect(o.frasi.map((f) => f.testo)).toEqual(['La neve copre il sentiero del Sasso.']);
    const secondi = o.byte.reduce((a, b) => a + b, 0) / 2 / 24_000;
    expect(secondi).toBeGreaterThanOrEqual(1.5);
    expect(o.turni).toEqual([1]);
    expect(costi[0]).toMatchObject({ solo_testo: 1, frasi: 0 });
  });

  it('battuta del repertorio detta dal vivo da drama-3: conservata, la seconda volta dalla cache', async () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-'));
    const cache = new CacheAudio(path.join(d, 'qwen'), path.join(d, 'fish'));
    const fish = new MotoreProva('fish', 0);
    const lungo: MotoreVoce = {
      ...fish,
      nome: 'fish',
      espressivo: true,
      salute: () => fish.salute(),
      sintetizza: async (r) => {
        fish.richieste.push(r);
        async function* pezzi(): AsyncGenerator<Uint8Array> {
          yield new Uint8Array(24_000); // 0,5 s
        }
        return { sampleRate: 24_000, pezzi: pezzi() };
      },
    };
    const p = new PipelineVoce({ motore: () => lungo, uscita: uscita().u, log: loggerMuto(), cache });
    p.accoda(frase(0, 'Eh?', { chiave_cache: 'abc', testo_voce: '[piano] Eh?' }));
    await p.chiudiTurno(1);
    p.accoda({ ...frase(0, 'Eh?', { chiave_cache: 'abc', testo_voce: '[piano] Eh?' }), id_frase: 't2-f0', turno: 2 });
    await p.chiudiTurno(2);
    expect(fish.richieste).toHaveLength(1);
    expect(cache.fish!.voci).toBe(1);
    expect(cache.voci).toBe(0); // la cache di Qwen non si tocca
  });
});
