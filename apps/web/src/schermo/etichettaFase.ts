/**
 * Testo della riga di stato in basso sul proiettore quando la finestra è chiusa.
 *
 * Mentre suona una frase di un PNG la riga dice chi parla davvero («Ottavia sta parlando»):
 * prima diceva sempre «Il narratore sta parlando», anche sopra il ritratto di un PNG.
 */
import type { FaseScena } from '@tabletop-ai-gm/shared';
import type { FraseInOnda } from '../store/schermo';
import { t, type Chiave } from '../lingua';

/** Chiave del testo di ciascuna fase (schermo.fase.*): la lingua si legge al momento dell'uso. */
const CHIAVE_FASE: Record<FaseScena, Chiave> = {
  attesa: 'schermo.fase.attesa',
  apertura: 'schermo.fase.apertura',
  finestra: 'schermo.fase.ascolta',
  narrazione: 'schermo.fase.preparando',
  pausa: 'schermo.fase.pausa',
  fermata: 'schermo.fase.fermata',
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
 * In pausa l'ultima frase può ancora suonare (il server passa in pausa a fine stimata dell'audio):
 * finché suona, la riga dice chi parla; poi «Tavolo in pausa».
 */
export function etichettaFase(fase: FaseScena, inOnda: Pick<FraseInOnda, 'parlante' | 'nome'> | null): string {
  const parla = fase === 'narrazione' || fase === 'apertura' || fase === 'pausa';
  if (parla && inOnda && inOnda.parlante !== 'narratore' && inOnda.nome.trim()) return t('schermo.fase.sta_parlando', { nome: primoNome(inOnda.nome) });
  // In narrazione senza niente in onda il Motore sta lavorando (LLM, voce): «sta preparando…».
  if ((fase === 'pausa' || fase === 'narrazione') && inOnda) return t('schermo.fase.narratore_parla');
  return t(CHIAVE_FASE[fase]);
}
