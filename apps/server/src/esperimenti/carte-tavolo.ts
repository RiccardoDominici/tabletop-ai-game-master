/**
 * Le carte dei dadi che il proiettore ha mostrato, dentro tavolo.md (A32, L5).
 *
 * Il giudice cieco legge tavolo.md per sapere che cosa ha visto il tavolo. Le carte dei tiri non stanno nella
 * trascrizione pubblica (sono un'altra cosa): stanno nel log del server, nella riga «prove: tiri del turno», nel
 * campo `tavolo` (le carte come le mostrano proiettore e telefoni, senza il numero da battere che vede solo il
 * pannello del master). Prima il giudice le otteneva con esperimenti/e2e-finale/tavolo_con_carte.py; ora
 * l'harness le scrive da sé.
 *
 * Le carte delle azioni private restano fuori: vanno solo al telefono di chi le ha tirate, e il tavolo non le ha
 * viste. Un log senza il campo `tavolo` (prima del 16 novembre) non dà carte: il campo `tiri` contiene il numero
 * da battere, che il tavolo non ha visto, quindi non lo si usa come sostituto.
 */

export const MSG_TIRI_DEL_TURNO = 'prove: tiri del turno';

/** Carte pubbliche per turno, dalle righe del log del server scritte dopo `dopo` (ISO, come il campo `time`). */
export function carteDelTavolo(righeLog: Array<Record<string, unknown>>, dopo: string): Map<number, string[]> {
  const carte = new Map<number, string[]>();
  for (const r of righeLog) {
    if (r['msg'] !== MSG_TIRI_DEL_TURNO || !Array.isArray(r['tavolo'])) continue;
    if (typeof r['time'] !== 'string' || r['time'] < dopo) continue;
    const turno = Number(r['turno'] ?? 0);
    carte.set(turno, [...(carte.get(turno) ?? []), ...(r['tavolo'] as unknown[]).map(String)]);
  }
  return carte;
}

/** Legge un log jsonl del server, saltando le righe che non sono JSON (il file è scritto a più mani). */
export function righeLogDelServer(testo: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const riga of testo.split('\n')) {
    if (!riga.trim()) continue;
    try {
      out.push(JSON.parse(riga) as Record<string, unknown>);
    } catch {
      // una riga non JSON non è un tiro: si salta
    }
  }
  return out;
}

/** Inserisce, in fondo a ogni blocco «## Turno N» di tavolo.md, la riga delle carte del proiettore per quel turno. */
export function conCarte(tavolo: string, carte: Map<number, string[]>): string {
  const blocchi = tavolo.split(/(?=^## Turno )/m);
  const out = blocchi.map((blocco) => {
    const m = /^## Turno (\d+)/.exec(blocco);
    const cc = m ? carte.get(Number(m[1])) : undefined;
    if (!cc?.length) return blocco;
    return `${blocco.replace(/\s*$/, '')}\n\n*Carte dei dadi sul proiettore:* ${cc.join(' · ')}\n\n`;
  });
  return out.join('');
}
