/**
 * What the Engine reads of the world from campagna.yaml (docs/mondo.md §3): the consequences of the clocks'
 * marks, the fronts' omens that say when they come to pass (`al_segno`), the timeline events tied to a mark
 * (`segno: {orologio, n}`), the dangers (moves and cast, for the stall's S1 and for surfacing off-screen
 * events) and the fronts' `orologi_extra` (clocks never active in a scene).
 *
 * `preparazione` stays out of the narrator's context (caricatore.ts strips it): this module reads it for the
 * Engine only, and nothing here reaches a prompt unless a consequence says so (`detto`, `tracce`, `regia`).
 * Tolerant like the loader: an entry it cannot read becomes a warning, never a crash.
 */
import type { DatiYaml } from './tipi';

export type StatoAtteggiamento = 'ostile' | 'indifferente' | 'amichevole';
export const STATI_ATTEGGIAMENTO: readonly StatoAtteggiamento[] = ['ostile', 'indifferente', 'amichevole'];
/** In a consequence, an attitude towards every PC. */
export const TUTTI_I_PG = 'tutti';
/** In a consequence, an NPC that leaves the story (present in no scene). */
export const VIA = 'via';

/** A change to one NPC (`png: {png_x: {atteggiamento, scena}}`). */
export interface CambioPng {
  id: string;
  /** PC id (or TUTTI_I_PG) → new attitude. */
  atteggiamento: Array<{ pg: string; stato: StatoAtteggiamento }>;
  /** The scene where the NPC is from now on, or VIA; null = it does not move. */
  scena: string | null;
}

export type OrigineConseguenza = 'conseguenza' | 'presagio' | 'evento' | 'destino';

/** Something that happens in the world when a clock reaches a mark. */
export interface Conseguenza {
  /** Stable id for the log: «o_x@3», «p_x#0», «t_x», «o_x@full». */
  id: string;
  origine: OrigineConseguenza;
  orologio: string;
  alSegno: number;
  /** What happens (canon, may be secret: never said as such). */
  cosa: string;
  /** Sentence the table hears if the PCs are there. */
  detto: string | null;
  /** Mode B: a line of the repertoire the Engine says instead of `detto`. */
  battuta: string | null;
  /** Directive for the narrator's next message (mode A). */
  regia: string | null;
  /** Sentence the table hears later, if it happened elsewhere. */
  tracce: string | null;
  png: CambioPng[];
  /** Hidden NPCs that appear. */
  compare: string[];
  /** Clues the world offers (the stall's S2 tries them first). */
  indizi: string[];
  /** NPCs of the danger (omens, dooms): an off-screen event surfaces where one of them is. */
  cast: string[];
}

/** A danger of a front, as the Engine needs it. */
export interface PericoloMondo {
  id: string;
  fronte: string;
  orologio: string | null;
  impulso: string | null;
  mosse: string[];
  cast: string[];
  /** Visible signs of the omens (material for S1). */
  segniVisibili: string[];
}

export interface MondoCampagna {
  conseguenze: Conseguenza[];
  pericoli: PericoloMondo[];
  /** `orologi_extra` of the fronts (definitions for StatoOrologi: never active in a scene). */
  orologiExtra: DatiYaml[];
}

export const MONDO_VUOTO: MondoCampagna = { conseguenze: [], pericoli: [], orologiExtra: [] };

function testo(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function lista(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];
}

function oggetto(v: unknown): DatiYaml | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as DatiYaml) : null;
}

function mappe(v: unknown): DatiYaml[] {
  return Array.isArray(v) ? v.map(oggetto).filter((x): x is DatiYaml => x !== null) : [];
}

const statoValido = (v: unknown): v is StatoAtteggiamento => typeof v === 'string' && (STATI_ATTEGGIAMENTO as readonly string[]).includes(v);

/** `png: {png_x: {atteggiamento: ostile | {pg_y: amichevole}, scena: scena_y | via}}`. */
function cambiPng(v: unknown, dove: string, avvisa: (m: string) => void): CambioPng[] {
  const d = oggetto(v);
  if (!d) return [];
  const out: CambioPng[] = [];
  for (const [id, grezzo] of Object.entries(d)) {
    const c = oggetto(grezzo) ?? {};
    const att = c['atteggiamento'];
    const atteggiamento: CambioPng['atteggiamento'] = [];
    if (statoValido(att)) atteggiamento.push({ pg: TUTTI_I_PG, stato: att });
    else if (oggetto(att)) {
      for (const [pg, s] of Object.entries(oggetto(att)!)) {
        if (statoValido(s)) atteggiamento.push({ pg, stato: s });
        else avvisa(`${dove}: ${id} attitude towards ${pg} is not one of ${STATI_ATTEGGIAMENTO.join(', ')}`);
      }
    } else if (att !== undefined) avvisa(`${dove}: ${id} attitude is not one of ${STATI_ATTEGGIAMENTO.join(', ')}`);
    out.push({ id, atteggiamento, scena: testo(c['scena']) });
  }
  return out;
}

