/**
 * Classi Tailwind condivise dal pannello del master (pulsanti e chip), con i token del tema
 * (styles/index.css): un solo posto per varianti e toni, così le sezioni restano coerenti.
 */
import clsx from 'clsx';

/** Tono di un chip o di un'evidenza. */
export type Tono = 'neutro' | 'cenere' | 'candela' | 'brace' | 'muschio' | 'lago' | 'sangue';

export const CLASSE_TONO_CHIP: Record<Tono, string> = {
  neutro: 'border-pergamena-2/50 text-pergamena-2',
  cenere: 'border-cenere/40 text-cenere',
  candela: 'border-candela bg-candela/90 text-notte',
  brace: 'border-brace/70 bg-brace/15 text-brace',
  muschio: 'border-muschio/70 bg-muschio/15 text-muschio',
  lago: 'border-lago/70 bg-lago/15 text-lago',
  sangue: 'border-sangue/70 bg-sangue/15 text-sangue',
};

export type VariantePulsante = 'normale' | 'primario' | 'pericolo' | 'calmo' | 'tenue';
export type DimensionePulsante = 'piccolo' | 'medio' | 'grande';

const VARIANTE: Record<VariantePulsante, string> = {
  normale: 'border-bordo-chiaro bg-notte-3 text-pergamena enabled:hover:border-candela/70 enabled:hover:bg-notte-4',
  primario: 'border-candela bg-candela text-notte enabled:hover:bg-candela-2',
  // Il freno d'emergenza: rosso pieno, si vede da lontano.
  pericolo: 'border-sangue bg-sangue text-notte enabled:hover:brightness-110',
  calmo: 'border-muschio/80 bg-muschio/20 text-muschio enabled:hover:bg-muschio/30',
  tenue: 'border-transparent bg-transparent text-pergamena-2 enabled:hover:bg-notte-4 enabled:hover:text-pergamena',
};

const DIMENSIONE: Record<DimensionePulsante, string> = {
  piccolo: 'min-h-7 px-2 text-sm',
  medio: 'min-h-9 px-3 text-sm',
  grande: 'min-h-12 px-5 text-base',
};

/** Classi di un pulsante del pannello (i disabilitati si spengono, non spariscono). */
export function classePulsante(
  variante: VariantePulsante = 'normale',
  dimensione: DimensionePulsante = 'medio',
  extra?: string,
): string {
  return clsx(
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border font-semibold whitespace-nowrap transition-colors disabled:opacity-35',
    VARIANTE[variante],
    DIMENSIONE[dimensione],
    extra,
  );
}
