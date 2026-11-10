/**
 * Messaggio utente di un turno di narrazione: la parte VARIABILE del prompt
 * (trascrizione pubblica + azioni del turno + chi è al tavolo). Sta fuori dalla cache, dopo i
 * blocchi di sistema stabili (prompts/<lingua>/narratore.md e contesto della campagna).
 */
import type { VoceTrascrizione } from '@cantastorie/shared';

export interface AzioneTurno {
  id_pg: string;
  nome: string;
  /** null = il PG era invitato ma non ha scritto niente (ha passato). */
  testo: string | null;
  /** Posizione nell'ordine di risoluzione (1 = prima). */
  numero?: number;
  /** Azione privata: a voce solo ciò che gli altri possono percepire. */
  privata?: boolean;
}

export interface DatiMessaggioTurno {
  turno: number;
  /** Trascrizione dei turni precedenti (le azioni del turno corrente sono a parte). */
  trascrizione: VoceTrascrizione[];
  /** Esiti privati già dati (`[privato pg_x]`): li sa solo quel PG; il narratore li ricorda. */
  privati?: ReadonlyArray<{ turno: number; id_pg: string; testo: string }>;
  azioni: AzioneTurno[];
  /** PG presenti al tavolo (scelti da almeno un telefono): solo loro si possono invitare. */
  pgAlTavolo: Array<{ id: string; nome: string }>;
  /** Stato degli orologi attivi, tenuto dal Motore (righe già pronte); vuoto = nessuno. */
  orologi?: string;
  /** Collegamenti tra le azioni del turno (dipendenze, conflitti), righe già pronte. */
  collegamenti?: string[];
  /** Stallo: quante finestre di fila senza nessun input (1 = prima mossa, S1). */
  stallo?: number;
  /**
   * Modalità repertorio: fatti scoperti (testo), catalogo del turno (righe pronte), stallo, e le
   * menzogne già dette (versione pubblica, da tenere ferma quando si improvvisa).
   */
  repertorio?: {
    fattiScoperti: string[];
    battuteDisponibili: string;
    stallo?: boolean;
    menzogne?: string[];
    /** Preselezione del Motore: una riga per azione, con le battute i cui temi quell'azione tocca. */
    indicate?: string[];
    /** Solo per il lettore minimo: battute d'attesa (riempitivi) per le azioni senza battuta. */
    attesa?: string;
  };
  /** Massimo di voci di trascrizione da includere (le più recenti). */
  maxTrascrizione?: number;
  /** Note di regia del master (al massimo 3), da seguire in questa risposta. */
  noteRegia?: string[];
  /**
   * Esiti dei tiri del turno (docs/prove.md), righe già pronte dal Motore delle prove, nell'ordine
   * delle azioni. Assente o vuoto: nessuna sezione (campagna senza dadi).
   */
  esitiTiri?: { titolo: string; regola: string; righe: string[] };
  /** Fine della serata vicina (sessione/durata.ts, consiglioDiChiusura): un consiglio, non un ordine. */
  tempoSerata?: string | null;
}

/** Titolo della sezione delle note di regia nel messaggio (lo cercano anche i log e i test). */
export const TITOLO_NOTE_REGIA = '## Note di regia del master';

/** Sezione delle note di regia: imperative, valgono più delle abitudini del narratore. */
export function sezioneNoteRegia(note: readonly string[]): string | null {
  if (!note.length) return null;
  return `${TITOLO_NOTE_REGIA} (seguile in questa risposta, prima delle tue abitudini; non citarle mai ad alta voce)\n${note.map((n) => `- ${n}`).join('\n')}`;
}

/** Una voce di trascrizione nel formato che il narratore stesso usa. */
export function rigaTrascrizione(v: VoceTrascrizione): string | null {
  switch (v.tipo) {
    case 'narrazione':
    case 'battuta':
      return `[${v.chi}] ${v.testo}`;
    case 'azione':
      return `(azione di ${v.nome}, ${v.chi}) ${v.testo}`;
    case 'sistema':
      return null;
  }
}

/**
 * Trascrizione divisa per turno, con il numero di ogni risposta del narratore: la regola di
 * ritmo degli orologi nel prompt conta le risposte («una sì e una no»).
 */
function trascrizioneNumerata(voci: VoceTrascrizione[]): string {
  const blocchi: string[] = [];
  let turno: number | null = null;
  let righe: string[] = [];
  const chiudi = (): void => {
    if (turno === null || righe.length === 0) return;
    blocchi.push(`### ${turno === 0 ? 'Turno 0 (apertura)' : `Turno ${turno}`}\n${righe.join('\n')}`);
  };
  for (const v of voci) {
    if (v.turno !== turno) {
      chiudi();
      turno = v.turno;
      righe = [];
    }
    const r = rigaTrascrizione(v);
    if (r) righe.push(r);
  }
  chiudi();
  return blocchi.join('\n\n');
}

