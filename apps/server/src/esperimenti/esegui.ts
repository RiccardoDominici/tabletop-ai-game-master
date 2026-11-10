/**
 * Esperimento (docs/repertorio.md): esegue un copione fisso di azioni dei giocatori contro il
 * server VERO, in modalità A (improvvisa) o B (repertorio), con Haiku vero, su una campagna qualsiasi.
 *
 *   CANTASTORIE_PORTA=4710 npx tsx apps/server/src/esperimenti/esegui.ts <copione> <A|B|B2> \
 *     [--campagna <id>] [--finto] [--lascia-server]
 *
 * Esempi: `esegui.ts indagine B` (prova-f0, come le prime prove);
 *         `esegui.ts nozze-neve/indagine B --campagna nozze-neve`.
 * Porta e opzioni: argomenti.ts (default 4710, istanza di prova: la partita vera su 4610 e la voce
 * su 4611 non si toccano). Formato del copione: copione.ts (scena di partenza, cambi di scena,
 * azioni private).
 *
 * 1. Controlla il copione contro la campagna, poi riavvia il server di prova da zero
 *    (CANTASTORIE_PORTA=<porta> scripts/avvio.sh) con CANTASTORIE_CAMPAGNA, CANTASTORIE_MODO,
 *    CANTASTORIE_FINESTRA_TUTTI=1 (la finestra si apre per tutti, così il copione si dà identico ai
 *    due narratori; l'invito resta nel registro) e un token del master fissato qui.
 * 2. Collega un proiettore virtuale (proiettore.ts), un pannello del master headless (master.ts)
 *    e un telefono headless per ogni PG.
 * 3. Turno per turno: aspetta la finestra, fa i cambi di scena del copione col comando del master
 *    (come il pannello), invia le azioni (le private con `privata: true`, come il telefono), poi
 *    «Risolvi ora» dal master (chi non agisce in quel turno del copione non si aspetta).
 * 4. Scrive esperimenti/risultati/<etichetta>/: trascrizione.md (verbatim, [usa] espansi e marcati),
 *    tavolo.md (solo ciò che il tavolo ha sentito e visto, per il giudice cieco), turni.jsonl,
 *    costo.json, riepilogo.json (latenze, fughe di segreti, quota pre-scritta, costo).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { io as connetti, type Socket } from 'socket.io-client';
import type { Esito, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoTavolo } from '@cantastorie/shared';
import { caricaCampagna } from '../campagna/caricatore';
import type { Campagna } from '../campagna/tipi';
import { nuovoToken } from '../master/token';
import { RADICE_REPO } from '../percorsi';
import { caricaRepertorio } from '../repertorio/caricatore';
import { caricaParoleSegrete } from '../repertorio/segreti';
import type { Repertorio } from '../repertorio/tipi';
import { ErroreArgomenti, leggiOpzioni, type OpzioniEsperimento } from './argomenti';
import { caricaCopione, contaPrivate, controllaCopione, type Copione } from './copione';
import { misuraFughe } from './fughe';
import { MasterHeadless } from './master';
import { ProiettoreVirtuale } from './proiettore';
import { azioniPrivate, OsservatoreTavolo, testoTavolo } from './tavolo';
import { trascrizione } from './trascrizione';
import { versioneCodice } from './versione';
import { TESTO_FINE_SCENA } from '../scena/regia';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
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

/** Il token del master non deve finire sulla console nemmeno se l'avvio fallisce. */
const senzaToken = (testo: string, token: string): string => testo.split(token).join('***');

