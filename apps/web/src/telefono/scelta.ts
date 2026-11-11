/**
 * Ordine dei pulsanti dell'avviso «da decidere» (logica pura): in evidenza la scelta consigliata
 * dal server — «Cambio» quando l'azione ha perso il suo appoggio (dipendenza rotta, conflitto
 * perso), «Confermo» quando probabilmente vale ancora (azione vecchia ma dubbia). «Ritiro» non è
 * mai in evidenza.
 */
import type { RichiestaScelta } from '@tabletop-ai-gm/shared';

export type Scelta = 'conferma' | 'cambio' | 'ritiro';

export function ordinePulsanti(r: Pick<RichiestaScelta, 'consigliato'>): { primario: Scelta; secondari: [Scelta, Scelta] } {
  return r.consigliato === 'cambio' ? { primario: 'cambio', secondari: ['conferma', 'ritiro'] } : { primario: 'conferma', secondari: ['cambio', 'ritiro'] };
}
