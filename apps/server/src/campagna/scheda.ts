/**
 * Scheda del PG per il telefono del suo giocatore (pg.yaml): sezioni leggibili e conoscenze
 * private. Le conoscenze private escono SOLO verso la stanza player:<id_pg> (T9).
 *
 * Besides the Preparer's text (who the PC is, the hook, what it can do, its look), the sections the sheet's data gives
 * (R6): race, class and level, the scores, the languages and the spellbook, named by the campaign's rule set. A PC built
 * at the table (docs/creazione.md) has no Preparer's text at all: without these its «Scheda» showed only its gear.
 */
import type { SchedaPg } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import type { Campagna, DatiYaml } from './tipi';

/** Campi di pg.yaml mostrati sul telefono, con il titolo della sezione, in quest'ordine. */
const SEZIONI: Array<[string, string]> = [
  ['concetto', 'Chi sei'],
  ['aggancio', 'Il tuo aggancio'],
  ['cosa_sai_fare', 'Cosa sai fare'],
  ['aspetto', 'Aspetto'],
];

/** The names the rule set gives to the sheet's ids (characteristics, languages, spells); absent = the ids as written. */
export interface NomiDelSet {
  caratteristiche: ReadonlyArray<{ id: string; nome: string }>;
  lingue?: ReadonlyArray<{ id: string; nome: string }>;
  poteri?: ReadonlyArray<{ id: string; nome: string }>;
}

function righe(v: unknown): string[] {
  if (typeof v === 'string') return v.trim() ? [v.trim()] : [];
  if (Array.isArray(v)) return v.flatMap(righe);
  if (v !== null && typeof v === 'object' && typeof (v as { testo?: unknown }).testo === 'string') return righe((v as { testo: string }).testo);
  return [];
}

const ogg = (v: unknown): DatiYaml | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as DatiYaml) : null);
const stringa = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);

/** The sections from the PC's data: race, class and level; scores; languages; spellbook (each only when it has some). */
function sezioniDaiDati(pubblico: DatiYaml, set: NomiDelSet | null): SchedaPg['sezioni'] {
  const out: SchedaPg['sezioni'] = [];
  const nome = (l: ReadonlyArray<{ id: string; nome: string }> | undefined, id: string): string => l?.find((x) => x.id === id)?.nome ?? id;
  const specie = stringa(pubblico['specie']);
  const classe = stringa(pubblico['classe']);
  const livello = stringa(pubblico['livello']);
  if (specie || classe) out.push({ titolo: testo('scheda_pg.chi'), righe: [[specie, classe, livello ? testo('scheda_pg.livello', { livello }) : null].filter(Boolean).join(', ')] });
  const sch = ogg(pubblico['scheda']);
  const car = ogg(sch?.['caratteristiche']);
  if (car && Object.keys(car).length) {
    const ordine = set?.caratteristiche.map((c) => c.id).filter((id) => id in car) ?? Object.keys(car);
    out.push({ titolo: testo('scheda_pg.caratteristiche'), righe: [ordine.map((id) => `${nome(set?.caratteristiche, id)} ${String(car[id])}`).join(' · ')] });
  }
  const lingue = Array.isArray(sch?.['lingue']) ? (sch!['lingue'] as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  if (lingue.length) out.push({ titolo: testo('scheda_pg.lingue'), righe: [lingue.map((id) => nome(set?.lingue, id)).join(', ')] });
  const libro = Array.isArray(sch?.['libro']) ? (sch!['libro'] as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  if (libro.length) out.push({ titolo: testo('scheda_pg.libro'), righe: libro.map((id) => nome(set?.poteri, id)) });
  return out;
}

export function schedaPg(c: Campagna, id_pg: string, set: NomiDelSet | null = null): SchedaPg | null {
  const pg = c.pg.find((p) => p.id === id_pg);
  if (!pg) return null;
  return {
    id_pg,
    nome: pg.nome,
    descrizione: pg.descrizione,
    sezioni: [...SEZIONI.map(([chiave, titolo]) => ({ titolo, righe: righe(pg.pubblico[chiave]) })).filter((s) => s.righe.length > 0), ...sezioniDaiDati(pg.pubblico, set)],
    conoscenze_private: righe(pg.privato),
    situazione_comune: c.situazioneComune,
  };
}
