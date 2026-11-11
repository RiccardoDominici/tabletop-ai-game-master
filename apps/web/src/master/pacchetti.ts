/**
 * Campagne a più sessioni nel pannello (docs/strati.md, D2): cosa dire del pacchetto in corso, se
 * «Prossima sessione» si può premere e perché no, e come mostrare un telefono ricordato.
 * Logica pura, testata in pacchetti.test.ts.
 */
import type { PacchettiMaster } from '@tabletop-ai-gm/shared';
import { t } from '../lingua';

/** «Sessione 02 di 3 · Il guado». */
export function rigaPacchetto(p: PacchettiMaster): string {
  const ultimo = p.elenco.at(-1)?.numero ?? p.corrente.numero;
  return t('master.pacchetti.riga', { etichetta: p.corrente.etichetta, ultimo, titolo: p.corrente.titolo });
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
  if (!dopo) return { abilitato: false, testo: t('master.cmd.prossima_sessione'), spiegazione: t('master.pacchetti.ultima') };
  const nome = dopo.titolo
    ? t('master.pacchetti.sessione_titolo', { etichetta: dopo.etichetta, titolo: dopo.titolo })
    : t('master.pacchetti.sessione', { etichetta: dopo.etichetta });
  if (!dopo.pronta)
    return {
      abilitato: false,
      testo: t('master.pacchetti.prossima', { etichetta: dopo.etichetta }),
      spiegazione: t('master.pacchetti.non_si_carica', { nome, motivo: dopo.motivo ?? t('master.pacchetti.motivo_ignoto') }),
    };
  return { abilitato: true, testo: t('master.pacchetti.prossima', { etichetta: nome }), spiegazione: t('master.pacchetti.spiega') };
}

/** Il token di un telefono è lungo e anonimo: bastano le prime lettere per riconoscerlo. */
export function abbreviaDispositivo(d: string): string {
  return d.length > 10 ? `${d.slice(0, 8)}…` : d;
}
