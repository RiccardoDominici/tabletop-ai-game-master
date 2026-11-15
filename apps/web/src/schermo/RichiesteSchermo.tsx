/**
 * The rolls the table is waiting for, on the projector (manual rolls, docs/prove.md §8): «Ida — Persuasione (Carisma)
 * — tira 2d20 e tieni il più alto — bonus +5». Same right-hand column as the roll cards (TiriSchermo.tsx), which they
 * replace while the dice are being rolled. Only public actions' requests reach the projector, and never with the DC.
 */
import type { RichiestaTiro } from '@tabletop-ai-gm/shared';
import { t } from '../lingua';
import { conSegno } from '../lib/tiri';

/** «2d20, tieni il più alto», «1d100, più basso è meglio», «2d6, sommali». */
function come(r: RichiestaTiro): string {
  const dadi = `${r.quanti}d${r.facce}`;
  if (r.somma) return t('schermo.richiesta.somma', { dadi });
  if (r.quanti > 1) return t(r.tieni === 'basso' ? 'schermo.richiesta.basso' : 'schermo.richiesta.alto', { dadi });
  return t(r.sotto_soglia ? 'schermo.richiesta.sotto' : 'schermo.richiesta.uno', { dadi });
}

export function RichiesteSchermo({ richieste }: { richieste: readonly RichiestaTiro[] }) {
  if (!richieste.length) return null;
  return (
    <aside
      data-testid="richieste-schermo"
      aria-label={t('schermo.richiesta.aria')}
      className="pointer-events-none absolute top-[6.5vh] right-[3.5vw] z-20 flex max-h-[73vh] w-[27vw] animate-comparsa flex-col gap-[1.4vh] overflow-hidden"
    >
      {richieste.map((r) => (
        <article
          key={r.id}
          data-testid="richiesta-tiro"
          data-chi={r.chi}
          className="flex flex-col gap-[0.6vh] rounded-[0.8vw] border-2 border-candela/70 bg-notte/85 px-[1.2vw] py-[1.4vh] shadow-[0_0.6vh_2vh_rgb(0_0_0/0.6)] backdrop-blur"
        >
          <p className="text-[0.95vw] tracking-[0.2em] text-candela uppercase">{r.dal_master ? t('schermo.richiesta.dal_master') : t('schermo.richiesta.titolo')}</p>
          <p className="font-titolo text-[1.7vw] leading-tight font-bold text-pergamena">{r.nome}</p>
          <p className="text-[1.4vw] leading-snug text-pergamena">{r.etichetta}</p>
          <p className="text-[1.15vw] text-pergamena-2">
            {come(r)}
            {!r.sotto_soglia && ` · ${t('schermo.richiesta.bonus', { bonus: conSegno(r.modificatore) })}`}
            {r.vantaggio && ` · ${t(r.vantaggio === 'vantaggio' ? 'schermo.richiesta.vantaggio' : 'schermo.richiesta.svantaggio')}`}
          </p>
          <p className="animate-pulse text-[1vw] text-cenere">{t('schermo.richiesta.attesa')}</p>
        </article>
      ))}
    </aside>
  );
}
