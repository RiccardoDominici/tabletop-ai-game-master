/**
 * Testi della serata condivisi da telefono (diario), proiettore (fine serata) e pannello del master
 * (durata e preavviso). Funzioni pure, in italiano, testate in serata.test.ts.
 *
 * Le durate si leggono come le direbbe chi gioca: «35 min», «1 h 05 min», «2,5 ore».
 */

/** Durata scelta dal master per la serata, in ore: passo di un quarto d'ora, da mezz'ora a otto ore. */
export const MIN_ORE_SERATA = 0.5;
export const MAX_ORE_SERATA = 8;
export const PASSO_ORE_SERATA = 0.25;

/** Una data come «9 novembre 2026»; stringa vuota se la data non si legge. */
export function dataLeggibile(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Minuti come «35 min» o «1 h 05 min»; sotto zero (oltre la fine prevista) come «oltre di 5 min». */
export function testoMinuti(minuti: number): string {
  const assoluti = Math.round(Math.abs(minuti));
  const ore = Math.floor(assoluti / 60);
  const resto = assoluti % 60;
  let testo: string;
  if (ore === 0) testo = `${resto} min`;
  else if (resto === 0) testo = `${ore} h`;
  else testo = `${ore} h ${String(resto).padStart(2, '0')} min`;
  return minuti < 0 ? `oltre di ${testo}` : testo;
}

/** Ore come «2 ore», «2,5 ore», «1 ora» (virgola decimale, come si scrive in italiano). */
export function testoOre(ore: number): string {
  const numero = Number.isInteger(ore) ? String(ore) : String(ore).replace('.', ',');
  return `${numero} ${ore === 1 ? 'ora' : 'ore'}`;
}

/** Vero se la durata è nell'intervallo e cade su un passo di un quarto d'ora (quello che accetta il server). */
export function oreValide(ore: number): boolean {
  if (!Number.isFinite(ore) || ore < MIN_ORE_SERATA || ore > MAX_ORE_SERATA) return false;
  const passi = ore / PASSO_ORE_SERATA;
  return Math.abs(passi - Math.round(passi)) < 1e-9;
}

/** L'avviso di fine vicina: quanti minuti mancano; con un climax in corso il narratore aspetta. */
export function avvisoFineVicina(minutiRimasti: number, climax: boolean): string {
  const minuti = Math.max(0, Math.round(minutiRimasti));
  const testo = minuti === 1 ? 'Manca 1 minuto: avviati alla chiusura' : `Mancano ${minuti} minuti: avviati alla chiusura`;
  return climax ? `${testo} · c'è un climax in corso: il narratore aspetta` : testo;
}
