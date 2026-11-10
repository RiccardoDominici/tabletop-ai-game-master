/**
 * Il lato server dello sceneggiatore (docs/sceneggiatore.md): scrive le richieste nella cartella
 * sorvegliata, solo se lo sceneggiatore gira (vivo.json recente), e raccoglie le risposte con un
 * controllo ogni secondo. Non blocca mai il gioco: chi chiede riceve la risposta in `onRisposta`,
 * quando arriva (o mai, se lo sceneggiatore si ferma: dopo SCADENZA_MS la richiesta si dimentica).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from '../logger';
import { cartelle, leggiJson, sceneggiatoreVivo, scriviJson, type RichiestaSceneggiatore, type RispostaSceneggiatore } from './protocollo';

/** Una richiesta senza risposta dopo questo tempo si dimentica. */
export const SCADENZA_MS = 10 * 60_000;

export interface OpzioniCanale {
  radice: string;
  log: Logger;
  adesso: () => number;
  onRisposta: (richiesta: RichiestaSceneggiatore, risposta: RispostaSceneggiatore) => void;
  intervalloMs?: number;
}

export class CanaleSceneggiatore {
  private readonly attese = new Map<string, { richiesta: RichiestaSceneggiatore; quando: number }>();
  private timer: NodeJS.Timeout | null = null;
  private progressivo = 0;
  private readonly c: ReturnType<typeof cartelle>;

  constructor(private readonly o: OpzioniCanale) {
    this.c = cartelle(o.radice);
  }

  /** Lo sceneggiatore gira adesso? */
  get vivo(): boolean {
    return sceneggiatoreVivo(this.o.radice, this.o.adesso());
  }

  /** Un id nuovo e unico per questa partita. */
  nuovoId(tipo: string, turno: number): string {
    this.progressivo += 1;
    return `${tipo}-t${turno}-${this.o.adesso().toString(36)}-${this.progressivo}`;
  }

  /** Scrive la richiesta; false = lo sceneggiatore non gira (non si chiede niente). */
  chiedi(r: RichiestaSceneggiatore): boolean {
    if (!this.vivo) return false;
    scriviJson(path.join(this.c.richieste, `${r.id}.json`), r);
    this.attese.set(r.id, { richiesta: r, quando: this.o.adesso() });
    this.o.log.info({ id: r.id, tipo: r.tipo, turno: r.turno, azione: r.azione?.id_pg ?? null }, 'sceneggiatore: richiesta');
    this.avvia();
    return true;
  }

  /** Quando è stata fatta una richiesta ancora in attesa (null = non c'è). */
  attesaDi(id: string): number | null {
    return this.attese.get(id)?.quando ?? null;
  }

  private avvia(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.raccogli(), this.o.intervalloMs ?? 1000);
    this.timer.unref();
  }

  /** Legge le risposte arrivate per le richieste in attesa; dimentica quelle troppo vecchie. */
  raccogli(): void {
    const adesso = this.o.adesso();
    for (const [id, a] of this.attese) {
      const file = path.join(this.c.risposte, `${id}.json`);
      const r = fs.existsSync(file) ? leggiJson<RispostaSceneggiatore>(file) : null;
      if (r) {
        this.attese.delete(id);
        fs.rmSync(file, { force: true });
        try {
          this.o.onRisposta(a.richiesta, r);
        } catch (err) {
          this.o.log.error({ id, err: (err as Error).message }, 'sceneggiatore: risposta non applicata');
        }
      } else if (adesso - a.quando > SCADENZA_MS) {
        this.attese.delete(id);
        this.o.log.warn({ id }, 'sceneggiatore: nessuna risposta, richiesta dimenticata');
      }
    }
    if (this.attese.size === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  chiudi(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
