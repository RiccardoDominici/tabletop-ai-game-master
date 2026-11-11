/**
 * The pronunciation layer in a whole English game (docs/pronuncia.md). Campaign en-nomi has names that are hard
 * for an English voice (Aoibheann, Niamh Dubhghall, Cwmtaith…) and their respellings in pronunce.yaml. The voice
 * must receive the respellings (opening, narration, NPC lines, the soft move), the screen and the transcript the
 * written names; a name the players bring in («Brychan») goes to the sceneggiatore, comes back with its
 * pronunciation, lands in pronunce-gioco.yaml and is said that way from the next line.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { impostaLingua } from '../src/lingua';
import { cartelle, leggiJson, scriviJson, type RichiestaSceneggiatore } from '../src/sceneggiatore/protocollo';
import type { MotoreVoce } from '../src/voce/tipi';
import { FILE_LESSICO_GIOCO } from '../src/voce/pronuncia';
import { inizia, Prova, turno } from './aiuti/partita';

const COPIONE = fs
  .readFileSync(path.join(import.meta.dirname, 'fixtures', 'copione-en-nomi.txt'), 'utf8')
  .split(/^---\s*$/m)
  .map((b) => b.split('\n').filter((r) => !r.trimStart().startsWith('#')).join('\n').trim());

/** The respellings of fixtures/campagne/en-nomi/pronunce.yaml that differ from the written name. */
const RESPELLINGS = ['KOOM-tyth', 'NEEV', 'DOO-gal', 'ZEER-ay', 'ee-VAWN', 'KAD-oo-gan', 'ISS-garth'];

let prova: Prova;
afterEach(async () => {
  await prova?.chiudi();
  impostaLingua('it');
});

async function finché(cond: () => boolean, ms = 8000): Promise<void> {
  const fine = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > fine) throw new Error('condizione non arrivata');
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe('pronunciation lexicon in an English game', () => {
  it('the voice says the respellings, the screen shows the names; a new name is added during play', async () => {
    prova = new Prova();
    const cartella = prova.campagna('en-nomi');
    const radice = path.join(prova.cartella, 'sceneggiatore');
    const c = cartelle(radice);
    scriviJson(c.vivo, { ts: Date.now(), pid: 0, modello: 'prova' });
    const { s, url } = await prova.avvia(cartella, (t) => COPIONE[Math.min(t, COPIONE.length) - 1]!, { TAGM_LINGUA: 'en' }, { sceneggiatore: { radice, tettoMs: 30_000 } });

    // Every text that reaches the voice engine.
    const allaVoce: string[] = [];
    const motore = s.voce.attivo as { sintetizza: MotoreVoce['sintetizza'] };
    const sintetizza = motore.sintetizza.bind(motore);
    motore.sintetizza = (r, segnale) => (allaVoce.push(r.testo), sintetizza(r, segnale));

    const schermo = await prova.proiettore(url);
    const sottotitoli: string[] = [];
    schermo.on('audio:frase', (f) => sottotitoli.push(f.testo));
    const tel = await prova.telefono(url, 'pg_aoibheann');
    let st: StatoTavolo = await inizia(schermo, tel);
    st = await turno(tel, 'pg_aoibheann', st, 'I greet Niamh and ask about the shrine of Brychan.');

    // The opening and the first turn: respellings to the voice, written names on screen and in the transcript.
    await finché(() => allaVoce.some((t) => t.includes('Rooms in KOOM-tyth')));
    expect(allaVoce).toContain('The inn of KOOM-tyth is full of smoke.');
    expect(allaVoce.some((t) => t.startsWith('NEEV DOO-gal, the innkeeper'))).toBe(true);
    expect(allaVoce).toContain('ee-VAWN steps up to the counter.');
    expect(allaVoce.some((t) => t.startsWith('KAD-oo-gan, what do you do'))).toBe(true);
    const mostrato = [...sottotitoli, ...st.trascrizione.map((v) => v.testo)].join('\n');
    for (const r of RESPELLINGS) expect(mostrato).not.toContain(r);
    expect(mostrato).toContain('Niamh Dubhghall');
    expect(mostrato).toContain('Aoibheann steps up to the counter.');

    // The background request asks for the new name the player typed; known names are not asked.
    const richieste = (): RichiestaSceneggiatore[] => (fs.existsSync(c.richieste) ? fs.readdirSync(c.richieste).map((f) => leggiJson<RichiestaSceneggiatore>(path.join(c.richieste, f))!) : []);
    await finché(() => richieste().some((r) => r.tipo === 'prossime'));
    const prossime = richieste().find((r) => r.tipo === 'prossime')!;
    expect(prossime.nomi_senza_pronuncia).toEqual(['Brychan']);
    expect(richieste().find((r) => r.tipo === 'subito')?.nomi_senza_pronuncia).toBeUndefined();

    // «Claude Code» answers with lines and the pronunciation; the Engine adds it to the game lexicon.
    scriviJson(path.join(c.risposte, `${prossime.id}.json`), {
      id: prossime.id,
      esito: 'ok',
      ms: 900,
      yaml: [
        'battute:',
        `  - id: ${prossime.prefisso}1`,
        '    chi: png_keeper',
        '    tipo: reazione',
        '    quando: "a PC asks about the old shrine"',
        '    temi: [shrine, old]',
        '    testo:',
        '      - "[png_keeper] That shrine is closed, and so is my mouth."',
        'pronunce:',
        '  - {nome: Brychan, grafia: BRUH-khan, nota: "ch as in loch"}',
        '  - {nome: Niamh, grafia: NEE-am}',
      ].join('\n'),
    });
    const fileGioco = path.join(cartella, FILE_LESSICO_GIOCO);
    await finché(() => fs.existsSync(fileGioco));
    const gioco = YAML.parse(fs.readFileSync(fileGioco, 'utf8')) as { lessico: Array<Record<string, unknown>> };
    // Only the new name: a prepared name (Niamh) is never changed by a game proposal.
    expect(gioco.lessico).toEqual([{ nome: 'Brychan', en: { grafia: 'BRUH-khan', nota: 'ch as in loch' }, origine: { fonte: 'sceneggiatore', turno: 1 }, verificata: false }]);

    // Turns 2 and 3: the new name is said with its respelling from then on; the screen keeps «Brychan».
    st = await turno(tel, 'pg_aoibheann', st, 'I look at the door.');
    st = await turno(tel, 'pg_aoibheann', st, 'I wait by the fire.');
    await finché(() => allaVoce.some((t) => t.includes('BRUH-khan')));
    expect(allaVoce).toContain('Nobody has prayed to BRUH-khan since the flood.');
    expect(allaVoce).toContain('By ISS-garth, nobody leaves before the rain stops.');
    expect(allaVoce.join('\n')).not.toMatch(/\b(Cwmtaith|Niamh|Aoibheann|Cadwgan|Xyrrhae|Ysgarth|Brychan)\b/);
    expect(st.trascrizione.map((v) => v.testo).join('\n')).toContain('Nobody has prayed to Brychan since the flood.');
    expect(sottotitoli.join('\n')).not.toContain('BRUH-khan');
  }, 30_000);
});
