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
import { attaccoDaDadiVita, dadiVitaEffettivi, formulaPuntiFerita, leggiDadiVita, schedaConMostro } from './bestiario';
import { leggiDurata } from './effetti';

const ogg = (v: unknown): DatiYaml | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as DatiYaml) : null);
const intero = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);

export function leggiSchedaGenerica(s: SistemaRegole, id: string, nome: string, di_png: boolean, grezza: unknown): SchedaGenerica | null {
  const scritta = ogg(grezza);
  if (!scritta) return null;
  const avvisi: string[] = [];
  const dove = `${id}.scheda`;
  // A sheet that points to a stat block of the set's bestiary (`mostro:`, regole/bestiario.ts): the entry's keys first,
  // the sheet's own laid over them (an NPC's own hit points, a different weapon).
  const idMostro = typeof scritta['mostro'] === 'string' ? scritta['mostro'] : null;
  const mostro = idMostro ? (s.mostri ?? []).find((m) => m.id === idMostro) : undefined;
  if (idMostro && !mostro) avvisi.push(`${dove}.mostro: «${idMostro}» non è un mostro del bestiario del set ${s.id}`);
  const o = mostro ? schedaConMostro(mostro, scritta) : scritta;
  const caratteristiche: Record<string, number> = {};
  const car = ogg(o['caratteristiche']) ?? {};
  for (const c of s.caratteristiche) {
    const v = intero(car[c.id]);
    // A monster has no ability scores in most manuals (Basic Fantasy p. 62): the +0 value, without a warning.
    if (v === null && !mostro) avvisi.push(`${dove}.caratteristiche: manca ${c.id} (vale ${caratteristicaPredefinita(s)})`);
    caratteristiche[c.id] = v ?? caratteristicaPredefinita(s);
  }
  for (const k of Object.keys(car)) if (!s.caratteristiche.some((c) => c.id === k)) avvisi.push(`${dove}.caratteristiche: «${k}» non è del set ${s.id}`);
  const abilita: Record<string, number> = {};
  for (const [k, v] of Object.entries(ogg(o['abilita']) ?? {})) {
    if (!s.abilita.some((a) => a.id === k)) avvisi.push(`${dove}.abilita: «${k}» non è del set ${s.id}`);
    else if (intero(v) === null) avvisi.push(`${dove}.abilita.${k}: un numero intero`);
    else abilita[k] = v as number;
  }
  // Hit points: a number the sheet writes; a formula («1d2») rolled once by the Engine; none, with hit dice, the hit dice
  // rolled by the bestiary's die (prove/bestiario.ts). The maximum until then is the formula's average.
  const dv = leggiDadiVita(o['dadi_vita']);
  if (o['dadi_vita'] !== undefined && !dv) avvisi.push(`${dove}.dadi_vita: «${String(o['dadi_vita'])}» non è un numero di dadi vita come 3, "3+2", "1-1", "½", "2*"`);
  const pfFormula = typeof o['pf'] === 'string' ? leggiFormula(o['pf']) : null;
  const pfDaTirare = pfFormula && pfFormula.numero > 0 ? pfFormula : intero(o['pf']) === null && intero(o['pf_massimi']) === null && dv ? formulaPuntiFerita(dv, s.bestiario ?? null) : null;
  const media = (f: { numero: number; facce: number; bonus: number }): number => Math.max(1, Math.floor((f.numero * (f.facce + 1)) / 2) + f.bonus);
  const pf = intero(o['pf']) ?? intero(o['pf_massimi']) ?? (pfFormula && !pfFormula.numero ? pfFormula.bonus : null) ?? (pfDaTirare ? media(pfDaTirare) : null);
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
    // A line with riders and no damage (a wight's touch: «Damage: energy drain») hits for its effects only.
    const soloEffetti = !danno && !armaCat && typeof a['potere'] !== 'string' && a['danno'] === undefined && (Array.isArray(a['colpendo']) || typeof a['colpendo'] === 'string');
    if (!danno && !armaCat && typeof a['potere'] !== 'string' && !soloEffetti) avvisi.push(`${dove}.attacchi[${i + 1}]: danno «${String(a['danno'])}» non è una formula come 1d6 (uso 1d4)`);
    const c = typeof a['caratteristica'] === 'string' && s.caratteristiche.some((x) => x.id === a['caratteristica']) ? (a['caratteristica'] as string) : null;
    const ab = typeof a['abilita'] === 'string' && s.abilita.some((x) => x.id === a['abilita']) ? (a['abilita'] as string) : null;
    if (a['automatico'] !== undefined && typeof a['automatico'] !== 'boolean') avvisi.push(`${dove}.attacchi[${i + 1}].automatico: true o false`);
    // `consuma`: a resource of the set each attack spends (ammunition); refused when it is at 0 (prove/risorse.ts).
    const consuma = typeof a['consuma'] === 'string' && (s.risorse ?? []).some((r) => r.id === a['consuma']) ? { consuma: a['consuma'] as string } : {};
    if (typeof a['consuma'] === 'string' && !('consuma' in consuma)) avvisi.push(`${dove}.attacchi[${i + 1}].consuma: «${a['consuma']}» non è una risorsa del set`);
    // A monster's line (regole/bestiario.ts): its own id (per_round names it), the powers a hit applies (`colpendo`: a
    // ghoul's paralysis), a special action instead of an attack roll (`potere`: a breath), its uses per day and rate.
    const extra = lineaDiMostro(s, a, `${dove}.attacchi[${i + 1}]`, avvisi);
    // What the weapon is made of (argento, magica): a creature hurt only by some weapons reads it (P6-03).
    const proprieta = Array.isArray(a['proprieta']) ? { proprieta: a['proprieta'].filter((x): x is string => typeof x === 'string') } : {};
    return [{ id: typeof a['id'] === 'string' && a['id'] ? chiave(a['id']) : chiave(n), nome: n, danno: danno ?? { numero: 1, facce: 4, bonus: 0 }, caratteristica: c, abilita: ab ?? (c || extra.potere || !di_png ? null : bestiaAbilita(s, a)), tipo_danno: typeof a['tipo_danno'] === 'string' ? a['tipo_danno'] : null, distanza: a['distanza'] === true, ...(a['automatico'] === true ? { automatico: true } : {}), ...consuma, ...(armaCat ? { arma: armaCat } : {}), ...extra, ...proprieta, ...(soloEffetti ? { soloEffetti: true } : {}) }];
  });
  const difesa = intero(o['difesa']) ?? intero(o['ca']);
  const sch: SchedaGenerica = { id, nome, di_png, caratteristiche, abilita, pf_massimi: pf && pf > 0 ? pf : 1, difesa, armatura: intero(o['armatura']) ?? 0, attacchi, ...classeDellaScheda(s, o, dove, avvisi), ...risorseDellaScheda(s, o, dove, avvisi), ...equipaggiamentoDellaScheda(s, o, dove, avvisi), ...esperienzaDellaScheda(o, dove, avvisi), ...mostroDellaScheda(s, o, attacchi, dove, avvisi), avvisi };
  if (idMostro && mostro) sch.mostro = idMostro;
  if (pfDaTirare && (pfFormula || intero(o['pf']) === null)) sch.pfDaTirare = pfDaTirare;
  // Creation (M7): the spellbook a prepared spell comes from, and the languages the character knows.
  const libro = idDi(o['libro'], (x) => (s.poteri ?? []).some((p) => p.id === x && p.tipo === 'incantesimo'), `${dove}.libro`, 'un incantesimo del set', avvisi);
  if (libro) sch.libro = libro;
  const lingue = idDi(o['lingue'], (x) => (s.lingue ?? []).some((l) => l.id === x), `${dove}.lingue`, 'una lingua del set (lingue)', avvisi);
  if (lingue) sch.lingue = lingue;
  // Hit dice as the manual prints them («3+2*»): the number a table reads, and the asterisks unless the sheet counts them.
  if (dv) {
    sch.dadiVita = dadiVitaEffettivi(dv, s.bestiario ?? null);
    if (o['speciali'] === undefined && dv.asterischi) sch.speciali = dv.asterischi;
  }
  // The class tables give the abilities that grow with the level (M1); a value the sheet writes stays, as an override.
  sch.abilitaScritte = { ...abilita };
  for (const x of derivaAbilita(s, sch)) avvisi.push(`${dove}.abilita.${x.id}: ${x.scritto} scritto a mano, ${sch.classe ? `la tabella della classe dà ${x.tabella} al livello ${sch.livello ?? 1}` : `la tabella dei mostri dà ${x.tabella} per ${sch.dadiVita ?? 0} dadi vita`}: vale quello della scheda`);
  // Gear from the catalog: the AC and the attack lines come from it (the sheet's own lines stay after the weapons').
  if (sch.equipaggiamento) {
    sch.attacchiPropri = attacchi;
    sch.difesaScritta = difesa;
    const da = applicaDotazione(s, sch, dotazioneIniziale(sch));
    if (difesa !== null && sch.difesa !== difesa) avvisi.push(`${dove}: difesa ${difesa} diversa da quella dell'equipaggiamento (${sch.difesa}, ${da}): vale quella dell'equipaggiamento`);
  }
  return sch;
}

