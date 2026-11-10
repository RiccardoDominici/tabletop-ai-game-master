/**
 * Parole chiave → abilità o mosse candidate (docs/prove.md, «Arbitro a regole»): UNA tabella per set,
 * usata sia dall'arbitro a regole (prove/classificatore-regole.ts, il default in locale) sia dal modo
 * minimo con un modello locale (prove/arbitro-minimo.ts), che fa scegliere al modello fra le candidate.
 *
 * - SRD 5.2: `PAROLE_SRD`, radici italiane come regex sul testo normalizzato, dalla più specifica;
 * - set del manuale: `parole_chiave` di regole.yaml, le `parole` dei passi con `per:`, il `quando` delle mosse.
 */
import { normalizza } from '../azioni/regole';
import type { Abilita } from '../campagna/regole-srd';
import { radici } from '../narrazione/privato';
import type { RegoleCampagna } from '../regole/tipi';

/** Tabella SRD 5.2: parole (radici, regex sul testo normalizzato) → abilità. Le più specifiche prima. */
export const PAROLE_SRD: Array<{ abilita: Abilita; re: RegExp }> = [
  { abilita: 'storia', re: /\b(ricordo|cerco di ricordar|mi ricordo|mi viene in mente|leggend|si racconta|stemma|casata|cronac)/ },
  { abilita: 'intuizione', re: /\b(capire se ment|se dice il vero|se mente|guardami in faccia|negli occhi|leggo (il|nel) (viso|volto|sguardo)|sincer)/ },
  { abilita: 'persuasione', re: /\b(convinc|persuad|prometto|supplic|tratt(o|iamo) con|contratt|implor|ti prego|la prego|(gli|le|ti) chiedo di)/ },
  { abilita: 'inganno', re: /\b(mento|mentire|ingann|fingo|fingendo|faccio finta|bluff|raggir|travest)/ },
  { abilita: 'intimidire', re: /\b(minacci|intimid|spavent|ringhio)/ },
  { abilita: 'intrattenere', re: /\b(canto|cantare|suono il|recito|ballo|danzo|esibisc)/ },
  { abilita: 'furtivita', re: /\b(di nascosto|senza farmi (vedere|sentire|notare)|mi nascondo|nascondermi|sgattaiol|furtiv|di soppiatto|acquatt|in punta di piedi)/ },
  { abilita: 'rapidita_di_mano', re: /\b(scassin|serratur|lucchett|grimaldell|borsegg|sfilo|rubo|frugo nella (giacca|tasca|borsa))/ },
  { abilita: 'atletica', re: /\b(arrampic|scalo|salto|nuot|guad|sollev|spingo|sfond|trascin|inseguo|mi aggrappo|braccio di ferro|tengo fermo|trattengo|blocco|afferr|(la|lo) prendo per il braccio|mi metto (in mezzo|tra))/ },
  { abilita: 'acrobazia', re: /\b(in equilibrio|capriol|schiv|rotolo|mi butto)/ },
  { abilita: 'medicina', re: /\b(curo|curare|fascio|medic|tampono|polso|bende)/ },
  { abilita: 'sopravvivenza', re: /\b(seguo le tracce|tracce|orient|caccio|accendo un fuoco)/ },
  { abilita: 'religione', re: /\b(prego|preghier|benedico|consacro|celebro il rito|faccio il segno)/ },
  { abilita: 'arcano', re: /\b(magia|magic|runa|incantesim|arcan)/ },
  { abilita: 'natura', re: /\b(erbe|funghi|piante|bacche|semi)/ },
  { abilita: 'addestrare_animali', re: /\b(calmo il|accarezz|ammans|cavalc)/ },
  { abilita: 'indagare', re: /\b(cerco|frugo|perquis|esamin|ispezion|indag|rovist)/ },
  { abilita: 'percezione', re: /\b(ascolto|origli|tengo d'occhio|scruto|impronte|cerco di (vedere|sentire|scorgere)|guardo (chi|se|come))/ },
];

/** Abilità SRD candidate (al più `max`, nell'ordine della tabella). */
export function candidatiSrd(testo: string, max = 3): Abilita[] {
  const t = normalizza(testo);
  const out: Abilita[] = [];
  for (const { abilita, re } of PAROLE_SRD) if (re.test(t) && !out.includes(abilita)) out.push(abilita);
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
