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
import { leggiTratti, type Tratto } from './tratti';
import { voce } from './catalogo';
import { applicaDotazione, dotazioneIniziale } from './equipaggiamento';
import { valoriDaClasse } from './progressione';

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
    // `arma:` a catalog weapon (M2): the line takes its damage, bands and ammunition from it (regole/equipaggiamento.ts).
    const armaCat = typeof a['arma'] === 'string' ? a['arma'] : null;
    if (armaCat && voce(s.catalogo, armaCat)?.tipo !== 'arma') avvisi.push(`${dove}.attacchi[${i + 1}].arma: «${armaCat}» non è un'arma del catalogo del set`);
    const danno = leggiFormula(a['danno']);
    if (!danno && !armaCat) avvisi.push(`${dove}.attacchi[${i + 1}]: danno «${String(a['danno'])}» non è una formula come 1d6 (uso 1d4)`);
    const c = typeof a['caratteristica'] === 'string' && s.caratteristiche.some((x) => x.id === a['caratteristica']) ? (a['caratteristica'] as string) : null;
    const ab = typeof a['abilita'] === 'string' && s.abilita.some((x) => x.id === a['abilita']) ? (a['abilita'] as string) : null;
    if (a['automatico'] !== undefined && typeof a['automatico'] !== 'boolean') avvisi.push(`${dove}.attacchi[${i + 1}].automatico: true o false`);
    // `consuma`: a resource of the set each attack spends (ammunition); refused when it is at 0 (prove/risorse.ts).
    const consuma = typeof a['consuma'] === 'string' && (s.risorse ?? []).some((r) => r.id === a['consuma']) ? { consuma: a['consuma'] as string } : {};
    if (typeof a['consuma'] === 'string' && !('consuma' in consuma)) avvisi.push(`${dove}.attacchi[${i + 1}].consuma: «${a['consuma']}» non è una risorsa del set`);
    return [{ id: chiave(n), nome: n, danno: danno ?? { numero: 1, facce: 4, bonus: 0 }, caratteristica: c, abilita: ab, tipo_danno: typeof a['tipo_danno'] === 'string' ? a['tipo_danno'] : null, distanza: a['distanza'] === true, ...(a['automatico'] === true ? { automatico: true } : {}), ...consuma, ...(armaCat ? { arma: armaCat } : {}) }];
  });
  const difesa = intero(o['difesa']) ?? intero(o['ca']);
  const sch: SchedaGenerica = { id, nome, di_png, caratteristiche, abilita, pf_massimi: pf && pf > 0 ? pf : 1, difesa, armatura: intero(o['armatura']) ?? 0, attacchi, ...classeDellaScheda(s, o, dove, avvisi), ...risorseDellaScheda(s, o, dove, avvisi), ...equipaggiamentoDellaScheda(s, o, dove, avvisi), ...esperienzaDellaScheda(o, dove, avvisi), avvisi };
  // The class tables give the abilities that grow with the level (M1); a value the sheet writes stays, as an override.
  sch.abilitaScritte = { ...abilita };
  for (const x of derivaAbilita(s, sch)) avvisi.push(`${dove}.abilita.${x.id}: ${x.scritto} scritto a mano, la tabella della classe dà ${x.tabella} al livello ${sch.livello ?? 1}: vale quello della scheda`);
  // Gear from the catalog: the AC and the attack lines come from it (the sheet's own lines stay after the weapons').
  if (sch.equipaggiamento) {
    sch.attacchiPropri = attacchi;
    sch.difesaScritta = difesa;
    const da = applicaDotazione(s, sch, dotazioneIniziale(sch));
    if (difesa !== null && sch.difesa !== difesa) avvisi.push(`${dove}: difesa ${difesa} diversa da quella dell'equipaggiamento (${sch.difesa}, ${da}): vale quella dell'equipaggiamento`);
  }
  return sch;
}

/**
 * The abilities a sheet's class and level give (regole/progressione.ts), merged under the ones it writes by hand
 * (`abilitaScritte`, which win: an override). Called when a sheet is read and again when its level changes (a level-up
 * between sessions, prove/livelli.ts). Returns the overrides that disagree with the table, for the log and the validator.
 */
export function derivaAbilita(s: SistemaRegole, sch: SchedaGenerica): Array<{ id: string; scritto: number; tabella: number }> {
  const classe = sch.classe ? (s.classi ?? []).find((c) => c.id === sch.classe) : undefined;
  const tabella = valoriDaClasse(s.progressione, classe?.progressione ?? null, sch.livello ?? 1, trattiDi(s, sch), sch.classe ?? null);
  const scritte = sch.abilitaScritte ?? sch.abilita;
  sch.abilita = { ...tabella, ...scritte };
  return Object.entries(tabella).flatMap(([id, n]) => (scritte[id] !== undefined && scritte[id] !== n ? [{ id, scritto: scritte[id]!, tabella: n }] : []));
}

