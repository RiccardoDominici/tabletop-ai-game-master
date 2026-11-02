/**
 * Caricatore della cartella campagne/<id>/ (schema del manuale, §2–4):
 *   stile.yaml, scena.yaml, png/<id_png>.yaml, pg.yaml, campagna.yaml (facoltativo),
 *   e altre scene in scena_*.yaml e scene/*.yaml (nello stesso ordine del validatore).
 *
 * È tollerante sulla forma (pg.yaml come lista oppure {personaggi|pg: [...]}, titolo o nome,
 * apertura stringa o lista), ma severo su ciò che rompe il gioco: senza scena, senza apertura
 * o senza PG la sessione non parte. Le incoerenze minori diventano `avvisi` (e righe di log).
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { dividiTesto } from '../narrazione/frasi';
import type { Logger } from '../logger';
import {
  ID_NARRATORE,
  type Campagna,
  type DatiYaml,
  type PgCaricato,
  type PngCaricato,
  type ScenaCaricata,
} from './tipi';

export class ErroreCampagna extends Error {
  override name = 'ErroreCampagna';
}

function leggiYaml(file: string, obbligatorio: true): DatiYaml;
function leggiYaml(file: string, obbligatorio: false): DatiYaml | null;
function leggiYaml(file: string, obbligatorio: boolean): DatiYaml | null {
  if (!fs.existsSync(file)) {
    if (obbligatorio) throw new ErroreCampagna(`file mancante: ${file}`);
    return null;
  }
  let dati: unknown;
  try {
    dati = YAML.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new ErroreCampagna(`YAML non valido in ${file}: ${(err as Error).message}`);
  }
  if (Array.isArray(dati)) return { elementi: dati };
  if (dati === null || typeof dati !== 'object') throw new ErroreCampagna(`${file}: atteso un oggetto YAML`);
  return dati as DatiYaml;
}

function stringa(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function oggetto(v: unknown): DatiYaml | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as DatiYaml) : null;
}

/** Testo o lista di testi → frasi. */
function frasiDa(v: unknown): string[] {
  if (typeof v === 'string') return dividiTesto(v);
  if (Array.isArray(v)) return v.flatMap((x) => (typeof x === 'string' ? dividiTesto(x) : []));
  return [];
}

export function caricaCampagna(cartella: string, log?: Logger): Campagna {
  if (!fs.existsSync(cartella)) throw new ErroreCampagna(`cartella della campagna inesistente: ${cartella}`);
  const avvisi: string[] = [];
  const avvisa = (msg: string): void => {
    avvisi.push(msg);
    log?.warn({ campagna: cartella }, `campagna: ${msg}`);
  };

  const stile = leggiYaml(path.join(cartella, 'stile.yaml'), true);
  const scenaGrezza = leggiYaml(path.join(cartella, 'scena.yaml'), true);
  const pgGrezzo = leggiYaml(path.join(cartella, 'pg.yaml'), true);
  const campagnaGrezza = leggiYaml(path.join(cartella, 'campagna.yaml'), false) ?? {};

  const id = stringa(campagnaGrezza['id']) ?? stringa(stile['id']) ?? path.basename(cartella);

  // campagna.yaml: tutto tranne `preparazione` (destini, cronologia del cattivo, archi: E2).
  const { preparazione: _preparazione, ...campagnaNarratore } = campagnaGrezza;

  // --- PNG: un file per PNG, id = nome del file.
  const png: PngCaricato[] = [];
  const cartellaPng = path.join(cartella, 'png');
  if (fs.existsSync(cartellaPng)) {
    for (const nomeFile of fs.readdirSync(cartellaPng).filter((f) => f.endsWith('.yaml')).sort()) {
      const idFile = nomeFile.replace(/\.yaml$/, '');
      const dati = leggiYaml(path.join(cartellaPng, nomeFile), true);
      const idScheda = stringa(dati['id']);
      if (idScheda && idScheda !== idFile) avvisa(`png/${nomeFile}: id «${idScheda}» diverso dal nome del file; vale il file`);
      const voce = oggetto(oggetto(dati['voce'])?.['tts']);
      const voceId = stringa(voce?.['voce_id']);
      if (!voceId) avvisa(`png/${nomeFile}: manca voce.tts.voce_id, parlerà con la voce del narratore`);
      png.push({ id: idFile, nome: stringa(dati['nome']) ?? idFile, voce_id: voceId ?? ID_NARRATORE, dati });
    }
  }
  const voci = png.map((p) => p.voce_id).filter((v) => v !== ID_NARRATORE);
  const doppie = voci.filter((v, i) => voci.indexOf(v) !== i);
  if (doppie.length) avvisa(`voce_id ripetuti tra i PNG: ${[...new Set(doppie)].join(', ')}`);

  // --- PG: lista oppure {personaggi|pg|elementi: [...]}.
  const elencoPg = (pgGrezzo['personaggi'] ?? pgGrezzo['pg'] ?? pgGrezzo['elementi']) as unknown;
  if (!Array.isArray(elencoPg) || elencoPg.length === 0) throw new ErroreCampagna('pg.yaml: nessun personaggio giocante');
  const pg: PgCaricato[] = [];
  for (const voce of elencoPg) {
    const d = oggetto(voce);
    const idPg = stringa(d?.['id']);
    if (!d || !idPg) {
      avvisa('pg.yaml: personaggio senza id, ignorato');
      continue;
    }
    if (pg.some((p) => p.id === idPg)) throw new ErroreCampagna(`pg.yaml: id ripetuto ${idPg}`);
    const { conoscenze_private: privato, ...pubblico } = d;
    pg.push({
      id: idPg,
      nome: stringa(d['nome']) ?? idPg,
      descrizione: descriviPg(d),
      pubblico,
      privato: Array.isArray(privato) ? privato : [],
    });
  }

  // --- Scene: la prima (scena.yaml) apre la sessione col riassunto iniziale; le altre si leggono
  // quando il master ci passa (pannello), ciascuna con la sua apertura.
  const sessione = oggetto(campagnaGrezza['sessione']);
  const scena = leggiScena(scenaGrezza, 'scena.yaml', frasiDa(sessione?.['riassunto_iniziale']), png, stile, id, avvisa);
  if (scena.apertura.length === 0) throw new ErroreCampagna('scena.yaml: manca il testo d’apertura (apertura)');
  const scene = [scena];
  for (const file of fileAltreScene(cartella)) {
    const rel = path.relative(cartella, file);
    const altra = leggiScena(leggiYaml(file, true), rel, [], png, stile, id, avvisa);
    if (scene.some((s) => s.id === altra.id)) throw new ErroreCampagna(`${rel}: id di scena ripetuto «${altra.id}»`);
    if (altra.apertura.length === 0) avvisa(`${rel}: manca l'apertura: al passaggio di scena il narratore non la leggerà`);
    scene.push(altra);
  }

  const campagna: Campagna = {
    id,
    cartella,
    titolo: stringa(stile['titolo']) ?? scena.titolo,
    stile,
    campagnaNarratore,
    scena,
    scene,
    png,
    pg,
    situazioneComune: stringa(pgGrezzo['situazione_comune']),
    alias: costruisciAlias(png, pg),
    avvisi,
  };
  log?.info(
    { campagna: id, scena: scena.id, scene: scene.map((s) => s.id), png: png.map((p) => `${p.id}→${p.voce_id}`), pg: pg.map((p) => p.id), frasiApertura: scena.apertura.length },
    'campagna caricata',
  );
  return campagna;
}

