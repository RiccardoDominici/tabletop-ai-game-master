/**
 * Contesto del selettore in modalità repertorio (modo B), compilato dal codice VERO del server.
 *
 * Il server costruisce il contesto per allowlist (apps/server/src/repertorio/contesto.ts): stile.yaml
 * intero, luoghi con abbozzo, nome degli orologi, riassunto, e per la scena in corso nome,
 * descrizione, domanda, sensi, elementi non NASCOSTI, PNG presenti e taglio; dei PNG la persona
 * pubblica e la voce; dei PG tutto tranne le conoscenze private; gli esempi di voce. Poi passa ogni
 * stringa nella «rete di sicurezza», che toglie in silenzio le frasi con una parola segreta.
 *
 * Questo strumento serve al validatore (strumenti/valida/contesto_b.py) e a chi scrive o rivede una
 * campagna: stampa il contesto PRIMA della rete (predefinito), cioè ciò che l'autore ha scritto nei
 * campi che il selettore riceve. Una parola segreta lì è un difetto anche se la rete la toglierebbe:
 * la frase sparisce dal contesto senza che nessuno lo sappia, e ciò che la regex non prende passa.
 *
 * Solo lettura: importa i moduli del server senza modificarli e non scrive file.
 *
 * Uso (dalla radice del repository):
 *   npx tsx strumenti/contesto_modo_b.ts campagne/<id>                  tutte le scene, da leggere
 *   npx tsx strumenti/contesto_modo_b.ts campagne/<id> --scena <id>     una scena sola
 *   npx tsx strumenti/contesto_modo_b.ts campagne/<id> --con-rete       come lo manda il server
 *   npx tsx strumenti/contesto_modo_b.ts campagne/<id> --catalogo       più le righe del catalogo
 *   npx tsx strumenti/contesto_modo_b.ts campagne/<id> --json           per il validatore
 *
 * Uscita: 0 se compilato; 2 se gli argomenti sono sbagliati; 3 se la campagna non si carica (il
 * motivo va su stderr: per esempio pg.yaml non ancora scritto).
 */
import path from 'node:path';
import { caricaCampagna } from '../apps/server/src/campagna/caricatore';
import { conScena, type Campagna } from '../apps/server/src/campagna/tipi';
import { caricaRepertorio } from '../apps/server/src/repertorio/caricatore';
import { sezioniContestoRepertorio } from '../apps/server/src/repertorio/contesto';
import { caricaParoleSegrete, type ParolaSegreta } from '../apps/server/src/repertorio/segreti';
import { StatoRepertorio, parlantiDi } from '../apps/server/src/repertorio/stato';
import type { Repertorio } from '../apps/server/src/repertorio/tipi';

interface Opzioni {
  cartella: string;
  scena: string | null;
  conRete: boolean;
  catalogo: boolean;
  json: boolean;
}

interface ScenaCompilata {
  id: string;
  sezioni: Array<{ nome: string; testo: string }>;
  /** Righe `id · chi · tipo · quando` delle battute selezionabili in questa scena (prima dei cancelli). */
  catalogo: string[];
}

function leggiOpzioni(argv: string[]): Opzioni | null {
  const o: Opzioni = { cartella: '', scena: null, conRete: false, catalogo: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--scena') o.scena = argv[++i] ?? null;
    else if (a === '--con-rete') o.conRete = true;
    else if (a === '--catalogo') o.catalogo = true;
    else if (a === '--json') o.json = true;
    else if (a.startsWith('--')) return null;
    else if (!o.cartella) o.cartella = a;
    else return null;
  }
  return o.cartella ? o : null;
}

/**
 * Catalogo statico di una scena: tutte le battute selezionabili (non solo_esempio) valide lì, nella
 * riga del server (StatoRepertorio.riga, col tipo neutro). Il Motore poi ne mostra solo una parte per
 * turno (temi, cancelli, segreti): qui c'è il caso peggiore, da leggere come lo leggerebbe il selettore.
 */
/**
 * Cancelli di una battuta, in breve: ciò che deve essere vero prima che il Motore la elenchi. Il catalogo
 * statico è il caso peggiore, e senza questo segno chi lo legge (passo 10 della skill) non sa quali righe il
 * selettore vedrebbe solo dopo una rivelazione (nota 11 di nozze-neve).
 */
