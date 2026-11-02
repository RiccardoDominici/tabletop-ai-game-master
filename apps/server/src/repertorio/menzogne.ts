/**
 * Menzogne già dette (modalità repertorio). Quando esce una battuta con `effetti.menzogna_detta`,
 * il Motore sa quale bugia è stata detta: è l'id di una `mente_su` della scheda del PNG. Da quel
 * momento la versione è pubblica (l'hanno sentita tutti) e il selettore deve tenerla ferma quando
 * improvvisa: se l'argomento torna, il PNG ripete la stessa versione; la verità esce solo con una
 * battuta di confessione. La verità (`verita`, `perche`, `cede_se`) non entra mai.
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';
import { segretiNelTesto, type ParolaSegreta, type StatoPubblico } from './segreti';

export interface MenzognaScheda {
  id: string;
  png: string;
  nome: string;
  argomento: string | null;
  versione: string | null;
}

/** Tutte le `mente_su` con id delle schede PNG, per id. */
export function menzogneDelleSchede(c: Campagna): Map<string, MenzognaScheda> {
  const out = new Map<string, MenzognaScheda>();
  for (const p of c.png) {
    for (const m of Array.isArray(p.dati['mente_su']) ? (p.dati['mente_su'] as DatiYaml[]) : []) {
      if (typeof m?.['id'] !== 'string') continue;
      out.set(m['id'], {
        id: m['id'],
        png: p.id,
        nome: p.nome,
        argomento: typeof m['argomento'] === 'string' ? m['argomento'] : null,
        versione: typeof m['versione'] === 'string' ? m['versione'] : null,
      });
    }
  }
  return out;
}

/**
 * Righe per il messaggio del turno: «Ottavia Ferlini [png_ottavia], su da dove viene la segale:
 * «…»». Una riga che porterebbe una parola ancora segreta perde l'argomento; se resta segreta, salta.
 */
export function righeMenzogneDette(dette: Iterable<string>, c: Campagna, parole: ParolaSegreta[], pubblico: StatoPubblico | null): string[] {
  const schede = menzogneDelleSchede(c);
  const righe: string[] = [];
  for (const id of dette) {
    const m = schede.get(id);
    if (!m?.versione) continue;
    const intera = `${m.nome} [${m.png}]${m.argomento ? `, su ${m.argomento}` : ''}: «${m.versione}»`;
    const breve = `${m.nome} [${m.png}]: «${m.versione}»`;
    const riga = [intera, breve].find((r) => segretiNelTesto(r, parole, pubblico).length === 0);
    if (riga) righe.push(riga);
  }
  return righe;
}
