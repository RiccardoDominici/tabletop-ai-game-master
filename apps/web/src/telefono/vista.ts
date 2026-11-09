/**
 * Derivazioni pure per il telefono: da `StatoTavolo` + PG scelto + la mia azione a ciò che si
 * mostra. Nessun React qui: banner, permessi ed etichette sono testati in vista.test.ts.
 *
 * Regole (docs/azioni-concorrenti.md):
 * - si può scrivere SEMPRE a scena in corso, anche mentre il narratore parla (o prepara): l'azione
 *   entra allora nella finestra successiva;
 * - inviare vuol dire «ho finito» (non c'è più «Pronto»): quando hanno inviato tutti gli invitati il
 *   turno parte da solo; l'invito conta per le parole del banner;
 * - il conto alla rovescia c'è solo al ritmo concitato (lo chiede la narrazione);
 * - «in coda» e «da decidere» restano distinti: solo il secondo chiede una scelta.
 */
import type {
  AzioneAlTavolo,
  AzionePrivata,
  FinestraPubblica,
  StatoAzione,
  StatoTavolo,
} from '@cantastorie/shared';
import { elencoNomi } from '../lib/formato';

/** Il narratore può invitare `tutti` (il server normalmente espande l'elenco, ma per sicurezza). */
const TUTTI = 'tutti';

/** Stati in cui l'azione è ancora mia da modificare (un nuovo invio la sostituisce). */
const STATI_VIVI: ReadonlySet<StatoAzione> = new Set<StatoAzione>(['in_coda', 'da_confermare']);
/** Stati in cui il testo torna nella casella, pronto da riscrivere. */
const STATI_DA_RISCRIVERE: ReadonlySet<StatoAzione> = new Set<StatoAzione>(['superata', 'sospesa']);
/** Stati in cui il `motivo` serve al giocatore (altrove può essere un residuo). */
const STATI_CON_MOTIVO: ReadonlySet<StatoAzione> = new Set<StatoAzione>(['da_confermare', 'superata', 'sospesa']);

export function sonoInvitato(finestra: FinestraPubblica, idPg: string | null): boolean {
  if (!idPg) return false;
  return finestra.invitati.includes(idPg) || finestra.invitati.includes(TUTTI);
}

/** Finestra aperta davvero (fase e flag concordano). */
export function finestraAperta(stato: StatoTavolo): boolean {
  return stato.fase === 'finestra' && stato.finestra.aperta;
}

/** La scena è in corso: prima di «Inizia sessione» o a scena fermata il server rifiuta gli invii. */
export function scenaInCorso(stato: StatoTavolo): boolean {
  return stato.fase !== 'attesa' && stato.fase !== 'fermata';
}

/** Posso scrivere e inviare? Sempre, a scena in corso, una volta scelto il PG. */
export function possoScrivere(stato: StatoTavolo, idPg: string | null): boolean {
  return idPg !== null && scenaInCorso(stato);
}

/** L'azione è ancora modificabile (in coda o da decidere). */
export function azioneViva(mia: AzionePrivata | null): boolean {
  return mia !== null && STATI_VIVI.has(mia.stato);
}

/** Superata o sospesa: il testo torna nella casella e si può inviare di nuovo. */
export function daRiscrivere(mia: AzionePrivata | null): boolean {
  return mia !== null && STATI_DA_RISCRIVERE.has(mia.stato);
}

/**
 * La mia azione aspetta la finestra SUCCESSIVA (scritta mentre il narratore parlava, o mentre la
 * finestra si stava chiudendo). A finestra chiusa `finestra.turno` è l'ultimo turno: un'azione
 * con turno più alto entra nel prossimo.
 */
export function perProssimoTurno(stato: StatoTavolo, mia: AzionePrivata | null): boolean {
  return mia !== null && azioneViva(mia) && mia.turno > stato.finestra.turno;
}

/** Il `motivo` da mostrare, o null (solo dove spiega davvero lo stato attuale). */
export function motivoDaMostrare(mia: AzionePrivata | null): string | null {
  if (!mia || !mia.motivo || !STATI_CON_MOTIVO.has(mia.stato)) return null;
  return mia.motivo;
}

/** Ho già inviato in questa finestra? Fa fede il riepilogo pubblico (inviare = ho finito). */
export function hoInviato(stato: StatoTavolo, idPg: string | null): boolean {
  if (!idPg || !finestraAperta(stato)) return false;
  return stato.finestra.azioni.some((a) => a.id_pg === idPg && a.scritta);
}

/**
 * Il Motore sta lavorando (LLM, voce, audio della narrazione): «sta preparando» finché del turno non
 * è arrivato niente, poi «sta raccontando». I giocatori possono scrivere: l'azione aspetta il turno dopo.
 */
export function narratoreAlLavoro(stato: StatoTavolo): 'prepara' | 'racconta' | null {
  const lavora = stato.fase === 'apertura' || stato.fase === 'narrazione' || (stato.fase === 'finestra' && !stato.finestra.aperta);
  if (!lavora) return null;
  if (stato.fase === 'finestra') return 'prepara';
  const detto = stato.trascrizione.some((v) => v.turno === stato.turno && (v.tipo === 'narrazione' || v.tipo === 'battuta'));
  return detto ? 'racconta' : 'prepara';
}

/** L'azione privata conta per la finestra corrente (non è un residuo di un turno passato). */
export function azioneDellaFinestra(stato: StatoTavolo, mia: AzionePrivata | null): AzionePrivata | null {
  if (!mia) return null;
  return mia.turno === stato.finestra.turno ? mia : null;
}