function cancelli(b: Repertorio['battute'][number]): string[] {
  const r = b.richiede;
  const out: string[] = [];
  if (r.indizi_rivelati.length) out.push(`dopo ${r.indizi_rivelati.join('+')}`);
  if (r.battute_usate.length) out.push(`dopo ${r.battute_usate.join('+')}`);
  if (r.orologio) out.push(`${r.orologio.id} ${r.orologio.min}–${r.orologio.max}`);
  if (r.privata) out.push('privata');
  if (r.da_pg.length) out.push(`da ${r.da_pg.join('/')}`);
  if (r.oppure.length) out.push(`oppure ×${r.oppure.length}`);
  return out;
}

function catalogoDi(rep: Repertorio | undefined, scena: { id: string; png_presenti: readonly string[] }): string[] {
  if (!rep) return [];
  // Come il Motore: battute della scena (o di tutte) e solo dei PNG presenti (il narratore sempre).
  return rep.battute
    .filter((b) => !b.solo_esempio && (b.scene.length === 0 || b.scene.includes(scena.id)))
    .filter((b) => parlantiDi(b).every((p) => scena.png_presenti.includes(p)))
    .map((b) => {
      const c = cancelli(b);
      return c.length ? `${StatoRepertorio.riga(b)}   [chiusa: ${c.join(', ')}]` : StatoRepertorio.riga(b);
    });
}

function compila(o: Opzioni): { campagna: string; scene: ScenaCompilata[]; avvisi: string[] } {
  const avvisi: string[] = [];
  const campagna: Campagna = caricaCampagna(path.resolve(o.cartella));
  let repertorio: Repertorio | undefined;
  try {
    repertorio = caricaRepertorio(campagna);
  } catch (err) {
    // Senza repertorio valido il contesto resta compilabile, solo senza esempi di voce.
    avvisi.push(`repertorio non caricato, contesto senza esempi di voce: ${(err as Error).message.split('\n')[0]}`);
  }
  // Senza rete (predefinito): nessuna parola segreta, così si vede ciò che l'autore ha scritto.
  // Con la rete: le parole di parole_segrete.yaml, come fa il server all'avvio (avvio.ts).
  const parole: ParolaSegreta[] = o.conRete ? caricaParoleSegrete(path.join(campagna.cartella, 'repertorio')) : [];
  const scelte = o.scena ? campagna.scene.filter((s) => s.id === o.scena) : campagna.scene;
  if (o.scena && scelte.length === 0) throw new Error(`scena inesistente: ${o.scena}`);
  const scene = scelte.map((s) => ({
    id: s.id,
    sezioni: sezioniContestoRepertorio(conScena(campagna, s.id), parole, repertorio),
    catalogo: o.catalogo ? catalogoDi(repertorio, s) : [],
  }));
  return { campagna: campagna.id, scene, avvisi };
}

function main(): number {
  const o = leggiOpzioni(process.argv.slice(2));
  if (!o) {
    console.error('uso: npx tsx strumenti/contesto_modo_b.ts campagne/<id> [--scena <id>] [--con-rete] [--catalogo] [--json]');
    return 2;
  }
  let esito: ReturnType<typeof compila>;
  try {
    esito = compila(o);
  } catch (err) {
    console.error(`contesto del modo B non compilabile: ${(err as Error).message}`);
    return 3;
  }
  if (o.json) {
    process.stdout.write(JSON.stringify(esito) + '\n');
    return 0;
  }
  for (const a of esito.avvisi) console.error(`avviso: ${a}`);
  const rete = o.conRete ? 'dopo la rete di sicurezza, come lo manda il server' : 'prima della rete di sicurezza: ciò che hai scritto';
  for (const s of esito.scene) {
    console.log(`\n==================== scena ${s.id} (${rete}) ====================\n`);
    console.log(s.sezioni.map((x) => x.testo).join('\n\n'));
    if (o.catalogo) {
      console.log(`\n---------- catalogo della scena ${s.id}: ${s.catalogo.length} battute selezionabili ----------`);
      console.log(s.catalogo.join('\n'));
    }
  }
  return 0;
}

process.exitCode = main();
