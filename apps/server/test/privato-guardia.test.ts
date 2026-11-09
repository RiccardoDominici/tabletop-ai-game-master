/**
 * Guardia delle azioni private (narrazione/privato.ts): il caso di Teo dalla partita sulla 4720. La
 * riga al tavolo che nomina Teo e riprende cassetta e lucchetto va al suo telefono, non si scarta;
 * l'invito a Teo, una riga su un altro PG e un'azione pubblica dello stesso PG restano al tavolo.
 * Poi lo stesso caso col server intero: trascrizione pubblica pulita, esito privato sul telefono.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { EsitoPrivato, StatoTavolo } from '@cantastorie/shared';
import { destinatarioPrivato, guardiaPrivate, radici } from '../src/narrazione/privato';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const TEO = { id_pg: 'pg_teo', nomi: ['Teo'], testo: 'Mentre Bertoldo guarda Ida, apro di nascosto il lucchetto della cassetta del pedaggio' };
const NOMI = new Set(['teo', 'ida ferraro', 'ida', 'bertoldo', 'ruggero lo sgherro', 'ruggero']);

describe('guardia delle azioni private', () => {
  it('la riga che racconta lo scasso di Teo va al suo telefono', () => {
    const r = destinatarioPrivato('Teo, con le mani in tasca, si china verso la cassetta del pedaggio.', [TEO], NOMI);
    expect(r?.id_pg).toBe('pg_teo');
    expect(r?.comuni.sort()).toEqual(['casse', 'pedag']);
    expect(destinatarioPrivato('Mentre Bertoldo guarda Ida, Teo sfila le dita nel buio della cassetta e il lucchetto cede senza un rumore.', [TEO], NOMI)?.id_pg).toBe('pg_teo');
  });

  it('restano al tavolo: l’invito, una riga senza il nome, un’altra cosa, i nomi dei personaggi non contano', () => {
    expect(destinatarioPrivato('Teo, cosa fai adesso?', [TEO], NOMI)).toBeNull();
    expect(destinatarioPrivato('Il lucchetto della cassetta cede in silenzio.', [TEO], NOMI)).toBeNull();
    expect(destinatarioPrivato('Teo guarda Bertoldo e Ida.', [TEO], NOMI)).toBeNull();
    expect(radici('Bertoldo guarda Ida', new Set(['bertoldo', 'ida'])).has('berto')).toBe(false);
  });

  it('il resto del segmento spostato segue la prima frase; un PG con un’azione pubblica non si tocca', () => {
    const g = guardiaPrivate([{ id_pg: 'pg_teo', testo: TEO.testo, privata: true }], () => ['Teo'], NOMI)!;
    expect(g('Teo si china verso la cassetta del pedaggio.', 3)?.id_pg).toBe('pg_teo');
    expect(g('Il lucchetto cede in silenzio.', 3)?.id_pg).toBe('pg_teo');
    expect(g('Il vento soffia sul ponte.', 4)).toBeNull();
    expect(guardiaPrivate([{ id_pg: 'pg_teo', testo: TEO.testo, privata: true }, { id_pg: 'pg_teo', testo: 'Saluto', privata: false }], () => ['Teo'], NOMI)).toBeNull();
    expect(guardiaPrivate([{ id_pg: 'pg_ida', testo: 'Canto', privata: false }], () => ['Ida'], NOMI)).toBeNull();
  });
});

describe('guardia delle azioni private col server intero', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('la riga del selettore che racconta lo scasso va al telefono di Teo, non nella trascrizione', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (turno: number): string =>
      turno === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : '[narratore] Teo, con le mani in tasca, si china verso la cassetta del pedaggio. Il lucchetto cede in silenzio.\n[narratore] Il vento porta odore di fango.\n[invito] tutti';
    const { url } = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(url);
    const teo = await prova.telefono(url, 'pg_teo');
    const privati: EsitoPrivato[][] = [];
    teo.on('privato:esiti', (e) => privati.push(e));
    const s1 = await inizia(schermo, teo);
    await agisci(teo, 'pg_teo', TEO.testo, s1.versione_scena, true);
    const dopo: StatoTavolo = await attendi(teo, (x) => x.fase === 'finestra' && x.turno === 2);
    const pubblico = dopo.trascrizione.map((v) => v.testo).join(' ');
    expect(pubblico).toContain('odore di fango');
    expect(pubblico).not.toMatch(/cassetta|lucchetto/);
    expect(privati.at(-1)?.map((e) => e.testo).join(' ')).toMatch(/cassetta del pedaggio\. Il lucchetto cede in silenzio\./);
  });
});
