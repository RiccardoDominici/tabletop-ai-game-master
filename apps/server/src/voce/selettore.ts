/**
 * Sceglie il motore vocale in uso e lo dice chiaramente nel log.
 *
 * - modo 'qwen': sempre il servizio locale (se è giù le frasi falliscono, con errore nel log);
 * - modo 'mock': sempre il finto;
 * - modo 'auto': controlla /salute ogni N secondi; usa Qwen quando `pronto` è vero, altrimenti
 *   il finto. Ogni cambio finisce nel log e viene notificato (lo stato del tavolo lo mostra).
 */
import type { Logger } from '../logger';
import type { ModoVoce } from '../config';
import type { MotoreVoce, NomeMotoreVoce, SaluteVoce } from './tipi';

export class SelettoreVoce {
  private corrente: MotoreVoce;
  private timer: NodeJS.Timeout | null = null;
  private ascoltatori = new Set<(nome: NomeMotoreVoce) => void>();
  /** Ultima risposta di /salute del servizio vero (null se mai raggiunto). */
  saluteQwen: SaluteVoce | null = null;

  constructor(
    private readonly modo: ModoVoce,
    private readonly qwen: MotoreVoce,
    private readonly mock: MotoreVoce,
    private readonly log: Logger,
    private readonly intervalloMs: number,
  ) {
    this.corrente = modo === 'qwen' ? qwen : mock;
  }

  get attivo(): MotoreVoce {
    return this.corrente;
  }

  get nome(): NomeMotoreVoce {
    return this.corrente.nome;
  }

  /** Voci note al motore attivo (per controllare i voce_id della campagna). */
  get voci(): string[] | null {
    return this.corrente.nome === 'qwen' ? (this.saluteQwen?.voci ?? null) : null;
  }

  onCambio(cb: (nome: NomeMotoreVoce) => void): () => void {
    this.ascoltatori.add(cb);
    return () => this.ascoltatori.delete(cb);
  }

  async avvia(): Promise<void> {
    if (this.modo === 'mock') {
      this.log.info({ voce: 'mock', modo: this.modo }, 'VOCE IN USO: mock (tono finto, configurato)');
      return;
    }
    await this.controlla(true);
    if (this.modo === 'auto') {
      this.timer = setInterval(() => void this.controlla(false), this.intervalloMs);
      this.timer.unref();
    }
  }

  ferma(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async controlla(primaVolta: boolean): Promise<void> {
    let salute: SaluteVoce | null = null;
    let errore: string | null = null;
    try {
      salute = await this.qwen.salute(AbortSignal.timeout(2000));
      this.saluteQwen = salute;
    } catch (err) {
      errore = (err as Error).message;
    }
    const pronto = salute?.pronto === true;
    if (this.modo === 'qwen') {
      if (primaVolta) {
        if (pronto) this.log.info({ voce: 'qwen', modello: salute?.modello, voci: salute?.voci }, 'VOCE IN USO: qwen (servizio locale pronto)');
        else this.log.error({ voce: 'qwen', errore, pronto: salute?.pronto ?? null }, 'VOCE IN USO: qwen, ma il servizio non è pronto');
      }
      return;
    }
    const voluto = pronto ? this.qwen : this.mock;
    if (voluto !== this.corrente || primaVolta) {
      const prima = this.corrente.nome;
      this.corrente = voluto;
      if (voluto.nome === 'qwen') {
        this.log.info({ voce: 'qwen', modo: 'auto', modello: salute?.modello, voci: salute?.voci }, 'VOCE IN USO: qwen (servizio locale pronto)');
      } else {
        this.log.warn({ voce: 'mock', modo: 'auto', errore, prontoQwen: salute?.pronto ?? null }, 'VOCE IN USO: mock (servizio Qwen non pronto o giù)');
      }
      if (prima !== voluto.nome || primaVolta) for (const cb of this.ascoltatori) cb(voluto.nome);
    }
  }
}
