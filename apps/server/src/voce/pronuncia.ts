/**
 * Pronuncia dei nomi (docs/f0-contratti.md): prima della sintesi i nomi di PNG e PG vengono
 * sostituiti con la grafia del campo `pronuncia` (es. «Baldrin» → «Bàldrin»), SOLO nel testo
 * mandato alla voce; trascrizione e sottotitoli restano con la grafia normale.
 *
 * `nome` e `pronuncia` si allineano parola per parola: «Baldrin Pietrafitta» / «Bàldrin
 * Pietrafìtta» → Baldrin→Bàldrin, Pietrafitta→Pietrafìtta. Si sostituiscono solo parole intere
 * (con l'iniziale maiuscola, come i nomi propri nel testo), e solo se la parola cambia davvero.
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';

export type Pronunciatore = (testo: string) => string;

function stringa(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Coppie parola → pronuncia ricavate da nome/pronuncia di PNG e PG. */
export function coppieDiPronuncia(campagna: Campagna): Map<string, string> {
  const coppie = new Map<string, string>();
  const schede: DatiYaml[] = [...campagna.png.map((p) => p.dati), ...campagna.pg.map((p) => p.pubblico)];
  for (const d of schede) {
    const nome = stringa(d['nome']);
    const pronuncia = stringa(d['pronuncia']);
    if (!nome || !pronuncia) continue;
    const parole = nome.split(/\s+/);
    const voce = pronuncia.split(/\s+/);
    if (parole.length !== voce.length) continue; // allineamento incerto: meglio non toccare
    parole.forEach((p, i) => {
      const v = voce[i]!;
      if (p !== v && p.normalize('NFD').replace(/\p{M}/gu, '') === v.normalize('NFD').replace(/\p{M}/gu, '')) coppie.set(p, v);
    });
  }
  return coppie;
}

export function creaPronunciatore(campagna: Campagna): Pronunciatore {
  const coppie = coppieDiPronuncia(campagna);
  if (coppie.size === 0) return (t) => t;
  // Parole più lunghe prima, confini di parola Unicode (lettere accentate comprese).
  const chiavi = [...coppie.keys()].sort((a, b) => b.length - a.length).map(escapeRegex);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${chiavi.join('|')})(?![\\p{L}\\p{N}])`, 'gu');
  return (testo) => testo.replace(re, (m) => coppie.get(m) ?? m);
}
