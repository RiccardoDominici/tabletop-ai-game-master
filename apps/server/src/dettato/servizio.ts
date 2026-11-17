/**
 * The dictation service (docs/ascolto.md): a phone's recording → the text of the player's action, with the campaign
 * names spelled right; and what the sent actions teach about names nobody knew yet.
 *
 * One dictation: limits (size, one at a time per PC, a few per minute) → ffmpeg to 16 kHz WAV → silence check → the
 * vocabulary of this moment (PCs, visible NPCs, names said at the table, learned names) → Whisper with the prompt →
 * hallucination check → post-correction → answer. Each step is timed and logged (`dictation: done`); the text itself
 * only at debug level.
 *
 * Learning (dettato/apprendimento.ts) runs when an action is sent (trasporto/socket.ts): the learned names and the
 * refused corrections live for the session, are written to the session registry (event `dettato`, read back by a
 * resumed session) and the new names go to the pronunciation lexicon of the voice (voce/lessico-vivo.ts).
 */
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import type { Campagna } from '../campagna/tipi';
import type { Lingua } from '../lingua';
import type { Logger } from '../logger';
import type { Repertorio } from '../repertorio/tipi';
import type { MemoriaSessione } from '../sessione/memoria';
import { FILE_LESSICO, fileLessicoGioco, leggiLessico } from '../voce/pronuncia';
import path from 'node:path';
import { impara } from './apprendimento';
import { converti, picco, type AudioConvertito } from './converti';
import { correggi, type Correzione } from './correzione';
import { formaPiana } from './fonetica';
import { linguaDettato, paroleComuni, testiCampagna } from './lingua';
import { costruisciPrompt } from './prompt';
import { trascriviConCatena, type Trascrittore } from './trascrittori';
import { costruisciVocabolario, paroleDi, type NomeAppreso, type VoceVocabolario } from './vocabolario';

/** Limits of one dictation. */
export const MAX_SECONDI = 30;
export const MAX_BYTE = 2_000_000;
export const PER_MINUTO = 12;
/** Peak below which a recording counts as silence (Whisper invents words on silence). */
export const PICCO_SILENZIO = 0.02;
/** Learned names kept per session (oldest dropped). */
export const MAX_APPRESI = 200;

export type CodiceErrore = 'spento' | 'vuoto' | 'troppo_lungo' | 'occupato' | 'troppe' | 'formato' | 'non_disponibile';

export class ErroreDettato extends Error {
  constructor(
    readonly codice: CodiceErrore,
    messaggio: string,
  ) {
    super(messaggio);
  }
}

export interface RispostaDettato {
  testo: string;
  correzioni: Array<Pick<Correzione, 'sentito' | 'scritto' | 'motivo'>>;
  secondi: number;
  provider: string;
  /** Milliseconds of each step. */
  ms: { conversione: number; trascrizione: number; correzione: number; totale: number };
  /** The recording was silent (or Whisper only wrote one of its silence phrases): nothing to transcribe. */
  silenzio?: boolean;
}

/** What the session registry keeps (event `dettato`). */
export interface DettatoSalvato {
  appresi: NomeAppreso[];
  rifiutate: string[];
}

export interface OpzioniDettato {
  /** The play language (the campaign's): Whisper's `language`, the prompt, the phonetic key. */
  lingua: Lingua;
  /** [provider, ...riserve] that can transcribe; empty = provider `nessuno`. */
  catena: readonly Trascrittore[];
  campagna: Campagna;
  repertorio?: Repertorio;
  /** The public table (visible NPCs, PCs, last public transcript lines). */
  stato: () => StatoTavolo;
  log: Logger;
  memoria?: MemoriaSessione | null;
  /** Learned names of the session being resumed. */
  ripresa?: DettatoSalvato | null;
  /** The whole public transcript of a resumed session (names said before the restart). */
  trascrizioneRipresa?: ReadonlyArray<{ testo: string }>;
  /** New names for the pronunciation lexicon of the voice (LessicoVivo.segnala). */
  nomiAlLessico?: (nomi: string[]) => void;
  /** Rule-set terms for the prompt. */
  termini?: readonly string[];
  converti?: (audio: Buffer) => Promise<AudioConvertito>;
  adesso?: () => number;
}

export class ServizioDettato {
  private readonly comuni: ReadonlySet<string>;
  private readonly appresi = new Map<string, NomeAppreso>();
  private readonly rifiutate = new Set<string>();
  private readonly detti = new Set<string>();
  /** Last transcription sent to each PC's phone (for the diff when the action is sent). */
  private readonly ultime = new Map<string, { testo: string; correzioni: Correzione[] }>();
  private readonly inCorso = new Set<string>();
  private readonly richieste = new Map<string, number[]>();

