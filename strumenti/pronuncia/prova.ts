/**
 * Ear test of the pronunciation lexicon (docs/pronuncia.md). For each name in campagne/<id>/pronunce.yaml:
 *
 *   1. the spellings to try: the written name (how it is read without the lexicon), the current spelling, the
 *      file's `candidate`s and, if there are fewer than two, those proposed by Claude Code (`claude -p`, one call for all names);
 *   2. each spelling, inside the language's carrier sentence (lingue/<l>/testi-varie.yaml, pronuncia.frase_prova),
 *      is synthesised with the game's voices (drama-3 and/or local Qwen) and transcribed with Whisper;
 *   3. the transcript is compared with the intended sound (strumenti/pronuncia/punteggio.ts); the highest average
 *      across voices wins, and on a tie (within 0.1) the Preparer's spelling, then one that only adds accent marks, then
 *      the written name, then any other spelling;
 *   4. in the lexicon: `grafia` = the winner, `suono`, and `verificata: {data, voci, punteggio, base}`.
 *
 *   npx tsx strumenti/pronuncia/prova.ts campagne/<id> [--voci fish,qwen] [--url-qwen URL] [--voce narratore]
 *        [--solo Nome1,Nome2] [--nuovi] [--aggiungi] [--gioco] [--senza-modello] [--modello haiku]
 *        [--parallele 3] [--ripetizioni 1] [--non-scrivere] [--dry-run]
 *
 *   --voci       engines to use (default: drama-3 if the OpenRouter key is there, Qwen if the service answers)
 *   --url-qwen   Qwen service (default: TAGM_VOCE_URL or 127.0.0.1:4611; never during a game)
 *   --nuovi      only the entries not yet verified
 *   --aggiungi   first adds to the lexicon the `pronuncia` field of the sheets and the names the validator finds
 *                without a voice (PRONUNCIA.nome_senza_voce): this is how the lexicon of a campaign that has none yet is built
 *   --gioco      also tests pronunce-gioco.yaml (the names added in play)
 *   --ripetizioni  listenings per respelling and voice (mean score): the same text does not always sound the same
 *   --dry-run    no calls: plan and estimated cost
 *
 * Exit: 0 done (or nothing to test); 1 error; 2 wrong arguments; 3 no voice available.
 *
 * Cost: a few cents per name (drama-3 $2 per million bytes, Whisper $0.006 per minute). Log:
 * <TAGM_LOG or logs>/pronuncia.jsonl (one line per listening) and pronuncia-<campagna>.md (the table).
 * The OpenRouter key is never printed.
 */
import '../../apps/server/src/variabili-legacy'; // old CANTASTORIE_* names → TAGM_*: must come before any env read
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import YAML, { isMap, isSeq, type Document, type YAMLMap } from 'yaml';
import { caricaCampagna } from '../../apps/server/src/campagna/caricatore';
import { caricaConfig } from '../../apps/server/src/config';
import { cercaChiave } from '../../apps/server/src/llm/chiavi';
import { impostaLingua, LINGUA_PREDEFINITA, testo, type Lingua } from '../../apps/server/src/lingua';
import { creaLogger } from '../../apps/server/src/logger';
import { RADICE_REPO } from '../../apps/server/src/percorsi';
import { costoFish, MotoreVoceFish } from '../../apps/server/src/voce/fish';
import { MotoreVoceHttp } from '../../apps/server/src/voce/http';
import { FILE_LESSICO, FILE_LESSICO_GIOCO } from '../../apps/server/src/voce/pronuncia';
import { caricaRegistroVoci } from '../../apps/server/src/voce/registro-voci';
import type { MotoreVoce } from '../../apps/server/src/voce/tipi';
import { DOLLARI_PER_MINUTO_WHISPER, sintetizza, WhisperOpenRouter, type Trascrittore } from './audio';
import { chiediProposte, maiuscolaComeIlNome, type Proposta, type RichiestaProposta } from './proposte';
import { valuta, type Ascolto } from './punteggio';

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    voci: { type: 'string' },
    'url-qwen': { type: 'string' },
    voce: { type: 'string', default: 'narratore' },
    solo: { type: 'string' },
    nuovi: { type: 'boolean', default: false },
    aggiungi: { type: 'boolean', default: false },
    gioco: { type: 'boolean', default: false },
    'senza-modello': { type: 'boolean', default: false },
    modello: { type: 'string', default: process.env['TAGM_PRONUNCIA_MODELLO'] ?? 'haiku' },
    parallele: { type: 'string', default: '3' },
    ripetizioni: { type: 'string', default: '1' },
    'non-scrivere': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});

