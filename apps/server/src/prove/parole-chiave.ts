/**
 * Parole chiave → abilità o mosse candidate (docs/prove.md, «Arbitro a regole»): UNA tabella per set,
 * usata sia dall'arbitro a regole (prove/classificatore-regole.ts, il default in locale) sia dal modo
 * minimo con un modello locale (prove/arbitro-minimo.ts), che fa scegliere al modello fra le candidate.
 *
 * - SRD 5.2: `paroleSrd()`, radici come regex sul testo normalizzato, dalla più specifica, nella lingua
 *   dei contenuti (lingue/<codice>/prove.yaml, `parole.abilita`: italiano e inglese);
 * - set del manuale: `parole_chiave` di regole.yaml, le `parole` dei passi con `per:`, il `quando` delle mosse,
 *   a parole intere (prove/parole-testo.ts; prima erano radici di cinque lettere: «spalla» trovava «spallata»).
 */
import { normalizza } from '../azioni/regole';
import type { Abilita } from '../campagna/regole-srd';
import { haVoce, inComune, paroleDi } from './parole-testo';
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

/**
 * Set del manuale: punteggio di ogni id (abilità, mossa, caratteristica), dal più alto. Una voce di
 * `parole_chiave` vale 2, una delle `parole` di un passo con `per:` vale 1, se è nel testo a parole intere
 * (prove/parole-testo.ts: desinenze tolte, parole generiche escluse): la tabella è scritta per quell'id, un
 * passo del manuale spesso parla di più abilità (le abilità del ladro, legate a una sola). Una mossa vale 1
 * se il suo nome e il suo `quando` hanno almeno due parole di contenuto in comune col testo.
 */
export function punteggiSet(testo: string, r: RegoleCampagna): Array<[string, number]> {
  const s = r.sistema;
  const parole = paroleDi(testo);
  const punti = new Map<string, number>();
  const conta = (id: string, voci: readonly string[], peso: number): void => {
    const n = voci.filter((v) => haVoce(parole, v)).length;
    if (n) punti.set(id, (punti.get(id) ?? 0) + n * peso);
  };
  for (const [id, voci] of Object.entries(s.paroleChiave)) conta(id, voci, 2);
  for (const e of r.estratti) if (e.per) conta(e.per, e.parole, 1);
  for (const m of s.mosse) if (inComune(testo, `${m.nome} ${m.quando}`) >= 2) punti.set(m.id, (punti.get(m.id) ?? 0) + 1);
  return [...punti].sort((x, y) => y[1] - x[1]);
}

/** Set del manuale: id candidati, dal punteggio più alto (al più `max`). */
export function candidatiSet(testo: string, r: RegoleCampagna, max = 3): string[] {
  return punteggiSet(testo, r).slice(0, max).map(([id]) => id);
}

/** Candidate per il set della campagna (null = SRD 5.2). */
export function candidati(testo: string, regole: RegoleCampagna | null, max = 3): string[] {
  return regole && !regole.sistema.srd ? candidatiSet(testo, regole, max) : candidatiSrd(testo, max);
}
