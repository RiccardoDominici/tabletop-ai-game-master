/**
 * Tiri dei set non SRD (docs/regole.md, «Risoluzione»), puri sopra una FonteDadi:
 * - d20_cd: d20 + modificatore contro la CD della difficoltà (vantaggio: due d20, o un bonus fisso);
 * - 2d6_fasce: 2d6 + statistica (+ difficoltà) e la fascia del manuale: 10+ pieno, 7–9 con un costo…
 *   (vantaggio: un d6 in più e si tengono i due migliori, o un bonus fisso);
 * - sotto_soglia: d20 o d100 sotto la soglia della scheda, divisa per la difficoltà (difficile = metà);
 *   gradi di successo, critico e disastro se il set li ha (vantaggio: due dadi e il più basso, o il
 *   dado delle decine in più del d100).
 */
import type { Vantaggio } from '@cantastorie/shared';
import { conSegno } from '../campagna/regole-srd';
import type { FonteDadi } from '../prove/dadi';
import type { Difficolta, Fascia, SistemaRegole } from './tipi';

export interface EsitoTiroGenerico {
  dadi: number[];
  facce: number;
  dado: number;
  modificatore: number;
  totale: number;
  contro: { tipo: 'CD' | 'fasce' | 'soglia'; valore: number; descrizione: string | null };
  riuscita: boolean;
  grado: { id: 'successo' | 'parziale' | 'fallimento' | 'critico' | 'disastro'; nome: string } | null;
  vantaggio: Vantaggio | null;
  /** La regola applicata, in parole, per la carta e il narratore. */
  regola: string;
}

/** «10+», «7–9», «6-»: l'intervallo di una fascia (fasce ordinate dalla più alta). */
export function intervalloFascia(fasce: readonly Fascia[], i: number): string {
  const f = fasce[i]!;
  const sopra = i > 0 ? fasce[i - 1]!.min : null;
  if (f.min === null) return sopra !== null ? `${sopra - 1}-` : 'sempre';
  if (sopra === null) return `${f.min}+`;
  return sopra - 1 === f.min ? `${f.min}` : `${f.min}–${sopra - 1}`;
}

function d20Cd(s: SistemaRegole, dadi: FonteDadi, mod: number, diff: Difficolta, v: Vantaggio | null, etichetta: string): EsitoTiroGenerico {
  const cd = diff.valore ?? 15;
  let tiri = [dadi.tira(20)];
  let bonus = 0;
  if (v && s.vantaggio.tipo === 'due_dadi') tiri = [tiri[0]!, dadi.tira(20)];
  if (v && s.vantaggio.tipo === 'bonus') bonus = v === 'vantaggio' ? s.vantaggio.valore : -s.vantaggio.valore;
  const dado = tiri.length > 1 ? (v === 'vantaggio' ? Math.max(...tiri) : Math.min(...tiri)) : tiri[0]!;
  const totale = dado + mod + bonus;
  return {
    dadi: tiri,
    facce: 20,
    dado,
    modificatore: mod + bonus,
    totale,
    contro: { tipo: 'CD', valore: cd, descrizione: diff.nome },
    riuscita: totale >= cd,
    grado: null,
    vantaggio: v && s.vantaggio.tipo !== 'nessuno' ? v : null,
    regola: `${etichetta}: d20${conSegno(mod)} contro CD ${cd} (${diff.nome.toLowerCase()})`,
  };
}

function dueD6(s: SistemaRegole, dadi: FonteDadi, mod: number, diff: Difficolta, v: Vantaggio | null, etichetta: string): EsitoTiroGenerico {
  const n = s.risoluzione.numero;
  const extra = v && s.vantaggio.tipo === 'due_dadi' ? 1 : 0;
  const tiri = Array.from({ length: n + extra }, () => dadi.tira(6));
  // Con un dado in più si tengono gli n migliori (vantaggio) o peggiori (svantaggio).
  const tenuti = extra ? [...tiri].sort((a, b) => (v === 'vantaggio' ? b - a : a - b)).slice(0, n) : tiri;
  const bonusV = v && s.vantaggio.tipo === 'bonus' ? (v === 'vantaggio' ? s.vantaggio.valore : -s.vantaggio.valore) : 0;
  const somma = tenuti.reduce((x, y) => x + y, 0);
  const modTot = mod + (diff.modificatore ?? 0) + bonusV;
  const totale = somma + modTot;
  const fasce = s.risoluzione.fasce;
  const i = Math.max(0, fasce.findIndex((f) => f.min === null || totale >= f.min));
  const f = fasce[i] ?? { min: null, esito: 'fallimento' as const, nome: 'Fallimento', significato: null };
  const intervallo = intervalloFascia(fasce, i);
  return {
    dadi: tiri,
    facce: 6,
    dado: somma,
    modificatore: modTot,
    totale,
    contro: { tipo: 'fasce', valore: f.min ?? 0, descrizione: intervallo },
    riuscita: f.esito !== 'fallimento',
    grado: { id: f.esito, nome: f.nome },
    vantaggio: v && s.vantaggio.tipo !== 'nessuno' ? v : null,
    regola: `${n}d6${conSegno(mod)} (${etichetta})${diff.modificatore ? `, ${diff.nome.toLowerCase()} ${conSegno(diff.modificatore)}` : ''}: ${intervallo}, ${f.nome.toLowerCase()}`,
  };
}

