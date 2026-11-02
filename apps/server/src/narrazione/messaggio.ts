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

export function compilaMessaggioTurno(d: DatiMessaggioTurno): string {
  const max = d.maxTrascrizione ?? 60;
  const storia = d.trascrizione.filter((v) => v.turno < d.turno);
  const recenti = storia.slice(-max);
  const righe = recenti.map(rigaTrascrizione).filter((r): r is string => r !== null);
  const tagliate = storia.length - recenti.length;

  const parti: string[] = [];
  parti.push('## Trascrizione pubblica della scena finora');
  if (tagliate > 0) parti.push(`(omesse ${tagliate} voci più vecchie)`);
  parti.push(righe.length ? righe.join('\n') : '(nessuna)');

  parti.push(`## Turno ${d.turno}: azioni dei giocatori`);
  if (d.azioni.length === 0) {
    parti.push('Nessuno ha scritto un’azione: tutti aspettano che succeda qualcosa.');
  } else {
    parti.push(
      d.azioni
        .map((a) => (a.testo ? `- ${a.nome} (${a.id_pg}): ${a.testo}` : `- ${a.nome} (${a.id_pg}): nessuna azione, aspetta.`))
        .join('\n'),
    );
  }

  if (d.orologi) parti.push('## Orologi della scena (stato tenuto dal Motore)', d.orologi);

  const tavolo = d.pgAlTavolo.map((p) => `${p.nome} (${p.id})`).join(', ');
  parti.push(`PG al tavolo: ${tavolo || '(nessuno)'}.`);
  parti.push(
    'Narra ciò che succede ora. Rispondi solo con righe etichettate; ' +
      'l’ultima riga è [invito] con gli id dei PG al tavolo che devono rispondere, oppure tutti.',
  );
  return parti.join('\n\n');
}
