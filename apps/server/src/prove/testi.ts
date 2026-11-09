/**
 * Parole delle prove: etichette delle carte e righe di fatto per il narratore (docs/prove.md,
 * «Narrazione»). Il narratore riceve l'esito come un fatto già deciso e ne racconta la conseguenza;
 * i numeri gli servono per misurare il margine, non si leggono a voce (lo dice il prompt).
 */
import type { TiroMostrato } from '@cantastorie/shared';
import { NOME_ABILITA, NOME_CARATTERISTICA, CARATTERISTICA_DI, type Abilita, type Caratteristica } from '../campagna/regole-srd';

export function etichettaProva(abilita: Abilita | null, caratteristica: Caratteristica | null): string {
  if (abilita) return `${NOME_ABILITA[abilita]} (${NOME_CARATTERISTICA[CARATTERISTICA_DI[abilita]]})`;
  return `Prova di ${NOME_CARATTERISTICA[caratteristica ?? 'forza']}`;
}

export function etichettaSalvezza(c: Caratteristica): string {
  return `Tiro salvezza su ${NOME_CARATTERISTICA[c]}`;
}

/** Stato di salute in parole, dai punti ferita (per il narratore: niente numeri dei PNG a voce). */
export function salute(attuali: number, massimi: number): string {
  if (attuali <= 0) return 'è A TERRA (0 punti ferita): fuori combattimento';
  if (attuali * 2 > massimi) return 'è ferito ma regge';
  return 'è ferito gravemente';
}

/** Tipo di danno al plurale dopo «danni» (tipi dell'SRD 5.2): «danni perforanti», «danni da fuoco». */
const PLURALE_DANNO: Record<string, string> = {
  acido: 'da acido',
  contundente: 'contundenti',
  freddo: 'da freddo',
  fuoco: 'da fuoco',
  forza: 'da forza',
  fulmine: 'da fulmine',
  necrotico: 'necrotici',
  perforante: 'perforanti',
  psichico: 'psichici',
  radioso: 'radiosi',
  tagliente: 'taglienti',
  tuono: 'da tuono',
  veleno: 'da veleno',
};

export function tipoDanno(tipo: string): string {
  const k = tipo.trim().toLowerCase();
  return PLURALE_DANNO[k] ?? (k.endsWith('e') ? `${k.slice(0, -1)}i` : k);
}

function vantaggioTesto(t: TiroMostrato): string {
  if (!t.vantaggio) return '';
  return ` (con ${t.vantaggio}${t.motivo_vantaggio ? `: ${t.motivo_vantaggio}` : ''})`;
}

/** «17 contro CD 15» / «19 contro CA 12». */
function confronto(t: TiroMostrato): string {
  return `${t.totale} contro ${t.contro.tipo} ${t.contro.valore}`;
}

/** Una carta di tiro come riga di fatto (senza il nome dell'autore all'inizio). */
export function fattoTiro(t: TiroMostrato, saluteBersaglio: string | null): string {
  switch (t.tipo) {
    case 'attacco': {
      const verso = t.bersaglio ? ` a ${t.bersaglio.nome}` : '';
      if (!t.riuscita) return `attacco con ${t.etichetta}${verso}${vantaggioTesto(t)}: ${confronto(t)}${t.fallimento_critico ? ' (1 naturale)' : ''} → MANCATO.`;
      const d = t.danno;
      const danno = d ? `, ${d.totale} ${d.totale === 1 ? 'danno' : 'danni'}${d.tipo ? ` ${d.totale === 1 ? d.tipo : tipoDanno(d.tipo)}` : ''}` : '';
      const stato = saluteBersaglio && t.bersaglio ? `; ${t.bersaglio.nome} ${saluteBersaglio}` : '';
      return `attacco con ${t.etichetta}${verso}${vantaggioTesto(t)}: ${confronto(t)} → COLPITO${t.critico ? ' (colpo critico)' : ''}${danno}${stato}.`;
    }
    case 'salvezza':
      return `${t.etichetta.toLowerCase()}${vantaggioTesto(t)}: ${confronto(t)} → ${t.riuscita ? 'RIUSCITO' : 'FALLITO'}.`;
    case 'contrapposta': {
      if (t.avversario) {
        const esito = t.riuscita ? 'VINCE' : t.totale === t.avversario.totale ? 'PARI: nessuno prevale, la situazione resta com’era' : 'PERDE';
        return `${t.etichetta} contro ${t.avversario.etichetta} di ${t.avversario.nome}${vantaggioTesto(t)}: ${t.totale} contro ${t.avversario.totale} → ${esito}.`;
      }
      const contro = t.contro.descrizione ? ` contro ${t.contro.descrizione}` : '';
      return `${t.etichetta}${contro}${vantaggioTesto(t)}: ${confronto(t)} → ${t.riuscita ? 'RIUSCITA' : 'FALLITA'}.`;
    }
    case 'prova': {
      const verso = t.bersaglio ? ` verso ${t.bersaglio.nome}` : '';
      return `${t.etichetta}${verso}${vantaggioTesto(t)}: ${confronto(t)} → ${t.riuscita ? 'RIUSCITA' : 'FALLITA'}.`;
    }
  }
}

export const FATTO_NESSUN_TIRO = 'nessun tiro: l’azione riesce se è possibile.';
export const FATTO_SENZA_SCHEDA = 'servirebbe un tiro, ma manca la scheda: nessun tiro, risolvi con un «sì, ma».';
export const FATTO_SENZA_ARBITRO = 'nessun tiro deciso (arbitro non disponibile): un’azione possibile riesce, una rischiosa riesce con un prezzo.';

export function fattoImpossibile(motivo: string): string {
  return `impossibile così, nessun tiro${motivo ? ` (${motivo.replace(/[.\s]+$/, '')})` : ''}: non riesce come scritta; dillo dentro la finzione, con un «sì, ma» se c'è una strada vicina.`;
}

export function fattoAiuto(aiutato: string | null): string {
  return aiutato ? `aiuta ${aiutato}: nessun tiro, l'altro ha vantaggio.` : 'aiuta, ma non c’è un’azione da aiutare in questo turno: nessun tiro.';
}

export function fattoGiaATerra(nome: string): string {
  return `${nome} è già a terra: nessun tiro, l’azione riesce.`;
}

/** Intestazione della sezione nel messaggio del narratore. */
export const TITOLO_ESITI = '## Esiti dei tiri (li ha tirati il Motore: sono fatti, raccontali così)';
export const REGOLA_ESITI =
  'Ogni esito è già deciso: riuscita, l’azione riesce; fallita o mancato, non riesce, ma la scena cambia (un prezzo, una complicazione, un’informazione). ' +
  'Non cambiare mai un esito, non dire numeri, dadi o CD a voce, non chiedere altri tiri.';
