/**
 * Guardia delle azioni private (docs/prove.md, «Azioni private»): una riga pubblica del narratore che
 * nomina l'autore di un'azione PRIVATA del turno e ne riprende il contenuto (almeno due radici in
 * comune col testo dell'azione: «cassetta», «lucchetto»…) non va al tavolo ma al telefono di quel PG,
 * come se fosse una riga `[privato pg_x]`. Si sposta, non si scarta: l'esito resta, e lo sente solo lui.
 *
 * Nelle partite sulla 4720 il selettore raccontava a voce lo scasso privato di Teo anche col canale
 * `[privato]` disponibile («Teo si china verso la cassetta del pedaggio…»). Logica pura: la regia
 * passa le azioni del turno e riceve, per ogni frase, il PG a cui spostarla (o null).
 */
import { normalizza } from '../azioni/regole';
import { campoElenco, regole } from '../lingua/motore';

export interface AzionePrivataTurno {
  id_pg: string;
  /** Come il narratore può chiamare quel PG: nome intero, nome breve, alias. */
  nomi: string[];
  testo: string;
}

/** Radici in comune sotto cui la riga resta al tavolo. */
export const MIN_RADICI_COMUNI = 2;

/**
 * Parole frequenti che non dicono il contenuto di un'azione (≥ 4 lettere, già senza accenti), della lingua
 * dei contenuti: lingue/<codice>/motore.yaml, sezione `privato`.
 */
const vuote = (): ReadonlySet<string> => regole('privato', (s) => new Set(campoElenco(s, 'parole_vuote')));

/** Parole di almeno 4 lettere, senza le vuote e senza i nomi dati. */
function parole(t: string, nomi: ReadonlySet<string>): string[] {
  const escluse = vuote();
  return normalizza(t)
    .replace(/[^a-z0-9' ]/g, ' ')
    .split(/[\s']+/)
    .filter((p) => p.length >= 4 && !escluse.has(p) && !nomi.has(p));
}

/** Radice grezza: le prime cinque lettere («cassetta», «cassette» → «casse»; «lucchetto» → «lucch»). */
export function radici(t: string, nomi: ReadonlySet<string> = new Set()): Set<string> {
  return new Set(parole(t, nomi).map((p) => p.slice(0, 5)));
}

/** La riga nomina quel PG (un suo nome come parola intera)? */
function nomina(riga: string, nomi: readonly string[]): boolean {
  const t = ` ${normalizza(riga).replace(/[^a-z0-9' ]/g, ' ')} `;
  return nomi.some((n) => {
    const k = normalizza(n).replace(/[^a-z0-9' ]/g, ' ').trim();
    return k.length >= 2 && t.includes(` ${k} `);
  });
}

/**
 * Il PG al cui telefono va questa riga pubblica, o null se resta al tavolo. `nomiPersonaggi` sono i
 * nomi di tutti i PG e PNG (minuscoli): non contano come contenuto in comune.
 */
export function destinatarioPrivato(
  riga: string,
  private_: readonly AzionePrivataTurno[],
  nomiPersonaggi: ReadonlySet<string>,
): { id_pg: string; comuni: string[] } | null {
  const nomiParole = new Set([...nomiPersonaggi].flatMap((n) => normalizza(n).split(/\s+/)));
  const daRiga = radici(riga, nomiParole);
  for (const a of private_) {
    if (!nomina(riga, a.nomi)) continue;
    const comuni = [...radici(a.testo, nomiParole)].filter((r) => daRiga.has(r));
    if (comuni.length >= MIN_RADICI_COMUNI) return { id_pg: a.id_pg, comuni };
  }
  return null;
}

/**
 * Guardia di un turno: per ogni frase (con il suo segmento) il PG a cui spostarla. Una volta spostato
 * un segmento, le frasi che seguono nello stesso segmento vanno con lui (la riga è una sola).
 * I PG che nel turno hanno anche un'azione pubblica non si toccano.
 */
export function guardiaPrivate(
  azioni: ReadonlyArray<{ id_pg: string; testo: string | null; privata?: boolean }>,
  nomiDi: (id_pg: string) => string[],
  nomiPersonaggi: ReadonlySet<string>,
): ((testo: string, segmento: number) => { id_pg: string; comuni: string[] } | null) | null {
  const conPubblica = new Set(azioni.filter((a) => a.testo && !a.privata).map((a) => a.id_pg));
  const private_ = azioni
    .filter((a): a is { id_pg: string; testo: string; privata: true } => !!a.testo && a.privata === true && !conPubblica.has(a.id_pg))
    .map((a) => ({ id_pg: a.id_pg, nomi: nomiDi(a.id_pg), testo: a.testo }));
  if (!private_.length) return null;
  const spostati = new Map<number, string>();
  return (testo, segmento) => {
    const gia = spostati.get(segmento);
    if (gia) return { id_pg: gia, comuni: [] };
    const d = destinatarioPrivato(testo, private_, nomiPersonaggi);
    if (d) spostati.set(segmento, d.id_pg);
    return d;
  };
}
