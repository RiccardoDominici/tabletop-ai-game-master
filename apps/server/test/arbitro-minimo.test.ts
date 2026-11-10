/**
 * Arbitro delle prove minimo (prove/arbitro-minimo.ts): regole prima del modello, scelta fra poche
 * abilità, ripiego a regole se il modello tace; bersaglio, arma e reazione dalle righe dei personaggi.
 */
import { describe, expect, it } from 'vitest';
import { loggerMuto } from '../src/logger';
import { costoZero, type ModelloLinguaggio, type RichiestaModello } from '../src/llm/modello';
import { ArbitroProveMinimo, candidatiAbilita, leggiPersonaggi } from '../src/prove/arbitro-minimo';

const PERSONAGGI = ['PG al tavolo:', '- pg_ida = Ida · armi: balestra, pugnale', 'PNG in scena:', '- png_baldrin = Baldrin Pietrafitta · verso i PG: pg_ida ostile · armi: martello', '- png_ottavia = Ottavia · verso i PG: pg_ida amichevole · armi: nessuna'].join('\n');

/** Modello finto: risponde col testo dato (o non risponde mai), e conta le chiamate. */
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
  it('parole chiave → abilità candidate; righe dei personaggi', () => {
    expect(candidatiAbilita('Mi arrampico sul muro e cerco una finestra')).toEqual(['atletica', 'indagare']);
    expect(candidatiAbilita('Chiedo a Ottavia chi è arrivato')).toEqual([]);
    const p = leggiPersonaggi(PERSONAGGI);
    expect(p.pg.get('pg_ida')?.armi).toEqual(['balestra', 'pugnale']);
    expect(p.png.map((x) => [x.id, x.ostile, x.armi.length])).toEqual([['png_baldrin', true, 1], ['png_ottavia', false, 0]]);
  });

  it('nessuna parola da prova: niente tiro e nessuna chiamata al modello', async () => {
    const m = finto('{}');
    const d = await new ArbitroProveMinimo(() => m, { log: loggerMuto() }).classifica(ingresso('Chiedo a Ottavia chi è arrivato'));
    expect(d['a1']?.tipo).toBe('nessuna');
    expect(m.chiamate).toHaveLength(0);
  });

  it('il modello sceglie fra le candidate; influenza verso un PNG: CD dalla sua scheda', async () => {
    const m = finto('{"tipo":"prova","abilita":"persuasione","difficolta":"media"}');
    const d = (await new ArbitroProveMinimo(() => m, { log: loggerMuto() }).classifica(ingresso('Cerco di convincere Ottavia ad aprire')))['a1']!;
    expect(d).toMatchObject({ tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_ottavia', difficolta: null });
    expect(m.chiamate[0]!.messaggi[0]!.testo).toContain('persuasione');
  });

  it('modello muto: ripiego a regole entro il tempo; attacco con arma e reazione del PNG ostile armato', async () => {
    const m = finto(null);
    const arbitro = new ArbitroProveMinimo(() => m, { log: loggerMuto(), attesaMs: 50 });
    expect((await arbitro.classifica(ingresso('Mi arrampico sulla scala del fienile')))['a1']).toMatchObject({ tipo: 'prova', abilita: 'atletica', difficolta: 'media' });
    expect((await arbitro.classifica(ingresso('Colpisco Baldrin con la balestra')))['a1']).toMatchObject({ tipo: 'attacco', bersaglio: 'png_baldrin', arma: 'balestra', reazione: { png: 'png_baldrin', condizione: 'sempre' } });
  });
});
