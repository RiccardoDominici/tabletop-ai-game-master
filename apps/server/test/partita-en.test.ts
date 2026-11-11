/**
 * An English game with the whole server (docs/lingue.md): the campaign en-mini declares `lingua: en`,
 * the configuration language is English too. Three turns with the fake narrator: the
 * turn message and the Engine's fixed phrases are English, the
 * narrator's name in the transcript is «Narrator», and the state tells the web both languages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Esito, StatoTavolo } from '@tabletop-ai-gm/shared';
import { impostaLingua, linguaAttiva } from '../src/lingua';
import { emetti, inizia, Prova, turno } from './aiuti/partita';

const COPIONE = fs
  .readFileSync(path.join(import.meta.dirname, 'fixtures', 'copione-en.txt'), 'utf8')
  .split(/^---\s*$/m)
  .map((b) => b.split('\n').filter((r) => !r.trimStart().startsWith('#')).join('\n').trim());

let prova: Prova;
afterEach(async () => {
  await prova?.chiudi();
  impostaLingua('it');
});

describe('an English game', () => {
  it('three turns in English: prompt, turn message, fixed phrases, narrator name, languages in the state', async () => {
    prova = new Prova();
    const cartella = prova.campagna('en-mini');
    const { url, messaggi } = await prova.avvia(cartella, (t) => COPIONE[Math.min(t, COPIONE.length) - 1]!, {
      TAGM_MODO: 'improvvisa',
      TAGM_PROMPT_SELETTORE: '',
      TAGM_LINGUA: 'en',
    });
    expect(linguaAttiva()).toBe('en');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_mara');
    let st: StatoTavolo = await inizia(schermo, tel);
    expect(st.lingua).toEqual({ interfaccia: 'en', contenuti: 'en' });
    // The opening is split with the English rules: «Mr. Hale» does not end a sentence.
    expect(st.trascrizione[0]).toMatchObject({ nome: 'Narrator', testo: expect.stringContaining('Mr. Hale, the innkeeper') });
    // A refused action speaks English.
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_mara', testo: '   ', versione_vista: st.versione_scena }, cb))).toEqual({
      ok: false,
      errore: 'Write what your character does.',
    });
    for (const azione of ['I walk to the counter and ask for a room.', 'I look out of the window.', 'I ask Hale who waters down the wine.']) {
      st = await turno(tel, 'pg_mara', st, azione);
    }
    expect(st).toMatchObject({ fase: 'finestra', turno: 4 });
    expect(messaggi).toHaveLength(3);
    expect(messaggi[0]).toContain('I walk to the counter and ask for a room.');
    expect(messaggi.join('\n')).not.toMatch(/Azioni del turno|Trascrizione|Collegamenti tra le azioni/);
    const narrati = st.trascrizione.filter((v) => v.tipo === 'narrazione').map((v) => v.nome);
    expect(new Set(narrati)).toEqual(new Set(['Narrator']));
    expect(st.trascrizione.some((v) => v.chi === 'png_keeper' && v.testo.includes('Pay first, travellers.'))).toBe(true);
    // The turn message is built with the English headings.
    expect(messaggi[0]).toContain('## Public transcript of the scene so far (by turn)');
    expect(messaggi[0]).toContain("## Turn 1: the players' actions");
  }, 30_000);
});
