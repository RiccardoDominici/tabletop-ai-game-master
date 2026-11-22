/**
 * Creation at the table (docs/creazione.md; mechanism M7): the drafts of every phone, their actions, the Game Master's
 * approvals, and the approved PC joining the campaign. One draft per phone (its device token). Every change is saved in
 * the store (creazione/archivio.ts), so a restart or a rebuild of the server finds the drafts again.
 *
 * The approved PC is written as a pg.yaml entry in `pg-creati/`; the server then rebuilds itself on the same session
 * package (ciclo-server.ts, the path a restart already takes: the session in progress resumes from its snapshot), so the
 * PC is in every part of the game at once — the table's list, the Engine's sheets, the narrator's context, the log's
 * `pg_alla_fine` — and the next sessions load it like any PC. The rebuild waits for a quiet moment (no turn in flight,
 * no action in the open window), since a restart drops those.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { AzioneCreazione, ComandoMaster, CreazioneMaster, EsitoCreazione, VistaCreazione } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { DadiCrittografici, type FonteDadi } from '../prove/dadi';
import { cancellaBozza, leggiBozze, scriviBozza, scriviPgCreato } from './archivio';
import { annullaPasso, applica, avanza } from './azioni';
import { nuovaBozza, type Bozza, type CtxCreazione } from './bozza';
import { vistaBozza, vistaMaster } from './vista';
import { idPgDa, voceDelPg } from './voce';

export const DISPOSITIVO_CREAZIONE = /^[A-Za-z0-9_-]{8,64}$/;

export interface OpzioniServizioCreazione {
  ctx: CtxCreazione;
  /** The store: `pg-creati/` of the play folder (creazione/archivio.ts). */
  cartella: string;
  /** Every PC id the campaign has now (pg.yaml and the store): a new id never takes one. */
  idPresi: () => ReadonlySet<string>;
  log: Logger;
  /** The session's fixed dice seed (TAGM_SEME_DADI), so a test run's drafts roll the same; null = a random seed each. */
  semeFisso?: string | null;
  /** Why the server cannot rebuild now (a turn in flight, actions in the open window), or null. */
  momentoTranquillo: () => string | null;
  /** Rebuilds the server on the same package: the approved PC joins. Null = it joins at the next start. */
  ricarica: (() => void) | null;
  /** A draft changed by someone else than its phone (the Game Master): to the phone and the panel. */
  notifica: (dispositivo: string, vista: VistaCreazione) => void;
  /** The panel must see the drafts again. */
  aggiornaPannello: () => void;
  adesso?: () => Date;
}

export type EsitoComandoCreazione = { ok: true; dettagli: string } | { ok: false; errore: string };

export class ServizioCreazione {
  private readonly bozze = new Map<string, Bozza>();
  /** The phones whose approved PC is now in the campaign (the server binds each to its PC: it takes it at reconnection). */
  readonly entrati: Array<{ dispositivo: string; idPg: string }> = [];

  constructor(private readonly o: OpzioniServizioCreazione) {
    for (const b of leggiBozze<Bozza>(o.cartella, (m) => o.log.warn({ m }, 'creation: a draft file is unreadable'))) {
      // An approved draft whose PC the campaign now has has done its job (the rebuild after the approval).
      if (b.stato === 'approvata' && b.idPg && o.idPresi().has(b.idPg)) {
        this.entrati.push({ dispositivo: b.dispositivo, idPg: b.idPg });
        cancellaBozza(o.cartella, b.id);
        o.log.info({ bozza: b.id, pg: b.idPg }, 'creation: the approved PC is in the campaign, its draft is closed');
        continue;
      }
      this.bozze.set(b.id, b);
    }
    if (this.bozze.size) o.log.info({ bozze: [...this.bozze.values()].map((b) => ({ id: b.id, stato: b.stato })) }, 'creation: drafts found again');
  }

  private get ctx(): CtxCreazione {
    return this.o.ctx;
  }

  private adesso(): Date {
    return this.o.adesso?.() ?? new Date();
  }

  private diDispositivo(d: string): Bozza | undefined {
    return [...this.bozze.values()].find((b) => b.dispositivo === d);
  }

