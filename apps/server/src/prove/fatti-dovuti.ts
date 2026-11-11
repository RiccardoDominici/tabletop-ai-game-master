/**
 * Fatti dello scontro che il tavolo deve sentire (docs/combattimento.md, «Fatti dovuti»): chi incassa
 * un colpo, chi cade a terra, l'esito di un tiro contro la morte. Il Motore li ha già decisi e li passa
 * al narratore come fatti («raccontalo»), ma nella e2e finale del 10 novembre (narratore Haiku, set
 * Basic Fantasy) il narratore ne saltava qualcuno: un PG a 0 punti ferita col suo tiro contro la morte,
 * i danni inflitti.
 *
 * Principio di responsabilità minima: il Motore non chiede un'altra chiamata, controlla. Dopo la
 * narrazione, per ogni fatto dovuto cerca una riga detta al tavolo che nomina la creatura (nome, nome
 * breve, soprannome) e contiene una parola del tipo di fatto (lingue/<codice>/motore.yaml, sezione
 * `fatti_dovuti`: radici, una parola vale se comincia così). Se non c'è, il Motore fa dire una riga
 * breve del pacchetto della lingua (testi-prove.yaml, «prove.dovuti.<tipo>»): «Corrado cade a terra.».
 * Logica pura: la regia passa le carte del turno e le righe dette, e riceve le righe da aggiungere.
 */
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { normalizza } from '../azioni/regole';
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import { campoElenco, regole } from '../lingua/motore';

/** L'esito di un tiro contro la morte (prove/combattimento.ts). */
export type EsitoMorte = 'morto' | 'stabile' | 'rialzato' | 'morente';
export type TipoFattoDovuto = 'colpito' | 'a_terra' | 'fuggito' | EsitoMorte;
export const TIPI_FATTO_DOVUTO: readonly TipoFattoDovuto[] = ['morto', 'fuggito', 'rialzato', 'stabile', 'morente', 'a_terra', 'colpito'];

export interface FattoDovuto {
  tipo: TipoFattoDovuto;
  /** La creatura del fatto (chi incassa, chi cade, chi tira contro la morte). */
  id: string;
  nome: string;
  /**
   * Per un colpo a chi nello stesso turno ha anche colpito: chi l'ha colpito. Allora la riga deve
   * nominare anche uno di loro («Ida colpisce il goblin» non dice che Ida è stata colpita).
   */
  da?: Array<{ id: string; nome: string }>;
}

/**
 * I fatti dovuti del turno, uno per creatura (il più grave: morto, fuggito, rialzato, stabile, morente,
 * a terra, colpito), nell'ordine in cui compaiono. Contano solo le carte pubbliche: l'esito di un'azione
 * privata non si dice al tavolo. `morte`: gli esiti dei tiri contro la morte del turno; `fuggiti`: chi
 * il morale ha fatto fuggire.
 */
export function fattiDovuti(
  tiri: readonly TiroMostrato[],
  morte: ReadonlyArray<{ id: string; nome: string; esito: EsitoMorte }> = [],
  fuggiti: ReadonlyArray<{ id: string; nome: string }> = [],
): FattoDovuto[] {
  const per = new Map<string, FattoDovuto>();
  const grado = (t: TipoFattoDovuto): number => TIPI_FATTO_DOVUTO.indexOf(t);
  const metti = (f: FattoDovuto): void => {
    const g = per.get(f.id);
    if (!g) per.set(f.id, f);
    else if (f.tipo === 'colpito' && g.tipo === 'colpito') g.da = [...(g.da ?? []), ...(f.da ?? [])];
    // Un fatto più grave prende il posto (la Map tiene la posizione della prima volta).
    else if (grado(f.tipo) < grado(g.tipo)) per.set(f.id, f);
  };
  const colpiti = tiri.filter((t) => !t.privata && t.tipo === 'attacco' && t.riuscita && t.bersaglio && (t.a_terra || (t.danno?.totale ?? 0) > 0));
  const attaccanti = new Set(colpiti.map((t) => t.chi));
  for (const t of colpiti) {
    const b = t.bersaglio!;
    if (t.a_terra) metti({ tipo: 'a_terra', id: b.id, nome: b.nome });
    else metti({ tipo: 'colpito', id: b.id, nome: b.nome, da: [{ id: t.chi, nome: t.nome }] });
  }
  for (const m of morte) metti({ tipo: m.esito, id: m.id, nome: m.nome });
  for (const f of fuggiti) metti({ tipo: 'fuggito', id: f.id, nome: f.nome });
  // `da` serve solo quando la creatura colpita ha anche colpito qualcuno in questo turno.
  return [...per.values()].map((f) => (f.tipo === 'colpito' && attaccanti.has(f.id) ? f : { tipo: f.tipo, id: f.id, nome: f.nome }));
}

