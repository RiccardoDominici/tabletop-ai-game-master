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
import { TIPI_BATTUTA, type Battuta, type Effetti, type Repertorio, type Richiede, type RigaBattuta, type TipoBattuta } from './tipi';

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

/** Id degli indizi definiti nella campagna: scheda della scena, nodi senza scheda, rivelazioni. */
export function idIndizi(c: Campagna): Set<string> {
  const ids = new Set<string>();
  for (const i of (c.scena.dati['indizi'] as DatiYaml[] | undefined) ?? []) if (typeof i?.['id'] === 'string') ids.add(i['id']);
  for (const n of (c.campagnaNarratore['nodi'] as DatiYaml[] | undefined) ?? []) {
    for (const i of (n?.['indizi'] as DatiYaml[] | undefined) ?? []) if (typeof i?.['id'] === 'string') ids.add(i['id']);
  }
  for (const r of (c.campagnaNarratore['rivelazioni'] as DatiYaml[] | undefined) ?? []) for (const id of lista(r?.['indizi'])) ids.add(id);
  return ids;
}

export function idFatti(c: Campagna): Set<string> {
  return new Set(((c.campagnaNarratore['canone'] as DatiYaml[] | undefined) ?? []).map((f) => f?.['id']).filter((x): x is string => typeof x === 'string'));
}

export function idOrologi(c: Campagna): Set<string> {
  return new Set(((c.campagnaNarratore['orologi'] as DatiYaml[] | undefined) ?? []).map((o) => o?.['id']).filter((x): x is string => typeof x === 'string'));
}

export function caricaRepertorio(c: Campagna, log?: Logger, cartella = path.join(c.cartella, 'repertorio')): Repertorio {
  if (!fs.existsSync(cartella)) throw new ErroreRepertorio([`cartella del repertorio inesistente: ${cartella}`]);
  const errori: string[] = [];
  const avvisi: string[] = [];
  const parlanti = new Set([ID_NARRATORE, ...c.png.map((p) => p.id)]);
  const battute: Battuta[] = [];

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
      const b = leggiBattuta(grezza, nomeFile, dove, parlanti, errori, avvisi);
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
    const r = b.richiede;
    for (const id of [...r.indizi_rivelati, ...r.indizi_non_rivelati, ...b.effetti.rivela_indizi]) {
      if (!indizi.has(id)) errori.push(`${b.id}: indizio inesistente «${id}»`);
    }
    for (const id of [...r.battute_usate, ...r.battute_non_usate]) if (!perId.has(id)) errori.push(`${b.id}: battuta inesistente «${id}»`);
    for (const id of b.effetti.fatti_noti) if (!fatti.has(id)) errori.push(`${b.id}: fatto del canone inesistente «${id}»`);
    if (r.orologio && !orologi.has(r.orologio.id)) errori.push(`${b.id}: orologio inesistente «${r.orologio.id}»`);
    if (b.effetti.avanza_orologio && !orologi.has(b.effetti.avanza_orologio)) errori.push(`${b.id}: orologio inesistente «${b.effetti.avanza_orologio}»`);
  }

  for (const a of avvisi) log?.warn({ avviso: a }, 'repertorio: avviso');
  if (errori.length) {
    log?.error({ errori }, 'repertorio: non valido');
    throw new ErroreRepertorio(errori);
  }
  const righe = battute.reduce((s, b) => s + b.testo.length + b.varianti.reduce((t, v) => t + v.length, 0), 0);
  log?.info({ battute: battute.length, righe, avvisi: avvisi.length }, 'repertorio caricato');
  return { battute, perId, avvisi };
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
  const o = r['orologio'] as DatiYaml | undefined;
  const richiede: Richiede = {
    indizi_rivelati: lista(r['indizi_rivelati']),
    indizi_non_rivelati: lista(r['indizi_non_rivelati']),
    battute_usate: lista(r['battute_usate']),
    battute_non_usate: lista(r['battute_non_usate']),
    orologio:
      o && typeof o['id'] === 'string'
        ? { id: o['id'], min: typeof o['min'] === 'number' ? o['min'] : 0, max: typeof o['max'] === 'number' ? o['max'] : Number.POSITIVE_INFINITY }
        : null,
  };
  const e = (d['effetti'] ?? {}) as DatiYaml;
  const effetti: Effetti = {
    rivela_indizi: lista(e['rivela_indizi']),
    menzogna_detta: typeof e['menzogna_detta'] === 'string' ? e['menzogna_detta'] : null,
    fatti_noti: lista(e['fatti_noti']),
    avanza_orologio: typeof e['avanza_orologio'] === 'string' ? e['avanza_orologio'] : null,
  };
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
    file,
  };
}
