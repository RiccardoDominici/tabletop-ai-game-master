/**
 * The pronunciation lexicon that grows during play (docs/pronuncia.md, «During play»). The Preparer writes
 * pronunce.yaml before the session; at the table, however, new names come up: those the players make up in
 * their actions («chiedo a Zorvak…», read out by the announcer) and those the scriptwriter puts in its lines.
 *
 * No extra calls: the request the Engine sends to the scriptwriter anyway carries the list of names that the
 * lexicon does not know (`nomi_senza_pronuncia`), and the scriptwriter answers, next to the lines, with
 * `pronunce: [{nome, grafia, nota}]` for those that really are proper names (and for the new names in its
 * lines). The Engine checks the proposals, writes them to `campagne/<id>/pronunce-gioco.yaml` and recompiles
 * the pronouncer: from the next phrase on, the voice says them that way. A name already in the prepared lexicon
 * is never changed.
 *
 * Between sessions strumenti/pronuncia/ also checks these entries by ear, and the Preparer moves them into
 * the prepared lexicon.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { Campagna } from '../campagna/tipi';
import type { Logger } from '../logger';
import { LINGUA_PREDEFINITA } from '../lingua';
import { creaPronunciatore, FILE_LESSICO_GIOCO, leggiLessico, vociDellaCampagna, type Pronunciatore, type VoceLessico } from './pronuncia';
import { estraiYaml } from '../sceneggiatore/valida';

/** Maximum names asked per request, and how many times the same name is requested without an answer. */
export const MAX_NOMI_PER_RICHIESTA = 8;
export const MAX_RICHIESTE_PER_NOME = 2;
/** Limits of a proposal: a short name and spelling, without voice markup. */
const MAX_NOME = 40;
const MAX_GRAFIA = 60;
const MARKUP = /[[\]<>{}\n\r]/;

export interface ProposteDiPronuncia {
  nome: string;
  grafia: string;
  nota?: string;
  tipo?: string;
}

/** The `pronunce:` proposals of a scriptwriter reply (empty list if missing or the YAML cannot be read). */
export function estraiPronunce(testo: string): ProposteDiPronuncia[] {
  let d: unknown;
  try {
    d = YAML.parse(estraiYaml(testo));
  } catch {
    return [];
  }
  const lista = (d as { pronunce?: unknown } | null)?.pronunce;
  if (!Array.isArray(lista)) return [];
  const out: ProposteDiPronuncia[] = [];
  for (const x of lista) {
    if (!x || typeof x !== 'object') continue;
    const r = x as Record<string, unknown>;
    const nome = typeof r['nome'] === 'string' ? r['nome'].trim() : '';
    const grafia = typeof r['grafia'] === 'string' ? r['grafia'].trim() : '';
    if (!nome || !grafia) continue;
    out.push({ nome, grafia, ...(typeof r['nota'] === 'string' && r['nota'].trim() ? { nota: r['nota'].trim() } : {}), ...(typeof r['tipo'] === 'string' ? { tipo: r['tipo'] } : {}) });
  }
  return out;
}

/**
 * Words with a mid-sentence capital that the lexicon does not know: candidate proper names. The first word of
 * a sentence does not count (there every word is capitalised); the scriptwriter decides the rest.
 */
