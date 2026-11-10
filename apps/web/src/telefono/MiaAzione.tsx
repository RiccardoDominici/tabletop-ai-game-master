/**
 * La mia azione così come la conosce il server (evento `azione:mia`): stato, note e `motivo`.
 *
 * - Il chip ha `data-testid="stato-mia-azione"` e contiene esattamente l'etichetta dello stato.
 * - «in coda» è tranquillo (attesa), «da decidere» è pieno e pulsa: è l'unico che chiede una
 *   scelta, con il pulsante «Decidi» se l'avviso a tutto schermo è stato messo da parte.
 * - Il testo dell'azione si ripete qui solo se NON è già nella casella sotto (es. azione chiusa
 *   o risolta, casella svuotata per la prossima).
 * - superata / sospesa: il `motivo` (testid `motivo-azione`) e «Riscrivi», che porta il cursore
 *   nella casella dove il testo è già tornato.
 */
import { t } from '../lingua';
import clsx from 'clsx';
import type { AzionePrivata, StatoAzione, StatoTavolo } from '@cantastorie/shared';
import { useBozza } from '../store/bozza';
import { useTelefono } from '../store/telefono';
import { riapriScelta } from './sessione';
import { TiriMiaAzione } from './TiriTurno';
import {
  azioneViva,
  chiaveRichiesta,
  daRiscrivere,
  etichettaStatoAzione,
  motivoDaMostrare,
  perProssimoTurno,
} from './vista';

const STILE_CHIP: Record<StatoAzione, string> = {
  // Attesa: contorno sobrio, nessun colore che «chiama».
  in_coda: 'border border-pergamena-2/60 text-pergamena-2',
  // Scelta richiesta: pieno e caldo, con un puntino che pulsa (sotto): l'unico che «chiama».
  da_confermare: 'bg-candela text-notte',
  chiusa: 'bg-lago/90 text-notte',
  risolta: 'bg-muschio text-notte',
  ritirata: 'border border-bordo-chiaro text-cenere',
  superata: 'border border-brace text-brace',
  sospesa: 'border border-brace text-brace',
};

export function MiaAzione({ azione, stato }: { azione: AzionePrivata; stato: StatoTavolo }) {
  const bozza = useBozza((s) => s.testo);
  const chiediFuoco = useBozza((s) => s.chiediFuoco);
  const sceltaRimandata = useTelefono((s) => s.sceltaRimandata);

  const viva = azioneViva(azione);
  const nellaCasella = bozza.trim() === azione.testo.trim();
  const motivo = motivoDaMostrare(azione);
  const prossimo = perProssimoTurno(stato, azione);
  const rimandata = azione.stato === 'da_confermare' && sceltaRimandata === chiaveRichiesta(azione);

  return (
    <div data-testid="mia-azione" className="flex flex-col gap-1.5">
      <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem]">
        <span className="font-semibold text-pergamena">{t('telefono.mia.tua_azione')}</span>
        <span
          data-testid="stato-mia-azione"
          data-stato={azione.stato}
          className={clsx(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold',
            STILE_CHIP[azione.stato],
          )}
        >
          {azione.stato === 'da_confermare' && (
            <span aria-hidden className="relative inline-flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-notte/60" />
              <span className="relative inline-flex size-2 rounded-full bg-notte" />
            </span>
          )}
          {etichettaStatoAzione(azione.stato)}
        </span>
        {prossimo && <span className="text-pergamena-2">{t('telefono.stato.prossimo_turno')}</span>}
        {azione.privata && <span className="text-lago">{t('telefono.mia.privata')}</span>}
        {viva && !nellaCasella && bozza.trim() !== '' && <span className="text-brace">{t('telefono.mia.non_inviate')}</span>}
        {rimandata && (
          <button
            type="button"
            onClick={riapriScelta}
            className="ml-auto min-h-9 rounded-full bg-candela px-3 text-sm font-bold text-notte"
          >
            {t('telefono.mia.decidi')}
          </button>
        )}
      </div>

      {!nellaCasella && !viva && (
        <p
          className={clsx(
            'line-clamp-2 text-[0.95rem] leading-snug break-words',
            azione.stato === 'ritirata' ? 'text-cenere line-through' : 'text-pergamena-2',
          )}
        >
          {t('comune.citazione', { testo: azione.testo })}
        </p>
      )}

      {motivo && (
        <div
          className={clsx(
            'flex items-start gap-3 rounded-xl border px-3 py-2',
            azione.stato === 'da_confermare' ? 'border-candela/50 bg-candela/10' : 'border-brace/50 bg-brace/10',
          )}
        >
          <p
            data-testid="motivo-azione"
            // «Da decidere»: il testo intero è nell'avviso (pulsante «Decidi»); qui basta un promemoria.
            className={clsx(
              'min-w-0 flex-1 text-[0.95rem] leading-snug text-pergamena',
              azione.stato === 'da_confermare' ? 'line-clamp-2' : 'line-clamp-4',
            )}
          >
            {motivo}
          </p>
          {daRiscrivere(azione) && (
            <button
              type="button"
              data-testid="riscrivi-azione"
              onClick={chiediFuoco}
              className="min-h-11 shrink-0 rounded-lg border border-brace px-3 font-bold text-brace"
            >
              {t('telefono.mia.riscrivi')}
            </button>
          )}
        </div>
      )}

      {/* I tiri del Motore per questa azione (anche privati: questo oggetto arriva solo a me). */}
      {azione.tiri && azione.tiri.length > 0 && <TiriMiaAzione tiri={azione.tiri} stato={stato} />}
    </div>
  );
}
