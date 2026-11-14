/**
 * Names nobody knew yet (docs/ascolto.md, «Learning»): what the players' edits and actions teach the dictation. Pure.
 *
 * The phone puts the transcript in the action box; the player fixes what is wrong and sends. With the action the phone
 * sends the transcript it received, so the server can diff the two:
 * - a span of 1–3 words the player retyped into a name (a capitalised word that is not an ordinary word), and that
 *   still sounds like what was heard (`SOMIGLIANZA_MINIMA`: a respelling, not a rewrite), becomes a learned mapping
 *   heard → written. When the retyped span was itself a server correction, the heard form is Whisper's raw one;
 * - a correction the player turned back into what Whisper heard is a refused pair: never proposed again;
 * - in any sent action (typed or dictated), a capitalised word in mid-sentence that is neither in the vocabulary nor an
 *   ordinary word becomes a learned name (no heard form yet): the next dictation has it in its prompt.
 * The service keeps the learned names for the session, saves them in the session registry and hands them to the
 * pronunciation lexicon (voce/lessico-vivo.ts) so the voice says them right too.
 */
import type { Lingua } from '../lingua';
import { chiaveRifiuto, parole, type Correzione, type Parola } from './correzione';
import { formaPiana, somiglianzaFonetica } from './fonetica';
import type { NomeAppreso, VoceVocabolario } from './vocabolario';

/** A retyped span counts as a respelling of what was heard from this phonetic similarity up. */
export const SOMIGLIANZA_MINIMA = 0.45;
const MAX_NOME = 40;

export interface DatiApprendimento {
  lingua: Lingua;
  /** The transcript as the phone received it (absent: a typed action). */
  trascrizione?: string;
  /** The corrections the server made on that transcript. */
  correzioni?: readonly Correzione[];
  /** The action text the player sent. */
  inviato: string;
  voci: readonly VoceVocabolario[];
  comuni: ReadonlySet<string>;
  turno: number;
}

export interface EsitoApprendimento {
  appresi: NomeAppreso[];
  /** chiaveRifiuto(heard, written) of the corrections the player undid. */
  rifiutate: string[];
}

type Blocco = { t: [number, number]; s: [number, number] };

/** The replaced blocks between two word lists (LCS on the plain forms). */
function blocchiCambiati(a: readonly Parola[], b: readonly Parola[]): Blocco[] {
  const pa = a.map((w) => formaPiana(w.testo));
  const pb = b.map((w) => formaPiana(w.testo));
  const lcs: number[][] = Array.from({ length: pa.length + 1 }, () => new Array<number>(pb.length + 1).fill(0));
  for (let i = pa.length - 1; i >= 0; i--) for (let j = pb.length - 1; j >= 0; j--) lcs[i]![j] = pa[i] === pb[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
  const out: Blocco[] = [];
  let i = 0;
  let j = 0;
  let inizio: [number, number] | null = null;
  const chiudi = (): void => {
    if (inizio && (i > inizio[0] || j > inizio[1])) out.push({ t: [inizio[0], i], s: [inizio[1], j] });
    inizio = null;
  };
  while (i < pa.length || j < pb.length) {
    if (i < pa.length && j < pb.length && pa[i] === pb[j]) {
      chiudi();
      i++;
      j++;
    } else {
      inizio ??= [i, j];
      if (j < pb.length && (i >= pa.length || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) j++;
      else i++;
    }
  }
  chiudi();
  return out;
}

const testoDi = (testo: string, w: readonly Parola[], [da, a]: [number, number]): string => (a > da ? testo.slice(w[da]!.inizio, w[a - 1]!.fine) : '');

export function impara(d: DatiApprendimento): EsitoApprendimento {
  const noti = new Set<string>();
  for (const v of d.voci) noti.add(formaPiana(v.scritto));
  const comune = (w: Parola): boolean => d.comuni.has(formaPiana(w.testo));
  const appresi = new Map<string, NomeAppreso>();
  const rifiutate: string[] = [];
  const s = parole(d.inviato);
  const impara1 = (scritto: string, sentito: string | null): void => {
    const k = formaPiana(scritto);
    const a = appresi.get(k) ?? { scritto, sentiti: [], turno: d.turno };
    if (sentito && formaPiana(sentito) !== k && !a.sentiti.includes(sentito)) a.sentiti.push(sentito);
    appresi.set(k, a);
  };

  // 1. The player's edits of the transcript.
  const toccate = new Set<number>();
  if (d.trascrizione) {
    const t = parole(d.trascrizione);
    for (const b of blocchiCambiati(t, s)) {
      const nt = b.t[1] - b.t[0];
      const ns = b.s[1] - b.s[0];
      if (nt < 1 || nt > 3 || ns < 1 || ns > 3) continue;
      const sentitoQui = testoDi(d.trascrizione, t, b.t);
      const scritto = testoDi(d.inviato, s, b.s);
      // A server correction the player changed: back to what Whisper heard = refused; else Whisper's form is the heard one.
      const corretta = d.correzioni?.find((c) => formaPiana(c.scritto) === formaPiana(sentitoQui));
      if (corretta && formaPiana(scritto) === formaPiana(corretta.sentito)) {
        rifiutate.push(chiaveRifiuto(corretta.sentito, corretta.scritto));
        for (let k = b.s[0]; k < b.s[1]; k++) toccate.add(k);
        continue;
      }
      const sentito = corretta?.sentito ?? sentitoQui;
      const parti = s.slice(b.s[0], b.s[1]);
      if (!parti.some((w) => w.maiuscola) || parti.every(comune) || scritto.length > MAX_NOME) continue;
      if (somiglianzaFonetica(sentito, scritto, d.lingua) < SOMIGLIANZA_MINIMA) continue;
      impara1(scritto, sentito);
      for (let k = b.s[0]; k < b.s[1]; k++) toccate.add(k);
    }
  }

  // 2. New proper nouns in the sent text (mid-sentence capitals that nobody knows).
  for (let k = 0; k < s.length; k++) {
    const w = s[k]!;
    if (toccate.has(k) || !w.maiuscola || w.inizioFrase || w.testo.length < 3 || w.testo.length > MAX_NOME) continue;
    if (/^\p{Lu}+$/u.test(w.testo) || comune(w) || noti.has(formaPiana(w.testo))) continue;
    impara1(w.testo, null);
  }
  return { appresi: [...appresi.values()], rifiutate };
}
