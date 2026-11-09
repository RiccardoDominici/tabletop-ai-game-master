/**
 * Caricatore e validatore del repertorio (campagne/<id>/repertorio/*.yaml).
 *
 * Errori bloccanti (la modalità repertorio non parte): schema rotto, id ripetuti o non validi,
 * `chi`/etichette di riga sconosciute, riferimenti a indizi, battute, fatti o orologi inesistenti.
 * Avvisi: `quando` oltre 15 parole, più di 2 varianti, battute di PNG senza righe di quel PNG.
 * I file che non hanno la chiave `battute` (es. parole_segrete.yaml) non sono battute: si saltano.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import { ID_NARRATORE } from '../campagna/tipi';
import type { Logger } from '../logger';
import { indiziCampagna } from '../campagna/indizi';
import { TIPI_BATTUTA, type AlternativaRichiede, type Battuta, type CondizioniStato, type Effetti, type Repertorio, type Richiede, type RigaBattuta, type TipoBattuta } from './tipi';
import { EFFETTI, UMORE_AUTO, UMORI } from '../audio/cue';
import { comeAbilita, comeCaratteristica } from '../campagna/regole-srd';
import { caricaRegole } from '../regole/caricatore';

/** Chiavi ammesse in `richiede` (e, tranne `oppure`, in ogni alternativa). Una chiave sconosciuta è un errore: ignorata, aprirebbe il cancello. */
const CHIAVI_RICHIEDE = new Set(['indizi_rivelati', 'indizi_non_rivelati', 'battute_usate', 'battute_non_usate', 'orologio', 'privata', 'da_pg', 'prova', 'oppure']);

export class ErroreRepertorio extends Error {
  override name = 'ErroreRepertorio';
  constructor(readonly errori: string[]) {
    super(`repertorio non valido (${errori.length} errori):\n- ${errori.join('\n- ')}`);
  }
}

const ID_VALIDO = /^[a-z][a-z0-9_]*$/;
const RIGA = /^\s*\[([A-Za-z0-9_]+)\]\s*(.+?)\s*$/s;

