/**
 * The audience split (docs/coerenza.md §2): the public call never sees a private action's content nor its outcome;
 * the PC who acted in private gets a reply of its own, a call apart, that reaches only that phone. The third e2e pass
 * leaked whispers retold turns later («Nespola, la tua domanda sul prezzo del carbone…») from the public message's
 * private sections: here those sections are not in the public message at all. Invented fixture names.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { EsitoPrivato, StatoTavolo } from '@tabletop-ai-gm/shared';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

describe('the audience split with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the public message has «Teo does something in private toward Bertoldo», the private one has the whisper; the reply only on his phone', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    // Each call gets its own script: the private reply and the public answer.
    const copione = (t: number, m: string): string =>
      t === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : m.includes('## Risposta privata per')
          ? '[narratore] Bertoldo abbassa la voce: il barone paga il doppio per il pedaggio.'
          : '[narratore] Ida guarda il ponte. Teo si avvicina al casotto.\n[invito] tutti';
    const { url, messaggi, messaggiPrivati } = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const teo = await prova.telefono(url, 'pg_teo');
    const privati: EsitoPrivato[][] = [];
    teo.on('privato:esiti', (e) => privati.push(e));
    const s1 = await inizia(schermo, ida);
    const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(ida, 'pg_ida', 'Guardo il ponte.', s1.versione_scena);
    await agisci(teo, 'pg_teo', 'Bertoldo, a parte: quanto ti paga il barone per il pedaggio?', s1.versione_scena, true);
    const s2 = await dopo;
    // The public message: who, toward whom, no content; the private one: the content and the instruction.
    expect(messaggi.at(-1)).toMatch(/Teo[^\n]*\(pg_teo\): fa qualcosa in privato verso Bertoldo/);
    expect(messaggi.at(-1)).not.toMatch(/barone|pedaggio/);
    expect(messaggiPrivati).toHaveLength(1);
    expect(messaggiPrivati[0]).toContain('Bertoldo, a parte: quanto ti paga il barone per il pedaggio?');
    expect(messaggiPrivati[0]).toContain('## Risposta privata per Teo');
    // The reply: on Teo's phone, never at the table, even though the script wrote it as a narrator line.
    expect(privati.at(-1)?.map((e) => e.testo).join(' ')).toContain('il barone paga il doppio');
    expect(s2.trascrizione.map((v) => v.testo).join(' ')).not.toMatch(/barone|doppio/);
    expect(s2.trascrizione.map((v) => v.testo).join(' ')).toContain('Ida guarda il ponte.');
  });

  it('a public-only turn has no private call', async () => {
    prova = new Prova();
    const { url, messaggiPrivati } = await prova.avvia(prova.campagna('prove'), (t) => (t === 0 ? '[narratore] Il fiume.\n[invito] tutti' : '[narratore] Il vento.\n[invito] tutti'));
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const s1 = await inizia(schermo, ida);
    const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(ida, 'pg_ida', 'Guardo il ponte.', s1.versione_scena);
    await dopo;
    expect(messaggiPrivati).toEqual([]);
  });
});