/** Riavvia il server di prova da zero, sulla porta e con la campagna dell'esperimento. */
function avviaServer(o: OpzioniEsperimento, token: string): void {
  const argomenti = [o.voceVera ? '--tieni-voce' : '--mock', ...(o.finto ? ['--finto'] : [])];
  const avvio = spawnSync(path.join(RADICE_REPO, 'scripts', 'avvio.sh'), argomenti, {
    env: {
      ...process.env,
      CANTASTORIE_PORTA: String(o.porta),
      CANTASTORIE_CAMPAGNA: o.campagna,
      CANTASTORIE_MODO: o.modo,
      CANTASTORIE_FINESTRA_TUTTI: '1',
      CANTASTORIE_MASTER_TOKEN: token,
    },
    encoding: 'utf8',
  });
  if (avvio.status !== 0) throw new Error(`avvio fallito:\n${senzaToken(avvio.stdout, token)}\n${senzaToken(avvio.stderr, token)}`);
}

function arrestaServer(o: OpzioniEsperimento): void {
  spawnSync(path.join(RADICE_REPO, 'scripts', 'arresto.sh'), ['--lascia-voce'], { env: { ...process.env, CANTASTORIE_PORTA: String(o.porta) }, encoding: 'utf8' });
}

/** Come è finita la partita prima della fine del copione: il finale ha chiuso la scena, o il tavolo si è fermato. */
export interface FinePartita {
  turno_copione: number;
  turno_server: number;
  motivo: 'finale' | 'pausa';
}

/** Un cambio di scena fatto dal copione: turno del copione, turno del server in cui è avvenuto, scene. */
export interface CambioScena {
  turno_copione: number;
  turno_server: number;
  a: string;
}

/**
 * Esegue i turni del copione; ritorna quando si apre la finestra dopo l'ultimo, oppure quando il
 * tavolo va in pausa a fine turno: dopo il finale del Motore (TESTO_FINE_SCENA) la scena è chiusa e
 * il copione finisce lì (prima l'harness aspettava la finestra dopo e scadeva).
 *
 * Il turno del copione e quello del server coincidono finché non si cambia scena: l'apertura della
 * nuova scena si prende il turno della finestra aperta (regia.cambiaScena) e la finestra successiva
 * è quella del turno dopo. Per questo si segue il turno del SERVER, letto dallo stato.
 */
async function giocaCopione(
  etichetta: string,
  copione: Copione,
  schermo: Client,
  master: MasterHeadless,
  telefoni: Map<string, Client>,
  osservatore: OsservatoreTavolo,
): Promise<{ cambi: CambioScena[]; fine: FinePartita | null }> {
  const cambi: CambioScena[] = [];
  let turnoServer = 1;
  for (let n = 1; n <= copione.turni.length; n++) {
    const atteso = turnoServer;
    let stato = await attendiStato(schermo, (s) => s.fase === 'finestra' && s.turno === atteso && s.finestra.aperta, 240_000, `finestra ${atteso} (turno ${n} del copione)`);
    for (const p of copione.turni[n - 1]!) {
      if (p.tipo !== 'scena') continue;
      const v0 = stato.versione_scena;
      const t0 = stato.turno;
      const e = await master.scena(p.scena);
      if (!e.ok) throw new Error(`turno ${n}: cambio di scena a ${p.scena} rifiutato: ${e.errore}`);
      cambi.push({ turno_copione: n, turno_server: t0, a: p.scena });
      console.log(`[${etichetta}] turno ${n} (server ${t0}): scena → ${p.scena}`);
      // L'apertura della nuova scena alza versione_scena: così non si scambia per buona un'istantanea vecchia.
      stato = await attendiStato(schermo, (s) => s.fase === 'finestra' && s.finestra.aperta && s.versione_scena > v0 && s.turno >= t0, 240_000, `finestra dopo la scena ${p.scena} (turno ${n} del copione)`);
    }
    turnoServer = stato.turno;
    for (const p of copione.turni[n - 1]!) {
      if (p.tipo !== 'azione') continue;
      const t = telefoni.get(p.pg);
      if (!t) throw new Error(`turno ${n}: ${p.pg} non è al tavolo`);
      const dati = { id_pg: p.pg, testo: p.azione, versione_vista: stato.versione_scena, ...(p.privata ? { privata: true } : {}) };
      const e = await emetti<Esito>((cb) => t.emit('azione:invia', dati, cb));
      if (!e.ok) throw new Error(`turno ${n}: azione di ${p.pg} rifiutata: ${e.errore}`);
    }
    osservatore.segnaChiusura(turnoServer);
    const corrente = turnoServer;
    const dopo = attendiStato(schermo, (s) => (s.turno === corrente + 1 && s.fase === 'finestra') || (s.fase === 'pausa' && s.turno === corrente), 300_000, `fine del turno ${n} (server ${corrente})`);
    // Inviare = pronto: con tutti i PG del copione la finestra si chiude da sola; chi in questo turno
    // non agisce non si aspetta, quindi si chiude col «Risolvi ora» del master (un rifiuto vuol dire
    // che si è già chiusa da sola, e va bene).
    await master.comando({ tipo: 'chiudi_finestra' });
    const finito = await dopo;
    if (finito.fase === 'pausa') {
      const motivo = finito.trascrizione.at(-1)?.testo === TESTO_FINE_SCENA ? 'finale' : 'pausa';
      console.log(`[${etichetta}] turno ${n}/${copione.turni.length} (server ${corrente}): ${motivo === 'finale' ? 'il finale ha chiuso la scena' : 'il tavolo è in pausa'}, il copione finisce qui`);
      return { cambi, fine: { turno_copione: n, turno_server: corrente, motivo } };
    }
    turnoServer = corrente + 1;
    console.log(`[${etichetta}] turno ${n}/${copione.turni.length} fatto (server ${corrente})`);
  }
  return { cambi, fine: null };
}

