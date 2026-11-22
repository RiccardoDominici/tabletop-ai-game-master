/**
 * Combination classes (docs/regole.md §2, «Classi combinate»; audit C-RACE-26, C-RACE-27; Basic Fantasy p. 6): a class
 * that names two base classes (`combinazione: [guerriero, mago]`) takes the requirements of both, the better attack bonus
 * and the better save of the two at each level, needs the XP of both tables summed to advance, casts the spells of the
 * caster and uses the thief's percentages of the thief. What the manual gives it of its own (the hit die, the armor it
 * may cast in) the class writes itself: `dadi_vita` (required: the manual says d6 or d4, not one of the two) and its own
 * `catalogo.restrizioni` (none are inherited).
 *
 *   classi:
 *     - id: guerriero_mago
 *       nome: "Guerriero/Mago"
 *       combinazione: [guerriero, mago]
 *       dadi_vita: [{da: 1, dado: "1d6"}, {da: 10, fissi: 1}]
 *
 * The expansion works on the raw data, before the set is read, so every reader keyed by a class id finds the
 * combination where it finds its bases: the class's rows (saves, attack bonus, XP, spells per day, ability values, power
 * tables), the powers a base casts (`poteri[].livello`), a base's starting book (`creazione.incantesimi`), an attack
 * ability only a base has (`progressione.attacco[].classi`: the thief's sneak attack). A row the class writes itself
 * stays as written. strumenti/valida/combinazioni.py does the same for the validator.
 */

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
type Riga = { da: number } & D;

/** The rows `{da, …}` of a table, read loosely (the class reader checks them). */
const righe = (v: unknown): Riga[] => (Array.isArray(v) ? v.filter((x): x is Riga => !!ogg(x) && intero((x as D)['da'])) : []);

/** The row in force at `livello`: the highest `da` ≤ level (below the first, the first). */
function riga(r: readonly Riga[], livello: number): Riga | undefined {
  let out = r[0];
  for (const x of r) if (livello >= x.da) out = x;
  return out;
}

/**
 * Two level tables merged cell by cell at every level where either changes, from the higher of their first levels
 * (a level both classes have). `chiave` holds the cells (`valori`, `slot`) or a single number (`bonus`).
 */
function unisci(a: readonly Riga[], b: readonly Riga[], chiave: string, scegli: (x: number, y: number) => number): Riga[] {
  if (!a.length) return b.map((r) => ({ ...r }));
  if (!b.length) return a.map((r) => ({ ...r }));
  const primo = Math.max(a[0]!.da, b[0]!.da);
  const livelli = [...new Set([...a, ...b].map((r) => r.da).filter((d) => d >= primo))].sort((x, y) => x - y);
  return livelli.map((da) => {
    const x = riga(a, da)![chiave];
    const y = riga(b, da)![chiave];
    if (typeof x === 'number' && typeof y === 'number') return { da, [chiave]: scegli(x, y) };
    const lx = Array.isArray(x) ? (x as number[]) : [];
    const ly = Array.isArray(y) ? (y as number[]) : [];
    const n = Math.max(lx.length, ly.length);
    return { da, [chiave]: Array.from({ length: n }, (_, i) => (lx[i] === undefined ? ly[i]! : ly[i] === undefined ? lx[i]! : scegli(lx[i]!, ly[i]!))) };
  });
}

/** The requirements of both bases: the higher minimum and the lower maximum of each characteristic. */
function requisiti(a: unknown, b: unknown): D {
  const out: D = {};
  for (const r of [ogg(a) ?? {}, ogg(b) ?? {}]) {
    for (const [k, v] of Object.entries(r)) {
      const nuovo = intero(v) ? { min: v } : (ogg(v) ?? {});
      const prima = (ogg(out[k]) ?? {}) as { min?: number; max?: number };
      const min = [prima.min, nuovo['min']].filter(intero);
      const max = [prima.max, nuovo['max']].filter(intero);
      out[k] = { ...(min.length ? { min: Math.max(...min) } : {}), ...(max.length ? { max: Math.min(...max) } : {}) };
    }
  }
  return out;
}

/**
 * The set's raw data with its combination classes expanded (a copy; the input is not touched). Errors: a base that is
 * not a single class of the set, a combination without its own hit dice.
 */
