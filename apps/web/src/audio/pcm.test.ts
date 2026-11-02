import { describe, expect, it } from 'vitest';
import { comeByte, int16leAFloat32, RiportoByte } from './pcm';

/** Byte s16le di una sequenza di campioni interi. */
function s16le(...campioni: number[]): Uint8Array {
  const byte = new Uint8Array(campioni.length * 2);
  const vista = new DataView(byte.buffer);
  campioni.forEach((c, i) => vista.setInt16(i * 2, c, true));
  return byte;
}

describe('int16leAFloat32', () => {
  it('divide per 32768: estremi e zero', () => {
    const f = int16leAFloat32(s16le(0, 32767, -32768, 16384, -1));
    expect(Array.from(f)).toEqual([0, 32767 / 32768, -1, 0.5, -1 / 32768]);
  });

  it('legge little-endian anche da un offset dispari del buffer', () => {
    const grezzo = new Uint8Array(1 + 4);
    grezzo.set(s16le(1000, -1000), 1);
    const f = int16leAFloat32(grezzo.subarray(1));
    expect(Array.from(f)).toEqual([1000 / 32768, -1000 / 32768]);
  });

  it('ignora un ultimo byte spaiato', () => {
    const byte = new Uint8Array([0x00, 0x40, 0x7f]);
    expect(Array.from(int16leAFloat32(byte))).toEqual([0.5]);
  });

  it('pezzo vuoto → nessun campione', () => {
    expect(int16leAFloat32(new Uint8Array(0)).length).toBe(0);
  });
});

describe('comeByte', () => {
  it('accetta ArrayBuffer e viste senza copiare', () => {
    const buffer = new ArrayBuffer(8);
    expect(comeByte(buffer).byteLength).toBe(8);
    const vista = new Uint8Array(buffer, 2, 4);
    const risultato = comeByte(vista);
    expect(risultato.byteOffset).toBe(2);
    expect(risultato.byteLength).toBe(4);
    expect(risultato.buffer).toBe(buffer);
  });
});

describe('RiportoByte', () => {
  it('pezzi pari passano senza copia', () => {
    const r = new RiportoByte();
    const pezzo = s16le(1, 2);
    expect(r.unisci(pezzo)).toBe(pezzo);
    expect(r.inSospeso).toBe(false);
  });

  it('porta il byte dispari al pezzo successivo: i campioni restano allineati', () => {
    const tutto = s16le(100, -200, 300, -400, 500);
    // Spezzato a confini dispari: 3 + 4 + 3 byte.
    const r = new RiportoByte();
    const a = r.unisci(tutto.subarray(0, 3));
    expect(a.byteLength).toBe(2);
    expect(r.inSospeso).toBe(true);
    const b = r.unisci(tutto.subarray(3, 7));
    expect(b.byteLength).toBe(4);
    expect(r.inSospeso).toBe(true);
    const c = r.unisci(tutto.subarray(7, 10));
    expect(c.byteLength).toBe(4);
    expect(r.inSospeso).toBe(false);

    const campioni = [...int16leAFloat32(a), ...int16leAFloat32(b), ...int16leAFloat32(c)].map((x) =>
      Math.round(x * 32768),
    );
    expect(campioni).toEqual([100, -200, 300, -400, 500]);
  });

  it('un pezzo di un solo byte resta tutto in sospeso', () => {
    const r = new RiportoByte();
    expect(r.unisci(new Uint8Array([0x12])).byteLength).toBe(0);
    expect(r.inSospeso).toBe(true);
    const dopo = r.unisci(new Uint8Array([0x34]));
    expect(Array.from(dopo)).toEqual([0x12, 0x34]);
    expect(r.inSospeso).toBe(false);
  });

  it('un pezzo vuoto non perde il riporto', () => {
    const r = new RiportoByte();
    r.unisci(new Uint8Array([1, 2, 3]));
    expect(r.unisci(new Uint8Array(0)).byteLength).toBe(0);
    expect(r.inSospeso).toBe(true);
  });

  it('svuota scarta il byte avanzato a fine frase', () => {
    const r = new RiportoByte();
    r.unisci(new Uint8Array([1, 2, 3]));
    expect(r.svuota()).toBe(true);
    expect(r.svuota()).toBe(false);
    expect(r.unisci(s16le(7)).byteLength).toBe(2);
  });
});