/** Altre scene oltre a scena.yaml, nell'ordine del validatore: scena_*.yaml, poi scene/*.yaml. */
function fileAltreScene(cartella: string): string[] {
  const radice = fs.readdirSync(cartella).filter((f) => /^scena_.+\.yaml$/.test(f)).sort().map((f) => path.join(cartella, f));
  const sotto = path.join(cartella, 'scene');
  const cartellaScene = fs.existsSync(sotto) ? fs.readdirSync(sotto).filter((f) => f.endsWith('.yaml')).sort().map((f) => path.join(sotto, f)) : [];
  return [...radice, ...cartellaScene];
}

/** Una scheda scena: `prima` sono le frasi da leggere prima dell'apertura (il riassunto, solo per la prima scena). */
function leggiScena(
  dati: DatiYaml,
  file: string,
  prima: string[],
  png: PngCaricato[],
  stile: DatiYaml,
  idCampagna: string,
  avvisa: (msg: string) => void,
): ScenaCaricata {
  const musica = oggetto(dati['musica']);
  const presenti = Array.isArray(dati['png_presenti'])
    ? (dati['png_presenti'] as unknown[]).filter((x): x is string => typeof x === 'string')
    : png.map((p) => p.id);
  for (const p of presenti) if (!png.some((x) => x.id === p)) avvisa(`${file}: png_presenti cita ${p}, che non ha una scheda in png/`);
  return {
    id: stringa(dati['id']) ?? path.basename(file, '.yaml'),
    titolo: stringa(dati['titolo']) ?? stringa(dati['nome']) ?? stringa(stile['titolo']) ?? idCampagna,
    apertura: [...prima, ...frasiDa(dati['apertura'])],
    umore: stringa(musica?.['tag']) ?? stringa(dati['umore']) ?? 'esplorazione_tesa',
    intensita: typeof dati['intensita'] === 'number' ? (dati['intensita'] as number) : null,
    png_presenti: presenti,
    dati,
  };
}

function maiuscola(s: string): string {
  return s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s;
}

/**
 * Riga per il telefono: «Specie classe. Aspetto». Se l'aspetto comincia già con la specie
 * («Halfling dai ricci…») la specie non si ripete: «Druida. Halfling dai ricci…».
 */
function descriviPg(d: DatiYaml): string {
  const specie = stringa(d['specie']) ?? stringa(d['razza']);
  const classe = stringa(d['classe']);
  const aspetto = stringa(d['aspetto']) ?? stringa(d['descrizione']);
  const ripete = !!(specie && aspetto && aspetto.toLowerCase().startsWith(specie.toLowerCase()));
  const testa = (ripete ? [classe] : [specie, classe]).filter(Boolean).join(' ');
  if (testa && aspetto) return `${maiuscola(testa)}. ${aspetto}`;
  return maiuscola(testa || aspetto || '');
}

/**
 * Alias per il parser: id senza prefisso e primo nome proprio, in minuscolo
 * («ottavia» → png_ottavia, «ginestra» → pg_ginestra). Gli alias ambigui vengono scartati.
 */
function costruisciAlias(png: PngCaricato[], pg: PgCaricato[]): Record<string, string> {
  const candidati = new Map<string, Set<string>>();
  const aggiungi = (alias: string, id: string): void => {
    const a = alias.trim().toLowerCase();
    if (!a || a === id) return;
    if (!candidati.has(a)) candidati.set(a, new Set());
    candidati.get(a)!.add(id);
  };
  for (const x of [...png, ...pg]) {
    aggiungi(x.id.replace(/^(png|pg)_/, ''), x.id);
    aggiungi(x.nome, x.id);
    const primo = x.nome.split(/\s+/)[0];
    if (primo && primo.length > 2) aggiungi(primo, x.id);
  }
  const alias: Record<string, string> = {};
  for (const [a, ids] of candidati) if (ids.size === 1) alias[a] = [...ids][0]!;
  return alias;
}
