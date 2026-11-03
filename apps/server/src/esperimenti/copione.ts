/**
 * Copioni degli esperimenti (esperimenti/copioni/README.md, stesso formato letto da
 * strumenti/valida/copioni.py):
 *
 *   scena: <id>            # facoltativo: scena di partenza (senza, quella iniziale della campagna)
 *   pg: [pg_a, pg_b]
 *   turni:
 *     - - {scena: <id>}    # facoltativo, in testa al turno: il master cambia scena prima delle azioni
 *       - {pg: pg_a, azione: "…"}
 *       - {pg: pg_b, azione: "…", privata: true}   # azione privata, come la manda il telefono
 *
 * Il caricatore normalizza ogni voce in un Passo e controlla il copione contro la campagna PRIMA di
 * avviare il server: un id sbagliato si scopre subito, non al turno 9 dopo dieci minuti di Haiku.
 */
import fs from 'node:fs';
import YAML from 'yaml';
import type { Campagna } from '../campagna/tipi';

export type Passo = { tipo: 'azione'; pg: string; azione: string; privata: boolean } | { tipo: 'scena'; scena: string };

export interface Copione {
  pg: string[];
  /** Scena di partenza dichiarata dal copione (null = quella iniziale della campagna). */
  scena: string | null;
  turni: Passo[][];
}

export class ErroreCopione extends Error {}

function passo(voce: unknown, turno: number): Passo {
  if (!voce || typeof voce !== 'object') throw new ErroreCopione(`turno ${turno}: voce non valida (${JSON.stringify(voce)})`);
  const v = voce as Record<string, unknown>;
  if (typeof v['scena'] === 'string' && v['azione'] === undefined) return { tipo: 'scena', scena: v['scena'] };
  if (typeof v['pg'] === 'string' && typeof v['azione'] === 'string') {
    return { tipo: 'azione', pg: v['pg'], azione: v['azione'], privata: v['privata'] === true };
  }
  throw new ErroreCopione(`turno ${turno}: ogni voce è {pg, azione[, privata]} oppure {scena} (${JSON.stringify(voce)})`);
}

export function caricaCopione(file: string): Copione {
  const grezzo = YAML.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown> | null;
  if (!grezzo || !Array.isArray(grezzo['pg']) || !Array.isArray(grezzo['turni'])) throw new ErroreCopione(`${file}: servono «pg» e «turni»`);
  const turni = (grezzo['turni'] as unknown[]).map((t, i) => {
    if (!Array.isArray(t)) throw new ErroreCopione(`turno ${i + 1}: non è una lista di voci`);
    return t.map((v) => passo(v, i + 1));
  });
  return { pg: (grezzo['pg'] as unknown[]).map(String), scena: typeof grezzo['scena'] === 'string' ? grezzo['scena'] : null, turni };
}

/** Errori del copione rispetto alla campagna (vuoto = si può giocare). */
export function controllaCopione(c: Copione, campagna: Campagna): string[] {
  const errori: string[] = [];
  const scene = new Set(campagna.scene.map((s) => s.id));
  const pgCampagna = new Set(campagna.pg.map((p) => p.id));
  for (const pg of c.pg) if (!pgCampagna.has(pg)) errori.push(`PG ${pg} non è in ${campagna.id}/pg.yaml`);
  if (c.scena && !scene.has(c.scena)) errori.push(`scena di partenza ${c.scena} inesistente`);
  c.turni.forEach((turno, i) => {
    const n = i + 1;
    if (!turno.some((p) => p.tipo === 'azione')) errori.push(`turno ${n}: nessuna azione`);
    const visti = new Set<string>();
    let azioniViste = false;
    for (const p of turno) {
      if (p.tipo === 'scena') {
        if (!scene.has(p.scena)) errori.push(`turno ${n}: scena ${p.scena} inesistente`);
        // Il cambio di scena annulla le azioni vive: in mezzo al turno cancellerebbe quelle già mandate.
        if (azioniViste) errori.push(`turno ${n}: il cambio di scena va in testa al turno, prima delle azioni`);
        continue;
      }
      azioniViste = true;
      if (!c.pg.includes(p.pg)) errori.push(`turno ${n}: ${p.pg} non è tra i pg del copione`);
      if (visti.has(p.pg)) errori.push(`turno ${n}: due azioni di ${p.pg} (al massimo una per PG)`);
      visti.add(p.pg);
    }
  });
  return errori;
}

/** Quante azioni private ha il copione (per il riepilogo). */
export function contaPrivate(c: Copione): number {
  return c.turni.flat().filter((p) => p.tipo === 'azione' && p.privata).length;
}
