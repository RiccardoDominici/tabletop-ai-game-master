/**
 * Light and darkness (docs/prove.md §15; docs/regole.md §2, «Esplorazione», `buio`; audit P4-17, P4-18; Basic Fantasy
 * p. 43): a scene says how lit it is (`luce: piena | fioca | buio`, `piena` when it says nothing, so every existing scene
 * is lit as before), the Game Master can change it from the panel (the cellar under a lit hall), and the lights the PCs
 * carry (R2's catalog `luce`, burning on the clock) light the dark around the party. In the dark, with no light lit,
 * whoever has no darkvision sees nothing and carries the set's condition (Basic Fantasy: blinded, −4 to attack and +4 to
 * be hit, R4's numbers); darkvision is a race or sheet trait with its range (`{scurovisione: 18}`), and every monster of
 * the bestiary has the bestiary's default (p. 43: «almost all monsters», 60' unless said) unless its entry says less.
 *
 * Positions are not tracked: a light lit by any PC at the table lights the party's fight. Pure: the state in, who sees
 * and the narrator's words out.
 */
import { testo } from '../lingua';
import type { Tratto } from '../regole/tratti';

export type LivelloLuce = 'piena' | 'fioca' | 'buio';
export const LIVELLI_LUCE: readonly LivelloLuce[] = ['piena', 'fioca', 'buio'];

/** A scene's `luce:` (absent or unknown: `piena`, as before the rule). */
export function livelloDellaScena(v: unknown): LivelloLuce {
  return typeof v === 'string' && (LIVELLI_LUCE as readonly string[]).includes(v) ? (v as LivelloLuce) : 'piena';
}

/** The darkvision range of a character: its traits' (race, class, sheet), else the bestiary's default for a monster. */
export function portataScurovisione(tratti: readonly Tratto[], diMostro: boolean, predefinita: number | null): number {
  const t = tratti.filter((x): x is Extract<Tratto, { tipo: 'scurovisione' }> => x.tipo === 'scurovisione');
  if (t.length) return Math.max(...t.map((x) => x.portata));
  return diMostro ? (predefinita ?? 0) : 0;
}

/** Who sees in a scene now, and by what. */
export interface StatoLuce {
  livello: LivelloLuce;
  /** The lights lit among the PCs at the table, with their bright and dim radius. */
  fonti: Array<{ chi: string; oggetto: string; raggio: number; fioca: number }>;
  /** In the dark with no light: who sees by darkvision, and how far. */
  scurovisione: Array<{ id: string; portata: number }>;
  /** In the dark with no light and no darkvision: who sees nothing. */
  ciechi: string[];
}

export function statoLuce(o: { livello: LivelloLuce; chi: readonly string[]; luci: ReadonlyArray<{ chi: string; oggetto: string }>; raggio: (oggetto: string) => { raggio: number; fioca: number } | null; portata: (id: string) => number }): StatoLuce {
  const fonti = o.luci.filter((l) => o.chi.includes(l.chi)).flatMap((l) => {
    const r = o.raggio(l.oggetto);
    return r ? [{ chi: l.chi, oggetto: l.oggetto, ...r }] : [];
  });
  if (o.livello !== 'buio' || fonti.length) return { livello: o.livello, fonti, scurovisione: [], ciechi: [] };
  const scurovisione = o.chi.flatMap((id) => (o.portata(id) > 0 ? [{ id, portata: o.portata(id) }] : []));
  return { livello: o.livello, fonti, scurovisione, ciechi: o.chi.filter((id) => !scurovisione.some((s) => s.id === id)) };
}

/** Whether `id` sees: not in the dark, a light lit by the party, or its darkvision. */
export function vede(s: StatoLuce, id: string, portata: number): boolean {
  return s.livello !== 'buio' || s.fonti.length > 0 || portata > 0;
}

/** A key that changes when what the party sees changes (a light lit or out, the scene darker): the narrator hears it then. */
export function chiaveLuce(scena: string, s: StatoLuce): string {
  return `${scena}|${s.livello}|${s.fonti.map((f) => `${f.chi}:${f.oggetto}`).sort().join(',')}|${s.ciechi.join(',')}`;
}

/**
 * The narrator's line for the party's sight in the dark: the light that shows the way and how far, or who sees by
 * darkvision and who sees nothing. Null when the scene is not dark (nothing to say: the scene's description tells it).
 */
export function descriviLuce(s: StatoLuce, o: { nome: (id: string) => string; nomeOggetto: (id: string) => string; unita: string }): string | null {
  if (s.livello !== 'buio') return null;
  const elenco = (ids: readonly string[]): string => ids.map(o.nome).join(', ');
  if (s.fonti.length) {
    const f = [...s.fonti].sort((a, b) => b.raggio - a.raggio)[0]!;
    return testo('prove.luce.illuminato', { nome: o.nome(f.chi), oggetto: o.nomeOggetto(f.oggetto).toLowerCase(), raggio: f.raggio, fino: f.raggio + f.fioca, unita: o.unita });
  }
  const parti = [testo('prove.luce.buio')];
  for (const x of s.scurovisione) parti.push(testo('prove.luce.scurovisione', { nome: o.nome(x.id), portata: x.portata, unita: o.unita }));
  if (s.ciechi.length) parti.push(testo('prove.luce.ciechi', { nomi: elenco(s.ciechi) }));
  return parti.join(' ');
}
