/**
 * Parole degli avvisi ai giocatori (docs/azioni-concorrenti.md, «Parole degli avvisi»):
 * niente «Conflitto!»; si dice cosa è successo e cosa si può fare. Mai il contenuto di
 * un'azione privata di un altro: «qualcun altro ci è arrivato prima».
 */

/** Testo citato, accorciato per stare in un avviso sul telefono. */
export function cita(testo: string, max = 70): string {
  const t = testo.replace(/\s+/g, ' ').trim();
  return `«${t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t}»`;
}

const SCELTA = 'Confermi, cambi o ritiri?';

export function avvisoDipendenza(o: {
  nomeRadice: string;
  testoRadice: string;
  evento: 'ritirata' | 'cambiata' | 'superata' | 'sospesa';
  testoNuovoRadice?: string;
  testoMio: string;
  /** Nome del PG intermedio quando la mia azione dipende dalla radice lungo una catena. */
  tramite?: string;
}): string {
  const fatto =
    o.evento === 'ritirata'
      ? `${o.nomeRadice} ha ritirato ${cita(o.testoRadice)}.`
      : o.evento === 'cambiata'
        ? `${o.nomeRadice} ha cambiato ${cita(o.testoRadice, 40)} in ${cita(o.testoNuovoRadice ?? '', 40)}.`
        : `L'azione di ${o.nomeRadice} ${cita(o.testoRadice)} resta fuori da questo turno.`;
  const legame = o.tramite
    ? `La tua ${cita(o.testoMio, 50)} seguiva ${o.tramite}, che dipendeva da quella.`
    : `La tua ${cita(o.testoMio, 50)} dipendeva da quella.`;
  return `${fatto} ${legame} ${SCELTA}`;
}

/** Al secondo di un conflitto esclusivo, finché la finestra è aperta. */
export function avvisoConflitto(o: { nomeVincitore: string | null; testoVincitore: string | null }): string {
  if (!o.nomeVincitore || !o.testoVincitore) return 'Qualcun altro ci è arrivato prima. Vuoi cambiare azione?';
  return `${o.nomeVincitore} ha già scritto ${cita(o.testoVincitore)}. Vuoi cambiare azione?`;
}

/** Azione scritta prima dell'ultima narrazione e diventata dubbia. */
export function avvisoVecchia(motivo: string, testoMio: string): string {
  const m = motivo.trim().replace(/[.!?…]*$/, '.');
  return `Nel frattempo: ${m.charAt(0).toLowerCase()}${m.slice(1)} Confermi ${cita(testoMio, 50)}?`;
}

export function motivoSuperata(motivo: string): string {
  const m = motivo.trim().replace(/[.!?…]*$/, '.');
  return `${m} Puoi riscrivere la tua azione.`;
}

export const MOTIVO_SOSPESA = 'Il tempo per scegliere è finito: la tua azione resta fuori da questo turno. Puoi riscriverla.';
export const MOTIVO_CONFLITTO_PERSO_PRIVATO = 'Qualcun altro ci è arrivato prima.';
