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
import { CLASSI_STATO, TIPI_BATTUTA, TIPI_ESITO, type AlternativaRichiede, type EsitoBattuta, type TipoEsito, type Battuta, type ClasseStato, type CondizioniStato, type Effetti, type Repertorio, type Richiede, type RigaBattuta, type TipoBattuta } from './tipi';
import { EFFETTI, UMORE_AUTO, UMORI } from '../audio/cue';
import { comeAbilita, comeCaratteristica } from '../campagna/regole-srd';
import { caricaRegole } from '../regole/caricatore';
import { STATI_ATTEGGIAMENTO, TUTTI_I_PG } from '../campagna/mondo';

/** Chiavi ammesse in `richiede` (e, tranne `oppure`, in ogni alternativa). Una chiave sconosciuta è un errore: ignorata, aprirebbe il cancello. */
const CHIAVI_RICHIEDE = new Set(['indizi_rivelati', 'indizi_non_rivelati', 'battute_usate', 'battute_non_usate', 'orologio', 'privata', 'da_pg', 'prova', 'oppure', 'stati', 'esito']);

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
      const b = leggiBattuta(grezza, nomeFile, dove, parlanti, errori, avvisi, idSet, c.pg.map((p) => p.id));
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
  const oggetti = new Set(c.scene.flatMap((s) => ((s.dati['elementi_interattivi'] as DatiYaml[] | undefined) ?? []).flatMap((x) => (typeof x?.['id'] === 'string' ? [x['id']] : []))));
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
    for (const o of b.effetti.oggetti) {
      if (!oggetti.has(o.id)) errori.push(`${b.id}: effetti.oggetti cita un oggetto inesistente «${o.id}» (elementi_interattivi con id)`);
      if (o.chi !== 'pg' && o.chi !== 'scena' && !c.png.some((p) => p.id === o.chi) && !c.pg.some((p) => p.id === o.chi)) errori.push(`${b.id}: effetti.oggetti.${o.id}: «${o.chi}» non è un personaggio, «pg» o «scena»`);
    }
    for (const a of b.effetti.atteggiamento) {
      if (!c.png.some((p) => p.id === a.png)) errori.push(`${b.id}: effetti.atteggiamento cita un PNG inesistente «${a.png}»`);
      if (a.pg !== null && a.pg !== TUTTI_I_PG && !c.pg.some((p) => p.id === a.pg)) errori.push(`${b.id}: effetti.atteggiamento cita un PG inesistente «${a.pg}»`);
    }
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
/**
 * `effetti.atteggiamento` (A23): `{png_x: stato}` towards the PC the line answers, or `{png_x: {pg_y | tutti: stato}}`.
 */
function leggiAtteggiamenti(v: unknown, dove: string, errori: string[]): Effetti['atteggiamento'] {
  if (v === undefined || v === null) return [];
  if (typeof v !== 'object' || Array.isArray(v)) {
    errori.push(`${dove}: effetti.atteggiamento è {png_x: stato} o {png_x: {pg_y: stato}}`);
    return [];
  }
  const valido = (s: unknown): s is Effetti['atteggiamento'][number]['stato'] => typeof s === 'string' && (STATI_ATTEGGIAMENTO as readonly string[]).includes(s);
  const out: Effetti['atteggiamento'] = [];
  for (const [png, x] of Object.entries(v as DatiYaml)) {
    if (valido(x)) out.push({ png, pg: null, stato: x });
    else if (x && typeof x === 'object' && !Array.isArray(x)) {
      for (const [pg, s] of Object.entries(x as DatiYaml)) {
        if (valido(s)) out.push({ png, pg, stato: s });
        else errori.push(`${dove}: effetti.atteggiamento di ${png} verso ${pg}: «${String(s)}» non è ${STATI_ATTEGGIAMENTO.join(', ')}`);
      }
    } else errori.push(`${dove}: effetti.atteggiamento di ${png}: «${String(x)}» non è ${STATI_ATTEGGIAMENTO.join(', ')}`);
  }
  return out;
}

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
    if (!CHIAVI_RICHIEDE.has(k) || (!base && (k === 'oppure' || k === 'stati' || k === 'esito'))) errori.push(`${dove}: chiave non prevista «${k}»${k === 'oppure' ? ' (niente oppure annidati)' : k === 'stati' || k === 'esito' ? ` (${k} solo nella base)` : ''}`);
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
  pg: readonly string[] = [],
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
    stati: leggiStati(r['stati'], `${qui} richiede.stati`, parlanti, errori, pg),
    esito: leggiEsito(r['esito'], `${qui} richiede.esito`, parlanti, pg, errori),
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
    atteggiamento: leggiAtteggiamenti(e['atteggiamento'], qui, errori),
    oggetti: Object.entries((e['oggetti'] as DatiYaml | undefined) ?? {}).flatMap(([id, chi]) => {
      if (typeof chi === 'string') return [{ id, chi }];
      errori.push(`${qui}: effetti.oggetti.${id} è un id di personaggio, «pg» o «scena»`);
      return [];
    }),
  };
  if (d['sconfitta'] !== undefined && (d['sconfitta'] !== true || tipo !== 'finale')) errori.push(`${qui}: sconfitta: true solo su una battuta di tipo finale`);
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
    stallo: leggiStallo(d['stallo'], qui, effetti, errori),
    ...(d['sconfitta'] === true ? { sconfitta: true } : {}),
    scene: leggiScene(d['scena'], qui, errori),
    audio,
    attori: d['attori'] === undefined ? null : leggiPng(d['attori'], `${qui} attori`, parlanti, errori),
    menzionati: leggiPng(d['menzionati'], `${qui} menzionati`, parlanti, errori),
    file,
  };
}

