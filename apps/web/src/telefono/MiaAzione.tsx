/**
 * La mia azione così come la conosce il server (evento `azione:mia`), con il suo stato.
 * Il chip ha `data-testid="stato-mia-azione"` e contiene esattamente l'etichetta dello stato.
 *
 * Due forme:
 * - `compatta` (finestra aperta: il testo è già nella casella): solo una riga col chip, più un
 *   avviso se la bozza è stata cambiata e non ancora inviata;
 * - completa (finestra chiusa: la casella è ridotta): testo dell'azione (max 3 righe) e chip.
 */
import clsx from 'clsx';
import type { AzionePrivata, StatoAzione } from '@cantastorie/shared';
import { ETICHETTA_STATO_AZIONE } from './vista';

const STILE_CHIP: Record<StatoAzione, string> = {
  in_coda: 'bg-candela text-notte',
  in_risoluzione: 'bg-lago text-notte',
  risolta: 'bg-muschio text-notte',
  ritirata: 'border border-bordo-chiaro text-cenere',
};

interface Props {
  azione: AzionePrivata;
  compatta?: boolean;
  /** La bozza nella casella è diversa dal testo inviato. */
  modificheNonInviate?: boolean;
}

export function MiaAzione({ azione, compatta = false, modificheNonInviate = false }: Props) {
  const chip = (
    <span
      data-testid="stato-mia-azione"
      data-stato={azione.stato}
      className={clsx('shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold', STILE_CHIP[azione.stato])}
    >
      {ETICHETTA_STATO_AZIONE[azione.stato]}
    </span>
  );

  if (compatta) {
    return (
      <div className="flex min-h-8 items-center gap-2 text-[0.95rem]">
        <span className="font-semibold text-pergamena">La tua azione:</span>
        {chip}
        {modificheNonInviate && <span className="truncate text-brace">modifiche non inviate</span>}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-bordo bg-notte-2 px-3 py-2">
      <p
        className={clsx(
          'line-clamp-3 min-w-0 flex-1 text-[0.95rem] leading-snug',
          azione.stato === 'ritirata' ? 'text-cenere line-through' : 'text-pergamena-2',
        )}
      >
        <span className="font-semibold text-pergamena">La tua azione: </span>
        <span className="break-words">{azione.testo}</span>
      </p>
      {chip}
    </div>
  );
}
