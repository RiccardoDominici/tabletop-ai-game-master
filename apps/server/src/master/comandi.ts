/**
 * Comandi del pannello del master: validazione (il client non è fidato), effetto sulla regia e
 * registro. Ogni comando, riuscito o rifiutato, diventa un evento:
 *   - una riga in logs/master.jsonl (append-only, per rivedere la sessione);
 *   - una riga nel log strutturato del server (`evento: 'master'`);
 *   - una voce negli ultimi eventi mostrati dal pannello.
 */
import type { ComandoMaster, Esito, EventoMaster, StatoMaster, TipoComandoMaster } from '@cantastorie/shared';
import type { CatalogoImmagini } from '../campagna/immagini';
import type { CatalogoAudio } from '../audio/catalogo';
import type { Campagna } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { RegistroJsonl } from '../metriche/jsonl';
import type { Regia } from '../scena/regia';
import type { CicloSessioni } from '../sessione/ciclo';
import { luoghiMaster, statoMaster } from './vista';

export interface OpzioniControlliMaster {
  regia: Regia;
  /** Fine sessione / prossima sessione; assente = comandi rifiutati (test che non lo usano). */
  ciclo?: CicloSessioni;
  campagna: Campagna;
  immagini?: CatalogoImmagini;
  /** Catalogo audio: umori ed effetti che il master può comandare. */
  audio?: CatalogoAudio;
  /** Manda un effetto al proiettore (stanza «schermo»). */
  suonaEffetto?: (id: string) => void;
  registro: RegistroJsonl;
  log: Logger;
  /** Eventi tenuti per il pannello (i più recenti). */
  maxEventi?: number;
}

const TIPI: ReadonlySet<TipoComandoMaster> = new Set<TipoComandoMaster>([
  'pausa',
  'riprendi',
  'ferma_narrazione',
  'luogo',
  'scena',
  'situazione',
  'orologio',
  'chiudi_finestra',
  'salta_azione',
  'nota',
  'togli_nota',
  'umore',
  'nuova_sessione',
  'effetto',
  'fine_sessione',
  'prossima_sessione',
  'dispositivo',
]);

/** Comandi che non lasciano stato da salvare dopo (un effetto) o lo salvano da sé (sessioni). */
const SENZA_SALVATAGGIO: ReadonlySet<TipoComandoMaster> = new Set<TipoComandoMaster>(['effetto', 'nuova_sessione', 'fine_sessione', 'prossima_sessione']);

/** Id semplici (luoghi, orologi, azioni, note, immagini): niente sorprese nei log. */
const ID_VALIDO = /^[A-Za-z0-9_]{1,80}$/;

type Risultato = { esito: Esito; dettagli: string; dati?: Record<string, unknown> };

const rifiuto = (errore: string, dettagli = errore): Risultato => ({ esito: { ok: false, errore }, dettagli: `rifiutato: ${dettagli}` });

export class ControlliMaster {
  private readonly eventi: EventoMaster[] = [];
  private readonly max: number;

  constructor(private readonly o: OpzioniControlliMaster) {
    this.max = o.maxEventi ?? 40;
  }

  /** Istantanea completa per il pannello. */
  stato(): StatoMaster {
    return statoMaster({ regia: this.o.regia, campagna: this.o.campagna, immagini: this.o.immagini, audio: this.o.audio, eventi: this.eventi, ...(this.o.ciclo ? { ciclo: this.o.ciclo } : {}) });
  }

  /** Esegue un comando del pannello e lo registra come evento. `origine`: id del socket. */
  esegui(grezzo: unknown, origine: string): Esito {
    const tipo = (grezzo as { tipo?: unknown } | null)?.tipo;
    if (typeof tipo !== 'string' || !TIPI.has(tipo as TipoComandoMaster)) {
      this.o.log.warn({ evento: 'master', origine, tipo: typeof tipo === 'string' ? tipo.slice(0, 40) : typeof tipo }, 'master: comando sconosciuto');
      return { ok: false, errore: 'Comando sconosciuto.' };
    }
    const comando = grezzo as ComandoMaster;
    let r: Risultato;
    try {
      r = this.applica(comando);
    } catch (err) {
      this.o.log.error({ evento: 'master', origine, comando: comando.tipo, err: (err as Error).message }, 'master: comando fallito');
      r = rifiuto('Errore interno del server.', (err as Error).message);
    }
    this.registra(comando.tipo, r, origine);
    // Il comando ha cambiato lo stato del gioco: subito nel registro della sessione (un effetto
    // sonoro non lascia stato; i comandi di sessione salvano da sé).
    if (r.esito.ok && !SENZA_SALVATAGGIO.has(comando.tipo)) this.o.regia.salvaDopoComando(comando.tipo);
    return r.esito;
  }

