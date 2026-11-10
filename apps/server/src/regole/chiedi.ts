/**
 * «Chiedi una regola» (docs/regole.md, «Far capire le regole»): una domanda dal telefono, una risposta
 * breve di Haiku presa SOLO dai testi del set di regole (riassunto e passi del manuale trovati per
 * parole chiave). Niente della campagna entra nel contesto: né scene né PNG né segreti. La risposta
 * va solo al telefono che ha chiesto (ack dell'evento, trasporto/regole.ts).
 *
 * Prompt (prompts/<lingua>/risponditore-regole.md), messaggi e risposte d'errore sono nella lingua dei
 * contenuti (docs/lingue.md): testi-prove.yaml, chiavi «regole.domanda.…».
 */
import type { ModelloLinguaggio } from '../llm/modello';
import type { RispostaRegola } from '@cantastorie/shared';
import type { Logger } from '../logger';
import type { Costo } from '../llm/costi';
import { testo } from '../lingua';
import { promptProve } from '../prove/lingua';
import { cercaEstratti, testoEstratto } from './estratti';
import type { RegoleCampagna } from './tipi';

export const MAX_DOMANDA = 300;

export function promptRisponditore(r: RegoleCampagna): string {
  return promptProve('risponditore-regole', { nome: r.sistema.nome, riassunto: r.riassunto.slice(0, 3000) });
}

export class RisponditoreRegole {
  /** Una domanda alla volta per telefono, e non più di una ogni `intervalloMs`. */
  private readonly ultime = new Map<string, number>();
  private readonly inCorso = new Set<string>();

  constructor(
    private readonly regole: RegoleCampagna,
    /** Il modello (llm/modello.ts); null = domande sulle regole spente. */
    private readonly client: (() => ModelloLinguaggio) | null,
    private readonly o: { modello: string; log: Logger; onCosto?: (ms: number, c: Costo) => void; intervalloMs?: number },
  ) {}

  get disponibile(): boolean {
    return !!this.client && (this.regole.estratti.length > 0 || this.regole.riassunto.length > 0);
  }

  async chiedi(chi: string, domanda: unknown): Promise<RispostaRegola> {
    const d = typeof domanda === 'string' ? domanda.trim() : '';
    if (!d) return { ok: false, errore: testo('regole.domanda.vuota') };
    if (d.length > MAX_DOMANDA) return { ok: false, errore: testo('regole.domanda.lunga', { max: MAX_DOMANDA }) };
    if (!this.disponibile) return { ok: false, errore: testo('regole.domanda.spente') };
    const ora = Date.now();
    if (this.inCorso.has(chi) || ora - (this.ultime.get(chi) ?? 0) < (this.o.intervalloMs ?? 4000)) return { ok: false, errore: testo('regole.domanda.una_alla_volta') };
    this.inCorso.add(chi);
    this.ultime.set(chi, ora);
    const passi = cercaEstratti(this.regole.estratti, d, 3);
    const t0 = performance.now();
    try {
      const r = await this.client!().chiedi({
        sistema: [{ testo: promptRisponditore(this.regole), cache: true }],
        messaggi: [{ ruolo: 'user', testo: `${passi.length ? testo('regole.domanda.passi', { passi: passi.map((e) => testoEstratto(e, 12)).join('\n\n') }) : testo('regole.domanda.nessun_passo')}${testo('regole.domanda.domanda', { domanda: d })}` }],
        maxTokens: 400,
      });
      const ms = Math.round(performance.now() - t0);
      this.o.onCosto?.(ms, r.costo);
      if (!r.testo.trim()) return { ok: false, errore: testo('regole.domanda.nessuna_risposta') };
      this.o.log.info({ chi, ms, passi: passi.map((p) => p.id), caratteri: d.length }, 'regole: domanda di un giocatore');
      return { ok: true, testo: r.testo.trim(), fonti: passi.map((p) => p.titolo) };
    } catch (err) {
      this.o.log.error({ chi, err: (err as Error).message }, 'regole: domanda fallita');
      return { ok: false, errore: testo('regole.domanda.errore') };
    } finally {
      this.inCorso.delete(chi);
    }
  }
}
