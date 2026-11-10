/**
 * Ritmo nel messaggio del turno (richieste del 9 novembre, punto 1). Il narratore chiede il ritmo
 * concitato con `[ritmo] concitato` (docs/f0-contratti.md, «Protocollo»); finché vale, il messaggio
 * glielo ricorda, così sa quando dire `[ritmo] calmo`. Al ritmo calmo il messaggio non cambia.
 */
import type { Ritmo } from '../azioni/tipi';
import { testo } from '../lingua';

/**
 * Sezione da aggiungere in fondo al messaggio del turno, o null al ritmo calmo. Titolo e testo
 * vengono dal pacchetto della lingua (`ritmo.titolo`, che cercano i test, e `ritmo.concitato`); il
 * token `[ritmo] calmo` resta lo stesso in ogni lingua (lo legge il parser).
 */
export function sezioneRitmo(ritmo: Ritmo): string | null {
  if (ritmo !== 'concitato') return null;
  return `${testo('ritmo.titolo')}\n${testo('ritmo.concitato')}`;
}