  /**
   * Segnale audio deciso dal Motore (riga [umore]/[effetto] del narratore, audio di una battuta,
   * umore scartato dal limite): entra nel registro come un comando, marcato «automatico». I pulsanti
   * del pannello restano la scelta manuale che lo scavalca.
   */
  registraAutomatico(e: { comando: 'umore' | 'effetto'; ok: boolean; dettagli: string }): void {
    const evento: EventoMaster = { ts: new Date().toISOString(), comando: e.comando, ok: e.ok, dettagli: e.dettagli, automatico: true };
    this.eventi.push(evento);
    if (this.eventi.length > this.max) this.eventi.splice(0, this.eventi.length - this.max);
    const turno = this.o.regia.turnoCorrente;
    this.o.registro.scrivi({ ...evento, turno, origine: 'motore' });
    this.o.log.info({ evento: 'master', comando: e.comando, ok: e.ok, dettagli: e.dettagli, turno, automatico: true }, `audio automatico: ${e.comando}`);
  }

  private registra(comando: TipoComandoMaster, r: Risultato, origine: string): void {
    const evento: EventoMaster = { ts: new Date().toISOString(), comando, ok: r.esito.ok, dettagli: r.dettagli };
    this.eventi.push(evento);
    if (this.eventi.length > this.max) this.eventi.splice(0, this.eventi.length - this.max);
    const turno = this.o.regia.turnoCorrente;
    this.o.registro.scrivi({ ...evento, turno, fase: this.o.regia.stato().fase, origine, ...(r.dati ?? {}) });
    const riga = { evento: 'master', comando, ok: r.esito.ok, dettagli: r.dettagli, turno, origine, ...(r.dati ?? {}) };
    if (r.esito.ok) this.o.log.info(riga, `master: ${comando}`);
    else this.o.log.warn(riga, `master: ${comando} rifiutato`);
  }

