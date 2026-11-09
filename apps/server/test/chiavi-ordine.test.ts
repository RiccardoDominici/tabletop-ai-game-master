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
const FINTA_AMBIENTE = 'sk-finta-ambiente';
const FINTA_RADICE = 'sk-finta-radice';
const FINTA_VECCHIA = 'sk-finta-vecchia';

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
    const radice = file(`${NOME}=${FINTA_RADICE}\nOPENROUTER_API_KEY=sk-finta-or\n`);
    expect(cercaChiave('OPENROUTER_API_KEY', { ambiente: {}, fileEnvRadice: radice }).valore).toBe('sk-finta-or');
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
    const radice = file(`${NOME}=sk-finta-uno\n${NOME}=sk-finta-due\n`);
    try {
      cercaChiave(NOME, { ambiente: {}, fileEnvRadice: radice });
      expect.unreachable();
    } catch (err) {
      expect(String(err)).toMatch(/più di una riga/);
      expect(String(err)).not.toMatch(/sk-finta/);
    }
  });

  it('file di ripiego inesistente: si salta, errore finale se manca anche il resto', () => {
    expect(() =>
      cercaChiave(NOME, { ambiente: {}, fileEnvRadice: path.join(dir, 'no.env'), filePrecedente: path.join(dir, 'no2.env') }),
    ).toThrow(ErroreChiave);
  });
});
