/**
 * Guardia delle azioni private (docs/prove.md, «Azioni private»): una riga pubblica del narratore che
 * nomina l'autore di un'azione PRIVATA del turno e ne riprende il contenuto (almeno due radici in
 * comune col testo dell'azione: «cassetta», «lucchetto»…) non va al tavolo ma al telefono di quel PG,
 * come se fosse una riga `[privato pg_x]`. Si sposta, non si scarta: l'esito resta, e lo sente solo lui.
 *
 * Nelle partite sulla 4720 il selettore raccontava a voce lo scasso privato di Teo anche col canale
 * `[privato]` disponibile («Teo si china verso la cassetta del pedaggio…»). Logica pura: la regia
 * passa le azioni del turno e riceve, per ogni frase, il PG a cui spostarla (o null).
 *
 * Seconda regola, per le righe dei PNG (e2e finale del 10 novembre: un PG chiedeva in privato a un PNG
 * la strada, la riga del narratore andava al suo telefono ma la risposta `[png_…]` del PNG si sentiva
 * al tavolo): una riga `[png_x]` è la risposta a
 * un'azione privata, e va al telefono di chi l'ha scritta, quando nessuna azione pubblica del turno
 * è rivolta a quel PNG e (a) un'azione privata nomina quel PNG, oppure (b) il turno ha solo le azioni
 * private di un PG. Il PNG si riconosce per nome, primo nome o soprannome (repertorio/pertinenza.ts):
 * vale in ogni lingua.
 */
import { normalizza } from '../azioni/regole';
import { campoElenco, regole } from '../lingua/motore';
import { pngInterpellati } from '../prove/parole-testo';
import { pngNominati } from '../repertorio/pertinenza';

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
 * Il PG al cui telefono va questa frase pubblica, o null se resta al tavolo. `nomiPersonaggi` sono i
 * nomi di tutti i PG e PNG (minuscoli): non contano come contenuto in comune.
 *
 * Si giudica la frase INSIEME a ciò che la precede (`contesto`: le frasi prima nella stessa riga, o l'ultima
 * della riga prima). Nella seconda passata della e2e finale (indagine-B T4) il nome stava nella prima frase
 * («Eliandro tace, il quaderno aperto.») e il contenuto nella seconda («Chiedere sottovoce a Berta chi sapeva
 * della chiave non riesce…»): frase per frase, nessuna delle due bastava. La frase stessa deve portare il
 * nome del PG o almeno una radice in comune: il contesto da solo non sposta una frase che non c'entra.
 * Basta una radice in comune invece di due se il testo nomina anche il PNG a cui l'azione privata parla
 * (`nomiPng`, pngInterpellati: «Tobin asks the innkeeper quietly what he is hiding»).
 */
export function destinatarioPrivato(
  riga: string,
  private_: readonly AzionePrivataTurno[],
  nomiPersonaggi: ReadonlySet<string>,
  contesto = '',
  nomiPng?: Map<string, string[]>,
): { id_pg: string; comuni: string[] } | null {
  const nomiParole = new Set([...nomiPersonaggi].flatMap((n) => normalizza(n).split(/\s+/)));
  const testo = contesto ? `${contesto} ${riga}` : riga;
  const daTesto = radici(testo, nomiParole);
  const daRiga = radici(riga, nomiParole);
  for (const a of private_) {
    if (!nomina(testo, a.nomi)) continue;
    const comuni = [...radici(a.testo, nomiParole)].filter((r) => daTesto.has(r));
    if (!nomina(riga, a.nomi) && !comuni.some((r) => daRiga.has(r))) continue;
    const interpellati = nomiPng?.size ? pngInterpellati(a.testo, nomiPng) : new Set<string>();
    const nominaInterpellato = [...pngNominati(testo, nomiPng ?? new Map())].some((id) => interpellati.has(id));
    if (comuni.length >= (nominaInterpellato ? 1 : MIN_RADICI_COMUNI)) return { id_pg: a.id_pg, comuni };
  }
  return null;
}

/** Un'azione del turno come la passa la regia (`sospesa`: rinviata, non riceve risposta in questo turno). */
export interface AzioneTurnoGuardia {
  id_pg: string;
  testo: string | null;
  privata?: boolean;
  sospesa?: boolean;
}

/**
 * Il PG al cui telefono va una riga `[png_x]` perché risponde alla sua azione privata, o null se la
 * riga resta al tavolo. Senza azioni pubbliche rivolte a quel PNG: l'unico PG che in privato nomina il
 * PNG; più PG che lo nominano in privato → quello con più radici in comune con la riga (a pari merito il
 * primo); nessuno lo nomina → il PG che ha nel turno solo azioni private, se non ci sono azioni pubbliche.
 * Con un'azione pubblica E una privata rivolte allo stesso PNG (e2e finale, pressione-B2 T6: Berta
 * rispondeva a voce alla domanda privata di Eliandro mentre Livia le parlava in pubblico), la riga va al
 * telefono se ha più radici in comune con la sua azione privata che con ogni azione pubblica rivolta al
 * PNG (almeno una), oppure se segue una riga già spostata a quel PG (`dopoSpostata`) e non riprende
 * l'azione pubblica più di quella privata.
 */
