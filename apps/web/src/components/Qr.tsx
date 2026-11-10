/**
 * QR del link per i telefoni. L'SVG arriva già pronto dal server (`InfoServer.qr_svg`, fonte
 * fidata: è il nostro server) e si inserisce così com'è dentro un riquadro chiaro: il QR ha
 * bisogno di contrasto e di margine bianco per essere letto da lontano.
 */
import { t } from '../lingua';
import clsx from 'clsx';

export function Qr({ svg, className, testId = 'qr' }: { svg: string; className?: string; testId?: string }) {
  return (
    <div
      data-testid={testId}
      role="img"
      aria-label={t('comune.qr.aria')}
      className={clsx(
        'rounded-xl bg-[#fbf7ee] p-3 shadow-profonda [&>svg]:block [&>svg]:h-full [&>svg]:w-full',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
