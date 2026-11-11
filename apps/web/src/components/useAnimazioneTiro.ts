/**
 * Animazione di una carta di tiro, UNA volta sola per id in tutta la pagina.
 *
 * - Gli id già animati stanno in un Set a livello di modulo: un nuovo render, una riconnessione del
 *   socket (stessa istantanea, stessi id) o il passaggio da carta grande a striscia compatta
 *   montano un componente nuovo, ma la carta resta ferma sul risultato. Ricaricare la pagina invece
 *   azzera il Set (e allora si anima solo se la carta è ancora «fresca», vedi `attiva`).
 * - Con `prefers-reduced-motion` lo stato finale arriva subito.
 * - Doppio effetto di StrictMode: l'id entra nel Set nell'effetto (non nel render) e la decisione
 *   «animo o no» è presa una volta al montaggio, quindi il secondo giro riparte senza saltare.
 */
import { useEffect, useState } from 'react';
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { creaLog } from '../lib/log';
import { facciaCasuale, passoAnimazione, TEMPI_ANIMAZIONE, type PassoAnimazione } from '../lib/tiri';

const log = creaLog('tiri');

/** Carte già animate in questa pagina (per id del Motore): non si rianimano. */
const animate = new Set<string>();

/** SOLO per il banco di prova (debug/ProvaCarte.tsx): dimentica le carte animate per rivederle. */
export function dimenticaAnimazioni(): void {
  animate.clear();
}

function movimentoRidotto(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export interface AnimazioneTiro {
  /** La carta si sta animando (o si è animata) in questo componente: le parti entrano con le classi CSS. */
  animata: boolean;
  passo: PassoAnimazione;
  /** Facce dei d20 da mostrare adesso: a caso mentre gira, poi quelle vere. */
  facce: number[];
}

/**
 * @param ritardoMs sfalsamento della carta nel suo gruppo (indice × TEMPI_ANIMAZIONE.sfalsamentoMs)
 * @param attiva la carta è fresca (il suo turno si sta narrando): altrimenti si mostra ferma
 */
export function useAnimazioneTiro(tiro: Pick<TiroMostrato, 'id' | 'dadi'>, ritardoMs: number, attiva: boolean): AnimazioneTiro {
  // Deciso al montaggio, senza effetti collaterali (il render può ripetersi).
  const [anima] = useState(() => attiva && !animate.has(tiro.id) && !movimentoRidotto());
  const [stato, setStato] = useState<AnimazioneTiro>(() => ({ animata: anima, passo: anima ? 'attesa' : 'fermo', facce: tiro.dadi }));

  const { id, dadi } = tiro;
  useEffect(() => {
    if (!anima) return;
    animate.add(id);
    const inizio = performance.now() + ritardoMs;
    let facce = dadi;
    const scatta = () => {
      const passo = passoAnimazione(performance.now() - inizio);
      // Mentre gira ogni d20 cambia faccia (mai la stessa due volte di fila); poi quelle vere.
      facce = passo === 'lancio' ? facce.map((f) => facciaCasuale(Math.random, f)) : dadi;
      setStato((s) => (s.passo === passo && passo !== 'lancio' ? s : { animata: true, passo, facce }));
      if (passo === 'fermo') {
        window.clearInterval(timer);
        log.debug('Carta animata', { id });
      }
    };
    const timer = window.setInterval(scatta, TEMPI_ANIMAZIONE.scattoMs);
    scatta();
    return () => window.clearInterval(timer);
    // `dadi` è fisso per id (il Motore non ritira una carta già mandata): non serve tra le dipendenze.
  }, [anima, id, ritardoMs]);

  return stato;
}
