/**
 * Narratore (llm/tipi.ts) su un modello qualsiasi dell'interfaccia unica (llm/modello.ts): il lettore
 * del protocollo a righe etichettate, in streaming. Con Anthropic è il narratore di sempre (blocchi di
 * sistema tutti in cache, preriscaldamento a 0 token); con un server compatibile OpenAI (locale o in
 * rete) lo stesso prompt e lo stesso messaggio, e il prefisso fisso lo riusa la cache del server.
 */
import type { ModelloLinguaggio, RichiestaModello } from './modello';
import type { EsitoNarrazione, NomeNarratore, Narratore, RichiestaNarrazione } from './tipi';

export class NarratoreModello implements Narratore {
  readonly modello: string;

  constructor(
    readonly nome: NomeNarratore,
    private readonly m: ModelloLinguaggio,
    private readonly maxTokens: number,
  ) {
    this.modello = m.modello;
    if (!m.capacita.preriscalda) this.preriscalda = undefined;
  }

  private richiesta(sistema: string[], messaggio: string, maxTokens: number, signal?: AbortSignal): RichiestaModello {
    return { sistema: sistema.map((testo) => ({ testo, cache: true })), messaggi: [{ ruolo: 'user', testo: messaggio }], maxTokens, ...(signal ? { signal } : {}) };
  }

  async narra(r: RichiestaNarrazione, onTesto: (delta: string) => void): Promise<EsitoNarrazione> {
    const e = await this.m.flusso(this.richiesta(r.sistema, r.messaggio, this.maxTokens, r.signal), onTesto);
    return { testo: e.testo, modello: e.modello, stopReason: e.stopReason, uso: e.uso, costo: e.costo, idMessaggio: e.id };
  }

  /** Solo dove il provider lo ammette (Anthropic: max_tokens 0, non in streaming, stessi parametri dei turni). */
  preriscalda?: (sistema: string[]) => Promise<EsitoNarrazione | null> = async (sistema) => {
    const e = await this.m.chiedi(this.richiesta(sistema, 'Preriscaldamento della cache: non rispondere.', 0));
    return { testo: '', modello: e.modello, stopReason: e.stopReason, uso: e.uso, costo: e.costo, idMessaggio: e.id };
  };
}
