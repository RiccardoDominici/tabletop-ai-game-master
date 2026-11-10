/**
 * Arbitro delle prove minimo (prove/arbitro-minimo.ts, opzione a mano): candidate dalle parole chiave
 * del classificatore a regole, scelta breve del modello, e nessuna decisione (decide la riserva del
 * Motore) quando non ci sono candidate o il modello tace.
 */
import { describe, expect, it } from 'vitest';
import { loggerMuto } from '../src/logger';
import { costoZero, type ModelloLinguaggio, type RichiestaModello } from '../src/llm/modello';
import { ArbitroProveMinimo, candidatiAbilita, pngInScena } from '../src/prove/arbitro-minimo';

const PERSONAGGI = ['PG al tavolo:', '- pg_ida = Ida · armi: balestra', 'PNG in scena:', '- png_ottavia = Ottavia · verso i PG: pg_ida amichevole · armi: nessuna'].join('\n');

function finto(risposta: string | null): ModelloLinguaggio & { chiamate: RichiestaModello[] } {
  const chiamate: RichiestaModello[] = [];
  const uso = { input_tokens: 1, output_tokens: 1 };
  return {
    provider: 'openai', modello: 'm', descrizione: 'finto', capacita: { strutturato: false, preriscalda: false }, chiamate,
    chiedi: async (r) => {
      chiamate.push(r);
      if (risposta === null) return new Promise((_, ko) => r.signal?.addEventListener('abort', () => ko(new Error('aborted'))));
      return { testo: risposta, modello: 'm', stopReason: 'end_turn', uso, costo: costoZero(uso), id: null };
    },
    flusso: async () => { throw new Error('no'); },
  };
}
const ingresso = (testo: string) => ({ scena: '', narrazione: '', personaggi: PERSONAGGI, proveScena: '', altre: [], azioni: [{ id: 'a1', autore: 'pg_ida', nome: 'Ida', testo, privata: false }] });

describe('arbitro delle prove minimo', () => {
  it('candidate dalla tabella del classificatore; PNG in scena dalle righe del Motore', () => {
    expect(candidatiAbilita('Chiedo a Ottavia chi è arrivato')).toEqual([]);
    expect(candidatiAbilita('Cerco di convincere Ottavia').length).toBeGreaterThan(0);
    expect(pngInScena(PERSONAGGI)).toEqual([{ id: 'png_ottavia', nome: 'Ottavia' }]);
  });

  it('senza candidate nessuna chiamata e nessuna decisione (decide la riserva del Motore)', async () => {
    const m = finto('{}');
    expect(await new ArbitroProveMinimo(() => m, { log: loggerMuto() }).classifica(ingresso('Chiedo a Ottavia chi è arrivato'))).toEqual({});
    expect(m.chiamate).toHaveLength(0);
  });

  it('il modello sceglie fra le candidate; modello muto → nessuna decisione entro il tempo', async () => {
    const candidate = candidatiAbilita('Cerco di convincere Ottavia ad aprire');
    const m = finto(JSON.stringify({ tipo: 'prova', abilita: candidate[0], difficolta: 'media' }));
    const d = (await new ArbitroProveMinimo(() => m, { log: loggerMuto() }).classifica(ingresso('Cerco di convincere Ottavia ad aprire')))['a1']!;
    expect(d).toMatchObject({ tipo: 'prova', abilita: candidate[0] });
    const muto = finto(null);
    expect(await new ArbitroProveMinimo(() => muto, { log: loggerMuto(), attesaMs: 50 }).classifica(ingresso('Cerco di convincere Ottavia ad aprire'))).toEqual({});
  });
});
