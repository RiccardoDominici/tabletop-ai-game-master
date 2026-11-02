/**
 * Immagini della scena sul proiettore: un solo precaricatore per la pagina e il gancio che
 * precarica i luoghi probabili (`scena.prossime`) e tutti i ritratti (`scena.ritratti`) ogni volta
 * che cambiano. Oggetti Image fuori dal DOM, senza doppioni (vedi precarica.ts).
 */
import { useEffect } from 'react';
import type { ScenaPubblica } from '@cantastorie/shared';
import { creaLog } from '../lib/log';
import { Precaricatore, urlDaPrecaricare } from './precarica';

const log = creaLog('immagini');

/** Condiviso tra precaricamento e dissolvenze: un'immagine scaricata una volta serve a entrambi. */
export const precaricatore = new Precaricatore();

export function usePrecaricamentoScena(scena: ScenaPubblica | null): void {
  // Una chiave stabile: l'effetto riparte solo quando l'elenco cambia davvero, non a ogni stato.
  const urls = scena ? urlDaPrecaricare(scena.prossime ?? [], scena.ritratti ?? {}) : [];
  const chiave = urls.join('|');
  useEffect(() => {
    if (!chiave) return;
    const elenco = chiave.split('|');
    precaricatore.precarica(elenco);
    log.debug('Precaricamento immagini', { quante: elenco.length });
  }, [chiave]);
}
