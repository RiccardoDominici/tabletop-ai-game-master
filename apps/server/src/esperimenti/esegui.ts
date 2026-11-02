/**
 * Esperimento A/B (docs/repertorio.md): esegue un copione fisso di azioni dei giocatori contro il
 * server VERO, in modalità A (improvvisa) o B (repertorio), con Haiku e la voce veri.
 *
 *   npx tsx apps/server/src/esperimenti/esegui.ts <copione> <A|B> [--voce-vera]
 *
 * La voce è FINTA per default (la sintesi è rimandata alla fase finale): il servizio voce non si
 * tocca. Con --voce-vera si usa il servizio Qwen se è già pronto (--tieni-voce).
 *
 * 1. Riavvia il server da zero (scripts/avvio.sh --tieni-voce) con CANTASTORIE_MODO e
 *    CANTASTORIE_FINESTRA_TUTTI=1: ogni sessione parte senza stato, e la finestra si apre per
 *    tutti così il copione si dà identico ai due narratori (l'invito resta nel registro).
 * 2. Collega un proiettore virtuale (proiettore.ts) e un telefono headless per ogni PG.
 * 3. Turno per turno: aspetta la finestra, invia le azioni del copione, tutti «pronto».
 * 4. Scrive esperimenti/risultati/<copione>-<A|B>/: trascrizione.md (etichette verbatim, [usa]
 *    espansi e marcati come pre-scritti), turni.jsonl (latenze + righe pre-scritte/improvvisate),
 *    costo.json, riepilogo.json.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { io as connetti, type Socket } from 'socket.io-client';
import type { Esito, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoTavolo } from '@cantastorie/shared';
import { caricaCampagna } from '../campagna/caricatore';
import { RADICE_REPO } from '../percorsi';
import { caricaRepertorio } from '../repertorio/caricatore';
import { caricaParoleSegrete } from '../repertorio/segreti';
import type { Repertorio } from '../repertorio/tipi';
import { misuraFughe } from './fughe';
import { ProiettoreVirtuale } from './proiettore';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
interface Copione {
  pg: string[];
  turni: Array<Array<{ pg: string; azione: string }>>;
}

const URL_SERVER = process.env['E2E_URL'] ?? 'http://127.0.0.1:4610';
const LOG = path.join(RADICE_REPO, 'logs');
const CAMPI_LATENZA = ['finestra_ms', 'voce_sveglia', 'llm_primo_token', 'llm_prima_frase', 'voce_richiesta', 'voce_primo_audio', 'schermo_inizio_audio', 'llm_fine', 'audio_fine'] as const;

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));

function leggiJsonl(file: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((r) => JSON.parse(r) as Record<string, unknown>);
}

function attendiStato(c: Client, cond: (s: StatoTavolo) => boolean, ms: number, cosa: string): Promise<StatoTavolo> {
  return new Promise((risolvi, rifiuta) => {
    const t = setTimeout(() => {
      c.off('stato', f);
      rifiuta(new Error(`timeout: ${cosa}`));
    }, ms);
    const f = (s: StatoTavolo): void => {
      if (cond(s)) {
        clearTimeout(t);
        c.off('stato', f);
        risolvi(s);
      }
    };
    c.on('stato', f);
    // Lo stato potrebbe essere già quello giusto.
    c.emit('stato:richiedi', (s) => f(s));
  });
}

function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

async function main(): Promise<void> {
  const [nomeCopione, modoArg] = process.argv.slice(2);
  const voceVera = process.argv.includes('--voce-vera');
  const modo = modoArg === 'B' ? 'repertorio' : modoArg === 'A' ? 'improvvisa' : null;
  if (!nomeCopione || !modo) {
    console.error('uso: esegui.ts <copione> <A|B>');
    process.exit(2);
  }
  const copione = YAML.parse(fs.readFileSync(path.join(RADICE_REPO, 'esperimenti', 'copioni', `${nomeCopione}.yaml`), 'utf8')) as Copione;
  const etichetta = `${nomeCopione}-${modoArg}`;
  const cartellaRisultati = path.join(RADICE_REPO, 'esperimenti', 'risultati', etichetta);
  fs.mkdirSync(cartellaRisultati, { recursive: true });
  const inizioEsperimento = new Date().toISOString();
  console.log(`[${etichetta}] riavvio del server in modalità ${modo}…`);

  // 1. Server da zero.
  const avvio = spawnSync(path.join(RADICE_REPO, 'scripts', 'avvio.sh'), [voceVera ? '--tieni-voce' : '--mock'], {
    env: { ...process.env, CANTASTORIE_MODO: modo, CANTASTORIE_FINESTRA_TUTTI: '1' },
    encoding: 'utf8',
  });
  if (avvio.status !== 0) throw new Error(`avvio fallito:\n${avvio.stdout}\n${avvio.stderr}`);
  const salute0 = (await (await fetch(`${URL_SERVER}/api/salute`)).json()) as Record<string, unknown>;
  console.log(`[${etichetta}] server: ${JSON.stringify(salute0)}`);
  if (salute0['modo'] !== modo) throw new Error(`modalità attesa ${modo}, il server dice ${String(salute0['modo'])}`);

  // 2. Client: proiettore virtuale + un telefono per PG.
  const apri = (): Client => connetti(URL_SERVER, { transports: ['websocket'], forceNew: true });
  const schermo = apri();
  const proiettore = new ProiettoreVirtuale(schermo);
  await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
  const telefoni = new Map<string, Client>();
  for (const pg of copione.pg) {
    const t = apri();
    await emetti<StatoTavolo>((cb) => t.emit('telefono:entra', cb));
    const e = await emetti<Esito>((cb) => t.emit('telefono:scegli_pg', { id_pg: pg }, cb));
    if (!e.ok) throw new Error(`scelta di ${pg} rifiutata: ${e.errore}`);
    telefoni.set(pg, t);
  }

  // 3. Avvio della scena e turni del copione.
  const primo = attendiStato(schermo, (s) => s.fase === 'finestra' && s.turno === 1, 180_000, 'prima finestra');
  await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
  await primo;
  for (let n = 1; n <= copione.turni.length; n++) {
    const stato = await attendiStato(schermo, (s) => s.fase === 'finestra' && s.turno === n && s.finestra.aperta, 240_000, `finestra ${n}`);
    for (const { pg, azione } of copione.turni[n - 1]!) {
      const t = telefoni.get(pg);
      if (!t) throw new Error(`turno ${n}: ${pg} non è al tavolo`);
      const e = await emetti<Esito>((cb) => t.emit('azione:invia', { id_pg: pg, testo: azione, versione_vista: stato.versione_scena }, cb));
      if (!e.ok) throw new Error(`turno ${n}: azione di ${pg} rifiutata: ${e.errore}`);
    }
    const dopo = attendiStato(schermo, (s) => s.turno === n + 1 && s.fase === 'finestra', 300_000, `fine del turno ${n}`);
    for (const [pg, t] of telefoni) await emetti<Esito>((cb) => t.emit('azione:pronto', { id_pg: pg, pronto: true }, cb));
    await dopo;
    console.log(`[${etichetta}] turno ${n}/${copione.turni.length} fatto`);
  }

  // 4. Raccolta dai registri del server (solo questa sessione).
  const salute = (await (await fetch(`${URL_SERVER}/api/salute`)).json()) as Record<string, unknown>;
  const sessione = String(salute['sessione']);
  schermo.disconnect();
  for (const t of telefoni.values()) t.disconnect();
  const narrazioni = leggiJsonl(path.join(LOG, 'narrazioni.jsonl')).filter((r) => r['sessione'] === sessione);
  const turni = leggiJsonl(path.join(LOG, 'turni.jsonl')).filter((r) => r['sessione'] === sessione);
  const costi = leggiJsonl(path.join(LOG, 'costi.jsonl')).filter((r) => String(r['ts']) >= inizioEsperimento);

  fs.writeFileSync(path.join(cartellaRisultati, 'turni.jsonl'), turni.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const costoTurni = costi.filter((c) => c['tipo'] === 'turno').map((c) => Number(c['costo_usd']));
  const costo = {
    totale_usd: costi.reduce((s, c) => s + Number(c['costo_usd']), 0),
    preriscaldamento_usd: costi.filter((c) => c['tipo'] === 'preriscaldamento').reduce((s, c) => s + Number(c['costo_usd']), 0),
    per_turno_usd: costoTurni,
    mediana_per_turno_usd: mediana(costoTurni),
    token_cache_lettura: costi.map((c) => c['token_cache_lettura']),
    token_ingresso: costi.map((c) => c['token_ingresso']),
    token_uscita: costi.map((c) => c['token_uscita']),
  };
  fs.writeFileSync(path.join(cartellaRisultati, 'costo.json'), JSON.stringify(costo, null, 2) + '\n');

  const narrati = narrazioni.filter((r) => r['tipo'] === 'turno');
  const ultimo = narrati.at(-1);
  const usi = ((ultimo?.['stato_repertorio'] as Record<string, unknown> | undefined)?.['usi'] ?? {}) as Record<string, number>;
  const repertorioIds = modo === 'repertorio' ? elencoBattute() : [];
  // Fughe di parole segrete (definizione di parole_segrete.yaml), riga per riga.
  const campagna = caricaCampagna(path.join(RADICE_REPO, 'campagne', 'prova-f0'));
  const repertorio: Repertorio | null = modo === 'repertorio' ? caricaRepertorio(campagna) : null;
  const fughe = misuraFughe(narrazioni, caricaParoleSegrete(path.join(campagna.cartella, 'repertorio')), repertorio);
  const latenze = Object.fromEntries(
    CAMPI_LATENZA.map((c) => {
      const v = turni.map((r) => r[c]).filter((x): x is number => typeof x === 'number');
      return [c, { mediana: mediana(v), peggiore: v.length ? Math.max(...v) : null, n: v.length }];
    }),
  );
  const somma = (k: string) => turni.reduce((s, r) => s + (typeof r[k] === 'number' ? (r[k] as number) : 0), 0);
  const riepilogo = {
    copione: nomeCopione,
    modo,
    sessione,
    // Condizioni della macchina durante la prova (es. altri carichi sulla GPU), da ESPERIMENTO_NOTA.
    nota_ambiente: process.env['ESPERIMENTO_NOTA'] ?? null,
    turni: turni.length,
    voce: salute0['voce'],
    latenze,
    buchi: { totale: somma('buchi'), in_frase: somma('buchi_in_frase'), tra_frasi: somma('buchi_tra_frasi'), silenzio_ms: somma('silenzio_ms'), per_turno: turni.map((r) => r['buchi']) },
    righe_prescritte: somma('righe_prescritte'),
    righe_improvvisate: somma('righe_improvvisate'),
    quota_prescritte: somma('righe_prescritte') / Math.max(1, somma('righe_prescritte') + somma('righe_improvvisate')),
    usa_rifiutati: somma('usa_rifiutati'),
    fughe: {
      nota:
        modo === 'repertorio'
          ? 'Fuga = riga del narratore o di un PNG con una parola segreta prima che sia uscito un id di pubblica_dopo (battuta o indizio rivelato da una battuta) e prima che un giocatore l’abbia scritta.'
          : 'Modo A: non ci sono id di battuta e gli indizi non sono tracciati, quindi conta solo «un giocatore l’ha scritta prima». È un conteggio GREZZO: le rivelazioni legittime (il PG spezza il pane e vede i chicchi) qui risultano fughe; vanno giudicate a mano.',
      improvvisate: fughe.filter((f) => f.origine === 'improvvisata').length,
      prescritte: fughe.filter((f) => f.origine === 'prescritta').length,
      elenco: fughe,
    },
    battute_usate: Object.keys(usi).length,
    battute_mai_usate: repertorioIds.filter((id) => !usi[id]),
    costo_totale_usd: costo.totale_usd,
    costo_mediana_turno_usd: costo.mediana_per_turno_usd,
    proiettore_virtuale: proiettore.finiti,
  };
  fs.writeFileSync(path.join(cartellaRisultati, 'riepilogo.json'), JSON.stringify(riepilogo, null, 2) + '\n');
  fs.writeFileSync(path.join(cartellaRisultati, 'trascrizione.md'), trascrizione(etichetta, modo, sessione, narrazioni, copione));
  console.log(`[${etichetta}] fatto → ${path.relative(RADICE_REPO, cartellaRisultati)} (costo $${costo.totale_usd.toFixed(5)})`);
  // Il server della prova non resta acceso (salvo --lascia-server, per ispezionarlo).
  if (!process.argv.includes('--lascia-server')) spawnSync(path.join(RADICE_REPO, 'scripts', 'arresto.sh'), ['--lascia-voce'], { encoding: 'utf8' });
  process.exit(0);
}

/** Id di tutte le battute del repertorio (per «mai usate»). */
function elencoBattute(): string[] {
  const dir = path.join(RADICE_REPO, 'campagne', 'prova-f0', 'repertorio');
  const ids: string[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.yaml'))) {
    const d = YAML.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as { battute?: Array<{ id: string }> };
    for (const b of d.battute ?? []) ids.push(b.id);
  }
  return ids;
}

