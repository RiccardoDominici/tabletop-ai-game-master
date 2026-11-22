/**
 * Where the PCs built at the table live (docs/creazione.md, docs/strati.md «Files»): one YAML file per PC, the same shape
 * as an entry of pg.yaml, in `pg-creati/` of the campaign's play folder, and the drafts still being built in
 * `pg-creati/bozze/` (JSON, so a restart or the server's rebuild never loses a half-built PC).
 *
 * The play folder is the campaign's own folder for the real game and the instance's log folder for a test instance
 * (Campagna.cartellaGioco, avvio.ts), so a test run never writes into campagne/<id>/; TAGM_PG_CREATI points it
 * elsewhere (a live check keeps it inside its copy of the campaign, where the validator and tra_sessioni.py look).
 * `campagne/*\/pg-creati/` is in .gitignore: a PC built at the table is play data, and may carry a player's real name.
 *
 * Every reader of the PCs uses this folder: the campaign loader (campagna/caricatore.ts), so the next session and the
 * session after load them like pg.yaml's; the validator (strumenti/valida/carica.py) and tra_sessioni.py through it.
 */
import '../variabili-legacy'; // the old CANTASTORIE_PG_CREATI name too: it must come before the environment is read
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { DatiYaml } from '../campagna/tipi';

export const CARTELLA_PG_CREATI = 'pg-creati';
const CARTELLA_BOZZE = 'bozze';

/** The folder of the PCs built at the table: TAGM_PG_CREATI, else `pg-creati/` of the play folder (or the campaign's). */
export function cartellaPgCreati(cartellaCampagna: string, cartellaGioco?: string | null, env: NodeJS.ProcessEnv = process.env): string {
  const forzata = env['TAGM_PG_CREATI']?.trim();
  return forzata ? path.resolve(forzata) : path.join(cartellaGioco ?? cartellaCampagna, CARTELLA_PG_CREATI);
}

/** The PCs built at the table, in file-name order: each file is one pg.yaml entry. Unreadable files are reported. */
export function leggiPgCreati(cartella: string, avvisa: (m: string) => void = () => {}): DatiYaml[] {
  if (!fs.existsSync(cartella)) return [];
  const out: DatiYaml[] = [];
  for (const f of fs.readdirSync(cartella).filter((x) => x.endsWith('.yaml')).sort()) {
    try {
      const d = YAML.parse(fs.readFileSync(path.join(cartella, f), 'utf8')) as unknown;
      if (d && typeof d === 'object' && !Array.isArray(d) && typeof (d as DatiYaml)['id'] === 'string') out.push(d as DatiYaml);
      else avvisa(`${CARTELLA_PG_CREATI}/${f}: non è un personaggio (serve una voce come quelle di pg.yaml, con id)`);
    } catch (err) {
      avvisa(`${CARTELLA_PG_CREATI}/${f}: YAML non valido (${(err as Error).message.split('\n')[0]})`);
    }
  }
  return out;
}

/** Writes an approved PC (atomically: a temporary file renamed), with a header saying where it comes from. */
export function scriviPgCreato(cartella: string, voce: DatiYaml & { id: string }, intestazione: string): string {
  fs.mkdirSync(cartella, { recursive: true });
  const file = path.join(cartella, `${voce.id}.yaml`);
  const testo = `${intestazione
    .split('\n')
    .map((r) => `# ${r}`.trimEnd())
    .join('\n')}\n${YAML.stringify(voce, { lineWidth: 0 })}`;
  fs.writeFileSync(`${file}.tmp`, testo);
  fs.renameSync(`${file}.tmp`, file);
  return file;
}

/** The drafts saved in the store (a restart or a rebuild of the server finds them again). */
export function leggiBozze<T>(cartella: string, avvisa: (m: string) => void = () => {}): T[] {
  const dir = path.join(cartella, CARTELLA_BOZZE);
  if (!fs.existsSync(dir)) return [];
  const out: T[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as T);
    } catch (err) {
      avvisa(`${CARTELLA_PG_CREATI}/${CARTELLA_BOZZE}/${f}: illeggibile (${(err as Error).message})`);
    }
  }
  return out;
}

export function scriviBozza(cartella: string, id: string, bozza: unknown): void {
  const dir = path.join(cartella, CARTELLA_BOZZE);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.json`);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(bozza, null, 1));
  fs.renameSync(`${file}.tmp`, file);
}

export function cancellaBozza(cartella: string, id: string): void {
  fs.rmSync(path.join(cartella, CARTELLA_BOZZE, `${id}.json`), { force: true });
}
