/**
 * The invented tana fixture (R4: a bestiary, monster specials, morale, situational modifiers) as an Engine for the
 * tests, built as the server builds it (src/avvio.ts): the scenes' minions get their sheets under their ids.
 */
import path from 'node:path';
import { caricaCampagna } from '../../src/campagna/caricatore';
import { gregariDellaCampagna } from '../../src/campagna/gregari';
import { loggerMuto } from '../../src/logger';
import type { FonteDadi } from '../../src/prove/dadi';
import { MotoreProve } from '../../src/prove/motore';
import { caricaRegole } from '../../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../../src/regole/schede';
import { orologioDiSistema } from '../../src/turni/orologio';

export const TANA = path.join(import.meta.dirname, '..', 'fixtures', 'campagne', 'tana');

/** `presenti`: the NPCs on stage (default: the scene's `png_presenti`); hostile ones join a fight. */
export function motoreTana(dadi: FonteDadi, extra: Partial<ConstructorParameters<typeof MotoreProve>[0]> = {}, pgAlTavolo = ['pg_bruna', 'pg_dario', 'pg_selva'], cartella = TANA, presenti?: string[]): MotoreProve {
  const c = caricaCampagna(cartella);
  const regole = caricaRegole(cartella);
  const g = gregariDellaCampagna(c);
  const schede = caricaSchedeGeneriche(regole.sistema, { pg: c.pg, png: [...c.png, ...g.comePng] });
  const nome = (id: string): string => g.gregari.find((x) => x.id === id)?.nome ?? c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro: null, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, gregari: g.gregari, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo, nome, ...(presenti ? { presenti: new Set(presenti) } : {}) }), dadi, ...extra });
}