/**
 * `stallo: 1 | 2 | 3` (docs/mondo.md §5): the level of a stall line. Level 2 brings a clue, so it reveals one; level 3
 * sums up what is known, so it reveals nothing new. (Its gates on the action are the validator's: the Engine says it with
 * no action, so a line that needs one would never come out.)
 */
function leggiStallo(v: unknown, qui: string, effetti: Effetti, errori: string[]): 1 | 2 | 3 | null {
  if (v === undefined || v === null) return null;
  if (v !== 1 && v !== 2 && v !== 3) {
    errori.push(`${qui}: stallo è 1, 2 o 3`);
    return null;
  }
  if (v === 2 && !effetti.rivela_indizi.length) errori.push(`${qui}: stallo 2 porta un indizio (effetti.rivela_indizi)`);
  if (v === 3 && effetti.rivela_indizi.length) errori.push(`${qui}: stallo 3 riassume le piste note, non rivela indizi`);
  return v;
}

/** A list of NPC ids with a sheet (`attori`, `menzionati`); a wrong id is an error: ignoring it would offer the line. */
function leggiPng(v: unknown, dove: string, parlanti: Set<string>, errori: string[]): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    errori.push(`${dove}: una lista di id di PNG`);
    return [];
  }
  for (const id of v as string[]) if (id === ID_NARRATORE || !parlanti.has(id)) errori.push(`${dove}: «${id}» non è un PNG con scheda`);
  return [...new Set(v as string[])];
}

/** `richiede.esito: {tipo: colpito|mancato|a_terra|fugge, chi?: png_x, bersaglio?: id}` (docs/repertorio.md). */
function leggiEsito(v: unknown, dove: string, parlanti: Set<string>, pg: readonly string[], errori: string[]): EsitoBattuta | null {
  if (v === undefined || v === null) return null;
  const d = (typeof v === 'string' ? { tipo: v } : v) as DatiYaml;
  if (typeof d !== 'object' || Array.isArray(d) || !(TIPI_ESITO as readonly unknown[]).includes(d['tipo'])) {
    errori.push(`${dove}: {tipo: ${TIPI_ESITO.join(' | ')}, chi?, bersaglio?}`);
    return null;
  }
  for (const k of Object.keys(d)) if (!['tipo', 'chi', 'bersaglio'].includes(k)) errori.push(`${dove}: chiave non prevista «${k}»`);
  const id = (k: 'chi' | 'bersaglio'): string | null => {
    const x = d[k];
    if (x === undefined || x === null) return null;
    if (typeof x !== 'string' || x === ID_NARRATORE || !(parlanti.has(x) || pg.includes(x))) {
      errori.push(`${dove}.${k}: «${String(x)}» non è un PNG con scheda né un PG`);
      return null;
    }
    return x;
  };
  return { tipo: d['tipo'] as TipoEsito, chi: id('chi'), bersaglio: id('bersaglio') };
}

/** `richiede.stati: {png_x: a_terra}` or `{png_x: [a_terra, morto]}`: the classes of CLASSI_STATO. */
/** PCs too (round 6, CA T15: a line took a player's «zero punti ferita» as true): the ledger has their real states. */
function leggiStati(v: unknown, dove: string, parlanti: Set<string>, errori: string[], pg: readonly string[] = []): Record<string, ClasseStato[]> {
  if (v === undefined || v === null) return {};
  if (typeof v !== 'object' || Array.isArray(v)) {
    errori.push(`${dove}: un blocco {id_png: stato o [stati]}`);
    return {};
  }
  const out: Record<string, ClasseStato[]> = {};
  for (const [id, x] of Object.entries(v as DatiYaml)) {
    // `tutti`: every PC, as in the attitudes (repertorio/fatti-battuta.ts).
    if (id === ID_NARRATORE || !(parlanti.has(id) || pg.includes(id) || id === TUTTI_I_PG)) errori.push(`${dove}: «${id}» non è un PNG con scheda né un PG`);
    const classi = typeof x === 'string' ? [x] : Array.isArray(x) ? x : null;
    if (!classi?.length || !classi.every((c) => (CLASSI_STATO as readonly unknown[]).includes(c))) {
      errori.push(`${dove}.${id}: uno o più di ${CLASSI_STATO.join(', ')}`);
      continue;
    }
    out[id] = [...new Set(classi as ClasseStato[])];
  }
  return out;
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
