/**
 * Lettore della chiave: sempre su file FINTI in una cartella temporanea, mai sul file vero.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ErroreChiave, descriviChiave, leggiChiaveAnthropic } from '../src/llm/chiave';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-chiave-'));
function file(nome: string, contenuto: string): string {
  const p = path.join(dir, nome);
  fs.writeFileSync(p, contenuto);
  return p;
}
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('leggiChiaveAnthropic', () => {
  it('prende solo il valore della riga ANTHROPIC_API_KEY=', () => {
    const p = file(
      'a.env',
      ['ALTRO_SEGRETO=non-toccare', '# commento', 'ANTHROPIC_API_KEY=sk-finta-123', 'DB_PASSWORD=xyz', ''].join('\n'),
    );
    expect(leggiChiaveAnthropic(p)).toBe('sk-finta-123');
  });

  it('toglie virgolette e spazi, gestisce CRLF', () => {
    expect(leggiChiaveAnthropic(file('b.env', 'X=1\r\nANTHROPIC_API_KEY="sk-virgolette"  \r\n'))).toBe('sk-virgolette');
    expect(leggiChiaveAnthropic(file('c.env', "ANTHROPIC_API_KEY='sk-singole'\n"))).toBe('sk-singole');
  });

  it('non confonde righe con prefissi simili o commentate', () => {
    const p = file('d.env', ['MY_ANTHROPIC_API_KEY=no', '#ANTHROPIC_API_KEY=no', ' ANTHROPIC_API_KEY=no', 'ANTHROPIC_API_KEY=si'].join('\n'));
    expect(leggiChiaveAnthropic(p)).toBe('si');
  });

  it('errore se manca, se è vuota o se è duplicata, senza mostrare i valori', () => {
    expect(() => leggiChiaveAnthropic(file('e.env', 'ALTRO=segreto-da-non-mostrare\n'))).toThrow(ErroreChiave);
    expect(() => leggiChiaveAnthropic(file('f.env', 'ANTHROPIC_API_KEY=\n'))).toThrow(/vuota/);
    try {
      leggiChiaveAnthropic(file('g.env', 'ANTHROPIC_API_KEY=uno-segreto\nANTHROPIC_API_KEY=due-segreto\n'));
      expect.unreachable();
    } catch (err) {
      expect(String(err)).toMatch(/più di una riga/);
      expect(String(err)).not.toMatch(/segreto/);
    }
  });

  it('errore leggibile se il file non esiste', () => {
    expect(() => leggiChiaveAnthropic(path.join(dir, 'manca.env'))).toThrow(/non leggibile \(ENOENT\)/);
  });

  it('descriviChiave non rivela caratteri', () => {
    expect(descriviChiave('sk-abc')).toBe('presente (6 caratteri)');
    expect(descriviChiave(undefined)).toBe('assente');
  });
});
