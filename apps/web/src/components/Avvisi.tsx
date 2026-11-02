/** Toast degli avvisi (in basso al centro, sopra tutto). */
import clsx from 'clsx';
import { useAvvisi } from '../store/avvisi';

export function Avvisi({ grande = false }: { grande?: boolean }) {
  const avvisi = useAvvisi((s) => s.avvisi);
  const togli = useAvvisi((s) => s.togli);
  if (avvisi.length === 0) return null;
  return (
    <div
      className={clsx(
        'pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4',
        grande ? 'top-6' : 'top-[max(env(safe-area-inset-top),0.75rem)]',
      )}
      aria-live="polite"
    >
      {avvisi.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => togli(a.id)}
          className={clsx(
            'pointer-events-auto max-w-xl rounded-carta border px-4 py-3 text-left shadow-profonda',
            grande ? 'text-2xl' : 'text-base',
            a.livello === 'errore'
              ? 'border-sangue/60 bg-notte-3 text-sangue'
              : 'border-bordo-chiaro bg-notte-3 text-pergamena',
          )}
        >
          {a.testo}
        </button>
      ))}
    </div>
  );
}
