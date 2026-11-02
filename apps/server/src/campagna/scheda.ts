/**
 * Scheda del PG per il telefono del suo giocatore (pg.yaml): sezioni leggibili e conoscenze
 * private. Le conoscenze private escono SOLO verso la stanza player:<id_pg> (T9).
 */
import type { SchedaPg } from '@cantastorie/shared';
import type { Campagna } from './tipi';

/** Campi di pg.yaml mostrati sul telefono, con il titolo della sezione, in quest'ordine. */
const SEZIONI: Array<[string, string]> = [
  ['concetto', 'Chi sei'],
  ['aggancio', 'Il tuo aggancio'],
  ['cosa_sai_fare', 'Cosa sai fare'],
  ['aspetto', 'Aspetto'],
];

function righe(v: unknown): string[] {
  if (typeof v === 'string') return v.trim() ? [v.trim()] : [];
  if (Array.isArray(v)) return v.flatMap(righe);
  if (v !== null && typeof v === 'object' && typeof (v as { testo?: unknown }).testo === 'string') return righe((v as { testo: string }).testo);
  return [];
}

export function schedaPg(c: Campagna, id_pg: string): SchedaPg | null {
  const pg = c.pg.find((p) => p.id === id_pg);
  if (!pg) return null;
  return {
    id_pg,
    nome: pg.nome,
    descrizione: pg.descrizione,
    sezioni: SEZIONI.map(([chiave, titolo]) => ({ titolo, righe: righe(pg.pubblico[chiave]) })).filter((s) => s.righe.length > 0),
    conoscenze_private: righe(pg.privato),
    situazione_comune: c.situazioneComune,
  };
}
