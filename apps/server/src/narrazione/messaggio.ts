/**
 * Messaggio utente di un turno di narrazione: la parte VARIABILE del prompt
 * (trascrizione pubblica + azioni del turno + chi è al tavolo). Sta fuori dalla cache, dopo i
 * blocchi di sistema stabili (prompts/narratore.md e contesto della campagna).
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
  azioni: AzioneTurno[];
  /** PG presenti al tavolo (scelti da almeno un telefono): solo loro si possono invitare. */
  pgAlTavolo: Array<{ id: string; nome: string }>;
  /** Stato degli orologi attivi, tenuto dal Motore (righe già pronte); vuoto = nessuno. */
  orologi?: string;
  /** Collegamenti tra le azioni del turno (dipendenze, conflitti), righe già pronte. */
  collegamenti?: string[];
  /** Modalità repertorio: fatti scoperti in scena (testo), battute disponibili (righe pronte). */
  repertorio?: { fattiScoperti: string[]; battuteDisponibili: string };
  /** Massimo di voci di trascrizione da includere (le più recenti). */
  maxTrascrizione?: number;
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
    if (d.collegamenti?.length) parti.push('Collegamenti tra le azioni:', d.collegamenti.map((c) => `- ${c}`).join('\n'));
  }

  if (d.orologi) parti.push('## Orologi della scena (stato tenuto dal Motore)', d.orologi);
  if (d.repertorio) {
    if (d.repertorio.fattiScoperti.length) parti.push('## Fatti scoperti in scena (ora li conoscono i PG)', d.repertorio.fattiScoperti.map((f) => `- ${f}`).join('\n'));
    parti.push('## Battute disponibili (id · chi · tipo · quando)', d.repertorio.battuteDisponibili || '(nessuna)');
  }

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
