/**
 * Scores the candidate checker (coerenza/domanda.ts: mention filter + one yes/no question to a small fast model) on the
 * frozen replay set, next to the rules (strumenti/coerenza-punteggio.ts). The model's answers are kept in
 * esperimenti/coerenza/risposte-<model>.json, so a second run is offline and the set stays frozen; `--nuove` asks again.
 *
 *   npx tsx apps/server/src/strumenti/coerenza-domanda.ts [--nuove] [--modello claude-haiku-5-5]
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
  /**
   * v1 (`domanda`): every flagged sentence goes to the model, as flagged. v2 (`domanda2`), the same question with the
   * Engine's own structure around it: who fell by this turn's cards is not asked about (their fall is this turn's story,
   * as R-fuori's `oraFuori`); an NPC's own line is judged by the deterministic R-assente (the model never saw the
   * speaker); the card rules of R-esito (pair, fall) stay deterministic, and only the absorbed-blow case is a question.
   */
  const candidato = (v2: boolean): Variante => ({
    nome: `${v2 ? 'domanda2' : 'domanda'}-${nomeModello}`,
    prepara: (ch) => {
      const registro: Registro = { turno: ch.turno, scena: ch.scena, entita: ch.entita, fatti: [], esiti: [], negati: [] };
      const regole = v2 ? guardieDellaChiamata(ch, { inesistente: false, assorbito: false, fuori: false }, tipi) : null;
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
        const chiave = `${ch.id}:${f.i}|${q.messaggio}`;
        let r = risposte[chiave];
        if (!r) {
          r = await chiedi(m(), q);
          risposte[chiave] = r;
          chiamate++;
        }
        siPrima = r.si;
        if (f.segnata) ultime = menzioni;
        return r.si;
      };
    },
  });
  const tutte: Variante[] = [
    varianteRegole('attive', { inesistente: false, assorbito: false }, tipi),
    varianteRegole('regole', { inesistente: true, assorbito: true }, tipi),
    varianteRegole('regole-inesistente', { inesistente: true, assorbito: false }, tipi),
    varianteRegole('regole-assorbito', { inesistente: false, assorbito: true }, tipi),
    candidato(false),
    candidato(true),
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
  fs.writeFileSync(fileRisposte, `${JSON.stringify(risposte, null, 1)}\n`);
  const ms = Object.values(risposte).map((r) => r.ms);
  process.stdout.write(`\nmodel calls now: ${chiamate}; answers kept: ${ms.length}; latency median ${percentile(ms, 50)} ms, p90 ${percentile(ms, 90)} ms, max ${Math.max(0, ...ms)} ms\n`);
}

void main();
