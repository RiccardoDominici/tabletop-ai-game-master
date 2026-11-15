/**
 * Who rolls the dice (docs/prove.md §8–9), a campaign setting chosen when the campaign is created:
 *
 * - `regole.tiri_giocatori` in campagna.yaml: `manuale` (default) = the players roll real dice at the table and enter
 *   what they show, the DC stays secret; `automatico` = the Engine rolls for them, as before 15 November.
 * - `regole.tiri_master`: the Game Master's background rolls (an uncertain world outcome nobody at the table rolls
 *   for): `nascosti` (default, logged and on the Game Master panel), `a_volte` (shown when the odds are close, the rule
 *   in docs/prove.md §9), `visibili` (always shown).
 *
 * A test instance or a trial run may override both (TAGM_TIRI_GIOCATORI, TAGM_TIRI_MASTER, read in config.ts); under
 * vitest the players' rolls default to automatic, so tests that do not exercise manual rolls never wait for a die.
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';

export type TiriGiocatori = 'manuale' | 'automatico';
export type TiriMaster = 'nascosti' | 'a_volte' | 'visibili';

export const TIRI_GIOCATORI: readonly TiriGiocatori[] = ['manuale', 'automatico'];
export const TIRI_MASTER: readonly TiriMaster[] = ['nascosti', 'a_volte', 'visibili'];

export interface ModalitaTiri {
  giocatori: TiriGiocatori;
  master: TiriMaster;
  /** Where each value comes from, for the startup log. */
  origine: { giocatori: 'override' | 'campagna' | 'predefinito'; master: 'override' | 'campagna' | 'predefinito' };
}

function scelta<T extends string>(v: unknown, ammessi: readonly T[]): T | null {
  return typeof v === 'string' && (ammessi as readonly string[]).includes(v) ? (v as T) : null;
}

/**
 * Whether the table's cards show the number to beat (DC, AC, threshold): `regole.mostra_cd: true` in campagna.yaml.
 * Default false, in both roll modes: the DC is never told to the players (Riccardo's rule, 15 November); only the Game
 * Master panel has it (prove/richieste.ts, cartaPerIlTavolo).
 */
export function mostraCdAlTavolo(c: Campagna): boolean {
  const regole = c.campagnaNarratore['regole'] as DatiYaml | undefined;
  return regole?.['mostra_cd'] === true;
}

/** The campaign's setting, with the instance's override first (null = no override). */
export function modalitaTiri(c: Campagna, override: { giocatori?: TiriGiocatori | null; master?: TiriMaster | null } = {}): ModalitaTiri {
  const regole = c.campagnaNarratore['regole'] as DatiYaml | undefined;
  const daCampagnaG = scelta(regole?.['tiri_giocatori'], TIRI_GIOCATORI);
  const daCampagnaM = scelta(regole?.['tiri_master'], TIRI_MASTER);
  return {
    giocatori: override.giocatori ?? daCampagnaG ?? 'manuale',
    master: override.master ?? daCampagnaM ?? 'nascosti',
    origine: {
      giocatori: override.giocatori ? 'override' : daCampagnaG ? 'campagna' : 'predefinito',
      master: override.master ? 'override' : daCampagnaM ? 'campagna' : 'predefinito',
    },
  };
}
