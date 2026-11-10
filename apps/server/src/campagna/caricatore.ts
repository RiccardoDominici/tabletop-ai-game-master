/**
 * Caricatore della cartella campagne/<id>/ (schema del manuale, §2–4):
 *   stile.yaml, scena.yaml, png/<id_png>.yaml, pg.yaml, campagna.yaml (facoltativo),
 *   e altre scene in scena_*.yaml e scene/*.yaml (nello stesso ordine del validatore).
 *
 * Campagna a più sessioni (docs/strati.md, «File»; campagna/pacchetti.ts): se c'è sessioni/<nn>/,
 * si carica il livello di campagna (stile, campagna.yaml, png/ ricorrenti, pg.yaml) PIÙ un pacchetto:
 * le sue scene (scene/*.yaml, nell'ordine di sessione.yaml), i suoi PNG, il riassunto iniziale e la
 * parte di sessione di campagna.yaml. scena.yaml e scene/ della radice non contano.
 *
 * È tollerante sulla forma (pg.yaml come lista oppure {personaggi|pg: [...]}, titolo o nome,
 * apertura stringa o lista), ma severo su ciò che rompe il gioco: senza scena, senza apertura
 * o senza PG la sessione non parte. Le incoerenze minori diventano `avvisi` (e righe di log).
 */
