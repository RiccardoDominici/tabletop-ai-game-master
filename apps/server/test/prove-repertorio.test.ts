/**
 * Cancello sul tiro delle battute (docs/prove.md, «Repertorio»): `richiede.prova` vuole un'azione
 * che in questo turno ha superato quella prova. Sulla campagna di prova: la confessione di
 * Bertoldo esce solo dopo una Persuasione riuscita, mai con una fallita o senza tiro.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaRepertorio, ErroreRepertorio } from '../src/repertorio/caricatore';
import { nomiDeiPng } from '../src/repertorio/pertinenza';
import { StatoRepertorio, haCancelloAzione, rispondeA, type AzioneCatalogo } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';
import type { Campagna } from '../src/campagna/tipi';

const CARTELLA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'prove');

describe('richiede.prova', () => {
  const c = caricaCampagna(CARTELLA);
  const rep = caricaRepertorio(c);
  const confessa = rep.perId.get('bertoldo_confessa')!;
  const cat = (azioni: AzioneCatalogo[]) =>
    new StatoRepertorio(rep, c, new StatoOrologi(c)).catalogo({ turno: 1, azioni, stallo: false, segnoDovuto: false, nomiPng: nomiDeiPng(c), parole: [] }).battute.map((b) => b.id);
  const testo = 'Convinco Bertoldo a dirmi chi paga lo sgherro.';

  it('il caricatore legge il cancello e lo conta come cancello sull’azione', () => {
    expect(confessa.richiede.prova).toBe('persuasione');
    expect(haCancelloAzione(confessa)).toBe(true);
  });

  it('risponde solo a un’azione con la prova superata', () => {
    expect(rispondeA(confessa, { autore: 'pg_ida', privata: false, prove: ['prova', 'persuasione'] })).toBe(true);
    expect(rispondeA(confessa, { autore: 'pg_ida', privata: false, prove: ['prova', 'inganno'] })).toBe(false);
    expect(rispondeA(confessa, { autore: 'pg_ida', privata: false })).toBe(false);
  });

  it('nel catalogo solo dopo la riuscita', () => {
    expect(cat([{ autore: 'pg_ida', testo, privata: false, prove: ['prova', 'persuasione'] }])).toContain('bertoldo_confessa');
    expect(cat([{ autore: 'pg_ida', testo, privata: false, prove: [] }])).not.toContain('bertoldo_confessa');
    expect(cat([{ autore: 'pg_ida', testo, privata: false }])).not.toContain('bertoldo_confessa');
  });

  it('un valore che non si capisce è un errore (ignorato aprirebbe il cancello)', () => {
    const rotta: Campagna = { ...c };
    // Una battuta con un cancello sbagliato, in un repertorio temporaneo.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-prova-'));
    fs.writeFileSync(path.join(dir, 'x.yaml'), 'battute:\n  - id: x_rotta\n    chi: narratore\n    tipo: momento\n    quando: "un PG fa qualcosa"\n    richiede: {prova: volare}\n    testo: ["[narratore] Niente."]\n');
    expect(() => caricaRepertorio({ ...rotta, cartellaRepertorio: dir })).toThrow(ErroreRepertorio);
    try {
      caricaRepertorio({ ...rotta, cartellaRepertorio: dir });
    } catch (e) {
      expect(String((e as ErroreRepertorio).message)).toMatch(/prova «volare»/);
    }
  });
});
