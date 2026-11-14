/**
 * Carte dei tiri di dado (docs/prove.md): formattazione e scelte PURE, condivise da proiettore e
 * telefono. Nessun React qui (testato in tiri.test.ts).
 *
 * - Testi: modificatore col segno (meno vero «−», non il trattino), «CD 15» / «CA 13», esito
 *   («Riuscita», «Colpito», «Colpo critico»…), riga del danno («Danni 1d8+2: 6 + 2 = 8 perforanti»).
 * - Scelte: quali carte mostra il proiettore e in che forma (grandi durante la narrazione del loro
 *   turno, poi una striscia compatta che sparisce), quali carte pubbliche mostra il telefono senza
 *   ripetere le mie, il colore dei punti ferita.
 * - Animazione: la linea del tempo di una carta (d20 che gira, poi modificatore, totale, esito).
 */
import { t } from '../lingua';
import type { DannoMostrato, FaseScena, PuntiFerita, TiroMostrato } from '@tabletop-ai-gm/shared';

/** Segno meno tipografico (U+2212): più leggibile del trattino da lontano. */
export const MENO = '−';

// ------------------------------------------------------------------ testi della carta

/** Modificatore col segno: «+5», «−1», «+0». */
export function conSegno(n: number): string {
  return n < 0 ? `${MENO}${Math.abs(n)}` : `+${n}`;
}

/** Il numero da battere: «CD 15» (prove, salvezze), «CA 13» (attacchi), «soglia 45» (sotto soglia). */
export function testoContro(tiro: Pick<TiroMostrato, 'contro'>): string {
  return `${siglaContro(tiro.contro.tipo)} ${tiro.contro.valore}`;
}

/** Sigla del tipo di bersaglio nella lingua dell'interfaccia: CD → DC, CA → AC; il resto com'è. */
export function siglaContro(tipo: string): string {
  if (tipo === 'CD') return t('comune.tiri.cd');
  if (tipo === 'CA') return t('comune.tiri.ca');
  if (tipo === 'soglia') return t('comune.tiri.soglia');
  return tipo;
}

/** Il set di regole con cui si è tirato; senza `risoluzione` vale il d20 contro CD o CA, come sempre. */
export type RisoluzioneTiro = NonNullable<TiroMostrato['risoluzione']>;

export function risoluzioneDi(tiro: Pick<TiroMostrato, 'risoluzione'>): RisoluzioneTiro {
  return tiro.risoluzione ?? 'd20_cd';
}

/** Facce del dado (dei `dadi`): 20 se non dichiarate. */
export function facceDi(tiro: Pick<TiroMostrato, 'facce'>): number {
  return tiro.facce && tiro.facce > 0 ? tiro.facce : 20;
}

/**
 * Il valore da mostrare su un dado durante il giro: l'animazione tira facce del d20 a caso, quindi
 * su un d6 o un d100 si riportano nel range del dado (1..facce).
 */
export function facciaNelRange(valore: number, facce: number): number {
  if (facce <= 0) return valore;
  return ((Math.max(1, valore) - 1) % facce) + 1;
}

/**
 * Il posto del «CD 15» sulla carta: col 2d6 a fasce è il nome della fascia («Successo con un costo»);
 * altrimenti il numero da battere.
 */
export function testoBersaglioCarta(tiro: Pick<TiroMostrato, 'contro' | 'risoluzione' | 'grado'>): string {
  if (risoluzioneDi(tiro) === '2d6_fasce' && tiro.grado) return tiro.grado.nome;
  return testoContro(tiro);
}

/** Sotto soglia: «tiro 23 ≤ 45?», il tiro e la soglia da non superare. */
export function testoTiroSottoSoglia(tiro: Pick<TiroMostrato, 'dado' | 'contro'>): string {
  return t('comune.tiri.sotto_soglia_domanda', { dado: tiro.dado, valore: tiro.contro.valore });
}

/** La riga «Regola: …» della carta intera, o null se la regola non c'è o è vuota. */
export function testoRegola(tiro: Pick<TiroMostrato, 'regola'>): string | null {
  const regola = tiro.regola?.trim();
  return regola ? t('comune.tiri.regola', { regola }) : null;
}

/** Cosa si tira, col bersaglio se c'è: «Balestra leggera contro il goblin». */
export function testoCosa(tiro: Pick<TiroMostrato, 'etichetta' | 'bersaglio'>): string {
  return tiro.bersaglio ? t('comune.tiri.contro_nome', { cosa: tiro.etichetta, nome: tiro.bersaglio.nome }) : tiro.etichetta;
}

