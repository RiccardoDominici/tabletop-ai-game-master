/**
 * Finestra delle azioni: aperta o chiusa, turno che prepara, invitati (ha scritto / pronto), chi
 * ha scritto senza invito, conto alla rovescia della chiusura automatica (orologio del server) e
 * «Chiudi la finestra ora» (solo a finestra aperta e tavolo non in pausa).
 */
import clsx from 'clsx';
import type { StatoMaster } from '@cantastorie/shared';
import { secondiRimasti } from '../lib/formato';
import { useOra } from '../lib/useOra';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { Riquadro, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { classePulsante } from './stili';
import { righeInvitati } from './finestra';
import { puoChiudereFinestra } from './permessi';

export function SezioneFinestra({ stato }: { stato: StatoMaster }) {
  const { finestra } = stato.tavolo;
  const inCorso = useInCorso('chiudi_finestra');
  // In pausa la finestra non si chiude: un conto alla rovescia che scende a 0 ingannerebbe.
  const conScadenza = finestra.aperta && finestra.chiusura_prevista_ms !== null && !stato.pausa.attiva;
  const ora = useOra(conScadenza);
  const secondi = conScadenza && finestra.chiusura_prevista_ms !== null ? secondiRimasti(finestra.chiusura_prevista_ms, ora) : null;
  const righe = righeInvitati(stato.tavolo);

  return (
    <Riquadro
      titolo="Finestra"
      conteggio={`turno ${finestra.turno}`}
      zona="finestra"
      data-testid="master-finestra"
      data-aperta={String(finestra.aperta)}
      azioni={
        <button
          type="button"
          data-testid="master-chiudi-finestra"
          disabled={!puoChiudereFinestra(stato) || inCorso}
          onClick={() => void inviaComando({ tipo: 'chiudi_finestra' }, 'Chiudi la finestra ora')}
          title="Il narratore risponde subito alle azioni già inviate."
          className={classePulsante('normale', 'medio')}
        >
          Chiudi la finestra ora
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {finestra.aperta ? <Chip tono="muschio">aperta</Chip> : <Chip tono="cenere">chiusa</Chip>}
        {secondi !== null ? (
          <span data-testid="master-finestra-conto" className="rounded-full bg-candela px-2.5 py-px font-bold text-notte tabular-nums">
            si chiude da sola tra {secondi} s
          </span>
        ) : (
          finestra.aperta && <span className="text-cenere">chiusura automatica non ancora fissata (parte alla prima azione)</span>
        )}
        {stato.pausa.attiva && <span className="text-candela">tavolo in pausa: la finestra non si chiude</span>}
      </div>

      {righe.length === 0 ? (
        <Vuoto>{finestra.aperta ? 'Nessun invitato.' : 'Nessuna finestra aperta.'}</Vuoto>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {righe.map((r) => (
            <li
              key={r.id_pg}
              data-testid={`master-invitato-${r.id_pg}`}
              data-scritta={String(r.scritta)}
              data-pronto={String(r.pronto)}
              className={clsx(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm',
                r.pronto ? 'border-muschio/70 bg-muschio/15 text-muschio' : 'border-bordo-chiaro bg-notte-3 text-pergamena',
                !r.invitato && 'border-dashed',
              )}
              title={r.invitato ? 'Invitato' : 'Non invitato: la sua azione entra, ma non conta per «pronto»'}
            >
              <span className="font-semibold">{r.nome}</span>
              <span className="opacity-90">{r.pronto ? '✓ pronto' : r.scritta ? '✎ ha scritto' : 'pensa…'}</span>
              {!r.invitato && <span className="text-xs text-cenere">non invitato</span>}
            </li>
          ))}
        </ul>
      )}
    </Riquadro>
  );
}
