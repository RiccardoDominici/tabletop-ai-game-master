/**
 * Spelling proposals (docs/pronuncia.md): for names that do not yet have at least two spellings to try,
 * Claude Code (`claude -p`, the user's subscription, no tools) proposes the intended sound and three spellings for
 * the voice of the campaign's language. A single call for all the names.
 */
import '../../apps/server/src/variabili-legacy'; // old CANTASTORIE_* names → TAGM_*: must come before any env read
import { spawn } from 'node:child_process';
import type { Lingua } from '../../apps/server/src/lingua';
import { RADICE_REPO } from '../../apps/server/src/percorsi';

export interface RichiestaProposta {
  nome: string;
  tipo?: string;
  /** A sentence from the texts in which the name appears (to understand what it is). */
  esempio?: string;
  grafia?: string;
  nota?: string;
}

export interface Proposta {
  nome: string;
  tipo?: string;
  /** How a native listener would write what they need to hear. */
  suono: string;
  candidate: string[];
  nota?: string;
  /** The model says it is not a proper noun (a title, an ordinary word): it goes to `non_nomi`. */
  nonNome?: boolean;
}

const LINGUE: Record<Lingua, { nome: string; regole: string }> = {
  it: {
    nome: 'Italian',
    regole:
      'Italian spelling. Mark the stressed vowel with a grave or acute accent whenever the stress is not obvious (Nèspola, Eliàndro, Zirrà, Ugolìno); write a voiced z as dz (Dzirrà) and an unvoiced one as z; no hyphens and no capitals inside the word.',
  },
  en: {
    nome: 'English',
    regole:
      'Split the syllables with hyphens and write the stressed syllable in capitals (ee-VAWN, KOOM-tyth, NEEV); use plain English spellings for the sounds (ee, oo, ay, igh, kh for the Scottish ch, zh); no phonetic symbols.',
  },
};

export function promptProposte(nomi: readonly RichiestaProposta[], lingua: Lingua): string {
  const l = LINGUE[lingua] ?? LINGUE.it;
  const righe = nomi.map((n) => `- ${JSON.stringify({ nome: n.nome, ...(n.tipo ? { tipo: n.tipo } : {}), ...(n.grafia ? { grafia_attuale: n.grafia } : {}), ...(n.nota ? { nota: n.nota } : {}), ...(n.esempio ? { esempio: n.esempio } : {}) })}`);
  return [
    `You prepare the pronunciation lexicon of a tabletop role-playing campaign that a synthetic ${l.nome} voice reads aloud. The voice reads invented names badly, so each name gets a respelling that the server sends to the voice instead of the written name (the screen keeps the written name).`,
    '',
    `For each name below decide how it should sound in this ${l.nome} story (keep the sound the author clearly meant; a name that ${l.nome} speakers read right as written keeps its spelling as the first candidate), then write:`,
    `- "suono": the intended sound as a native ${l.nome} listener would write it after hearing it, plain lowercase letters, no hyphens, accents or capitals;`,
    `- "candidate": three DIFFERENT respellings for the ${l.nome} voice, best first. ${l.regole}`,
    '- "tipo": one of png, pg, luogo, oggetto, fazione, dio, termine, altro;',
    '- "nota": a few words on the sound or the stress (optional).',
    '- if the word is NOT a proper noun in this story (a title like «Signora», an ordinary capitalised word), answer only {"nome": "...", "non_nome": true}.',
    '',
    'Names:',
    ...righe,
    '',
    'Answer ONLY with a JSON array: [{"nome": "...", "tipo": "...", "suono": "...", "candidate": ["...", "...", "..."], "nota": "..."}]',
  ].join('\n');
}

/**
 * Spellings with the name's initial capital (a lowercase spelling of «Ugo» would write «ugo» mid-sentence), without
 * duplicates. Case inside a respelling is kept and counts (in English the capitals mark the stress: ee-VAWN, EE-vawn).
 */