/** The sheet's XP (`px`: a PC's total, an NPC's worth) and a monster's special-ability asterisks (`speciali`). */
function esperienzaDellaScheda(o: DatiYaml, dove: string, avvisi: string[]): Pick<SchedaGenerica, 'px' | 'speciali'> {
  const out: Pick<SchedaGenerica, 'px' | 'speciali'> = {};
  for (const k of ['px', 'speciali'] as const) {
    if (o[k] === undefined) continue;
    const n = intero(o[k]);
    if (n === null || n < 0) avvisi.push(`${dove}.${k}: un intero da 0 in su`);
    else out[k] = n;
  }
  return out;
}

/**
 * The sheet's catalog gear and coins (`equipaggiamento`, `monete`; M2): ids of the set's catalog, how many, and whether an
 * armor or shield is worn (the first of each kind is, unless `indossato: false`). Unknown ids are reported and dropped.
 */
function equipaggiamentoDellaScheda(s: SistemaRegole, o: DatiYaml, dove: string, avvisi: string[]): Pick<SchedaGenerica, 'equipaggiamento' | 'monete'> {
  const out: Pick<SchedaGenerica, 'equipaggiamento' | 'monete'> = {};
  if (o['equipaggiamento'] !== undefined) {
    if (!s.catalogo) avvisi.push(`${dove}.equipaggiamento: il set ${s.id} non ha un catalogo`);
    else if (!Array.isArray(o['equipaggiamento'])) avvisi.push(`${dove}.equipaggiamento: una lista di id del catalogo`);
    else {
      const lista: NonNullable<SchedaGenerica['equipaggiamento']> = [];
      const vestiti = new Set<string>();
      for (const [i, x] of o['equipaggiamento'].entries()) {
        const e = typeof x === 'string' ? { id: x } : ogg(x);
        const id = typeof e?.['id'] === 'string' ? e['id'] : null;
        const v = id ? voce(s.catalogo, id) : null;
        const quante = e?.['quante'] === undefined ? 1 : intero(e['quante']) && (e['quante'] as number) >= 0 ? (e['quante'] as number) : null;
        if (!e || !id || !v || quante === null) {
          avvisi.push(`${dove}.equipaggiamento[${i + 1}]: un id del catalogo del set${id && !v ? ` («${id}» non c'è)` : ''}, o {id, quante, indossato}`);
          continue;
        }
        // Worn: an armor or a shield, the first of its kind unless the sheet says otherwise.
        const indossabile = v.tipo === 'armatura' || v.tipo === 'scudo';
        const indossato = indossabile && e['indossato'] !== false && !vestiti.has(v.tipo);
        if (indossato) vestiti.add(v.tipo);
        if (e['indossato'] === true && !indossato) avvisi.push(`${dove}.equipaggiamento.${id}: ${indossabile ? 'si indossa una sola armatura e un solo scudo' : 'non si indossa'}`);
        lista.push({ id, quante, indossato });
      }
      out.equipaggiamento = lista;
    }
  }
  const m = ogg(o['monete']);
  if (o['monete'] !== undefined) {
    if (!s.monete || !m) avvisi.push(`${dove}.monete: ${s.monete ? '{id di moneta: quante}' : `il set ${s.id} non ha monete`}`);
    else {
      const r: Record<string, number> = {};
      for (const [k, n] of Object.entries(m)) {
        if (!s.monete.tagli.some((t) => t.id === k)) avvisi.push(`${dove}.monete: «${k}» non è una moneta del set ${s.id}`);
        else if (!intero(n) || (n as number) < 0) avvisi.push(`${dove}.monete.${k}: un intero da 0 in su`);
        else r[k] = n as number;
      }
      out.monete = r;
    }
  }
  return out;
}

/**
 * What the sheet carries for the set's resources and powers (regole/risorse.ts, regole/poteri.ts): counters, prepared
 * or known spells, spell slots written by hand, items with a power, creature types, immunities, hit dice. Ids the set
 * does not have are reported and dropped.
 */
function risorseDellaScheda(s: SistemaRegole, o: DatiYaml, dove: string, avvisi: string[]): Pick<SchedaGenerica, 'risorse' | 'incantesimi' | 'slot' | 'oggetti' | 'tipo' | 'immune' | 'dadiVita'> {
  const out: Pick<SchedaGenerica, 'risorse' | 'incantesimi' | 'slot' | 'oggetti' | 'tipo' | 'immune' | 'dadiVita'> = {};
  const poteri = new Map((s.poteri ?? []).map((p) => [p.id, p]));
  const conteggi = (k: string, ammesso: (id: string) => boolean, nomeCosa: string): Record<string, number> | undefined => {
    const m = ogg(o[k]);
    if (!m) return undefined;
    const r: Record<string, number> = {};
    for (const [id, n] of Object.entries(m)) {
      if (!ammesso(id)) avvisi.push(`${dove}.${k}: «${id}» non è ${nomeCosa} del set ${s.id}`);
      else if (intero(n) === null || (n as number) < 0) avvisi.push(`${dove}.${k}.${id}: un intero da 0 in su`);
      else r[id] = n as number;
    }
    return r;
  };
  const risorse = conteggi('risorse', (id) => (s.risorse ?? []).some((r) => r.id === id), 'una risorsa');
  if (risorse) out.risorse = risorse;
  const oggetti = conteggi('oggetti', (id) => poteri.get(id)?.tipo === 'oggetto', 'un oggetto (potere di tipo oggetto)');
  if (oggetti) out.oggetti = oggetti;
  if (Array.isArray(o['incantesimi'])) {
    out.incantesimi = o['incantesimi'].filter((id): id is string => {
      const ok = typeof id === 'string' && poteri.get(id)?.tipo === 'incantesimo';
      if (!ok) avvisi.push(`${dove}.incantesimi: «${String(id)}» non è un incantesimo del set ${s.id}`);
      return ok;
    });
  }
  if (Array.isArray(o['slot'])) {
    const slot = o['slot'].map((n) => intero(n));
    if (slot.some((n) => n === null || n < 0)) avvisi.push(`${dove}.slot: incantesimi al giorno per livello, interi da 0 in su`);
    else out.slot = slot as number[];
  }
  const lista = (k: string): string[] | undefined => (Array.isArray(o[k]) ? o[k].filter((x): x is string => typeof x === 'string') : typeof o[k] === 'string' ? [o[k] as string] : undefined);
  const tipo = lista('tipo');
  if (tipo) out.tipo = tipo;
  const immune = lista('immune');
  if (immune) out.immune = immune;
  const dv = intero(o['dadi_vita']);
  if (o['dadi_vita'] !== undefined && (dv === null || dv < 0)) avvisi.push(`${dove}.dadi_vita: un intero (i più e i meno non contano, Basic Fantasy p. 54)`);
  else if (dv !== null) out.dadiVita = dv;
  return out;
}

/**
 * The sheet's class, level, race and «save as» (`classe`, `livello`, `razza`, `salva_come`), as ids of the set: they
 * pick the rows of the class tables and the race's traits. An id the set does not have is reported and dropped.
 */
function classeDellaScheda(s: SistemaRegole, o: DatiYaml, dove: string, avvisi: string[]): Pick<SchedaGenerica, 'classe' | 'livello' | 'razza' | 'salvaCome' | 'tratti'> {
  const classi = new Set((s.classi ?? []).map((c) => c.id));
  const out: Pick<SchedaGenerica, 'classe' | 'livello' | 'razza' | 'salvaCome' | 'tratti'> = {};
  if (o['tratti'] !== undefined) {
    const errori: string[] = [];
    out.tratti = leggiTratti(o['tratti'], `${dove}.tratti`, { abilita: new Set(s.abilita.map((a) => a.id)), colonne: new Set((s.tiriSalvezza?.colonne ?? []).map((c) => c.id)) }, errori);
    avvisi.push(...errori);
  }
  if (typeof o['classe'] === 'string') {
    if (classi.has(o['classe'])) out.classe = o['classe'];
    else avvisi.push(`${dove}.classe: «${o['classe']}» non è una classe del set ${s.id}`);
  }
  const livello = intero(o['livello']);
  if (o['livello'] !== undefined && (livello === null || livello < 0)) avvisi.push(`${dove}.livello: un intero da 0 in su`);
  else if (livello !== null) out.livello = livello;
  if (typeof o['razza'] === 'string') {
    if (!s.razze?.length || s.razze.some((r) => r.id === o['razza'])) out.razza = o['razza'];
    else avvisi.push(`${dove}.razza: «${o['razza']}» non è una razza del set ${s.id}`);
  }
  const sc = ogg(o['salva_come']);
  if (o['salva_come'] !== undefined) {
    const lv = intero(sc?.['livello']);
    if (sc && typeof sc['classe'] === 'string' && classi.has(sc['classe']) && lv !== null && lv >= 0) out.salvaCome = { classe: sc['classe'], livello: lv };
    else avvisi.push(`${dove}.salva_come: {classe: una classe del set, livello: un intero}`);
  }
  return out;
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

/** Every trait of a sheet: its race's, its class's and its own (regole/tratti.ts). */
export function trattiDi(s: SistemaRegole, sch: SchedaGenerica): Tratto[] {
  const razza = sch.razza ? (s.razze ?? []).find((r) => r.id === sch.razza)?.tratti : undefined;
  const classe = sch.classe ? (s.classi ?? []).find((c) => c.id === sch.classe)?.tratti : undefined;
  return [...(razza ?? []), ...(classe ?? []), ...(sch.tratti ?? [])];
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
