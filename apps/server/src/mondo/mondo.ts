/**
 * The world that moves during a session (docs/mondo.md): one object the director holds and calls at a few
 * fixed points (closed window, end of a narration, scene change, fight started). It owns the gates of
 * `avanza_quando` and pays off-screen the marks owed to clocks the PCs cannot perceive. Everything it
 * decides is logged; its state goes into the session snapshot (`fotografia.mondo`).
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { StatoOrologi } from '../scena/orologi';
import { PorteDelMondo, porteDegliOrologi, type Debito, type FattoDelGioco } from './porte';

/** What the snapshot keeps of the world (sessione/tipi.ts, FotografiaSessione.mondo). */
export interface StatoMondoSalvato {
  /** How many times each gate has opened («o_id#index» → n). */
  porte: Array<[string, number]>;
}

export interface OpzioniMondo {
  campagna: Campagna;
  /** The director replaces its clocks on «Ricomincia»: always the current ones. */
  orologi: () => StatoOrologi;
  log: Logger;
}

/** What one call of `fatti` did: the debts of the gates and the marks paid off-screen. */
export interface EsitoFatti {
  debiti: Debito[];
  fuoriScena: Array<{ id: string; pieni: number }>;
}

export class MondoInGioco {
  readonly porte: PorteDelMondo;

  constructor(private readonly o: OpzioniMondo) {
    const orologi = Array.isArray(o.campagna.campagnaNarratore['orologi']) ? (o.campagna.campagnaNarratore['orologi'] as DatiYaml[]) : [];
    this.porte = new PorteDelMondo(porteDegliOrologi(orologi, (msg) => o.log.warn({ campagna: o.campagna.id }, `world: ${msg}`)));
    if (this.porte.porte.length) o.log.info({ porte: this.porte.porte.map((p) => `${p.chiave} ${p.quando}`) }, 'world: avanza_quando gates loaded');
  }

  /**
   * Facts of the game at turn `turno`: the gates that open owe marks to their clocks; the owed marks of
   * clocks not active in this scene are paid off-screen at once (also debts left by a scene change).
   */
  fatti(fatti: readonly FattoDelGioco[], turno: number): EsitoFatti {
    const orologi = this.o.orologi();
    const debiti = fatti.length ? this.porte.fatti(fatti) : [];
    for (const d of debiti) {
      const ora = orologi.aggiungiDebito(d.orologio, d.segni);
      this.o.log.info({ turno, porta: d.porta, quando: d.quando, orologio: d.orologio, segni: d.segni, debito: ora }, ora === null ? 'world: gate opened, clock not running (ignored)' : 'world: gate opened, marks owed');
    }
    const fuoriScena = orologi.pagaFuoriScena(turno);
    for (const f of fuoriScena) this.o.log.info({ turno, orologio: f.id, pieni: f.pieni }, 'world: owed mark paid off-screen');
    return { debiti, fuoriScena };
  }

  esporta(): StatoMondoSalvato {
    return { porte: this.porte.esporta() };
  }

  importa(s: StatoMondoSalvato | undefined): void {
    this.porte.importa(s?.porte);
  }
}
