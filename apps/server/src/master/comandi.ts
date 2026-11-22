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
import type { ServizioCreazione } from '../creazione/servizio';

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
  /** Creation at the table (docs/creazione.md); absent = the `creazione` command is refused. */
  creazione?: ServizioCreazione;
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
  'atteggiamento',
  'combattimento_inizia',
  'combattimento_termina',
  'pf',
  'condizione',
  'riposo',
  'pericolo',
  'inventario',
  'tempo',
  'esperienza',
  'tiro',
  'chiedi_prova',
  'creazione',
  'reazione',
  'incontro',
  'luce',
  'morale',
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
    return statoMaster({ regia: this.o.regia, campagna: this.o.campagna, immagini: this.o.immagini, audio: this.o.audio, eventi: this.eventi, ...(this.o.ciclo ? { ciclo: this.o.ciclo } : {}), ...(this.o.creazione ? { creazione: this.o.creazione } : {}) });
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
      case 'atteggiamento': {
        const png = typeof c.id_png === 'string' && ID_VALIDO.test(c.id_png) ? c.id_png : null;
        const pg = typeof c.id_pg === 'string' && ID_VALIDO.test(c.id_pg) ? c.id_pg : null;
        const stato = typeof c.stato === 'string' && ID_VALIDO.test(c.stato) ? c.stato : null;
        if (!png || !pg || !stato) return rifiutoDi('atteggiamento_non_valido');
        const esito = regia.impostaAtteggiamento(png, pg, stato);
        if (!esito.ok) return rifiuto(esito.errore);
        const nome = this.o.campagna.png.find((p) => p.id === png)?.nome ?? png;
        const verso = pg === 'tutti' ? dettaglio('tutti') : (this.o.campagna.pg.find((p) => p.id === pg)?.nome ?? pg);
        return { esito, dettagli: dettaglio('atteggiamento', { nome, verso, stato }), dati: { id_png: png, id_pg: pg, stato } };
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
      case 'tiro': {
        // Manual rolls (docs/prove.md §8): the dice for a player's open request, or the Engine rolls it ('*' = all).
        const id = typeof c.id === 'string' && (c.id === '*' || ID_VALIDO.test(c.id)) ? c.id : null;
        const valori = c.valori === null ? null : Array.isArray(c.valori) && c.valori.length > 0 && c.valori.length <= 10 && c.valori.every((v) => Number.isInteger(v)) ? c.valori : undefined;
        if (!id || valori === undefined) return rifiutoDi('tiro_non_valido');
        const e = regia.tiroDalMaster(id, valori);
        if (!e.ok) return rifiutoDi(`tiro_${e.motivo}`);
        return { esito: { ok: true }, dettagli: dettaglio(valori ? 'tiro_inserito' : 'tiro_automatico', { id, valori: valori?.join(', ') ?? '' }), dati: { id, valori } };
      }
      case 'chiedi_prova': {
        // The Game Master asks a PC for a check (docs/prove.md §8): it joins the next closed window.
        const id_pg = typeof c.id_pg === 'string' && ID_VALIDO.test(c.id_pg) ? c.id_pg : null;
        const cosa = typeof c.cosa === 'string' && /^[a-z_]+:[A-Za-z0-9_]{1,60}$/.test(c.cosa) ? c.cosa : null;
        const difficolta = c.difficolta === null || c.difficolta === undefined ? null : typeof c.difficolta === 'string' && ID_VALIDO.test(c.difficolta) ? c.difficolta : undefined;
        const motivo = typeof c.motivo === 'string' ? c.motivo.trim().slice(0, 120) : '';
        if (!id_pg || !cosa || difficolta === undefined) return rifiutoDi('prova_non_valida');
        const esito = regia.chiediProva(id_pg, cosa, difficolta, motivo, c.privata === true);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('prova_chiesta', { id: id_pg, cosa, difficolta: difficolta ?? '-' }), dati: { id_pg, cosa, difficolta, privata: c.privata === true } };
      }
      case 'condizione': {
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : null;
        const cond = typeof c.condizione === 'string' && ID_VALIDO.test(c.condizione) ? c.condizione : null;
        if (!id || !cond || typeof c.attiva !== 'boolean') return rifiutoDi('condizione_non_valida');
        const esito = regia.condizioneCombattimento(id, cond, c.attiva);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio(c.attiva ? 'condizione_messa' : 'condizione_tolta', { id, condizione: cond }), dati: { id, condizione: cond, attiva: c.attiva } };
      }
      case 'riposo': {
        // A rest for the party (docs/prove.md §10): the set's healing and refresh.
        const riposo = typeof c.riposo === 'string' && ID_VALIDO.test(c.riposo) ? c.riposo : null;
        if (!riposo) return rifiutoDi('riposo_non_valido');
        const esito = regia.riposo(riposo);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('riposo', { riposo }), dati: { riposo } };
      }
      case 'pericolo': {
        // A hazard on a character (docs/prove.md §10): damage or healing by a formula, or a fall of a height.
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : null;
        const cosa = c.cosa === 'danno' || c.cosa === 'cura' || c.cosa === 'caduta' ? c.cosa : null;
        const valore = cosa === 'caduta' ? (typeof c.valore === 'number' && c.valore >= 0 && c.valore <= 10000 ? c.valore : null) : typeof c.valore === 'string' && /^[0-9dD+\- ]{1,20}$/.test(c.valore) ? c.valore : typeof c.valore === 'number' && Number.isInteger(c.valore) && c.valore >= 0 && c.valore <= 999 ? c.valore : null;
        const fonte = typeof c.fonte === 'string' && c.fonte.trim() ? c.fonte.trim().slice(0, 60) : testo(`master.pericolo.${cosa ?? 'danno'}`);
        if (!id || !cosa || valore === null) return rifiutoDi('pericolo_non_valido');
        const esito = regia.pericolo(id, cosa, valore, fonte);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('pericolo', { id, cosa, valore: String(valore), fonte }), dati: { id, cosa, valore, fonte } };
      }
      case 'inventario': {
        // A character's gear and coins (docs/prove.md §10): the catalog's ids, checked by the Engine (prove/inventario.ts).
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : null;
        const cosa = ['oggetto', 'monete', 'compra', 'vendi', 'indossa', 'togli'].includes(c.cosa) ? c.cosa : null;
        const oggetto = typeof c.oggetto === 'string' && /^[a-z0-9_]{1,64}$/.test(c.oggetto) ? c.oggetto : undefined;
        const quante = c.quante === undefined ? undefined : Number.isInteger(c.quante) && Math.abs(c.quante) <= 9999 && c.quante !== 0 ? c.quante : null;
        const monete = c.monete && typeof c.monete === 'object' && Object.entries(c.monete).every(([k, n]) => /^[a-z0-9_]{1,32}$/.test(k) && Number.isInteger(n) && Math.abs(n) <= 1_000_000) ? c.monete : undefined;
        const prezzo = typeof c.prezzo === 'string' && /^[0-9.,]{1,9}\s*[a-z_]{0,16}$/.test(c.prezzo.trim()) ? c.prezzo.trim() : undefined;
        if (!id || !cosa || quante === null || (cosa === 'monete' ? !monete : !oggetto)) return rifiutoDi('inventario_non_valido');
        const comando = { tipo: 'inventario' as const, id, cosa, ...(oggetto ? { oggetto } : {}), ...(quante ? { quante } : {}), ...(monete ? { monete } : {}), ...(prezzo ? { prezzo } : {}) };
        const esito = regia.inventario(comando);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('inventario', { id, cosa, oggetto: oggetto ?? JSON.stringify(monete) }), dati: comando };
      }
      case 'tempo': {
        // The game clock (docs/prove.md §11): time passes, a journey, a light lit or put out; checked by the Engine.
        const cosa = ['avanza', 'viaggio', 'accendi', 'spegni'].includes(c.cosa) ? c.cosa : null;
        const durata = c.durata && typeof c.durata === 'object' && Object.entries(c.durata).every(([k, n]) => /^[a-z0-9_]{1,32}$/.test(k) && typeof n === 'number' && n > 0 && n <= 10000) ? c.durata : null;
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : null;
        const oggetto = typeof c.oggetto === 'string' && /^[a-z0-9_]{1,64}$/.test(c.oggetto) ? c.oggetto : null;
        const terreno = typeof c.terreno === 'string' && /^[a-z0-9_]{1,64}$/.test(c.terreno) ? c.terreno : null;
        const distanza = typeof c.distanza === 'number' && c.distanza > 0 && c.distanza <= 100000 ? c.distanza : null;
        // The journey's leader (Basic Fantasy p. 45: their check keeps the party on course); absent = the first at the table.
        const guida = typeof c.guida === 'string' && ID_VALIDO.test(c.guida) ? c.guida : null;
        const comando =
          cosa === 'avanza' && durata ? { cosa, durata } : cosa === 'viaggio' && terreno && distanza ? { cosa, distanza, terreno, ...(guida ? { guida } : {}) } : (cosa === 'accendi' || cosa === 'spegni') && id && oggetto ? { cosa, id, oggetto } : null;
        if (!comando) return rifiutoDi('tempo_non_valido');
        const esito = regia.tempo(comando);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('tempo', { cosa: comando.cosa }), dati: { ...comando } };
      }
      case 'esperienza': {
        // Experience points (docs/prove.md §12): an award to a PC or the party, or the treasure back to safety.
        const cosa = c.cosa === 'assegna' || c.cosa === 'tesoro' ? c.cosa : null;
        const px = Number.isInteger(c.px) && c.px !== 0 && Math.abs(c.px as number) <= 1_000_000 ? (c.px as number) : null;
        const pg = typeof c.pg === 'string' && c.pg !== '' ? (ID_VALIDO.test(c.pg) ? c.pg : null) : undefined;
        const motivo = typeof c.motivo === 'string' ? c.motivo.trim().slice(0, 120) : undefined;
        if (!cosa || (cosa === 'assegna' && (px === null || pg === null))) return rifiutoDi('esperienza_non_valida');
        const comando = { cosa, ...(cosa === 'assegna' ? { px: px as number, ...(pg ? { pg } : {}), ...(motivo ? { motivo } : {}) } : {}) };
        const esito = regia.esperienza(comando);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito, dettagli: dettaglio('esperienza', { cosa, px: px ?? '', pg: pg ?? '' }), dati: { ...comando } };
      }
      case 'reazione': {
        // A reaction roll of the set's tables (Basic Fantasy pp. 46, 50): the Engine rolls it, the narrator hears the band.
        const tabella = typeof c.tabella === 'string' && ID_VALIDO.test(c.tabella) ? c.tabella : null;
        const pg = typeof c.id_pg === 'string' && ID_VALIDO.test(c.id_pg) ? c.id_pg : null;
        const png = c.id_png === undefined || c.id_png === null || c.id_png === '' ? null : typeof c.id_png === 'string' && ID_VALIDO.test(c.id_png) ? c.id_png : undefined;
        const agg = c.aggiustamento === undefined ? 0 : typeof c.aggiustamento === 'number' && Number.isInteger(c.aggiustamento) && Math.abs(c.aggiustamento) <= 10 ? c.aggiustamento : null;
        if (!tabella || !pg || png === undefined || agg === null) return rifiutoDi('reazione_non_valida');
        const esito = regia.reazione({ tabella, id_pg: pg, id_png: png, aggiustamento: agg });
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito: { ok: true }, dettagli: esito.fatto ?? tabella, dati: { tabella, pg, png, aggiustamento: agg } };
      }
      case 'incontro': {
        // An encounter rolled now (docs/prove.md §14): the table named, else the scene's; checked by the Engine.
        const tabella = c.tabella === undefined || c.tabella === null || c.tabella === '' ? null : typeof c.tabella === 'string' && /^[a-z0-9_]{1,64}$/.test(c.tabella) ? c.tabella : undefined;
        if (tabella === undefined) return rifiutoDi('incontro_non_valido');
        const esito = regia.incontro({ tabella });
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito: { ok: true }, dettagli: esito.fatto ?? tabella ?? '', dati: { tabella } };
      }
      case 'morale': {
        // The Game Master's adjustment to a morale score (p. 57): the Engine checks the limit and the 12.
        const id = typeof c.id === 'string' && ID_VALIDO.test(c.id) ? c.id : null;
        const valore = typeof c.valore === 'number' && Number.isInteger(c.valore) && Math.abs(c.valore) <= 10 ? c.valore : null;
        if (!id || valore === null) return rifiutoDi('morale_non_valido');
        const esito = regia.morale(id, valore);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito: { ok: true }, dettagli: esito.fatto ?? id, dati: { id, valore } };
      }
      case 'luce': {
        // How dark the scene is (docs/prove.md §15): until the scene changes; null = the scene sheet's again.
        const livello = c.livello === null ? null : c.livello === 'piena' || c.livello === 'fioca' || c.livello === 'buio' ? c.livello : undefined;
        if (livello === undefined) return rifiutoDi('luce_non_valida');
        const esito = regia.luce(livello);
        if (!esito.ok) return rifiuto(esito.errore);
        return { esito: { ok: true }, dettagli: esito.fatto ?? String(livello), dati: { livello } };
      }
      case 'creazione': {
        // Creation at the table (docs/creazione.md): the service checks the draft, the step and the moment.
        if (!this.o.creazione) return rifiutoDi('creazione_spenta');
        const e = this.o.creazione.comando(c);
        if (!e.ok) return rifiuto(e.errore);
        return { esito: { ok: true }, dettagli: e.dettagli, dati: { azione: c.azione, bozza: c.id, ...(c.passo ? { passo: c.passo } : {}) } };
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
