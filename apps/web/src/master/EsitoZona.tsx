/**
 * Esito dell'ultimo comando di una zona del pannello, mostrato vicino ai suoi pulsanti: errore del
 * server in rosso (resta finché non lo si chiude o non parte un altro comando della zona), oppure
 * una conferma verde che sparisce da sola (store/master.ts).
 */
import clsx from 'clsx';
import { useMaster } from '../store/master';
import type { ZonaComando } from './comandi';
import { oraBreve } from './etichette';

export function EsitoZona({ zona, className }: { zona: ZonaComando; className?: string }) {
  const esito = useMaster((s) => s.esiti[zona]);
  const togli = useMaster((s) => s.togliEsito);
  if (!esito) return null;

  return (
    <p
      role={esito.ok ? 'status' : 'alert'}
      data-testid={`master-esito-${zona}`}
      data-ok={String(esito.ok)}
      className={clsx(
        'flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-sm leading-snug',
        esito.ok ? 'border-muschio/40 bg-muschio/10 text-muschio' : 'border-sangue/60 bg-sangue/10 text-sangue',
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        {esito.ok ? (
          <>Fatto: {esito.descrizione}</>
        ) : (
          <>
            <strong className="font-semibold">«{esito.descrizione}» rifiutato:</strong> {esito.errore}
          </>
        )}
      </span>
      <time className="shrink-0 text-xs opacity-80 tabular-nums">{oraBreve(esito.ts)}</time>
      <button
        type="button"
        onClick={() => togli(zona)}
        aria-label="Chiudi l’avviso"
        className="-my-0.5 shrink-0 rounded px-1 font-bold opacity-80 hover:opacity-100"
      >
        ×
      </button>
    </p>
  );
}