  private salva(b: Bozza): void {
    scriviBozza(this.o.cartella, b.id, b);
  }

  /** The draft's own dice (never the session's): its seed and counter, saved with it. */
  private dadiDi(b: Bozza): () => FonteDadi {
    return () => new DadiCrittografici(b.seme, b.contatore);
  }

  /** The draft of a phone, as it sees it (null = it has none). */
  vistaDi(dispositivo: string): VistaCreazione | null {
    const b = this.diDispositivo(dispositivo);
    return b ? vistaBozza(this.ctx, b) : null;
  }

  /** Every draft, for the Game Master's panel (the approved ones until the PC joins). */
  vistaMaster(): CreazioneMaster[] {
    return [...this.bozze.values()].map((b) => vistaMaster(this.ctx, b));
  }

  /** One action of a phone on its draft (`creazione:azione`). */
  azione(dispositivo: string, a: AzioneCreazione): EsitoCreazione {
    if (!DISPOSITIVO_CREAZIONE.test(dispositivo)) return { ok: false, errore: testo('creazione.rifiuti.telefono'), bozza: null };
    let b = this.diDispositivo(dispositivo);
    if (!b) {
      if (a?.tipo !== 'inizia') return { ok: false, errore: testo('creazione.rifiuti.nessuna_bozza'), bozza: null };
      const id = `cr_${randomBytes(4).toString('hex')}`;
      const seme = this.o.semeFisso ? createHash('sha256').update(`${this.o.semeFisso}|creazione|${dispositivo}`).digest('hex').slice(0, 32) : randomBytes(16).toString('hex');
      b = nuovaBozza(id, dispositivo, seme, this.adesso());
      avanza(this.ctx, b);
      this.bozze.set(id, b);
      this.salva(b);
      this.o.log.info({ bozza: id, telefono: dispositivo.slice(0, 6), manuale: this.ctx.manuale, livello: this.ctx.opz.livello ?? this.ctx.cr.livello }, 'creation: a phone starts a PC');
      this.o.aggiornaPannello();
      return { ok: true, bozza: vistaBozza(this.ctx, b) };
    }
    if (!a || typeof a !== 'object' || typeof (a as { tipo?: unknown }).tipo !== 'string') return { ok: false, errore: testo('creazione.rifiuti.azione_sconosciuta'), bozza: vistaBozza(this.ctx, b) };
    const e = applica(this.ctx, b, a, this.dadiDi(b));
    if (!e.ok) {
      this.o.log.info({ bozza: b.id, azione: a.tipo, motivo: e.errore }, 'creation: action refused');
      return { ok: false, errore: e.errore, bozza: vistaBozza(this.ctx, b) };
    }
    this.salva(b);
    this.o.log.info({ bozza: b.id, azione: a.tipo, ...(a.tipo === 'tira' ? { dadi: b.tiri.at(-1)?.dadi, per: b.tiri.at(-1)?.per, manuale: this.ctx.manuale } : {}), ...(a.tipo === 'scegli' ? { [a.passo]: a.id } : {}), stato: b.stato }, 'creation: action');
    this.o.aggiornaPannello();
    return { ok: true, bozza: vistaBozza(this.ctx, b) };
  }