function lista(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Id degli indizi definiti nella campagna: schede di TUTTE le scene, nodi senza scheda, rivelazioni. */
export function idIndizi(c: Campagna): Set<string> {
  const ids = new Set(indiziCampagna(c).keys());
  for (const r of (c.campagnaNarratore['rivelazioni'] as DatiYaml[] | undefined) ?? []) for (const id of lista(r?.['indizi'])) ids.add(id);
  return ids;
}

export function idFatti(c: Campagna): Set<string> {
  return new Set(((c.campagnaNarratore['canone'] as DatiYaml[] | undefined) ?? []).map((f) => f?.['id']).filter((x): x is string => typeof x === 'string'));
}

export function idOrologi(c: Campagna): Set<string> {
  return new Set(((c.campagnaNarratore['orologi'] as DatiYaml[] | undefined) ?? []).map((o) => o?.['id']).filter((x): x is string => typeof x === 'string'));
}

export function caricaRepertorio(c: Campagna, log?: Logger, cartella = c.cartellaRepertorio): Repertorio {
  if (!fs.existsSync(cartella)) throw new ErroreRepertorio([`cartella del repertorio inesistente: ${cartella}`]);
  const errori: string[] = [];
  const avvisi: string[] = [];
  const parlanti = new Set([ID_NARRATORE, ...c.png.map((p) => p.id)]);
  const battute: Battuta[] = [];
  const idSet = idDelSet(c);

  for (const nomeFile of fs.readdirSync(cartella).filter((f) => f.endsWith('.yaml')).sort()) {
    let dati: DatiYaml;
    try {
      dati = (YAML.parse(fs.readFileSync(path.join(cartella, nomeFile), 'utf8')) ?? {}) as DatiYaml;
    } catch (err) {
      errori.push(`${nomeFile}: YAML non valido: ${(err as Error).message}`);
      continue;
    }
    if (!Array.isArray(dati['battute'])) continue; // non è un file di battute
    (dati['battute'] as unknown[]).forEach((grezza, i) => {
      const dove = `${nomeFile}#${i + 1}`;
      const b = leggiBattuta(grezza, nomeFile, dove, parlanti, errori, avvisi, idSet);
      if (b) battute.push(b);
    });
  }

  // Unicità e riferimenti incrociati.
  const perId = new Map<string, Battuta>();
  for (const b of battute) {
    if (perId.has(b.id)) errori.push(`${b.file}: id ripetuto «${b.id}» (anche in ${perId.get(b.id)!.file})`);
    else perId.set(b.id, b);
  }
  const indizi = idIndizi(c);
  const fatti = idFatti(c);
  const orologi = idOrologi(c);
  for (const b of battute) {
    // Base e alternative: stessi riferimenti da controllare.
    for (const r of [b.richiede, ...b.richiede.oppure]) {
      for (const id of [...r.indizi_rivelati, ...r.indizi_non_rivelati]) if (!indizi.has(id)) errori.push(`${b.id}: indizio inesistente «${id}»`);
      for (const id of [...r.battute_usate, ...r.battute_non_usate]) if (!perId.has(id)) errori.push(`${b.id}: battuta inesistente «${id}»`);
      if (r.orologio && !orologi.has(r.orologio.id)) errori.push(`${b.id}: orologio inesistente «${r.orologio.id}»`);
      for (const pg of r.da_pg) if (!c.pg.some((p) => p.id === pg)) errori.push(`${b.id}: richiede.da_pg cita un PG inesistente «${pg}»`);
    }
    for (const id of b.effetti.rivela_indizi) if (!indizi.has(id)) errori.push(`${b.id}: indizio inesistente «${id}»`);
    for (const id of b.effetti.fatti_noti) if (!fatti.has(id)) errori.push(`${b.id}: fatto del canone inesistente «${id}»`);
    if (b.effetti.avanza_orologio && !orologi.has(b.effetti.avanza_orologio)) errori.push(`${b.id}: orologio inesistente «${b.effetti.avanza_orologio}»`);
    for (const sc of b.scene) if (!c.scene.some((s) => s.id === sc)) errori.push(`${b.id}: scena inesistente «${sc}»`);
  }
  avvisi.push(...controllaModi(c, battute), ...controllaMenzogne(c, battute));

  for (const a of avvisi) log?.warn({ avviso: a }, 'repertorio: avviso');
  if (errori.length) {
    log?.error({ errori }, 'repertorio: non valido');
    throw new ErroreRepertorio(errori);
  }
  const righe = battute.reduce((s, b) => s + b.testo.length + b.varianti.reduce((t, v) => t + v.length, 0), 0);
  log?.info({ battute: battute.length, righe, avvisi: avvisi.length }, 'repertorio caricato');
  return { battute, perId, avvisi };
}

/** Tipi di riuscita che un cancello `richiede.prova` può chiedere senza dire l'abilità. */
const PROVE_GENERICHE = new Set(['prova', 'salvezza', 'attacco', 'contrapposta']);

/**
 * `richiede.prova` (docs/prove.md): un'abilità o una caratteristica (anche col nome italiano),
 * l'id di una prova della scena (p_…), oppure prova / salvezza / attacco / contrapposta. Un valore
 * che non si capisce è un errore: ignorarlo aprirebbe il cancello.
 */
/** Id del set di regole non SRD della campagna (mosse, abilità, caratteristiche): validi in `richiede.prova`. */
function idDelSet(c: Campagna): ReadonlySet<string> {
  const s = caricaRegole(c.cartella).sistema;
  return s.srd ? new Set() : new Set([...s.mosse, ...s.abilita, ...s.caratteristiche].map((x) => x.id));
}

function leggiCancelloProva(v: unknown, dove: string, errori: string[], idSet: ReadonlySet<string>): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string' || !v.trim()) {
    errori.push(`${dove}: prova è un'abilità, una caratteristica, l'id di una prova della scena o prova/salvezza/attacco`);
    return null;
  }
  const t = v.trim();
  if (idSet.has(t) || PROVE_GENERICHE.has(t) || /^p_[a-z0-9_]+$/.test(t)) return t;
  const id = comeAbilita(t) ?? comeCaratteristica(t);
  if (!id) errori.push(`${dove}: prova «${t}» non è un'abilità, una caratteristica, una prova della scena (p_…) né prova/salvezza/attacco`);
  return id;
}

/**
 * Condizioni di stato di `richiede` o di un'alternativa, controllando le chiavi: una chiave sconosciuta
 * (o un `oppure` dentro un'alternativa) è un errore, perché ignorarla aprirebbe il cancello.
 */
function leggiCondizioni(r: DatiYaml, dove: string, errori: string[], base: boolean): CondizioniStato {
  for (const k of Object.keys(r)) {
    if (!CHIAVI_RICHIEDE.has(k) || (!base && k === 'oppure')) errori.push(`${dove}: chiave non prevista «${k}»${k === 'oppure' ? ' (niente oppure annidati)' : ''}`);
  }
  if (r['privata'] !== undefined && typeof r['privata'] !== 'boolean') errori.push(`${dove}: privata è true o false`);
  const o = r['orologio'] as DatiYaml | undefined;
  return {
    indizi_rivelati: lista(r['indizi_rivelati']),
    indizi_non_rivelati: lista(r['indizi_non_rivelati']),
    battute_usate: lista(r['battute_usate']),
    battute_non_usate: lista(r['battute_non_usate']),
    orologio:
      o && typeof o['id'] === 'string'
        ? { id: o['id'], min: typeof o['min'] === 'number' ? o['min'] : 0, max: typeof o['max'] === 'number' ? o['max'] : Number.POSITIVE_INFINITY }
        : null,
  };
}

