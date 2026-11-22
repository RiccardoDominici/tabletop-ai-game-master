/**
 * Building a PC on the phone (docs/creazione.md): this phone's draft, as the Engine last sent it, and the one call that
 * changes it. Every action goes to the server (`creazione:azione`, keyed by the phone's device token) and comes back
 * with the whole draft, or with the reason it was refused (an illegal choice, a die off its faces): the phone never
 * decides what is legal, it shows what the Engine says.
 */
import { create } from 'zustand';
import type { AzioneCreazione, EsitoCreazione, VistaCreazione } from '@tabletop-ai-gm/shared';
import { t } from '../../lingua';
import { chiedi, prendiSocket } from '../../lib/socket';
import { creaLog } from '../../lib/log';
import { tokenDispositivo } from '../../lib/memoria';
import { useTelefono } from '../../store/telefono';

const log = creaLog('creazione');

interface StoreCreazione {
  /** The creation screen covers the choice of PC. */
  aperta: boolean;
  bozza: VistaCreazione | null;
  errore: string | null;
  occupato: boolean;
  apri(aperta: boolean): void;
  impostaBozza(b: VistaCreazione | null): void;
}

export const useCreazione = create<StoreCreazione>((set) => ({
  aperta: false,
  bozza: null,
  errore: null,
  occupato: false,
  apri: (aperta) => set({ aperta, errore: null }),
  impostaBozza: (bozza) => set({ bozza }),
}));

/** One action on this phone's draft; the answer replaces the draft (also when refused: it shows why). */
export async function azioneCreazione(azione: AzioneCreazione): Promise<EsitoCreazione | null> {
  const store = useCreazione.getState();
  useCreazione.setState({ occupato: true, errore: null });
  try {
    if (!prendiSocket().connected) {
      useCreazione.setState({ errore: t('comune.socket.non_connesso_tavolo') });
      return null;
    }
    const esito = await chiedi<EsitoCreazione>((s, fine) => s.emit('creazione:azione', { dispositivo: tokenDispositivo(), azione }, fine));
    if (!esito) {
      useCreazione.setState({ errore: t('comune.socket.risposta_vuota') });
      return null;
    }
    if (esito.bozza) store.impostaBozza(esito.bozza);
    if (!esito.ok) {
      log.info('Creation action refused', { azione: azione.tipo, errore: esito.errore });
      useCreazione.setState({ errore: esito.errore });
    } else log.info('Creation action', { azione: azione.tipo, passo: esito.bozza.corrente, stato: esito.bozza.stato });
    if (esito.ok) suBozza(esito.bozza);
    return esito;
  } catch {
    useCreazione.setState({ errore: t('comune.socket.timeout') });
    return null;
  } finally {
    useCreazione.setState({ occupato: false });
  }
}

/**
 * The draft as the server sends it on its own (`creazione:bozza`: the Game Master approved or undid a step). Approved:
 * the phone remembers the new PC; the server restarts to let it join, and the phone picks it when it reconnects.
 */
export function suBozza(b: VistaCreazione): void {
  useCreazione.getState().impostaBozza(b);
  if (b.stato === 'approvata' && b.id_pg) {
    log.info('PC approved: this phone takes it', { idPg: b.id_pg });
    useTelefono.getState().ricordaPg(b.id_pg);
  }
}
