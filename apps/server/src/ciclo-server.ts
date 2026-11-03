/**
 * Il server con il ciclo delle sessioni: «Prossima sessione» (pannello del master) chiude il server
 * e lo ricostruisce sullo stesso indirizzo col pacchetto dopo, con lo STESSO token del master, così
 * il pannello, il proiettore e i telefoni si ricollegano come dopo un riavvio (i telefoni ritrovano
 * il loro PG). Lo usa index.ts; i test d'integrazione anche.
 *
 * Se il pacchetto nuovo non parte (il controllo prima del cambio dovrebbe impedirlo), si torna al
 * pacchetto di prima: meglio la serata di prima che un server spento.
 */
import { costruisciServer, type ServerCantastorie, type Sostituzioni } from './avvio';
import type { ConfigServer } from './config';
import type { Logger } from './logger';
import { nuovoToken } from './master/token';

export class ServerConCiclo {
  private server: ServerCantastorie;
  private readonly osservatori: Array<(s: ServerCantastorie) => void> = [];
  private cambio: Promise<void> | null = null;

  private constructor(
    private config: ConfigServer,
    private readonly log: Logger,
    private readonly sost: Sostituzioni,
    primo: ServerCantastorie,
  ) {
    this.server = primo;
  }

  /** Costruisce e avvia il primo server; il token del master resta quello per tutti i cambi. */
  static async avvia(config: ConfigServer, log: Logger, sost: Sostituzioni = {}): Promise<ServerConCiclo> {
    const fisso: ConfigServer = { ...config, tokenMaster: config.tokenMaster ?? nuovoToken() };
    let ciclo: ServerConCiclo | null = null;
    const passaA = (n: number): void => void ciclo?.passaA(n);
    const primo = await costruisciServer(fisso, log, { ...sost, passaA });
    await primo.avvia();
    ciclo = new ServerConCiclo(fisso, log, { ...sost, passaA }, primo);
    return ciclo;
  }

  /** Il server attivo adesso (cambia a ogni «Prossima sessione»). */
  get corrente(): ServerCantastorie {
    return this.server;
  }

  /** Avvisa a ogni server nuovo (index.ts stampa di nuovo gli indirizzi). */
  alCambio(f: (s: ServerCantastorie) => void): void {
    this.osservatori.push(f);
  }

  /** Attende la fine di un cambio di pacchetto in corso (test). */
  async attendiCambio(): Promise<void> {
    await this.cambio;
  }

  private passaA(numero: number): Promise<void> {
    if (this.cambio) return this.cambio;
    this.cambio = this.ricostruisci(numero).finally(() => {
      this.cambio = null;
    });
    return this.cambio;
  }

  private async ricostruisci(numero: number): Promise<void> {
    const prima = this.server.campagna.pacchetto?.numero ?? null;
    this.log.info({ da: prima, a: numero }, 'sessioni: il server si ricostruisce sul pacchetto dopo');
    await this.server.chiudi();
    // La sessione nuova non è una ripresa, e --nuova valeva solo per il primo avvio.
    const tenta = async (n: number | null): Promise<ServerCantastorie> => {
      const s = await costruisciServer({ ...this.config, sessione: n, nuovaSessione: false }, this.log, this.sost);
      await s.avvia();
      return s;
    };
    try {
      this.server = await tenta(numero);
    } catch (err) {
      this.log.error({ pacchetto: numero, err: (err as Error).message }, 'sessioni: il pacchetto dopo non parte, si torna a quello di prima');
      this.server = await tenta(prima);
    }
    this.log.info({ pacchetto: this.server.campagna.pacchetto?.etichetta ?? null, titolo: this.server.campagna.pacchetto?.titolo ?? null }, 'sessioni: server pronto sul pacchetto nuovo');
    for (const f of this.osservatori) f(this.server);
  }

  async chiudi(): Promise<void> {
    await this.cambio?.catch(() => undefined);
    await this.server.chiudi();
  }
}
