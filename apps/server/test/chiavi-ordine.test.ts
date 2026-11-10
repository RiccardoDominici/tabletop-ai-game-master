/**
 * Ordine di ricerca delle chiavi (llm/chiavi.ts): ambiente → .env alla radice → file di ripiego.
 * Tutto con chiavi FINTE in cartelle temporanee: l'ambiente e il .env vengono passati esplicitamente,
 * così il test non dipende dalla macchina né dal .env vero.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ErroreChiave, cercaChiave } from '../src/llm/chiavi';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-ordine-'));
let n = 0;
function file(contenuto: string): string {
  const p = path.join(dir, `f${n++}.env`);
  fs.writeFileSync(p, contenuto);
  return p;
}
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const NOME = 'ANTHROPIC_API_KEY';
const FINTA_AMBIENTE = 'sk-ant-finta-ambiente-0000000000';
const FINTA_RADICE = 'sk-ant-finta-radice-000000000000';
const FINTA_VECCHIA = 'sk-ant-finta-vecchia-000000000000';

describe('cercaChiave: ordine delle fonti', () => {
  it('1. la variabile d\'ambiente vince su tutto', () => {
    const r = cercaChiave(NOME, {
      ambiente: { [NOME]: FINTA_AMBIENTE },
      fileEnvRadice: file(`${NOME}=${FINTA_RADICE}\n`),
      filePrecedente: file(`${NOME}=${FINTA_VECCHIA}\n`),
    });
    expect(r).toEqual({ valore: FINTA_AMBIENTE, origine: 'ambiente' });
  });

  it('2. senza ambiente, la riga del .env alla radice', () => {
    const r = cercaChiave(NOME, {
      ambiente: {},
      fileEnvRadice: file(`ALTRO=1\n${NOME}=${FINTA_RADICE}\n`),
      filePrecedente: file(`${NOME}=${FINTA_VECCHIA}\n`),
    });
    expect(r).toEqual({ valore: FINTA_RADICE, origine: 'env-radice' });
  });

  it('3. ultimo ripiego: il file precedente, se niente sopra', () => {
    const r = cercaChiave(NOME, {
      ambiente: {},
      fileEnvRadice: path.join(dir, 'non-esiste.env'),
      filePrecedente: file(`ALTRO=x\n${NOME}=${FINTA_VECCHIA}\n`),
    });
    expect(r).toEqual({ valore: FINTA_VECCHIA, origine: 'file-precedente' });
  });

  it('un ambiente con valore vuoto o solo spazi non vale: si passa al .env', () => {
    const r = cercaChiave(NOME, { ambiente: { [NOME]: '   ' }, fileEnvRadice: file(`${NOME}=${FINTA_RADICE}\n`) });
    expect(r.origine).toBe('env-radice');
  });

  it('una riga vuota nel .env non vale: si passa al file precedente', () => {
    const r = cercaChiave(NOME, {
      ambiente: {},
      fileEnvRadice: file(`${NOME}=\n`),
      filePrecedente: file(`${NOME}=${FINTA_VECCHIA}\n`),
    });
    expect(r.origine).toBe('file-precedente');
  });

  it('le chiavi sono separate per nome: OPENROUTER non prende ANTHROPIC', () => {
    const radice = file(`${NOME}=${FINTA_RADICE}\nOPENROUTER_API_KEY=sk-or-finta-openrouter-0000000000\n`);
    expect(cercaChiave('OPENROUTER_API_KEY', { ambiente: {}, fileEnvRadice: radice }).valore).toBe('sk-or-finta-openrouter-0000000000');
    expect(cercaChiave(NOME, { ambiente: {}, fileEnvRadice: radice }).valore).toBe(FINTA_RADICE);
  });

  it('virgolette attorno al valore nel .env: tolte come farebbe una shell', () => {
    const r = cercaChiave(NOME, { ambiente: {}, fileEnvRadice: file(`${NOME}="${FINTA_RADICE}"\r\n`) });
    expect(r.valore).toBe(FINTA_RADICE);
  });
});

describe('cercaChiave: errori', () => {
  it('nessuna fonte: errore che nomina i passi, senza valori', () => {
    try {
      cercaChiave(NOME, { ambiente: {}, fileEnvRadice: path.join(dir, 'manca.env') });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ErroreChiave);
      expect(String(err)).toMatch(/non trovata/);
      expect(String(err)).toMatch(/\.env\.example/);
    }
  });

  it('due righe nel .env: errore senza mostrare il contenuto', () => {
    const radice = file(`${NOME}=sk-ant-finta-uno-0000000000\n${NOME}=sk-ant-finta-due-0000000000\n`);
    try {
      cercaChiave(NOME, { ambiente: {}, fileEnvRadice: radice });
      expect.unreachable();
    } catch (err) {
      expect(String(err)).toMatch(/più di una riga/);
      expect(String(err)).not.toMatch(/finta/);
    }
  });

  it('file di ripiego inesistente: si salta, errore finale se manca anche il resto', () => {
    expect(() =>
      cercaChiave(NOME, { ambiente: {}, fileEnvRadice: path.join(dir, 'no.env'), filePrecedente: path.join(dir, 'no2.env') }),
    ).toThrow(ErroreChiave);
  });
});

describe('cercaChiave: verifica della forma', () => {
  it('un segnaposto nell\'ambiente si scarta, con avviso che nomina l\'origine e non il valore', () => {
    const avvisi: string[] = [];
    const originale = console.warn;
    console.warn = (...args: unknown[]) => avvisi.push(args.map(String).join(' '));
    try {
      const r = cercaChiave(NOME, {
        ambiente: { [NOME]: 'placeholder-non-una-chiave' },
        fileEnvRadice: file(`${NOME}=${FINTA_RADICE}\n`),
      });
      expect(r).toEqual({ valore: FINTA_RADICE, origine: 'env-radice' });
    } finally {
      console.warn = originale;
    }
    expect(avvisi.join('\n')).toMatch(/ambiente/);
    expect(avvisi.join('\n')).toMatch(/scartata/);
    expect(avvisi.join('\n')).not.toMatch(/placeholder/);
  });

  it('una chiave ANTHROPIC troppo corta o con il prefisso di OpenRouter non vale', () => {
    const avvisi = console.warn;
    console.warn = () => undefined;
    try {
      expect(cercaChiave(NOME, { ambiente: { [NOME]: 'sk-ant-x' }, fileEnvRadice: file(`${NOME}=${FINTA_RADICE}\n`) }).origine).toBe(
        'env-radice',
      );
      expect(
        cercaChiave(NOME, { ambiente: {}, fileEnvRadice: file(`${NOME}=sk-or-finta-openrouter-0000000000\n`), filePrecedente: file(`${NOME}=${FINTA_VECCHIA}\n`) })
          .origine,
      ).toBe('file-precedente');
    } finally {
      console.warn = avvisi;
    }
  });

  it('OPENROUTER scarta una chiave Anthropic messa al suo posto', () => {
    const avvisi = console.warn;
    console.warn = () => undefined;
    try {
      expect(() =>
        cercaChiave('OPENROUTER_API_KEY', { ambiente: {}, fileEnvRadice: file(`OPENROUTER_API_KEY=${FINTA_RADICE}\n`) }),
      ).toThrow(/Scartate.*env-radice/);
    } finally {
      console.warn = avvisi;
    }
  });

  it('se tutte le fonti sono scartate l\'errore le nomina, senza valori', () => {
    const avvisi = console.warn;
    console.warn = () => undefined;
    try {
      cercaChiave(NOME, {
        ambiente: { [NOME]: 'x' },
        fileEnvRadice: file(`${NOME}=sk-ant-corta\n`),
        filePrecedente: file(`${NOME}=segnaposto-segreto-da-non-mostrare\n`),
      });
      expect.unreachable();
    } catch (err) {
      const testo = String(err);
      expect(testo).toMatch(/Scartate perché non hanno la forma attesa: ambiente, env-radice, file-precedente/);
      expect(testo).not.toMatch(/segreto|sk-ant-corta/);
    } finally {
      console.warn = avvisi;
    }
  });

  it('una forma non definita per il nome (es. FREESOUND) non viene controllata', () => {
    const r = cercaChiave('FREESOUND_API_KEY', { ambiente: { FREESOUND_API_KEY: 'qualsiasi' } });
    expect(r).toEqual({ valore: 'qualsiasi', origine: 'ambiente' });
  });
});
