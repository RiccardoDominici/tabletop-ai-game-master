/**
 * Tipi neutri nel catalogo del selettore (modalità B): «menzogna», «verita» e «confessione»
 * direbbero al modello chi mente e chi sta per confessare; nel catalogo sono «risposta». Il tipo
 * vero resta nella battuta (log, pannello del master).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { RADICE_REPO } from '../src/percorsi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { StatoRepertorio, tipoNelCatalogo } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';
import { TIPI_BATTUTA } from '../src/repertorio/tipi';

describe('tipo nel catalogo', () => {
  it('menzogna, verita e confessione diventano «risposta»; gli altri restano', () => {
    expect(tipoNelCatalogo('menzogna')).toBe('risposta');
    expect(tipoNelCatalogo('verita')).toBe('risposta');
    expect(tipoNelCatalogo('confessione')).toBe('risposta');
    for (const t of ['indizio', 'segno_orologio', 'momento', 'finale', 'reazione', 'saluto'] as const) expect(tipoNelCatalogo(t)).toBe(t);
    // Nessun tipo che svela resta visibile.
    expect(TIPI_BATTUTA.map(tipoNelCatalogo).filter((t) => ['menzogna', 'verita', 'confessione'].includes(t))).toEqual([]);
  });

  for (const campagna of ['prova-f0', 'ponte-lanterne']) {
    const cartella = path.join(RADICE_REPO, 'campagne', campagna);
    it.skipIf(!fs.existsSync(path.join(cartella, 'repertorio')))(`${campagna}: il catalogo non dice chi mente, la battuta sì`, () => {
      const c = caricaCampagna(cartella);
      const rep = caricaRepertorio(c);
      const s = new StatoRepertorio(rep, c, new StatoOrologi(c));
      const tutte = rep.battute.filter((b) => !b.solo_esempio);
      const elenco = s.elencoDisponibili(tutte);
      expect(elenco).not.toMatch(/ · (menzogna|verita|confessione) · /);
      const bugia = tutte.find((b) => b.tipo === 'menzogna')!;
      expect(bugia.tipo).toBe('menzogna'); // il tipo vero resta
      expect(StatoRepertorio.riga(bugia)).toBe(`- ${bugia.id} · ${bugia.chi} · risposta · ${bugia.quando}`);
      const indizio = tutte.find((b) => b.tipo === 'indizio')!;
      expect(StatoRepertorio.riga(indizio)).toContain(' · indizio · ');
    });
  }
});