/** Score differences below this are noise (Whisper and the voices vary from one listening to the next). */
const PARI = 0.1;
const senzaAccenti = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '');
const cartella = path.resolve(positionals[0] ?? '');
if (!positionals[0] || !fs.existsSync(cartella)) {
  console.error('usage: npx tsx strumenti/pronuncia/prova.ts campagne/<id> [options] (see the header of the file)');
  process.exit(2);
}
const config = caricaConfig(process.env);
const cartellaLog = process.env['TAGM_LOG'] ? path.resolve(process.env['TAGM_LOG']) : path.join(RADICE_REPO, 'logs');
// Terminal shows only warnings (the table stays readable); everything goes to the file.
const log = creaLogger({ livello: 'warn', cartellaLog, nomeFile: 'pronuncia-strumento.jsonl' });
const campagna = caricaCampagna(cartella);
const lingua: Lingua = campagna.lingua ?? LINGUA_PREDEFINITA;
impostaLingua(lingua);
const PORTANTE = testo('pronuncia.frase_prova', { nome: '{nome}' });
const id = path.basename(cartella);

// ------------------------------------------------------------------ the lexicon as a document (comments kept)

interface Voce {
  doc: Document;
  file: string;
  nodo: YAMLMap;
  nome: string;
  grafia: string | null;
  suono: string | null;
  candidate: string[];
  verificata: boolean;
}

function apri(file: string): Document {
  if (!fs.existsSync(file)) return new YAML.Document({ lessico: [] });
  return YAML.parseDocument(fs.readFileSync(file, 'utf8'));
}

function vociDi(doc: Document, file: string): Voce[] {
  const seq = doc.get('lessico');
  if (!isSeq(seq)) return [];
  return seq.items.filter(isMap).map((nodo) => {
    const blocco = nodo.get(lingua, true);
    const b = isMap(blocco) ? (blocco.toJSON() as Record<string, unknown>) : typeof nodo.get(lingua) === 'string' ? { grafia: nodo.get(lingua) } : {};
    return {
      doc,
      file,
      nodo,
      nome: String(nodo.get('nome') ?? '').trim(),
      grafia: typeof b['grafia'] === 'string' ? b['grafia'] : null,
      suono: typeof b['suono'] === 'string' ? b['suono'] : null,
      candidate: Array.isArray(b['candidate']) ? b['candidate'].filter((c): c is string => typeof c === 'string') : [],
      verificata: !!nodo.get('verificata'),
    };
  }).filter((v) => v.nome);
}

/** The validator's PRONUNCIA lines (the same detector as the preparation step, strumenti/valida). */
function avvisiPronuncia(): string {
  try {
    return execFileSync('python3', ['-I', path.join(RADICE_REPO, 'strumenti', 'valida_campagna.py'), cartella, '--avvisi', '--senza-node', '--solo', 'PRONUNCIA'], { encoding: 'utf8' });
  } catch (err) {
    // The validator exits with 1 if it finds errors: the output is there all the same.
    return String((err as { stdout?: string }).stdout ?? '');
  }
}

/** The names the validator finds without a voice. */
function nomiSenzaVoce(): string[] {
  return [...avvisiPronuncia().matchAll(/\[PRONUNCIA\.nome_senza_voce\][^«]*«([^»]+)»/g)].map((m) => m[1]!);
}

/** The entries whose name the validator also finds as an ordinary lowercase word (PRONUNCIA.parola_comune). */
function nomiComuni(): string[] {
  return [...avvisiPronuncia().matchAll(/\[PRONUNCIA\.parola_comune\] \S+ ([^:]+):/g)].map((m) => m[1]!.trim());
}