  /** Effetto del comando. Ogni ramo valida i suoi campi. */
  private applica(c: ComandoMaster): Risultato {
    const regia = this.o.regia;
    switch (c.tipo) {
      case 'pausa': {
        const prima = regia.statoPausa;
        const esito = regia.pausa();
        if (!esito.ok) return rifiuto(esito.errore);
        const dopo = regia.statoPausa;
        return { esito, dettagli: dopo.attiva && !prima.attiva ? 'tavolo in pausa' : 'pausa alla fine della narrazione' };
      }
      case 'riprendi': {
        const eraAttiva = regia.statoPausa.attiva;
        const esito = regia.riprendi();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: eraAttiva ? 'tavolo ripreso' : 'pausa chiesta annullata' };
      }
      case 'ferma_narrazione': {
        const turno = regia.turnoCorrente;
        const esito = regia.fermaNarrazione();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: `narrazione del turno ${turno} interrotta, tavolo in pausa` };
      }
      case 'luogo': {
        const luogo = typeof c.luogo === 'string' ? c.luogo : '';
        const noto = luoghiMaster(this.o.campagna, this.o.immagini).find((l) => l.id === luogo);
        if (!noto) return rifiuto('Luogo sconosciuto.', `luogo sconosciuto «${luogo.slice(0, 64)}»`);
        const da = regia.luogoCorrente;
        const esito = regia.cambiaLuogo(luogo);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: `luogo ${da} → ${luogo}${noto.immagine ? '' : ' (senza immagine)'}`, dati: { da, a: luogo } };
      }
      case 'scena': {
        const scena = typeof c.scena === 'string' && ID_VALIDO.test(c.scena) ? c.scena : '';
        const da = regia.scenaCorrente;
        const esito = regia.cambiaScena(scena);
        if (!esito.ok) return rifiuto(esito.errore, `scena «${scena.slice(0, 64)}»: ${esito.errore}`);
        return { esito, dettagli: `scena ${da} → ${scena}`, dati: { da, a: scena } };
      }
      case 'situazione': {
        const id = c.id === null ? null : typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : undefined;
        if (id === undefined) return rifiuto('Situazione non valida.');
        const prima = regia.situazioneInOnda;
        const esito = regia.mostraSituazione(id);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: id ? `situazione ${id} sul proiettore` : `situazione ${prima ?? '?'} tolta`, dati: { situazione: id } };
      }
      case 'orologio': {
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : null;
        const passo = c.passo === 1 || c.passo === -1 ? c.passo : null;
        if (!id || passo === null) return rifiuto('Orologio o passo non validi.');
        const esito = regia.spostaOrologio(id, passo);
        if (!esito.ok) return rifiuto(esito.motivo);
        return { esito: { ok: true }, dettagli: `orologio ${id} ${passo > 0 ? '+1' : '−1'} → ${esito.orologio.pieni}/${esito.orologio.segmenti}`, dati: { orologio: id, passo, pieni: esito.orologio.pieni } };
      }
      case 'chiudi_finestra': {
        const turno = regia.stato().finestra.turno;
        const esito = regia.chiudiFinestraOra();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: `finestra del turno ${turno} chiusa dal master` };
      }
      case 'salta_azione': {
        const id = typeof c.id_azione === 'string' && ID_VALIDO.test(c.id_azione) ? c.id_azione : null;
        if (!id) return rifiuto('Azione non valida.');
        const azione = regia.azioniTutte.find((a) => a.id === id);
        const esito = regia.saltaAzione(id);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: `azione ${id} di ${azione?.autore ?? '?'} saltata${azione?.privata ? ' (privata)' : ''}`, dati: { azione: id, autore: azione?.autore ?? null } };
      }
      case 'nota': {
        const r = regia.note.aggiungi(c.testo, c.turni, regia.turnoCorrente);
        if (!r.ok) return rifiuto(r.errore);
        regia.notificaEsterna();
        return { esito: { ok: true }, dettagli: `nota ${r.nota.id} per ${r.nota.turni_totali} turni: «${r.nota.testo}»`, dati: { nota: r.nota } };
      }
      case 'togli_nota': {
        const nota = regia.note.togli(c.id);
        if (!nota) return rifiuto('Nota inesistente o già scaduta.');
        regia.notificaEsterna();
        return { esito: { ok: true }, dettagli: `nota ${nota.id} tolta («${nota.testo}»)`, dati: { nota: nota.id } };
      }
      case 'fine_sessione': {
        if (!this.o.ciclo) return rifiuto('Fine sessione non disponibile su questo server.');
        const e = this.o.ciclo.fine();
        if (!e.ok) return rifiuto(e.errore);
        return { esito: { ok: true }, dettagli: e.dettagli, dati: e.registro ? { registro: e.registro.registro, sessione: e.registro.sessione } : {} };
      }
      case 'prossima_sessione': {
        if (!this.o.ciclo) return rifiuto('Prossima sessione non disponibile su questo server.');
        const e = this.o.ciclo.prossimaSessione();
        if (!e.ok) return rifiuto(e.errore);
        return { esito: { ok: true }, dettagli: e.dettagli, dati: e.registro ? { registro: e.registro.registro, sessione: e.registro.sessione } : {} };
      }
      case 'dispositivo': {
        const d = typeof c.dispositivo === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(c.dispositivo) ? c.dispositivo : null;
        const pg = c.id_pg === null ? null : typeof c.id_pg === 'string' && ID_VALIDO.test(c.id_pg) ? c.id_pg : undefined;
        if (!d || pg === undefined) return rifiuto('Telefono o personaggio non validi.');
        const prima = regia.dispositiviRicordati.find((x) => x.dispositivo === d)?.id_pg ?? null;
        const esito = regia.assegnaDispositivo(d, pg);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: `telefono ${d.slice(0, 6)}…: ${prima ?? 'nessuno'} → ${pg ?? 'dimenticato'}`, dati: { da: prima, a: pg } };
      }
      case 'nuova_sessione': {
        const prima = regia.infoRegistro.sessione;
        const esito = regia.nuovaSessione();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: `nuova sessione (chiusa ${prima ?? 'nessuna'})` };
      }
      case 'umore': {
        const tag = c.umore === null ? null : typeof c.umore === 'string' && ID_VALIDO.test(c.umore) ? c.umore : undefined;
        if (tag === undefined) return rifiuto('Umore non valido.');
        const prima = regia.stato().scena.audio?.umore?.replace(/^umore_/, '') ?? null;
        const esito = regia.cambiaUmore(tag);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: `umore della musica ${prima ?? 'auto'} → ${tag ?? 'auto'}`, dati: { da: prima, a: tag } };
      }
      case 'effetto': {
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : '';
        if (!this.o.audio?.effetti().includes(id)) return rifiuto('Effetto sconosciuto.', `effetto sconosciuto «${id.slice(0, 64)}»`);
        if (!regia.stato().schermo_connesso || !this.o.suonaEffetto) return rifiuto('Nessun proiettore con l’audio acceso.');
        this.o.suonaEffetto(id);
        return { esito: { ok: true }, dettagli: `effetto ${id} sul proiettore`, dati: { effetto: id } };
      }
    }
  }
}
