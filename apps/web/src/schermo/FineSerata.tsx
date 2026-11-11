/**
 * «Cosa è successo stasera» sul proiettore: la schermata intera dopo «Chiudi la sessione», finché il
 * gioco non riprende. Il riassunto della serata, i fili aperti e i PG con i loro punti ferita attuali
 * e massimi (quando la campagna ha le schede numeriche). Se il riassunto è la riserva del Motore
 * (il modello non ha risposto), una nota piccola lo dice.
 */
import type { FineSerata as FineSerataStato, PgPubblico } from '@tabletop-ai-gm/shared';
import { testoPf } from '../lib/tiri';
import { dataLeggibile } from '../lib/serata';
import { t } from '../lingua';

export function FineSerata({ fine, pg }: { fine: FineSerataStato; pg: PgPubblico[] }) {
  const { riassunto } = fine;
  const data = dataLeggibile(riassunto.quando);
  return (
    <section
      data-testid="fine-serata"
      className="fixed inset-0 z-20 flex flex-col justify-center gap-[4vh] overflow-hidden bg-notte/95 px-[6vw] py-[6vh] text-center"
    >
      <header>
        <p className="text-[1.3vw] tracking-[0.35em] text-candela uppercase">{riassunto.etichetta}</p>
        <h1 className="mt-[1vh] font-titolo text-[3.6vw] leading-tight font-semibold text-pergamena">{t('schermo.fine.titolo')}</h1>
        {data && <p className="mt-[0.8vh] text-[1.3vw] text-cenere">{data}</p>}
      </header>

      <p className="mx-auto max-w-[62vw] font-racconto text-[1.9vw] leading-snug text-pergamena">{riassunto.testo}</p>

      <div className="mx-auto grid w-full max-w-[80vw] grid-cols-[1fr_1fr] items-start gap-[5vw] text-left">
        {riassunto.fili.length > 0 && (
          <div>
            <h2 className="text-[1.2vw] tracking-[0.25em] text-candela uppercase">{t('schermo.fine.fili')}</h2>
            <ul className="mt-[1.2vh] flex list-disc flex-col gap-[0.8vh] pl-[1.6vw] text-[1.5vw] text-pergamena-2">
              {riassunto.fili.map((filo, i) => (
                <li key={i}>{filo}</li>
              ))}
            </ul>
          </div>
        )}
        <div className={riassunto.fili.length > 0 ? undefined : 'col-span-2 mx-auto'}>
          <h2 className="text-[1.2vw] tracking-[0.25em] text-candela uppercase">{t('schermo.fine.chi_c_e')}</h2>
          <ul className="mt-[1.2vh] flex flex-col gap-[0.8vh] text-[1.5vw] text-pergamena">
            {pg.map((p) => (
              <li key={p.id} data-testid="fine-serata-pg" className="flex items-baseline gap-[1vw]">
                <span>{p.nome}</span>
                {p.pf && <span className="font-mono text-[1.3vw] text-candela-2">{t('schermo.pf')} {testoPf(p.pf)}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {fine.di_riserva && <p className="text-[1vw] text-cenere">{t('schermo.fine.di_riserva')}</p>}
    </section>
  );
}
