/**
 * HTTPS for the phones (docs/ascolto.md, «HTTPS»): a browser gives the microphone only to a secure context, and
 * http://<LAN IP> is not one. scripts/certificato.sh makes, with mkcert, a local CA and a certificate for this
 * computer's addresses in cache/https/ (outside git):
 *   telefoni.pem       the certificate (+ chain) for the LAN IPs, the host name and localhost
 *   telefoni-key.pem   its private key (never served)
 *   rootCA.pem         the PUBLIC root certificate of the local CA, the one a phone installs once
 * The CA's private key stays in mkcert's own folder (`mkcert -CAROOT`): it is never copied here.
 *
 * One port, both protocols: the first byte of each connection says which (0x16 = a TLS handshake). TLS connections
 * go through an HTTPS server that hands every request and upgrade to the same Fastify and Socket.IO; the others go to
 * the plain HTTP server as before. So the projector and the scripts keep http://localhost:<port>, the phones use
 * https://<LAN IP>:<port>, and a phone can open http://<LAN IP>:<port>/certificato before it trusts anything.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import type http from 'node:http';
import https from 'node:https';
import type { Socket } from 'node:net';
import path from 'node:path';
import type { Logger } from '../logger';

export const FILE_CERTIFICATO = 'telefoni.pem';
export const FILE_CHIAVE = 'telefoni-key.pem';
export const FILE_CA = 'rootCA.pem';
/** A connection that sends nothing for this long is closed (it never reached the HTTP server's own timeouts). */
const ATTESA_PRIMO_BYTE_MS = 15_000;

export interface Certificato {
  cert: Buffer;
  key: Buffer;
  /** The public root certificate to give the phones. */
  ca: Buffer;
  /** Names and IPs the certificate covers (from its subjectAltName). */
  nomi: string[];
  scade: string;
}

/** The certificate of cache/https/, or null (missing, unreadable, or a CA file that holds a private key). */
export function caricaCertificato(cartella: string, log: Logger): Certificato | null {
  const file = (n: string) => path.join(cartella, n);
  if (![FILE_CERTIFICATO, FILE_CHIAVE, FILE_CA].every((n) => fs.existsSync(file(n)))) {
    log.info({ cartella }, 'https: no certificate (scripts/certificato.sh), phones on plain http: no microphone');
    return null;
  }
  try {
    const cert = fs.readFileSync(file(FILE_CERTIFICATO));
    const key = fs.readFileSync(file(FILE_CHIAVE));
    const ca = fs.readFileSync(file(FILE_CA));
    // The file handed to the phones must be a certificate and nothing else.
    if (/PRIVATE KEY/.test(ca.toString('utf8')) || !/BEGIN CERTIFICATE/.test(ca.toString('utf8'))) {
      log.error({ file: file(FILE_CA) }, 'https: rootCA.pem is not a plain public certificate, HTTPS stays off');
      return null;
    }
    const x = new crypto.X509Certificate(cert);
    const nomi = (x.subjectAltName ?? '').split(/,\s*/).map((s) => s.replace(/^(DNS|IP Address):/, '')).filter(Boolean);
    return { cert, key, ca, nomi, scade: x.validTo };
  } catch (err) {
    log.error({ cartella, err: (err as Error).message }, 'https: certificate unreadable, HTTPS stays off');
    return null;
  }
}

/**
 * Makes `server` (Fastify's, not yet listening) answer HTTPS on its own port too. Returns the HTTPS server (closed
 * together with the HTTP one: it never listens by itself).
 */
export function attivaPoliglotta(server: http.Server, c: Certificato, log: Logger): https.Server {
  const sicuro = https.createServer({ key: c.key, cert: c.cert });
  const originali = server.listeners('connection') as Array<(s: Socket) => void>;
  server.removeAllListeners('connection');
  sicuro.on('request', (req, res) => server.emit('request', req, res));
  sicuro.on('upgrade', (req, s, testa) => server.emit('upgrade', req, s, testa));
  sicuro.on('tlsClientError', (err) => log.debug({ err: err.message }, 'https: TLS handshake failed (a phone without the certificate?)'));
  server.on('connection', (socket: Socket) => {
    const timer = setTimeout(() => socket.destroy(), ATTESA_PRIMO_BYTE_MS);
    socket.once('readable', () => {
      clearTimeout(timer);
      const primo = socket.read(1) as Buffer | null;
      if (primo === null) return;
      socket.unshift(primo);
      if (primo[0] === 0x16) sicuro.emit('connection', socket);
      else for (const l of originali) l.call(server, socket);
    });
    socket.once('close', () => clearTimeout(timer));
  });
  return sicuro;
}