export function compilaMessaggioTurno(d: DatiMessaggioTurno): string {
  const max = d.maxTrascrizione ?? 60;
  const storia = d.trascrizione.filter((v) => v.turno < d.turno);
  const recenti = storia.slice(-max);
  const tagliate = storia.length - recenti.length;
  const testoStoria = trascrizioneNumerata(recenti);

  const parti: string[] = [];
  parti.push('## Trascrizione pubblica della scena finora (divisa per turno)');
  if (tagliate > 0) parti.push(`(omesse ${tagliate} voci più vecchie)`);
  parti.push(testoStoria || '(nessuna)');
  const privati = (d.privati ?? []).filter((v) => v.turno < d.turno).slice(-12);
  if (privati.length) {
    parti.push(
      '## Esiti privati già dati (li sa solo quel PG: non dirli a voce, finché il PG non li usa)',
      privati.map((v) => `- turno ${v.turno}, ${v.id_pg}: ${v.testo}`).join('\n'),
    );
  }

  parti.push(`## Turno ${d.turno}: azioni dei giocatori`);
  if (d.azioni.length === 0) {
    parti.push('Nessuno ha scritto un’azione: tutti aspettano che succeda qualcosa.');
  } else {
    parti.push(
      d.azioni
        .map((a) => {
          if (!a.testo) return `- ${a.nome} (${a.id_pg}): nessuna azione, aspetta.`;
          const n = a.numero !== undefined ? `[${a.numero}] ` : '';
          const privata = a.privata ? ' (azione PRIVATA: a voce narra solo ciò che gli altri possono percepire)' : '';
          return `- ${n}${a.nome} (${a.id_pg}): ${a.testo}${privata}`;
        })
        .join('\n'),
    );
    if (d.azioni.some((a) => a.numero !== undefined)) parti.push('Le azioni sono in ordine di invio: risolvile in quest’ordine.');
    if (d.collegamenti?.length) parti.push(`Collegamenti tra le azioni:\n${d.collegamenti.map((c) => `- ${c}`).join('\n')}`);
    // Esiti dei tiri: subito dopo le azioni, perché la risoluzione di ognuna parta da lì.
    if (d.esitiTiri?.righe.length) parti.push(d.esitiTiri.titolo, d.esitiTiri.regola, d.esitiTiri.righe.map((r) => `- ${r}`).join('\n'));
  }

  if (d.orologi) parti.push('## Orologi della scena (stato tenuto dal Motore)', d.orologi);
  if (d.stallo && !d.repertorio) parti.push(testoStallo(d.stallo));
  if (d.repertorio) {
    if (d.repertorio.fattiScoperti.length) parti.push('## Fatti scoperti in scena (ora li conoscono i PG)', d.repertorio.fattiScoperti.map((f) => `- ${f}`).join('\n'));
    if (d.repertorio.menzogne?.length) {
      parti.push(
        '## Menzogne già dette dai PNG (se l’argomento torna, il PNG ripete la stessa versione; la verità esce solo con una battuta di confessione)',
        d.repertorio.menzogne.map((m) => `- ${m}`).join('\n'),
      );
    }
    if (d.repertorio.indicate?.length) {
      parti.push(
        '## Battute indicate dal Motore (le parole di queste azioni toccano i loro temi: usale per quell’azione, con > pg, se il loro quando la descrive)',
        d.repertorio.indicate.join('\n'),
      );
    }
    parti.push('## Catalogo: battute pertinenti a questo turno (id · chi · tipo · quando)', d.repertorio.battuteDisponibili || '(nessuna)');
    if (d.repertorio.attesa) parti.push('## Battute d’attesa (riempitivi, solo se nessuna battuta risponde)', d.repertorio.attesa);
    if (d.repertorio.stallo) parti.push(TESTO_STALLO_REPERTORIO);
  }

  if (d.tempoSerata) parti.push('## Tempo della serata', d.tempoSerata);

  // Note di regia: in fondo, vicino all'ordine di rispondere, perché pesino di più.
  const note = sezioneNoteRegia(d.noteRegia ?? []);
  if (note) parti.push(note);

  // pg_presenti: solo questi si possono invitare (gli altri PG della scheda non sono al tavolo).
  const nomi = d.pgAlTavolo.map((p) => `${p.id} = ${p.nome}`).join('; ');
  parti.push(`pg_presenti: [${d.pgAlTavolo.map((p) => p.id).join(', ')}]${nomi ? ` (${nomi})` : ''}`);
  parti.push(
    d.repertorio
      ? 'Rispondi ora: solo righe etichettate ([usa] con l’id di una battuta disponibile, [narratore], [png_…]); ' +
          'l’ultima riga è [invito] con gli id dei PG al tavolo che devono rispondere, oppure tutti.'
      : 'Narra ciò che succede ora. Rispondi solo con righe etichettate; ' +
          'l’ultima riga è [invito] con gli id dei PG al tavolo che devono rispondere, oppure tutti.',
  );
  return parti.join('\n\n');
}

