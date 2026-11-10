/**
 * Il ciclo delle sessioni visto dal pannello del master (docs/strati.md, «Il ciclo tra le sessioni»):
 * - «Fine sessione»: il gioco si ferma, la sessione dell'archivio si chiude, il server scrive il
 *   registro (sessione/registra.ts) nel pacchetto giocato (o nei log, per una one-shot);
 * - «Prossima sessione» (solo campagne a pacchetti): se sessioni/<nn+1>/ c'è e si carica, si chiude
 *   la sessione corrente (con il suo registro) e il server si ricostruisce sul pacchetto dopo, che
 *   comincia dal suo riassunto_iniziale. I PG durano: i telefoni ritrovano il loro.
 *
 * Il cambio di pacchetto non è un ricaricamento a caldo: contesto, repertorio, cataloghi e regia si
 * costruiscono una volta all'avvio dal pacchetto, quindi il server si ricostruisce (avvio.ts,
 * ServerConCiclo) e i client si ricollegano come dopo un riavvio (strada già provata dalla ripresa).
 */
import path from 'node:path';
import type { PacchettiMaster, RiassuntoSerata, SessioneMaster } from '@cantastorie/shared';
import { scriviRiassuntoSerata } from './riassunto';
import { elencoPacchetti, pacchettoDopo, type Pacchetto } from '../campagna/pacchetti';
import type { Campagna } from '../campagna/tipi';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { MOTIVO_FINE_SESSIONE, type ArchivioSessioni } from './archivio';
import { registraSessione, type RegistroScritto } from './registra';
import { etichettaPacchetto } from './scrivi-registro';

/** Quanto vale il controllo del pacchetto dopo (il pannello chiede la vista a ogni cambio di stato). */
const VALIDITA_CONTROLLO_MS = 10_000;
/** Attesa prima di ricostruire il server: la risposta al comando e l'ultimo stato arrivano al pannello. */
export const ATTESA_CAMBIO_MS = 300;

export interface OpzioniCiclo {
  cartellaCampagna: string;
  cartellaLog: string;
  campagna: Campagna;
  archivio: ArchivioSessioni | null;
  regia: {
    fineSessione(): { ok: true; sessione: string } | { ok: false; errore: string };
    /** Chiusura guidata della serata (scena/regia.ts); `alFinire` riceve il riassunto a serata chiusa. */
    chiudiSessione(alFinire?: (s: RiassuntoSerata) => void): { ok: true } | { ok: false; errore: string };
    readonly infoRegistro: { sessione: string | null };
  };
  /** Avviso della scelta del pacchetto all'avvio (sessione/scelta-pacchetto.ts). */
  avvisoScelta: string | null;
  /** Carica un pacchetto come all'avvio (campagna, repertorio, parole segrete): motivo null = va bene. */
  verifica: (numero: number) => { motivo: string | null; titolo: string | null };
  /** Ricostruisce il server sul pacchetto `numero`; null = questo server non lo sa fare. */
  passaA: ((numero: number) => void) | null;
  log: Logger;
  adesso?: () => number;
}

/** Esito per il pannello: `dettagli` e `errore` sono frasi del pacchetto della lingua (sezione `sessione.ciclo`). */
export type EsitoCiclo = { ok: true; dettagli: string; registro: RegistroScritto | null } | { ok: false; errore: string };

/** Una frase del ciclo nella lingua attiva, composta quando serve. */
const frase = (chiave: string, valori: Record<string, string | number> = {}): string => testo(`sessione.ciclo.${chiave}`, valori);

export class CicloSessioni {
  private ultimoRegistro: { sessione: string; file: string; turni: number } | null = null;
  private controllo: { numero: number; quando: number; motivo: string | null; titolo: string | null } | null = null;
  private cambioInCorso = false;

  constructor(private readonly o: OpzioniCiclo) {}

  private get adesso(): number {
    return this.o.adesso?.() ?? Date.now();
  }

  private pacchetti(): Pacchetto[] {
    try {
      return elencoPacchetti(this.o.cartellaCampagna);
    } catch (err) {
      this.o.log.warn({ err: (err as Error).message }, 'sessioni: elenco dei pacchetti illeggibile');
      return [];
    }
  }

  /** Il pacchetto dopo quello corrente e se si carica (controllo tenuto per qualche secondo). */
  private prossima(forza = false): { p: Pacchetto; motivo: string | null; titolo: string | null } | null {
    const corrente = this.o.campagna.pacchetto;
    if (!corrente) return null;
    const p = pacchettoDopo(this.pacchetti(), corrente.numero);
    if (!p) return null;
    const c = this.controllo;
    if (!forza && c && c.numero === p.numero && this.adesso - c.quando < VALIDITA_CONTROLLO_MS) return { p, motivo: c.motivo, titolo: c.titolo };
    const { motivo, titolo } = this.o.verifica(p.numero);
    this.controllo = { numero: p.numero, quando: this.adesso, motivo, titolo };
    if (motivo) this.o.log.info({ pacchetto: p.etichetta, motivo }, 'sessioni: il pacchetto dopo non si carica');
    return { p, motivo, titolo };
  }

