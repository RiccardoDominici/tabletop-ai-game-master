/**
 * Testo della riga di stato in basso sul proiettore quando la finestra è chiusa.
 *
 * Mentre suona una frase di un PNG la riga dice chi parla davvero («Ottavia sta parlando»):
 * prima diceva sempre «Il narratore sta parlando», anche sopra il ritratto di un PNG.
 */
import type { FaseScena } from '@cantastorie/shared';
import type { FraseInOnda } from '../store/schermo';

const ETICHETTA_FASE: Record<FaseScena, string> = {
  attesa: 'In attesa di cominciare',
  apertura: 'Il narratore apre la scena',
  finestra: 'Il narratore ascolta',
  narrazione: 'Il narratore sta parlando',
  fermata: 'Scena fermata',
};

/** Titoli da saltare nel nome breve («Sorella Teodora» → «Teodora»), come fa il server negli avvisi. */
const TITOLI = new Set(['sorella', 'fratello', 'padre', 'madre', 'ser', 'messer', 'donna', 'dama', 'mastro', 'frate', 'suor']);

/** Primo nome di chi parla («Ottavia Ferlini» → «Ottavia»), come nelle altre righe dello schermo. */
export function primoNome(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter(Boolean);
  const i = parole.length > 1 && TITOLI.has(parole[0]!.toLowerCase()) ? 1 : 0;
  return parole[i] ?? nome;
}

/**
 * Etichetta per la fase, corretta con chi è in onda: un PNG che parla durante la narrazione (o
 * l'apertura) prende il posto del narratore; in silenzio o col narratore resta l'etichetta di fase.
 */
export function etichettaFase(fase: FaseScena, inOnda: Pick<FraseInOnda, 'parlante' | 'nome'> | null): string {
  const parla = fase === 'narrazione' || fase === 'apertura';
  if (parla && inOnda && inOnda.parlante !== 'narratore' && inOnda.nome.trim()) return `${primoNome(inOnda.nome)} sta parlando`;
  return ETICHETTA_FASE[fase];
}
