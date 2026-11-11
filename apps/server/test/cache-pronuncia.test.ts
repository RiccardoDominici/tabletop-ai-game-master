/**
 * Audio prepared in advance and the pronunciation lexicon (docs/pronuncia.md, «Audio prepared in advance»; e2e second
 * pass §9: a cached line still said «Bènni» after the lexicon changed it to «Benni»). The cache key hashes the exact
 * text sent to the voice, respellings included, for the engine that says it: a lexicon change gives the line a new
 * key, so it is generated again, and the dry run says how many lines are missing because their pronunciation changed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { pianoFish, riassuntoFish, type PianoFish } from '../src/strumenti/prerender-fish';
import { CacheAudio, chiaveAudio, testoPerVoce } from '../src/voce/cache-audio';
import { creaPronunciatore, FILE_LESSICO } from '../src/voce/pronuncia';

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'campagne');
const cartelle: string[] = [];
afterEach(() => {
  for (const c of cartelle.splice(0)) fs.rmSync(c, { recursive: true, force: true });
});

function temporanea(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-cache-pronuncia-'));
  cartelle.push(d);
  return d;
}

/** A copy of the mini fixture (its sheet says «Òste Brùno»; one line of the innkeeper names Bruno). */
function campagnaCopia(): string {
  const dest = path.join(temporanea(), 'mini');
  fs.cpSync(path.join(FIXTURE, 'mini'), dest, { recursive: true });
  return dest;
}

const piano = (cartella: string): PianoFish => {
  const c = caricaCampagna(cartella);
  return pianoFish(c, caricaRepertorio(c, loggerMuto()), creaPronunciatore(c, 'fish'));
};

/** What prerender does for every line it generates (a little PCM, the index entry with the shown text). */
function genera(cache: CacheAudio, p: PianoFish, conMostrato = true): void {
  for (const r of p.unici) cache.scrivi(r.chiave, Buffer.alloc(4410), { voce: r.voce, testo: r.espressivo, ...(conMostrato ? { mostrato: r.mostrato } : {}), sample_rate: 44_100 });
}

describe('pre-generated audio and the pronunciation lexicon', () => {
  it('a lexicon change gives the lines with that name a new key: regenerated, and counted as «pronunciation changed»', () => {
    const cartella = campagnaCopia();
    const cache = new CacheAudio(path.join(temporanea(), 'fish'));
    const prima = piano(cartella);
    genera(cache, prima);
    expect(riassuntoFish(prima, cache).da_generare).toBe(0);
    const conBruno = prima.unici.filter((r) => /\bBruno\b/.test(r.mostrato));
    expect(conBruno.length).toBeGreaterThan(0);
    expect(conBruno.every((r) => r.espressivo.includes('Brùno'))).toBe(true); // the sheet's `pronuncia`

    // The Preparer (or the ear test) changes the respelling in the lexicon.
    fs.writeFileSync(path.join(cartella, FILE_LESSICO), YAML.stringify({ lessico: [{ nome: 'Bruno', tipo: 'png', it: { grafia: 'Bruno' } }] }));
    const dopo = piano(cartella);
    const r = riassuntoFish(dopo, cache);
    expect(r.da_generare).toBe(conBruno.length);
    expect(r.da_generare_per_motivo).toEqual({ nuova: 0, pronuncia: conBruno.length, direzione: 0 });
    expect(r.esempi_pronuncia[0]).toMatch(/Bruno/);
    // The other lines keep their audio; the regenerated ones say the new respelling.
    expect(dopo.unici.filter((x) => !cache.ha(x.chiave)).every((x) => x.espressivo.includes('Bruno') && !x.espressivo.includes('Brùno'))).toBe(true);
  });

  it('an entry written before the index had the shown text: an accent-only change is still recognised', () => {
    const cartella = campagnaCopia();
    const cache = new CacheAudio(path.join(temporanea(), 'fish'));
    genera(cache, piano(cartella), false);
    fs.writeFileSync(path.join(cartella, FILE_LESSICO), YAML.stringify({ lessico: [{ nome: 'Bruno', tipo: 'png', it: { grafia: 'Bruno' } }] }));
    expect(riassuntoFish(piano(cartella), cache).da_generare_per_motivo.pronuncia).toBeGreaterThan(0);
  });

  it('same words, another direction: counted as «direction changed», not as a pronunciation', () => {
    const cartella = campagnaCopia();
    const cache = new CacheAudio(path.join(temporanea(), 'fish'));
    genera(cache, piano(cartella));
    const f = path.join(cartella, 'png', 'png_oste.yaml');
    const scheda = YAML.parse(fs.readFileSync(f, 'utf8')) as { voce: { tts: Record<string, unknown> } };
    scheda.voce.tts['direzione'] = 'stanco, a bassa voce';
    fs.writeFileSync(f, YAML.stringify(scheda));
    const m = riassuntoFish(piano(cartella), cache).da_generare_per_motivo;
    expect(m.direzione).toBeGreaterThan(0);
    expect(m.pronuncia).toBe(0);
  });

  it('the key is per engine: drama-3 and Qwen get their own respelling, so their caches never mix them', () => {
    const cartella = campagnaCopia();
    fs.writeFileSync(path.join(cartella, FILE_LESSICO), YAML.stringify({ lessico: [{ nome: 'Bruno', tipo: 'png', it: { grafia: 'BRU-no' } }] }));
    const c = caricaCampagna(cartella);
    const riga = '[png_oste] Va bene. Ci metto l\'acqua. Bruno ha fatto il furbo.';
    const fish = testoPerVoce('png_oste', riga, creaPronunciatore(c, 'fish')).voce;
    const qwen = testoPerVoce('png_oste', riga, creaPronunciatore(c, 'qwen')).voce;
    expect(fish).toContain('BRU-no');
    expect(qwen).toContain('Bru-no');
    expect(chiaveAudio('vincent', fish)).not.toBe(chiaveAudio('vincent', qwen));
  });
});
