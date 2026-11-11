/**
 * Lo SCENEGGIATORE (docs/sceneggiatore.md): un processo a parte che, mentre al tavolo si gioca, fa
 * scrivere a Claude Code (l'abbonamento dell'utente, in modalità non interattiva `claude -p`, mai l'API
 * diretta) le battute che il lettore locale non trova. Legge le richieste del server da una cartella
 * sorvegliata, una alla volta, e scrive le risposte accanto (sceneggiatore/protocollo.ts).
 *
 *   npx tsx apps/server/src/sceneggiatore/processo.ts --radice <log>/sceneggiatore [--attesa-s 180]
 *
 * Modelli: `subito` con sonnet (misurato da «lettore»: una battuta in ~4 s, contro ~7,5 s con haiku, e
 * scritta meglio), le `prossime` in sottofondo con haiku (costano meno quota e nessuno le aspetta).
 * TAGM_SCENEGGIATORE_MODELLO_SUBITO / _PROSSIME li cambiano; TAGM_SCENEGGIATORE_MODELLO
 * vale per tutti e due.
 *
 * - Una richiesta alla volta: prima le `subito` (un'azione rimasta senza battuta, la più vecchia), poi la
 *   `prossime` più recente; le `prossime` più vecchie si saltano (la scena è già andata avanti).
 * - Claude Code senza strumenti (`--tools ""`): tutto ciò che serve è nel prompt, compilato qui dai file
 *   della campagna; non legge né scrive nient'altro. Nessuna credenziale passa da qui: il processo
 *   eredita l'ambiente, non lo stampa, e non apre ~/.claude.
 * - Registro: <radice>/sceneggiatore.jsonl, una riga per richiesta (tempi ed esito).
 */
import '../variabili-legacy';  // compatibilità CANTASTORIE_* → TAGM_*: deve precedere le letture dell'ambiente
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { caricaCampagna } from '../campagna/caricatore';
import { conScena } from '../campagna/tipi';
import { RADICE_REPO } from '../percorsi';
import { caricaRepertorio } from '../repertorio/caricatore';
import { compilaContestoRepertorio } from '../repertorio/contesto';
import { caricaParoleSegreteCampagna } from '../repertorio/segreti';
import { cartelle, leggiJson, scriviJson, type RichiestaSceneggiatore, type RispostaSceneggiatore } from './protocollo';
import { messaggioSceneggiatore, promptSceneggiatore } from './prompt';
import { impostaLingua, LINGUA_PREDEFINITA } from '../lingua';
import YAML from 'yaml';
import { righeDellaRisposta, unisciGiaUsati } from './ripetizioni';
import { estraiYaml } from './valida';

/**
 * Le righe scritte di recente, «in volo» (il tavolo può non averle ancora sentite): entrano nei «già
 * usati» delle richieste dopo. Si tengono le ultime IN_VOLO_RISPOSTE risposte, per IN_VOLO_MS.
 */
const IN_VOLO_RISPOSTE = 6;
const IN_VOLO_MS = 10 * 60_000;
const inVolo: Array<{ ts: number; righe: string[] }> = [];
function righeInVolo(): string[] {
  const adesso = Date.now();
  while (inVolo.length && (inVolo.length > IN_VOLO_RISPOSTE || adesso - inVolo[0]!.ts > IN_VOLO_MS)) inVolo.shift();
  return inVolo.flatMap((x) => x.righe);
}
function ricordaRisposta(testo: string): void {
  try {
    inVolo.push({ ts: Date.now(), righe: righeDellaRisposta(YAML.parse(estraiYaml(testo))) });
  } catch {
    // Una risposta che non si legge non ha righe da ricordare (il server la scarterà).
  }
}

