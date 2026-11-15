/**
 * Minions (docs/prove.md §2, «Minions»; C5 of docs/e2e-finale.md): the nameless foes of a scene — the goblin sentry,
 * two wolves, a band of thugs — get a stat line by creature type that the Preparer writes once, instead of a full NPC
 * card each. Before this, an attack on a creature without a sheet resolved «sì, ma» and the narrator invented goblins
 * and killed them with no card.
 *
 *   campagna.yaml →
 *     gregari:
 *       - tipo: goblin
 *         nome: "goblin"                     # the cards and the narrator call one this («goblin 2» when several)
 *         parole: [goblin, sentinella]      # words that name one in a PC's action
 *         scheda: {…}                       # an NPC sheet of the campaign's rule set (validated like one)
 *   scene/<id>.yaml →
 *     gregari: [{tipo: goblin, quanti: 2}]  # the minions of this scene
 *
 * At load every scene's minion becomes an ordinary sheeted combatant for the checks' Engine: an id
 * (`png_<tipo>_<scene>_<n>`, the scene id without its `scena_` prefix), a name, the type's sheet. Ids come from the
 * data, so a resume finds the same minions and their hit points in the snapshot. They are the Engine's only: they do
 * not speak, have no voice or picture, and are not NPC cards; the narrator learns of them from the scene sheet's
 * `gregari` and from the facts of the rolls.
 */
import type { Campagna, DatiYaml, PngCaricato } from './tipi';

/** A stat line by creature type (campagna.yaml → gregari). */
export interface TipoGregario {
  tipo: string;
  nome: string;
  parole: string[];
  scheda: DatiYaml;
}

/** One minion of one scene, as the Engine knows it. */
export interface Gregario {
  id: string;
  tipo: string;
  nome: string;
  scena: string;
  /** Words that name it in an action (the type's `parole`, its name). */
  parole: string[];
  /** Morale of the type's sheet (B/X sets), or null. */
  morale: number | null;
}

const testo = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const idSicuro = (v: string): string => v.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

/** The campaign's stat lines by type; an unreadable entry is logged through `avvisa` and skipped. */
export function tipiGregari(c: Campagna, avvisa: (m: string) => void = () => {}): TipoGregario[] {
  const grezzi = c.campagnaNarratore['gregari'];
  if (grezzi === undefined) return [];
  if (!Array.isArray(grezzi)) {
    avvisa('gregari: a list of stat lines by type ({tipo, nome, parole, scheda}): ignored');
    return [];
  }
  const out: TipoGregario[] = [];
  for (const g of grezzi) {
    if (!g || typeof g !== 'object' || Array.isArray(g)) continue;
    const d = g as DatiYaml;
    const tipo = idSicuro(testo(d['tipo']));
    const scheda = d['scheda'];
    if (!tipo || !scheda || typeof scheda !== 'object' || Array.isArray(scheda)) {
      avvisa(`gregari[${tipo || '?'}]: needs tipo and scheda: ignored`);
      continue;
    }
    const nome = testo(d['nome']) || tipo;
    const parole = Array.isArray(d['parole']) ? d['parole'].map(testo).filter(Boolean) : [];
    if (out.some((x) => x.tipo === tipo)) avvisa(`gregari[${tipo}]: repeated, the first counts`);
    else out.push({ tipo, nome, parole: [...new Set([...parole, nome])], scheda: scheda as DatiYaml });
  }
  return out;
}

/**
 * Every scene's minions, and the same as NPC entries for the sheet loaders (campagna/schede.ts, regole/schede.ts read
 * only `id`, `nome` and `dati.scheda`).
 */
export function gregariDellaCampagna(c: Campagna, avvisa: (m: string) => void = () => {}): { gregari: Gregario[]; comePng: PngCaricato[] } {
  const tipi = new Map(tipiGregari(c, avvisa).map((t) => [t.tipo, t]));
  const gregari: Gregario[] = [];
  const comePng: PngCaricato[] = [];
  for (const s of c.scene) {
    const voci = s.dati['gregari'];
    if (!Array.isArray(voci)) continue;
    const breve = s.id.replace(/^scena_/, '');
    for (const v of voci) {
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
      const tipo = idSicuro(testo((v as DatiYaml)['tipo']));
      const t = tipi.get(tipo);
      if (!t) {
        avvisa(`${s.id}: gregari of an unknown type «${tipo}» (campagna.yaml → gregari): no stats, ignored`);
        continue;
      }
      const q = (v as DatiYaml)['quanti'];
      const quanti = typeof q === 'number' && Number.isInteger(q) && q >= 1 ? Math.min(q, 20) : 1;
      for (let n = 1; n <= quanti; n++) {
        const id = `png_${tipo}_${breve}_${n}`;
        const nome = quanti > 1 ? `${t.nome} ${n}` : t.nome;
        const morale = typeof t.scheda['morale'] === 'number' ? (t.scheda['morale'] as number) : null;
        gregari.push({ id, tipo, nome, scena: s.id, parole: t.parole, morale });
        comePng.push({ id, nome, dati: { scheda: t.scheda } } as unknown as PngCaricato);
      }
    }
  }
  return { gregari, comePng };
}