/** Tono dell'esito: decide il colore (muschio = buono, brace = cattivo, candela = pari). */
export type TonoEsito = 'buono' | 'cattivo' | 'pari';

export interface EsitoTiro {
  /** «Riuscita», «Fallita», «Colpito», «Mancato», «Colpo critico», «1 naturale», «Pareggio». */
  testo: string;
  tono: TonoEsito;
  /** Simbolo accanto al testo (si legge anche senza distinguere i colori). */
  simbolo: string;
  /** Esito speciale (20 o 1 naturale su un attacco): il badge si fa più vistoso. */
  speciale: boolean;
}

/** Contrapposta tra due PG finita pari: la situazione resta com'era (SRD, prove contrapposte). */
export function pareggio(tiro: Pick<TiroMostrato, 'avversario' | 'totale'>): boolean {
  return tiro.avversario !== null && tiro.avversario.totale === tiro.totale;
}

const TONO_GRADO: Record<NonNullable<TiroMostrato['grado']>['id'], TonoEsito> = {
  successo: 'buono',
  parziale: 'pari',
  fallimento: 'cattivo',
  critico: 'buono',
  disastro: 'cattivo',
};

/** Parole del badge per le fasce del 2d6 (il nome della fascia sta già al posto della CD). */
/** La parola della fascia del 2d6, nella lingua dell'interfaccia (letta al momento dell'uso). */
function parolaFascia(id: NonNullable<TiroMostrato['grado']>['id']): string {
  const chiavi = {
    successo: 'comune.esito.riuscita',
    parziale: 'comune.esito.parziale',
    fallimento: 'comune.esito.fallita',
    critico: 'comune.esito.critico',
    disastro: 'comune.esito.disastro',
  } as const;
  return t(chiavi[id]);
}

/**
 * L'esito a gradi (2d6 a fasce, sotto soglia): colore dal `grado.id`, testo dal nome della fascia
 * sotto soglia e dalla parola breve nel 2d6. Critico e disastro hanno una stella e sono speciali.
 */
export function esitoDaGrado(grado: NonNullable<TiroMostrato['grado']>, risoluzione: RisoluzioneTiro): EsitoTiro {
  const tono = TONO_GRADO[grado.id];
  const speciale = grado.id === 'critico' || grado.id === 'disastro';
  const testo = risoluzione === 'sotto_soglia' ? grado.nome : parolaFascia(grado.id);
  const simbolo = speciale ? '★' : tono === 'buono' ? '✔' : tono === 'pari' ? '~' : '✘';
  return { testo, tono, simbolo, speciale };
}

/** L'esito della carta, con le parole del tavolo. */
export function esitoTiro(
  tiro: Pick<TiroMostrato, 'tipo' | 'riuscita' | 'critico' | 'fallimento_critico' | 'avversario' | 'totale' | 'risoluzione' | 'grado'>,
): EsitoTiro {
  if (tiro.grado) return esitoDaGrado(tiro.grado, risoluzioneDi(tiro));
  if (tiro.tipo === 'attacco') {
    if (tiro.critico) return { testo: t('comune.esito.colpo_critico'), tono: 'buono', simbolo: '✦', speciale: true };
    if (tiro.fallimento_critico) return { testo: t('comune.esito.uno_naturale'), tono: 'cattivo', simbolo: '✘', speciale: true };
    return tiro.riuscita
      ? { testo: t('comune.esito.colpito'), tono: 'buono', simbolo: '✔', speciale: false }
      : { testo: t('comune.esito.mancato'), tono: 'cattivo', simbolo: '✘', speciale: false };
  }
  if (pareggio(tiro)) return { testo: t('comune.esito.pareggio'), tono: 'pari', simbolo: '=', speciale: false };
  return tiro.riuscita
    ? { testo: t('comune.esito.riuscita'), tono: 'buono', simbolo: '✔', speciale: false }
    : { testo: t('comune.esito.fallita'), tono: 'cattivo', simbolo: '✘', speciale: false };
}

/**
 * Indice del d20 scartato quando se ne tirano due (vantaggio/svantaggio), o null. Conta quello che
 * vale `dado`; con due facce uguali si scarta la seconda.
 */
