/**
 * The campaign's choice about PCs (campagna.yaml → regole.creazione; docs/creazione.md): pregenerated PCs only (the
 * default, as before), creation at the table, or both (a player picks a pregenerated PC or builds one); and the Game
 * Master's choices among what the set allows (Basic Fantasy p. 186: «purely the decision of the Game Master»):
 *
 *   regole:
 *     creazione:
 *       modo: entrambi            # pregenerati | al_tavolo | entrambi
 *       metodo: in_ordine         # one of the set's creazione.caratteristiche.metodi (default: the first)
 *       opzioni: [scambio_punti]  # the set's options the Game Master allows (default: none)
 *       senza_speranza: [ritira]  # the hopeless character's remedies allowed (default: the set's)
 *       punti_ferita: massimo     # the first level's die: tira | massimo (default: the set's)
 *       livello: 3                # the level new PCs start at (default: the set's; a party already grown)
 *       incantesimi: master       # who picks a caster's starting spells: scelta | master | tiro (default: the set's)
 *
 * The validator mirrors it (strumenti/valida/regole_schede.py, SCHEDA.regole).
 */
import type { DatiYaml } from '../campagna/tipi';
import type { OpzioniCampagnaCreazione } from './bozza';

const ogg = (v: unknown): DatiYaml | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as DatiYaml) : null);

/** The campaign's options; a wrong value is reported in `avvisi` and the default stands (the validator stops it). */
export function opzioniCreazione(campagna: DatiYaml, avvisi: string[] = []): OpzioniCampagnaCreazione {
  const o = ogg(ogg(campagna['regole'])?.['creazione']) ?? {};
  const modo = o['modo'] ?? 'pregenerati';
  if (modo !== 'pregenerati' && modo !== 'al_tavolo' && modo !== 'entrambi') avvisi.push(`regole.creazione.modo: «${String(modo)}» (pregenerati, al_tavolo, entrambi)`);
  const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const rimedi = o['senza_speranza'] === undefined ? null : lista(o['senza_speranza']).filter((r): r is 'ritira' | 'ribalta' => r === 'ritira' || r === 'ribalta');
  const pf = o['punti_ferita'];
  const come = o['incantesimi'];
  const livello = o['livello'];
  return {
    modo: modo === 'al_tavolo' || modo === 'entrambi' ? modo : 'pregenerati',
    metodo: typeof o['metodo'] === 'string' ? o['metodo'] : null,
    opzioni: lista(o['opzioni']),
    rimedi,
    puntiFerita: pf === 'tira' || pf === 'massimo' ? pf : null,
    livello: typeof livello === 'number' && Number.isInteger(livello) && livello >= 1 ? livello : null,
    incantesimi: come === 'scelta' || come === 'master' || come === 'tiro' ? come : null,
  };
}

/** Whether the players may build PCs at the table in this campaign. */
export const creazioneAlTavolo = (o: OpzioniCampagnaCreazione): boolean => o.modo !== 'pregenerati';