/** `scena: id` oppure `scena: [id, id]` → elenco (vuoto = in tutte le scene). */
function leggiScene(v: unknown, dove: string, errori: string[]): string[] {
  if (v === undefined || v === null) return [];
  const elenco = typeof v === 'string' ? [v] : Array.isArray(v) ? v : null;
  if (!elenco || !elenco.every((x) => typeof x === 'string' && x.trim())) {
    errori.push(`${dove}: scena è un id o una lista di id`);
    return [];
  }
  return [...new Set(elenco.map((x) => (x as string).trim()))];
}

/**
 * Copertura dei `modi` (come il validatore, ma a ogni avvio): un indizio che si trova in N modi
 * vuole N battute di rivelazione, una per modo. Un indizio senza nessuna battuta non conta (lo
 * rivela l'improvvisazione).
 */
function controllaModi(c: Campagna, battute: Battuta[]): string[] {
  const avvisi: string[] = [];
  for (const ind of indiziCampagna(c).values()) {
    const n = battute.filter((b) => !b.solo_esempio && b.effetti.rivela_indizi.includes(ind.id)).length;
    if (n > 0 && n < ind.modi) avvisi.push(`indizio ${ind.id}: ${n} battute di rivelazione per ${ind.modi} modi di trovarlo`);
  }
  return avvisi;
}

/** Id delle menzogne di una scheda PNG (`mente_su[].id`). */
export function idMenzogne(dati: DatiYaml): Set<string> {
  const mente = Array.isArray(dati['mente_su']) ? (dati['mente_su'] as DatiYaml[]) : [];
  return new Set(mente.map((m) => m?.['id']).filter((x): x is string => typeof x === 'string'));
}

/** `effetti.menzogna_detta` deve essere l'id di una `mente_su` di chi parla (se la scheda dà gli id). */
function controllaMenzogne(c: Campagna, battute: Battuta[]): string[] {
  const avvisi: string[] = [];
  for (const b of battute) {
    const id = b.effetti.menzogna_detta;
    const png = c.png.find((p) => p.id === b.chi);
    if (!id || !png) continue;
    const ids = idMenzogne(png.dati);
    if (ids.size && !ids.has(id)) avvisi.push(`${b.id}: menzogna_detta «${id}» non è l'id di nessuna mente_su di ${b.chi}`);
  }
  return avvisi;
}

function leggiRighe(v: unknown, dove: string, parlanti: Set<string>, errori: string[]): RigaBattuta[] {
  if (!Array.isArray(v) || v.length === 0) {
    errori.push(`${dove}: testo vuoto o non è una lista di righe`);
    return [];
  }
  const righe: RigaBattuta[] = [];
  for (const r of v) {
    const m = typeof r === 'string' ? RIGA.exec(r) : null;
    if (!m) {
      errori.push(`${dove}: riga non nel formato «[etichetta] testo»: ${JSON.stringify(r)}`);
      continue;
    }
    const etichetta = m[1]!.toLowerCase();
    if (!parlanti.has(etichetta)) errori.push(`${dove}: etichetta sconosciuta [${etichetta}]`);
    righe.push({ etichetta, testo: m[2]! });
  }
  return righe;
}

