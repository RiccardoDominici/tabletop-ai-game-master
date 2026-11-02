/**
 * Derivazioni pure per il telefono: da `StatoTavolo` + PG scelto a ciò che si mostra.
 * Nessun React qui: la logica del banner e dei permessi è testata in vista.test.ts.
 */
import type { AzionePrivata, FinestraPubblica, StatoTavolo, StatoAzione } from '@cantastorie/shared';

/** Il narratore può invitare `tutti` (il server normalmente espande l'elenco, ma per sicurezza). */
const TUTTI = 'tutti';

export function sonoInvitato(finestra: FinestraPubblica, idPg: string | null): boolean {
  if (!idPg) return false;
  return finestra.invitati.includes(idPg) || finestra.invitati.includes(TUTTI);
}

/** Finestra aperta davvero (fase e flag concordano). */
export function finestraAperta(stato: StatoTavolo): boolean {
  return stato.fase === 'finestra' && stato.finestra.aperta;
}

/** Posso scrivere adesso? Solo a finestra aperta e se il mio PG è tra gli invitati. */
export function possoAgire(stato: StatoTavolo, idPg: string | null): boolean {
  return finestraAperta(stato) && sonoInvitato(stato.finestra, idPg);
}

/**
 * Sono «pronto»? Fa fede il riepilogo pubblico della finestra (vale anche per «passo», cioè
 * pronto senza azione); l'azione privata è il ripiego se il riepilogo non mi elenca.
 */
export function sonoPronto(stato: StatoTavolo, idPg: string | null, mia: AzionePrivata | null): boolean {
  if (!idPg) return false;
  const pubblica = stato.finestra.azioni.find((a) => a.id_pg === idPg);
  if (pubblica) return pubblica.pronto;
  return mia?.stato === 'in_coda' && mia.pronto;
}

/** L'azione privata conta per la finestra corrente (non è un residuo di un turno passato). */
export function azioneDellaFinestra(stato: StatoTavolo, mia: AzionePrivata | null): AzionePrivata | null {
  if (!mia) return null;
  return mia.turno === stato.finestra.turno ? mia : null;
}

export type TipoBanner = 'attesa' | 'narratore' | 'tocca_a_te' | 'non_chiamato' | 'fermata';

export interface Banner {
  tipo: TipoBanner;
  titolo: string;
  dettaglio: string | null;
  /** Epoch ms di chiusura automatica della finestra (solo per «tocca a te»). */
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
        titolo: 'Il narratore sta parlando…',
        dettaglio: 'Ascolta: quando tocca a voi, qui si apre la casella dell’azione.',
        scadenzaMs: null,
      };
    case 'fermata':
      return {
        tipo: 'fermata',
        titolo: 'Scena fermata',
        dettaglio: 'Il master ha messo in pausa la scena.',
        scadenzaMs: null,
      };
    case 'finestra':
      if (!stato.finestra.aperta) {
        return {
          tipo: 'narratore',
          titolo: 'Il narratore sta pensando…',
          dettaglio: null,
          scadenzaMs: null,
        };
      }
      if (sonoInvitato(stato.finestra, idPg)) {
        return {
          tipo: 'tocca_a_te',
          titolo: 'Tocca a te: cosa fai?',
          dettaglio: stato.finestra.chiusura_prevista_ms
            ? 'La finestra si chiude da sola: scrivi e premi «Pronto».'
            : 'Scrivi la tua azione, poi premi «Pronto».',
          scadenzaMs: stato.finestra.chiusura_prevista_ms,
        };
      }
      return {
        tipo: 'non_chiamato',
        titolo: 'Questa volta non sei chiamato in causa',
        dettaglio: 'Il narratore aspetta gli altri: tieniti pronto per il prossimo giro.',
        scadenzaMs: null,
      };
  }
}

/** Etichette italiane dello stato dell'azione (chip). */
export const ETICHETTA_STATO_AZIONE: Record<StatoAzione, string> = {
  in_coda: 'in coda',
  in_risoluzione: 'il narratore sta rispondendo',
  risolta: 'risolta',
  ritirata: 'ritirata',
};
