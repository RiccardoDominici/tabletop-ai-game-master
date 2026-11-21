/**
 * Experience points of a rule set (mechanism M1 of docs/regole-audit/; docs/regole.md §2, «Esperienza»): what a defeated
 * monster or NPC is worth by its hit dice and special abilities, and the optional XP for treasure. The Engine counts
 * them in play (prove/esperienza.ts); the class tables of `classi[].px` say when a character reaches a level
 * (regole/progressione.ts).
 *
 *   esperienza:
 *     per_dadi_vita:                        # Basic Fantasy p. 49: from `da` hit dice up (0 = less than 1)
 *       - {da: 0, px: 10, speciale: 3}      #   px: the XP value; speciale: added once per special-ability asterisk
 *       - {da: 1, px: 25, speciale: 12}
 *     oltre: {px: 750, speciale: 25}        # each hit die above the last row adds these
 *     tesoro: {px: 1, per: mo, quando: al_sicuro}   # optional: 1 XP per gold piece of treasure; `trovato` counts it when
 *                                                   #   found, `al_sicuro` when the Game Master says it is back to safety
 *
 * A sheet may write its own worth (`scheda.px` on an NPC or a minion: «XP: 25» of a monster entry); otherwise its
 * `dadi_vita` (or a classed NPC's level, the larger of the two, p. 49) and its `speciali` (the asterisks) give it.
 */
import type { Monete } from './catalogo';
import { rigaDi } from './progressione';
import type { SchedaGenerica } from './tipi';

export interface RegolaEsperienza {
  perDadiVita: Array<{ da: number; px: number; speciale: number }>;
  oltre: { px: number; speciale: number } | null;
  tesoro: { px: number; moneta: string; quando: 'trovato' | 'al_sicuro' } | null;
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** `esperienza:` of the set; null without it. `monete`: the set's coins (a treasure rate is written in one). */
export function leggiEsperienza(v: unknown, monete: Monete | null, errori: string[]): RegolaEsperienza | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  if (!o) {
    errori.push('esperienza: {per_dadi_vita, oltre, tesoro}');
    return null;
  }
  const perDadiVita: RegolaEsperienza['perDadiVita'] = [];
  for (const [i, x] of (Array.isArray(o['per_dadi_vita']) ? o['per_dadi_vita'] : []).entries()) {
    const r = ogg(x);
    const sp = r?.['speciale'] ?? 0;
    if (!r || !intero(r['da']) || r['da'] < 0 || !intero(r['px']) || r['px'] < 0 || !intero(sp) || sp < 0) {
      errori.push(`esperienza.per_dadi_vita[${i + 1}]: {da: hit dice from 0, px: whole number, speciale: whole number}`);
      continue;
    }
    if (perDadiVita.length && r['da'] <= perDadiVita.at(-1)!.da) errori.push(`esperienza.per_dadi_vita[${i + 1}]: «da» grows row after row`);
    perDadiVita.push({ da: r['da'], px: r['px'], speciale: sp });
  }
  if (o['per_dadi_vita'] !== undefined && !Array.isArray(o['per_dadi_vita'])) errori.push('esperienza.per_dadi_vita: a list of {da, px, speciale}');
  let oltre: RegolaEsperienza['oltre'] = null;
  if (o['oltre'] !== undefined) {
    const x = ogg(o['oltre']);
    if (x && intero(x['px']) && x['px'] >= 0 && intero(x['speciale'] ?? 0)) oltre = { px: x['px'], speciale: (x['speciale'] as number | undefined) ?? 0 };
    else errori.push('esperienza.oltre: {px, speciale} added for each hit die above the last row');
  }
  let tesoro: RegolaEsperienza['tesoro'] = null;
  if (o['tesoro'] !== undefined && o['tesoro'] !== null) {
    const x = ogg(o['tesoro']);
    const moneta = x?.['per'] ?? monete?.base;
    const quando = x?.['quando'] ?? 'trovato';
    if (!x || !intero(x['px']) || (x['px'] as number) < 1) errori.push('esperienza.tesoro.px: the XP for each coin of `per`, a whole number from 1');
    else if (!monete || typeof moneta !== 'string' || !monete.tagli.some((t) => t.id === moneta)) errori.push('esperienza.tesoro.per: a coin of the set\'s monete');
    else if (quando !== 'trovato' && quando !== 'al_sicuro') errori.push('esperienza.tesoro.quando: trovato or al_sicuro');
    else tesoro = { px: x['px'] as number, moneta, quando };
  }
  return { perDadiVita, oltre, tesoro };
}

/** The hit dice a sheet counts as for XP: its `dadi_vita`, or a classed NPC's level when larger (p. 49); null = unknown. */
export function dadiVitaPerEsperienza(sch: SchedaGenerica): number | null {
  const dv = sch.dadiVita ?? null;
  const lv = sch.classe ? (sch.livello ?? null) : null;
  if (dv === null) return lv;
  return lv === null ? dv : Math.max(dv, lv);
}

/** What defeating a sheet is worth: its own `px`, else the set's table by hit dice and asterisks; null = unknown. */
export function pxDiScheda(r: RegolaEsperienza | null | undefined, sch: SchedaGenerica): number | null {
  if (sch.di_png && sch.px !== undefined && sch.px !== null) return sch.px;
  const dv = dadiVitaPerEsperienza(sch);
  if (!r || !r.perDadiVita.length || dv === null) return null;
  const riga = rigaDi(r.perDadiVita, dv)!;
  const sopra = r.oltre ? Math.max(0, dv - r.perDadiVita.at(-1)!.da) : 0;
  const base = riga.px + sopra * (r.oltre?.px ?? 0);
  const speciale = riga.speciale + sopra * (r.oltre?.speciale ?? 0);
  return base + (sch.speciali ?? 0) * speciale;
}

/** The XP a treasure is worth by the set's rate: `valore` in the smallest coin (null = no treasure XP in this set). */
export function pxDelTesoro(r: RegolaEsperienza | null | undefined, monete: Monete | null | undefined, valore: number): number | null {
  if (!r?.tesoro || !monete) return null;
  const vale = monete.tagli.find((t) => t.id === r.tesoro!.moneta)?.vale ?? 1;
  return Math.floor(valore / vale) * r.tesoro.px;
}
