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
 * Words that point back at what a PC asked or whispered («la tua domanda», «ha chiesto», «sottovoce», «in privato»):
 * lingue/<code>/motore.yaml, section `privato`, `richiami` (stems; entries of several words are phrases). A line with
 * one of them needs one root in common with the private action instead of two. Third e2e pass: «Nespola, la tua domanda
 * sul prezzo del carbone è scivolata nel fango.» shared only «carbone» with the whisper three turns before.
 */
const richiami = (): readonly string[][] =>
  regole('privato_richiami', (s) =>
    campoElenco(s, 'richiami')
      .map((x) => normalizza(x).replace(/[^a-z0-9' ]/g, ' ').split(/[\s']+/).filter(Boolean))
      .filter((v) => v.length > 0),
  );

/** The line points back at a question or a whisper (a `richiamo`, as whole words or stems of several words)? */
export function haRichiamo(t: string): boolean {
  const w = normalizza(t).replace(/[^a-z0-9' ]/g, ' ').split(/[\s']+/).filter(Boolean);
  return richiami().some((v) => w.some((_, i) => v.every((k, j) => w[i + j]?.startsWith(k))));
}

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
    if (comuni.length >= (nominaInterpellato || haRichiamo(riga) ? 1 : MIN_RADICI_COMUNI)) return { id_pg: a.id_pg, comuni };
  }
  return null;
}

/**
 * Something private of an EARLIER turn that the table has not heard: a PC's private action, or a private outcome the
 * narrator gave to its phone (`[privato pg_x]`). The narrator's message keeps the outcomes («Esiti privati già dati»),
 * and in the third e2e pass it retold them in public turns later: «Livia ha chiesto a Ugo dove stava la notte, e lui
 * ha detto che guardava il fuoco della carbonaia.» (stallo T11, the whisper at T9). `pubblico`: what that PC has said
 * in public since then (its public actions): those words are the table's now, and do not count as private.
 */
export interface PrivatoPrecedente {
  id_pg: string;
  turno: number;
  testo: string;
  pubblico?: string;
  /**
   * What the table has heard aloud since (narrator and NPC lines): with two roots and no `richiamo`, words already heard
   * in public do not count, so a later public outcome («Livia abbassa la spada sul goblin») is not pulled to a phone
   * because a whisper of hers mentioned a sword. A `richiamo` with the PC's name needs only one root, heard or not.
   */
  sentito?: string;
  /**
   * The NPCs the private item speaks to or is spoken by (named in its text, or the NPC who said the private outcome).
   * Without a `richiamo`, a later line must name one of them: a retelling says who was asked («Ugo lo ha detto a voce
   * bassa»); a line about the PC's own public action does not (rerun after the fixes, T4: «Nespola non riesce a restare
   * zitta: il sentiero scricchiola…» went to her phone for two words of an earlier private outcome).
   */
  verso?: readonly string[];
}

/**
 * The PC whose phone an earlier private item's retelling goes to, or null. The line (or its context) must name that PC,
 * and the line itself must share with the item one root with a `richiamo`, or two roots not heard in public since and
 * the name of an NPC of the item (`verso`); roots the PC has said in public since never count. The PC may also act in public in this turn: unlike the turn's own private actions, an earlier one is not
 * shadowed by it (fuori-binario T5: Nespola walked to the ford in public while the narrator retold her whisper).
 */