/** The optional keys shared by consequences and omens. */
function chiaviComuni(d: DatiYaml, dove: string, avvisa: (m: string) => void): Pick<Conseguenza, 'battuta' | 'regia' | 'tracce' | 'png' | 'compare' | 'indizi'> {
  return {
    battuta: testo(d['battuta']),
    regia: testo(d['regia']),
    tracce: testo(d['tracce']),
    png: cambiPng(d['png'], dove, avvisa),
    compare: lista(d['compare']),
    indizi: lista(d['indizi']),
  };
}

function segnoValido(n: unknown, segmenti: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= segmenti;
}

/**
 * The world of a campaign: `orologi` (top level, with `conseguenze`) and `preparazione` (fronts, timeline).
 * `orologiNarratore`: the clocks the narrator sees (after a package's merge).
 */
export function caricaMondo(orologiNarratore: readonly DatiYaml[], preparazione: unknown, avvisa: (m: string) => void = () => {}): MondoCampagna {
  const prep = oggetto(preparazione) ?? {};
  const fronti = mappe(prep['fronti']);
  const orologiExtra = fronti.flatMap((f) => mappe(f['orologi_extra'])).filter((o) => testo(o['id']));
  const tutti = [...orologiNarratore, ...orologiExtra];
  const segmenti = new Map(tutti.filter((o) => testo(o['id'])).map((o) => [testo(o['id'])!, typeof o['segmenti'] === 'number' ? (o['segmenti'] as number) : lista(o['segni']).length]));
  const conseguenze: Conseguenza[] = [];

  // 1. The clocks' own consequences.
  for (const o of tutti) {
    const id = testo(o['id']);
    if (!id) continue;
    for (const [i, c] of mappe(o['conseguenze']).entries()) {
      const dove = `${id}.conseguenze[${i}]`;
      const n = c['al_segno'];
      const cosa = testo(c['cosa']);
      if (!segnoValido(n, segmenti.get(id) ?? 0) || !cosa) {
        avvisa(`${dove}: needs al_segno (1–${segmenti.get(id) ?? 0}) and cosa`);
        continue;
      }
      conseguenze.push({ id: `${id}@${n}`, origine: 'conseguenza', orologio: id, alSegno: n, cosa, detto: testo(c['detto']), ...chiaviComuni(c, dove, avvisa), cast: [] });
    }
  }

  // 2. Dangers: omens with al_segno come to pass on the danger's clock; the doom at the full clock.
  const pericoli: PericoloMondo[] = [];
  for (const f of fronti) {
    const fronte = testo(f['id']) ?? '?';
    for (const p of mappe(f['pericoli'])) {
      const pid = testo(p['id']);
      if (!pid) continue;
      const orologio = testo(p['orologio']);
      const cast = lista(p['cast']);
      const presagi = mappe(p['presagi']);
      pericoli.push({ id: pid, fronte, orologio, impulso: testo(p['impulso']), mosse: lista(p['mosse']), cast, segniVisibili: presagi.map((x) => testo(x['segno_visibile'])).filter((x): x is string => !!x) });
      if (!orologio || !segmenti.has(orologio)) continue;
      presagi.forEach((pr, i) => {
        if (pr['al_segno'] === undefined) return; // an omen without al_segno is material for S1 only
        const dove = `${pid}.presagi[${i}]`;
        const cosa = testo(pr['testo']);
        if (!segnoValido(pr['al_segno'], segmenti.get(orologio)!) || !cosa) {
          avvisa(`${dove}: al_segno must be a mark of ${orologio} (1–${segmenti.get(orologio)}), with testo`);
          return;
        }
        conseguenze.push({ id: `${pid}#${i}`, origine: 'presagio', orologio, alSegno: pr['al_segno'], cosa, detto: testo(pr['segno_visibile']), ...chiaviComuni(pr, dove, avvisa), cast });
      });
      const destino = testo(p['destino_incombente']);
      if (destino) conseguenze.push({ id: `${pid}@pieno`, origine: 'destino', orologio, alSegno: segmenti.get(orologio)!, cosa: destino, detto: null, battuta: null, regia: null, tracce: null, png: [], compare: [], indizi: [], cast });
    }
  }

  // 3. Timeline events tied to a mark: canon at that mark (no sentence: they are what happens).
  for (const ev of mappe(oggetto(prep['cronologia'])?.['eventi'])) {
    const s = oggetto(ev['segno']);
    const orologio = testo(s?.['orologio']);
    const cosa = testo(ev['cosa']);
    if (!s || !orologio || !cosa) continue;
    if (!segmenti.has(orologio) || !segnoValido(s['n'], segmenti.get(orologio)!)) {
      avvisa(`cronologia ${testo(ev['id']) ?? '?'}: segno.n must be a mark of an existing clock`);
      continue;
    }
    conseguenze.push({ id: testo(ev['id']) ?? `${orologio}@${s['n']}`, origine: 'evento', orologio, alSegno: s['n'] as number, cosa, detto: null, battuta: null, regia: null, tracce: null, png: [], compare: [], indizi: [], cast: [] });
  }
  // In mark order, then as written (a clock's own consequence before the omens of the same mark).
  conseguenze.sort((a, b) => a.alSegno - b.alSegno);
  return { conseguenze, pericoli, orologiExtra };
}
