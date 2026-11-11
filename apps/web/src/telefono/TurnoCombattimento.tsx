/**
 * Riquadro del combattimento sul telefono, sopra la trascrizione (solo con `stato.combattimento`).
 *
 * - Se tocca a me (il mio PG è in `turno_di`): un banner «È il tuo turno» con i miei PF, le condizioni
 *   e le azioni del turno che il set permette (`azioni`: «Movimento: fino alla tua Velocità»).
 * - Altrimenti una riga compatta: «Combattimento · round N · tocca a …», con i miei PF e condizioni.
 * Se il mio PG è a terra con i tiri contro la morte, si vedono anche quelli (in entrambi i casi).
 * Senza combattimento non c'è niente: il tavolo è quello di sempre.
 */
import type { CombattentePubblico, CombattimentoPubblico } from '@tabletop-ai-gm/shared';
import { combattenteDi, etichettaTiriMorte, nomiDiTurno, testoPf } from '../lib/combattimento';
import { elenco, t } from '../lingua';

export function TurnoCombattimento({ combattimento, idPg }: { combattimento: CombattimentoPubblico | null | undefined; idPg: string }) {
  if (!combattimento) return null;
  const io = combattenteDi(combattimento, idPg);
  const tocca = combattimento.turno_di.includes(idPg);

  if (tocca) {
    return (
      <section data-testid="tuo-turno" className="flex flex-col gap-1.5 rounded-xl border-2 border-candela bg-candela/15 px-3 py-2.5 shadow-candela">
        <p className="font-titolo text-lg leading-tight font-semibold text-candela-2">{t('telefono.combat.tuo_turno')}</p>
        {io && <RigaMia combattente={io} />}
        {combattimento.azioni.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-pergamena-2">
            {combattimento.azioni.map((a) => (
              <li key={a.nome}>
                <span className="text-cenere">{a.nome}:</span> {a.quante}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  const agiscono = nomiDiTurno(combattimento);
  return (
    <section data-testid="turno-altri" className="flex flex-col gap-1 rounded-lg border border-bordo bg-notte-3/60 px-3 py-2 text-sm text-pergamena-2">
      <p>
        {t('telefono.combat.riga', { round: combattimento.round })}
        {agiscono.length > 0 ? t('telefono.combat.tocca_a', { nomi: elenco(agiscono) }) : t('telefono.combat.agisce_chi_vuole')}
      </p>
      {io && <RigaMia combattente={io} />}
    </section>
  );
}

/** I miei PF, le mie condizioni e, se sono a terra, i tiri contro la morte. */
function RigaMia({ combattente: c }: { combattente: CombattentePubblico }) {
  const testo = testoPf(c);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {testo && <span className="font-mono text-pergamena">{t('telefono.pf.sigla')} {testo}</span>}
      {c.condizioni.map((k) => (
        <span key={k.id} className="inline-flex items-center gap-1 rounded-full border border-bordo-chiaro px-2 py-0.5 text-xs text-pergamena">
          <span aria-hidden>{k.icona}</span>
          {k.nome}
        </span>
      ))}
      {c.stato === 'a_terra' && c.tiri_morte && <span className="font-mono text-xs text-sangue">{etichettaTiriMorte(c.tiri_morte)}</span>}
    </div>
  );
}
