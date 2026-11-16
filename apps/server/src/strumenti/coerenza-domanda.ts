/**
 * Scores the candidate checker (coerenza/domanda.ts: mention filter + one yes/no question to a small fast model) on the
 * frozen replay set, next to the rules (strumenti/coerenza-punteggio.ts). The model's answers are kept in
 * esperimenti/coerenza/risposte-<model>.json, so a second run is offline and the set stays frozen; `--nuove` asks again.
 *
 *   npx tsx apps/server/src/strumenti/coerenza-domanda.ts [--nuove] [--modello claude-haiku-5-5]
 *   npx tsx apps/server/src/strumenti/coerenza-domanda.ts --offline [--insieme r3 --dal-log <run>/log-server/server.jsonl]
 *
 * `--offline`: no model is ever called; a question with no kept answer counts as unanswered, and the rules decide as
 * they do live after a deadline (the judge's shadow: R-fuori, R-inesistente); the misses are counted. `--dal-log`: the
 * answers the live judge gave in a run («coherence: question answered»), by sentence, for a set with no kept answers.
 * Two variants of v2 for the first sentence of each answer (docs/coerenza.md, «First audio»): `domanda2p`, the rules
 * decide it alone and its question goes aside (the answer only feeds the carried subject of the next sentence; a «si»
 * on a sentence the rules left alone is counted as heard); `domanda2a`, what the director does: the Engine's line for
 * the flagged mention is said at once and the answer decides the sentence as in v2 (a «no» costs one more true line),
 * and with no such line (an absent NPC) the rules decide as in `domanda2p`.
 * `--tardive-portate` treats every question asked only as a carried subject as late, to score the fallback alone;
 * `--senza-portato` scores the fallback as it was before the rules' carried subject (coerenza/portato.ts).
 *
 * Asked: every flagged sentence, and the sentence right after one answered «si» (a carried subject: «Quello cade contro
 * il muro»), with the same mentions. Latency per call is measured, to compare with the voice's slack. The key is read
 * by the repo's key lookup (llm/chiavi.ts), never printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { caricaCampagna } from '../campagna/caricatore';
import { tipiGregari } from '../campagna/gregari';
import { chiedi, domandaPer } from '../coerenza/domanda';
import { contestoMenzioni, daChiedere } from '../coerenza/menzioni';
import { continuaDopo } from '../coerenza/portato';
import type { Registro } from '../coerenza/registro';
import { caricaConfig } from '../config';
import { impostaLingua } from '../lingua';
import { ModelloAnthropic } from '../llm/anthropic';
import { creaClientAnthropic } from '../llm/haiku';
import { creaLogger } from '../logger';
import { RADICE_REPO } from '../percorsi';
import type { ChiamataInsieme, FraseInsieme } from './coerenza-insieme';
import { carica, guardieDellaChiamata, riga, valuta, varianteRegole, type Variante } from './coerenza-punteggio';

const CARTELLA = path.join(RADICE_REPO, 'esperimenti', 'coerenza');

interface Risposta {
  si: boolean;
  ms: number;
  grezza: string;
}

function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]! : 0;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const nuove = args.includes('--nuove');
  const config = caricaConfig(process.env);
  const nomeModello = args.includes('--modello') ? args[args.indexOf('--modello') + 1]! : config.llm.modello;
  // `--insieme prima`: the held-out set (insieme-prima.json, etichette-prima.json), answers kept apart.
  const nomeInsieme = args.includes('--insieme') ? args[args.indexOf('--insieme') + 1]! : 'insieme';
  const { insieme, etichette, campagna } = carica(nomeInsieme);
  const c = caricaCampagna(path.join(RADICE_REPO, 'campagne', campagna));
  impostaLingua(c.lingua ?? 'it');
  const tipi = tipiGregari(c);
  // `--campione k`: a further sample of the same questions, kept in its own file (k = 1 is the committed one).
  const campione = args.includes('--campione') ? Number(args[args.indexOf('--campione') + 1]) : 1;
  const altro = nomeInsieme === 'insieme' ? '' : `-${nomeInsieme}`;
  const fileRisposte = path.join(CARTELLA, campione > 1 ? `risposte${altro}-${nomeModello}-c${campione}.json` : `risposte${altro}-${nomeModello}.json`);
  const risposte: Record<string, Risposta> = !nuove && fs.existsSync(fileRisposte) ? (JSON.parse(fs.readFileSync(fileRisposte, 'utf8')) as Record<string, Risposta>) : {};
  const log = creaLogger({ livello: 'warn', cartellaLog: path.join(RADICE_REPO, 'logs', 'porta-4949'), nomeFile: 'coerenza-domanda.jsonl' });
  let modello: ModelloAnthropic | null = null;
  const m = (): ModelloAnthropic => (modello ??= new ModelloAnthropic(() => creaClientAnthropic(config.llm.fileChiave, log), nomeModello));
  let chiamate = 0;
  const offline = args.includes('--offline');
  // The live judge's answers of a run, by sentence (the question text there had the live rows, not the set's).
  const dalLog = new Map<string, Risposta>();
  if (args.includes('--dal-log')) {
    for (const l of fs.readFileSync(args[args.indexOf('--dal-log') + 1]!, 'utf8').split('\n')) {
      if (!l.includes('coherence: question answered')) continue;
      const d = JSON.parse(l) as { frase: string; si: boolean; ms: number };
      dalLog.set(d.frase, { si: d.si, ms: d.ms, grezza: 'dal log' });
    }
  }
  /** Questions with no answer (offline): the rules decided, as after a live deadline. */
  const senzaRisposta = new Set<string>();
  /** Variant domanda2: the questions asked only as a carried subject (the sentence after a «si»), with their answer. */
  const portate = new Map<string, boolean | null>();
  const testi = new Map<string, string>(insieme.flatMap((ch) => ch.frasi.map((f) => [`${ch.id}:${f.i}`, f.testo] as [string, string])));
  /** Variant domanda2: the first sentences of an answer that went to the question (their answer, their mentions). */
  const primeChieste = new Map<string, { si: boolean | null; menzioni: readonly string[] }>();
  /** Variants domanda2p/2a: first sentences said by the rules and found wrong by the question aside, by call:sentence. */
  const corretteDopo = new Map<string, readonly string[]>();
  /** Variant domanda2a: first sentences opened by the Engine's line, and the answer that came (null: none). */
  const aperture = new Map<string, boolean | null>();
  // `--tardive-portate`: every question asked only as a carried subject counts as late (the fallback's worst case).
  const tardivePortate = args.includes('--tardive-portate');
  // `--senza-portato`: the fallback without the rules' carried subject (coerenza/portato.ts), as before round 4.
  const conPortato = !args.includes('--senza-portato');
  const risposta = async (ch: ChiamataInsieme, f: FraseInsieme, q: { sistema: string; messaggio: string }): Promise<Risposta | null> => {
    if (tardivePortate && !f.segnata) {
      senzaRisposta.add(`${ch.id}:${f.i}`);
      return null;
    }
    const chiave = `${ch.id}:${f.i}|${q.messaggio}`;
    const r = risposte[chiave] ?? dalLog.get(f.testo);
    if (r) return r;
    if (offline) {
      senzaRisposta.add(`${ch.id}:${f.i}`);
      return null;
    }
    const nuova = await chiedi(m(), q);
    risposte[chiave] = nuova;
    chiamate++;
    return nuova;
  };
  /**
   * v1 (`domanda`): every flagged sentence goes to the model, as flagged. v2 (`domanda2`), the same question with the
   * Engine's own structure around it: who fell by this turn's cards is not asked about (their fall is this turn's story,
   * as R-fuori's `oraFuori`); an NPC's own line is judged by the deterministic R-assente (the model never saw the
   * speaker); the card rules of R-esito (pair, fall) stay deterministic, and only the absorbed-blow case is a question.
   */
  const candidato = (v2: boolean, primaFrase: 'giudice' | 'regole' | 'apertura' = 'giudice', attori = false): Variante => {
    const corto = `${primaFrase === 'regole' ? 'domanda2p' : primaFrase === 'apertura' ? 'domanda2a' : v2 ? 'domanda2' : 'domanda'}${attori ? '-attori' : ''}`;
    return {
      nome: `${corto}-${nomeModello}`,
      prepara: (ch) => {
        const registro: Registro = { turno: ch.turno, scena: ch.scena, entita: ch.entita, fatti: [], esiti: [], negati: [] };
        // The card rules before the judge (R-esito's; with `attori`, the unnamed actor of coerenza/attori.ts too).
        const regole = v2 ? guardieDellaChiamata(ch, { inesistente: false, assorbito: false, fuori: false, attori }, tipi) : null;
        // The judge's shadow, run on every narrator sentence in order (its carried subject), decides when no answer came.
        const ombra = v2 ? guardieDellaChiamata(ch, { inesistente: true, assorbito: false, esiti: false }, tipi) : null;
        const primo = ch.frasi[0]?.i;
        // The same filter the director would use (coerenza/menzioni.ts).
        const contesto = contestoMenzioni(registro, tipi, ch.carte, ch.fuoriOra);
        let precedente: FraseInsieme | null = null;
        let ultime: readonly string[] = [];
        let siPrima = false;
        return async (f) => {
          if (v2 && f.etichetta !== 'narratore') {
            precedente = f;
            siPrima = false;
            const e = ch.entita.find((x) => x.id === f.etichetta);
            return !e || e.presenza !== 'in_scena' || !['in_piedi', 'ferito', 'grave', 'nascosto'].includes(e.stato);
          }
          const daRegole = regole ? regole(f.testo) !== null : false;
          const daOmbra = ombra ? ombra(f.testo) !== null : false;
          // Flagged, or right after a «si» (the same mentions: a carried subject).
          const grezze = f.segnata ? f.menzioni : siPrima ? ultime : [];
          const menzioni = v2 ? daChiedere(grezze, contesto) : grezze;
          if (daRegole) {
            precedente = f;
            siPrima = true;
            if (f.segnata) ultime = menzioni;
            return true;
          }
          const prima = precedente?.testo ?? '';
          precedente = f;
          if (!menzioni.length) {
            siPrima = false;
            return false;
          }
          const q = domandaPer({ registro, frase: f.testo, prima, menzioni, colpi: ch.carte.filter((k) => k.riuscita && k.danno > 0) });
          if (!q) {
            siPrima = false;
            return false;
          }
          const r = await risposta(ch, f, q);
          if (f.segnata) ultime = menzioni;
          if (v2 && primaFrase === 'giudice' && f.i === primo) primeChieste.set(`${ch.id}:${f.i}`, { si: r?.si ?? null, menzioni });
          if (v2 && primaFrase === 'giudice' && !attori && !f.segnata) portate.set(`${ch.id}:${f.i}`, r?.si ?? null);
          // An Engine line for the mention (a fallen or absent one's state, who is really there, the card's blow).
          const conLinea = menzioni.some((x) => /^(fuori|parla|nome|colpo):/u.test(x));
          if (primaFrase === 'apertura' && f.i === primo && conLinea) aperture.set(`${corto}|${ch.id}:${f.i}`, r?.si ?? null);
          // The first sentence of the answer, with domanda2p (or 2a with no line): the rules decide now, the answer aside.
          if ((primaFrase === 'regole' || (primaFrase === 'apertura' && !conLinea)) && f.i === primo) {
            siPrima = r?.si ?? false;
            if (r?.si && !daOmbra) corretteDopo.set(`${corto}|${ch.id}:${f.i}`, menzioni);
            return daOmbra;
          }
          if (!r) {
            // No answer (offline, as a live deadline): the shadow's verdict; a sentence asked only as the carried
            // subject of a «si» gets what a «si» would when it refers back (coerenza/portato.ts). Either one carries on.
            const portata = conPortato && !f.segnata && continuaDopo(f.testo, ch.entita.map((e) => e.nomi));
            siPrima = daOmbra || portata;
            return daOmbra || portata;
          }
          siPrima = r.si;
          return r.si;
        };
      },
    };
  };
  const tutte: Variante[] = [
    varianteRegole('attive', { inesistente: false, assorbito: false }, tipi),
    varianteRegole('regole', { inesistente: true, assorbito: true }, tipi),
    varianteRegole('regole-inesistente', { inesistente: true, assorbito: false }, tipi),
    varianteRegole('regole-assorbito', { inesistente: false, assorbito: true }, tipi),
    candidato(false),
    candidato(true),
    candidato(true, 'regole'),
    candidato(true, 'apertura'),
    // What the director does now: the opener, and the unnamed actor among the card rules.
    candidato(true, 'apertura', true),
    varianteRegole('regole-attori', { inesistente: true, assorbito: true, attori: true }, tipi),
  ];
  // `--varianti a,b`: only these (a further sample of v2: `--campione 2 --varianti domanda2`).
  const scelte = args.includes('--varianti') ? args[args.indexOf('--varianti') + 1]!.split(',') : null;
  const varianti = scelte ? tutte.filter((v) => scelte.some((x) => v.nome === x || v.nome.startsWith(`${x}-`))) : tutte;
  process.stdout.write('| variant | caught | missed | clean touched | time |\n|---|---|---|---|---|\n');
  fs.mkdirSync(path.join(CARTELLA, 'punteggi'), { recursive: true });
  for (const v of varianti) {
    const p = await valuta(v, insieme, etichette);
    fs.writeFileSync(path.join(CARTELLA, 'punteggi', `${v.nome}${altro}${campione > 1 ? `-c${campione}` : ''}.json`), `${JSON.stringify(p, null, 1)}\n`);
    process.stdout.write(`${riga(p)}\n`);
  }
  if (!offline) fs.writeFileSync(fileRisposte, `${JSON.stringify(risposte, null, 1)}\n`);
  const ms = Object.values(risposte).map((r) => r.ms);
  process.stdout.write(`\nmodel calls now: ${chiamate}; answers kept: ${ms.length}; latency median ${percentile(ms, 50)} ms, p90 ${percentile(ms, 90)} ms, max ${Math.max(0, ...ms)} ms\n`);
  if (offline || dalLog.size) process.stdout.write(`questions with no answer (the rules decided): ${senzaRisposta.size}${senzaRisposta.size ? ` (${[...senzaRisposta].slice(0, 12).join(', ')}${senzaRisposta.size > 12 ? ', …' : ''})` : ''}\n`);
  if (primeChieste.size) {
    const tipi = (si: boolean | null): string => {
      const n = new Map<string, number>();
      for (const x of [...primeChieste.values()].filter((y) => y.si === si)) {
        const t = [...new Set(x.menzioni.map((m) => m.split(':')[0]!))].sort().join('+');
        n.set(t, (n.get(t) ?? 0) + 1);
      }
      return [...n].map(([t, k]) => `${t} ${k}`).join(', ') || '—';
    };
    const si = [...primeChieste.values()].filter((x) => x.si === true).length;
    const no = [...primeChieste.values()].filter((x) => x.si === false).length;
    process.stdout.write(`domanda2: first sentences asked ${primeChieste.size} (si ${si}: ${tipi(true)}; no ${no}: ${tipi(false)}; unanswered ${primeChieste.size - si - no})\n`);
  }
  if (portate.size) {
    const conta = (si: boolean | null): string => {
      const k = [...portate].filter(([, x]) => x === si).map(([c]) => etichette[c]?.etichetta ?? 'unlabelled');
      return `${k.length} (${['violation', 'clean', 'unlabelled'].map((l) => `${l} ${k.filter((x) => x === l).length}`).join(', ')})`;
    };
    process.stdout.write(`domanda2: questions asked only as a carried subject ${portate.size}: «si» ${conta(true)}; «no» ${conta(false)}; none ${conta(null)}\n`);
    if (args.includes('--elenca-portate')) for (const [c, x] of portate) process.stdout.write(`  ${x === null ? '—' : x ? 'si' : 'no'} ${etichette[c]?.etichetta ?? '·'} ${c} ${testi.get(c) ?? ''}\n`);
  }
  for (const corto of new Set([...corretteDopo.keys(), ...aperture.keys()].map((k) => k.split('|')[0]!))) {
    const dopo = [...corretteDopo.keys()].filter((k) => k.startsWith(`${corto}|`)).map((k) => k.split('|')[1]!);
    if (dopo.length) process.stdout.write(`${corto}: first sentences said by the rules, «si» aside: ${dopo.length}: ${dopo.map((k) => `${k} ${etichette[k]?.etichetta ?? 'unlabelled'}`).join('; ')}\n`);
    const v = [...aperture].filter(([k]) => k.startsWith(`${corto}|`)).map(([, x]) => x);
    if (v.length) process.stdout.write(`${corto}: first sentences opened by the Engine line ${v.length} (the answer «si» ${v.filter((x) => x === true).length}, «no» ${v.filter((x) => x === false).length}: one more true line; none ${v.filter((x) => x === null).length})\n`);
  }
}

void main();