/**
 * Gli orologi turno per turno (stato_orologi del registro delle narrazioni: solo quelli attivi nella
 * scena), il turno in cui ciascuno si è riempito e quanti segni ha avuto in tutto.
 */
function misuraOrologi(narrati: Array<Record<string, unknown>>): { per_turno: Array<{ turno: unknown; stato: unknown }>; massimo: Record<string, string>; completo_al_turno: Record<string, unknown> } {
  const massimo: Record<string, string> = {};
  const completo: Record<string, unknown> = {};
  for (const r of narrati) {
    for (const [id, v] of Object.entries((r['stato_orologi'] ?? {}) as Record<string, string>)) {
      const [p, s] = v.split('/').map(Number);
      if (!massimo[id] || Number(massimo[id]!.split('/')[0]) < p!) massimo[id] = v;
      if (p === s && completo[id] === undefined) completo[id] = r['turno'];
    }
  }
  return { per_turno: narrati.map((r) => ({ turno: r['turno'], stato: r['stato_orologi'] })), massimo, completo_al_turno: completo };
}

/** I [usa] rifiutati raggruppati per motivo (la prima parte, senza id). */
function motiviRifiuto(narrati: Array<Record<string, unknown>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of narrati) {
    for (const u of (r['uscita'] ?? []) as Array<{ tipo: string; id: string; motivo?: string }>) {
      if (u.tipo !== 'usa_rifiutato') continue;
      const m = (u.motivo ?? '?').replaceAll(u.id, '<id>').replace(/\bpg_\w+/g, '<pg>').replace(/\(.*$/, '').replace(/[: ]+$/, '').slice(0, 80);
      out[m] = (out[m] ?? 0) + 1;
    }
  }
  return out;
}

/** Id di tutte le battute del repertorio della campagna (per «mai usate»). */
function elencoBattute(repertorio: Repertorio | null): string[] {
  return repertorio ? repertorio.battute.map((b) => b.id) : [];
}