import { comeLingua } from '../lingua';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { dividiTesto } from '../narrazione/frasi';
import type { Logger } from '../logger';
import { CARTELLA_SESSIONI, elencoPacchetti, ErrorePacchetto, FILE_SESSIONE, ordinaScene, unisciSessione, type Pacchetto } from './pacchetti';
import {
  ID_NARRATORE,
  type Campagna,
  type DatiYaml,
  type PacchettoCaricato,
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

export interface OpzioniCaricamento {
  /**
   * Numero del pacchetto sessioni/<nn>/ da giocare (campagne a più sessioni). Assente = il primo.
   * Ignorato in una one-shot (che non ha sessioni/).
   */
  pacchetto?: number | null;
}

/** Id della campagna senza caricarla tutta (serve per l'archivio prima di scegliere il pacchetto). */
export function idCampagna(cartella: string): string {
  const campagnaGrezza = leggiYaml(path.join(cartella, 'campagna.yaml'), false) ?? {};
  const stile = leggiYaml(path.join(cartella, 'stile.yaml'), false) ?? {};
  return stringa(campagnaGrezza['id']) ?? stringa(stile['id']) ?? path.basename(cartella);
}

/** PNG di una cartella png/: un file per PNG, id = nome del file. `rel` è il prefisso per gli avvisi. */
function caricaPng(cartellaPng: string, rel: string, avvisa: (msg: string) => void): PngCaricato[] {
  const png: PngCaricato[] = [];
  if (!fs.existsSync(cartellaPng)) return png;
  for (const nomeFile of fs.readdirSync(cartellaPng).filter((f) => f.endsWith('.yaml')).sort()) {
    const idFile = nomeFile.replace(/\.yaml$/, '');
    const dati = leggiYaml(path.join(cartellaPng, nomeFile), true);
    const idScheda = stringa(dati['id']);
    if (idScheda && idScheda !== idFile) avvisa(`${rel}/${nomeFile}: id «${idScheda}» diverso dal nome del file; vale il file`);
    const voce = oggetto(oggetto(dati['voce'])?.['tts']);
    const voceId = stringa(voce?.['voce_id']);
    if (!voceId) avvisa(`${rel}/${nomeFile}: manca voce.tts.voce_id, parlerà con la voce del narratore`);
    const nascosto = dati['nascosto'] === true;
    png.push({ id: idFile, nome: stringa(dati['nome']) ?? idFile, voce_id: voceId ?? ID_NARRATORE, dati, ...(nascosto ? { nascosto } : {}) });
  }
  return png;
}

/** Il pacchetto richiesto (o il primo); un numero che non c'è è un errore. */
function scegliPacchetto(pacchetti: Pacchetto[], numero: number | null | undefined): Pacchetto {
  if (numero === undefined || numero === null) return pacchetti[0]!;
  const p = pacchetti.find((x) => x.numero === numero);
  if (!p) throw new ErroreCampagna(`${CARTELLA_SESSIONI}/: non c'è la sessione ${numero} (ci sono: ${pacchetti.map((x) => x.etichetta).join(', ')})`);
  return p;
}

export function caricaCampagna(cartella: string, log?: Logger, opzioni: OpzioniCaricamento = {}): Campagna {
  if (!fs.existsSync(cartella)) throw new ErroreCampagna(`cartella della campagna inesistente: ${cartella}`);
  const avvisi: string[] = [];
  const avvisa = (msg: string): void => {
    avvisi.push(msg);
    log?.warn({ campagna: cartella }, `campagna: ${msg}`);
  };

  let pacchetti: Pacchetto[];
  try {
    pacchetti = elencoPacchetti(cartella);
  } catch (err) {
    throw new ErroreCampagna((err as Error).message);
  }
  const scelto = pacchetti.length ? scegliPacchetto(pacchetti, opzioni.pacchetto) : null;
  const relPacchetto = scelto ? `${CARTELLA_SESSIONI}/${scelto.etichetta}` : '';

  const stile = leggiYaml(path.join(cartella, 'stile.yaml'), true);
  const pgGrezzo = leggiYaml(path.join(cartella, 'pg.yaml'), true);
  const campagnaGrezza = leggiYaml(path.join(cartella, 'campagna.yaml'), false) ?? {};
  const sessioneGrezza = scelto ? leggiYaml(path.join(scelto.cartella, FILE_SESSIONE), true) : null;

  const id = stringa(campagnaGrezza['id']) ?? stringa(stile['id']) ?? path.basename(cartella);

  // campagna.yaml: tutto tranne `preparazione` (destini, cronologia del cattivo, archi: E2). Con un
  // pacchetto si aggiunge la parte di sessione di sessione.yaml; `sessione` di campagna.yaml non vale.
  const { preparazione: _preparazione, ...campagnaBase } = campagnaGrezza;
  let campagnaNarratore: DatiYaml = campagnaBase;
  if (scelto && sessioneGrezza) {
    const { sessione: vecchia, ...senzaSessione } = campagnaBase;
    if (vecchia !== undefined) avvisa(`campagna.yaml: «sessione» non vale in una campagna a pacchetti (il riassunto sta in ${relPacchetto}/${FILE_SESSIONE})`);
    try {
      campagnaNarratore = unisciSessione(senzaSessione, sessioneGrezza, `${relPacchetto}/${FILE_SESSIONE}`, avvisa);
    } catch (err) {
      throw new ErroreCampagna(err instanceof ErrorePacchetto ? err.message : String(err));
    }
  }

  // --- PNG: quelli ricorrenti (png/ della campagna), più quelli della sola sessione (png/ del pacchetto).
  // Una scheda del pacchetto con l'id di una ricorrente la SOSTITUISCE intera per questa sessione
  // (un PNG che ha imparato o è cambiato qualcosa: docs/strati.md, «Regole di unione»).
  const png = caricaPng(path.join(cartella, 'png'), 'png', avvisa);
  if (scelto) {
    for (const p of caricaPng(path.join(scelto.cartella, 'png'), `${relPacchetto}/png`, avvisa)) {
      const i = png.findIndex((x) => x.id === p.id);
      if (i >= 0) {
        png[i] = p;
        log?.info({ campagna: cartella, png: p.id, pacchetto: scelto.etichetta }, 'campagna: scheda del PNG sostituita da quella del pacchetto');
      } else png.push(p);
    }
    // In ordine di id, come in una one-shot (un file per PNG, letti in ordine): così la vista unita
    // del pacchetto (strumenti/unisci_pacchetto.ts) è la stessa campagna, contesto compreso.
    png.sort((a, b) => a.id.localeCompare(b.id));
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

  // --- Scene: la prima apre la sessione col riassunto iniziale; le altre si leggono quando il master
  // ci passa (pannello), ciascuna con la sua apertura.
  const scene = scelto ? sceneDelPacchetto(cartella, scelto, sessioneGrezza!, png, stile, id, avvisa) : sceneOneShot(cartella, campagnaGrezza, png, stile, id, avvisa);
  const scena = scene[0]!;

  const pacchetto: PacchettoCaricato | null = scelto
    ? { numero: scelto.numero, etichetta: scelto.etichetta, cartella: scelto.cartella, titolo: stringa(sessioneGrezza!['titolo']) ?? `Sessione ${scelto.etichetta}` }
    : null;
  const repertorioCampagna = path.join(cartella, 'repertorio');
  const cartellaRepertorio = scelto ? path.join(scelto.cartella, 'repertorio') : repertorioCampagna;
  if (scelto && fs.existsSync(repertorioCampagna) && fs.readdirSync(repertorioCampagna).some((f) => f.endsWith('.yaml') && f !== 'parole_segrete.yaml')) {
    avvisa(`repertorio/ della campagna: in una campagna a pacchetti le battute stanno in ${relPacchetto}/repertorio/ (qui vale solo parole_segrete.yaml)`);
  }

  const campagna: Campagna = {
    id,
    cartella,
    lingua: comeLingua(campagnaGrezza['lingua'], `${path.basename(cartella)}/campagna.yaml`),
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
    pacchetto,
    cartellaRepertorio,
    // Parole segrete: quelle del pacchetto SOSTITUISCONO quelle della campagna (ciò che i PG hanno
    // scoperto smette di essere segreto); senza file nel pacchetto valgono quelle della campagna.
    cartelleSegreti: [scelto && fs.existsSync(path.join(cartellaRepertorio, 'parole_segrete.yaml')) ? cartellaRepertorio : repertorioCampagna],
  };
  log?.info(
    {
      campagna: id,
      pacchetto: pacchetto ? `${pacchetto.etichetta} (${pacchetto.titolo})` : null,
      pacchetti: pacchetti.map((p) => p.etichetta),
      scena: scena.id,
      scene: scene.map((s) => s.id),
      png: png.map((p) => `${p.id}→${p.voce_id}`),
      pg: pg.map((p) => p.id),
      frasiApertura: scena.apertura.length,
    },
    'campagna caricata',
  );
  return campagna;
}

/** One-shot: scena.yaml (col riassunto di campagna.yaml → sessione), poi scena_*.yaml e scene/*.yaml. */
function sceneOneShot(cartella: string, campagnaGrezza: DatiYaml, png: PngCaricato[], stile: DatiYaml, id: string, avvisa: (msg: string) => void): ScenaCaricata[] {
  const scenaGrezza = leggiYaml(path.join(cartella, 'scena.yaml'), true);
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
  return scene;
}

/**
 * Pacchetto: le scene di sessioni/<nn>/scene/*.yaml nell'ordine di sessione.yaml `scene`; la prima
 * legge prima il riassunto_iniziale di sessione.yaml. Le scene della radice non contano (avviso).
 */
function sceneDelPacchetto(
  cartella: string,
  p: Pacchetto,
  sessione: DatiYaml,
  png: PngCaricato[],
  stile: DatiYaml,
  id: string,
  avvisa: (msg: string) => void,
): ScenaCaricata[] {
  const rel = `${CARTELLA_SESSIONI}/${p.etichetta}`;
  if (fs.existsSync(path.join(cartella, 'scena.yaml')) || fileAltreScene(cartella).length > 0) {
    avvisa(`scena.yaml e scene/ della campagna non valgono in una campagna a pacchetti: si giocano le scene di ${rel}/scene/`);
  }
  const sotto = path.join(p.cartella, 'scene');
  const file = fs.existsSync(sotto) ? fs.readdirSync(sotto).filter((f) => f.endsWith('.yaml')).sort() : [];
  if (file.length === 0) throw new ErroreCampagna(`${rel}/scene/: nessuna scena`);
  const lette: ScenaCaricata[] = [];
  for (const f of file) {
    const r = `${rel}/scene/${f}`;
    const s = leggiScena(leggiYaml(path.join(sotto, f), true), r, [], png, stile, id, avvisa);
    if (lette.some((x) => x.id === s.id)) throw new ErroreCampagna(`${r}: id di scena ripetuto «${s.id}»`);
    lette.push(s);
  }
  let scene: ScenaCaricata[];
  try {
    scene = ordinaScene(lette, sessione['scene'], `${rel}/${FILE_SESSIONE}`, avvisa);
  } catch (err) {
    throw new ErroreCampagna((err as Error).message);
  }
  const riassunto = frasiDa(sessione['riassunto_iniziale']);
  if (riassunto.length === 0) avvisa(`${rel}/${FILE_SESSIONE}: manca riassunto_iniziale (la sessione comincia senza «nella puntata precedente»)`);
  const prima = scene[0]!;
  if (prima.apertura.length === 0) throw new ErroreCampagna(`${rel}: la prima scena «${prima.id}» non ha l'apertura`);
  for (const s of scene.slice(1)) if (s.apertura.length === 0) avvisa(`${rel}: la scena «${s.id}» non ha l'apertura: al passaggio di scena il narratore non la leggerà`);
  return [{ ...prima, apertura: [...riassunto, ...prima.apertura] }, ...scene.slice(1)];
}

/** Altre scene oltre a scena.yaml, nell'ordine del validatore: scena_*.yaml, poi scene/*.yaml. */
function fileAltreScene(cartella: string): string[] {
  const radice = fs.readdirSync(cartella).filter((f) => /^scena_.+\.yaml$/.test(f)).sort().map((f) => path.join(cartella, f));
  const sotto = path.join(cartella, 'scene');
  const cartellaScene = fs.existsSync(sotto) ? fs.readdirSync(sotto).filter((f) => f.endsWith('.yaml')).sort().map((f) => path.join(sotto, f)) : [];
  return [...radice, ...cartellaScene];
}

/** `rientro: tr_casera` è l'id di una battuta; ogni altro testo si legge così com'è. */
const ID_BATTUTA = /^[a-z][a-z0-9]*_[a-z0-9_]+$/;

/**
 * Cosa si legge tornando nella scena: la battuta o il testo di `rientro`; senza, la prima frase
 * dell'apertura della scena (senza il riassunto di sessione), che di solito nomina il luogo.
 */
function rientroDa(dati: DatiYaml, apertura: string[]): ScenaCaricata['rientro'] {
  const grezzo = dati['rientro'];
  const riserva = apertura.slice(0, 1);
  if (typeof grezzo === 'string' && ID_BATTUTA.test(grezzo.trim())) return { battuta: grezzo.trim(), frasi: riserva };
  const frasi = frasiDa(grezzo);
  return { battuta: null, frasi: frasi.length ? frasi : riserva };
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
  const apertura = frasiDa(dati['apertura']);
  return {
    id: stringa(dati['id']) ?? path.basename(file, '.yaml'),
    titolo: stringa(dati['titolo']) ?? stringa(dati['nome']) ?? stringa(stile['titolo']) ?? idCampagna,
    apertura: [...prima, ...apertura],
    umore: stringa(musica?.['tag']) ?? stringa(dati['umore']) ?? 'esplorazione_tesa',
    intensita: typeof dati['intensita'] === 'number' ? (dati['intensita'] as number) : null,
    png_presenti: presenti,
    rientro: rientroDa(dati, apertura),
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
