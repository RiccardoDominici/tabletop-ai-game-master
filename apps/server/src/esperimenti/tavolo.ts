/**
 * «Che cosa ha sentito e visto il tavolo»: la trascrizione per il giudice cieco (tavolo.md).
 *
 * Fonte: la trascrizione PUBBLICA che il server manda al proiettore in ogni `stato` (le righe
 * dette ad alta voce dal narratore e dai PNG, le azioni pubbliche dei PG come compaiono sullo
 * schermo, gli avvisi di sistema come «Nuova scena: …»). Le azioni private non sono lì: si
 * prendono dal registro delle narrazioni e si scrivono marcate come private, dove sono avvenute.
 * Niente id, niente `[usa]`, niente note pre-scritto/improvvisato: quelle restano in trascrizione.md.
 *
 * Lo stato porta solo le ultime N voci (TAGM_TRASCRIZIONE_MAX) e il Motore può spostare
 * righe dentro il turno in corso (il segno d'orologio prima dell'invito): l'osservatore tiene
 * quindi, per ogni turno, l'ordine dell'ultima istantanea che lo conteneva tutto.
 */
import type { Socket } from 'socket.io-client';
import type { EventiClientVersoServer, EventiServerVersoClient, StatoTavolo, VoceTrascrizione } from '@tabletop-ai-gm/shared';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;

export interface AzionePrivata {
  turno: number;
  nome: string;
  testo: string;
}

export class OsservatoreTavolo {
  private readonly voci = new Map<number, VoceTrascrizione>();
  private readonly ordine = new Map<number, number[]>();
  /** Per turno: id già visti quando il copione ha chiuso la finestra (le private vanno dopo). */
  private readonly segni = new Map<number, Set<number>>();

  constructor(socket: Client) {
    socket.on('stato', (s) => this.unisci(s));
  }

  /** Unisce un'istantanea della trascrizione pubblica. */
  unisci(s: StatoTavolo): void {
    const perTurno = new Map<number, number[]>();
    for (const v of s.trascrizione) {
      this.voci.set(v.id, { ...v });
      const lista = perTurno.get(v.turno) ?? [];
      lista.push(v.id);
      perTurno.set(v.turno, lista);
    }
    for (const [turno, ids] of perTurno) {
      const noti = this.ordine.get(turno) ?? [];
      const presenti = new Set(ids);
      // Istantanea completa del turno: il suo ordine è quello buono (anche dopo uno spostamento).
      if (noti.every((id) => presenti.has(id))) this.ordine.set(turno, ids);
      // Istantanea tagliata in testa: si aggiungono solo le voci nuove, in coda.
      else this.ordine.set(turno, [...noti, ...ids.filter((id) => !noti.includes(id))]);
    }
  }

  /** Il copione sta per chiudere la finestra del turno: ciò che arriva dopo è la risposta. */
  segnaChiusura(turno: number): void {
    this.segni.set(turno, new Set(this.ordine.get(turno) ?? []));
  }

  /** Voci per turno, nell'ordine in cui sono state viste sullo schermo. */
  turni(): Array<{ turno: number; voci: VoceTrascrizione[]; dopoChiusura: (v: VoceTrascrizione) => boolean }> {
    return [...this.ordine.keys()]
      .sort((a, b) => a - b)
      .map((turno) => {
        const segno = this.segni.get(turno);
        return {
          turno,
          voci: this.ordine.get(turno)!.map((id) => this.voci.get(id)!),
          dopoChiusura: (v: VoceTrascrizione) => (segno ? !segno.has(v.id) : false),
        };
      });
  }
}

/** Azioni private (dal registro delle narrazioni di questa sessione), coi nomi dei PG. */
export function azioniPrivate(narrazioni: Array<Record<string, unknown>>, nomePg: (id: string) => string): AzionePrivata[] {
  const out: AzionePrivata[] = [];
  for (const n of narrazioni) {
    if (n['tipo'] !== 'turno') continue;
    for (const a of (n['azioni'] as Array<{ id_pg: string; testo: string | null; privata?: boolean }>) ?? []) {
      if (a.privata && a.testo) out.push({ turno: Number(n['turno']), nome: nomePg(a.id_pg), testo: a.testo });
    }
  }
  return out;
}

const pulisci = (t: string): string => t.replace(/\s+/g, ' ').trim();

function riga(v: VoceTrascrizione): string {
  switch (v.tipo) {
    case 'azione':
      return `**${v.nome}** (giocatore): ${pulisci(v.testo)}`;
    case 'sistema':
      return `*Sullo schermo: ${pulisci(v.testo)}*`;
    default:
      return `**${v.nome}:** ${pulisci(v.testo)}`;
  }
}

/** Il file per il giudice: solo ciò che il tavolo ha sentito e visto, turno per turno. */
export function testoTavolo(oss: OsservatoreTavolo, private_: AzionePrivata[]): string {
  const out: string[] = [
    '# Al tavolo',
    '',
    'Ciò che i giocatori hanno sentito e visto, nell’ordine: le righe dette ad alta voce dal narratore e dai personaggi, le azioni dei giocatori come compaiono sullo schermo, gli avvisi dello schermo. Le azioni private le conoscono solo chi le ha scritte e il narratore: sono marcate «azione privata».',
    '',
  ];
  const turni = oss.turni();
  const turniConPrivate = new Set(private_.map((p) => p.turno));
  // Un turno con sole azioni private e senza voci pubbliche ha comunque il suo blocco.
  for (const t of turniConPrivate) if (!turni.some((x) => x.turno === t)) turni.push({ turno: t, voci: [], dopoChiusura: () => false });
  turni.sort((a, b) => a.turno - b.turno);
  for (const { turno, voci, dopoChiusura } of turni) {
    out.push(turno === 0 ? '## Apertura' : `## Turno ${turno}`, '');
    const priv = private_.filter((p) => p.turno === turno).map((p) => `**${p.nome}** (giocatore, *azione privata*): ${pulisci(p.testo)}`);
    // Le private entrano tra le azioni pubbliche e la risposta: prima della prima riga detta dopo la chiusura.
    let inserite = priv.length === 0;
    for (const v of voci) {
      if (!inserite && v.tipo !== 'azione' && v.tipo !== 'sistema' && dopoChiusura(v)) {
        out.push(...priv.flatMap((p) => [p, '']));
        inserite = true;
      }
      out.push(riga(v), '');
    }
    if (!inserite) out.push(...priv.flatMap((p) => [p, '']));
  }
  return out.join('\n');
}