export function precedentePrivato(
  riga: string,
  precedenti: readonly (PrivatoPrecedente & { nomi: readonly string[] })[],
  nomiPersonaggi: ReadonlySet<string>,
  contesto = '',
  nomiPng?: Map<string, string[]>,
): { id_pg: string; comuni: string[] } | null {
  const nomiParole = new Set([...nomiPersonaggi].flatMap((n) => normalizza(n).split(/\s+/)));
  const testo = contesto ? `${contesto} ${riga}` : riga;
  const daTesto = radici(testo, nomiParole);
  const daRiga = radici(riga, nomiParole);
  const richiamo = haRichiamo(riga);
  const soglia = richiamo ? 1 : MIN_RADICI_COMUNI;
  let migliore: { id_pg: string; comuni: string[] } | null = null;
  const pngInRiga = pngNominati(testo, nomiPng ?? new Map());
  for (const p of precedenti) {
    if (!nomina(testo, p.nomi)) continue;
    if (!richiamo && !(p.verso ?? []).some((id) => pngInRiga.has(id))) continue;
    const giaDette = radici(`${p.pubblico ?? ''} ${richiamo ? '' : (p.sentito ?? '')}`, nomiParole);
    const comuni = [...radici(p.testo, nomiParole)].filter((r) => daTesto.has(r) && !giaDette.has(r));
    if (!comuni.some((r) => daRiga.has(r)) || comuni.length < soglia) continue;
    if (!migliore || comuni.length > migliore.comuni.length) migliore = { id_pg: p.id_pg, comuni };
  }
  return migliore;
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
  precedenti: readonly PrivatoPrecedente[] = [],
  /** A fight is on: a narrator line about the NPC whispered to may be its attack in its step, a public fact. */
  inCombattimento = false,
): ((testo: string, segmento: number, etichetta?: string) => { id_pg: string; comuni: string[] } | null) | null {
  const conPubblica = new Set(azioni.filter((a) => a.testo && !a.privata).map((a) => a.id_pg));
  const private_ = azioni
    .filter((a): a is AzioneTurnoGuardia & { testo: string; privata: true } => !!a.testo && a.privata === true && !conPubblica.has(a.id_pg))
    .map((a) => ({ id_pg: a.id_pg, nomi: nomiDi(a.id_pg), testo: a.testo }));
  const conRispostePng = !!nomiPng?.size && azioni.some((a) => a.testo && a.privata === true);
  // A turn whose only actions are private: every narrator line is an answer to them, or the world.
  const soloPrivate = private_.length > 0 && !azioni.some((a) => a.testo && !a.privata && !a.sospesa);
  const prima = precedenti.map((p) => ({ ...p, nomi: nomiDi(p.id_pg) }));
  const tuttiPg = [...new Set([...azioni.map((a) => a.id_pg), ...precedenti.map((p) => p.id_pg)])];
  const altriPg = (id: string): string[][] => tuttiPg.filter((x) => x !== id).map(nomiDi);
  if (!private_.length && !conRispostePng && !prima.length) return null;
  const nomiParole = new Set([...nomiPersonaggi].flatMap((n) => normalizza(n).split(/\s+/)));
  /**
   * In a turn with only private actions, a narrator line answers one of them even without its author's name (combat
   * T25 of the third e2e pass: «Il goblin alza gli occhi verso di lei… Parla piano, in fretta… Dice che il ragazzo è
   * stato portato via», answering Livia's whisper): two roots in common with the action, or the NPC it speaks to named,
   * or one root right after a line already moved to that PC. With nobody acting in public, a line about the NPC whispered
   * to is its answer; a world line that names nobody whispered to stays at the table.
   */
  const rispostaSoloPrivata = (testo: string, dopo: string | null): { id_pg: string; comuni: string[] } | null => {
    const daRiga = radici(testo, nomiParole);
    const nominati = pngNominati(testo, nomiPng ?? new Map());
    let migliore: { id_pg: string; comuni: string[] } | null = null;
    for (const a of private_) {
      // A line that names another PC is about that PC (rerun after the fixes, T2: Nespola's earlier whisper retold
      // went to the phone of Eliandro, who whispered in this turn).
      if (altriPg(a.id_pg).some((nomi) => nomina(testo, nomi))) continue;
      const comuni = [...radici(a.testo, nomiParole)].filter((r) => daRiga.has(r));
      const verso = nomiPng?.size ? [...pngInterpellati(a.testo, nomiPng)].some((id) => nominati.has(id)) : false;
      // In a fight the PC on turn whispers while the others wait: naming the NPC alone is not enough (its attack).
      const basta = comuni.length >= MIN_RADICI_COMUNI || (verso && !inCombattimento) || (comuni.length >= 1 && dopo === a.id_pg);
      if (basta && (!migliore || comuni.length > migliore.comuni.length)) migliore = { id_pg: a.id_pg, comuni };
    }
    return migliore;
  };
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
    const png = !!etichetta && !!nomiPng?.has(etichetta);
    const id = conRispostePng && png ? rispostaPrivataPng(testo, etichetta!, azioni, nomiPng!, nomiPersonaggi, spostati.get(segmento - 1) ?? null) : null;
    let d = id ? { id_pg: id, comuni: [] } : private_.length ? destinatarioPrivato(testo, private_, nomiPersonaggi, contesto, nomiPng) : null;
    if (!d && !png && soloPrivate) d = rispostaSoloPrivata(testo, spostati.get(segmento - 1) ?? null);
    // Then what was private in an earlier turn, retold now (narrator lines only).
    if (!d && !png && prima.length) d = precedentePrivato(testo, prima, nomiPersonaggi, contesto, nomiPng);
    if (d) spostati.set(segmento, d.id_pg);
    return d;
  };
}
