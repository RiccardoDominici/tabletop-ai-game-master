/**
 * Pannello del master headless per gli esperimenti: entra nella stanza "master" col token e manda
 * gli stessi comandi del pannello web (apps/web/src/master → evento `master:comando`). Serve ai
 * cambi di scena dei copioni (`- {scena: <id>}`).
 *
 * Il token lo fissa l'esperimento all'avvio (CANTASTORIE_MASTER_TOKEN, apps/server/src/config.ts):
 * così non si legge dal log del server e non finisce mai sulla console.
 */
import type { Socket } from 'socket.io-client';
import type { ComandoMaster, Esito, EsitoEntrataMaster, EventiClientVersoServer, EventiServerVersoClient, StatoMaster } from '@cantastorie/shared';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;

export class MasterHeadless {
  private constructor(
    private readonly socket: Client,
    private ultimo: StatoMaster,
  ) {
    socket.on('master:stato', (s) => {
      this.ultimo = s;
    });
  }

  static async entra(socket: Client, token: string): Promise<MasterHeadless> {
    const esito = await new Promise<EsitoEntrataMaster>((r) => socket.emit('master:entra', { token }, r));
    if (!esito.ok) throw new Error(`master: entrata rifiutata (${esito.errore})`);
    return new MasterHeadless(socket, esito.stato);
  }

  /** Id della scena in corso secondo l'ultima istantanea del pannello. */
  get scenaCorrente(): string | null {
    return this.ultimo.scene.find((s) => s.corrente)?.id ?? null;
  }

  comando(c: ComandoMaster): Promise<Esito> {
    return new Promise<Esito>((r) => this.socket.emit('master:comando', c, r));
  }

  /** Cambio di scena come dal pannello: a finestra aperta il turno riparte con l'apertura della nuova scena. */
  scena(id: string): Promise<Esito> {
    return this.comando({ tipo: 'scena', scena: id });
  }

  chiudi(): void {
    this.socket.disconnect();
  }
}
