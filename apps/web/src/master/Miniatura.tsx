/**
 * Miniatura di un'immagine del proiettore (luogo, situazione). Senza URL, o se l'immagine non si
 * carica, mostra un riquadro scuro: il pannello non deve mai avere icone rotte.
 */
import { useState } from 'react';
import clsx from 'clsx';

export function Miniatura({ url, alt, className }: { url: string | null; alt: string; className?: string }) {
  const [rotta, setRotta] = useState<string | null>(null);
  const mostra = url !== null && rotta !== url;
  return (
    <span
      className={clsx(
        'relative block shrink-0 overflow-hidden rounded-md border border-bordo bg-[radial-gradient(circle_at_30%_30%,var(--color-notte-4),var(--color-notte))]',
        className,
      )}
    >
      {mostra && (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setRotta(url)}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}