/** Un d100 come decine + unità (00 + 0 = 100); `decine` sono i dadi delle decine tirati (0–9). */
function d100(unita: number, decina: number): number {
  const x = decina * 10 + unita;
  return x === 0 ? 100 : x;
}

function sottoSoglia(s: SistemaRegole, dadi: FonteDadi, soglia: number, diff: Difficolta, v: Vantaggio | null, etichetta: string): EsitoTiroGenerico {
  const facce = s.risoluzione.facce;
  const divisore = diff.divisore ?? 1;
  const serve = Math.floor(soglia / divisore);
  let tiri: number[];
  let dado: number;
  let vantaggio: Vantaggio | null = null;
  if (facce === 100) {
    const unita = dadi.tira(10) - 1;
    const decine = [dadi.tira(10) - 1];
    if (v && (s.vantaggio.tipo === 'dado_bonus' || s.vantaggio.tipo === 'due_dadi')) decine.push(dadi.tira(10) - 1);
    tiri = decine.map((d) => d100(unita, d));
    dado = tiri.length > 1 ? (v === 'vantaggio' ? Math.min(...tiri) : Math.max(...tiri)) : tiri[0]!;
    if (tiri.length > 1) vantaggio = v;
  } else {
    tiri = [dadi.tira(facce)];
    if (v && s.vantaggio.tipo === 'due_dadi') {
      tiri.push(dadi.tira(facce));
      vantaggio = v;
    }
    // Sotto soglia il più basso è il migliore.
    dado = tiri.length > 1 ? (v === 'vantaggio' ? Math.min(...tiri) : Math.max(...tiri)) : tiri[0]!;
  }
  const { critico, disastro, gradi } = s.risoluzione;
  let riuscita = dado <= serve;
  let grado: EsitoTiroGenerico['grado'];
  if (disastro !== null && dado >= disastro) {
    riuscita = false;
    grado = { id: 'disastro', nome: 'Disastro' };
  } else if (critico !== null && dado <= critico) {
    riuscita = true;
    grado = { id: 'critico', nome: 'Successo critico' };
  } else if (riuscita) {
    const g = gradi.find((x) => dado <= Math.floor(soglia / x.divisore));
    grado = { id: 'successo', nome: g?.nome ?? 'Successo' };
  } else grado = { id: 'fallimento', nome: 'Fallimento' };
  const unita = facce === 100 ? '%' : '';
  return {
    dadi: tiri,
    facce,
    dado,
    modificatore: 0,
    totale: dado,
    contro: { tipo: 'soglia', valore: serve, descrizione: divisore !== 1 ? `${diff.nome}: ${soglia}${unita} / ${divisore}` : null },
    riuscita,
    grado,
    vantaggio,
    regola: `${etichetta} ${soglia}${unita}: d${facce} ${divisore !== 1 ? `${diff.nome.toLowerCase()}, ` : ''}serve ${serve} o meno`,
  };
}

/**
 * Un tiro col set. `valore`: il modificatore (d20_cd, 2d6_fasce) o la soglia (sotto_soglia);
 * `etichetta`: che cosa si tira, col nome del manuale («Fascino», «Persuasione»).
 */
export function tiraCol(s: SistemaRegole, dadi: FonteDadi, valore: number, idDifficolta: string | null, v: Vantaggio | null, etichetta: string): EsitoTiroGenerico {
  const diff = s.difficolta.find((d) => d.id === idDifficolta) ?? s.difficolta.find((d) => d.id === s.difficoltaPredefinita) ?? s.difficolta[0]!;
  switch (s.risoluzione.tipo) {
    case 'd20_cd':
      return d20Cd(s, dadi, valore, diff, v, etichetta);
    case '2d6_fasce':
      return dueD6(s, dadi, valore, diff, v, etichetta);
    case 'sotto_soglia':
      return sottoSoglia(s, dadi, valore, diff, v, etichetta);
  }
}