export function indiceDadoScartato(tiro: Pick<TiroMostrato, 'dadi' | 'dado' | 'risoluzione'>): number | null {
  // Col 2d6 a fasce i due dadi si sommano: nessuno si scarta. Sotto soglia c'è un solo dado.
  if (risoluzioneDi(tiro) !== 'd20_cd') return null;
  if (tiro.dadi.length < 2) return null;
  const contato = tiro.dadi.indexOf(tiro.dado);
  // Il Motore manda sempre `dado` tra i `dadi`; se non fosse così si scarta il secondo (mai nessuno a caso).
  return contato === 1 ? 0 : 1;
}

/** «Vantaggio: Corrado lo aiuta», «Svantaggio», oppure null senza vantaggio. */
export function testoVantaggio(tiro: Pick<TiroMostrato, 'vantaggio' | 'motivo_vantaggio'>): string | null {
  if (!tiro.vantaggio) return null;
  const parola = tiro.vantaggio === 'vantaggio' ? t('comune.tiri.vantaggio') : t('comune.tiri.svantaggio');
  const motivo = tiro.motivo_vantaggio?.trim();
  return motivo ? t('comune.tiri.con_motivo', { parola, motivo }) : parola;
}

/**
 * Tipi di danno che in italiano si dicono «da …» (danni da fuoco, non «danni fuochi»). Serve solo alle
 * carte senza `nome_tipo` (quelle di prima): il nome da mostrare lo compone il Motore, nella lingua dei
 * contenuti (lingue/<codice>/prove.yaml).
 */
const DANNI_DA = new Set(['acido', 'freddo', 'fuoco', 'forza', 'fulmine', 'tuono', 'veleno']);

/**
 * Il tipo di danno al plurale, come segue un numero: «perforante» → «perforanti», «necrotico» →
 * «necrotici», «fuoco» → «da fuoco». Ciò che non si riconosce resta com'è.
 */
export function tipoDannoPlurale(tipo: string): string {
  const t = tipo.trim().toLowerCase();
  if (t === '') return '';
  if (t.startsWith('da ') || t.includes(' ')) return t;
  if (DANNI_DA.has(t)) return `da ${t}`;
  if (t.endsWith('co')) return `${t.slice(0, -2)}ci`; // necrotico, psichico
  if (t.endsWith('e') || t.endsWith('o')) return `${t.slice(0, -1)}i`; // perforante, contundente, radioso
  return t;
}

/** La somma del danno: «6 + 2 = 8», «3 + 5 = 8», «6» (un dado, senza bonus), «4 − 1 = 3». */
export function sommaDanno(danno: Pick<DannoMostrato, 'dadi' | 'bonus' | 'totale'>): string {
  const parti = danno.dadi.map(String);
  // Danno fisso (nessun dado): basta il totale.
  if (parti.length === 0) return String(danno.totale);
  let testo = parti.join(' + ');
  if (danno.bonus > 0) testo += ` + ${danno.bonus}`;
  if (danno.bonus < 0) testo += ` ${MENO} ${Math.abs(danno.bonus)}`;
  const addendi = parti.length + (danno.bonus !== 0 ? 1 : 0);
  // Un solo addendo uguale al totale: niente «6 = 6».
  if (addendi <= 1 && Number(parti[0] ?? danno.totale) === danno.totale) return String(danno.totale);
  return `${testo} = ${danno.totale}`;
}

/**
 * La riga del danno: «Danni 1d8+2: 6 + 2 = 8 perforanti», «Damage 1d8+2: 6 + 2 = 8 piercing». Il tipo
 * arriva già nella forma giusta (`nome_tipo`, lingua dei contenuti); una carta che non l'ha ripiega
 * sulla grammatica italiana del tipo scritto nella scheda.
 */
export function testoDanno(danno: DannoMostrato): string {
  const tipo = danno.nome_tipo ?? (danno.tipo ? tipoDannoPlurale(danno.tipo) : '');
  const valori = { formula: danno.formula, somma: sommaDanno(danno) };
  return tipo ? t('comune.tiri.danni_tipo', { ...valori, tipo }) : t('comune.tiri.danni', valori);
}

/** Il conto del d20: «17 + 5 = 22» (col meno vero se il modificatore è negativo). */
export function contoTiro(tiro: Pick<TiroMostrato, 'dado' | 'modificatore' | 'totale'>): string {
  const segno = tiro.modificatore < 0 ? MENO : '+';
  return `${tiro.dado} ${segno} ${Math.abs(tiro.modificatore)} = ${tiro.totale}`;
}

/**
 * An automatic attack (it always hits, only damage is rolled): «automatico: 1d6+1 = 7 danni». Null for any other card.
 * Before, the card read «Dardo incantato 7 contro soglia 0».
 */
