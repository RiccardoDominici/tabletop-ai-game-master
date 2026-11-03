/**
 * Campagne a più sessioni nel pannello (docs/strati.md, D2): cosa dire del pacchetto in corso, se
 * «Prossima sessione» si può premere e perché no, e come mostrare un telefono ricordato.
 * Logica pura, testata in pacchetti.test.ts.
 */
import type { PacchettiMaster } from '@cantastorie/shared';

/** «Sessione 02 di 3 · Il guado». */
export function rigaPacchetto(p: PacchettiMaster): string {
  const ultimo = p.elenco.at(-1)?.numero ?? p.corrente.numero;
  return `Sessione ${p.corrente.etichetta} di ${ultimo} · ${p.corrente.titolo}`;
}

export interface StatoProssima {
  abilitato: boolean;
  /** Testo del pulsante. */
  testo: string;
  /** Perché è spento, o cosa farà (tooltip e riga sotto il pulsante). */
  spiegazione: string;
}

/** Il pulsante «Prossima sessione»: acceso solo se il pacchetto dopo c'è e si carica. */
export function statoProssima(p: PacchettiMaster): StatoProssima {
  const dopo = p.prossima;
  if (!dopo) return { abilitato: false, testo: 'Prossima sessione', spiegazione: 'È l’ultima sessione preparata: la prossima si prepara tra le sessioni.' };
  const nome = `sessione ${dopo.etichetta}${dopo.titolo ? ` · ${dopo.titolo}` : ''}`;
  if (!dopo.pronta) return { abilitato: false, testo: `Prossima: ${dopo.etichetta}`, spiegazione: `La ${nome} non si carica: ${dopo.motivo ?? 'motivo sconosciuto'}` };
  return { abilitato: true, testo: `Prossima: ${nome}`, spiegazione: 'Chiude questa sessione (col registro) e riparte dal riassunto della prossima.' };
}

/** Il token di un telefono è lungo e anonimo: bastano le prime lettere per riconoscerlo. */
export function abbreviaDispositivo(d: string): string {
  return d.length > 10 ? `${d.slice(0, 8)}…` : d;
}