export function maiuscolaComeIlNome(nome: string, candidate: readonly string[]): string[] {
  const maiuscolo = /^\p{Lu}/u.test(nome);
  const viste = new Set<string>();
  const out: string[] = [];
  for (const c of candidate) {
    // Only an all-lowercase respelling gets the capital: capitals inside one mark the stress (ee-VAWN) and stay.
    const g = maiuscolo && !/\p{Lu}/u.test(c) ? c[0]!.toUpperCase() + c.slice(1) : c;
    if (viste.has(g)) continue;
    viste.add(g);
    out.push(g);
  }
  return out;
}

/** The JSON of the reply (also inside a ```json fence); entries without a name or without candidates are discarded. */
export function leggiProposte(testo: string): Proposta[] {
  const recinto = /```(?:json)?\s*\n([\s\S]*?)```/i.exec(testo);
  const corpo = (recinto ? recinto[1]! : testo).trim();
  const inizio = corpo.indexOf('[');
  const fine = corpo.lastIndexOf(']');
  let lista: unknown = null;
  try {
    lista = inizio >= 0 && fine > inizio ? JSON.parse(corpo.slice(inizio, fine + 1)) : null;
  } catch {
    lista = null;
  }
  // Tolerant fallback: one flat JSON object per entry (a broken comma or a stray bracket loses one entry, not all).
  if (!Array.isArray(lista)) {
    lista = [...corpo.matchAll(/\{[^{}]*\}/g)].flatMap((m) => {
      try {
        return [JSON.parse(m[0]) as unknown];
      } catch {
        return [];
      }
    });
  }
  const out: Proposta[] = [];
  for (const x of lista as unknown[]) {
    if (!x || typeof x !== 'object') continue;
    const r = x as Record<string, unknown>;
    if (typeof r['nome'] !== 'string') continue;
    const nome = r['nome'].trim();
    // A capitalised word that is not a proper noun in this story (a title, an ordinary word): no respelling.
    if (r['non_nome'] === true) {
      out.push({ nome, suono: '', candidate: [], nonNome: true });
      continue;
    }
    const candidate = Array.isArray(r['candidate']) ? r['candidate'].filter((c): c is string => typeof c === 'string' && !!c.trim() && !/[[\]<>{}]/.test(c)).map((c) => c.trim()) : [];
    if (!candidate.length) continue;
    out.push({
      nome,
      suono: typeof r['suono'] === 'string' && r['suono'].trim() ? r['suono'].trim() : candidate[0]!,
      candidate: maiuscolaComeIlNome(nome, candidate).slice(0, 3),
      ...(typeof r['tipo'] === 'string' ? { tipo: r['tipo'] } : {}),
      ...(typeof r['nota'] === 'string' && r['nota'].trim() ? { nota: r['nota'].trim() } : {}),
    });
  }
  return out;
}

/** One call to non-interactive Claude Code, with no tools; JSON reply ({ result }). */
export function chiediProposte(nomi: readonly RichiestaProposta[], lingua: Lingua, modello: string, attesaMs = 180_000): Promise<{ proposte: Proposta[]; ms: number; risposta: string }> {
  const claude = process.env['TAGM_CLAUDE'] ?? 'claude';
  const inizio = Date.now();
  return new Promise((ok, ko) => {
    const p = spawn(claude, ['-p', '--model', modello, '--output-format', 'json', '--no-session-persistence', '--tools', ''], { cwd: RADICE_REPO, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => p.kill('SIGTERM'), attesaMs);
    p.stdout.on('data', (d) => (out += String(d)));
    p.stderr.on('data', (d) => (err += String(d)));
    p.on('error', (e) => (clearTimeout(timer), ko(e)));
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return ko(new Error(`claude -p exited with ${code}: ${err.trim().split('\n').at(-1)?.slice(0, 200) ?? ''}`));
      let testo = out;
      try {
        const j = JSON.parse(out) as { result?: string; is_error?: boolean };
        if (j.is_error || typeof j.result !== 'string') return ko(new Error('error reply from Claude Code'));
        testo = j.result;
      } catch {
        // raw text
      }
      ok({ proposte: leggiProposte(testo), ms: Date.now() - inizio, risposta: testo });
    });
    p.stdin.end(promptProposte(nomi, lingua));
  });
}
