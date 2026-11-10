/**
 * Parole chiave → abilità o mosse candidate (docs/prove.md, «Arbitro a regole»): UNA tabella per set,
 * usata sia dall'arbitro a regole (prove/classificatore-regole.ts, il default in locale) sia dal modo
 * minimo con un modello locale (prove/arbitro-minimo.ts), che fa scegliere al modello fra le candidate.
 *
 * - SRD 5.2: `paroleSrd()`, radici come regex sul testo normalizzato, dalla più specifica, nella lingua
 *   dei contenuti (lingue/<codice>/prove.yaml, `parole.abilita`: italiano e inglese);
 * - set del manuale: `parole_chiave` di regole.yaml, le `parole` dei passi con `per:`, il `quando` delle mosse.
 */
import { normalizza } from '../azioni/regole';
import type { Abilita } from '../campagna/regole-srd';
import { radici } from '../narrazione/privato';
import type { RegoleCampagna } from '../regole/tipi';
import { paroleProve } from './lingua';

/**
 * Tabella SRD 5.2 della lingua attiva: parole (radici, regex sul testo normalizzato) → abilità, le più
 * specifiche prima. Sta in lingue/<codice>/prove.yaml (`parole.abilita`), compilata una volta per pacchetto.
 */
export function paroleSrd(): ReadonlyArray<{ abilita: Abilita; re: RegExp }> {
  return paroleProve().abilita as ReadonlyArray<{ abilita: Abilita; re: RegExp }>;
}

/** Abilità SRD candidate (al più `max`, nell'ordine della tabella). */
export function candidatiSrd(testo: string, max = 3): Abilita[] {
  const t = normalizza(testo);
  const out: Abilita[] = [];
  for (const { abilita, re } of paroleSrd()) if (re.test(t) && !out.includes(abilita)) out.push(abilita);
  return out.slice(0, max);
}

/** Quante radici del testo stanno in `quando`. */
function somiglianza(testo: string, quando: string): number {
  const a = radici(testo);
  return [...radici(quando)].filter((r) => a.has(r)).length;
}

/** Set del manuale: id (abilità, mossa, caratteristica) candidati, dal punteggio più alto (al più `max`). */
export function candidatiSet(testo: string, r: RegoleCampagna, max = 3): string[] {
  const s = r.sistema;
  const a = radici(testo);
  const punti = new Map<string, number>();
  const conta = (id: string, parole: readonly string[]): void => {
    const n = parole.flatMap((p) => [...radici(p)]).filter((x) => a.has(x)).length;
    if (n) punti.set(id, (punti.get(id) ?? 0) + n);
  };
  for (const [id, parole] of Object.entries(s.paroleChiave)) conta(id, parole);
  for (const e of r.estratti) if (e.per) conta(e.per, e.parole);
  for (const m of s.mosse) if (somiglianza(testo, `${m.nome} ${m.quando}`) >= 2) punti.set(m.id, (punti.get(m.id) ?? 0) + 1);
  return [...punti].sort((x, y) => y[1] - x[1]).slice(0, max).map(([id]) => id);
}

/** Candidate per il set della campagna (null = SRD 5.2). */
export function candidati(testo: string, regole: RegoleCampagna | null, max = 3): string[] {
  return regole && !regole.sistema.srd ? candidatiSet(testo, regole, max) : candidatiSrd(testo, max);
}