  constructor(private readonly o: OpzioniDettato) {
    this.comuni = paroleComuni(o.lingua, testiCampagna(o.campagna, o.repertorio));
    for (const a of o.ripresa?.appresi ?? []) this.appresi.set(formaPiana(a.scritto), { ...a, sentiti: [...a.sentiti] });
    for (const r of o.ripresa?.rifiutate ?? []) this.rifiutate.add(r);
    for (const v of o.trascrizioneRipresa ?? []) for (const w of paroleDi(v.testo)) this.detti.add(w);
    o.log.info(
      { provider: this.provider, catena: o.catena.map((t) => `${t.provider} ${t.modello}`), lingua: o.lingua, parole_comuni: this.comuni.size, appresi: this.appresi.size },
      this.attivo ? 'dictation: on' : 'dictation: off (players type)',
    );
  }

  get attivo(): boolean {
    return this.o.catena.length > 0;
  }

  /** The configured provider (the first of the chain), or `nessuno`. */
  get provider(): string {
    return this.o.catena[0]?.provider ?? 'nessuno';
  }

  /** The vocabulary of this moment, for this PC's phone. */
  vocabolario(id_pg: string | null): VoceVocabolario[] {
    const s = this.o.stato();
    for (const v of s.trascrizione) for (const w of paroleDi(v.testo)) this.detti.add(w);
    const pngCampagna = new Map(this.o.campagna.png.map((p) => [p.id, p]));
    const alias = (d: Record<string, unknown> | undefined): string[] => (Array.isArray(d?.['alias']) ? (d['alias'] as unknown[]).filter((x): x is string => typeof x === 'string') : []);
    const cartella = this.o.campagna.cartella;
    return costruisciVocabolario({
      lingua: this.o.lingua,
      pg: this.o.campagna.pg.map((p) => ({ nome: p.nome, alias: alias(p.pubblico), mio: p.id === id_pg })),
      png: (s.scena.personaggi ?? []).map((p) => ({ nome: p.nome, alias: alias(pngCampagna.get(p.id)?.dati), presente: p.presente })),
      appresi: [...this.appresi.values()],
      lessico: [...leggiLessico(path.join(cartella, FILE_LESSICO)), ...leggiLessico(fileLessicoGioco(this.o.campagna))],
      menzionato: (w) => this.detti.has(w),
      ...(this.o.termini ? { termini: this.o.termini } : {}),
    });
  }

  /** The prompt Whisper would get now (for the round trip and the logs). */
  prompt(id_pg: string | null): string {
    return costruisciPrompt(this.vocabolario(id_pg), linguaDettato(this.o.lingua).prompt);
  }

  private limiti(id_pg: string, byte: number): void {
    if (!this.attivo) throw new ErroreDettato('spento', 'dictation is off (ascolto: nessuno)');
    if (byte === 0) throw new ErroreDettato('vuoto', 'empty recording');
    if (byte > MAX_BYTE) throw new ErroreDettato('troppo_lungo', `recording of ${byte} bytes, at most ${MAX_BYTE}`);
    if (this.inCorso.has(id_pg)) throw new ErroreDettato('occupato', 'a dictation of this PC is already running');
    const ora = this.o.adesso?.() ?? Date.now();
    const recenti = (this.richieste.get(id_pg) ?? []).filter((t) => ora - t < 60_000);
    if (recenti.length >= PER_MINUTO) throw new ErroreDettato('troppe', `${PER_MINUTO} dictations in the last minute`);
    recenti.push(ora);
    this.richieste.set(id_pg, recenti);
  }