/** Titolo della sezione della chiusura guidata (la cercano il prompt, i log e le prove). */
export const TITOLO_CHIUSURA = '## Chiusura della serata';

/**
 * «Chiudi la sessione» (chiusura guidata): niente azioni da risolvere, il narratore chiude la serata.
 * In modalità B la chiusura è improvvisata ([usa] non vale): una battuta `chiusura` del repertorio, se
 * c'è, la dice il Motore senza chiamare il modello.
 */
export function messaggioChiusura(d: { trascrizione: VoceTrascrizione[]; maxTrascrizione?: number; pgAlTavolo: Array<{ id: string; nome: string }>; orologi?: string }): string {
  const voci = d.trascrizione.filter((v) => v.tipo !== 'sistema').slice(-(d.maxTrascrizione ?? 30));
  const parti = ['## Trascrizione recente', voci.map((v) => `${v.nome}: ${v.testo}`).join('\n') || '(vuota)'];
  if (d.orologi) parti.push('## Orologi della scena (stato tenuto dal Motore)', d.orologi);
  parti.push(
    TITOLO_CHIUSURA,
    'Il master chiude la serata adesso. Niente azioni da risolvere. Scrivi da tre a cinque righe [narratore] (i PNG presenti possono dire una frase): ' +
      'chiudi il momento in corso, dai un’immagine finale, lascia un aggancio per la prossima volta. ' +
      'Niente misteri, PNG o fatti nuovi, niente segreti, niente domande ai giocatori, niente [usa], niente [orologio].',
    `pg_presenti: [${d.pgAlTavolo.map((p) => p.id).join(', ')}]`,
    'Rispondi ora con le righe etichettate; l’ultima riga è [invito] tutti.',
  );
  return parti.join('\n\n');
}

/**
 * B2: messaggio della riparazione. La risposta è già stata detta ad alta voce ma alcune azioni
 * sono rimaste senza risposta: si chiede solo quella parte, senza invito.
 */
export function messaggioRiparazione(messaggio: string, detto: string, mancanti: Array<{ id: string; nome: string; testo: string }>): string {
  return [
    messaggio,
    `## La tua risposta, già detta ad alta voce\n${detto}`,
    `## Azioni rimaste senza risposta\n${mancanti.map((m) => `- ${m.nome} (${m.id}): ${m.testo}`).join('\n')}`,
    'Rispondi ora SOLO a queste azioni, nell’ordine: per ognuna una o due righe rivolte a quel PG per nome ' +
      '([narratore], [png_…], oppure [usa] id > pg_id se una battuta del catalogo risponde proprio a quella azione). ' +
      'Non ripetere niente di ciò che hai già detto. Niente [invito].',
  ].join('\n\n');
}

/**
 * Regola comune delle mosse contro lo stallo: un EVENTO DEL MONDO, mai un commento sul tavolo.
 * (In una notte di prova il selettore ha detto per ore «nessuno dei PG ha ancora parlato».) Il
 * Motore scarta comunque le frasi fuori dalla finzione (narrazione/finzione.ts).
 */
const SOLO_FINZIONE =
  'Racconta solo ciò che accade nella storia: non nominare giocatori o PG come tali, e non parlare di scelte, ' +
  'attese, silenzi o di qualcuno che non ha ancora fatto qualcosa.';

/** Modalità B: lo stallo per il selettore (la parola «Stallo» la riconosce il suo prompt). */
export const TESTO_STALLO_REPERTORIO =
  `Stallo: in questo turno non c'è nessuna azione da risolvere. Fai succedere qualcosa nel mondo con una battuta di riempimento del catalogo, oppure col segno se è dovuto. ${SOLO_FINZIONE}`;

/**
 * Mossa contro lo stallo (manuale, S1–S2): prima un segno di un fronte attivo, poi un indizio
 * proattivo. Mai un «cosa fate?» a vuoto. Dopo due mosse di fila il tavolo va in pausa da solo.
 */
export function testoStallo(volte: number): string {
  const mossa =
    volte <= 1
      ? 'un segno visibile della minaccia (S1), senza niente di irreversibile'
      : 'un indizio proattivo (S2): qualcosa irrompe e porta una pista nuova, oppure un PNG agisce per conto suo';
  return `## Mossa del mondo\nFai succedere qualcosa nella scena: ${mossa}. ${SOLO_FINZIONE} Chiudi con un invito a un personaggio per nome, dentro la storia.`;
}