/** Etichetta del pulsante d'invio: sostituire, rimandare o inviare. */
export function etichettaInvio(mia: AzionePrivata | null, bozza: string): 'Aggiorna' | 'Invia di nuovo' | 'Invia' {
  if (!mia) return 'Invia';
  if (azioneViva(mia)) return 'Aggiorna';
  if (daRiscrivere(mia) && bozza.trim() === mia.testo.trim()) return 'Invia di nuovo';
  return 'Invia';
}

/**
 * Chiave della richiesta di scelta corrente: cambia se arriva una richiesta nuova, così un
 * avviso rimandato con «Cambio» si ripresenta solo per un fatto nuovo.
 */
export function chiaveRichiesta(mia: AzionePrivata | null): string | null {
  if (!mia || mia.stato !== 'da_confermare' || !mia.richiesta) return null;
  return `${mia.id}|${mia.richiesta.tipo}|${mia.richiesta.testo}`;
}

// ------------------------------------------------------------------ «Al tavolo»

/** Le azioni pubbliche in attesa degli ALTRI (la mia si vede già sotto, nella casella). */
export function altriAlTavolo(stato: StatoTavolo, idPg: string | null): AzioneAlTavolo[] {
  return (stato.al_tavolo ?? []).filter((a) => a.id_pg !== idPg);
}

/** «con Ginestra», «con Ginestra e Corrado», o null se l'azione non si appoggia ad altre. */
export function conChi(dipendeDa: readonly string[]): string | null {
  const nomi = dipendeDa.map((n) => n.split(' ')[0] ?? n).filter((n) => n.length > 0);
  return nomi.length === 0 ? null : `con ${elencoNomi([...new Set(nomi)])}`;
}

// ------------------------------------------------------------------ banner

export type TipoBanner = 'attesa' | 'narratore' | 'tocca_a_te' | 'inviata' | 'non_chiamato' | 'fermata' | 'pausa';

export interface Banner {
  tipo: TipoBanner;
  titolo: string;
  dettaglio: string | null;
  /** Epoch ms (orologio del server) di chiusura automatica: solo al ritmo concitato. */
  scadenzaMs: number | null;
}

export function bannerTelefono(stato: StatoTavolo, idPg: string | null): Banner {
  switch (stato.fase) {
    case 'attesa':
      return {
        tipo: 'attesa',
        titolo: 'In attesa che inizi la sessione',
        dettaglio: 'Il master deve premere «Inizia sessione» sullo schermo.',
        scadenzaMs: null,
      };
    case 'apertura':
    case 'narrazione':
      return {
        tipo: 'narratore',
        titolo: narratoreAlLavoro(stato) === 'racconta' ? 'Il narratore sta raccontando…' : 'Il narratore sta preparando…',
        dettaglio: 'Puoi già scrivere: la tua azione entra nel prossimo turno.',
        scadenzaMs: null,
      };
    case 'fermata':
      return {
        tipo: 'fermata',
        titolo: 'Scena fermata',
        dettaglio: 'Il master ha fermato la scena.',
        scadenzaMs: null,
      };
    case 'pausa':
      // La pausa la mette e la toglie solo il master: si può scrivere, l'azione entra alla ripresa.
      return {
        tipo: 'pausa',
        titolo: 'Tavolo in pausa',
        dettaglio: 'Il master ha fermato il gioco per un momento. Puoi scrivere: la tua azione entra alla ripresa.',
        scadenzaMs: null,
      };
    case 'finestra':
      if (!stato.finestra.aperta) {
        return {
          tipo: 'narratore',
          titolo: 'Il narratore sta preparando…',
          dettaglio: 'Puoi già scrivere: la tua azione entra nel prossimo turno.',
          scadenzaMs: null,
        };
      }
      if (sonoInvitato(stato.finestra, idPg) && hoInviato(stato, idPg)) {
        return {
          tipo: 'inviata',
          titolo: 'Azione inviata',
          dettaglio: 'Puoi ancora cambiarla o ritirarla finché il turno non parte.',
          scadenzaMs: stato.finestra.chiusura_prevista_ms,
        };
      }
      if (sonoInvitato(stato.finestra, idPg)) {
        const concitato = stato.ritmo === 'concitato' && stato.finestra.chiusura_prevista_ms !== null;
        return {
          tipo: 'tocca_a_te',
          titolo: 'Tocca a te: cosa fai?',
          // Al ritmo calmo nessuna fretta: si discute al tavolo. Al concitato c'è il conto alla rovescia.
          dettaglio: concitato ? 'Si va di corsa: allo zero il narratore risolve con quello che c’è.' : null,
          scadenzaMs: stato.finestra.chiusura_prevista_ms,
        };
      }
      return {
        tipo: 'non_chiamato',
        titolo: 'Stavolta non sei chiamato',
        dettaglio: 'Puoi scrivere lo stesso: la tua azione entra in questo turno.',
        scadenzaMs: stato.finestra.chiusura_prevista_ms,
      };
  }
}

/** Etichette italiane, neutre, dello stato dell'azione (chip). Mai «Conflitto!». */
export const ETICHETTA_STATO_AZIONE: Record<StatoAzione, string> = {
  in_coda: 'in coda',
  da_confermare: 'da decidere',
  chiusa: 'il narratore sta rispondendo',
  risolta: 'risolta',
  ritirata: 'ritirata',
  superata: 'non è andata',
  sospesa: 'rimasta fuori',
};