  /** One dictation for this PC's phone. Throws ErroreDettato (the route turns it into a status and a sentence). */
  async trascrivi(id_pg: string, audio: Buffer, tipo: string): Promise<RispostaDettato> {
    this.limiti(id_pg, audio.length);
    this.inCorso.add(id_pg);
    const t0 = performance.now();
    try {
      let conv: AudioConvertito;
      try {
        conv = await (this.o.converti ?? ((a) => converti(a, { maxSecondi: MAX_SECONDI })))(audio);
      } catch (err) {
        this.o.log.warn({ id_pg, tipo, byte: audio.length, err: (err as Error).message }, 'dictation: audio not readable');
        throw new ErroreDettato('formato', (err as Error).message);
      }
      const secondi = Math.round(conv.secondi * 10) / 10;
      const livello = picco(conv.wav);
      const base = { secondi, ms: { conversione: conv.ms, trascrizione: 0, correzione: 0, totale: 0 } };
      if (conv.secondi < 0.3 || livello < PICCO_SILENZIO) {
        this.o.log.info({ id_pg, tipo, secondi, picco: Math.round(livello * 1000) / 1000 }, 'dictation: silence, nothing sent to Whisper');
        return { testo: '', correzioni: [], provider: this.provider, silenzio: true, ...base, ms: { ...base.ms, totale: Math.round(performance.now() - t0) } };
      }
      const voci = this.vocabolario(id_pg);
      const prompt = costruisciPrompt(voci, linguaDettato(this.o.lingua).prompt);
      let esito;
      try {
        esito = await trascriviConCatena(this.o.catena, { wav: conv.wav, secondi: conv.secondi, lingua: this.o.lingua, prompt }, this.o.log);
      } catch (err) {
        this.o.log.error({ id_pg, secondi, err: (err as Error).message }, 'dictation: no transcriber answered');
        throw new ErroreDettato('non_disponibile', (err as Error).message);
      }
      const t1 = performance.now();
      const grezzo = esito.testo;
      const silenzio = this.allucinazione(grezzo, prompt);
      const r = silenzio ? { testo: '', correzioni: [] } : correggi(grezzo, { lingua: this.o.lingua, voci, comuni: this.comuni, rifiutate: this.rifiutate });
      const msCorrezione = Math.round(performance.now() - t1);
      this.ultime.set(id_pg, { testo: r.testo, correzioni: r.correzioni });
      const ms = { conversione: conv.ms, trascrizione: esito.ms, correzione: msCorrezione, totale: Math.round(performance.now() - t0) };
      this.o.log.info(
        {
          id_pg,
          tipo,
          byte: audio.length,
          secondi,
          provider: esito.provider,
          ...(esito.saltati.length ? { saltati: esito.saltati } : {}),
          ms,
          caratteri: r.testo.length,
          correzioni: r.correzioni.map((c) => `${c.sentito} → ${c.scritto} (${c.motivo} ${c.punteggio})`),
          costo_usd: esito.costo_usd || undefined,
          ...(silenzio ? { allucinazione: true } : {}),
        },
        'dictation: done',
      );
      this.o.log.debug({ id_pg, grezzo, corretto: r.testo, prompt }, 'dictation: text');
      return {
        testo: r.testo,
        correzioni: r.correzioni.map(({ sentito, scritto, motivo }) => ({ sentito, scritto, motivo })),
        secondi,
        provider: esito.provider,
        ms,
        ...(silenzio ? { silenzio: true } : {}),
      };
    } finally {
      this.inCorso.delete(id_pg);
    }
  }

  /**
   * Whisper on silence or noise: one of its stock phrases, or its own prompt back. Such a transcript is empty: putting
   * «Grazie per la visione» or the list of names in the action box would only confuse the player.
   */
  private allucinazione(testo: string, prompt: string): boolean {
    const piano = (s: string): string => formaPiana(s).replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
    const t = piano(testo);
    if (!t) return true;
    if (linguaDettato(this.o.lingua).allucinazioni.includes(t)) return true;
    return t.length >= 12 && piano(prompt).includes(t);
  }

  /**
   * An action was sent (typed or dictated): learn from it. `trascrizione` is the text the phone got from the last
   * dictation, when the action started from one.
   */
  impara(id_pg: string, inviato: string, trascrizione: string | undefined, turno: number): void {
    const ultima = this.ultime.get(id_pg);
    const usata = trascrizione !== undefined && ultima && formaPiana(ultima.testo) === formaPiana(trascrizione) ? ultima : null;
    if (trascrizione !== undefined) this.ultime.delete(id_pg);
    const esito = impara({
      lingua: this.o.lingua,
      ...(trascrizione !== undefined ? { trascrizione } : {}),
      ...(usata ? { correzioni: usata.correzioni } : {}),
      inviato,
      voci: this.vocabolario(id_pg),
      comuni: this.comuni,
      turno,
    });
    const nuovi: string[] = [];
    let cambiato = false;
    for (const a of esito.appresi) {
      const k = formaPiana(a.scritto);
      const prima = this.appresi.get(k);
      if (!prima) {
        this.appresi.set(k, a);
        nuovi.push(a.scritto);
        cambiato = true;
      } else {
        for (const s of a.sentiti) if (!prima.sentiti.includes(s)) (prima.sentiti.push(s), (cambiato = true));
      }
    }
    for (const r of esito.rifiutate) if (!this.rifiutate.has(r)) (this.rifiutate.add(r), (cambiato = true));
    while (this.appresi.size > MAX_APPRESI) this.appresi.delete(this.appresi.keys().next().value!);
    if (!cambiato) return;
    this.o.log.info(
      { id_pg, turno, appresi: esito.appresi.map((a) => (a.sentiti.length ? `${a.sentiti.join('/')} → ${a.scritto}` : a.scritto)), rifiutate: esito.rifiutate, totale: this.appresi.size },
      'dictation: learned from the sent action',
    );
    this.o.memoria?.scrivi([{ tipo: 'dettato', dati: this.esporta() }], null);
    if (nuovi.length) this.o.nomiAlLessico?.(nuovi);
  }

  esporta(): DettatoSalvato {
    return { appresi: [...this.appresi.values()], rifiutate: [...this.rifiutate] };
  }
}
