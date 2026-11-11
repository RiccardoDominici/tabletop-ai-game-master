/**
 * Messaggio utente di un turno di narrazione: la parte VARIABILE del prompt
 * (trascrizione pubblica + azioni del turno + chi è al tavolo). Sta fuori dalla cache, dopo i
 * blocchi di sistema stabili (prompts/<lingua>/narratore.md e contesto della campagna).
 */
import type { VoceTrascrizione } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';

/*
 * Titoli e istruzioni vengono dal pacchetto della lingua dei contenuti (lingue/<codice>/testi*.yaml,
 * sezione `messaggio`), letti a ogni messaggio: la lingua si imposta all'avvio. Restano nel codice
 * solo i token del protocollo (`pg_presenti:`, `[usa]`, `[invito]`…) e la forma delle righe (`- `).
 */

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
  /** `privati`: le righe delle azioni private, in una sezione loro (solo nelle righe [privato pg_x]). */
  esitiTiri?: { titolo: string; regola: string; righe: string[]; privati?: { titolo: string; righe: string[] } };
  /** PNG in scena fuori gioco per il Motore (a terra, morti, fuggiti): non parlano né agiscono. */
  fuoriGioco?: { titolo: string; righe: string[] };
  /** Fine della serata vicina (sessione/durata.ts, consiglioDiChiusura): un consiglio, non un ordine. */
  tempoSerata?: string | null;
}

/**
 * Sezione delle note di regia: imperative, valgono più delle abitudini del narratore. Il titolo è
 * `messaggio.titolo_note_regia` (lo cercano anche i test).
 */
export function sezioneNoteRegia(note: readonly string[]): string | null {
  if (!note.length) return null;
  const intestazione = testo('messaggio.note_regia', { titolo: testo('messaggio.titolo_note_regia') });
  return `${intestazione}\n${note.map((n) => `- ${n}`).join('\n')}`;
}