const arg = (nome: string, predefinito: string): string => {
  const i = process.argv.indexOf(nome);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : predefinito;
};
const RADICE = path.resolve(arg('--radice', path.join(RADICE_REPO, 'logs', 'sceneggiatore')));
const MODELLI: Record<RichiestaSceneggiatore['tipo'], string> = {
  subito: process.env['TAGM_SCENEGGIATORE_MODELLO_SUBITO'] ?? process.env['TAGM_SCENEGGIATORE_MODELLO'] ?? 'sonnet',
  // La chiusura della serata la aspetta tutto il tavolo, come una «subito».
  chiusura: process.env['TAGM_SCENEGGIATORE_MODELLO_SUBITO'] ?? process.env['TAGM_SCENEGGIATORE_MODELLO'] ?? 'sonnet',
  prossime: process.env['TAGM_SCENEGGIATORE_MODELLO_PROSSIME'] ?? process.env['TAGM_SCENEGGIATORE_MODELLO'] ?? 'haiku',
};
const ATTESA_MS = Number(arg('--attesa-s', '180')) * 1000;
const CLAUDE = process.env['TAGM_CLAUDE'] ?? 'claude';
const c = cartelle(RADICE);

function registra(riga: Record<string, unknown>): void {
  fs.appendFileSync(c.registro, `${JSON.stringify({ ts: new Date().toISOString(), ...riga })}\n`);
}

