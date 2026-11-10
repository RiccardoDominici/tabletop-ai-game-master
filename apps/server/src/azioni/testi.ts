/**
 * Parole degli avvisi ai giocatori (docs/azioni-concorrenti.md, «Parole degli avvisi»):
 * niente «Conflitto!»; si dice cosa è successo e cosa si può fare. Mai il contenuto di
 * un'azione privata di un altro: «qualcun altro ci è arrivato prima».
 *
 * Le frasi stanno nel pacchetto della lingua (lingue/<codice>/testi*.yaml, sezione `azioni`) e si
 * compongono quando servono: la lingua dei contenuti si imposta all'avvio (docs/lingue.md).
 */
import { testo } from '../lingua';

/** Testo citato, accorciato per stare in un avviso sul telefono (virgolette della lingua attiva). */
export function cita(frase: string, max = 70): string {
  const t = frase.replace(/\s+/g, ' ').trim();
  return testo('azioni.citazione', { testo: t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t });
}

/** Un motivo (dell'arbitro, nella lingua dei contenuti) chiuso da un punto solo. */
function conPunto(motivo: string): string {
  return motivo.trim().replace(/[.!?…]*$/, '.');
}

export function avvisoDipendenza(o: {
  nomeRadice: string;
  testoRadice: string;
  evento: 'ritirata' | 'cambiata' | 'superata' | 'sospesa';
  testoNuovoRadice?: string;
  testoMio: string;
  /** Nome del PG intermedio quando la mia azione dipende dalla radice lungo una catena. */
  tramite?: string;
}): string {
  // Tre frasi intere (fatto, legame, scelta): ogni lingua ordina le parole dentro la sua frase.
  const fatto =
    o.evento === 'ritirata'
      ? testo('azioni.dipendenza.ritirata', { nome: o.nomeRadice, azione: cita(o.testoRadice) })
      : o.evento === 'cambiata'
        ? testo('azioni.dipendenza.cambiata', { nome: o.nomeRadice, azione: cita(o.testoRadice, 40), nuova: cita(o.testoNuovoRadice ?? '', 40) })
        : testo('azioni.dipendenza.fuori_turno', { nome: o.nomeRadice, azione: cita(o.testoRadice) });
  const legame = o.tramite
    ? testo('azioni.dipendenza.legame_tramite', { mia: cita(o.testoMio, 50), tramite: o.tramite })
    : testo('azioni.dipendenza.legame', { mia: cita(o.testoMio, 50) });
  return `${fatto} ${legame} ${testo('azioni.dipendenza.scelta')}`;
}

/** Al secondo di un conflitto esclusivo, finché la finestra è aperta. */
export function avvisoConflitto(o: { nomeVincitore: string | null; testoVincitore: string | null }): string {
  if (!o.nomeVincitore || !o.testoVincitore) return testo('azioni.conflitto.anonimo');
  return testo('azioni.conflitto.vincitore', { nome: o.nomeVincitore, azione: cita(o.testoVincitore) });
}

/** Azione scritta prima dell'ultima narrazione e diventata dubbia. */
export function avvisoVecchia(motivo: string, testoMio: string): string {
  const m = conPunto(motivo);
  // Il motivo continua la frase dopo «Nel frattempo:»: iniziale minuscola.
  return testo('azioni.vecchia', { motivo: `${m.charAt(0).toLowerCase()}${m.slice(1)}`, mia: cita(testoMio, 50) });
}

export function motivoSuperata(motivo: string): string {
  return testo('azioni.superata', { motivo: conPunto(motivo) });
}

/** Motivo di un'azione «da confermare» rimasta fuori allo scadere della finestra concitata. */
export function motivoSospesa(): string {
  return testo('azioni.sospesa');
}