export function testoAutomatico(tiro: Pick<TiroMostrato, 'automatico' | 'danno'>): string | null {
  if (!tiro.automatico || !tiro.danno) return null;
  return t('comune.tiri.automatico', { formula: tiro.danno.formula, totale: tiro.danno.totale });
}

/** Una frase intera per i lettori di schermo e i log: «Arianna, Persuasione (Carisma): 17 + 5 = 22 contro CD 15. Riuscita.» */
export function descriviTiro(tiro: TiroMostrato): string {
  const esito = esitoTiro(tiro);
  const risoluzione = risoluzioneDi(tiro);
  let conto: string;
  // An automatic attack: no roll to hit, the damage is the whole count (no separate damage sentence).
  const automatico = testoAutomatico(tiro);
  if (automatico) {
    conto = automatico;
  } else if (risoluzione === 'sotto_soglia') {
    conto = t('comune.tiri.sotto_soglia', { dado: tiro.dado, valore: tiro.contro.valore });
  } else if (risoluzione === '2d6_fasce') {
    conto = t('comune.tiri.conto_fasce', {
      dadi: tiro.dadi.join(' + '),
      mod: conSegno(tiro.modificatore),
      totale: tiro.totale,
      bersaglio: tiro.grado?.nome ?? testoContro(tiro),
    });
  } else {
    const contro = tiro.avversario
      ? t('comune.tiri.contro_avversario', { nome: tiro.avversario.nome, conto: contoTiro(tiro.avversario) })
      : t('comune.tiri.contro_valore', { bersaglio: testoContro(tiro) });
    conto = `${contoTiro(tiro)} ${contro}`;
  }
  const parti = [t('comune.tiri.frase', { nome: tiro.nome, cosa: testoCosa(tiro), conto, esito: esito.testo })];
  const vantaggio = testoVantaggio(tiro);
  if (vantaggio) parti.push(`${vantaggio}.`);
  if (tiro.danno && tiro.riuscita && !automatico) parti.push(`${testoDanno(tiro.danno)}.`);
  if (tiro.a_terra) {
    const chi = tiro.bersaglio?.nome ?? t('comune.tiri.il_bersaglio');
    parti.push(t('comune.tiri.a_terra_frase', { chi: `${chi.charAt(0).toUpperCase()}${chi.slice(1)}` }));
  }
  return parti.join(' ');
}

// ------------------------------------------------------------------ quali carte mostrare

/** Sul proiettore, oltre questo numero le carte si mostrano tutte compatte. */
export const MASSIMO_CARTE_GRANDI = 4;
/** Dopo la narrazione del loro turno le carte restano (compatte) per questo tempo, poi spariscono. */
export const DURATA_CODA_MS = 10_000;

/** Quanto serve dello stato del tavolo per decidere (così i test non costruiscono uno StatoTavolo intero). */
export interface ContestoTiri {
  fase: FaseScena;
  turno: number;
  finestraAperta: boolean;
}

/**
 * Il turno dei tiri è quello che si sta narrando: dalla chiusura della finestra (il Motore ha
 * tirato, il narratore prepara) alla fine della narrazione. La finestra successiva apre il turno dopo.
 */
export function turnoInNarrazione(contesto: ContestoTiri, turnoTiri: number): boolean {
  if (contesto.turno !== turnoTiri) return false;
  return contesto.fase === 'narrazione' || (contesto.fase === 'finestra' && !contesto.finestraAperta);
}

export type ModoTiriSchermo = 'grandi' | 'compatti' | 'nessuno';

export interface VistaTiriSchermo {
  modo: ModoTiriSchermo;
  /** Le carte del turno si stanno narrando adesso (si animano; la narrazione lascia loro spazio). */
  inNarrazione: boolean;
}

/**
 * Come mostra il proiettore le carte dell'ultimo turno risolto:
 * - durante la narrazione del loro turno: grandi (al massimo MASSIMO_CARTE_GRANDI, oltre compatte);
 * - dopo (finestra successiva, pausa, cambio scena): compatte per DURATA_CODA_MS da quando ce ne
 *   siamo accorti (`dopoDaMs`), poi nessuna. Senza `dopoDaMs` (appena accorti) valgono compatte.
 */
