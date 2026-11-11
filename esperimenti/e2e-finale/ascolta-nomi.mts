/**
 * Lexicon check of the final e2e (second pass): the drama-3 lines that the game kept in cache/audio-fish during a
 * profile-B run are transcribed with Whisper (openai/whisper-1 via OpenRouter, the ear test's own client) and every
 * proper name of the campaign's lexicon that the line contains is looked for in the transcript, phonetically.
 *
 *   npx tsx ascolta-nomi.ts <worktree> <campaign id> <ISO time of the run start> [max lines]
 *
 * Prints one line per name occurrence and a summary per name; writes nothing in the repo. Never prints the key.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const [radice, campagna, dopo, massimoTesto] = process.argv.slice(2);
const massimo = Number(massimoTesto ?? 30);
const { WhisperOpenRouter } = await import(path.join(radice, 'strumenti/pronuncia/audio.ts'));
const { somiglianza } = await import(path.join(radice, 'strumenti/pronuncia/punteggio.ts'));
const { caricaConfig } = await import(path.join(radice, 'apps/server/src/config.ts'));

const lessico = (YAML.parse(fs.readFileSync(path.join(radice, 'campagne', campagna, 'pronunce.yaml'), 'utf8')).lessico ?? []) as Array<{ nome: string; it?: { grafia?: string } }>;
const senzaAccenti = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const voci = lessico.map((v) => ({ nome: v.nome, forme: [v.nome, v.it?.grafia ?? v.nome].map(senzaAccenti) }));

const cartella = path.join(radice, 'cache', 'audio-fish');
const indice = JSON.parse(fs.readFileSync(path.join(cartella, 'indice.json'), 'utf8')) as Record<string, { voce: string; testo: string; sample_rate: number; secondi: number; creato: string }>;
const recenti = Object.entries(indice)
  .filter(([, e]) => e.creato >= dopo)
  .map(([k, e]) => ({ k, e, nomi: voci.filter((v) => v.forme.some((f) => new RegExp(`\\b${f}\\b`).test(senzaAccenti(e.testo)))) }))
  .filter((x) => x.nomi.length > 0)
  .slice(0, massimo);

const config = caricaConfig();
const orecchio = new WhisperOpenRouter({ fileChiave: config.voce.fish.fileChiave });
const esito: Record<string, { ok: number; tot: number; esempi: string[] }> = {};
let costo = 0;
console.log(`righe conservate dopo ${dopo} con un nome del lessico: ${recenti.length}`);
for (const { k, e, nomi } of recenti) {
  const pcm = fs.readFileSync(path.join(cartella, `${k}.pcm`));
  const { testo, costo_usd } = await orecchio.trascrivi({ pcm, sampleRate: e.sample_rate, secondi: e.secondi }, 'it');
  costo += costo_usd;
  const parole = senzaAccenti(testo).split(/[^a-z]+/).filter(Boolean);
  for (const v of nomi) {
    // A name is heard if a word (or two consecutive words, for «Valdirame» heard as «Val di Rame») resembles it.
    const candidati = [...parole, ...parole.slice(1).map((p, i) => parole[i] + p), ...parole.slice(2).map((p, i) => parole[i] + parole[i + 1] + p)];
    const migliore = Math.max(0, ...candidati.map((c) => somiglianza(c, v.forme[0], 'it')));
    const ok = migliore >= 0.8;
    esito[v.nome] ??= { ok: 0, tot: 0, esempi: [] };
    esito[v.nome].tot += 1;
    if (ok) esito[v.nome].ok += 1;
    else esito[v.nome].esempi.push(testo.slice(0, 120));
    console.log(`${ok ? 'OK ' : 'NO '} ${v.nome.padEnd(10)} ${migliore.toFixed(2)} | voce ${e.voce} | sent: «${e.testo.replace(/\[[^\]]*\]\s*/g, '').slice(0, 90)}» | heard: «${testo.slice(0, 90)}»`);
  }
}
console.log('\nper nome:', JSON.stringify(esito, null, 1));
console.log(`costo whisper: $${costo.toFixed(4)}`);
