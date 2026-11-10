/**
 * Argomenti e ambiente di un esperimento (esegui.ts): copione, modalità, campagna, porta.
 *
 *   esegui.ts <copione> <A|B|B2> [--campagna <id>] [--uscita <cartella>] [--turni n] [--pausa-s s] [--sceneggiatore]
 *             [--voce-vera] [--finto] [--lascia-server] [--partita-vera]
 * --sceneggiatore accende lo sceneggiatore (Claude Code: ogni chiamata usa l'abbonamento); di base è spento.
 *
 * Porta: CANTASTORIE_PORTA (default 4710, istanza di prova di scripts/avvio.sh: log e pagine in
 * logs/porta-<porta>/, voce sempre finta). La 4610 è la partita vera: si usa solo con
 * --partita-vera, perché l'esperimento riavvia il server da zero. E2E_URL, se c'è, deve puntare
 * alla stessa porta (altrimenti l'esperimento parlerebbe con un server e leggerebbe i log di un altro).
 */
import fs from 'node:fs';
import path from 'node:path';
import { CARTELLA_LOG, RADICE_REPO } from '../percorsi';

export type ModoEsperimento = 'improvvisa' | 'repertorio';

export interface OpzioniEsperimento {
  /** Percorso del copione sotto esperimenti/copioni, senza .yaml (es. «nozze-neve/indagine»). */
  copione: string;
  /** File del copione: esperimenti/copioni/<copione>.yaml, o il percorso dato se finisce in .yaml. */
  fileCopione: string;
  /** Etichetta della modalità come scritta sulla riga di comando (A, B, B2). */
  etichettaModo: string;
  modo: ModoEsperimento;
  /** Cartella della campagna sotto campagne/ (default prova-f0, come le prime prove). */
  campagna: string;
  porta: number;
  url: string;
  /** Dove il server di questa porta scrive i suoi JSONL (stessa regola di scripts/avvio.sh). */
  cartellaLog: string;
  voceVera: boolean;
  /** Narratore a copione (avvio.sh --finto): prova a secco dell'harness, nessuna chiamata ad Anthropic. */
  finto: boolean;
  lasciaServer: boolean;
  /** Cartella dei risultati: esperimenti/risultati/<etichetta>. */
  etichetta: string;
  /** `--uscita <cartella>`: i risultati vanno in esperimenti/risultati/<cartella> (così una misura non sovrascrive la run di riferimento). */
  uscita: string | null;
  /** `--turni <n>`: si giocano solo i primi n turni del copione (una prova breve). null = tutti. */
  turniMax: number | null;
  /** `--pausa-s <s>`: i giocatori parlano s secondi prima di mandare le azioni (0 = subito). */
  pausaMs: number;
  /** `--sceneggiatore`: accende lo sceneggiatore (Claude Code, l'abbonamento di Riccardo); di base spento. */
  sceneggiatore: boolean;
}

export const PORTA_ESPERIMENTI = 4710;
const PORTA_PARTITA = 4610;
const PORTE_RISERVATE = new Set([4611, 4612]);
const CAMPAGNA_DEFAULT = 'prova-f0';

export class ErroreArgomenti extends Error {}

/** Valore dell'opzione `--nome <valore>`, o null. */
function valoreOpzione(argv: string[], nome: string): string | null {
  const i = argv.indexOf(nome);
  if (i < 0) return null;
  const v = argv[i + 1];
  if (!v || v.startsWith('--')) throw new ErroreArgomenti(`${nome} vuole un valore`);
  return v;
}

