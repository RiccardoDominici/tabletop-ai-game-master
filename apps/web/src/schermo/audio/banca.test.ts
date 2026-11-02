import { describe, expect, it, vi } from 'vitest';
import { BancaAudio } from './banca';
import { bufferFinto } from './contestoFinto';

/** Byte finti: `kb` kilobyte; il primo byte porta la durata decodificata (s). */
function byte(kb: number, durata: number): ArrayBuffer {
  const b = new Uint8Array(kb * 1024);
  b[0] = durata;
  return b.buffer;
}

function banca(o: { maxCompressi?: number; maxDecodificati?: number } = {}) {
  const scarica = vi.fn(async (url: string) => {
    if (url.includes('rotto')) throw new Error('HTTP 404');
    return byte(Number(url.match(/(\d+)kb/)?.[1] ?? 10), Number(url.match(/(\d+)s/)?.[1] ?? 1));
  });
  const decodifica = vi.fn(async (b: ArrayBuffer) => {
    const d = new Uint8Array(b)[0]!;
    if (d === 0) throw new Error('formato sconosciuto');
    return bufferFinto(d, 2, 48000);
  });
  return { b: new BancaAudio(scarica, decodifica, o), scarica, decodifica };
}

describe('BancaAudio', () => {
  it('precarica scarica senza decodificare; prendi decodifica una volta sola', async () => {
    const { b, scarica, decodifica } = banca();
    b.precarica(['/a-10kb-8s.ogg', '/a-10kb-8s.ogg', '/b-20kb-4s.ogg']);
    await vi.waitFor(() => expect(b.statistiche().byteCompressi).toBe(30 * 1024));
    expect(scarica).toHaveBeenCalledTimes(2);
    expect(decodifica).not.toHaveBeenCalled();
    const [x, y] = await Promise.all([b.prendi('/a-10kb-8s.ogg'), b.prendi('/a-10kb-8s.ogg')]);
    expect(x).toBe(y);
    expect(x?.duration).toBe(8);
    expect(decodifica).toHaveBeenCalledTimes(1);
    expect(scarica).toHaveBeenCalledTimes(2);
    // decodeAudioData stacca il buffer che riceve: deve ricevere una copia, non i byte tenuti.
    expect((decodifica.mock.calls[0]![0] as ArrayBuffer).byteLength).toBe(10 * 1024);
  });

  it('libera il buffer decodificato che non suona più e non serve; tiene i byte compressi', async () => {
    const { b, decodifica } = banca();
    b.tieni(['/a-10kb-8s.ogg']);
    await b.prendi('/a-10kb-8s.ogg');
    await b.prendi('/b-10kb-8s.ogg');
    expect(b.statistiche()).toMatchObject({ decodificati: 2, inUso: 2 });
    b.rilascia('/b-10kb-8s.ogg'); // non voluto: via subito
    expect(b.decodificato('/b-10kb-8s.ogg')).toBe(false);
    b.rilascia('/a-10kb-8s.ogg'); // voluto (luogo corrente o vicino): resta pronto
    expect(b.decodificato('/a-10kb-8s.ogg')).toBe(true);
    b.tieni([]);
    expect(b.statistiche()).toMatchObject({ decodificati: 0, compressi: 2, inUso: 0 });
    // Ritorno: nessun nuovo download, solo una nuova decodifica.
    await b.prendi('/b-10kb-8s.ogg');
    expect(decodifica).toHaveBeenCalledTimes(3);
  });

  it('tetto della memoria decodificata: escono i buffer fermi più vecchi, mai quelli in uso', async () => {
    // 8 s stereo a 48 kHz Float32 = 3 MB circa; tetto 7 MB → al massimo due buffer.
    const { b } = banca({ maxDecodificati: 7 * 1024 * 1024 });
    const urls = ['/a-1kb-8s.ogg', '/b-1kb-8s.ogg', '/c-1kb-8s.ogg'];
    b.tieni(urls);
    for (const u of urls) await b.prendi(u);
    expect(b.statistiche().decodificati).toBe(3); // tutti in uso: nessuno si può togliere
    b.rilascia(urls[0]!);
    expect(b.decodificato(urls[0]!)).toBe(false);
    expect(b.statistiche().byteDecodificati).toBeLessThanOrEqual(7 * 1024 * 1024);
  });

  it('tetto dei byte compressi: escono i più vecchi non voluti', async () => {
    const { b } = banca({ maxCompressi: 25 * 1024 });
    b.precarica(['/a-10kb-1s.ogg', '/b-10kb-1s.ogg', '/c-10kb-1s.ogg']);
    await vi.waitFor(() => expect(b.statistiche().compressi).toBe(2));
    expect(b.statistiche().byteCompressi).toBe(20 * 1024);
  });

  it('download o decodifica falliti: null, contati, e un nuovo tentativo riparte', async () => {
    const { b, scarica } = banca();
    expect(await b.prendi('/rotto.ogg')).toBeNull();
    expect(await b.prendi('/rotto.ogg')).toBeNull();
    expect(scarica).toHaveBeenCalledTimes(2);
    expect(await b.prendi('/z-1kb-0s.ogg')).toBeNull();
    expect(b.statistiche()).toMatchObject({ errori: 3, inUso: 0 });
  });
});
