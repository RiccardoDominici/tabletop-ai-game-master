/**
 * Sfondo del proiettore: l'immagine del luogo a tutto schermo con un lento Ken Burns, e la
 * dissolvenza incrociata quando il luogo cambia. Senza immagine (null o caricamento fallito) torna
 * lo sfondo d'atmosfera (SfondoUmore): mai un'immagine rotta a schermo.
 *
 * Flusso: `immagine` cambia → il precaricatore la scarica e la DECODIFICA (img.decode()) → solo
 * allora entra un nuovo strato sopra il vecchio (1,5 s d'opacità) → a fine dissolvenza il vecchio
 * si toglie. La logica degli strati è pura (strati.ts); qui ci sono caricamento, animazioni e DOM.
 */
import { useEffect, useReducer } from 'react';
import { creaLog } from '../lib/log';
import { debugSchermo } from './debug';
import { precaricatore } from './immaginiScena';
import { SfondoUmore } from './SfondoUmore';
import { aggiornaSfondo, immagineCorrente, serveSfondoUmore, SFONDO_INIZIALE } from './strati';
import './luogo.css';

const log = creaLog('sfondo');

/** Durata della dissolvenza: deve coincidere con luogo.css. */
const DURATA_DISSOLVENZA_MS = 1500;
/** Se `animationend` non arriva (scheda nascosta, animazioni spente), si chiude da sé poco dopo. */
const MARGINE_SICUREZZA_MS = 500;

interface Props {
  immagine: string | null;
  umore: string | null;
  intensita: number | null;
}

export function SfondoLuogo({ immagine, umore, intensita }: Props) {
  const [stato, invia] = useReducer(aggiornaSfondo, SFONDO_INIZIALE);

  // Nuova immagine: prima scaricata e decodificata, poi (se è ancora quella voluta) in dissolvenza.
  useEffect(() => {
    if (!immagine) {
      invia({ tipo: 'nessuna' });
      return;
    }
    let ancoraVoluta = true;
    void precaricatore.carica(immagine).then((pronta) => {
      if (!ancoraVoluta) return;
      if (pronta) invia({ tipo: 'pronta', src: immagine });
      else {
        log.warn('Immagine del luogo non caricata: resta lo sfondo d’atmosfera', { immagine });
        invia({ tipo: 'nessuna' });
      }
    });
    return () => {
      ancoraVoluta = false;
    };
  }, [immagine]);

  // Rete di sicurezza: ogni strato in movimento si chiude comunque dopo la durata della dissolvenza.
  const inMovimento = stato.strati
    .filter((s) => s.stato !== 'piena')
    .map((s) => `${s.chiave}:${s.stato}`)
    .join(',');
  useEffect(() => {
    if (!inMovimento) return;
    const timer = inMovimento.split(',').map((voce) => {
      const chiave = Number(voce.split(':')[0]);
      return window.setTimeout(() => invia({ tipo: 'fine', chiave }), DURATA_DISSOLVENZA_MS + MARGINE_SICUREZZA_MS);
    });
    return () => timer.forEach((t) => window.clearTimeout(t));
  }, [inMovimento]);

  const corrente = immagineCorrente(stato);
  useEffect(() => {
    debugSchermo.immagine = corrente;
    debugSchermo.transizioni = stato.transizioni;
  }, [corrente, stato.transizioni]);

  // Lo strato «di riferimento» (testid) è quello più in alto che non sta uscendo.
  const chiaveCima = [...stato.strati].reverse().find((s) => s.stato !== 'esce')?.chiave ?? null;

  return (
    <div className="sfondo-luogo" aria-hidden>
      {serveSfondoUmore(stato) && <SfondoUmore umore={umore} intensita={intensita} />}
      {stato.strati.map((s) => (
        <div
          key={s.chiave}
          className="strato-luogo"
          data-stato={s.stato}
          data-verso={s.chiave % 2}
          data-src={s.src}
          data-testid={s.chiave === chiaveCima ? 'sfondo-immagine' : undefined}
          onAnimationEnd={(e) => {
            // Solo la dissolvenza dello strato, non il Ken Burns dell'immagine dentro (che risale).
            if (e.target === e.currentTarget) invia({ tipo: 'fine', chiave: s.chiave });
          }}
        >
          <img src={s.src} alt="" decoding="async" draggable={false} />
        </div>
      ))}
      {stato.strati.length > 0 && <div className="velo-luogo" />}
    </div>
  );
}