export function leggiOpzioni(argv: string[], env: NodeJS.ProcessEnv): OpzioniEsperimento {
  const conValore = new Set(['--campagna', '--uscita', '--turni', '--pausa-s']);
  const posizionali: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (conValore.has(a)) i += 1;
    else if (!a.startsWith('--')) posizionali.push(a);
  }
  const [copione, etichettaModo] = posizionali;
  // «B2» è il repertorio con le regole della versione 2 (è la modalità repertorio di oggi).
  const modo: ModoEsperimento | null = etichettaModo === 'B' || etichettaModo === 'B2' ? 'repertorio' : etichettaModo === 'A' ? 'improvvisa' : null;
  if (!copione || !modo || !etichettaModo) throw new ErroreArgomenti('uso: esegui.ts <copione> <A|B|B2> [--campagna <id>] [--uscita <cartella>] [--turni n] [--pausa-s s] [--sceneggiatore] [--voce-vera] [--finto] [--lascia-server]');

  const campagna = valoreOpzione(argv, '--campagna') ?? CAMPAGNA_DEFAULT;
  const uscita = valoreOpzione(argv, '--uscita');
  const turni = valoreOpzione(argv, '--turni');
  const turniMax = turni === null ? null : Number(turni);
  const pausaMs = Math.max(0, Number(valoreOpzione(argv, '--pausa-s') ?? 0) * 1000) || 0;
  if (turniMax !== null && (!Number.isInteger(turniMax) || turniMax < 1)) throw new ErroreArgomenti('--turni vuole un intero ≥ 1');
  if (uscita !== null && (path.isAbsolute(uscita) || uscita.split(/[\\/]/).includes('..'))) throw new ErroreArgomenti('--uscita è una cartella dentro esperimenti/risultati');
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(campagna) || !fs.existsSync(path.join(RADICE_REPO, 'campagne', campagna))) {
    throw new ErroreArgomenti(`campagna inesistente: campagne/${campagna}`);
  }

  const porta = Number(env['CANTASTORIE_PORTA'] ?? PORTA_ESPERIMENTI);
  if (!Number.isInteger(porta) || porta <= 0 || porta > 65535) throw new ErroreArgomenti(`CANTASTORIE_PORTA non valida: ${String(env['CANTASTORIE_PORTA'])}`);
  if (PORTE_RISERVATE.has(porta)) throw new ErroreArgomenti(`porta ${porta} riservata (voce, Vite): scegline un'altra`);
  const partitaVera = argv.includes('--partita-vera');
  if (porta === PORTA_PARTITA && !partitaVera) {
    throw new ErroreArgomenti('la 4610 è la partita vera: l’esperimento riavvierebbe quel server. Usa un’altra CANTASTORIE_PORTA, o --partita-vera se è proprio quello che vuoi.');
  }
  const voceVera = argv.includes('--voce-vera');
  // avvio.sh su una porta di prova forza la voce finta: una «voce vera» lì sarebbe una bugia nel riepilogo.
  if (voceVera && porta !== PORTA_PARTITA) throw new ErroreArgomenti('--voce-vera c’è solo sulla 4610 (le istanze di prova hanno sempre la voce finta)');

  const url = env['E2E_URL'] ?? `http://127.0.0.1:${porta}`;
  const portaUrl = Number(new URL(url).port || 80);
  if (portaUrl !== porta) throw new ErroreArgomenti(`E2E_URL (${url}) non è sulla porta ${porta} di CANTASTORIE_PORTA`);

  // Un copione fuori da esperimenti/copioni (es. una prova a secco dell'harness) si dà col suo percorso.
  const daFile = copione.endsWith('.yaml');
  const fileCopione = daFile ? path.resolve(copione) : path.join(RADICE_REPO, 'esperimenti', 'copioni', `${copione}.yaml`);
  if (!fs.existsSync(fileCopione)) throw new ErroreArgomenti(`copione inesistente: ${fileCopione}`);
  const nomeCopione = daFile ? path.basename(copione, '.yaml') : copione;
  const finto = argv.includes('--finto');
  // «nozze-neve/indagine» + B → «nozze-neve-indagine-B»; una prova a secco non sovrascrive quella vera.
  const etichetta = `${nomeCopione.replace(/\//g, '-')}-${etichettaModo}${finto ? '-finto' : ''}`;
  return {
    copione: nomeCopione,
    fileCopione,
    etichettaModo,
    modo,
    campagna,
    porta,
    url,
    cartellaLog: porta === PORTA_PARTITA ? CARTELLA_LOG : path.join(CARTELLA_LOG, `porta-${porta}`),
    voceVera,
    finto,
    lasciaServer: argv.includes('--lascia-server'),
    etichetta,
    uscita,
    turniMax,
    pausaMs,
    sceneggiatore: argv.includes('--sceneggiatore'),
  };
}