/** Claude Code in modalità non interattiva: prompt su stdin, risposta JSON ({ result }) su stdout. */
function chiediAClaudeCode(prompt: string, modello: string): Promise<{ testo: string; ms: number }> {
  const inizio = Date.now();
  return new Promise((ok, ko) => {
    const p = spawn(CLAUDE, ['-p', '--model', modello, '--output-format', 'json', '--no-session-persistence', '--tools', '', '--append-system-prompt', promptSceneggiatore()], {
      cwd: RADICE_REPO,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => p.kill('SIGTERM'), ATTESA_MS);
    p.stdout.on('data', (d) => (out += String(d)));
    p.stderr.on('data', (d) => (err += String(d)));
    p.on('error', (e) => {
      clearTimeout(timer);
      ko(e);
    });
    p.on('close', (code) => {
      clearTimeout(timer);
      const ms = Date.now() - inizio;
      if (code !== 0) return ko(new Error(`claude -p è uscito con ${code}: ${err.trim().split('\n').at(-1)?.slice(0, 200) ?? ''}`));
      try {
        const j = JSON.parse(out) as { result?: string; is_error?: boolean };
        if (j.is_error || typeof j.result !== 'string') return ko(new Error('risposta di errore da Claude Code'));
        ok({ testo: j.result, ms });
      } catch {
        ok({ testo: out, ms });
      }
    });
    p.stdin.end(prompt);
  });
}

/** Il contesto della scena come lo vede il narratore in modo B (niente segreti), per Claude Code. */
function contestoDi(rq: RichiestaSceneggiatore): { contesto: string; segrete: string[]; esempi: string } {
  const campagna = conScena(caricaCampagna(rq.campagna), rq.scena.id);
  // La lingua dei contenuti è quella della campagna (docs/lingue.md): prompt, sezioni e regole.
  impostaLingua(campagna.lingua ?? LINGUA_PREDEFINITA);
  const parole = caricaParoleSegreteCampagna(campagna);
  const rep = caricaRepertorio(campagna);
  const esempi = rep.battute
    // Per la chiusura gli esempi sono le chiusure preparate, anche di altre scene: danno il tono della campagna.
    .filter((b) => !b.solo_esempio && (rq.tipo === 'chiusura' ? b.tipo === 'chiusura' : (b.scene.length === 0 || b.scene.includes(rq.scena.id)) && ['reazione', 'momento', 'rifiuto'].includes(b.tipo)))
    .slice(0, 3)
    .map((b) => `- id: ${b.id}\n  chi: ${b.chi}\n  tipo: ${b.tipo}\n  quando: "${b.quando}"\n  temi: [${b.temi.join(', ')}]\n  testo:\n${b.testo.map((r) => `    - "[${r.etichetta}] ${r.testo}"`).join('\n')}`)
    .join('\n');
  return { contesto: compilaContestoRepertorio(campagna, parole, rep), segrete: parole.map((p) => p.parola), esempi };
}

/**
 * La prossima richiesta da fare: la `chiusura` (a fine serata le `prossime` non servono più e si saltano), se no
 * la `subito` più vecchia, se no la `prossime` più recente (le altre si saltano).
 */
function prossimaRichiesta(): RichiestaSceneggiatore | null {
  if (!fs.existsSync(c.richieste)) return null;
  const tutte = fs
    .readdirSync(c.richieste)
    .filter((f) => f.endsWith('.json'))
    .map((f) => leggiJson<RichiestaSceneggiatore>(path.join(c.richieste, f)))
    .filter((r): r is RichiestaSceneggiatore => !!r)
    .sort((a, b) => a.creata.localeCompare(b.creata));
  const prossime = tutte.filter((r) => r.tipo === 'prossime');
  const chiusura = tutte.find((r) => r.tipo === 'chiusura');
  const subito = tutte.find((r) => r.tipo === 'subito');
  if (subito && !chiusura) return subito;
  for (const vecchia of chiusura ? prossime : prossime.slice(0, -1)) {
    rispondi(vecchia, { id: vecchia.id, esito: 'saltata', ms: 0 });
    registra({ id: vecchia.id, tipo: vecchia.tipo, turno: vecchia.turno, esito: 'saltata' });
  }
  return chiusura ?? prossime.at(-1) ?? null;
}

function rispondi(rq: RichiestaSceneggiatore, r: RispostaSceneggiatore): void {
  scriviJson(path.join(c.risposte, `${rq.id}.json`), r);
  fs.rmSync(path.join(c.richieste, `${rq.id}.json`), { force: true });
}

async function lavora(rq: RichiestaSceneggiatore): Promise<void> {
  const attesaInCoda = Date.now() - Date.parse(rq.creata);
  try {
    const { contesto, segrete, esempi } = contestoDi(rq);
    const modello = MODELLI[rq.tipo];
    const conVolo: RichiestaSceneggiatore = { ...rq, gia_usati: unisciGiaUsati(rq.gia_usati, righeInVolo()) };
    const { testo, ms } = await chiediAClaudeCode(messaggioSceneggiatore(conVolo, contesto, segrete, esempi), modello);
    ricordaRisposta(testo);
    rispondi(rq, { id: rq.id, esito: 'ok', ms, yaml: testo });
    registra({ id: rq.id, tipo: rq.tipo, turno: rq.turno, privata: rq.azione?.privata === true, modello, esito: 'ok', ms_claude: ms, ms_in_coda: attesaInCoda, caratteri: testo.length });
  } catch (err) {
    const errore = (err as Error).message.slice(0, 300);
    rispondi(rq, { id: rq.id, esito: 'errore', ms: 0, errore });
    registra({ id: rq.id, tipo: rq.tipo, turno: rq.turno, esito: 'errore', errore, ms_in_coda: attesaInCoda });
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(c.richieste, { recursive: true });
  fs.mkdirSync(c.risposte, { recursive: true });
  const battito = (): void => scriviJson(c.vivo, { ts: Date.now(), pid: process.pid, modelli: MODELLI });
  battito();
  setInterval(battito, 5000);
  registra({ esito: 'avvio', modelli: MODELLI, pid: process.pid });
  let fermo = false;
  const fine = (): void => {
    fermo = true;
    fs.rmSync(c.vivo, { force: true });
    registra({ esito: 'arresto', pid: process.pid });
    process.exit(0);
  };
  process.on('SIGTERM', fine);
  process.on('SIGINT', fine);
  while (!fermo) {
    const rq = prossimaRichiesta();
    if (rq) await lavora(rq);
    else await new Promise((r) => setTimeout(r, 500));
  }
}

void main();
