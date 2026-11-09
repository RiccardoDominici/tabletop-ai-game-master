/**
 * Ritmo nel messaggio del turno (richieste del 9 novembre, punto 1). Il narratore chiede il ritmo
 * concitato con `[ritmo] concitato` (docs/f0-contratti.md, «Protocollo»); finché vale, il messaggio
 * glielo ricorda, così sa quando dire `[ritmo] calmo`. Al ritmo calmo il messaggio non cambia.
 */
import type { Ritmo } from '../azioni/tipi';

/** Titolo della sezione (lo cercano i test). */
export const TITOLO_RITMO = '## Ritmo';

/** Sezione da aggiungere in fondo al messaggio del turno, o null al ritmo calmo. */
export function sezioneRitmo(ritmo: Ritmo): string | null {
  if (ritmo !== 'concitato') return null;
  return `${TITOLO_RITMO}\nConcitato: i giocatori hanno avuto un conto alla rovescia per decidere. Se il pericolo è passato (lo scontro è finito, l'inseguimento si è chiuso, siete al sicuro), scrivi \`[ritmo] calmo\` prima di \`[invito]\`; altrimenti non scrivere niente e il conto resta.`;
}
