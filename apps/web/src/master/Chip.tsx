/** Chip piccolo (stato, badge) nei toni del tema: vedi master/stili.ts. */
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { CLASSE_TONO_CHIP, type Tono } from './stili';

export function Chip({
  tono = 'neutro',
  children,
  className,
  titolo,
  testid,
}: {
  tono?: Tono;
  children: ReactNode;
  className?: string;
  /** Spiegazione al passaggio del mouse. */
  titolo?: string;
  testid?: string;
}) {
  return (
    <span
      title={titolo}
      data-testid={testid}
      className={clsx(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-px text-xs font-bold whitespace-nowrap',
        CLASSE_TONO_CHIP[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}