export function candidatiNomi(testi: readonly string[], noti: ReadonlySet<string>): string[] {
  const visti = new Map<string, string>();
  for (const t of testi) {
    // «Nome: testo» of the transcript: the name of the speaker is not in the spoken text.
    const corpo = t.replace(/^[^:\n]{1,40}:\s+/, '');
    // Sentences (and quoted speech): the first word of each is capitalised anyway.
    for (const frase of corpo.split(/(?<=[.!?…:;])\s+|[«"“—]\s*/u)) {
      // The apostrophe splits («dell'Eliandro», «Zorvak's»).
      const parole = [...frase.matchAll(/[\p{L}\p{N}-]+/gu)].map((m) => m[0]);
      for (const parola of parole.slice(1)) {
        if (!/^\p{Lu}[\p{L}-]{2,}$/u.test(parola)) continue;
        const chiave = parola.toLowerCase();
        if (!noti.has(chiave) && !visti.has(chiave)) visti.set(chiave, parola);
      }
    }
  }
  return [...visti.values()];
}

export class LessicoVivo {
  private attuale: Pronunciatore;
  private readonly file: string;
  /** Names asked of the scriptwriter → how many times (without an answer it stops after MAX_RICHIESTE_PER_NOME). */
  private readonly chiesti = new Map<string, number>();
  /** The pronouncer to use everywhere: always reads the most recent lexicon. */
  readonly pronuncia: Pronunciatore = (t) => this.attuale(t);

  constructor(private readonly o: { campagna: Campagna; log: Logger }) {
    this.file = path.join(o.campagna.cartella, FILE_LESSICO_GIOCO);
    this.attuale = creaPronunciatore(o.campagna);
    const voci = vociDellaCampagna(o.campagna);
    o.log.info({ voci: voci.length, lessico: voci.filter((v) => v.fonte === 'lessico').length, gioco: voci.filter((v) => v.fonte === 'gioco').length, schede: voci.filter((v) => v.fonte === 'scheda').length }, 'pronunciation: lexicon loaded');
  }

  /** The forms already known (names, forms, words of the PNG and PG names), in lowercase. */
  private noti(): Set<string> {
    const noti = new Set<string>();
    for (const v of vociDellaCampagna(this.o.campagna)) for (const f of v.forme) for (const x of [f, ...f.split(/\s+/)]) noti.add(x.toLowerCase());
    for (const v of leggiLessico(this.file)) noti.add(v.nome.toLowerCase());
    for (const d of [...this.o.campagna.png.map((p) => p.dati), ...this.o.campagna.pg.map((p) => p.pubblico)]) {
      if (typeof d['nome'] === 'string') for (const x of d['nome'].split(/\s+/)) noti.add(x.toLowerCase());
    }
    return noti;
  }

  /** The names to ask the scriptwriter in the next request (from the last lines heard at the table). */
  daChiedere(righe: readonly string[]): string[] {
    const nomi = candidatiNomi(righe, this.noti())
      .filter((n) => (this.chiesti.get(n.toLowerCase()) ?? 0) < MAX_RICHIESTE_PER_NOME)
      .slice(0, MAX_NOMI_PER_RICHIESTA);
    for (const n of nomi) this.chiesti.set(n.toLowerCase(), (this.chiesti.get(n.toLowerCase()) ?? 0) + 1);
    if (nomi.length) this.o.log.debug({ nomi }, 'pronunciation: names without a voice requested from the scriptwriter');
    return nomi;
  }

  /**
   * Adds the admitted proposals: the name appears in `ammessi` (the names asked, or the text of the accepted
   * lines), is not already in the lexicon, and name and spelling are short and without markup. Returns the names added.
   */
  aggiungi(proposte: readonly ProposteDiPronuncia[], o: { ammessi: string; turno: number; fonte: string }): string[] {
    const lingua = this.o.campagna.lingua ?? LINGUA_PREDEFINITA;
    const noti = new Set(vociDellaCampagna(this.o.campagna).map((v) => v.nome.toLowerCase()));
    const ammessi = o.ammessi.toLowerCase();
    const nuove: VoceLessico[] = [];
    const scartate: Array<{ nome: string; motivo: string }> = [];
    for (const p of proposte) {
      const chiave = p.nome.toLowerCase();
      if (p.nome.length > MAX_NOME || p.grafia.length > MAX_GRAFIA || MARKUP.test(p.nome) || MARKUP.test(p.grafia)) scartate.push({ nome: p.nome, motivo: 'format' });
      else if (noti.has(chiave) || nuove.some((v) => v.nome.toLowerCase() === chiave)) scartate.push({ nome: p.nome, motivo: 'already in lexicon' });
      else if (!new RegExp(`(?<![\\p{L}\\p{N}])${chiave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(ammessi)) scartate.push({ nome: p.nome, motivo: 'name not asked for nor in the lines' });
      else nuove.push({ nome: p.nome, ...(p.tipo ? { tipo: p.tipo } : {}), [lingua]: { grafia: p.grafia, ...(p.nota ? { nota: p.nota } : {}) }, origine: { fonte: o.fonte, turno: o.turno }, verificata: false });
    }
    if (scartate.length) this.o.log.info({ scartate }, 'pronunciation: proposals discarded');
    if (!nuove.length) return [];
    const esistenti = fs.existsSync(this.file) ? ((YAML.parse(fs.readFileSync(this.file, 'utf8')) as { lessico?: unknown[] } | null)?.lessico ?? []) : [];
    const intestazione = '# Names met during play (apps/server/src/voce/lessico-vivo.ts). Written by the Engine; reviewed by the Preparer between sessions.\n';
    fs.writeFileSync(this.file, intestazione + YAML.stringify({ lessico: [...esistenti, ...nuove] }));
    this.attuale = creaPronunciatore(this.o.campagna);
    const nomi = nuove.map((v) => v.nome);
    this.o.log.info({ nomi, turno: o.turno, fonte: o.fonte }, 'pronunciation: new names added to the lexicon');
    return nomi;
  }
}
