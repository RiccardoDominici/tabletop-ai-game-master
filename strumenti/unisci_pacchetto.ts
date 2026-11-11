/**
 * Vista unita di un pacchetto di sessione, scritta come una one-shot, con il codice VERO del server
 * (apps/server/src/campagna/caricatore.ts e pacchetti.ts): così il validatore controlla una campagna a
 * più sessioni con le classi di sempre, senza una seconda copia delle regole di unione in Python
 * (docs/strati.md, «Regole di unione»: due implementazioni finirebbero per divergere).
 *
 * Cosa scrive in <uscita>/:
 *   stile.yaml, pg.yaml, brief.yaml,           copiati dal livello di campagna (il lessico di pronuncia
 *   pronunce.yaml, pronunce-gioco.yaml         vale per tutte le sessioni, docs/pronuncia.md);
 *   campagna.yaml                              campagna.yaml + la parte di sessione di sessione.yaml,
 *                                              con sessione.riassunto_iniziale e le due `preparazione`;
 *   scena.yaml, scene/NN_<id>.yaml             le scene del pacchetto nell'ordine di sessione.yaml
 *                                              (il prefisso numerico tiene l'ordine anche per chi ordina i nomi);
 *   png/<id>.yaml                              ricorrenti + della sessione (la scheda del pacchetto sostituisce);
 *   repertorio/                                le battute del pacchetto e il parole_segrete.yaml che vale;
 *   immagini/, audio/                          manifest uniti per id (il pacchetto vince) e link ai file;
 *   mappa.json                                 { file unito: [file originali, relativi alla campagna] }.
 * Solo lettura sulla campagna: scrive soltanto in <uscita>.
 *
 * Uso (dalla radice del repository):
 *   npx tsx strumenti/unisci_pacchetto.ts campagne/<id> --sessione <n> --uscita <cartella>
 *
 * Uscita: 0 scritto; 2 argomenti sbagliati (o <uscita> non vuota e non nostra); 3 il pacchetto non si
 * carica (il motivo su stderr, lo stesso che darebbe il server all'avvio).
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { caricaCampagna } from '../apps/server/src/campagna/caricatore';
import { FILE_SESSIONE } from '../apps/server/src/campagna/pacchetti';
import type { DatiYaml } from '../apps/server/src/campagna/tipi';

const AIUTO = 'Uso: npx tsx strumenti/unisci_pacchetto.ts <cartella della campagna> --sessione <n> --uscita <cartella>';
const MAPPA = 'mappa.json';

function leggiOpzioni(argv: string[]): { cartella: string; sessione: number; uscita: string } | null {
  let cartella = '';
  let sessione: number | null = null;
  let uscita = '';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--sessione') sessione = /^\d+$/.test(argv[i + 1] ?? '') ? Number(argv[++i]) : null;
    else if (a === '--uscita') uscita = argv[++i] ?? '';
    else if (a.startsWith('--')) return null;
    else if (!cartella) cartella = a;
    else return null;
  }
  return cartella && sessione !== null && uscita ? { cartella: path.resolve(cartella), sessione, uscita: path.resolve(uscita) } : null;
}

const yaml = (d: unknown): string => YAML.stringify(d, { lineWidth: 0, minContentWidth: 0 });
const leggiYaml = (f: string): DatiYaml => (fs.existsSync(f) ? ((YAML.parse(fs.readFileSync(f, 'utf8')) ?? {}) as DatiYaml) : {});
const leggiJson = (f: string): Record<string, unknown> | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as Record<string, unknown>) : null);

/** Manifest uniti: ogni lista di voci con `id` si unisce per id (vince il secondo); per il resto vince il secondo, le liste di testi si accodano. */
function unisciManifest(a: Record<string, unknown> | null, b: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!a || !b) return a ?? b;
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prima = out[k];
    if (Array.isArray(prima) && Array.isArray(v)) {
      const conId = (x: unknown): x is { id: string } => !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string';
      if (v.every(conId) && prima.every(conId)) {
        const ids = new Set(v.map((x) => x.id));
        out[k] = [...prima.filter((x) => !ids.has(x.id)), ...v];
      } else out[k] = [...prima, ...v.filter((x) => !prima.includes(x))];
    } else out[k] = v;
  }
  return out;
}

