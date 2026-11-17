/**
 * A20 (docs/repertorio.md, «Gates on the action»): a private action that nothing answered on its phone gets the
 * Engine's discreet answer there, never silence and never aloud. Profile A's shape (the minimal reader: no private reply
 * call, only `privata: true` lines answer a private action). Invented fixture (mini), scripted narrator, no model call.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { EsitoPrivato } from '@tabletop-ai-gm/shared';
import { agisci, attendi, attendiEvento, inizia, Prova } from './aiuti/partita';

describe('a private action with no suitable line', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('gets a discreet line on that phone only; the table hears nothing of it', async () => {
    prova = new Prova();
    prova.nomeNarratore = 'minimo';
    const { url } = await prova.avvia(prova.campagna('mini'), () => '[narratore] La pioggia batte sui vetri.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const anna = await prova.telefono(url, 'pg_anna');
    const bruno = await prova.telefono(url, 'pg_bruno');
    const s = await inizia(schermo, anna);
    const privatiAnna = attendiEvento<EsitoPrivato[]>(anna, 'privato:esiti', (e) => e.some((x) => x.turno === 1), 15_000);
    const dopo = attendi(anna, (x) => x.fase === 'finestra' && x.turno === s.turno + 1, 15_000);
    await agisci(anna, 'pg_anna', "Frugo di nascosto nella borsa dell'oste.", s.versione_scena, true);
    await agisci(bruno, 'pg_bruno', 'Bevo il mio vino.', s.versione_scena);
    const t = await dopo;
    const esiti = await privatiAnna;
    expect(esiti.filter((x) => x.turno === 1).map((x) => x.testo)).toEqual(['Lo fai in disparte. Per ora non succede altro.']);
    // Never aloud: the public transcript has nothing of it.
    expect(t.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ')).not.toMatch(/disparte|borsa/);
    expect(prova.turni().at(-1)).toMatchObject({ risposte_private_motore: 1 });
  }, 20_000);

  it('a private action a line already answered gets nothing more', async () => {
    prova = new Prova();
    prova.nomeNarratore = 'minimo';
    const cartella = prova.campagna('mini', {
      battute: {
        'png_oste.yaml': [{ id: 'oste_borsa', chi: 'png_oste', tipo: 'reazione', quando: "un PG fruga nella borsa dell'oste", temi: ['borsa'], richiede: { privata: true }, testo: ['[png_oste] Ehi! Giù le mani.'], max_usi: 1 }],
      },
    });
    const { url } = await prova.avvia(cartella, () => '[usa] oste_borsa > pg_anna\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const anna = await prova.telefono(url, 'pg_anna');
    const s = await inizia(schermo, anna);
    const privatiAnna = attendiEvento<EsitoPrivato[]>(anna, 'privato:esiti', (e) => e.some((x) => x.turno === 1), 15_000);
    const dopo = attendi(anna, (x) => x.fase === 'finestra' && x.turno === s.turno + 1, 15_000);
    await agisci(anna, 'pg_anna', "Frugo di nascosto nella borsa dell'oste.", s.versione_scena, true);
    await dopo;
    expect((await privatiAnna).filter((x) => x.turno === 1).map((x) => x.testo)).toEqual(['Ehi! Giù le mani.']);
    expect(prova.turni().at(-1)).toMatchObject({ risposte_private_motore: 0 });
  }, 20_000);
});