/** A sentence from the campaign files in which the name appears, to tell the model what it is. */
function esempioDi(nome: string): string | undefined {
  const re = new RegExp(`(?<![\\p{L}])${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u');
  const cerca = (dir: string): string | undefined => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory() && !['immagini', 'audio', 'regole'].includes(f.name)) {
        const r = cerca(p);
        if (r) return r;
      } else if (f.name.endsWith('.yaml') && !f.name.startsWith('pronunce')) {
        const riga = fs.readFileSync(p, 'utf8').split('\n').find((r) => re.test(r) && !r.trimStart().startsWith('#'));
        if (riga) return riga.replace(/^\s*-?\s*[a-z_]+:\s*/, '').replace(/^["']|["']$/g, '').slice(0, 180);
      }
    }
    return undefined;
  };
  return cerca(cartella);
}

/**
 * Every word of an NPC or PC name with the matching word of its sheet's `pronuncia` field (same word count), even when
 * the two are equal: a name the sheet already spells right still needs its entry and its ear test.
 */
function paroleDelleSchede(): Map<string, string> {
  const out = new Map<string, string>();
  for (const d of [...campagna.png.map((p) => p.dati), ...campagna.pg.map((p) => p.pubblico)]) {
    const nome = typeof d['nome'] === 'string' ? d['nome'].trim().split(/\s+/) : [];
    const pron = typeof d['pronuncia'] === 'string' ? d['pronuncia'].trim().split(/\s+/) : [];
    if (!nome.length || nome.length !== pron.length) continue;
    nome.forEach((w, i) => {
      if (/^\p{Lu}/u.test(w) && w.length >= 2 && !out.has(w)) out.set(w, pron[i]!);
    });
  }
  return out;
}

// ------------------------------------------------------------------ the game's voices

async function motori(): Promise<Array<{ nome: string; motore: MotoreVoce }>> {
  const voluti = o.voci ? o.voci.split(',').map((x) => x.trim()) : ['fish', 'qwen'];
  const out: Array<{ nome: string; motore: MotoreVoce }> = [];
  if (voluti.includes('fish')) {
    try {
      cercaChiave('OPENROUTER_API_KEY', { filePrecedente: config.voce.fish.fileChiave });
      out.push({ nome: 'drama-3', motore: new MotoreVoceFish({ fileChiave: config.voce.fish.fileChiave, voci: caricaRegistroVoci(config.voce.fish.registro), primoByteMs: 20_000, log: log.child({ modulo: 'voce-fish' }) }) });
    } catch {
      console.log('drama-3: no OpenRouter key, skipping');
    }
  }
  if (voluti.includes('qwen')) {
    const url = o['url-qwen'] ?? config.voce.url;
    const m = new MotoreVoceHttp(url, log.child({ modulo: 'voce-qwen' }));
    const salute = await m.salute().catch(() => null);
    if (salute?.pronto) out.push({ nome: 'qwen', motore: m });
    else console.log(`qwen: service not ready at ${url}, skipping`);
  }
  return out;
}

// ------------------------------------------------------------------ the test

interface Esito {
  voce: Voce;
  suono: string;
  /** spelling → voice → listening */
  ascolti: Map<string, Map<string, Ascolto>>;
  media: Map<string, number>;
  scelta: string;
}

async function inParallelo<T>(lista: readonly T[], n: number, fai: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => {
    while (i < lista.length) await fai(lista[i++]!);
  }));
}

async function main(): Promise<void> {
  const fileLessico = path.join(cartella, FILE_LESSICO);
  const doc = apri(fileLessico);
  /** Names added to the lexicon by this run (--aggiungi), lowercase. */
  const aggiunti = new Set<string>();
  if (o.aggiungi) {
    if (!fs.existsSync(fileLessico) && !o['dry-run']) fs.writeFileSync(fileLessico, `# Pronunciation lexicon (docs/pronuncia.md).\n${doc.toString()}`);
    const seq = doc.get('lessico');
    const presenti = new Set(vociDi(doc, fileLessico).map((v) => v.nome.toLowerCase()));
    // The `pronuncia` field of the sheets enters the lexicon as the starting spelling (then it is tested like the others).
    const dalleSchede = [...paroleDelleSchede()].filter(([n]) => !presenti.has(n.toLowerCase()));
    for (const [n] of dalleSchede) presenti.add(n.toLowerCase());
    const nuovi = nomiSenzaVoce().filter((n) => !presenti.has(n.toLowerCase()));
    if (isSeq(seq)) {
      for (const [n, g] of dalleSchede) seq.add(doc.createNode({ nome: n, [lingua]: { grafia: g } }, { flow: true }));
      for (const n of nuovi) seq.add(doc.createNode({ nome: n }, { flow: true }));
      for (const n of [...dalleSchede.map(([x]) => x), ...nuovi]) aggiunti.add(n.toLowerCase());
    }
    console.log(`from the sheets: ${dalleSchede.map(([n]) => n).join(', ') || 'none'}; names without a voice added: ${nuovi.join(', ') || 'none'}`);
  }
  const docGioco = o.gioco ? apri(path.join(cartella, FILE_LESSICO_GIOCO)) : null;
  const solo = o.solo ? new Set(o.solo.split(',').map((x) => x.trim().toLowerCase())) : null;
  const voci = [...vociDi(doc, fileLessico), ...(docGioco ? vociDi(docGioco, path.join(cartella, FILE_LESSICO_GIOCO)) : [])]
    .filter((v) => (!solo || solo.has(v.nome.toLowerCase())) && (!o.nuovi || !v.verificata));
  if (!voci.length) return void console.log('no names to test');

  // 1. Model proposals for whoever has fewer than two spellings different from the name.
  const grafieDi = (v: Voce): string[] => [...new Set([v.grafia, ...v.candidate].filter((x): x is string => !!x && x !== v.nome))];
  const daProporre = voci.filter((v) => grafieDi(v).length < 2);
  const proposte = new Map<string, Proposta>();
  if (daProporre.length && !o['senza-modello'] && !o['dry-run']) {
    const richieste: RichiestaProposta[] = daProporre.map((v) => {
      const tipo = v.nodo.get('tipo');
      const esempio = esempioDi(v.nome);
      return { nome: v.nome, ...(typeof tipo === 'string' ? { tipo } : {}), ...(v.grafia ? { grafia: v.grafia } : {}), ...(esempio ? { esempio } : {}) };
    });
    console.log(`proposals: ${richieste.length} names to Claude Code (${o.modello})…`);
    const { proposte: lista, ms, risposta } = await chiediProposte(richieste, lingua, o.modello!);
    for (const p of lista) proposte.set(p.nome.toLowerCase(), p);
    console.log(`proposals: ${lista.length} in ${Math.round(ms / 1000)} s`);
    if (!lista.length) {
      // Nothing readable: keep the answer for whoever debugs it (the names are campaign content, no secrets).
      const file = path.join(cartellaLog, `pronuncia-proposte-${id}.txt`);
      fs.writeFileSync(file, risposta);
      console.log(`proposals: none readable, the answer is in ${file}`);
    }
    log.info({ campagna: id, nomi: richieste.length, risposte: lista.length, ms, modello: o.modello }, 'pronunciation: model proposals');
  }
  // Words the model says are not proper nouns (only new entries, without a respelling yet) go to `non_nomi`.
  const nonNomi = voci.filter((v) => !v.grafia && v.doc === doc && proposte.get(v.nome.toLowerCase())?.nonNome);
  if (nonNomi.length) {
    const seq = doc.get('lessico');
    if (isSeq(seq)) for (const v of nonNomi) seq.items.splice(seq.items.indexOf(v.nodo), 1);
    const prima = doc.get('non_nomi');
    const elenco = isSeq(prima) ? (prima.toJSON() as string[]) : [];
    doc.set('non_nomi', doc.createNode([...new Set([...elenco, ...nonNomi.map((v) => v.nome)])], { flow: true }));
    console.log(`not proper nouns, moved to non_nomi: ${nonNomi.map((v) => v.nome).join(', ')}`);
  }
  const piano = voci.filter((v) => !nonNomi.includes(v)).map((v) => {
    const p = proposte.get(v.nome.toLowerCase());
    // Case-only duplicates removed: for the voice they are the same spelling (and the written name is already the first try).
    const grafie = maiuscolaComeIlNome(v.nome, [...grafieDi(v), ...(p?.candidate ?? [])]).filter((x) => x.toLowerCase() !== v.nome.toLowerCase());
    // The intended sound: the one written in the lexicon, or the Preparer's spelling, and only for a new name the model's.
    return { v, p, suono: v.suono ?? v.grafia ?? p?.suono ?? v.nome, prove: [v.nome, ...grafie] };
  });

  if (!piano.length) {
    // Only non-names this time: the lexicon changed (non_nomi), nothing to listen to.
    if (!o['non-scrivere'] && !o['dry-run'] && nonNomi.length) fs.writeFileSync(fileLessico, doc.toString({ lineWidth: 0 }));
    return void console.log('no name to listen to');
  }
  const ms = await (o['dry-run'] ? Promise.resolve([]) : motori());
  const nVoci = o['dry-run'] ? (o.voci ? o.voci.split(',').length : 2) : ms.length;
  const ripetizioni = Math.max(1, Number(o.ripetizioni) || 1);
  const clip = piano.reduce((n, x) => n + x.prove.length, 0) * nVoci * ripetizioni;
  const stima = piano.reduce((u, x) => u + x.prove.reduce((a, g) => a + costoFish(PORTANTE.replace('{nome}', g)).usd, 0), 0) * ripetizioni + clip * (3.5 / 60) * DOLLARI_PER_MINUTO_WHISPER;
  console.log(`${piano.length} names, ${clip} listenings with ${nVoci} voices, estimated cost ~${stima.toFixed(3)} $`);
  if (o['dry-run']) {
    for (const x of piano) console.log(`  ${x.v.nome}: sound «${x.suono}», tries ${x.prove.map((g) => `«${g}»`).join(' ')}`);
    return;
  }
  if (!ms.length) {
    console.log('no voice available (neither drama-3 nor Qwen): no test');
    process.exit(3);
  }
  const orecchio: Trascrittore = new WhisperOpenRouter({ fileChiave: config.voce.fish.fileChiave });

  // 2–3. Listenings.
  const registro = path.join(cartellaLog, 'pronuncia.jsonl');
  let spesa = 0;
  const esiti: Esito[] = [];
  let k = 0;
  await inParallelo(piano, Number(o.parallele), async (x) => {
    const ascolti = new Map<string, Map<string, Ascolto>>();
    for (const g of x.prove) {
      const perVoce = new Map<string, Ascolto>();
      for (const { nome: nv, motore } of ms) {
        const frase = PORTANTE.replace('{nome}', g);
        // Repetitions: the same text does not always come out the same (drama-3 once said «Libia» for «Livia»).
        for (let r = 0; r < ripetizioni; r++) try {
          const audio = await sintetizza(motore, o.voce!, frase, `pron-${id}-${++k}`);
          const t = await orecchio.trascrivi(audio, lingua);
          spesa += audio.costo_usd + t.costo_usd;
          const a = valuta(t.testo, PORTANTE, x.suono, x.v.nome, lingua);
          const prima = perVoce.get(nv);
          // Kept: the first transcription, and the mean score of the repetitions.
          perVoce.set(nv, prima ? { ...prima, punteggio: Math.round(((prima.punteggio * r + a.punteggio) / (r + 1)) * 100) / 100 } : a);
          fs.appendFileSync(registro, `${JSON.stringify({ ts: new Date().toISOString(), campagna: id, nome: x.v.nome, grafia: g, voce: nv, suono: x.suono, trascrizione: t.testo, sentito: a.sentito, punteggio: a.punteggio, secondi: Math.round(audio.secondi * 100) / 100, costo_usd: Math.round((audio.costo_usd + t.costo_usd) * 1e6) / 1e6 })}\n`);
        } catch (err) {
          console.log(`  ${x.v.nome} «${g}» ${nv}: ${(err as Error).message}`);
          log.warn({ nome: x.v.nome, grafia: g, voce: nv, err: (err as Error).message }, 'pronunciation: listening failed');
        }
      }
      ascolti.set(g, perVoce);
    }
    const media = new Map([...ascolti].map(([g, pv]) => [g, pv.size ? [...pv.values()].reduce((s, a) => s + a.punteggio, 0) / pv.size : -1]));
    const migliore = Math.max(...media.values());
    // Ties (within PARI): the Preparer's respelling, then one that only adds accent marks (Whisper does not hear the
    // stress, and a stress mark costs nothing when the ear is even), then the name as written, and a different
    // spelling last (equal by ear means no evidence that it helps).
    const pari = x.prove.filter((g) => (media.get(g) ?? -1) >= migliore - PARI);
    const soloAccenti = (g: string): boolean => g !== x.v.nome && senzaAccenti(g).toLowerCase() === senzaAccenti(x.v.nome).toLowerCase();
    const scelta = (x.v.grafia && pari.includes(x.v.grafia) ? x.v.grafia : null) ?? pari.find(soloAccenti) ?? (pari.includes(x.v.nome) ? x.v.nome : pari[0]!);
    esiti.push({ voce: x.v, suono: x.suono, ascolti, media, scelta });
    console.log(`  ${x.v.nome}: ${[...media].map(([g, s]) => `«${g}» ${s.toFixed(2)}`).join(', ')} → «${scelta}»`);
  });

  // 4. Lessico aggiornato.
  const oggi = new Date().toISOString().slice(0, 10);
  const nomiVoci = ms.map((m) => m.nome);
  for (const e of esiti) {
    if (!e.ascolti.get(e.scelta)?.size) continue;
    const { nodo, doc: d } = e.voce;
    const p = proposte.get(e.voce.nome.toLowerCase());
    const blocco = nodo.get(lingua, true);
    // The intended sound is written only when it is not just the Preparer's respelling (a new name: the model's).
    const suonoNuovo = !e.voce.suono && !e.voce.grafia && p?.suono ? { suono: p.suono } : {};
    const nuovo = { ...(isMap(blocco) ? (blocco.toJSON() as Record<string, unknown>) : {}), grafia: e.scelta, ...suonoNuovo, ...(p?.nota && !isMap(blocco) ? { nota: p.nota } : {}) };
    delete (nuovo as Record<string, unknown>)['candidate'];
    nodo.set(lingua, d.createNode(nuovo, { flow: true }));
    // `tipo` right after `nome`, where the Preparer writes it.
    if (p?.tipo && !nodo.get('tipo')) nodo.items.splice(1, 0, d.createPair('tipo', p.tipo) as (typeof nodo.items)[number]);
    nodo.set('verificata', d.createNode({ data: oggi, voci: nomiVoci, punteggio: Math.round((e.media.get(e.scelta) ?? 0) * 100) / 100, base: Math.round((e.media.get(e.voce.nome) ?? 0) * 100) / 100 }, { flow: true }));
  }
  if (!o['non-scrivere']) {
    fs.writeFileSync(fileLessico, doc.toString({ lineWidth: 0 }));
    if (docGioco) fs.writeFileSync(path.join(cartella, FILE_LESSICO_GIOCO), docGioco.toString({ lineWidth: 0 }));
    // An entry added in this run whose name is also an ordinary word («fiocchi», «malta») is replaced only with its
    // capital (`solo_maiuscolo`), so the voice does not change the ordinary word. Entries of the Preparer stay as
    // they are: the validator warns about them.
    if (aggiunti.size) {
      const comuni = nomiComuni().filter((n) => aggiunti.has(n.toLowerCase()));
      for (const v of vociDi(doc, fileLessico)) {
        if (!comuni.includes(v.nome)) continue;
        v.nodo.set('solo_maiuscolo', true);
      }
      if (comuni.length) {
        fs.writeFileSync(fileLessico, doc.toString({ lineWidth: 0 }));
        console.log(`also ordinary words, replaced only with the capital (solo_maiuscolo): ${comuni.join(', ')}`);
      }
    }
  }

  // Table: name, default voice → transcript, chosen spelling → transcript, score.
  const righe = ['| name | voice | default TTS → heard | chosen respelling → heard | score (default → chosen) |', '|---|---|---|---|---|'];
  for (const e of esiti.sort((a, b) => a.voce.nome.localeCompare(b.voce.nome))) {
    for (const nv of nomiVoci) {
      const base = e.ascolti.get(e.voce.nome)?.get(nv);
      const scelta = e.ascolti.get(e.scelta)?.get(nv);
      righe.push(`| ${e.voce.nome} | ${nv} | «${base?.sentito || base?.trascrizione || '—'}» | ${e.scelta === e.voce.nome ? '(kept as written)' : `«${e.scelta}»`} → «${scelta?.sentito || scelta?.trascrizione || '—'}» | ${base?.punteggio.toFixed(2) ?? '—'} → ${scelta?.punteggio.toFixed(2) ?? '—'} |`);
    }
  }
  const tabella = righe.join('\n');
  fs.writeFileSync(path.join(cartellaLog, `pronuncia-${id}.md`), `# Pronunciation round trip: ${id} (${oggi})\n\nIntended sound from the lexicon (\`suono\`); voice «${o.voce}»; carrier: «${PORTANTE}»\n\n${tabella}\n\nSpent: ${spesa.toFixed(4)} $\n`);
  console.log(`\n${tabella}\n\nspent ${spesa.toFixed(4)} $, ${o['non-scrivere'] ? 'lexicon NOT written' : `lexicon written: ${path.relative(RADICE_REPO, fileLessico)}`}`);
  log.info({ campagna: id, nomi: esiti.length, spesa_usd: Math.round(spesa * 1e4) / 1e4, voci: nomiVoci }, 'pronunciation: test finished');
}

main().catch((err) => {
  console.error(`pronunciation test: ${(err as Error).message}`);
  process.exit(1);
});
