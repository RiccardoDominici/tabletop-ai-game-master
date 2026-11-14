/**
 * Indirizzo del Mac nella rete locale (per il QR dei telefoni) e informazioni del server.
 */
import os from 'node:os';
import QRCode from 'qrcode';
import type { InfoServer } from '@tabletop-ai-gm/shared';

/** Primo IPv4 non interno, preferendo le interfacce Wi-Fi/Ethernet del Mac (en0, en1…). */
export function ipLan(): string {
  const interfacce = os.networkInterfaces();
  const candidati: Array<{ nome: string; ip: string }> = [];
  for (const [nome, indirizzi] of Object.entries(interfacce)) {
    for (const a of indirizzi ?? []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      candidati.push({ nome, ip: a.address });
    }
  }
  const peso = (nome: string): number => (/^en\d/.test(nome) ? 0 : /^(eth|wl)/.test(nome) ? 1 : /^(utun|bridge|vmnet|docker)/.test(nome) ? 3 : 2);
  candidati.sort((a, b) => peso(a.nome) - peso(b.nome) || a.nome.localeCompare(b.nome));
  return candidati[0]?.ip ?? '127.0.0.1';
}

/**
 * Addresses for phones and projector. With HTTPS on (trasporto/https.ts) the phones get https:// (the microphone
 * needs a secure context) and the certificate page stays on plain http://, which works before the phone trusts it.
 */
export async function creaInfoServer(porta: number, ipForzato?: string, https = false): Promise<InfoServer> {
  const ip = ipForzato ?? ipLan();
  const url_telefono = `${https ? 'https' : 'http'}://${ip}:${porta}/telefono`;
  const qr_svg = await QRCode.toString(url_telefono, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return { url_telefono, url_schermo: `http://localhost:${porta}/schermo`, ip_lan: ip, porta, qr_svg, https, url_certificato: https ? `http://${ip}:${porta}/certificato` : null };
}