async function main(): Promise<void> {
  const o = leggiOpzioni(process.argv.slice(2), process.env);
  const { etichetta, modo } = o;
  const campagna: Campagna = caricaCampagna(path.join(RADICE_REPO, 'campagne', o.campagna));
  const copioneIntero = caricaCopione(o.fileCopione);
  // Prova breve (--turni n): solo i primi n turni del copione.
  const copione: Copione = o.turniMax ? { ...copioneIntero, turni: copioneIntero.turni.slice(0, o.turniMax) } : copioneIntero;
  const errori = controllaCopione(copione, campagna);
  if (errori.length) throw new Error(`copione ${o.copione} non giocabile su ${o.campagna}:\n- ${errori.join('\n- ')}`);
  const cartellaRisultati = path.join(RADICE_REPO, 'esperimenti', 'risultati', o.uscita ?? etichetta);
  fs.mkdirSync(cartellaRisultati, { recursive: true });
  const inizioEsperimento = new Date().toISOString();
  console.log(`[${etichetta}] campagna ${o.campagna}, porta ${o.porta}, modalità ${modo}: riavvio del server di prova…`);

  // Versione del codice PRIMA di avviare: è quella che il server carica.
  const versione = versioneCodice(o.campagna);
  if (versione.modificati.length) console.warn(`[${etichetta}] attenzione: albero non pulito (${versione.modificati.length} file modificati sotto server/prompt/campagna); per una run riproducibile usa un worktree su un commit`);

  // 1. Server da zero.
  const token = nuovoToken();
  avviaServer(o, token);
  const salute0 = (await (await fetch(`${o.url}/api/salute`)).json()) as Record<string, unknown>;
  console.log(`[${etichetta}] server: ${JSON.stringify(salute0)}`);
  if (salute0['modo'] !== modo) throw new Error(`modalità attesa ${modo}, il server dice ${String(salute0['modo'])}`);

  // 2. Client: proiettore virtuale (+ osservatore del tavolo), master headless, un telefono per PG.
  const apri = (): Client => connetti(o.url, { transports: ['websocket'], forceNew: true });
  const schermo = apri();
  const osservatore = new OsservatoreTavolo(schermo);
  const proiettore = new ProiettoreVirtuale(schermo);
  const osservato = await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
  osservatore.unisci(osservato.stato);
  const master = await MasterHeadless.entra(apri(), token);
  const telefoni = new Map<string, Client>();
  for (const pg of copione.pg) {
    const t = apri();
    await emetti<StatoTavolo>((cb) => t.emit('telefono:entra', cb));
    const e = await emetti<Esito>((cb) => t.emit('telefono:scegli_pg', { id_pg: pg }, cb));
    if (!e.ok) throw new Error(`scelta di ${pg} rifiutata: ${e.errore}`);
    telefoni.set(pg, t);
  }

  // 3. Scena di partenza del copione (prima dell'inizio il cambio non legge nessuna apertura), poi i turni.
  if (copione.scena && copione.scena !== master.scenaCorrente) {
    const e = await master.scena(copione.scena);
    if (!e.ok) throw new Error(`scena di partenza ${copione.scena} rifiutata: ${e.errore}`);
    console.log(`[${etichetta}] scena di partenza → ${copione.scena}`);
  }
  const primo = attendiStato(schermo, (s) => s.fase === 'finestra' && s.turno === 1, 180_000, 'prima finestra');
  await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
  await primo;
  const { cambi: cambiScena, fine } = await giocaCopione(etichetta, copione, schermo, master, telefoni, osservatore);

  // 4. Raccolta dai registri del server di prova (solo questa sessione).
  const salute = (await (await fetch(`${o.url}/api/salute`)).json()) as Record<string, unknown>;
  const sessione = String(salute['sessione']);
  schermo.disconnect();
  master.chiudi();
  for (const t of telefoni.values()) t.disconnect();
  const narrazioni = leggiJsonl(path.join(o.cartellaLog, 'narrazioni.jsonl')).filter((r) => r['sessione'] === sessione);
  const turni = leggiJsonl(path.join(o.cartellaLog, 'turni.jsonl')).filter((r) => r['sessione'] === sessione);
  const costi = leggiJsonl(path.join(o.cartellaLog, 'costi.jsonl')).filter((r) => String(r['ts']) >= inizioEsperimento);

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
  // Fughe di parole segrete (definizione di parole_segrete.yaml della campagna), riga per riga.
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
    copione: o.copione,
    campagna: o.campagna,
    modo,
    porta: o.porta,
    narratore_finto: o.finto,
    sessione,
    // Condizioni della macchina durante la prova (es. altri carichi sulla GPU), da ESPERIMENTO_NOTA.
    nota_ambiente: process.env['ESPERIMENTO_NOTA'] ?? null,
    // Commit su cui gira il server e file non committati che contano (vuoto = albero pulito).
    codice: versione,
    turni: turni.length,
    turni_copione: copione.turni.length,
    cambi_di_scena: cambiScena,
    fine_prima_del_copione: fine,
    // Il finale (detto dal Motore o dal selettore) e gli orologi turno per turno: le misure del playtest.
    finale: turni.filter((r) => r['finale']).map((r) => ({ turno: r['turno'], id: r['finale'] }))[0] ?? null,
    orologi: misuraOrologi(narrati),
    azioni_private_copione: contaPrivate(copione),
    voce: salute0['voce'],
    latenze,
    buchi: { totale: somma('buchi'), in_frase: somma('buchi_in_frase'), tra_frasi: somma('buchi_tra_frasi'), silenzio_ms: somma('silenzio_ms'), per_turno: turni.map((r) => r['buchi']) },
    righe_prescritte: somma('righe_prescritte'),
    righe_improvvisate: somma('righe_improvvisate'),
    quota_prescritte: somma('righe_prescritte') / Math.max(1, somma('righe_prescritte') + somma('righe_improvvisate')),
    usa_rifiutati: somma('usa_rifiutati'),
    azioni_pubbliche: somma('azioni_pubbliche'),
    azioni_senza_risposta: somma('azioni_senza_risposta'),
    riparazioni: somma('riparazioni'),
    righe_segrete_fermate: somma('righe_segrete_fermate'),
    // Selettore (correzioni del playtest di nozze-neve): «> pg» dedotti o corretti dal Motore, battute
    // indicate dalla preselezione per temi e quante ne sono uscite, righe di PNG fuori scena scartate.
    pg_dedotti: somma('pg_dedotti'),
    battute_indicate: somma('battute_indicate'),
    battute_indicate_usate: somma('battute_indicate_usate'),
    righe_png_assenti: somma('righe_png_assenti'),
    usa_rifiutati_per_motivo: motiviRifiuto(narrati),
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
    battute_mai_usate: elencoBattute(repertorio).filter((id) => !usi[id]),
    costo_totale_usd: costo.totale_usd,
    costo_mediana_turno_usd: costo.mediana_per_turno_usd,
    proiettore_virtuale: proiettore.finiti,
  };
  fs.writeFileSync(path.join(cartellaRisultati, 'riepilogo.json'), JSON.stringify(riepilogo, null, 2) + '\n');
  fs.writeFileSync(path.join(cartellaRisultati, 'trascrizione.md'), trascrizione(etichetta, modo, sessione, o.campagna, narrazioni, copione));
  const nomePg = (id: string): string => campagna.pg.find((p) => p.id === id)?.nome ?? id;
  fs.writeFileSync(path.join(cartellaRisultati, 'tavolo.md'), testoTavolo(osservatore, azioniPrivate(narrazioni, nomePg)));
  console.log(`[${etichetta}] fatto → ${path.relative(RADICE_REPO, cartellaRisultati)} (costo $${costo.totale_usd.toFixed(5)})`);
  // Il server della prova non resta acceso (salvo --lascia-server, per ispezionarlo).
  if (!o.lasciaServer) arrestaServer(o);
  process.exit(0);
}

main().catch((err: unknown) => {
  if (err instanceof ErroreArgomenti) {
    console.error(err.message);
    process.exit(2);
  }
  console.error('esperimento fallito:', (err as Error).message);
  process.exit(1);
});
