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
 */
import type { ParolaSegreta } from '../repertorio/segreti';
import type { Repertorio } from '../repertorio/tipi';

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

export function misuraFughe(narrazioni: Array<Record<string, unknown>>, parole: ParolaSegreta[], repertorio: Repertorio | null): Fuga[] {
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
    for (const u of (n['uscita'] as VoceUscita[] | undefined) ?? []) {
      if (u.tipo === 'usa') {
        if (u.per && autoriPrivati.has(u.per)) continue; // detta al telefono: né fuga né rivelazione pubblica
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
