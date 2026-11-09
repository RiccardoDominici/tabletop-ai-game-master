/**
 * Una serata chiusa nel diario del telefono: etichetta, data leggibile, il testo del riassunto e i
 * fili aperti («Fili aperti»: le domande che la serata lascia). Solo fatti pubblici.
 */
import type { RiassuntoSerata } from '@cantastorie/shared';
import { dataLeggibile } from '../lib/serata';

export function DiarioSerata({ serata }: { serata: RiassuntoSerata }) {
  const data = dataLeggibile(serata.quando);
  return (
    <article data-testid="diario-serata" className="flex flex-col gap-2 rounded-carta border border-bordo bg-notte-2/60 p-4">
      <header className="flex flex-col gap-0.5">
        <h3 className="font-titolo text-base font-semibold text-candela">{serata.etichetta}</h3>
        {data && <p className="text-xs tracking-wide text-cenere">{data}</p>}
      </header>
      <p className="font-racconto text-[1.05rem] leading-snug text-pergamena">{serata.testo}</p>
      {serata.fili.length > 0 && (
        <section className="flex flex-col gap-1 border-t border-bordo pt-2">
          <h4 className="text-xs tracking-[0.14em] text-cenere uppercase">Fili aperti</h4>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[0.95rem] text-pergamena-2">
            {serata.fili.map((filo, i) => (
              <li key={i}>{filo}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
