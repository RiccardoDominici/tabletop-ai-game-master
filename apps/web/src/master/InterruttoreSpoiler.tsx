/**
 * Interruttore della modalità «senza spoiler» (master/spoiler.ts): attiva per default, perché chi fa
 * da master spesso gioca anche. Spento, il pannello mostra segni degli orologi, azioni private,
 * battute non uscite e situazioni. La scelta resta salvata nel browser.
 */
import clsx from 'clsx';
import { useMaster, useSenzaSpoiler } from '../store/master';
import { t } from '../lingua';

export function InterruttoreSpoiler() {
  const attiva = useSenzaSpoiler();
  const imposta = useMaster((s) => s.impostaSenzaSpoiler);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={attiva}
      data-testid="master-spoiler"
      data-attivo={String(attiva)}
      onClick={() => imposta(!attiva)}
      title={
        attiva
          ? t('master.spoiler.titolo_attivo')
          : t('master.spoiler.titolo_spento')
      }
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors',
        attiva ? 'border-muschio/70 bg-muschio/15 text-muschio' : 'border-sangue/70 bg-sangue/15 text-sangue',
      )}
    >
      <span aria-hidden className={clsx('relative inline-block h-4 w-7 rounded-full', attiva ? 'bg-muschio' : 'bg-sangue/70')}>
        <span className={clsx('absolute top-0.5 size-3 rounded-full bg-notte transition-all', attiva ? 'left-3.5' : 'left-0.5')} />
      </span>
      {attiva ? t('master.spoiler.attivo') : t('master.spoiler.spento')}
    </button>
  );
}
