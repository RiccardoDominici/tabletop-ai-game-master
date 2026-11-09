/**
 * Le regole del set per il narratore e il selettore (docs/regole.md, «Narrazione»): una riga su come
 * si tira e, soprattutto, che cosa vuol dire ogni esito nel racconto. Senza, un «7–9» del 2d6 verrebbe
 * raccontato come un successo pieno. Entra nella sezione «Esiti dei tiri» del messaggio del turno,
 * solo quando ci sono tiri (parte variabile, fuori cache: poche righe).
 */
import type { RegoleCampagna } from './tipi';
import { intervalloFascia } from './risoluzione';

/** Che cosa vuol dire un esito quando il manuale non lo scrive. */
export const SIGNIFICATO: Record<'successo' | 'parziale' | 'fallimento' | 'critico' | 'disastro', string> = {
  successo: 'l’azione riesce come voleva il giocatore.',
  parziale: 'riesce, ma devi dare un costo, una scelta difficile o una complicazione: raccontali insieme alla riuscita, mai come un successo pieno.',
  fallimento: 'non riesce, e la situazione peggiora: fai succedere qualcosa di difficile, mai «non succede niente».',
  critico: 'riesce oltre le attese.',
  disastro: 'va storto nel modo peggiore.',
};

function comeSiTira(r: RegoleCampagna): string {
  const s = r.sistema;
  switch (s.risoluzione.tipo) {
    case 'd20_cd':
      return 'Si tira un d20 più il modificatore contro la CD.';
    case '2d6_fasce':
      return `Si tirano ${s.risoluzione.numero}d6 più la statistica, e conta la fascia del totale.`;
    case 'sotto_soglia':
      return `Si tira un d${s.risoluzione.facce}: riesce se fa quanto la soglia o meno.`;
  }
}

/** Il blocco per il narratore; null con l'SRD 5.2 (le sue regole le conosce già il prompt). */
export function regolePerNarratore(r: RegoleCampagna): string | null {
  const s = r.sistema;
  if (s.srd) return null;
  const righe = [`Regole del manuale «${s.nome}»: ${s.perNarratore ?? comeSiTira(r)} Che cosa vuol dire ogni esito:`];
  if (s.risoluzione.tipo === '2d6_fasce') {
    s.risoluzione.fasce.forEach((f, i) => righe.push(`- ${intervalloFascia(s.risoluzione.fasce, i)} «${f.nome}»: ${f.significato ?? SIGNIFICATO[f.esito]}`));
  } else if (s.risoluzione.tipo === 'sotto_soglia') {
    for (const g of s.risoluzione.gradi) righe.push(`- «${g.nome}»: ${g.significato ?? 'riesce particolarmente bene.'}`);
    righe.push(`- «Successo»: ${SIGNIFICATO.successo}`, `- «Fallimento»: ${SIGNIFICATO.fallimento}`);
    if (s.risoluzione.critico !== null) righe.push(`- «Successo critico»: ${SIGNIFICATO.critico}`);
    if (s.risoluzione.disastro !== null) righe.push(`- «Disastro»: ${SIGNIFICATO.disastro}`);
  } else {
    righe.push(`- riuscita: ${SIGNIFICATO.successo}`, `- fallita: ${SIGNIFICATO.fallimento}`);
  }
  if (s.mosse.length) righe.push('- Con una mossa, il fatto porta anche l’esito scritto nel manuale: raccontalo così.');
  if (s.attacchi.parzialeScambio) righe.push('- In un attacco con successo parziale anche l’avversario colpisce: è già nei fatti.');
  return righe.join('\n');
}
