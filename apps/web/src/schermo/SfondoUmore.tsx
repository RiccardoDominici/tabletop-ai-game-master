/** Sfondo animato a tutto schermo scelto da `scena.umore` e `scena.intensita` (vedi umori.ts). */
import type { CSSProperties } from 'react';
import { parametriSfondo } from './umori';
import './sfondo.css';

export function SfondoUmore({ umore, intensita }: { umore: string | null; intensita: number | null }) {
  const { tavolozza, durataS, opacita } = parametriSfondo(umore, intensita);
  const variabili = {
    '--fondo': tavolozza.fondo,
    '--c1': tavolozza.c1,
    '--c2': tavolozza.c2,
    '--c3': tavolozza.c3,
    '--durata': `${durataS}s`,
    '--opacita': String(opacita),
  } as CSSProperties;

  return (
    <div className="sfondo-umore" style={variabili} data-tavolozza={tavolozza.nome} aria-hidden>
      <div className="macchia macchia-1" />
      <div className="macchia macchia-2" />
      <div className="macchia macchia-3" />
      <div className="vignetta" />
    </div>
  );
}