export function rispostaPrivataPng(
  riga: string,
  etichetta: string,
  azioni: readonly AzioneTurnoGuardia[],
  nomiPng: Map<string, string[]>,
  nomiPersonaggi: ReadonlySet<string> = new Set(),
  dopoSpostata: string | null = null,
): string | null {
  if (!nomiPng.has(etichetta)) return null;
  const solo = new Map([[etichetta, nomiPng.get(etichetta)!]]);
  const verso = (a: AzioneTurnoGuardia): boolean => !!a.testo && pngNominati(a.testo, solo).has(etichetta);
  const vive = azioni.filter((a) => a.testo && !a.sospesa);
  const pubbliche = vive.filter((a) => !a.privata);
  const private_ = vive.filter((a) => a.privata === true);
  const autoriVerso = [...new Set(private_.filter(verso).map((a) => a.id_pg))];
  const nomiParole = new Set([...nomiPersonaggi].flatMap((n) => normalizza(n).split(/\s+/)));
  const daRiga = radici(riga, nomiParole);
  const comuni = (a: AzioneTurnoGuardia): number => [...radici(a.testo!, nomiParole)].filter((r) => daRiga.has(r)).length;
  const punti = (id: string): number => Math.max(...private_.filter((a) => a.id_pg === id && verso(a)).map(comuni));
  const pubblicheVerso = pubbliche.filter(verso);
  if (pubblicheVerso.length) {
    if (!autoriVerso.length) return null;
    const pubblico = Math.max(...pubblicheVerso.map(comuni));
    // Dopo una riga già spostata a quel PG, a meno che non riprenda di più l'azione pubblica.
    if (dopoSpostata && autoriVerso.includes(dopoSpostata) && punti(dopoSpostata) >= pubblico) return dopoSpostata;
    const migliore = autoriVerso.reduce((m, id) => (punti(id) > punti(m) ? id : m));
    return punti(migliore) >= 1 && punti(migliore) > pubblico ? migliore : null;
  }
  if (autoriVerso.length === 1) return autoriVerso[0]!;
  if (autoriVerso.length > 1) return autoriVerso.reduce((m, id) => (punti(id) > punti(m) ? id : m));
  const autori = new Set(private_.map((a) => a.id_pg));
  return pubbliche.length === 0 && autori.size === 1 ? [...autori][0]! : null;
}

/**
 * Guardia di un turno: per ogni frase (con il suo segmento e l'etichetta di chi parla) il PG a cui
 * spostarla. Una riga di un PNG che risponde a un'azione privata (rispostaPrivataPng, con `nomiPng`);
 * ogni riga che racconta l'azione privata (destinatarioPrivato). Una volta spostato un
 * segmento, le frasi che seguono nello stesso segmento vanno con lui (la riga è una sola).
 * Per le righe del narratore, i PG che nel turno hanno anche un'azione pubblica non si toccano.
 */
export function guardiaPrivate(
  azioni: readonly AzioneTurnoGuardia[],
  nomiDi: (id_pg: string) => string[],
  nomiPersonaggi: ReadonlySet<string>,
  nomiPng?: Map<string, string[]>,
): ((testo: string, segmento: number, etichetta?: string) => { id_pg: string; comuni: string[] } | null) | null {
  const conPubblica = new Set(azioni.filter((a) => a.testo && !a.privata).map((a) => a.id_pg));
  const private_ = azioni
    .filter((a): a is AzioneTurnoGuardia & { testo: string; privata: true } => !!a.testo && a.privata === true && !conPubblica.has(a.id_pg))
    .map((a) => ({ id_pg: a.id_pg, nomi: nomiDi(a.id_pg), testo: a.testo }));
  const conRispostePng = !!nomiPng?.size && azioni.some((a) => a.testo && a.privata === true);
  if (!private_.length && !conRispostePng) return null;
  const spostati = new Map<number, string>();
  // Ciò che precede ogni frase: la riga finora, o l'ultima frase della riga prima.
  const righe = new Map<number, string>();
  let ultima = '';
  return (testo, segmento, etichetta) => {
    const contesto = righe.get(segmento) ?? ultima;
    righe.set(segmento, `${righe.get(segmento) ?? ''} ${testo}`.trim());
    ultima = testo;
    const gia = spostati.get(segmento);
    if (gia) return { id_pg: gia, comuni: [] };
    // Prima la risposta di un PNG all'azione privata; poi, per ogni riga, il racconto dell'azione.
    const id = conRispostePng && etichetta && nomiPng!.has(etichetta) ? rispostaPrivataPng(testo, etichetta, azioni, nomiPng!, nomiPersonaggi, spostati.get(segmento - 1) ?? null) : null;
    const d = id ? { id_pg: id, comuni: [] } : private_.length ? destinatarioPrivato(testo, private_, nomiPersonaggi, contesto, nomiPng) : null;
    if (d) spostati.set(segmento, d.id_pg);
    return d;
  };
}