type VoceUscita =
  | { tipo: 'usa'; id: string; versione: number; righe: Array<{ etichetta: string; testo: string }> }
  | { tipo: 'usa_rifiutato'; id: string; motivo: string }
  | { tipo: 'improvvisata'; etichetta: string; testo: string };

/**
 * Trascrizione: per ogni turno le azioni e l'uscita del narratore riga per riga, VERBATIM; ogni
 * `[usa] id` è seguito dalle righe della battuta, marcate come pre-scritte.
 */
function trascrizione(etichetta: string, modo: string, sessione: string, narrazioni: Array<Record<string, unknown>>, copione: Copione): string {
  const out: string[] = [`# Trascrizione ${etichetta}`, '', `Modalità: ${modo} · sessione ${sessione} · PG: ${copione.pg.join(', ')}`, ''];
  out.push(
    modo === 'repertorio'
      ? 'Righe dopo `[usa] <id>`: battuta pre-scritta uscita (marcata `⟨pre-scritta⟩`). Le altre righe sono improvvisate dal modello.'
      : 'Tutte le righe sono improvvisate dal modello.',
    '',
  );
  for (const n of narrazioni) {
    if (n['tipo'] === 'apertura') {
      out.push('## Turno 0 — apertura (testo fisso della scena)', '', '```text', String(n['testo']), '```', '');
      continue;
    }
    out.push(`## Turno ${String(n['turno'])}`, '', 'Azioni:');
    for (const a of (n['azioni'] as Array<{ id_pg: string; testo: string | null }>) ?? []) out.push(`- ${a.id_pg}: ${a.testo ? `«${a.testo}»` : '(nessuna azione)'}`);
    out.push('', 'Narratore:', '', '```text');
    const uscita = [...((n['uscita'] as VoceUscita[] | undefined) ?? [])];
    const testo = typeof n['testo'] === 'string' ? n['testo'] : `(nessun testo: ${String(n['errore'])})`;
    for (const riga of testo.split('\n')) {
      if (!riga.trim()) continue;
      if (/^\s*\[usa\]/i.test(riga)) {
        const u = uscita.find((x) => x.tipo === 'usa' || x.tipo === 'usa_rifiutato');
        if (u) uscita.splice(uscita.indexOf(u), 1);
        out.push(riga.trim());
        if (u?.tipo === 'usa') for (const r of u.righe) out.push(`    ⟨pre-scritta${u.versione ? `, variante ${u.versione}` : ''}⟩ [${r.etichetta}] ${r.testo}`);
        else if (u?.tipo === 'usa_rifiutato') out.push(`    ⟨RIFIUTATA: ${u.motivo}⟩`);
        continue;
      }
      out.push(riga.trim());
    }
    out.push('```', '');
    const m = (n['misure'] ?? {}) as Record<string, unknown>;
    out.push(
      `- righe pre-scritte ${String(n['righe_prescritte'] ?? 0)}, improvvisate ${String(n['righe_improvvisate'] ?? 0)}, [usa] rifiutati ${String(n['usa_rifiutati'] ?? 0)}; invito: ${JSON.stringify(n['invito'])}; anomalie: ${((n['anomalie'] as unknown[]) ?? []).length}`,
      `- primo audio dalla chiusura della finestra: ${String(m['schermo_inizio_audio'])} ms; buchi ${String(m['buchi'])} (in frase ${String(m['buchi_in_frase'])}, tra frasi ${String(m['buchi_tra_frasi'])}, silenzio ${String(m['silenzio_ms'])} ms); costo $${String(m['costo_usd'])}`,
      '',
    );
  }
  return out.join('\n');
}

main().catch((err: unknown) => {
  console.error('esperimento fallito:', (err as Error).message);
  process.exit(1);
});
