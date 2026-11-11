/**
 * Opzioni dell'harness degli esperimenti (esperimenti/argomenti.ts): --ore e --chiudi, per provare in una
 * run breve il consiglio di fine vicina e «Chiudi la sessione».
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ErroreArgomenti, leggiOpzioni } from '../src/esperimenti/argomenti';

const copione = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'copione-')), 'breve.yaml');
fs.writeFileSync(copione, 'pg: [pg_a]\nturni: []\n');
const env = { CANTASTORIE_PORTA: '4799' };

describe('opzioni --ore e --chiudi', () => {
  it('di base: durata del brief, nessuna chiusura', () => {
    expect(leggiOpzioni([copione, 'B'], env)).toMatchObject({ ore: null, chiudi: false });
  });

  it('--ore (anche con la virgola) e --chiudi', () => {
    expect(leggiOpzioni([copione, 'B', '--ore', '0.5', '--chiudi'], env)).toMatchObject({ ore: 0.5, chiudi: true, copione: 'breve' });
    expect(leggiOpzioni([copione, 'A', '--ore', '1,5'], env)).toMatchObject({ ore: 1.5 });
  });

  it('una durata fuori dai limiti del pannello è un errore', () => {
    expect(() => leggiOpzioni([copione, 'B', '--ore', '0.2'], env)).toThrow(ErroreArgomenti);
    expect(() => leggiOpzioni([copione, 'B', '--ore', 'tanto'], env)).toThrow(/--ore/);
  });
});
