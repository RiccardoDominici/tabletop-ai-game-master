/**
 * Le regole del set per il narratore e il selettore (docs/regole.md, «Narrazione»): una riga su come
 * si tira e, soprattutto, che cosa vuol dire ogni esito nel racconto. Senza, un «7–9» del 2d6 verrebbe
 * raccontato come un successo pieno. Entra nella sezione «Esiti dei tiri» del messaggio del turno,
 * solo quando ci sono tiri (parte variabile, fuori cache: poche righe). Le frasi sono nella lingua dei
 * contenuti (testi-prove.yaml, «regole.narratore.…» e «regole.significato.…»).
 */
import { testo } from '../lingua';
import type { RegoleCampagna } from './tipi';
import { intervalloFascia } from './risoluzione';

export type Significato = 'successo' | 'parziale' | 'fallimento' | 'critico' | 'disastro';

/** Che cosa vuol dire un esito quando il manuale non lo scrive. */
export function significato(esito: Significato): string {
  return testo(`regole.significato.${esito}`);
}

function comeSiTira(r: RegoleCampagna): string {
  const s = r.sistema;
  switch (s.risoluzione.tipo) {
    case 'd20_cd':
      return testo('regole.narratore.d20');
    case '2d6_fasce':
      return testo('regole.narratore.dued6', { n: s.risoluzione.numero });
    case 'sotto_soglia':
      return testo('regole.narratore.soglia', { facce: s.risoluzione.facce });
  }
}

/** Il blocco per il narratore; null con l'SRD 5.2 (le sue regole le conosce già il prompt). */
export function regolePerNarratore(r: RegoleCampagna): string | null {
  const s = r.sistema;
  if (s.srd) return null;
  const righe = [testo('regole.narratore.intro', { nome: s.nome, come: s.perNarratore ?? comeSiTira(r) })];
  const grado = (nome: string, sig: string): string => testo('regole.narratore.grado', { nome, significato: sig });
  if (s.risoluzione.tipo === '2d6_fasce') {
    s.risoluzione.fasce.forEach((f, i) => righe.push(testo('regole.narratore.fascia', { intervallo: intervalloFascia(s.risoluzione.fasce, i), nome: f.nome, significato: f.significato ?? significato(f.esito) })));
  } else if (s.risoluzione.tipo === 'sotto_soglia') {
    for (const g of s.risoluzione.gradi) righe.push(grado(g.nome, g.significato ?? testo('regole.significato.grado')));
    righe.push(grado(testo('regole.esito.successo'), significato('successo')), grado(testo('regole.esito.fallimento'), significato('fallimento')));
    if (s.risoluzione.critico !== null) righe.push(grado(testo('regole.esito.critico'), significato('critico')));
    if (s.risoluzione.disastro !== null) righe.push(grado(testo('regole.esito.disastro'), significato('disastro')));
  } else {
    righe.push(testo('regole.narratore.riuscita', { significato: significato('successo') }), testo('regole.narratore.fallita', { significato: significato('fallimento') }));
  }
  if (s.mosse.length) righe.push(testo('regole.narratore.mosse'));
  if (s.attacchi.parzialeScambio) righe.push(testo('regole.narratore.scambio'));
  return righe.join('\n');
}