function leggiBattuta(
  grezza: unknown,
  file: string,
  dove: string,
  parlanti: Set<string>,
  errori: string[],
  avvisi: string[],
  idSet: ReadonlySet<string>,
): Battuta | null {
  if (!grezza || typeof grezza !== 'object' || Array.isArray(grezza)) {
    errori.push(`${dove}: la battuta non è un oggetto`);
    return null;
  }
  const d = grezza as DatiYaml;
  const id = typeof d['id'] === 'string' ? d['id'] : '';
  const qui = id ? `${file}:${id}` : dove;
  if (!ID_VALIDO.test(id)) errori.push(`${dove}: id mancante o non valido «${id}» (minuscolo ascii)`);
  const chi = typeof d['chi'] === 'string' ? d['chi'] : '';
  if (!parlanti.has(chi)) errori.push(`${qui}: chi sconosciuto «${chi}»`);
  const tipo = d['tipo'] as TipoBattuta;
  if (!TIPI_BATTUTA.includes(tipo)) errori.push(`${qui}: tipo non ammesso «${String(tipo)}»`);
  const quando = typeof d['quando'] === 'string' ? d['quando'].trim() : '';
  if (!quando) errori.push(`${qui}: manca «quando»`);
  else if (quando.split(/\s+/).length > 15) avvisi.push(`${qui}: «quando» oltre 15 parole`);

  const testo = leggiRighe(d['testo'], qui, parlanti, errori);
  const varianti = (Array.isArray(d['varianti']) ? d['varianti'] : []).map((v, i) => leggiRighe(v, `${qui} variante ${i + 1}`, parlanti, errori));
  if (varianti.length > 2) avvisi.push(`${qui}: ${varianti.length} varianti (previste 0–2)`);
  if (chi !== ID_NARRATORE && chi && !testo.some((r) => r.etichetta === chi)) avvisi.push(`${qui}: battuta di ${chi} senza righe di ${chi}`);

  const r = (d['richiede'] ?? {}) as DatiYaml;
  const alternative = r['oppure'];
  if (alternative !== undefined && !(Array.isArray(alternative) && alternative.length >= 2)) {
    errori.push(`${qui}: richiede.oppure è una lista di almeno due blocchi di condizioni`);
  }
  const richiede: Richiede = {
    ...leggiCondizioni(r, `${qui} richiede`, errori, true),
    privata: r['privata'] === true,
    da_pg: lista(r['da_pg']),
    prova: leggiCancelloProva(r['prova'], `${qui} richiede`, errori, idSet),
    oppure: (Array.isArray(alternative) ? alternative : []).map((a, i): AlternativaRichiede => {
      const dove = `${qui} richiede.oppure[${i + 1}]`;
      if (!a || typeof a !== 'object' || Array.isArray(a) || Object.keys(a).length === 0) {
        errori.push(`${dove}: un'alternativa è un blocco di condizioni non vuoto`);
        return { ...leggiCondizioni({}, dove, errori, false), privata: null, da_pg: [], prova: null };
      }
      const alt = a as DatiYaml;
      return {
        ...leggiCondizioni(alt, dove, errori, false),
        privata: typeof alt['privata'] === 'boolean' ? alt['privata'] : null,
        da_pg: lista(alt['da_pg']),
        prova: leggiCancelloProva(alt['prova'], dove, errori, idSet),
      };
    }),
  };
  const e = (d['effetti'] ?? {}) as DatiYaml;
  const effetti: Effetti = {
    rivela_indizi: lista(e['rivela_indizi']),
    menzogna_detta: typeof e['menzogna_detta'] === 'string' ? e['menzogna_detta'] : null,
    fatti_noti: lista(e['fatti_noti']),
    avanza_orologio: typeof e['avanza_orologio'] === 'string' ? e['avanza_orologio'] : null,
  };
  const audio = leggiAudioBattuta(d['audio'], `${qui} audio`, errori);
  const maxUsi = typeof d['max_usi'] === 'number' && d['max_usi'] >= 1 ? Math.floor(d['max_usi']) : 1;
  if (d['max_usi'] !== undefined && maxUsi !== d['max_usi']) errori.push(`${qui}: max_usi non valido`);
  return {
    id,
    chi,
    tipo,
    quando,
    temi: lista(d['temi']),
    richiede,
    testo,
    varianti,
    effetti,
    max_usi: maxUsi,
    solo_esempio: d['solo_esempio'] === true,
    riempitivo: d['riempitivo'] === true,
    scene: leggiScene(d['scena'], qui, errori),
    audio,
    file,
  };
}

/**
 * `audio: {umore, effetto}` di una battuta (facoltativo). Vocabolario chiuso come le righe
 * [umore]/[effetto] del narratore: un tag sbagliato è un errore qui, non un silenzio in gioco.
 * Se il catalogo della campagna non ha quel brano o effetto, lo dice la regia quando esce.
 */
function leggiAudioBattuta(a: unknown, dove: string, errori: string[]): Battuta['audio'] {
  if (a === undefined || a === null) return null;
  if (typeof a !== 'object' || Array.isArray(a)) {
    errori.push(`${dove}: un blocco {umore, effetto}`);
    return null;
  }
  const out: { umore?: string; effetto?: string } = {};
  for (const [k, v] of Object.entries(a as DatiYaml)) {
    if (k === 'umore') {
      if (typeof v === 'string' && (v === UMORE_AUTO || (UMORI as readonly string[]).includes(v))) out.umore = v;
      else errori.push(`${dove}.umore «${String(v)}» fuori dal vocabolario (${UMORI.join(', ')}, ${UMORE_AUTO})`);
    } else if (k === 'effetto') {
      const tag = typeof v === 'string' ? v.replace(/^sfx_/, '') : '';
      if ((EFFETTI as readonly string[]).includes(tag)) out.effetto = tag;
      else errori.push(`${dove}.effetto «${String(v)}» fuori dal vocabolario (${EFFETTI.join(', ')})`);
    } else {
      errori.push(`${dove}: chiave non prevista «${k}» (solo umore, effetto)`);
    }
  }
  return out.umore || out.effetto ? out : null;
}
