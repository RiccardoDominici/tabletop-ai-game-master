/**
 * Passi del manuale (regole/estratti/*.md, docs/regole.md): lettura e ricerca deterministica per
 * parole chiave. L'arbitro riceve solo i passi pertinenti all'azione, e «Chiedi una regola» solo
 * quelli della domanda: pochi righi, così il contesto di Haiku resta piccolo.
 *
 * Formato di un passo:
 *   ---
 *   titolo: "Convincere qualcuno"
 *   parole: [convincere, persuadere, mentire]
 *   pagina: 34
 *   ---
 *   Testo del passo (al massimo una dozzina di righe).
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { radici } from '../narrazione/privato';
import type { Estratto } from './tipi';

/** Un passo da un file .md con l'intestazione YAML; null se manca il testo. */
export function leggiEstratto(file: string, avvisa: (m: string) => void = () => {}): Estratto | null {
  const grezzo = fs.readFileSync(file, 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(grezzo);
  const id = path.basename(file, '.md');
  let testa: Record<string, unknown> = {};
  let testo = grezzo;
  if (m) {
    try {
      testa = (YAML.parse(m[1]!) as Record<string, unknown>) ?? {};
    } catch (err) {
      avvisa(`estratti/${id}.md: intestazione non valida (${(err as Error).message})`);
    }
    testo = m[2]!;
  }
  testo = testo.trim();
  if (!testo) {
    avvisa(`estratti/${id}.md: passo vuoto, ignorato`);
    return null;
  }
  const parole = Array.isArray(testa['parole']) ? testa['parole'].filter((p): p is string => typeof p === 'string') : [];
  if (!parole.length) avvisa(`estratti/${id}.md: senza «parole», lo trova solo il titolo`);
  return {
    id,
    titolo: typeof testa['titolo'] === 'string' ? testa['titolo'] : id,
    parole,
    pagina: testa['pagina'] !== undefined && testa['pagina'] !== null ? String(testa['pagina']) : null,
    testo,
  };
}

export function leggiEstratti(cartella: string, avvisa: (m: string) => void = () => {}): Estratto[] {
  if (!fs.existsSync(cartella)) return [];
  return fs
    .readdirSync(cartella)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => leggiEstratto(path.join(cartella, f), avvisa))
    .filter((e): e is Estratto => e !== null);
}

/**
 * I passi più pertinenti a un testo (azione o domanda): punteggio = parole chiave del passo trovate
 * (radici di cinque lettere) ×3 + radici del titolo ×2 + radici del testo ×0,2 (al massimo 2).
 * Deterministico, a parità vince l'ordine dei file. Senza nessuna parola chiave in comune: niente.
 */
export function cercaEstratti(estratti: readonly Estratto[], testo: string, max = 2): Estratto[] {
  const r = radici(testo);
  const punti = estratti.map((e, i) => {
    const chiavi = new Set(e.parole.flatMap((p) => [...radici(p)]));
    const titolo = radici(e.titolo);
    const corpo = radici(e.testo);
    let forte = 0;
    let debole = 0;
    for (const x of r) {
      if (chiavi.has(x)) forte += 3;
      if (titolo.has(x)) forte += 2;
      if (corpo.has(x)) debole += 0.2;
    }
    // Senza una parola chiave o del titolo il passo non conta: il testo da solo trova di tutto.
    return { e, i, p: forte > 0 ? forte + Math.min(debole, 2) : 0 };
  });
  return punti
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .slice(0, max)
    .map((x) => x.e);
}

/** Un passo come testo breve per un prompt (titolo, pagina, al massimo `righe` righe). */
export function testoEstratto(e: Estratto, righe = 10): string {
  const corpo = e.testo.split('\n').filter((l) => l.trim()).slice(0, righe).join('\n');
  return `### ${e.titolo}${e.pagina ? ` (p. ${e.pagina})` : ''}\n${corpo}`;
}
