/**
 * Builds the creation service for a server (avvio.ts; docs/creazione.md): only when the campaign lets the players build
 * PCs at the table (campagna.yaml → regole.creazione.modo) and its rule set has a creation procedure. Otherwise null,
 * and the phones never see the «build a PC» card.
 */
import type { CreazioneTavolo, FaseScena, VistaCreazione } from '@tabletop-ai-gm/shared';
import type { Campagna } from '../campagna/tipi';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import type { SistemaRegole } from '../regole/tipi';
import { opzioniCreazione } from './opzioni';
import { ServizioCreazione } from './servizio';

/** What the table state says about creation (null = pregenerated PCs only, or a set without a procedure). */
export function creazioneDelTavolo(campagna: Campagna, s: SistemaRegole, log?: Logger): CreazioneTavolo | null {
  const avvisi: string[] = [];
  const opz = opzioniCreazione(campagna.campagnaNarratore, avvisi);
  for (const a of avvisi) log?.warn({ avviso: a }, 'creation: campaign option ignored');
  if (opz.modo === 'pregenerati') return null;
  if (!s.creazione) {
    log?.warn({ set: s.id, modo: opz.modo }, 'creation: the campaign asks for creation at the table but its rule set has no creazione: pregenerated PCs only');
    return null;
  }
  return { modo: opz.modo };
}

export interface FontiCreazione {
  campagna: Campagna;
  sistema: SistemaRegole;
  /** The players' roll mode (prove/modalita.ts): manual = the phone asks for each die. */
  manuale: boolean;
  /** The store (creazione/archivio.ts). */
  cartella: string;
  semeFisso: string | null;
  /** The table's phase and its open window's actions: a rebuild drops a turn in flight and the written actions. */
  momento: () => { fase: FaseScena; azioniInFinestra: number };
  ricarica: (() => void) | null;
  notifica: (dispositivo: string, vista: VistaCreazione) => void;
  aggiornaPannello: () => void;
  log: Logger;
}

export function creaServizioCreazione(f: FontiCreazione): ServizioCreazione | null {
  if (!creazioneDelTavolo(f.campagna, f.sistema) || !f.sistema.creazione) return null;
  const opz = opzioniCreazione(f.campagna.campagnaNarratore);
  const servizio = new ServizioCreazione({
    ctx: { s: f.sistema, cr: f.sistema.creazione, opz, manuale: f.manuale },
    cartella: f.cartella,
    idPresi: () => new Set(f.campagna.pg.map((p) => p.id)),
    log: f.log,
    semeFisso: f.semeFisso,
    momentoTranquillo: () => {
      const m = f.momento();
      if (m.fase === 'attesa') return null;
      if (m.fase === 'finestra') return m.azioniInFinestra ? testo('creazione.rifiuti.finestra_con_azioni') : null;
      return testo('creazione.rifiuti.turno_in_corso');
    },
    ricarica: f.ricarica,
    notifica: f.notifica,
    aggiornaPannello: f.aggiornaPannello,
  });
  f.log.info({ modo: opz.modo, set: f.sistema.id, metodo: opz.metodo ?? f.sistema.creazione.metodi[0]?.id, opzioni: opz.opzioni, manuale: f.manuale, cartella: f.cartella }, 'CREATION AT THE TABLE: on');
  return servizio;
}
