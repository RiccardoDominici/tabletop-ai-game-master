/**
 * Comandi del pannello del master: validazione (il client non è fidato), effetto sulla regia e
 * registro. Ogni comando, riuscito o rifiutato, diventa un evento:
 *   - una riga in logs/master.jsonl (append-only, per rivedere la sessione);
 *   - una riga nel log strutturato del server (`evento: 'master'`);
 *   - una voce negli ultimi eventi mostrati dal pannello.
 */
import type { ComandoMaster, Esito, EventoMaster, StatoMaster, TipoComandoMaster } from '@tabletop-ai-gm/shared';
import type { CatalogoImmagini } from '../campagna/immagini';
import type { CatalogoAudio } from '../audio/catalogo';
import type { Campagna } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { RegistroJsonl } from '../metriche/jsonl';
import type { Regia } from '../scena/regia';
import type { CicloSessioni } from '../sessione/ciclo';
import { testo } from '../lingua';
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
  'ritmo',
  'salta_azione',
  'nota',
  'togli_nota',
  'umore',
  'nuova_sessione',
  'effetto',
  'fine_sessione',
  'chiudi_sessione',
  'durata_sessione',
  'prossima_sessione',
  'dispositivo',
  'presenza',
  'rivela',
  'combattimento_inizia',
  'combattimento_termina',
  'pf',
  'condizione',
]);

/** Comandi che non lasciano stato da salvare dopo (un effetto) o lo salvano da sé (sessioni). */
const SENZA_SALVATAGGIO: ReadonlySet<TipoComandoMaster> = new Set<TipoComandoMaster>(['effetto', 'nuova_sessione', 'fine_sessione', 'chiudi_sessione', 'prossima_sessione']);

/** Id semplici (luoghi, orologi, azioni, note, immagini): niente sorprese nei log. */
const ID_VALIDO = /^[A-Za-z0-9_]{1,80}$/;

type Risultato = { esito: Esito; dettagli: string; dati?: Record<string, unknown> };

/**
 * Rifiuto di un comando: `errore` va al pannello come esito, `dettagli` nell'elenco degli eventi.
 * Le frasi stanno nel pacchetto della lingua (sezioni `master.rifiuti` e `master.dettagli`) e si
 * compongono qui, a comando ricevuto: mai al caricamento del modulo (la lingua si imposta all'avvio).
 */
