/**
 * Regole dei tiri di d20 (SRD 5.2, «Tiri di d20», «Vantaggio e svantaggio», «Tiri per colpire»,
 * «Danni»). Funzioni pure sopra una FonteDadi: niente stato, niente modello.
 *
 * - Prova e tiro salvezza: d20 + modificatore ≥ CD → riuscita. Nell'SRD 5.2 il 20 e l'1 naturali
 *   NON decidono le prove e i tiri salvezza: conta solo il totale.
 * - Tiro per colpire: d20 + bonus ≥ CA → colpito; 20 naturale colpisce sempre (critico: si tirano
 *   due volte i dadi del danno), 1 naturale manca sempre.
 * - Vantaggio e svantaggio: due d20, il più alto o il più basso; non si sommano, e se ci sono
 *   entrambi si annullano (un d20 solo).
 */
import type { Vantaggio } from '@cantastorie/shared';
import type { FormulaDadi } from '../campagna/regole-srd';
import { scriviFormula } from '../campagna/regole-srd';
import type { FonteDadi } from './dadi';

export interface D20 {
  dadi: number[];
  dado: number;
  vantaggio: Vantaggio | null;
}

/** Vantaggio e svantaggio insieme: si annullano. Più fonti dello stesso: uno solo. */
export function combinaVantaggi(fonti: ReadonlyArray<Vantaggio | null | undefined>): Vantaggio | null {
  const v = fonti.includes('vantaggio');
  const s = fonti.includes('svantaggio');
  if (v && s) return null;
  return v ? 'vantaggio' : s ? 'svantaggio' : null;
}

export function tiraD20(dadi: FonteDadi, vantaggio: Vantaggio | null): D20 {
  if (!vantaggio) {
    const d = dadi.tira(20);
    return { dadi: [d], dado: d, vantaggio: null };
  }
  const a = dadi.tira(20);
  const b = dadi.tira(20);
  return { dadi: [a, b], dado: vantaggio === 'vantaggio' ? Math.max(a, b) : Math.min(a, b), vantaggio };
}

export interface EsitoD20 extends D20 {
  modificatore: number;
  totale: number;
  bersaglio: number;
  riuscita: boolean;
}

/** Prova di caratteristica o tiro salvezza contro una CD. */
export function prova(dadi: FonteDadi, modificatore: number, cd: number, vantaggio: Vantaggio | null): EsitoD20 {
  const d = tiraD20(dadi, vantaggio);
  const totale = d.dado + modificatore;
  return { ...d, modificatore, totale, bersaglio: cd, riuscita: totale >= cd };
}

export interface EsitoDanno {
  formula: string;
  dadi: number[];
  bonus: number;
  totale: number;
}

/** Danno: dadi della formula (due volte nel critico) + bonus; mai sotto 0 (SRD: niente danni negativi). */
export function danno(dadi: FonteDadi, f: FormulaDadi, bonus: number, critico: boolean): EsitoDanno {
  const numero = f.numero * (critico ? 2 : 1);
  const valori = Array.from({ length: numero }, () => dadi.tira(f.facce));
  const b = f.bonus + bonus;
  const totale = Math.max(0, valori.reduce((s, x) => s + x, 0) + b);
  return { formula: scriviFormula({ numero, facce: f.facce, bonus: b }), dadi: valori, bonus: b, totale };
}

export interface EsitoAttacco extends EsitoD20 {
  critico: boolean;
  fallimento_critico: boolean;
  danno: EsitoDanno | null;
}

/** Tiro per colpire contro la CA, e il danno se colpisce. */
export function attacco(dadi: FonteDadi, bonus: number, ca: number, vantaggio: Vantaggio | null, f: FormulaDadi, bonusDanno: number): EsitoAttacco {
  const d = tiraD20(dadi, vantaggio);
  const totale = d.dado + bonus;
  const critico = d.dado === 20;
  const fallimento_critico = d.dado === 1;
  const riuscita = critico || (!fallimento_critico && totale >= ca);
  return {
    ...d,
    modificatore: bonus,
    totale,
    bersaglio: ca,
    riuscita,
    critico,
    fallimento_critico,
    danno: riuscita ? danno(dadi, f, bonusDanno, critico) : null,
  };
}

/**
 * Prova contrapposta tra due PG (l'SRD 5.2 non ha più una regola generale: docs/prove.md): tirano
 * entrambi, vince il totale più alto; a parità nessuno prevale e la situazione resta com'era.
 */
export function contesa(dadi: FonteDadi, modA: number, vantaggioA: Vantaggio | null, modB: number, vantaggioB: Vantaggio | null): { a: EsitoD20; b: D20 & { modificatore: number; totale: number }; vince: 'a' | 'b' | 'pari' } {
  const da = tiraD20(dadi, vantaggioA);
  const db = tiraD20(dadi, vantaggioB);
  const ta = da.dado + modA;
  const tb = db.dado + modB;
  const vince = ta > tb ? 'a' : tb > ta ? 'b' : 'pari';
  return {
    a: { ...da, modificatore: modA, totale: ta, bersaglio: tb, riuscita: vince === 'a' },
    b: { ...db, modificatore: modB, totale: tb },
    vince,
  };
}