/** Una voce di trascrizione nel formato che il narratore stesso usa. */
export function rigaTrascrizione(v: VoceTrascrizione): string | null {
  switch (v.tipo) {
    case 'narrazione':
    case 'battuta':
      return `[${v.chi}] ${v.testo}`;
    case 'azione':
      return testo('messaggio.riga_azione', { nome: v.nome, chi: v.chi, testo: v.testo });
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
    const titolo = turno === 0 ? testo('messaggio.turno_apertura') : testo('messaggio.turno', { turno });
    blocchi.push(`${titolo}\n${righe.join('\n')}`);
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
  parti.push(testo('messaggio.titolo_trascrizione'));
  if (tagliate > 0) parti.push(testo('messaggio.omesse', { n: tagliate }));
  parti.push(testoStoria || testo('messaggio.nessuna'));
  const privati = (d.privati ?? []).filter((v) => v.turno < d.turno).slice(-12);
  if (privati.length) {
    parti.push(
      testo('messaggio.titolo_privati'),
      privati.map((v) => testo('messaggio.riga_privato', { turno: v.turno, pg: v.id_pg, testo: v.testo })).join('\n'),
    );
  }

  // Il lettore minimo (llm/minimo.ts) legge questa sezione e la forma delle sue righe.
  parti.push(testo('messaggio.titolo_azioni', { turno: d.turno }));
  if (d.azioni.length === 0) {
    parti.push(testo('messaggio.nessuna_azione'));
  } else {
    parti.push(
      d.azioni
        .map((a) => {
          if (!a.testo) return `- ${a.nome} (${a.id_pg}): ${testo('messaggio.passa')}`;
          const n = a.numero !== undefined ? `[${a.numero}] ` : '';
          const privata = a.privata ? ` ${testo('messaggio.azione_privata')}` : '';
          return `- ${n}${a.nome} (${a.id_pg}): ${a.testo}${privata}`;
        })
        .join('\n'),
    );
    if (d.azioni.some((a) => a.numero !== undefined)) parti.push(testo('messaggio.ordine_invio'));
    if (d.collegamenti?.length) parti.push(`${testo('messaggio.titolo_collegamenti')}\n${d.collegamenti.map((c) => `- ${c}`).join('\n')}`);
    // Esiti dei tiri: subito dopo le azioni, perché la risoluzione di ognuna parta da lì.
    if (d.esitiTiri && (d.esitiTiri.righe.length || d.esitiTiri.privati?.righe.length)) {
      parti.push(d.esitiTiri.titolo, d.esitiTiri.regola);
      if (d.esitiTiri.righe.length) parti.push(d.esitiTiri.righe.map((r) => `- ${r}`).join('\n'));
      // Gli esiti delle private a parte: il narratore non li legge fra i fatti del tavolo.
      if (d.esitiTiri.privati?.righe.length) parti.push(d.esitiTiri.privati.titolo, d.esitiTiri.privati.righe.map((r) => `- ${r}`).join('\n'));
    }
  }

  if (d.fuoriGioco?.righe.length) parti.push(d.fuoriGioco.titolo, d.fuoriGioco.righe.map((r) => `- ${r}`).join('\n'));
  if (d.orologi) parti.push(testo('messaggio.titolo_orologi'), d.orologi);
  if (d.stallo && !d.repertorio) parti.push(testoStallo(d.stallo));
  if (d.repertorio) {
    if (d.repertorio.fattiScoperti.length) parti.push(testo('messaggio.titolo_fatti_scoperti'), d.repertorio.fattiScoperti.map((f) => `- ${f}`).join('\n'));
    if (d.repertorio.menzogne?.length) {
      parti.push(
        testo('messaggio.titolo_menzogne'),
        d.repertorio.menzogne.map((m) => `- ${m}`).join('\n'),
      );
    }
    if (d.repertorio.indicate?.length) {
      parti.push(
        testo('messaggio.titolo_indicate'),
        d.repertorio.indicate.join('\n'),
      );
    }
    parti.push(testo('messaggio.titolo_catalogo'), d.repertorio.battuteDisponibili || testo('messaggio.nessuna'));
    if (d.repertorio.attesa) parti.push(testo('messaggio.titolo_attesa'), d.repertorio.attesa);
    if (d.repertorio.stallo) parti.push(testoStalloRepertorio());
  }

  if (d.tempoSerata) parti.push(testo('messaggio.titolo_tempo_serata'), d.tempoSerata);

  // Note di regia: in fondo, vicino all'ordine di rispondere, perché pesino di più.
  const note = sezioneNoteRegia(d.noteRegia ?? []);
  if (note) parti.push(note);

  // pg_presenti: solo questi si possono invitare (gli altri PG della scheda non sono al tavolo).
  const nomi = d.pgAlTavolo.map((p) => `${p.id} = ${p.nome}`).join('; ');
  parti.push(`pg_presenti: [${d.pgAlTavolo.map((p) => p.id).join(', ')}]${nomi ? ` (${nomi})` : ''}`);
  parti.push(testo(d.repertorio ? 'messaggio.rispondi_repertorio' : 'messaggio.rispondi_narratore'));
  return parti.join('\n\n');
}

/**
 * «Chiudi la sessione» (chiusura guidata): niente azioni da risolvere, il narratore chiude la serata.
 * Il titolo della sezione è `messaggio.titolo_chiusura` (lo citano i prompt e lo cercano le prove).
 * In modalità B la chiusura è improvvisata ([usa] non vale): una battuta `chiusura` del repertorio, se
 * c'è, la dice il Motore senza chiamare il modello.
 */
export function messaggioChiusura(d: { trascrizione: VoceTrascrizione[]; maxTrascrizione?: number; pgAlTavolo: Array<{ id: string; nome: string }>; orologi?: string }): string {
  const voci = d.trascrizione.filter((v) => v.tipo !== 'sistema').slice(-(d.maxTrascrizione ?? 30));
  const parti = [testo('messaggio.titolo_trascrizione_recente'), voci.map((v) => `${v.nome}: ${v.testo}`).join('\n') || testo('messaggio.vuota')];
  if (d.orologi) parti.push(testo('messaggio.titolo_orologi'), d.orologi);
  parti.push(
    testo('messaggio.titolo_chiusura'),
    testo('messaggio.chiusura'),
    `pg_presenti: [${d.pgAlTavolo.map((p) => p.id).join(', ')}]`,
    testo('messaggio.rispondi_chiusura'),
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
    `${testo('messaggio.titolo_detto')}\n${detto}`,
    // Il lettore minimo (llm/minimo.ts) riconosce la riparazione da questo titolo.
    `${testo('messaggio.titolo_mancanti')}\n${mancanti.map((m) => `- ${m.nome} (${m.id}): ${m.testo}`).join('\n')}`,
    testo('messaggio.riparazione'),
  ].join('\n\n');
}

/**
 * Regola comune delle mosse contro lo stallo (`messaggio.solo_finzione`): un EVENTO DEL MONDO, mai un
 * commento sul tavolo. (In una notte di prova il selettore ha detto per ore «nessuno dei PG ha ancora
 * parlato».) Il Motore scarta comunque le frasi fuori dalla finzione (narrazione/finzione.ts).
 */
const soloFinzione = (): string => testo('messaggio.solo_finzione');

/** Modalità B: lo stallo per il selettore (la parola «Stallo», o «Stall», la riconosce il suo prompt). */
export function testoStalloRepertorio(): string {
  return testo('messaggio.stallo_repertorio', { solo_finzione: soloFinzione() });
}

/**
 * Mossa contro lo stallo (manuale, S1–S2): prima un segno di un fronte attivo, poi un indizio
 * proattivo. Mai un «cosa fate?» a vuoto. Dopo due mosse di fila il tavolo va in pausa da solo.
 */
export function testoStallo(volte: number): string {
  const mossa = testo(volte <= 1 ? 'messaggio.mossa_segno' : 'messaggio.mossa_indizio');
  return `${testo('messaggio.titolo_mossa_mondo')}\n${testo('messaggio.mossa_mondo', { mossa, solo_finzione: soloFinzione() })}`;
}
