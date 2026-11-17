/**
 * Metrica delle fughe di segreti per l'esperimento A/B (definizione in parole_segrete.yaml):
 * una riga del narratore o di un PNG che contiene una parola segreta è una FUGA se, prima di
 * quella riga, non è uscito nessuno degli id di `pubblica_dopo` (battuta usata o indizio rivelato
 * da una battuta) e nessun giocatore ha scritto quella parola in un'azione PUBBLICA. Le righe dei
 * giocatori non contano mai. Le righe di una battuta valgono come dette DOPO l'uscita della
 * battuta stessa (la battuta è la rivelazione).
 *
 * Ciò che resta privato non rende pubblico niente e non è una fuga (giudizio nozze-neve 2): un'azione
 * privata, una battuta detta a un'azione privata, una riga `[privato pg_x]` li sente solo quel PG.
 *
 * In modo A non ci sono battute: resta solo la regola dei giocatori (conteggio grezzo).
 *
 * Una battuta di RILASCIO uscita per un'azione che non le è pertinente (`fuoriContesto`, E2E finale B2) non
 * rende pubblico niente: non è una rivelazione, quindi le sue righe con la parola segreta sono fughe. Senza
 * questa regola la misura contava come legittime proprio le righe che avevano rivelato il segreto.
 */
import type { ParolaSegreta } from '../repertorio/segreti';
import type { Repertorio } from '../repertorio/tipi';
import { èRilascio, motivoFuoriContesto } from '../repertorio/rilascio';

export interface Fuga {
  turno: number;
  origine: 'improvvisata' | 'prescritta';
  battuta?: string;
  etichetta: string;
  riga: string;
  parola: string;
}

type VoceUscita =
  | { tipo: 'usa'; id: string; per?: string | null; righe: Array<{ etichetta: string; testo: string }> }
  | { tipo: 'usa_rifiutato'; id: string }
  | { tipo: 'improvvisata'; etichetta: string; testo: string; privato?: string };

/**
 * `fuoriContesto(idBattuta, testoAzione)`: true se la battuta di rilascio è uscita per un'azione che non le è
 * pertinente (la misura è in repertorio/rilascio.ts). Senza, si comporta come prima.
 */
export type FuoriContesto = (idBattuta: string, testoAzione: string) => boolean;

export function misuraFughe(
  narrazioni: Array<Record<string, unknown>>,
  parole: ParolaSegreta[],
  repertorio: Repertorio | null,
  fuoriContesto?: FuoriContesto,
): Fuga[] {
  const usate = new Set<string>();
  const indizi = new Set<string>();
  let detteDaiGiocatori = '';
  const fughe: Fuga[] = [];
  const pubblica = (p: ParolaSegreta): boolean =>
    p.pubblica_dopo.some((id) => usate.has(id) || indizi.has(id)) || p.regex.test(detteDaiGiocatori);
  const controlla = (turno: number, etichetta: string, testo: string, origine: Fuga['origine'], battuta?: string): void => {
    const t = testo.toLowerCase();
    for (const p of parole) {
      if (p.regex.test(t) && !pubblica(p)) fughe.push({ turno, origine, ...(battuta ? { battuta } : {}), etichetta, riga: testo, parola: p.parola });
    }
  };
  for (const n of narrazioni) {
    if (n['tipo'] !== 'turno') continue;
    const turno = Number(n['turno']);
    const azioni = (n['azioni'] as Array<{ id_pg?: string; testo: string | null; privata?: boolean }>) ?? [];
    const autoriPrivati = new Set(azioni.filter((a) => a.privata && a.id_pg).map((a) => a.id_pg!));
    for (const a of azioni) if (a.testo && !a.privata) detteDaiGiocatori += `\n${a.testo.toLowerCase()}`;
    const testoDi = new Map(azioni.filter((a) => a.id_pg && a.testo).map((a) => [a.id_pg!, a.testo!]));
    for (const u of (n['uscita'] as VoceUscita[] | undefined) ?? []) {
      if (u.tipo === 'usa') {
        if (u.per && autoriPrivati.has(u.per)) continue; // detta al telefono: né fuga né rivelazione pubblica
        // Rilascio uscito per un'azione che non gli è pertinente: le sue righe sono fughe, non rivelazioni.
        if (fuoriContesto && u.per && fuoriContesto(u.id, testoDi.get(u.per) ?? '')) {
          for (const r of u.righe) controlla(turno, r.etichetta, r.testo, 'prescritta', u.id);
          continue;
        }
        usate.add(u.id);
        for (const i of repertorio?.perId.get(u.id)?.effetti.rivela_indizi ?? []) indizi.add(i);
        for (const r of u.righe) controlla(turno, r.etichetta, r.testo, 'prescritta', u.id);
      } else if (u.tipo === 'improvvisata') {
        if (u.privato) continue;
        controlla(turno, u.etichetta, u.testo, 'improvvisata');
      }
    }
  }
  return fughe;
}

/**
 * La regola di misuraFughe sul repertorio: una battuta di rilascio (èRilascio, non riempitiva) è fuori contesto
 * se la sua pertinenza (motivoFuoriContesto) non regge per il testo dell'azione. Senza repertorio: nessuna.
 */
export function fuoriContestoDi(repertorio: Repertorio | null, nomiPng: Map<string, string[]>): FuoriContesto | undefined {
  if (!repertorio) return undefined;
  return (id, azione) => {
    const b = repertorio.perId.get(id);
    return !!b && èRilascio(b) && !b.riempitivo && motivoFuoriContesto(b, azione, nomiPng) !== null;
  };
}

/** Un rilascio uscito per un'azione che non gli è pertinente (E2E finale, B2). */
export interface RivelazioneFuoriContesto {
  turno: number;
  battuta: string;
  tipo: string;
  per: string;
  azione: string;
  motivo: string;
}

/**
 * Rivelazioni fuori contesto: le fughe che misuraFughe non vede. Una confessione detta per l'azione
 * sbagliata non ha parole segrete «prima del tempo», perché il suo id è proprio in `pubblica_dopo`, ma ha
 * svelato a chi non l'aveva chiesto. Conta ogni battuta di rilascio (repertorio/rilascio.ts) uscita con
 * «> pg» per un'azione che non le è pertinente; le battute del Motore e quelle d'attesa non contano.
 */
export function rivelazioniFuoriContesto(narrazioni: Array<Record<string, unknown>>, repertorio: Repertorio | null, nomiPng: Map<string, string[]>): RivelazioneFuoriContesto[] {
  if (!repertorio) return [];
  const out: RivelazioneFuoriContesto[] = [];
  for (const n of narrazioni) {
    if (n['tipo'] !== 'turno') continue;
    const azioni = new Map(((n['azioni'] as Array<{ id_pg?: string; testo: string | null }>) ?? []).filter((a) => a.id_pg && a.testo).map((a) => [a.id_pg!, a.testo!]));
    for (const u of ((n['uscita'] as Array<{ tipo: string; id?: string; per?: string | null; motore?: boolean }>) ?? [])) {
      if (u.tipo !== 'usa' || !u.id || !u.per || u.motore) continue;
      const b = repertorio.perId.get(u.id);
      if (!b || !èRilascio(b) || b.riempitivo) continue;
      const azione = azioni.get(u.per) ?? '';
      const motivo = motivoFuoriContesto(b, azione, nomiPng);
      if (motivo) out.push({ turno: Number(n['turno']), battuta: b.id, tipo: b.tipo, per: u.per, azione, motivo });
    }
  }
  return out;
}
