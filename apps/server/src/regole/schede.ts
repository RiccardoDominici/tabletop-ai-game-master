/**
 * Schede di PG e PNG per un set di regole non SRD (docs/regole.md, «Schede»): i valori seguono le
 * caratteristiche e le abilità del set, non più le sei di D&D. Stessi posti delle schede SRD:
 * pg.yaml → personaggi[].scheda, png/<id>.yaml → scheda.
 *
 *   scheda:
 *     caratteristiche: {fascino: 2, duro: 1, …}   # tutte quelle del set: punteggio (srd, tabella), bonus (diretto) o soglia
 *     abilita: {persuasione: 45}                   # facoltative: bonus, o soglia per sotto_soglia
 *     pf: 10
 *     difesa: 13                                   # d20_cd: la CA
 *     armatura: 1                                  # attacchi automatici: riduce il danno subito
 *     attacchi: [{nome: "Spada", danno: "1d8", caratteristica: duro}]
 */
import { chiave, leggiFormula, modificatore } from '../campagna/regole-srd';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { SchedaGenerica, SistemaRegole } from './tipi';

const ogg = (v: unknown): DatiYaml | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as DatiYaml) : null);
const intero = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);

export function leggiSchedaGenerica(s: SistemaRegole, id: string, nome: string, di_png: boolean, grezza: unknown): SchedaGenerica | null {
  const o = ogg(grezza);
  if (!o) return null;
  const avvisi: string[] = [];
  const dove = `${id}.scheda`;
  const caratteristiche: Record<string, number> = {};
  const car = ogg(o['caratteristiche']) ?? {};
  for (const c of s.caratteristiche) {
    const v = intero(car[c.id]);
    if (v === null) avvisi.push(`${dove}.caratteristiche: manca ${c.id} (vale ${caratteristicaPredefinita(s)})`);
    caratteristiche[c.id] = v ?? caratteristicaPredefinita(s);
  }
  for (const k of Object.keys(car)) if (!s.caratteristiche.some((c) => c.id === k)) avvisi.push(`${dove}.caratteristiche: «${k}» non è del set ${s.id}`);
  const abilita: Record<string, number> = {};
  for (const [k, v] of Object.entries(ogg(o['abilita']) ?? {})) {
    if (!s.abilita.some((a) => a.id === k)) avvisi.push(`${dove}.abilita: «${k}» non è del set ${s.id}`);
    else if (intero(v) === null) avvisi.push(`${dove}.abilita.${k}: un numero intero`);
    else abilita[k] = v as number;
  }
  const pf = intero(o['pf']) ?? intero(o['pf_massimi']);
  if (pf === null || pf < 1) avvisi.push(`${dove}: mancano i punti ferita (pf), uso 1`);
  const attacchi = (Array.isArray(o['attacchi']) ? o['attacchi'] : []).flatMap((x, i) => {
    const a = ogg(x);
    const n = typeof a?.['nome'] === 'string' ? a['nome'].trim() : '';
    if (!a || !n) {
      avvisi.push(`${dove}.attacchi[${i + 1}]: senza nome, ignorato`);
      return [];
    }
    const danno = leggiFormula(a['danno']);
    if (!danno) avvisi.push(`${dove}.attacchi[${i + 1}]: danno «${String(a['danno'])}» non è una formula come 1d6 (uso 1d4)`);
    const c = typeof a['caratteristica'] === 'string' && s.caratteristiche.some((x) => x.id === a['caratteristica']) ? (a['caratteristica'] as string) : null;
    const ab = typeof a['abilita'] === 'string' && s.abilita.some((x) => x.id === a['abilita']) ? (a['abilita'] as string) : null;
    if (a['automatico'] !== undefined && typeof a['automatico'] !== 'boolean') avvisi.push(`${dove}.attacchi[${i + 1}].automatico: true o false`);
    return [{ id: chiave(n), nome: n, danno: danno ?? { numero: 1, facce: 4, bonus: 0 }, caratteristica: c, abilita: ab, tipo_danno: typeof a['tipo_danno'] === 'string' ? a['tipo_danno'] : null, distanza: a['distanza'] === true, ...(a['automatico'] === true ? { automatico: true } : {}) }];
  });
  return { id, nome, di_png, caratteristiche, abilita, pf_massimi: pf && pf > 0 ? pf : 1, difesa: intero(o['difesa']) ?? intero(o['ca']), armatura: intero(o['armatura']) ?? 0, attacchi, avvisi };
}

export function caricaSchedeGeneriche(s: SistemaRegole, c: Pick<Campagna, 'pg' | 'png'>, avvisa: (m: string) => void = () => {}): Map<string, SchedaGenerica> {
  const out = new Map<string, SchedaGenerica>();
  for (const p of c.pg) {
    const x = leggiSchedaGenerica(s, p.id, p.nome, false, p.pubblico['scheda']);
    if (x) out.set(p.id, x);
  }
  for (const p of c.png) {
    const x = leggiSchedaGenerica(s, p.id, p.nome, true, p.dati['scheda']);
    if (x) out.set(p.id, x);
  }
  for (const x of out.values()) for (const a of x.avvisi) avvisa(`scheda ${a}`);
  return out;
}

/** Il valore di una caratteristica che manca dalla scheda: quello che dà +0 (10 nell'SRD, la riga +0 della tabella). */
export function caratteristicaPredefinita(s: SistemaRegole): number {
  if (s.modificatore === 'srd') return 10;
  if (s.modificatore === 'tabella') return s.tabellaModificatori?.find((r) => r.mod === 0)?.da ?? s.tabellaModificatori?.[0]?.da ?? 0;
  return 0;
}

/** Il bonus della tabella del manuale per un punteggio: la riga più alta con `da` ≤ punteggio (sotto la prima, la prima). */
export function bonusDaTabella(tabella: ReadonlyArray<{ da: number; mod: number }>, punteggio: number): number {
  let mod = tabella[0]?.mod ?? 0;
  for (const r of tabella) if (punteggio >= r.da) mod = r.mod;
  return mod;
}

/** Il numero che una caratteristica porta al tiro: modificatore SRD, valore diretto, soglia, o bonus dalla tabella. */
export function valoreCaratteristica(s: SistemaRegole, scheda: SchedaGenerica, id: string): number {
  const v = scheda.caratteristiche[id] ?? caratteristicaPredefinita(s);
  if (s.modificatore === 'srd') return modificatore(v);
  if (s.modificatore === 'tabella') return bonusDaTabella(s.tabellaModificatori ?? [], v);
  return v;
}