/** A sheet's list of set ids (`libro`, `lingue`): the known ones kept, the others a warning; null when absent. */
function idDi(v: unknown, esiste: (id: string) => boolean, dove: string, cosa: string, avvisi: string[]): string[] | null {
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v)) {
    avvisi.push(`${dove}: una lista di id`);
    return null;
  }
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === 'string' && esiste(x)) out.push(x);
    else avvisi.push(`${dove}: «${String(x)}» non è ${cosa}`);
  }
  return out;
}

/**
 * The abilities a sheet's class and level give (regole/progressione.ts), merged under the ones it writes by hand
 * (`abilitaScritte`, which win: an override). Called when a sheet is read and again when its level changes (a level-up
 * between sessions, prove/livelli.ts). Returns the overrides that disagree with the table, for the log and the validator.
 */
export function derivaAbilita(s: SistemaRegole, sch: SchedaGenerica): Array<{ id: string; scritto: number; tabella: number }> {
  const classe = sch.classe ? (s.classi ?? []).find((c) => c.id === sch.classe) : undefined;
  const tabella = { ...attaccoDiMostro(s, sch), ...valoriDaClasse(s.progressione, classe?.progressione ?? null, sch.livello ?? 1, trattiDi(s, sch), sch.classe ?? null) };
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
  // Hit dice: a whole number here; the manual's form («3+2*», «½») is read by leggiSchedaGenerica (regole/bestiario.ts).
  const dv = intero(o['dadi_vita']);
  if (dv !== null && dv >= 0) out.dadiVita = dv;
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

/**
 * A monster sheet's attack bonus by its hit dice (regole/bestiario.ts, Basic Fantasy p. 53): for the bestiary's attack
 * abilities, the stat block's own bracket (`attacco`) or the set's table. Only a sheet with hit dice and no class (a
 * class's attack rows are the class tables'). Empty without the set's `bestiario.attacco`.
 */
export function attaccoDiMostro(s: SistemaRegole, sch: SchedaGenerica): Record<string, number> {
  const b = s.bestiario;
  if (!b?.attacco.length || sch.classe || ((sch.dadiVita === null || sch.dadiVita === undefined) && sch.attacco === undefined)) return {};
  const bonus = sch.attacco ?? attaccoDaDadiVita(b, sch.dadiVita ?? 0);
  return Object.fromEntries(b.abilita.map((a) => [a, bonus]));
}

/**
 * The ability a monster's natural attack line rolls with when it names none: the bestiary's first attack ability (melee),
 * its second for a missile line (`distanza: true`). Null without a bestiary (as before: the line rolls with nothing).
 */
function bestiaAbilita(s: SistemaRegole, a: DatiYaml): string | null {
  const ab = s.bestiario?.abilita ?? [];
  return (a['distanza'] === true ? (ab[1] ?? ab[0]) : ab[0]) ?? null;
}

/** A monster line's extras (regole/bestiario.ts): powers on a hit, a special action, uses per day, rate. */
function lineaDiMostro(s: SistemaRegole, a: DatiYaml, dove: string, avvisi: string[]): Pick<SchedaGenerica['attacchi'][number], 'colpendo' | 'potere' | 'usi' | 'ricarica'> {
  const out: Pick<SchedaGenerica['attacchi'][number], 'colpendo' | 'potere' | 'usi' | 'ricarica'> = {};
  const poteri = new Set((s.poteri ?? []).map((p) => p.id));
  const lista = Array.isArray(a['colpendo']) ? a['colpendo'] : typeof a['colpendo'] === 'string' ? [a['colpendo']] : null;
  if (lista) {
    const ok = lista.filter((x): x is string => typeof x === 'string' && poteri.has(x));
    for (const x of lista) if (!ok.includes(x as string)) avvisi.push(`${dove}.colpendo: «${String(x)}» non è un potere del set`);
    if (ok.length) out.colpendo = ok;
  }
  if (typeof a['potere'] === 'string') {
    if (poteri.has(a['potere'])) out.potere = a['potere'];
    else avvisi.push(`${dove}.potere: «${a['potere']}» non è un potere del set`);
  }
  if (a['usi'] !== undefined) {
    if (intero(a['usi']) !== null && (a['usi'] as number) > 0) out.usi = a['usi'] as number;
    else avvisi.push(`${dove}.usi: quante volte al giorno, un intero da 1 in su`);
  }
  if (a['ricarica'] !== undefined) {
    if (intero(a['ricarica']) !== null && (a['ricarica'] as number) > 1) out.ricarica = a['ricarica'] as number;
    else avvisi.push(`${dove}.ricarica: una volta ogni quanti round, un intero da 2 in su`);
  }
  return out;
}

/**
 * What a monster's stat block adds to a sheet (regole/bestiario.ts): its attacks per round (`per_round`, alternatives
 * of line ids), its morale (a number, or `{prima, dopo}`: before and after it is engaged), the attack bonus it prints,
 * the weapons that can hurt it (`colpito_solo_da`).
 */
function mostroDellaScheda(s: SistemaRegole, o: DatiYaml, attacchi: SchedaGenerica['attacchi'], dove: string, avvisi: string[]): Pick<SchedaGenerica, 'perRound' | 'morale' | 'attacco' | 'colpitoSoloDa' | 'resistenze' | 'siArrende' | 'sorprende' | 'rigenera'> {
  const out: Pick<SchedaGenerica, 'perRound' | 'morale' | 'attacco' | 'colpitoSoloDa' | 'resistenze' | 'siArrende' | 'sorprende' | 'rigenera'> = {};
  if (o['resistenze'] !== undefined) {
    const r = ogg(o['resistenze']);
    const ok = r && Object.values(r).every((v) => v === 'meta' || v === 'immune');
    if (!ok) avvisi.push(`${dove}.resistenze: {tipo di danno: meta | immune}`);
    else out.resistenze = r as Record<string, 'meta' | 'immune'>;
  }
  if (o['per_round'] !== undefined) {
    const righe = Array.isArray(o['per_round']) ? o['per_round'] : null;
    const ids = new Set(attacchi.map((a) => a.id));
    const giro = righe?.map((r) => (Array.isArray(r) ? r.map((x) => (typeof x === 'string' ? chiave(x) : '')) : []));
    if (!giro || !giro.length || giro.some((r) => !r.length || r.some((x) => !ids.has(x)))) avvisi.push(`${dove}.per_round: liste di id delle sue linee d'attacco (${[...ids].join(', ') || 'nessuna'})`);
    else out.perRound = giro;
  }
  const m = o['morale'];
  if (intero(m) !== null && (m as number) >= 2 && (m as number) <= 12) out.morale = m as number;
  else if (ogg(m) && intero(ogg(m)!['prima']) !== null && intero(ogg(m)!['dopo']) !== null) out.morale = { prima: ogg(m)!['prima'] as number, dopo: ogg(m)!['dopo'] as number };
  else if (m !== undefined) avvisi.push(`${dove}.morale: un numero da 2 a 12, o {prima, dopo}`);
  if (o['rigenera'] !== undefined) {
    const r = ogg(o['rigenera']);
    const pf = r ? intero(r['pf']) : null;
    const errori: string[] = [];
    const aZero = r && r['a_zero'] !== undefined ? leggiDurata(r['a_zero'], `${dove}.rigenera.a_zero`, errori) : null;
    if (!r || pf === null || pf < 1 || errori.length) avvisi.push(`${dove}.rigenera: {pf: da 1, tranne: [fuoco, acido], a_zero: {round: "2d6"}}`, ...errori);
    else out.rigenera = { pf, tranne: Array.isArray(r['tranne']) ? r['tranne'].filter((x): x is string => typeof x === 'string') : [], aZero };
  }
  if (o['sorprende'] !== undefined) {
    if (intero(o['sorprende']) !== null && (o['sorprende'] as number) >= 1) out.sorprende = o['sorprende'] as number;
    else avvisi.push(`${dove}.sorprende: la faccia fino a cui sorprende i nemici, da 1`);
  }
  if (o['si_arrende'] !== undefined) {
    if (typeof o['si_arrende'] === 'boolean') out.siArrende = o['si_arrende'];
    else avvisi.push(`${dove}.si_arrende: true o false`);
  }
  if (o['attacco'] !== undefined) {
    if (intero(o['attacco']) !== null) out.attacco = o['attacco'] as number;
    else avvisi.push(`${dove}.attacco: il bonus d'attacco del mostro, un intero`);
  }
  if (o['colpito_solo_da'] !== undefined) {
    const v = Array.isArray(o['colpito_solo_da']) ? o['colpito_solo_da'].filter((x): x is string => typeof x === 'string') : [];
    if (!v.length) avvisi.push(`${dove}.colpito_solo_da: le armi che lo feriscono, [argento, magica] o [magica]`);
    else out.colpitoSoloDa = v;
  }
  void s;
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