/** Radici delle parole di ogni tipo di fatto, nella lingua dei contenuti (già minuscole e senza accenti). */
const parole = (): Readonly<Record<TipoFattoDovuto, readonly string[]>> => paroleDovute();

/**
 * The stems of each fact type, compiled once per language. Exported so other guards share this one compilation:
 * `regole()` caches one compiled value per section name, so a second compile of `fatti_dovuti` would clash.
 */
export const paroleDovute = (): Readonly<Record<TipoFattoDovuto, readonly string[]>> =>
  regole('fatti_dovuti', (s) => Object.fromEntries(TIPI_FATTO_DOVUTO.map((t) => [t, campoElenco(s, t).map(normalizza)])) as Record<TipoFattoDovuto, string[]>);

/** Parole di una riga: minuscole, senza accenti né punteggiatura. */
function paroleDi(riga: string): string[] {
  return normalizza(riga)
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .split(/[\s']+/)
    .filter(Boolean);
}

/** La riga nomina uno di questi nomi (come parole intere, anche di più parole)? */
function nomina(riga: string, nomi: readonly string[]): boolean {
  const t = ` ${paroleDi(riga).join(' ')} `;
  return nomi.some((n) => {
    const k = paroleDi(n).join(' ');
    return k.length >= 2 && t.includes(` ${k} `);
  });
}

/** Come la narrazione può chiamare una creatura: il nome del fatto, il nome breve e quelli dati. */
function nomiDi(id: string, nome: string, altri: (id: string) => readonly string[]): string[] {
  return [nome, nomeBreve(nome), ...altri(id)];
}

/** Il testo (una riga o una frase) racconta il fatto: nomina la creatura e ha una parola del tipo. */
export function diceFatto(f: FattoDovuto, t: string, altri: (id: string) => readonly string[] = () => []): boolean {
  const radici = parole()[f.tipo];
  const nomiDa = f.da?.flatMap((d) => nomiDi(d.id, d.nome, altri)) ?? null;
  return nomina(t, nomiDi(f.id, f.nome, altri)) && (!nomiDa || nomina(t, nomiDa)) && paroleDi(t).some((p) => radici.some((k) => p.startsWith(k)));
}

/** La riga breve del Motore per un fatto: «Corrado cade a terra.» (il nome breve). */
export function rigaDovuta(f: FattoDovuto): string {
  return testo(`prove.dovuti.${f.tipo}`, { nome: nomeBreve(f.nome) });
}

/**
 * I fatti dovuti che le righe dette non raccontano, con la riga da aggiungere per ciascuno. Basta una
 * riga che dica il fatto. Un colpo fra due che si sono colpiti a vicenda (`da`) chiede invece una FRASE
 * sua: «Corrado colpisce Ruggero» nomina tutti e due e dice un colpo, ma racconta uno solo dei due
 * colpi; la frase che ne racconta uno non vale per l'altro (in ordine di fatto).
 */
export function fattiMancanti(dovuti: readonly FattoDovuto[], righe: readonly string[], altri: (id: string) => readonly string[] = () => []): Array<FattoDovuto & { riga: string }> {
  const frasi = righe.flatMap((r) => r.split(/(?<=[.!?;:])\s+/)).filter((x) => x.trim());
  const usate = new Set<number>();
  const mancanti: Array<FattoDovuto & { riga: string }> = [];
  for (const f of dovuti) {
    if (!f.da) {
      if (!righe.some((r) => diceFatto(f, r, altri))) mancanti.push({ ...f, riga: rigaDovuta(f) });
      continue;
    }
    const k = frasi.findIndex((x, j) => !usate.has(j) && diceFatto(f, x, altri));
    if (k < 0) mancanti.push({ ...f, riga: rigaDovuta(f) });
    else usate.add(k);
  }
  return mancanti;
}
