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
const env = { TAGM_PORTA: '4799' };

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

describe('--voce-vera', () => {
  const voce = 'http://127.0.0.1:4856';

  it('senza il flag la voce è finta e nessun servizio a parte è usato', () => {
    expect(leggiOpzioni([copione, 'B'], { ...env, TAGM_VOCE_URL: voce })).toMatchObject({ voceVera: false, voceUrl: null });
  });

  it('su una porta di prova con TAGM_VOCE_URL di un servizio a parte: la voce vera è quel servizio', () => {
    expect(leggiOpzioni([copione, 'B', '--voce-vera'], { ...env, TAGM_VOCE_URL: voce })).toMatchObject({ voceVera: true, voceUrl: voce });
  });

  it('su una porta di prova senza TAGM_VOCE_URL è un errore che lo dice', () => {
    expect(() => leggiOpzioni([copione, 'B', '--voce-vera'], env)).toThrow(/TAGM_VOCE_URL/);
  });

  it('non usa mai la 4611 (voce della partita vera), né la 4612, né la stessa porta del server di prova', () => {
    expect(() => leggiOpzioni([copione, 'B', '--voce-vera'], { ...env, TAGM_VOCE_URL: 'http://127.0.0.1:4611' })).toThrow(/4611/);
    expect(() => leggiOpzioni([copione, 'B', '--voce-vera'], { ...env, TAGM_VOCE_URL: 'http://localhost:4612' })).toThrow(/4612/);
    expect(() => leggiOpzioni([copione, 'B', '--voce-vera'], { ...env, TAGM_VOCE_URL: 'http://127.0.0.1:4799' })).toThrow(ErroreArgomenti);
  });

  it('un indirizzo non valido è un errore', () => {
    expect(() => leggiOpzioni([copione, 'B', '--voce-vera'], { ...env, TAGM_VOCE_URL: 'non un url' })).toThrow(/TAGM_VOCE_URL/);
  });

  it('sulla 4610 il flag resta quello di prima: tiene acceso il servizio della partita, nessun URL a parte', () => {
    expect(leggiOpzioni([copione, 'B', '--voce-vera', '--partita-vera'], { TAGM_PORTA: '4610', TAGM_VOCE_URL: voce })).toMatchObject({ voceVera: true, voceUrl: null });
  });
});
