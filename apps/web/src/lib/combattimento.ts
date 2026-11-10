/**
 * Funzioni pure per la barra dell'iniziativa (proiettore) e il riquadro del turno (telefono).
 * Nessuna dipendenza da React: si testano in `combattimento.test.ts`.
 * Il server manda già i combattenti in ordine d'iniziativa; qui si decide solo cosa mostrare in fondo
 * (chi è morto o fuggito) e come si colorano e si scrivono i dati.
 */
import type { CombattentePubblico, CombattimentoPubblico } from '@cantastorie/shared';

/** Tono della barra dei PF: verde sopra il 50%, giallo fino al 50%, rosso a 0. */
export type TonoPf = 'verde' | 'giallo' | 'rosso';

/** Classi Tailwind del riempimento della barra: i colori sono i token di styles/index.css. */
export const CLASSE_TONO_PF: Record<TonoPf, string> = {
  verde: 'bg-muschio',
  giallo: 'bg-candela',
  rosso: 'bg-sangue',
};

/** Sopra questo numero di combattenti la barra usa le iniziali al posto dei nomi, per stare in 1920 px. */
export const SOGLIA_INIZIALI = 5;

/** I combattenti ancora in partita restano nell'ordine d'iniziativa; morti e fuggiti vanno in coda. */
export function ordinaCombattenti(combattenti: readonly CombattentePubblico[]): CombattentePubblico[] {
  const attivi = combattenti.filter((c) => c.stato !== 'morto' && c.stato !== 'fuggito');
  const fuori = combattenti.filter((c) => c.stato === 'morto' || c.stato === 'fuggito');
  return [...attivi, ...fuori];
}

/** Quota dei PF rimasti, tra 0 e 1 (0 se il massimo non è positivo). */
export function quotaPf(attuali: number, massimi: number): number {
  if (massimi <= 0) return 0;
  return Math.min(1, Math.max(0, attuali / massimi));
}

/** Colore della barra: rosso a 0 PF, giallo fino al 50%, verde sopra. */
export function tonoPf(attuali: number, massimi: number): TonoPf {
  if (attuali <= 0) return 'rosso';
  return quotaPf(attuali, massimi) <= 0.5 ? 'giallo' : 'verde';
}

/** Etichetta di stato sotto il nome (null per chi è in gioco o stabile). */
export function etichettaStato(stato: CombattentePubblico['stato']): string | null {
  switch (stato) {
    case 'a_terra':
      return 'a terra';
    case 'morto':
      return 'morto';
    case 'fuggito':
      return 'fuggito';
    default:
      return null;
  }
}

/** Morti e fuggiti si mostrano sbiaditi. */
export function eSbiadito(c: Pick<CombattentePubblico, 'stato'>): boolean {
  return c.stato === 'morto' || c.stato === 'fuggito' || c.stato === 'a_terra';
}

/** Iniziali di un nome («Ruggero Fondovalle» → «RF»; un solo nome → le prime due lettere). */
export function iniziali(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter(Boolean);
  if (parole.length === 0) return '?';
  if (parole.length === 1) return parole[0]!.slice(0, 2).toUpperCase();
  return parole
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

/** «Round 2», o «Round 2 · fase movimento» quando la fase c'è. */
export function etichettaRound(round: number, fase: string | null): string {
  return fase ? `Round ${round} · fase ${fase}` : `Round ${round}`;
}

/** Testo dei PF di un PG («7/12»); null per i PNG (niente numeri a voce: solo la barra). */
export function testoPf(c: Pick<CombattentePubblico, 'di_png' | 'pf'>): string | null {
  if (c.di_png || !c.pf) return null;
  return `${c.pf.attuali}/${c.pf.massimi}`;
}

/** Tiri contro la morte: ☠ con i fallimenti, ✓ con i successi (ciascuno su 3). */
export function etichettaTiriMorte(tiri: { successi: number; fallimenti: number }): string {
  return `☠ ${tiri.fallimenti}/3 ✓ ${tiri.successi}/3`;
}

/** Nomi di chi deve agire, uniti in italiano («Ida», «Ida e Ruggero», «Ida, Ruggero e Corrado»). */
export function elencoItaliano(nomi: readonly string[]): string {
  if (nomi.length <= 1) return nomi[0] ?? '';
  return `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`;
}

/** Nomi di chi tocca adesso: il nome del combattente, o l'id se non è in lista. */
export function nomiDiTurno(combattimento: CombattimentoPubblico): string[] {
  return combattimento.turno_di.map((id) => combattimento.combattenti.find((c) => c.id === id)?.nome ?? id);
}

/** Il combattente che corrisponde al PG del telefono (null se non è nello scontro). */
export function combattenteDi(combattimento: CombattimentoPubblico, idPg: string): CombattentePubblico | null {
  return combattimento.combattenti.find((c) => c.id === idPg) ?? null;
}