const rifiuto = (errore: string, dettagli = errore): Risultato => ({ esito: { ok: false, errore }, dettagli: testo('master.dettagli.rifiutato', { dettagli }) });
/** Un rifiuto con l'errore del pacchetto (chiave di `master.rifiuti`). */
const rifiutoDi = (chiave: string, dettagli?: string): Risultato => {
  const errore = testo(`master.rifiuti.${chiave}`);
  return rifiuto(errore, dettagli ?? errore);
};
/** Dettagli di un evento riuscito (chiave di `master.dettagli`). */
const dettaglio = (chiave: string, valori: Record<string, string | number> = {}): string => testo(`master.dettagli.${chiave}`, valori);

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
      return { ok: false, errore: testo('master.rifiuti.comando_sconosciuto') };
    }
    const comando = grezzo as ComandoMaster;
    let r: Risultato;
    try {
      r = this.applica(comando);
    } catch (err) {
      this.o.log.error({ evento: 'master', origine, comando: comando.tipo, err: (err as Error).message }, 'master: comando fallito');
      r = rifiutoDi('errore_interno', (err as Error).message);
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
        return { esito, dettagli: dettaglio(dopo.attiva && !prima.attiva ? 'pausa' : 'pausa_chiesta') };
      }
      case 'riprendi': {
        const eraAttiva = regia.statoPausa.attiva;
        const esito = regia.riprendi();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio(eraAttiva ? 'ripreso' : 'pausa_annullata') };
      }
      case 'ferma_narrazione': {
        const turno = regia.turnoCorrente;
        const esito = regia.fermaNarrazione();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('narrazione_fermata', { turno }) };
      }
      case 'luogo': {
        const luogo = typeof c.luogo === 'string' ? c.luogo : '';
        const noto = luoghiMaster(this.o.campagna, this.o.immagini).find((l) => l.id === luogo);
        if (!noto) return rifiutoDi('luogo_sconosciuto', dettaglio('luogo_sconosciuto', { luogo: luogo.slice(0, 64) }));
        const da = regia.luogoCorrente;
        const esito = regia.cambiaLuogo(luogo);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio(noto.immagine ? 'luogo' : 'luogo_senza_immagine', { da, a: luogo }), dati: { da, a: luogo } };
      }
      case 'scena': {
        const scena = typeof c.scena === 'string' && ID_VALIDO.test(c.scena) ? c.scena : '';
        const da = regia.scenaCorrente;
        const esito = regia.cambiaScena(scena);
        if (!esito.ok) return rifiuto(esito.errore, dettaglio('scena_rifiutata', { scena: scena.slice(0, 64), errore: esito.errore }));
        return { esito, dettagli: dettaglio('scena', { da, a: scena }), dati: { da, a: scena } };
      }
      case 'situazione': {
        const id = c.id === null ? null : typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : undefined;
        if (id === undefined) return rifiutoDi('situazione_non_valida');
        const prima = regia.situazioneInOnda;
        const esito = regia.mostraSituazione(id);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: id ? dettaglio('situazione', { id }) : dettaglio('situazione_tolta', { id: prima ?? '?' }), dati: { situazione: id } };
      }
      case 'orologio': {
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : null;
        const passo = c.passo === 1 || c.passo === -1 ? c.passo : null;
        if (!id || passo === null) return rifiutoDi('orologio_non_valido');
        const esito = regia.spostaOrologio(id, passo);
        if (!esito.ok) return rifiuto(esito.motivo);
        return {
          esito: { ok: true },
          dettagli: dettaglio('orologio', { id, passo: passo > 0 ? '+1' : '−1', pieni: esito.orologio.pieni, segmenti: esito.orologio.segmenti }),
          dati: { orologio: id, passo, pieni: esito.orologio.pieni },
        };
      }
      case 'chiudi_finestra': {
        const turno = regia.stato().finestra.turno;
        const esito = regia.chiudiFinestraOra();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('finestra_chiusa', { turno }) };
      }
      case 'ritmo': {
        const ritmo = c.ritmo === 'concitato' || c.ritmo === 'calmo' ? c.ritmo : null;
        if (!ritmo) return rifiutoDi('ritmo_non_valido');
        const prima = regia.ritmoCorrente;
        const esito = regia.impostaRitmo(ritmo, 'master');
        if (!esito.ok) return rifiuto(esito.errore);
        // Nel dettaglio i ritmi con le parole della lingua; nei dati restano gli identificatori.
        return { esito, dettagli: dettaglio('ritmo', { da: dettaglio(`ritmo_${prima}`), a: dettaglio(`ritmo_${ritmo}`) }), dati: { da: prima, a: ritmo } };
      }
      case 'salta_azione': {
        const id = typeof c.id_azione === 'string' && ID_VALIDO.test(c.id_azione) ? c.id_azione : null;
        if (!id) return rifiutoDi('azione_non_valida');
        const azione = regia.azioniTutte.find((a) => a.id === id);
        const esito = regia.saltaAzione(id);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio(azione?.privata ? 'azione_saltata_privata' : 'azione_saltata', { id, autore: azione?.autore ?? '?' }), dati: { azione: id, autore: azione?.autore ?? null } };
      }
      case 'nota': {
        const r = regia.note.aggiungi(c.testo, c.turni, regia.turnoCorrente);
        if (!r.ok) return rifiuto(r.errore);
        regia.notificaEsterna();
        return { esito: { ok: true }, dettagli: dettaglio('nota', { id: r.nota.id, turni: r.nota.turni_totali, testo: r.nota.testo }), dati: { nota: r.nota } };
      }
      case 'togli_nota': {
        const nota = regia.note.togli(c.id);
        if (!nota) return rifiutoDi('nota_inesistente');
        regia.notificaEsterna();
        return { esito: { ok: true }, dettagli: dettaglio('nota_tolta', { id: nota.id, testo: nota.testo }), dati: { nota: nota.id } };
      }
      case 'fine_sessione': {
        if (!this.o.ciclo) return rifiutoDi('fine_non_disponibile');
        const e = this.o.ciclo.fine();
        if (!e.ok) return rifiuto(e.errore);
        return { esito: { ok: true }, dettagli: e.dettagli, dati: e.registro ? { registro: e.registro.registro, sessione: e.registro.sessione } : {} };
      }
      case 'chiudi_sessione': {
        if (!this.o.ciclo) {
          const e = regia.chiudiSessione();
          return e.ok ? { esito: e, dettagli: dettaglio('chiusura_senza_ciclo') } : rifiuto(e.errore);
        }
        const e = this.o.ciclo.chiudi();
        if (!e.ok) return rifiuto(e.errore);
        return { esito: { ok: true }, dettagli: e.dettagli };
      }
      case 'durata_sessione': {
        const e = regia.impostaOreSerata(Number(c.ore));
        if (!e.ok) return rifiuto(e.errore);
        return { esito: e, dettagli: dettaglio('durata', { ore: Number(c.ore) }), dati: { ore: Number(c.ore) } };
      }
      case 'prossima_sessione': {
        if (!this.o.ciclo) return rifiutoDi('prossima_non_disponibile');
        const e = this.o.ciclo.prossimaSessione();
        if (!e.ok) return rifiuto(e.errore);
        return { esito: { ok: true }, dettagli: e.dettagli, dati: e.registro ? { registro: e.registro.registro, sessione: e.registro.sessione } : {} };
      }
      case 'dispositivo': {
        const d = typeof c.dispositivo === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(c.dispositivo) ? c.dispositivo : null;
        const pg = c.id_pg === null ? null : typeof c.id_pg === 'string' && ID_VALIDO.test(c.id_pg) ? c.id_pg : undefined;
        if (!d || pg === undefined) return rifiutoDi('dispositivo_non_valido');
        const prima = regia.dispositiviRicordati.find((x) => x.dispositivo === d)?.id_pg ?? null;
        const esito = regia.assegnaDispositivo(d, pg);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('dispositivo', { telefono: d.slice(0, 6), da: prima ?? dettaglio('nessuno'), a: pg ?? dettaglio('dimenticato') }), dati: { da: prima, a: pg } };
      }
      case 'presenza': {
        const id = typeof c.id_png === 'string' && ID_VALIDO.test(c.id_png) ? c.id_png : null;
        const presente = c.presente === null ? null : typeof c.presente === 'boolean' ? c.presente : undefined;
        if (!id || presente === undefined) return rifiutoDi('presenza_non_valida');
        const nome = this.o.campagna.png.find((p) => p.id === id)?.nome ?? id;
        const esito = regia.impostaPresenza(id, presente);
        if (!esito.ok) return rifiuto(esito.errore);
        const come = presente === null ? 'presenza_auto' : presente ? 'presenza_in_scena' : 'presenza_altrove';
        return { esito, dettagli: dettaglio(come, { nome }), dati: { id_png: id, presente } };
      }
      case 'rivela': {
        const id = typeof c.id_png === 'string' && ID_VALIDO.test(c.id_png) ? c.id_png : null;
        if (!id) return rifiutoDi('png_non_valido');
        const nome = this.o.campagna.png.find((p) => p.id === id)?.nome ?? id;
        const esito = regia.rivela(id);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('rivelato', { nome }), dati: { id_png: id } };
      }
      case 'nuova_sessione': {
        const prima = regia.infoRegistro.sessione;
        const esito = regia.nuovaSessione();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: prima !== null ? dettaglio('nuova_sessione', { sessione: prima }) : dettaglio('nuova_sessione_prima') };
      }
      case 'umore': {
        const tag = c.umore === null ? null : typeof c.umore === 'string' && ID_VALIDO.test(c.umore) ? c.umore : undefined;
        if (tag === undefined) return rifiutoDi('umore_non_valido');
        const prima = regia.stato().scena.audio?.umore?.replace(/^umore_/, '') ?? null;
        const esito = regia.cambiaUmore(tag);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('umore', { da: prima ?? dettaglio('auto'), a: tag ?? dettaglio('auto') }), dati: { da: prima, a: tag } };
      }
      case 'combattimento_inizia': {
        const esito = regia.iniziaCombattimento();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('combattimento_iniziato') };
      }
      case 'combattimento_termina': {
        const esito = regia.terminaCombattimento();
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('combattimento_terminato') };
      }
      case 'pf': {
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : null;
        const valore = typeof c.valore === 'number' && Number.isInteger(c.valore) && c.valore >= 0 && c.valore <= 999 ? c.valore : null;
        if (!id || valore === null) return rifiutoDi('pf_non_validi');
        const esito = regia.impostaPf(id, valore);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('pf', { id, valore }), dati: { id, valore } };
      }
      case 'condizione': {
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : null;
        const cond = typeof c.condizione === 'string' && ID_VALIDO.test(c.condizione) ? c.condizione : null;
        if (!id || !cond || typeof c.attiva !== 'boolean') return rifiutoDi('condizione_non_valida');
        const esito = regia.condizioneCombattimento(id, cond, c.attiva);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio(c.attiva ? 'condizione_messa' : 'condizione_tolta', { id, condizione: cond }), dati: { id, condizione: cond, attiva: c.attiva } };
      }
      case 'effetto': {
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : '';
        if (!this.o.audio?.effetti().includes(id)) return rifiutoDi('effetto_sconosciuto', dettaglio('effetto_sconosciuto', { effetto: id.slice(0, 64) }));
        if (!regia.stato().schermo_connesso || !this.o.suonaEffetto) return rifiutoDi('senza_proiettore');
        this.o.suonaEffetto(id);
        return { esito: { ok: true }, dettagli: dettaglio('effetto', { id }), dati: { effetto: id } };
      }
    }
  }
}
