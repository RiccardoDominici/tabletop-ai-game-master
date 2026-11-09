/**
 * Carte dei tiri sul proiettore: quelle PUBBLICHE dell'ultimo turno risolto (`stato.tiri`).
 *
 * Dove: una colonna a destra, dai pulsantini dell'HUD (in alto) al QR (in basso). La fascia in alto
 * a sinistra e al centro resta libera (titolo della scena, eventuali ritratti dei PNG); il centro
 * in basso è della narrazione: mentre le carte si narrano, PaginaSchermo le lascia spazio a destra
 * (`lasciaSpazio`), così il sottotitolo non ci finisce mai sotto.
 *
 * Quando (lib/tiri.ts, `vistaTiriSchermo`):
 * - dalla chiusura della finestra a fine narrazione del loro turno: carte grandi che si animano
 *   (al massimo MASSIMO_CARTE_GRANDI; di più, tutte compatte). L'animazione copre anche l'attesa
 *   della prima frase del narratore;
 * - poi (si apre la finestra dopo, pausa, cambio scena): una striscia compatta per ~10 s, che sfuma.
 * Senza carte (campagne senza schede, turni senza tiri) non c'è niente.
 */
import { useEffect, useReducer, useState } from 'react';
import clsx from 'clsx';
import type { StatoTavolo, TiroMostrato } from '@cantastorie/shared';
import { CartaTiro } from '../components/CartaTiro';
import { creaLog } from '../lib/log';
import { useSchermo } from '../store/schermo';
import { chiaveTiri, DURATA_CODA_MS, turnoInNarrazione, vistaTiriSchermo, type ModoTiriSchermo } from '../lib/tiri';

const log = creaLog('tiri');

/** La striscia compatta sfuma in questo tempo prima di sparire (va d'accordo con `duration-700`). */
const DURATA_SVANIRE_MS = 700;

export interface VistaTiri {
  tiri: TiroMostrato[];
  modo: ModoTiriSchermo;
  /** Il turno delle carte si sta narrando: le carte si animano. */
  inNarrazione: boolean;
  /** La narrazione deve lasciare libera la colonna a destra. */
  lasciaSpazio: boolean;
  /** Ultimi istanti della striscia compatta: sfuma. */
  svanisce: boolean;
}

/**
 * Decide forma e durata delle carte. Il «dopo» (la coda di ~10 s) parte quando questo proiettore
 * si accorge che la narrazione delle carte è finita: anche dopo un ricaricamento a finestra aperta
 * le carte vecchie restano solo ~10 s.
 */
export function useVistaTiri(stato: StatoTavolo): VistaTiri {
  const tiri = stato.tiri ?? [];
  const chiave = chiaveTiri(tiri);
  const contesto = { fase: stato.fase, turno: stato.turno, finestraAperta: stato.finestra.aperta };
  const primo = tiri[0];
  const inNarrazione = primo !== undefined && turnoInNarrazione(contesto, primo.turno);
  // L'ultima frase del turno può suonare ancora un attimo dopo l'apertura della finestra.
  const fraseDelTurno = useSchermo((s) => primo !== undefined && s.inOnda?.turno === primo.turno);

  // Istante (orologio locale) in cui la narrazione di queste carte è finita.
  const [fine, setFine] = useState<{ chiave: string; da: number } | null>(null);
  const dopoDa = !inNarrazione && fine?.chiave === chiave ? fine.da : null;
  useEffect(() => {
    if (chiave === '' || inNarrazione) return;
    setFine((f) => (f?.chiave === chiave ? f : { chiave, da: Date.now() }));
  }, [chiave, inNarrazione]);

  // Due risvegli: quando la striscia comincia a sfumare e quando sparisce.
  const [, risveglia] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (dopoDa === null) return;
    const timer = [DURATA_CODA_MS - DURATA_SVANIRE_MS, DURATA_CODA_MS]
      .map((t) => dopoDa + t - Date.now())
      .filter((resta) => resta > 0)
      .map((resta) => window.setTimeout(risveglia, resta + 20));
    return () => timer.forEach((t) => window.clearTimeout(t));
  }, [dopoDa]);

  const ora = Date.now();
  const vista = vistaTiriSchermo(tiri, contesto, dopoDa, ora);
  return {
    tiri,
    ...vista,
    // Lo spazio resta finché suona una frase di quel turno: il sottotitolo non salta a metà frase.
    lasciaSpazio: vista.modo !== 'nessuno' && (vista.inNarrazione || fraseDelTurno),
    svanisce: vista.modo === 'compatti' && dopoDa !== null && ora - dopoDa >= DURATA_CODA_MS - DURATA_SVANIRE_MS,
  };
}

export function TiriSchermo({ vista }: { vista: VistaTiri }) {
  const { modo, tiri } = vista;
  const turno = tiri[0]?.turno ?? null;
  useEffect(() => {
    if (modo !== 'nessuno') log.info('Carte dei tiri a schermo', { turno, carte: tiri.length, modo });
    // Si registra solo il cambio di forma o di turno, non ogni istantanea (niente `tiri` qui).
  }, [modo, turno]);

  if (modo === 'nessuno') return null;
  const compatte = modo === 'compatti';
  return (
    <aside
      data-testid="tiri-schermo"
      data-modo={modo}
      aria-label="Tiri del turno"
      className={clsx(
        // Colonna a destra: sotto i pulsantini in alto (HUD, audio), sopra il QR in basso.
        'pointer-events-none absolute top-[6.5vh] right-[3.5vw] z-20 flex max-h-[73vh] w-[27vw] flex-col overflow-hidden',
        compatte ? 'gap-[0.9vh]' : 'gap-[1.4vh]',
        'transition-opacity duration-700',
        vista.svanisce && 'opacity-0',
        !vista.inNarrazione && 'animate-comparsa',
      )}
    >
      {tiri.map((tiro, i) => (
        <CartaTiro key={tiro.id} tiro={tiro} variante="proiettore" compatta={compatte} indice={i} anima={vista.inNarrazione} />
      ))}
    </aside>
  );
}