function main(): number {
  const o = leggiOpzioni(process.argv.slice(2));
  if (!o) {
    console.error(AIUTO);
    return 2;
  }
  // La cartella d'uscita si svuota solo se è una vista scritta da qui (c'è la mappa) o è vuota.
  if (fs.existsSync(o.uscita) && fs.readdirSync(o.uscita).length > 0) {
    if (!fs.existsSync(path.join(o.uscita, MAPPA))) {
      console.error(`unisci_pacchetto: ${o.uscita} non è vuota e non è una vista unita: non la tocco`);
      return 2;
    }
    fs.rmSync(o.uscita, { recursive: true, force: true });
  }
  let c: ReturnType<typeof caricaCampagna>;
  try {
    c = caricaCampagna(o.cartella, undefined, { pacchetto: o.sessione });
  } catch (err) {
    console.error(`unisci_pacchetto: ${(err as Error).message}`);
    return 3;
  }
  const p = c.pacchetto;
  if (!p) {
    console.error(`unisci_pacchetto: ${o.cartella} non ha sessioni/: è già una one-shot`);
    return 3;
  }
  const relP = path.relative(o.cartella, p.cartella);
  const mappa: Record<string, string[]> = {};
  const scrivi = (rel: string, testo: string, origini: string[]): void => {
    const f = path.join(o.uscita, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, testo);
    mappa[rel] = origini;
  };
  const collega = (rel: string, assoluto: string): void => {
    const f = path.join(o.uscita, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.rmSync(f, { force: true });
    fs.symlinkSync(assoluto, f);
    mappa[rel] = [path.relative(o.cartella, assoluto)];
  };

  // Livello di campagna copiato com'è.
  for (const f of ['stile.yaml', 'pg.yaml', 'brief.yaml', 'pronunce.yaml', 'pronunce-gioco.yaml']) if (fs.existsSync(path.join(o.cartella, f))) scrivi(f, fs.readFileSync(path.join(o.cartella, f), 'utf8'), [f]);

  // campagna.yaml: la vista del narratore (già unita dal caricatore) + riassunto e preparazione.
  const sessione = leggiYaml(path.join(p.cartella, FILE_SESSIONE));
  const preparazione = { ...((leggiYaml(path.join(o.cartella, 'campagna.yaml'))['preparazione'] as DatiYaml | undefined) ?? {}), ...((sessione['preparazione'] as DatiYaml | undefined) ?? {}) };
  const campagna: DatiYaml = { ...c.campagnaNarratore, sessione: { riassunto_iniziale: sessione['riassunto_iniziale'] ?? '' } };
  if (Object.keys(preparazione).length) campagna['preparazione'] = preparazione;
  scrivi('campagna.yaml', yaml(campagna), ['campagna.yaml', `${relP}/${FILE_SESSIONE}`]);

  // Scene nell'ordine della sessione: la prima è scena.yaml.
  const fileScena = (id: string): string => {
    const sotto = path.join(p.cartella, 'scene');
    const f = fs.readdirSync(sotto).find((x) => x.endsWith('.yaml') && (x === `${id}.yaml` || leggiYaml(path.join(sotto, x))['id'] === id));
    return `${relP}/scene/${f ?? `${id}.yaml`}`;
  };
  c.scene.forEach((s, i) => {
    const rel = i === 0 ? 'scena.yaml' : `scene/${String(i + 1).padStart(2, '0')}_${s.id}.yaml`;
    scrivi(rel, yaml(s.dati), [fileScena(s.id)]);
  });

  // PNG: la scheda che vale (ricorrente o del pacchetto).
  for (const png of c.png) {
    const delPacchetto = fs.existsSync(path.join(p.cartella, 'png', `${png.id}.yaml`));
    scrivi(`png/${png.id}.yaml`, yaml(png.dati), [delPacchetto ? `${relP}/png/${png.id}.yaml` : `png/${png.id}.yaml`]);
  }

  // Repertorio: battute del pacchetto, parole segrete che valgono.
  if (fs.existsSync(c.cartellaRepertorio)) {
    for (const f of fs.readdirSync(c.cartellaRepertorio).filter((x) => x.endsWith('.yaml') && x !== 'parole_segrete.yaml').sort()) {
      scrivi(`repertorio/${f}`, fs.readFileSync(path.join(c.cartellaRepertorio, f), 'utf8'), [`${relP}/repertorio/${f}`]);
    }
  }
  const segreti = path.join(c.cartelleSegreti[0]!, 'parole_segrete.yaml');
  if (fs.existsSync(segreti)) scrivi('repertorio/parole_segrete.yaml', fs.readFileSync(segreti, 'utf8'), [path.relative(o.cartella, segreti)]);

  // Immagini e audio: manifest uniti per id, file collegati (quelli del pacchetto sopra quelli della campagna).
  for (const sotto of ['immagini', 'audio']) {
    const cartelle = [path.join(o.cartella, sotto), path.join(p.cartella, sotto)].filter((d) => fs.existsSync(d));
    if (!cartelle.length) continue;
    let manifest: Record<string, unknown> | null = null;
    for (const d of cartelle) {
      manifest = unisciManifest(manifest, leggiJson(path.join(d, 'manifest.json')));
      for (const f of fs.readdirSync(d).filter((x) => x !== 'manifest.json').sort()) if (fs.statSync(path.join(d, f)).isFile()) collega(`${sotto}/${f}`, path.join(d, f));
    }
    if (manifest) scrivi(`${sotto}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, cartelle.filter((d) => fs.existsSync(path.join(d, 'manifest.json'))).map((d) => path.relative(o.cartella, path.join(d, 'manifest.json'))));
  }

  const ordinata = Object.fromEntries(Object.entries(mappa).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(path.join(o.uscita, MAPPA), `${JSON.stringify({ campagna: o.cartella, sessione: p.numero, pacchetto: relP, file: ordinata }, null, 2)}\n`);
  console.log(`unisci_pacchetto: ${c.id} sessione ${p.etichetta} → ${o.uscita} (${Object.keys(mappa).length} file)`);
  if (c.avvisi.length) for (const a of c.avvisi) console.log(`  avviso: ${a}`);
  return 0;
}

process.exitCode = main();