export function espandiCombinazioni(d: D, errori: string[]): D {
  const classi = Array.isArray(d['classi']) ? (d['classi'] as unknown[]) : [];
  const combinate = classi.filter((c) => Array.isArray(ogg(c)?.['combinazione']));
  if (!combinate.length) return d;
  const per = new Map(classi.flatMap((c) => (ogg(c) && typeof ogg(c)!['id'] === 'string' ? [[ogg(c)!['id'] as string, ogg(c)!] as const] : [])));
  const basiDi = new Map<string, string[]>();
  const nuove = classi.map((c) => {
    const o = ogg(c);
    const comb = o?.['combinazione'];
    if (!o || !Array.isArray(comb)) return c;
    const id = String(o['id']);
    const basi = comb.filter((x): x is string => typeof x === 'string');
    const [a, b] = basi.map((x) => per.get(x));
    if (basi.length !== 2 || !a || !b || Array.isArray(a['combinazione']) || Array.isArray(b['combinazione'])) {
      errori.push(`classi.${id}.combinazione: two single classes of the set (${basi.join(', ') || '—'})`);
      return c;
    }
    if (o['dadi_vita'] === undefined) errori.push(`classi.${id}.dadi_vita: a combination class writes its own hit dice (the manual gives it a die of its own)`);
    basiDi.set(id, basi);
    const x: D = { ...o };
    if (x['tiri_salvezza'] === undefined) x['tiri_salvezza'] = unisci(righe(a['tiri_salvezza']), righe(b['tiri_salvezza']), 'valori', Math.min);
    if (x['attacco'] === undefined) x['attacco'] = unisci(righe(a['attacco']), righe(b['attacco']), 'bonus', Math.max);
    if (x['incantesimi_al_giorno'] === undefined && (a['incantesimi_al_giorno'] || b['incantesimi_al_giorno'])) x['incantesimi_al_giorno'] = unisci(righe(a['incantesimi_al_giorno']), righe(b['incantesimi_al_giorno']), 'slot', Math.max);
    if (x['px'] === undefined && Array.isArray(a['px']) && Array.isArray(b['px'])) {
      const pa = a['px'] as number[];
      const pb = b['px'] as number[];
      x['px'] = Array.from({ length: Math.min(pa.length, pb.length) }, (_, i) => pa[i]! + pb[i]!);
    }
    if (x['abilita'] === undefined && (a['abilita'] || b['abilita'])) x['abilita'] = a['abilita'] ?? b['abilita'];
    if (x['tabelle'] === undefined && (a['tabelle'] || b['tabelle'])) x['tabelle'] = { ...(ogg(b['tabelle']) ?? {}), ...(ogg(a['tabelle']) ?? {}) };
    x['requisiti'] = { ...requisiti(a['requisiti'], b['requisiti']), ...(ogg(o['requisiti']) ?? {}) };
    const tratti = [...(Array.isArray(a['tratti']) ? a['tratti'] : []), ...(Array.isArray(b['tratti']) ? b['tratti'] : []), ...(Array.isArray(o['tratti']) ? o['tratti'] : [])];
    if (tratti.length) x['tratti'] = tratti;
    return x;
  });
  const out: D = { ...d, classi: nuove };
  // The powers a base casts, at the base's level (the lower when both cast it).
  if (Array.isArray(d['poteri'])) {
    out['poteri'] = (d['poteri'] as unknown[]).map((p) => {
      const o = ogg(p);
      const liv = ogg(o?.['livello']);
      if (!o || !liv) return p;
      const l: D = { ...liv };
      for (const [k, basi] of basiDi) {
        const n = basi.map((x) => liv[x]).filter(intero);
        if (l[k] === undefined && n.length) l[k] = Math.min(...n);
      }
      return { ...o, livello: l };
    });
  }
  // A base's starting book (the magic-user's read magic and one more).
  const cr = ogg(d['creazione']);
  if (cr && Array.isArray(cr['incantesimi'])) {
    const voci = cr['incantesimi'] as unknown[];
    const extra = [...basiDi].flatMap(([k, basi]) => {
      if (voci.some((v) => ogg(v)?.['classe'] === k)) return [];
      const e = voci.find((v) => basi.includes(String(ogg(v)?.['classe'])));
      return e ? [{ ...ogg(e)!, classe: k }] : [];
    });
    if (extra.length) out['creazione'] = { ...cr, incantesimi: [...voci, ...extra] };
  }
  // An attack ability only some classes have (the thief's sneak attack): the combinations of those classes too.
  const pr = ogg(d['progressione']);
  if (pr && Array.isArray(pr['attacco'])) {
    out['progressione'] = {
      ...pr,
      attacco: (pr['attacco'] as unknown[]).map((v) => {
        const o = ogg(v);
        const cl = o?.['classi'];
        if (!o || !Array.isArray(cl)) return v;
        const piu = [...basiDi].filter(([k, basi]) => !cl.includes(k) && basi.some((b) => cl.includes(b))).map(([k]) => k);
        return piu.length ? { ...o, classi: [...cl, ...piu] } : v;
      }),
    };
  }
  return out;
}
