/**
 * Punti ferita del mio PG nell'intestazione del telefono, subito sotto il nome: «PF 6/12».
 * Colore: muschio oltre metà, candela a metà o meno, rosso a 0 («PF 0/12 · a terra»).
 * Una pillola piccola sotto il nome e non un altro pulsante nella riga: la riga dell'intestazione
 * ha già i pulsanti (Ascolta qui, Scheda, Cambia) e su 390 px non c'è altro spazio in larghezza.
 * Senza PF (campagna senza schede numeriche) non c'è: l'intestazione resta com'era.
 */
import clsx from 'clsx';
import type { PuntiFerita } from '@cantastorie/shared';
import { livelloPf, testoPf, type LivelloPf } from '../lib/tiri';

const STILE: Record<LivelloPf, string> = {
  pieni: 'border-muschio/60 text-muschio',
  feriti: 'border-candela/70 bg-candela/10 text-candela',
  a_terra: 'border-sangue bg-sangue/15 text-sangue',
};

export function PuntiFeritaPg({ pf }: { pf: PuntiFerita | null | undefined }) {
  if (!pf) return null;
  const livello = livelloPf(pf);
  return (
    <p
      data-testid="pf-pg"
      data-livello={livello}
      className={clsx(
        'mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-tight font-bold tabular-nums',
        STILE[livello],
      )}
    >
      <span className="tracking-[0.12em]">PF</span>
      <span className="text-[0.85rem] font-extrabold">{testoPf(pf)}</span>
      {livello === 'a_terra' && <span className="tracking-wide uppercase">· a terra</span>}
    </p>
  );
}
