/**
 * Registro delle voci: il reference_id Fish scelto per lingua (italiano invariato, inglese dal
 * registro, ripiego sull'italiano con avviso). Il file vero è assets/voci/voci.yaml; gli altri casi
 * usano una fixture inventata.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { impostaLingua } from '../src/lingua';
import { caricaRegistroVoci, leggiFishPerLingua } from '../src/voce/registro-voci';

const VERO = fileURLToPath(new URL('../../../assets/voci/voci.yaml', import.meta.url));
const IT = {
  narratore: '130bd00e5d89470bb0352d20b8c4bf8b',
  vincent: '9b0dc46209e0464483dcc0015a032111',
  nadine: 'e63400ae1f9d4e5a994b87095f6a9dbb',
  lucian: '60b51b6e9e654e06b54871895b1c9a71',
  tabitha: '367577d036bb49e4a7799169ed5ec0fc',
};
const EN_NARRATORE = 'bf322df2096a46f18c579d0baa36f41d';

function fixture(righe: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'registro-voci-'));
  const f = path.join(d, 'voci.yaml');
  fs.writeFileSync(f, `voci:\n${righe}`);
  return f;
}

afterEach(() => impostaLingua('it'));

describe('registro voci per lingua', () => {
  it('italiano invariato: ogni voce del file vero ha il suo id italiano', () => {
    const voci = caricaRegistroVoci(VERO, { lingua: 'it' });
    for (const [id, fish] of Object.entries(IT)) {
      expect(voci.get(id)?.fish).toBe(fish);
      expect(voci.get(id)?.fishLingua).toBe('it');
    }
  });

  it('inglese: il narratore prende l’id inglese; le voci inglesi sono distinte tra loro', () => {
    const voci = caricaRegistroVoci(VERO, { lingua: 'en' });
    expect(voci.get('narratore')?.fish).toBe(EN_NARRATORE);
    expect(voci.get('narratore')?.fishLingua).toBe('en');
    const inglesi = [...voci.values()].map((v) => v.fish);
    expect(new Set(inglesi).size).toBe(inglesi.length);
    expect(inglesi).not.toContain(IT.narratore);
  });

  it('lingua predefinita: quella attiva del processo (impostaLingua)', () => {
    impostaLingua('en');
    expect(caricaRegistroVoci(VERO).get('narratore')?.fish).toBe(EN_NARRATORE);
    impostaLingua('it');
    expect(caricaRegistroVoci(VERO).get('narratore')?.fish).toBe(IT.narratore);
  });

  it('senza id inglese: ripiego sull’italiano con avviso', () => {
    const avvisi: string[] = [];
    const f = fixture(`  - id: x\n    fish:\n      it: ${IT.vincent}\n`);
    const voce = caricaRegistroVoci(f, { lingua: 'en', avviso: (m) => avvisi.push(m) }).get('x');
    expect(voce?.fish).toBe(IT.vincent);
    expect(voce?.fishLingua).toBe('it');
    expect(avvisi).toHaveLength(1);
    expect(avvisi[0]).toMatch(/«x».*«en»/);
  });

  it('nessun id utilizzabile: fish null e avviso', () => {
    const avvisi: string[] = [];
    const f = fixture('  - id: y\n    fish: non-un-id\n');
    const voce = caricaRegistroVoci(f, { lingua: 'it', avviso: (m) => avvisi.push(m) }).get('y');
    expect(voce?.fish).toBeNull();
    expect(avvisi).toHaveLength(1);
  });

  it('forma vecchia (fish: <id> come stringa) vale come italiano', () => {
    const f = fixture(`  - id: z\n    fish: ${IT.nadine}\n`);
    expect(caricaRegistroVoci(f, { lingua: 'it' }).get('z')?.fish).toBe(IT.nadine);
    expect(leggiFishPerLingua(IT.nadine)).toEqual({ it: IT.nadine });
    expect(leggiFishPerLingua({ it: IT.nadine, en: 'troppo corto' })).toEqual({ it: IT.nadine });
  });
});