export function vistaTiriSchermo(
  tiri: readonly TiroMostrato[],
  contesto: ContestoTiri,
  dopoDaMs: number | null,
  oraMs: number,
): VistaTiriSchermo {
  const primo = tiri[0];
  if (!primo) return { modo: 'nessuno', inNarrazione: false };
  if (turnoInNarrazione(contesto, primo.turno)) {
    return { modo: tiri.length > MASSIMO_CARTE_GRANDI ? 'compatti' : 'grandi', inNarrazione: true };
  }
  if (dopoDaMs !== null && oraMs - dopoDaMs >= DURATA_CODA_MS) return { modo: 'nessuno', inNarrazione: false };
  return { modo: 'compatti', inNarrazione: false };
}

/** Chiave stabile di un gruppo di carte: cambia solo quando cambiano le carte. */
export function chiaveTiri(tiri: readonly Pick<TiroMostrato, 'id'>[]): string {
  return tiri.map((t) => t.id).join('|');
}

/** Le carte pubbliche del turno senza quelle che il telefono mostra già nella mia azione. */
export function tiriPubbliciSenzaMiei(
  pubblici: readonly TiroMostrato[] | undefined,
  miei: readonly Pick<TiroMostrato, 'id'>[] | undefined,
): TiroMostrato[] {
  if (!pubblici || pubblici.length === 0) return [];
  const gia = new Set((miei ?? []).map((t) => t.id));
  return pubblici.filter((t) => !gia.has(t.id));
}

/**
 * Solo le carte dell'ultimo turno: quello che si sta narrando o, a finestra successiva aperta, quello
 * appena narrato (`turno` cresce all'apertura della finestra). Più vecchie non si mostrano.
 */
export function tiriRecenti<T extends Pick<TiroMostrato, 'turno'>>(tiri: readonly T[], turno: number): T[] {
  return tiri.filter((t) => t.turno >= turno - 1);
}

/** Livello dei punti ferita, per il colore: oltre metà, metà o meno, a terra (0). */
export type LivelloPf = 'pieni' | 'feriti' | 'a_terra';

export function livelloPf(pf: PuntiFerita): LivelloPf {
  if (pf.attuali <= 0) return 'a_terra';
  if (pf.attuali * 2 <= pf.massimi) return 'feriti';
  return 'pieni';
}

/** «6/12» (mai sotto zero). */
export function testoPf(pf: PuntiFerita): string {
  return `${Math.max(0, pf.attuali)}/${pf.massimi}`;
}

// ------------------------------------------------------------------ animazione di una carta

/**
 * Linea del tempo di una carta (ms dall'inizio della SUA animazione): il d20 gira per ~1,2 s e si
 * ferma sulla faccia vera, poi compaiono modificatore, totale con la CD, infine l'esito (~2 s).
 * Le carte dello stesso turno partono sfalsate di `sfalsamentoMs`.
 */
export const TEMPI_ANIMAZIONE = {
  lancioMs: 1200,
  totaleMs: 1450,
  esitoMs: 1750,
  fineMs: 2150,
  sfalsamentoMs: 400,
  /** Ogni quanto cambia la faccia mentre il d20 gira. */
  scattoMs: 70,
} as const;

/** I passi in ordine: ogni parte della carta compare dal suo passo in poi. */
export const PASSI_ANIMAZIONE = ['attesa', 'lancio', 'modificatore', 'totale', 'esito', 'fermo'] as const;
export type PassoAnimazione = (typeof PASSI_ANIMAZIONE)[number];

/** Il passo dopo `ms` dall'inizio (negativo = la carta aspetta il suo turno nello sfalsamento). */
export function passoAnimazione(ms: number): PassoAnimazione {
  const t = TEMPI_ANIMAZIONE;
  if (ms < 0) return 'attesa';
  if (ms < t.lancioMs) return 'lancio';
  if (ms < t.totaleMs) return 'modificatore';
  if (ms < t.esitoMs) return 'totale';
  if (ms < t.fineMs) return 'esito';
  return 'fermo';
}

/** La parte che compare a `da` si vede al passo `passo`? */
export function giaVisibile(passo: PassoAnimazione, da: PassoAnimazione): boolean {
  return PASSI_ANIMAZIONE.indexOf(passo) >= PASSI_ANIMAZIONE.indexOf(da);
}

/** Una faccia a caso del d20, diversa da `evita` (così mentre gira cambia sempre). */
export function facciaCasuale(caso: () => number = Math.random, evita?: number): number {
  for (let i = 0; i < 4; i++) {
    const faccia = 1 + Math.floor(caso() * 20);
    if (faccia !== evita) return Math.min(20, Math.max(1, faccia));
  }
  return evita === 20 ? 1 : (evita ?? 0) + 1;
}