  /** The Game Master's command (`{tipo: 'creazione'}`): approve or undo a step, approve the PC, discard, give spells. */
  comando(c: Extract<ComandoMaster, { tipo: 'creazione' }>): EsitoComandoCreazione {
    const b = typeof c.id === 'string' ? this.bozze.get(c.id) : undefined;
    if (!b) return { ok: false, errore: testo('creazione.rifiuti.bozza_sconosciuta') };
    const passo = c.passo && this.ctx.cr.passi.includes(c.passo) ? c.passo : null;
    let dettagli: string;
    switch (c.azione) {
      case 'approva_passo':
        if (!passo || b.passi[passo] === undefined) return { ok: false, errore: testo('creazione.rifiuti.passo_non_fatto') };
        b.passi[passo] = 'approvato';
        dettagli = testo('creazione.master.passo_approvato', { passo: testo(`creazione.passi.${passo}`), bozza: this.nome(b) });
        break;
      case 'annulla_passo':
        if (!passo || b.stato === 'approvata') return { ok: false, errore: testo('creazione.rifiuti.passo_non_fatto') };
        annullaPasso(this.ctx, b, passo, true);
        avanza(this.ctx, b);
        dettagli = testo('creazione.master.passo_annullato', { passo: testo(`creazione.passi.${passo}`), bozza: this.nome(b) });
        break;
      case 'incantesimi': {
        if (!Array.isArray(c.libro) || b.stato === 'approvata') return { ok: false, errore: testo('creazione.rifiuti.incantesimi_forma') };
        const prima = [...b.libro];
        b.libro = c.libro.filter((x): x is string => typeof x === 'string');
        // The book is checked with the player's preparation (the same rules); nothing is kept when it is not legal.
        const e = applica(this.ctx, b, { tipo: 'incantesimi', libro: b.libro, preparati: [] }, this.dadiDi(b));
        if (!e.ok) {
          b.libro = prima;
          return { ok: false, errore: e.errore };
        }
        delete b.passi.incantesimi;
        avanza(this.ctx, b);
        dettagli = testo('creazione.master.incantesimi', { bozza: this.nome(b) });
        break;
      }
      case 'scarta':
        this.bozze.delete(b.id);
        cancellaBozza(this.o.cartella, b.id);
        this.o.log.info({ bozza: b.id }, 'creation: draft discarded by the Game Master');
        this.o.aggiornaPannello();
        return { ok: true, dettagli: testo('creazione.master.scartata', { bozza: this.nome(b) }) };
      case 'approva':
        return this.approva(b);
      default:
        return { ok: false, errore: testo('creazione.rifiuti.azione_sconosciuta') };
    }
    this.salva(b);
    this.o.log.info({ bozza: b.id, azione: c.azione, passo }, 'creation: the Game Master changed a draft');
    this.o.notifica(b.dispositivo, vistaBozza(this.ctx, b));
    this.o.aggiornaPannello();
    return { ok: true, dettagli };
  }

  /** The finished PC joins the campaign: written to the store, then the server rebuilds on the same package. */
  private approva(b: Bozza): EsitoComandoCreazione {
    if (b.stato === 'approvata') return { ok: false, errore: testo('creazione.rifiuti.approvata') };
    if (b.stato !== 'pronta') return { ok: false, errore: testo('creazione.rifiuti.non_finita') };
    const vista = vistaBozza(this.ctx, b);
    const gravi = vista.problemi.filter((p) => p.grave);
    if (gravi.length) return { ok: false, errore: testo('creazione.rifiuti.illegale', { problemi: gravi.map((p) => p.testo).join('; ') }) };
    const occupato = this.o.momentoTranquillo();
    if (occupato) return { ok: false, errore: occupato };
    const adesso = this.adesso();
    const id = idPgDa(b.descrizione.nome, new Set([...this.o.idPresi(), ...[...this.bozze.values()].flatMap((x) => (x.idPg ? [x.idPg] : []))]));
    const voce = voceDelPg(this.ctx, b, id, adesso);
    const file = scriviPgCreato(this.o.cartella, voce, testo('creazione.intestazione', { quando: adesso.toISOString().slice(0, 16).replace('T', ' ') }));
    b.stato = 'approvata';
    b.idPg = id;
    for (const p of this.ctx.cr.passi) b.passi[p] = 'approvato';
    this.salva(b);
    this.o.log.info({ bozza: b.id, pg: id, file, ricarica: !!this.o.ricarica }, 'creation: PC approved and written; the server rebuilds so it joins');
    this.o.notifica(b.dispositivo, vistaBozza(this.ctx, b));
    this.o.aggiornaPannello();
    this.o.ricarica?.();
    return { ok: true, dettagli: testo(this.o.ricarica ? 'creazione.master.approvato' : 'creazione.master.approvato_al_riavvio', { nome: b.descrizione.nome, pg: id }) };
  }

  private nome(b: Bozza): string {
    return b.descrizione.nome || testo('creazione.master.senza_nome', { telefono: b.dispositivo.slice(0, 6) });
  }
}