  /** Per il pannello (SessioneMaster). */
  vista(): Pick<SessioneMaster, 'pacchetti' | 'registro' | 'fine_possibile'> {
    const out: Pick<SessioneMaster, 'pacchetti' | 'registro' | 'fine_possibile'> = {
      registro: this.ultimoRegistro,
      fine_possibile: this.o.regia.infoRegistro.sessione !== null,
    };
    const corrente = this.o.campagna.pacchetto;
    if (corrente) {
      const dopo = this.prossima();
      const pacchetti: PacchettiMaster = {
        corrente: { numero: corrente.numero, etichetta: corrente.etichetta, titolo: corrente.titolo },
        elenco: this.pacchetti().map((p) => ({ numero: p.numero, etichetta: p.etichetta })),
        prossima: dopo ? { numero: dopo.p.numero, etichetta: dopo.p.etichetta, titolo: dopo.titolo, pronta: dopo.motivo === null, motivo: dopo.motivo } : null,
        avviso: this.o.avvisoScelta,
      };
      out.pacchetti = pacchetti;
    }
    return out;
  }

  /**
   * «Chiudi la sessione»: la chiusura guidata della serata. A serata chiusa (narrazione, riassunto sul
   * proiettore) si scrivono il registro e, accanto, riassunto.yaml; la sessione dell'archivio resta
   * aperta, così la serata dopo riprende (one-shot) o «Prossima sessione» la chiude (pacchetti).
   */
  chiudi(): EsitoCiclo {
    const sessione = this.o.regia.infoRegistro.sessione;
    const r = this.o.regia.chiudiSessione((s) => this.scriviSerata(sessione, s));
    if (!r.ok) return r;
    return { ok: true, dettagli: frase('chiusura_in_corso'), registro: null };
  }

  private scriviSerata(sessione: string | null, s: RiassuntoSerata): void {
    if (!this.o.archivio || !sessione) {
      this.o.log.warn({ sessione }, 'sessioni: serata chiusa senza archivio, niente registro né riassunto.yaml');
      return;
    }
    try {
      const scritto = registraSessione({ archivio: this.o.archivio, sessione, cartellaCampagna: this.o.cartellaCampagna, cartellaLog: this.o.cartellaLog, log: this.o.log });
      this.ultimoRegistro = { sessione, file: scritto.registro, turni: scritto.estratto.registro.archivio.ultimo_turno };
      scriviRiassuntoSerata(path.dirname(scritto.registro), s, this.o.log);
    } catch (err) {
      this.o.log.error({ sessione, err: (err as Error).message }, 'sessioni: registro o riassunto della serata non scritti');
    }
  }

  /** «Fine sessione»: si chiude la sessione in corso e si scrive il suo registro. */
  fine(): EsitoCiclo {
    const r = this.o.regia.fineSessione();
    if (!r.ok) return r;
    return this.scrivi(r.sessione);
  }

  private scrivi(sessione: string): EsitoCiclo {
    if (!this.o.archivio) return { ok: false, errore: frase('registro_spento') };
    try {
      const scritto = registraSessione({ archivio: this.o.archivio, sessione, cartellaCampagna: this.o.cartellaCampagna, cartellaLog: this.o.cartellaLog, log: this.o.log });
      this.ultimoRegistro = { sessione, file: scritto.registro, turni: scritto.estratto.registro.archivio.ultimo_turno };
      return { ok: true, dettagli: frase('sessione_chiusa', { sessione, file: scritto.registro }), registro: scritto };
    } catch (err) {
      this.o.log.error({ sessione, err: (err as Error).message }, 'sessioni: registro non scritto');
      return { ok: false, errore: frase('registro_non_scritto', { errore: (err as Error).message }) };
    }
  }

  /**
   * «Prossima sessione»: il pacchetto dopo deve esistere e caricarsi; la sessione corrente, se è in
   * corso, finisce qui (col suo registro); se non è mai cominciata non si salta.
   */
  prossimaSessione(): EsitoCiclo {
    const corrente = this.o.campagna.pacchetto;
    if (!corrente) return { ok: false, errore: frase('one_shot') };
    if (this.cambioInCorso) return { ok: false, errore: frase('cambio_in_corso') };
    const dopo = this.prossima(true);
    if (!dopo) return { ok: false, errore: frase('manca_dopo', { sessione: corrente.etichetta }) };
    // Il motivo viene dal caricatore della campagna (errore per chi la scrive): resta com'è.
    if (dopo.motivo) return { ok: false, errore: frase('non_si_carica', { sessione: dopo.p.etichetta, motivo: dopo.motivo }) };
    if (!this.o.passaA) return { ok: false, errore: frase('senza_passaggio') };

    let registro: RegistroScritto | null = null;
    if (this.o.regia.infoRegistro.sessione !== null) {
      const f = this.fine();
      if (!f.ok) return f;
      registro = f.registro;
    } else {
      // Nessuna sessione in corso: va bene solo se questo pacchetto è già stato chiuso con «Fine sessione».
      const finita = this.o.archivio?.elenco(this.o.campagna.id).find((s) => s.pacchetto === corrente.numero && s.motivo_chiusura === MOTIVO_FINE_SESSIONE);
      if (!finita) return { ok: false, errore: frase('non_cominciata', { sessione: corrente.etichetta }) };
    }
    this.cambioInCorso = true;
    const numero = dopo.p.numero;
    this.o.log.info({ da: corrente.etichetta, a: dopo.p.etichetta }, 'sessioni: si passa alla sessione dopo');
    const passaA = this.o.passaA;
    setTimeout(() => passaA(numero), ATTESA_CAMBIO_MS);
    return { ok: true, dettagli: frase('si_passa', { sessione: corrente.etichetta, dopo: etichettaPacchetto(numero) }), registro };
  }
}
