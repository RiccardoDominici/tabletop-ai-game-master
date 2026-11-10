/**
 * Eventi del set di regole per i telefoni (docs/regole.md): `regole:leggi` (riassunto, fonte e
 * licenza per la scheda «Regole») e `regole:chiedi` (una domanda; la risposta torna solo a chi ha
 * chiesto, nell'ack). Separati da trasporto/socket.ts: non toccano la regia né lo stato del tavolo.
 */
import type { RegolePubbliche } from '@cantastorie/shared';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import type { RisponditoreRegole } from '../regole/chiedi';
import type { RegoleCampagna } from '../regole/tipi';
import type { ServerIo } from './socket';

export function regolePubbliche(r: RegoleCampagna, domande: boolean): RegolePubbliche {
  const s = r.sistema;
  return {
    id: s.id,
    nome: s.nome,
    risoluzione: s.risoluzione.tipo,
    riassunto: r.riassunto,
    fonte: s.fonte.titolo,
    licenza: s.licenza.nome,
    attribuzione: s.licenza.attribuzione,
    domande,
  };
}

export function collegaRegole(io: ServerIo, regole: RegoleCampagna, risponditore: RisponditoreRegole, log: Logger): void {
  io.on('connection', (socket) => {
    socket.on('regole:leggi', (cb) => {
      if (typeof cb === 'function') cb(regolePubbliche(regole, risponditore.disponibile));
    });
    socket.on('regole:chiedi', (dati, cb) => {
      if (typeof cb !== 'function') return;
      void risponditore
        .chiedi(socket.id, dati?.domanda)
        .then(cb)
        .catch((err: unknown) => {
          log.error({ err: (err as Error).message }, 'regole: errore nella risposta');
          cb({ ok: false, errore: testo('trasporto.errore_server') });
        });
    });
  });
}
